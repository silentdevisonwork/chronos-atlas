import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production' || process.argv.includes('--prod');

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'chronos-atlas' });
  });

  /* ---------------------------------------------------------------------------
     Automatic UI translation. The product is authored in English; this endpoint
     machine-translates unseen phrases so every visible word follows the active
     language. Keyless and server-cached, so the browser never hammers upstream.
     --------------------------------------------------------------------------- */
  const TRANSLATE_LANGS = new Set([
    'tr', 'en', 'ar', 'de', 'fr', 'es', 'it', 'pt', 'ru', 'zh',
    'ja', 'ko', 'hi', 'ur', 'fa', 'el', 'nl', 'pl', 'id', 'sw',
  ]);
  const translateCache = new Map<string, string>();
  const TRANSLATE_LIMIT = 30_000;

  async function translateChunk(to: string, texts: string[]): Promise<string[]> {
    const qs = texts.map((t) => `&q=${encodeURIComponent(t)}`).join('');
    const url = `https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=en&tl=${to}${qs}`;
    const r = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ChronosAtlas/1.0' },
      signal: AbortSignal.timeout(9000),
    });
    if (!r.ok) throw new Error(`translate HTTP ${r.status}`);
    const data = await r.json();
    const flat: string[] = Array.isArray(data)
      ? data.map((item) => (Array.isArray(item) ? String(item[0] ?? '') : String(item ?? '')))
      : [];
    return texts.map((src, i) => flat[i] || src);
  }

  app.post('/api/translate', async (req, res) => {
    const to = typeof req.body?.to === 'string' ? req.body.to : '';
    const raw = Array.isArray(req.body?.texts) ? req.body.texts : [];
    if (!TRANSLATE_LANGS.has(to)) return res.status(400).json({ error: 'Unsupported language' });
    if (!raw.length) return res.json({ translations: [] });

    const texts = raw
      .filter((t: unknown): t is string => typeof t === 'string')
      .map((t: string) => t.slice(0, 400))
      .slice(0, 60);

    if (to === 'en') return res.json({ translations: texts });

    const out: Array<string | null> = texts.map((t: string) => translateCache.get(`${to}\u0000${t}`) ?? null);
    const missing: Array<{ index: number; text: string }> = [];
    texts.forEach((text: string, index: number) => {
      if (out[index] === null) missing.push({ index, text });
    });

    if (missing.length) {
      // Keep each upstream request small enough to stay reliable.
      const chunks: Array<Array<{ index: number; text: string }>> = [];
      let current: Array<{ index: number; text: string }> = [];
      let length = 0;
      for (const item of missing) {
        if (current.length >= 24 || length + item.text.length > 1400) {
          if (current.length) chunks.push(current);
          current = [];
          length = 0;
        }
        current.push(item);
        length += item.text.length + 4;
      }
      if (current.length) chunks.push(current);

      await Promise.all(
        chunks.map(async (chunk) => {
          try {
            const translated = await translateChunk(to, chunk.map((c) => c.text));
            translated.forEach((value, i) => {
              const item = chunk[i];
              out[item.index] = value;
              translateCache.set(`${to}\u0000${item.text}`, value);
            });
          } catch {
            chunk.forEach((item) => {
              out[item.index] = item.text;
            });
          }
        })
      );

      while (translateCache.size > TRANSLATE_LIMIT) {
        const oldest = translateCache.keys().next().value;
        if (oldest === undefined) break;
        translateCache.delete(oldest);
      }
    }

    res.json({ translations: out.map((value, i) => value ?? texts[i]) });
  });

  // GDELT proxy: keyless public API. Server-side so the browser never hits GDELT directly,
  // throttled to one upstream call per ~5.2 s (GDELT's request) and cached for 5 minutes.
  const gdeltCache = new Map<string, { at: number; body: string }>();
  let gdeltChain: Promise<unknown> = Promise.resolve();
  const GDELT_MODES: Record<string, string[]> = { doc: ['ArtList', 'TimelineVol', 'TimelineTone'], geo: ['PointData'] };

  app.get('/api/gdelt/:kind', async (req, res) => {
    const kind = req.params.kind;
    const modes = GDELT_MODES[kind];
    if (!modes) return res.status(404).json({ error: 'Unknown GDELT endpoint' });
    const query = typeof req.query.query === 'string' ? req.query.query.trim() : '';
    if (query.length < 3 || query.length > 300) return res.status(400).json({ error: 'Query must be 3-300 characters' });
    const mode = typeof req.query.mode === 'string' && modes.includes(req.query.mode) ? req.query.mode : modes[0];
    const spanRaw = typeof req.query.timespan === 'string' ? req.query.timespan : '24h';
    const timespan = /^\d{1,3}(min|h|d|w)$/.test(spanRaw) ? spanRaw : '24h';
    const params = new URLSearchParams({ query, mode, timespan, format: kind === 'geo' ? 'GeoJSON' : 'json' });
    if (kind === 'doc' && mode === 'ArtList') {
      params.set('maxrecords', String(Math.min(250, Math.max(1, Number(req.query.maxrecords) || 75))));
      params.set('sort', 'DateDesc');
    }
    const url = `https://api.gdeltproject.org/api/v2/${kind}/${kind}?${params.toString()}`;

    const hit = gdeltCache.get(url);
    const ttl = mode === 'ArtList' ? 60_000 : 300_000;
    if (hit && Date.now() - hit.at < ttl) return res.type('application/json').send(hit.body);

    let aborted = false;
    res.on('close', () => { if (!res.writableFinished) aborted = true; });
    const job = (gdeltChain = gdeltChain.catch(() => undefined).then(async () => {
      if (aborted) return null;
      try {
        const r = await fetch(url, { headers: { 'User-Agent': 'ChronosAtlas/1.0 (educational-atlas)' }, signal: AbortSignal.timeout(15000) });
        return { ok: r.ok, text: await r.text() };
      } catch {
        return { ok: false, text: '' };
      } finally {
        await new Promise((r) => setTimeout(r, 5200));
      }
    }));
    const out = (await job) as { ok: boolean; text: string } | null;
    if (!out) return;
    let valid = false;
    try { JSON.parse(out.text); valid = out.ok; } catch { valid = false; }
    if (valid) {
      gdeltCache.set(url, { at: Date.now(), body: out.text });
      if (gdeltCache.size > 200) gdeltCache.delete(gdeltCache.keys().next().value as string);
      return res.type('application/json').send(out.text);
    }
    if (hit) { res.setHeader('x-gdelt-stale', '1'); return res.type('application/json').send(hit.body); }
    return res.status(502).json({ error: out.text.slice(0, 160) || 'GDELT is not responding right now' });
  });


  /* ---------------------------------------------------------------------------
     News fallback layer. GDELT is keyless but frequently rate-limits or stalls.
     If it fails three times in a row we stop calling it for ten minutes and
     serve Google News RSS instead, so the monitor always has live headlines.
     --------------------------------------------------------------------------- */
  const gdeltHealth = { failures: 0, blockedUntil: 0 };
  async function gdeltJson(url: string, timeout = 6500): Promise<any | null> {
    if (Date.now() < gdeltHealth.blockedUntil) return null;
    try {
      const r = await fetch(url, {
        headers: { 'User-Agent': 'ChronosAtlas/1.0 (educational-atlas)' },
        signal: AbortSignal.timeout(timeout),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const body = await r.json();
      gdeltHealth.failures = 0;
      return body;
    } catch {
      gdeltHealth.failures += 1;
      if (gdeltHealth.failures >= 3) gdeltHealth.blockedUntil = Date.now() + 10 * 60_000;
      return null;
    }
  }

  const NEWS_LOCALES: Record<string, { hl: string; gl: string }> = {
    tr: { hl: 'tr', gl: 'TR' }, en: { hl: 'en-US', gl: 'US' }, ar: { hl: 'ar', gl: 'AE' },
    de: { hl: 'de', gl: 'DE' }, fr: { hl: 'fr', gl: 'FR' }, es: { hl: 'es', gl: 'ES' },
    it: { hl: 'it', gl: 'IT' }, pt: { hl: 'pt-BR', gl: 'BR' }, ru: { hl: 'ru', gl: 'RU' },
    zh: { hl: 'zh-CN', gl: 'CN' }, ja: { hl: 'ja', gl: 'JP' }, ko: { hl: 'ko', gl: 'KR' },
    hi: { hl: 'hi', gl: 'IN' }, ur: { hl: 'ur', gl: 'PK' }, fa: { hl: 'fa', gl: 'IR' },
    el: { hl: 'el', gl: 'GR' }, nl: { hl: 'nl', gl: 'NL' }, pl: { hl: 'pl', gl: 'PL' },
    id: { hl: 'id', gl: 'ID' }, sw: { hl: 'sw', gl: 'KE' },
  };

  const PUBLISHER_COUNTRY: Record<string, string> = {
    'bbc.co.uk': 'United Kingdom', 'bbc.com': 'United Kingdom', 'theguardian.com': 'United Kingdom',
    'reuters.com': 'United Kingdom', 'ft.com': 'United Kingdom', 'economist.com': 'United Kingdom',
    'cnn.com': 'United States of America', 'nytimes.com': 'United States of America',
    'washingtonpost.com': 'United States of America', 'wsj.com': 'United States of America',
    'apnews.com': 'United States of America', 'bloomberg.com': 'United States of America',
    'npr.org': 'United States of America', 'politico.com': 'United States of America',
    'aljazeera.com': 'Qatar', 'aljazeera.net': 'Qatar', 'france24.com': 'France',
    'lemonde.fr': 'France', 'lefigaro.fr': 'France', 'spiegel.de': 'Germany',
    'dw.com': 'Germany', 'faz.net': 'Germany', 'zeit.de': 'Germany', 'ansa.it': 'Italy',
    'corriere.it': 'Italy', 'elpais.com': 'Spain', 'elmundo.es': 'Spain', 'folha.uol.com.br': 'Brazil',
    'globo.com': 'Brazil', 'estadao.com.br': 'Brazil', 'rt.com': 'Russia', 'tass.com': 'Russia',
    'scmp.com': 'China', 'xinhuanet.com': 'China', 'globaltimes.cn': 'China', 'japantimes.co.jp': 'Japan',
    'asahi.com': 'Japan', 'nhk.or.jp': 'Japan', 'koreaherald.com': 'South Korea', 'yna.co.kr': 'South Korea',
    'timesofindia.indiatimes.com': 'India', 'thehindu.com': 'India', 'dawn.com': 'Pakistan',
    'tehrantimes.com': 'Iran', 'hurriyet.com.tr': 'Türkiye', 'hurriyetdailynews.com': 'Türkiye',
    'dailysabah.com': 'Türkiye', 'aa.com.tr': 'Türkiye', 'ekathimerini.com': 'Greece',
    'nltimes.nl': 'Netherlands', 'dutchnews.nl': 'Netherlands', 'notesfrompoland.com': 'Poland',
    'thejakartapost.com': 'Indonesia', 'nation.africa': 'Kenya', 'standardmedia.co.ke': 'Kenya',
    'abc.net.au': 'Australia', 'smh.com.au': 'Australia', 'thestar.com': 'Canada', 'cbc.ca': 'Canada',
    'haaretz.com': 'Israel', 'jpost.com': 'Israel', 'middleeasteye.net': 'United Kingdom',
    'africanews.com': 'Kenya', 'premiumtimesng.com': 'Nigeria', 'punchng.com': 'Nigeria',
  };

  const TLD_COUNTRY: Record<string, string> = {
    uk: 'United Kingdom', tr: 'Türkiye', de: 'Germany', fr: 'France', es: 'Spain', it: 'Italy',
    br: 'Brazil', ru: 'Russia', cn: 'China', jp: 'Japan', kr: 'South Korea', in: 'India',
    pk: 'Pakistan', ir: 'Iran', gr: 'Greece', nl: 'Netherlands', pl: 'Poland', id: 'Indonesia',
    ke: 'Kenya', ng: 'Nigeria', au: 'Australia', ca: 'Canada', il: 'Israel', qa: 'Qatar',
    eg: 'Egypt', za: 'South Africa', mx: 'Mexico', ar: 'Argentina', se: 'Sweden',
    ch: 'Switzerland', at: 'Austria', be: 'Belgium', pt: 'Portugal', ie: 'Ireland',
    nz: 'New Zealand', sg: 'Singapore', my: 'Malaysia', ph: 'Philippines', th: 'Thailand',
    vn: 'Vietnam', ua: 'Ukraine', ro: 'Romania', cz: 'Czechia', hu: 'Hungary',
    dk: 'Denmark', no: 'Norway', fi: 'Finland', hk: 'China', tw: 'China',
  };

  function countryFromDomain(domain: string, source = ''): string | undefined {
    const direct = PUBLISHER_COUNTRY[domain];
    if (direct) return direct;
    const parent = domain.replace(/^.*?([^.]+\.(?:co|com|org|net|gov|ac)\.[^.]+)$/, '$1');
    if (PUBLISHER_COUNTRY[parent]) return PUBLISHER_COUNTRY[parent];
    const tld = domain.split('.').pop()?.toLowerCase() ?? '';
    if (TLD_COUNTRY[tld]) return TLD_COUNTRY[tld];
    const byName = PUBLISHER_COUNTRY[`${source.toLowerCase().replace(/\s+/g, '')}.com`];
    return byName;
  }

  const borderGuardMap = (name: string) =>
    name
      .replace(/^The\s+/i, '')
      .replace(/^the\s+/i, '')
      .trim();

  interface NewsItem { url: string; title: string; seendate: string; domain: string; sourcecountry?: string; socialimage?: string }

  function rssDateToGdelt(value: string): string {
    const t = Date.parse(value);
    const d = new Date(Number.isFinite(t) ? t : Date.now());
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}T${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}Z`;
  }

  const decodeXml = (s: string) =>
    s
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
      .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
      .replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
      .replace(/<[^>]+>/g, '')
      .trim();

  async function googleNews(query: string, lang: string, max: number): Promise<NewsItem[]> {
    const loc = NEWS_LOCALES[lang] ?? NEWS_LOCALES.en;
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=${loc.hl}&gl=${loc.gl}&ceid=${loc.gl}:${loc.hl}`;
    try {
      const r = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ChronosAtlas/1.0)' },
        signal: AbortSignal.timeout(4000),
      });
      if (!r.ok) return [];
      const xml = await r.text();
      const items: NewsItem[] = [];
      const blocks = xml.split('<item>').slice(1);
      for (const block of blocks) {
        if (items.length >= max) break;
        const rawTitle = /<title>([\s\S]*?)<\/title>/.exec(block)?.[1] ?? '';
        const link = /<link>([\s\S]*?)<\/link>/.exec(block)?.[1] ?? '';
        const pub = /<pubDate>([\s\S]*?)<\/pubDate>/.exec(block)?.[1] ?? '';
        const srcName = decodeXml(/<source[^>]*>([\s\S]*?)<\/source>/.exec(block)?.[1] ?? '');
        const srcUrl = /<source[^>]*url="([^"]+)"/.exec(block)?.[1] ?? '';
        const title = decodeXml(rawTitle);
        if (!title || !link) continue;
        let domain = '';
        try { domain = new URL(srcUrl || link).hostname.replace(/^www\./, ''); } catch { domain = 'news.google.com'; }
        const publisher = borderGuardMap(srcName || domain);
        const country = countryFromDomain(domain, publisher);
        items.push({
          title,
          url: link,
          seendate: rssDateToGdelt(pub),
          domain: domain || 'news.google.com',
          ...(country ? { sourcecountry: country } : {}),
        });
      }
      return items;
    } catch {
      return [];
    }
  }

  async function googleNewsTop(lang: string, max: number): Promise<NewsItem[]> {
    const loc = NEWS_LOCALES[lang] ?? NEWS_LOCALES.en;
    const url = `https://news.google.com/rss?hl=${loc.hl}&gl=${loc.gl}&ceid=${loc.gl}:${loc.hl}`;
    try {
      const r = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ChronosAtlas/1.0)' },
        signal: AbortSignal.timeout(4000),
      });
      if (!r.ok) return [];
      const xml = await r.text();
      const items: NewsItem[] = [];
      for (const block of xml.split('<item>').slice(1)) {
        if (items.length >= max) break;
        const title = decodeXml(/<title>([\s\S]*?)<\/title>/.exec(block)?.[1] ?? '');
        const link = /<link>([\s\S]*?)<\/link>/.exec(block)?.[1] ?? '';
        const pub = /<pubDate>([\s\S]*?)<\/pubDate>/.exec(block)?.[1] ?? '';
        const srcName = decodeXml(/<source[^>]*>([\s\S]*?)<\/source>/.exec(block)?.[1] ?? '');
        const srcUrl = /<source[^>]*url="([^"]+)"/.exec(block)?.[1] ?? '';
        if (!title || !link) continue;
        let domain = 'news.google.com';
        try { domain = new URL(srcUrl || link).hostname.replace(/^www\./, ''); } catch { /* default */ }
        const country = countryFromDomain(domain, srcName);
        items.push({
          title,
          url: link,
          seendate: rssDateToGdelt(pub),
          domain,
          ...(country ? { sourcecountry: country } : {}),
        });
      }
      return items;
    } catch {
      return [];
    }
  }

  /** Bing News RSS — keyless third tier, used when Google News throttles. */
  async function bingNews(query: string, lang: string, max: number): Promise<NewsItem[]> {
    const loc = NEWS_LOCALES[lang] ?? NEWS_LOCALES.en;
    const url = `https://www.bing.com/news/search?q=${encodeURIComponent(query)}&format=rss&setmkt=${loc.gl}-${loc.hl.split('-')[0]}&setlang=${loc.hl.split('-')[0]}`;
    try {
      const r = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36' },
        signal: AbortSignal.timeout(5000),
      });
      if (!r.ok) return [];
      const xml = await r.text();
      const items: NewsItem[] = [];
      for (const block of xml.split('<item>').slice(1)) {
        if (items.length >= max) break;
        const title = decodeXml(/<title>([\s\S]*?)<\/title>/.exec(block)?.[1] ?? '');
        const rawLink = decodeXml(/<link>([\s\S]*?)<\/link>/.exec(block)?.[1] ?? '');
        const pub = /<pubDate>([\s\S]*?)<\/pubDate>/.exec(block)?.[1] ?? '';
        const source = decodeXml(/<News:Source>([\s\S]*?)<\/News:Source>/.exec(block)?.[1] ?? '');
        if (!title || !rawLink) continue;
        let link = rawLink;
        try {
          const inner = new URL(rawLink).searchParams.get('url');
          if (inner) link = inner;
        } catch {
          /* keep raw link */
        }
        let domain = 'bing.com';
        try { domain = new URL(link).hostname.replace(/^www\./, ''); } catch { /* default */ }
        const country = countryFromDomain(domain, source);
        items.push({
          title,
          url: link,
          seendate: rssDateToGdelt(pub),
          domain,
          ...(country ? { sourcecountry: country } : {}),
        });
      }
      return items;
    } catch {
      return [];
    }
  }

  /** Final tier: established world-news feeds. Always fresh, always keyless. */
  async function wireTop(lang: string, max: number): Promise<NewsItem[]> {
    const feeds = [
      'https://feeds.bbci.co.uk/news/world/rss.xml',
      'https://www.aljazeera.com/xml/rss/all.xml',
      'https://rss.dw.com/rdf/rss-en-world',
    ];
    const results = await Promise.all(
      feeds.map(async (feed) => {
        try {
          const r = await fetch(feed, {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ChronosAtlas/1.0)' },
            signal: AbortSignal.timeout(4000),
          });
          if (!r.ok) return [] as NewsItem[];
          const xml = await r.text();
          const out: NewsItem[] = [];
          for (const block of xml.split('<item>').slice(1, 9)) {
            const title = decodeXml(/<title>([\s\S]*?)<\/title>/.exec(block)?.[1] ?? '');
            const link = /<link>([\s\S]*?)<\/link>/.exec(block)?.[1]?.trim()
              ?? /<link href="([^"]+)"/.exec(block)?.[1]
              ?? '';
            const pub = /<pubDate>([\s\S]*?)<\/pubDate>/.exec(block)?.[1]
              ?? /<dc:date>([\s\S]*?)<\/dc:date>/.exec(block)?.[1]
              ?? '';
            if (!title || !link) continue;
            let domain = 'news';
            try { domain = new URL(link).hostname.replace(/^www\./, ''); } catch { /* default */ }
            const isBbc = domain.endsWith('bbc.co.uk');
            const isAl = domain.endsWith('aljazeera.com');
            out.push({
              title,
              url: link,
              seendate: rssDateToGdelt(pub),
              domain,
              sourcecountry: isBbc ? 'United Kingdom' : isAl ? 'Qatar' : 'Germany',
            });
          }
          return out;
        } catch {
          return [] as NewsItem[];
        }
      })
    );
    const merged = results.flat();
    // Interleave the feeds so the wire is not one publisher in a row.
    const byDomain = new Map<string, NewsItem[]>();
    for (const item of merged) {
      const list = byDomain.get(item.domain) ?? [];
      list.push(item);
      byDomain.set(item.domain, list);
    }
    const out: NewsItem[] = [];
    let i = 0;
    while (out.length < max && i < 12) {
      for (const list of byDomain.values()) {
        if (list[i]) out.push(list[i]);
        if (out.length >= max) break;
      }
      i += 1;
    }
    return out.slice(0, max);
  }

  const newsCache = new Map<string, { at: number; body: { articles: NewsItem[]; provider: string } }>();

  app.get('/api/news', async (req, res) => {
    const query = typeof req.query.query === 'string' ? req.query.query.trim() : '';
    if (query.length < 2 || query.length > 400) return res.status(400).json({ error: 'Query must be 2-400 characters' });
    const lang = typeof req.query.lang === 'string' ? req.query.lang : 'en';
    const span = typeof req.query.timespan === 'string' && /^\d{1,3}(min|h|d|w)$/.test(req.query.timespan) ? req.query.timespan : '24h';
    const max = Math.min(60, Math.max(1, Number(req.query.max) || 20));
    const useGdelt = req.query.gdelt !== '0';
    const key = `${lang}|${span}|${max}|${useGdelt ? 'g' : 'f'}|${query.toLowerCase()}`;
    const hit = newsCache.get(key);
    if (hit && Date.now() - hit.at < 90_000) return res.json({ ...hit.body, cached: true });

    // 1) Try GDELT first unless it is currently marked unhealthy.
    const gdelt = useGdelt
      ? await gdeltJson(
          `https://api.gdeltproject.org/api/v2/doc/doc?${new URLSearchParams({ query, mode: 'ArtList', timespan: span, format: 'json', maxrecords: String(max), sort: 'DateDesc' })}`
        )
      : null;
    let articles: NewsItem[] = Array.isArray(gdelt?.articles) ? gdelt.articles : [];
    let provider = 'gdelt';

    // 2) Resilient keyless fallback chain. Google News can return a single
    // stale hit for long boolean queries, so keep pulling tiers until the desk
    // has a usable number of stories.
    const clean = query
      .replace(/sourcelang:\w+/gi, ' ')
      .replace(/\b(OR|AND|NOT)\b/g, ' ')
      .replace(/[()"]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const terms = clean.split(/\s+/).map((w) => w.replace(/[^\p{L}\p{N}-]/gu, '')).filter((w) => w.length > 3);
    const short = terms.slice(0, 3).join(' ') || 'world news';
    const floor = Math.min(max, 6);
    const tierCount: Record<string, number> = {};

    const merge = (list: NewsItem[]): number => {
      const seen = new Set(articles.map((a) => (a.title || '').toLowerCase()));
      let added = 0;
      for (const item of list) {
        if (articles.length >= max) break;
        const k = (item.title || '').toLowerCase();
        if (!k || seen.has(k)) continue;
        seen.add(k);
        articles.push(item);
        added += 1;
      }
      return added;
    };
    const pull = async (fn: () => Promise<NewsItem[]>, name: string) => {
      if (articles.length >= floor) return;
      const added = merge(await fn());
      if (added) tierCount[name] = (tierCount[name] ?? 0) + added;
    };
    const track = (list: NewsItem[], name: string) => {
      const added = merge(list);
      if (added) tierCount[name] = (tierCount[name] ?? 0) + added;
    };

    // The first two tiers run together so the desk is never waiting on one host.
    const [gLocal, bLocal] = await Promise.all([
      googleNews(clean || 'world news', lang, max),
      bingNews(short, lang, max),
    ]);
    track(gLocal, 'google-news');
    track(bLocal, 'bing-news');

    if (articles.length < floor) {
      const [gEn, gTop] = await Promise.all([
        googleNews(short, 'en', max),
        googleNewsTop(lang, max),
      ]);
      track(gEn, 'google-news');
      track(gTop, 'google-news');
    }
    if (articles.length < floor) await pull(() => bingNews(short, 'en', max), 'bing-news');
    if (articles.length < floor) await pull(() => wireTop(lang, max), 'wire');

    // Attribute the feed to whichever tier supplied the most stories.
    tierCount.gdelt = articles.length - Object.entries(tierCount).reduce((a, [, n]) => a + n, 0);
    const best = Object.entries(tierCount).sort((a, b) => b[1] - a[1])[0];
    if (best) provider = best[0];
    if (!articles.length) provider = 'wire';

    const body = { articles, provider };
    if (articles.length) {
      newsCache.set(key, { at: Date.now(), body });
      if (newsCache.size > 300) newsCache.delete(newsCache.keys().next().value as string);
    }
    return res.json(body);
  });

  // Geocoded event points. GDELT only; when unavailable the client derives
  // country-level markers from the headlines themselves.
  const geoCache = new Map<string, { at: number; body: { features: unknown[]; provider: string } }>();
  app.get('/api/news/geo', async (req, res) => {
    const query = typeof req.query.query === 'string' ? req.query.query.trim() : '';
    if (query.length < 2) return res.status(400).json({ error: 'Query required' });
    const span = typeof req.query.timespan === 'string' && /^\d{1,3}(min|h|d|w)$/.test(req.query.timespan) ? req.query.timespan : '24h';
    const key = `geo|${span}|${query.toLowerCase()}`;
    const hit = geoCache.get(key);
    if (hit && Date.now() - hit.at < 120_000) return res.json({ ...hit.body, cached: true });
    const g = await gdeltJson(
      `https://api.gdeltproject.org/api/v2/geo/geo?${new URLSearchParams({ query, mode: 'PointData', timespan: span, format: 'GeoJSON' })}`,
      8000
    );
    const features = Array.isArray(g?.features) ? g.features.slice(0, 400) : [];
    const body = { features, provider: features.length ? 'gdelt' : 'none' };
    if (features.length) {
      geoCache.set(key, { at: Date.now(), body });
      if (geoCache.size > 200) geoCache.delete(geoCache.keys().next().value as string);
    }
    return res.json(body);
  });

  // OpenSky live aircraft proxy (keyless, anonymous tier). Cached 15 s per rounded bounding box.
  const skyCache = new Map<string, { at: number; body: unknown }>();
  app.get('/api/aircraft', async (req, res) => {
    const lat = Number(req.query.lat), lng = Number(req.query.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return res.status(400).json({ error: 'lat/lng required' });
    const d = 3;
    const box = { lamin: Math.max(-90, lat - d), lamax: Math.min(90, lat + d), lomin: Math.max(-180, lng - d), lomax: Math.min(180, lng + d) };
    const key = `${box.lamin.toFixed(0)},${box.lomin.toFixed(0)}`;
    const hit = skyCache.get(key);
    if (hit && Date.now() - hit.at < 15_000) return res.json(hit.body);
    try {
      const r = await fetch(`https://opensky-network.org/api/states/all?${new URLSearchParams(Object.entries(box).map(([k, v]) => [k, v.toFixed(2)]))}`, { headers: { 'User-Agent': 'ChronosAtlas/1.0 (educational-atlas)' }, signal: AbortSignal.timeout(5000) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = (await r.json()) as { time?: number; states?: any[][] | null };
      const aircraft = (j.states ?? []).filter((s) => s[5] != null && s[6] != null).map((s) => ({
        icao24: s[0], callsign: String(s[1] ?? '').trim(), country: s[2], lng: s[5], lat: s[6],
        altM: s[7] ?? s[13] ?? null, onGround: !!s[8], speedMs: s[9] ?? null, headingDeg: s[10] ?? null, vRateMs: s[11] ?? null, squawk: s[14] ?? null,
      })).slice(0, 60);
      const body = { time: j.time ?? null, aircraft };
      skyCache.set(key, { at: Date.now(), body });
      if (skyCache.size > 100) skyCache.delete(skyCache.keys().next().value as string);
      return res.json(body);
    } catch (e) {
      if (hit) return res.json(hit.body);
      return res.status(502).json({ error: 'Aircraft data unavailable (OpenSky rate limit or network)' });
    }
  });

  // Live Wikipedia REST summary proxy (zero secrets, server-cached fallback)
  app.get('/api/encyclopedia/summary', async (req, res) => {
    const title = typeof req.query.title === 'string' ? req.query.title.trim() : '';
    if (!title) return res.status(400).json({ error: 'Missing title' });
    try {
      const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/\s+/g, '_'))}`;
      const response = await fetch(url, {
        headers: { 'User-Agent': 'ChronosAtlas/1.0 (educational-atlas)' },
        signal: AbortSignal.timeout(4500),
      });
      if (!response.ok) {
        return res.status(response.status).json({ error: 'Article not found' });
      }
      const data = (await response.json()) as {
        title?: string;
        extract?: string;
        description?: string;
        thumbnail?: { source?: string };
        originalimage?: { source?: string };
        content_urls?: { desktop?: { page?: string } };
      };
      const rawImg = data.thumbnail?.source ?? data.originalimage?.source ?? '';
      const isFlagOrSvg = /\.svg(\?|$)|Flag_of_|Coat_of_arms|Emblem_of/i.test(rawImg);
      return res.json({
        title: data.title ?? title,
        description: data.description ?? '',
        extract: data.extract ?? '',
        imageUrl: rawImg && !isFlagOrSvg ? rawImg.replace(/\/330px-/, '/800px-') : null,
        wikiUrl: data.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`,
      });
    } catch {
      return res.status(504).json({ error: 'Live Wikipedia lookup timed out or unavailable' });
    }
  });

  // Subject-exact Wikimedia/Wikipedia photo lookup (filters out SVG flags & locator maps)
  app.get('/api/encyclopedia/photo', async (req, res) => {
    const topic = typeof req.query.topic === 'string' ? req.query.topic.trim() : '';
    if (!topic) return res.status(400).json({ error: 'Missing topic' });
    const isRealPhoto = (src?: string) =>
      Boolean(
        src &&
          !/\.svg(\?|$)|Flag_of_|Coat_of_arms|Emblem_of|Locator|orthographic|location_map|BlankMap/i.test(src)
      );
    try {
      const headers = { 'User-Agent': 'ChronosAtlas/1.0 (educational-atlas)' };
      const exactUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(
        topic
      )}&redirects=1&prop=pageimages|info&inprop=url&pithumbsize=960&format=json`;
      const exactResp = await fetch(exactUrl, { headers, signal: AbortSignal.timeout(4500) });
      if (exactResp.ok) {
        const exactData = (await exactResp.json()) as {
          query?: {
            pages?: Record<string, { title?: string; fullurl?: string; thumbnail?: { source?: string } }>;
          };
        };
        const exactPages = Object.values(exactData.query?.pages ?? {});
        const exactMatch = exactPages.find((p) => isRealPhoto(p.thumbnail?.source));
        if (exactMatch?.thumbnail?.source) {
          return res.json({
            imageUrl: exactMatch.thumbnail.source,
            title: exactMatch.title ?? topic,
            wikiUrl: exactMatch.fullurl ?? null,
          });
        }
      }

      const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
        topic
      )}&gsrlimit=8&prop=pageimages|info&inprop=url&pithumbsize=960&format=json`;
      const resp = await fetch(searchUrl, { headers, signal: AbortSignal.timeout(5500) });
      if (!resp.ok) return res.status(resp.status).json({ error: 'Photo lookup failed' });
      const data = (await resp.json()) as {
        query?: {
          pages?: Record<
            string,
            { index?: number; title?: string; fullurl?: string; thumbnail?: { source?: string } }
          >;
        };
      };
      const pages = Object.values(data.query?.pages ?? {}).sort((a, b) => (a.index ?? 99) - (b.index ?? 99));
      const matched =
        pages.find(
          (p) =>
            isRealPhoto(p.thumbnail?.source) &&
            !/\b(Indiana|Ohio|Georgia|Texas|Alabama|Tennessee|Missouri|Oklahoma|Kentucky)\b/i.test(
              p.title ?? ''
            )
        ) ?? pages.find((p) => isRealPhoto(p.thumbnail?.source));
      if (!matched?.thumbnail?.source) {
        return res.json({ imageUrl: null, title: topic, wikiUrl: null });
      }
      return res.json({
        imageUrl: matched.thumbnail.source,
        title: matched.title ?? topic,
        wikiUrl: matched.fullurl ?? null,
      });
    } catch {
      return res.status(504).json({ error: 'Photo lookup timed out' });
    }
  });

  // Live World Bank GDP, GDP per capita, and population lookup (no API key required)
  app.get('/api/encyclopedia/worldbank', async (req, res) => {
    const iso = typeof req.query.iso === 'string' ? req.query.iso.trim().toUpperCase() : '';
    if (!iso || iso.length < 2) return res.status(400).json({ error: 'Invalid ISO code' });
    try {
      const fetchIndicator = async (indicator: string) => {
        try {
          const url = `https://api.worldbank.org/v2/country/${encodeURIComponent(iso)}/indicator/${indicator}?format=json&mrv=3`;
          const resp = await fetch(url, {
            headers: { 'User-Agent': 'ChronosAtlas/1.0 (educational-atlas)' },
            signal: AbortSignal.timeout(5000),
          });
          if (!resp.ok) return null;
          const json = (await resp.json()) as unknown[];
          const rows = Array.isArray(json) && Array.isArray(json[1]) ? (json[1] as Array<{ value?: number | null; date?: string }>) : [];
          const valid = rows.find((r) => typeof r.value === 'number');
          return valid ? { value: valid.value as number, year: valid.date ?? '' } : null;
        } catch {
          return null;
        }
      };
      const [gdp, gdpPerCapita, population] = await Promise.all([
        fetchIndicator('NY.GDP.MKTP.CD'),
        fetchIndicator('NY.GDP.PCAP.CD'),
        fetchIndicator('SP.POP.TOTL'),
      ]);
      return res.json({ iso, gdp, gdpPerCapita, population });
    } catch {
      return res.status(504).json({ error: 'World Bank API unavailable' });
    }
  });

  app.post('/api/ai/history-assistant', async (req, res) => {
    try {
      const { question, contextName, contextType, year, language } = req.body ?? {};
      if (!question || typeof question !== 'string' || question.trim().length < 2) {
        return res.status(400).json({ error: 'Please provide a historical or astronomical question.' });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
        return res.status(503).json({
          error: 'GEMINI_API_KEY is not configured in environment secrets.',
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const yearLabel =
        typeof year === 'number'
          ? year < 0
            ? `${Math.abs(year)} BCE`
            : `${year} CE`
          : 'All Eras';

      const prompt = [
        `User language code: ${typeof language === 'string' ? language : 'en'}`,
        `Selected subject: ${typeof contextName === 'string' ? contextName : 'World History'} (${typeof contextType === 'string' ? contextType : 'general'})`,
        `Timeline context year: ${yearLabel}`,
        `Question: ${question.trim().slice(0, 800)}`,
        '',
        'Respond in the requested user language with scholarly accuracy.',
        'Clearly separate verified historical/scientific facts from mainstream scholarly interpretations and genuinely disputed claims or myths.',
        'Include specific primary sources, archaeological evidence, or astronomical mission citations.',
      ].join('\n');

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          systemInstruction:
            'You are the Chronos Atlas Museum & Observatory Historian. Be rigorous, concise, neutral, and multilingual. Never invent facts. Always distinguish verified empirical/documentary facts, scholarly interpretations, and disputed claims.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: {
                type: Type.STRING,
                description: 'Direct, well-written answer in the user language (2-4 sentences).',
              },
              verifiedFacts: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '2-4 archaeologically or documentarily verified facts.',
              },
              scholarlyInterpretations: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '1-3 mainstream academic interpretations or contextual theories.',
              },
              disputedClaims: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '1-2 common myths, contested dates, or active historiographical debates.',
              },
              sources: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '2-4 credible primary or institutional sources (e.g., UNESCO, Herodotus, NASA JPL, epigraphic inscriptions).',
              },
            },
            required: ['summary', 'verifiedFacts', 'scholarlyInterpretations', 'disputedClaims', 'sources'],
          },
        },
      });

      const rawText = (response.text ?? '{}').trim();
      const parsed = JSON.parse(rawText);
      return res.json(parsed);
    } catch (error) {
      console.error('History assistant error:', error);
      const message = error instanceof Error ? error.message : 'Unable to reach historical assistant.';
      return res.status(500).json({ error: message });
    }
  });

  if (!isProduction) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Chronos Atlas server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start Chronos Atlas server:', err);
  process.exit(1);
});
