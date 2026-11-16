import { MonitorGlobe, type GlobeMarker } from '../components/MonitorGlobe';
import { Bell, Copy, Download, ExternalLink, Globe2, Pause, Plane as PlaneIcon, Play, RefreshCw, Star, X, ZoomOut } from 'lucide-react';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MagneticButton, SegmentedControl } from '../components/ui/DesignPrimitives';
import { HeroTitle } from '../components/ui/VendoredUI';
import { useAtlasStore } from '../store/useAtlasStore';
import { getWorldCountries } from '../utils/worldGeo';
import { mt, type MonitorKey } from '../i18n/monitorStrings';

/* World Monitor: live global news coverage from the GDELT Project (via /api/gdelt proxy). */

interface Article { url: string; title: string; seendate: string; domain: string; sourcecountry?: string; socialimage?: string }
interface Located extends Article { lat: number; lng: number; place: string; exact: boolean; isPlace?: boolean; geo?: boolean }
interface Aircraft { icao24: string; callsign: string; country: string; lat: number; lng: number; altM: number | null; onGround: boolean; speedMs: number | null; headingDeg: number | null; vRateMs: number | null }
type VB = { x: number; y: number; w: number; h: number };
const FULL: VB = { x: 0, y: 0, w: 1000, h: 500 };
const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return (h >>> 0) / 4294967295; };
const buildQ = (topic: string, customQ: string, eng: string, place: string | null) => ((topic === 'custom' ? customQ : (TOPICS as readonly TopicDef[]).find((x) => x.id === topic)?.q ?? '') + (eng === 'en' ? ' sourcelang:english' : '')) + (place ? ` "${place}"` : '');
interface Pt { name: string; count: number; lat: number; lng: number }

const TOPICS = [
  { id: 'top', label: 'Top stories', q: '(conflict OR election OR economy OR protest OR disaster OR summit)' },
  { id: 'conflict', label: 'War & conflict', q: '(war OR conflict OR airstrike OR ceasefire OR troops OR missile OR offensive)' },
  { id: 'aviation', label: 'Aviation & aircraft', q: '(aircraft OR airplane OR airline OR "plane crash" OR airspace OR fighter jet OR drone OR helicopter)' },
  { id: 'terror', label: 'Terror & crime', q: '(terrorism OR attack OR shooting OR hostage OR arrested OR kidnapping OR explosion)' },
  { id: 'politics', label: 'Politics', q: '(election OR parliament OR president OR diplomacy OR sanctions OR treaty)' },
  { id: 'economy', label: 'Economy', q: '(economy OR inflation OR "central bank" OR tariffs OR recession OR unemployment)' },
  { id: 'energy', label: 'Energy', q: '(oil OR gas OR electricity OR "power outage" OR nuclear OR "solar power" OR pipeline)' },
  { id: 'disasters', label: 'Disasters', q: '(earthquake OR flood OR wildfire OR hurricane OR cyclone OR volcano OR tsunami)' },
  { id: 'climate', label: 'Climate', q: '(climate OR drought OR heatwave OR "sea level" OR emissions OR glacier)' },
  { id: 'health', label: 'Health', q: '(outbreak OR epidemic OR vaccine OR "World Health Organization" OR hospital OR virus)' },
  { id: 'migration', label: 'Migration & crisis', q: '(refugees OR migrants OR famine OR humanitarian OR displacement OR asylum)' },
  { id: 'tech', label: 'Tech & cyber', q: '(cyberattack OR "artificial intelligence" OR semiconductor OR hackers OR "data breach" OR robot)' },
  { id: 'inventions', label: 'Inventions & science', q: '(invention OR inventor OR breakthrough OR discovery OR patent OR scientists OR prototype)' },
  { id: 'space', label: 'Space', q: '(NASA OR rocket OR satellite OR astronaut OR spacecraft OR telescope OR asteroid)' },
  { id: 'talent', label: 'Skills & achievements', q: '(record OR champion OR prodigy OR "world record" OR gold medal OR award OR talent)' },
  { id: 'culture', label: 'Society & culture', q: '(festival OR education OR protest OR strike OR university OR museum OR heritage)' },
] as const;
type TopicDef = { id: string; label: string; q: string };
const dedupe = (list: Article[]) => { const seen = new Set<string>(); return list.filter((a) => { const k = a.title?.toLowerCase(); if (!k || seen.has(k)) return false; seen.add(k); return true; }); };
const SPANS = ['1h', '6h', '24h', '7d'] as const;
const providerName = (p: 'gdelt' | 'google-news' | 'bing-news' | 'wire') =>
  p === 'gdelt' ? 'GDELT' : p === 'wire' ? 'World wire' : p === 'bing-news' ? 'Bing News' : 'Google News';
const ALIAS: Record<string, string> = { 'united states': 'united states of america', 'czech republic': 'czechia' };
const norm = (s: string) => s.toLowerCase().replace(/[^a-z ]/g, '').trim();
const proj = (lat: number, lng: number): [number, number] => [((lng + 180) / 360) * 1000, ((90 - lat) / 180) * 500];
const short = (n: string) => n.split(',')[0].trim();

async function gd(kind: 'doc' | 'geo', params: Record<string, string>, signal: AbortSignal) {
  const r = await fetch(`/api/gdelt/${kind}?${new URLSearchParams(params)}`, { signal });
  if (!r.ok) throw new Error(((await r.json().catch(() => null)) as { error?: string } | null)?.error || `HTTP ${r.status}`);
  return r.json();
}

/** Live wire: GDELT when healthy, Google News RSS otherwise (server-side fallback). */
async function wireList(query: string, timespan: string, lang: string, max: number, signal: AbortSignal, gdelt = true) {
  const params: Record<string, string> = { query, timespan, lang, max: String(max) };
  if (!gdelt) params.gdelt = '0';
  const r = await fetch(`/api/news?${new URLSearchParams(params)}`, { signal });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return (await r.json()) as { articles: Article[]; provider: 'gdelt' | 'google-news' | 'bing-news' | 'wire' };
}

async function wireGeo(query: string, timespan: string, signal: AbortSignal) {
  const r = await fetch(`/api/news/geo?${new URLSearchParams({ query, timespan })}`, { signal });
  if (!r.ok) return { features: [] as any[] };
  return (await r.json()) as { features: any[] };
}
const series = (d: any): number[] => (d?.timeline?.[0]?.data ?? []).map((p: any) => Number(p.value)).filter((v: number) => Number.isFinite(v));

function ago(seen: string, lang: string) {
  const m = /^(\d{4})(\d\d)(\d\d)T(\d\d)(\d\d)(\d\d)/.exec(seen);
  if (!m) return '';
  const mins = Math.max(0, Math.round((Date.now() - Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6])) / 60000));
  const f = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' });
  return mins < 60 ? f.format(-mins, 'minute') : mins < 1440 ? f.format(-Math.round(mins / 60), 'hour') : f.format(-Math.round(mins / 1440), 'day');
}

const WorldBase = memo(function WorldBase() {
  const d = useMemo(() => getWorldCountries().map((c) => c.rings.map((r) => r.map(([lng, lat], i) => { const [x, y] = proj(lat, lng); return `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`; }).join('') + 'Z').join('')).join(''), []);
  return <path d={d} strokeWidth={0.4} className="fill-black/[.07] stroke-black/25 dark:fill-white/[.06] dark:stroke-white/20" />;
});

function Spark({ v }: { v: number[] }) {
  if (v.length < 2) return <div className="h-12" />;
  const min = Math.min(...v), r = Math.max(...v) - min || 1;
  const d = v.map((y, i) => `${i ? 'L' : 'M'}${(i / (v.length - 1)) * 100},${28 - ((y - min) / r) * 26}`).join(' ');
  return <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="h-12 w-full" aria-hidden="true"><path d={d} fill="none" stroke="currentColor" strokeWidth={1.5} vectorEffect="non-scaling-stroke" /></svg>;
}


const store = {
  get<T>(k: string, d: T): T { try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : d; } catch { return d; } },
  set(k: string, v: unknown) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
};
const csvCell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;

function ageMin(seen: string): number {
  const m = /^(\d{4})(\d\d)(\d\d)T(\d\d)(\d\d)(\d\d)/.exec(seen);
  return m ? Math.max(0, (Date.now() - Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6])) / 60000) : Infinity;
}

function NewsPhoto({ src, topic, className }: { src?: string; topic?: string; className?: string }) {
  const [u, setU] = useState<string | undefined>(src);
  const triedRef = useRef(false);
  const fallback = useCallback(() => {
    if (triedRef.current || !topic) { setU(undefined); return; }
    triedRef.current = true;
    fetch(`/api/encyclopedia/photo?topic=${encodeURIComponent(topic)}`).then((r) => r.json()).then((j) => setU(j?.imageUrl || undefined)).catch(() => setU(undefined));
  }, [topic]);
  useEffect(() => { triedRef.current = false; setU(src); if (!src) fallback(); }, [src, topic, fallback]);
  if (!u) return null;
  return <img src={u} alt="" loading="lazy" referrerPolicy="no-referrer" onError={fallback} className={className} />;
}

function PlanePhoto({ hex }: { hex: string }) {
  const [u, setU] = useState<string | null>(null);
  useEffect(() => { let on = true; fetch(`https://api.planespotters.net/pub/photos/hex/${hex}`).then((r) => r.json()).then((j) => on && setU(j?.photos?.[0]?.thumbnail?.src ?? null)).catch(() => {}); return () => { on = false; }; }, [hex]);
  return u ? <img src={u} alt="" loading="lazy" referrerPolicy="no-referrer" className="h-10 w-16 shrink-0 rounded object-cover" /> : null;
}

function PlaceSummary({ name }: { name: string }) {
  const [t, setT] = useState<{ extract: string; wikiUrl: string } | null>(null);
  useEffect(() => { let on = true; setT(null); fetch(`/api/encyclopedia/summary?title=${encodeURIComponent(name)}`).then((r) => r.json()).then((j) => on && j?.extract && setT({ extract: j.extract, wikiUrl: j.wikiUrl })).catch(() => {}); return () => { on = false; }; }, [name]);
  return t ? <p className="line-clamp-4 text-[13px] leading-relaxed text-neutral-600 dark:text-slate-300">{t.extract}</p> : null;
}

function CommandCenter({ span, eng, tick, lang, onOpen }: { span: string; eng: string; tick: number; lang: string; onOpen: (id: string) => void }) {
  const [data, setData] = useState<Record<string, Article[]>>({});
  useEffect(() => {
    const ac = new AbortController();
    let running = false;
    // Fetch four panels at a time so the whole desk fills within seconds.
    const cycle = async () => {
      if (running || document.hidden) return;
      running = true;
      try {
        for (let i = 0; i < TOPICS.length; i += 4) {
          if (ac.signal.aborted) return;
          await Promise.all(
            TOPICS.slice(i, i + 4).map(async (tp) => {
              try {
                const d = await wireList(tp.q + (eng === 'en' ? ' sourcelang:english' : ''), span, lang, 18, ac.signal, false);
                setData((p) => ({ ...p, [tp.id]: dedupe(d.articles ?? []) }));
              } catch (e) {
                if ((e as Error).name === 'AbortError') return;
                setData((p) => (p[tp.id] ? p : { ...p, [tp.id]: [] }));
              }
            })
          );
        }
      } finally { running = false; }
    };
    cycle();
    const id = setInterval(cycle, 60_000);
    return () => { clearInterval(id); ac.abort(); };
  }, [span, eng, tick, lang]);
  const loaded = Object.keys(data).length;
  return (
    <div className="space-y-3">
      <p className="text-xs text-neutral-500 dark:text-slate-400">All 16 desks fill in parallel as the wire responds ({loaded}/{TOPICS.length}). Panels refresh every minute, and new stories surface as publishers release them.</p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {TOPICS.map((tp) => {
          const list = data[tp.id];
          return (
            <section key={tp.id} className="spatial-card flex flex-col overflow-hidden" aria-label={mt(lang as never, tp.id as MonitorKey)}>
              <button type="button" onClick={() => onOpen(tp.id)} className="flex cursor-pointer items-center justify-between border-b border-neutral-200/70 px-4 py-3 text-start dark:border-white/10">
                <h3 className="font-display text-base font-bold">{mt(lang as never, tp.id as MonitorKey)}</h3>
                <span className="text-xs text-neutral-500 dark:text-slate-400">{list ? `${list.length} ${mt(lang as never, 'stories')}` : '…'}</span>
              </button>
              <ul className="divide-y divide-neutral-200/70 dark:divide-white/10">
                {!list && Array.from({ length: 4 }, (_, i) => <li key={i} className="p-4"><div className="h-3 w-11/12 animate-pulse rounded-full bg-black/10 dark:bg-white/10" /><div className="mt-2 h-3 w-1/2 animate-pulse rounded-full bg-black/10 dark:bg-white/10" /></li>)}
                {list?.slice(0, 6).map((a) => (
                  <li key={a.url}><a href={a.url} target="_blank" rel="noopener noreferrer" className="block px-4 py-2.5 transition-colors hover:bg-black/[.04] dark:hover:bg-white/[.05]">
                    <div className="line-clamp-2 text-[13px] font-medium leading-snug">{a.title}</div>
                    <div className="mt-1 flex gap-1.5 text-[11px] text-neutral-500 dark:text-slate-400"><span className="truncate">{a.domain}</span><span aria-hidden="true">·</span><span className="shrink-0">{ago(a.seendate, lang)}</span></div>
                  </a></li>
                ))}
                {list && !list.length && <li className="p-4 text-xs text-neutral-500 dark:text-slate-400">No stories right now.</li>}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}

export function MonitorView() {
  const lang = useAtlasStore((s) => s.progress.preferences.language);
  const [topic, setTopic] = useState<string>('top');
  const [layout, setLayout] = useState<'center' | 'focus'>('center');
  const [customQ, setCustomQ] = useState('');
  const [draft, setDraft] = useState('');
  const [span, setSpan] = useState<(typeof SPANS)[number]>('24h');
  const [eng, setEng] = useState<'en' | 'all'>('en');
  const [place, setPlace] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [arts, setArts] = useState<Article[]>([]);
  const [geo, setGeo] = useState<Pt[]>([]);
  const [vol, setVol] = useState<number[]>([]);
  const [tone, setTone] = useState<number[]>([]);
  const [busy, setBusy] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const [provider, setProvider] = useState<'gdelt' | 'google-news' | 'bing-news' | 'wire' | null>(null);
  const [updated, setUpdated] = useState<Date | null>(null);
  const [sel, setSel] = useState<Located | null>(null);
  const [showPlaces, setShowPlaces] = useState<boolean | null>(null);
  const [finder, setFinder] = useState('');
  const [live, setLive] = useState(true);
  const [watch, setWatch] = useState<string>(() => store.get('monitor.watch', ''));
  const [saved, setSaved] = useState<Record<string, Located>>(() => store.get('monitor.saved', {}));
  const [savedOnly, setSavedOnly] = useState(false);
  const [maxAge, setMaxAge] = useState<'all' | '15' | '60' | '360'>('all');
  const [srcFilter, setSrcFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'new' | 'place'>('new');
  const [rotate, setRotate] = useState(true);
  const [copied, setCopied] = useState(false);
  const watchRef = useRef(watch);
  watchRef.current = watch;
  const terms = useMemo(() => watch.split(',').map((t) => t.trim().toLowerCase()).filter((t) => t.length >= 2), [watch]);
  const isWatched = useCallback((a: Article) => terms.length > 0 && terms.some((t) => a.title.toLowerCase().includes(t)), [terms]);
  useEffect(() => { store.set('monitor.watch', watch); }, [watch]);
  useEffect(() => { store.set('monitor.saved', saved); }, [saved]);
  const toggleSave = useCallback((a: Located) => setSaved((p) => { const n = { ...p }; if (n[a.url]) delete n[a.url]; else n[a.url] = a; return n; }), []);
  const enableAlerts = useCallback(() => { if (typeof Notification !== 'undefined' && Notification.permission === 'default') void Notification.requestPermission(); }, []);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const [planes, setPlanes] = useState<Aircraft[]>([]);
  const [planeErr, setPlaneErr] = useState<string | null>(null);
  const [vb, setVb] = useState<VB>(FULL);
  const vbRef = useRef<VB>(FULL);
  const rafRef = useRef(0);
  const seenRef = useRef<Set<string>>(new Set());
  const loadedRef = useRef(false);
  const liveRef = useRef(true);
  liveRef.current = live;

  const fly = useCallback((t: VB) => {
    const from = vbRef.current, t0 = performance.now();
    cancelAnimationFrame(rafRef.current);
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / 900), e = 1 - Math.pow(1 - k, 3);
      const n = { x: from.x + (t.x - from.x) * e, y: from.y + (t.y - from.y) * e, w: from.w + (t.w - from.w) * e, h: from.h + (t.h - from.h) * e };
      vbRef.current = n; setVb(n);
      if (k < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
  }, []);
  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);
  const select = useCallback((a: Located | null) => {
    setSel(a); setPlanes([]); setPlaneErr(null);
    if (!a) { fly(FULL); return; }
    const [px, py] = proj(a.lat, a.lng), w = 200, h = 100;
    fly({ x: Math.min(1000 - w, Math.max(0, px - w / 2)), y: Math.min(500 - h, Math.max(0, py - h / 2)), w, h });
  }, [fly]);

    useEffect(() => { setPlace(null); }, [topic, customQ]);
  useEffect(() => { setSel(null); setPlanes([]); fly(FULL); seenRef.current = new Set(); loadedRef.current = false; }, [topic, customQ, layout, fly]);

  useEffect(() => {
    const ac = new AbortController();
    if (topic === 'custom' && customQ.length < 3) return;
    const base = (topic === 'custom' ? customQ : (TOPICS as readonly TopicDef[]).find((x) => x.id === topic)!.q) + (eng === 'en' ? ' sourcelang:english' : '');
    const q = base + (place ? ` "${place}"` : '');
    setErr(null); setBusy(4);
    const done = () => setBusy((b) => Math.max(0, b - 1));
    const fail = (e: unknown) => { if ((e as Error).name !== 'AbortError') setErr((e as Error).message); };
    const soft = () => done();
    wireList(q, span, lang, 100, ac.signal)
      .then((d) => { const l = dedupe(d.articles ?? []); seenRef.current = new Set(l.map((a) => a.url)); loadedRef.current = true; setArts(l); setProvider(d.provider); setUpdated(new Date()); })
      .catch(fail).finally(done);
    wireGeo(base, span, ac.signal)
      .then((g) => setGeo(((g?.features ?? []) as any[]).map((f) => ({ name: String(f?.properties?.name ?? ''), count: Number(f?.properties?.count) || 1, lng: Number(f?.geometry?.coordinates?.[0]), lat: Number(f?.geometry?.coordinates?.[1]) })).filter((p) => p.name && Number.isFinite(p.lat) && Number.isFinite(p.lng)).sort((a, b) => b.count - a.count).slice(0, 120)))
      .catch(() => setGeo([])).finally(soft);
    gd('doc', { query: q, mode: 'TimelineVol', timespan: span }, ac.signal).then((d) => setVol(series(d))).catch(() => setVol([])).finally(soft);
    gd('doc', { query: q, mode: 'TimelineTone', timespan: span }, ac.signal).then((d) => setTone(series(d))).catch(() => setTone([])).finally(soft);
    return () => ac.abort();
  }, [topic, span, eng, place, tick, layout, customQ]);

  // Live updates: every 60 s fetch the newest stories (server cache for ArtList is 60 s) and merge new ones to the top.
  useEffect(() => {
    if (layout === 'center' || (topic === 'custom' && customQ.length < 3)) return;
    const q = buildQ(topic, customQ, eng, place);
    let ac = new AbortController(), clear = 0 as unknown as ReturnType<typeof setTimeout>;
    const poll = async () => {
      if (document.hidden || !loadedRef.current || !liveRef.current) return;
      ac.abort(); ac = new AbortController();
      try {
        const d = await wireList(q, '1h', lang, 50, ac.signal);
        const incoming = dedupe(d.articles ?? []).filter((a) => !seenRef.current.has(a.url));
        setProvider(d.provider);
        if (!incoming.length) return;
        incoming.forEach((a) => seenRef.current.add(a.url));
        const ts = watchRef.current.split(',').map((t) => t.trim().toLowerCase()).filter((t) => t.length >= 2);
        if (ts.length && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          incoming.filter((a) => ts.some((t) => a.title.toLowerCase().includes(t))).slice(0, 3).forEach((a) => { try { new Notification('Watchlist match', { body: a.title }); } catch { /* notifications unsupported */ } });
        }
        setArts((prev) => dedupe([...incoming, ...prev]).slice(0, 150));
        setFresh(new Set(incoming.map((a) => a.url)));
        setUpdated(new Date());
        clearTimeout(clear); clear = setTimeout(() => setFresh(new Set()), 25_000);
      } catch { /* keep current list; the next poll retries */ }
    };
    const id = setInterval(poll, 5_000);
    return () => { clearInterval(id); clearTimeout(clear); ac.abort(); };
  }, [topic, customQ, eng, place, layout]);

  // Live aircraft around the selected story (OpenSky, refreshed every 15 s)
  useEffect(() => {
    if (!sel) return;
    let on = true;
    const load = () => fetch(`/api/aircraft?lat=${sel.lat}&lng=${sel.lng}`).then(async (r) => { const j = await r.json(); if (!r.ok) throw new Error(j?.error || `HTTP ${r.status}`); return j; })
      .then((j) => { if (!on) return; setPlaneErr(null); setPlanes(((j.aircraft ?? []) as Aircraft[]).sort((a, b) => Math.hypot(a.lat - sel.lat, a.lng - sel.lng) - Math.hypot(b.lat - sel.lat, b.lng - sel.lng))); })
      .catch((e: Error) => on && setPlaneErr(e.message));
    load();
    const id = setInterval(() => !document.hidden && load(), 5_000);
    return () => { on = false; clearInterval(id); };
  }, [sel?.url, sel?.lat, sel?.lng]);

  // Fallback markers when GEO is unavailable: countries publishing the coverage
  const centroids = useMemo(() => { const m = new Map<string, { lat: number; lng: number }>(); getWorldCountries().forEach((c) => m.set(norm(c.name), c.centroid)); return m; }, []);
  const countryNames = useMemo(() => [...centroids.keys()].filter((n) => n.length >= 4).sort((a, b) => b.length - a.length), [centroids]);
  const nameOf = useMemo(() => { const m = new Map<string, string>(); getWorldCountries().forEach((c) => m.set(norm(c.name), c.name)); return m; }, []);
  const fromCountries = useMemo<Pt[]>(() => {
    const c = new Map<string, number>();
    arts.forEach((a) => {
      const src = a.sourcecountry ? norm(a.sourcecountry) : '';
      const hit = src && centroids.has(ALIAS[src] ?? src)
        ? src
        : countryNames.find((n) => ` ${norm(a.title)} `.includes(` ${n} `));
      if (!hit) return;
      const k = ALIAS[hit] ?? hit;
      if (!centroids.has(k)) return;
      c.set(k, (c.get(k) ?? 0) + 1);
    });
    return [...c].map(([k, count]) => ({ name: nameOf.get(k) ?? k, count, lat: centroids.get(k)!.lat, lng: centroids.get(k)!.lng })).sort((a, b) => b.count - a.count);
  }, [arts, centroids, countryNames, nameOf]);
  const usingGeo = geo.length > 0, points = usingGeo ? geo : fromCountries;
  const allPlaces = useMemo<Located[]>(() => getWorldCountries().map((c) => ({ url: `place:${c.name}`, title: c.name, domain: 'Wikipedia', seendate: '', lat: c.centroid.lat, lng: c.centroid.lng, place: c.name, exact: true, isPlace: true })).sort((a, b) => a.place.localeCompare(b.place)), []);
  const placesOn = showPlaces ?? (!!err || (busy === 0 && arts.length === 0));
  const matches = useMemo(() => { const q = norm(finder); return q.length < 2 ? [] : allPlaces.filter((p) => norm(p.place).includes(q)).slice(0, 8); }, [finder, allPlaces]);
  const located = useMemo<Located[]>(() => arts.map((a): Located => {
    const t = ` ${norm(a.title)} `;
    const hit = countryNames.find((n) => t.includes(` ${n} `));
    const k = hit ?? ALIAS[norm(a.sourcecountry ?? '')] ?? norm(a.sourcecountry ?? '');
    const ct = centroids.get(k) ?? centroids.get(ALIAS[k] ?? k);
    if (!ct) return { ...a, lat: 0, lng: 0, place: a.sourcecountry || a.domain || '', exact: false, geo: false };
    const j1 = hash(a.url) - 0.5, j2 = hash(a.url + 'x') - 0.5;
    const place = hit ? hit.replace(/\b\w/g, (c) => c.toUpperCase()) : (a.sourcecountry ?? '');
    return { ...a, lat: Math.max(-80, Math.min(80, ct.lat + j1 * 3)), lng: ct.lng + j2 * 3, place, exact: !!hit, geo: true };
  }), [arts, countryNames, centroids]);
  const kz = vb.w / 1000;
  const visible = useMemo<Located[]>(() => {
    let l = located;
    if (maxAge !== 'all') l = l.filter((a) => ageMin(a.seendate) <= Number(maxAge));
    if (srcFilter) l = l.filter((a) => a.domain === srcFilter);
    return sortBy === 'place' ? [...l].sort((a, b) => a.place.localeCompare(b.place) || b.seendate.localeCompare(a.seendate)) : l;
  }, [located, maxAge, srcFilter, sortBy]);
  const shown = useMemo<Located[]>(() => (savedOnly ? Object.values(saved) : visible), [savedOnly, saved, visible]);
  const topSources = useMemo(() => { const c = new Map<string, number>(); located.forEach((a) => c.set(a.domain, (c.get(a.domain) ?? 0) + 1)); return [...c.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6); }, [located]);
  const placeCount = useMemo(() => new Set(visible.map((a) => a.place)).size, [visible]);
  const copyLink = useCallback((url: string) => { void navigator.clipboard?.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }).catch(() => {}); }, []);
  const shownRef = useRef(shown); shownRef.current = shown;
  const selRef = useRef(sel); selRef.current = sel;
  useEffect(() => {
    if (layout !== 'focus') return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable) || e.metaKey || e.ctrlKey || e.altKey) return;
      const list = shownRef.current, cur = selRef.current, i = cur ? list.findIndex((a) => a.url === cur.url) : -1;
      if (e.key === 'j' || e.key === 'ArrowDown') { if (list.length) { e.preventDefault(); select(list[Math.min(list.length - 1, i + 1)]); } }
      else if (e.key === 'k' || e.key === 'ArrowUp') { if (list.length) { e.preventDefault(); select(list[Math.max(0, i - 1)]); } }
      else if (e.key === 'Escape') select(null);
      else if (e.key === 'l') setLive((v) => !v);
      else if (e.key === 'r') setRotate((v) => !v);
      else if (e.key === 's' && cur && !cur.isPlace) toggleSave(cur);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [layout, select, toggleSave]);

  const exportCsv = useCallback(() => {
    const head = ['title', 'domain', 'seendate', 'place', 'lat', 'lng', 'url'];
    const body = shown.map((a) => [a.title, a.domain, a.seendate, a.place, a.lat.toFixed(3), a.lng.toFixed(3), a.url].map(csvCell).join(','));
    const url = URL.createObjectURL(new Blob([[head.join(','), ...body].join('\n')], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = `world-monitor-${topic}.csv`; a.click(); URL.revokeObjectURL(url);
  }, [shown, topic]);
  const globeMarkers = useMemo<GlobeMarker[]>(() => [
    ...(placesOn ? allPlaces.map((a) => ({ id: a.url, lat: a.lat, lng: a.lng, kind: 'place' as const, selected: sel?.url === a.url })) : []),
    ...visible.filter((a) => a.geo !== false).slice(0, 80).map((a) => ({ id: a.url, lat: a.lat, lng: a.lng, kind: 'news' as const, fresh: fresh.has(a.url), selected: sel?.url === a.url })),
    ...(sel ? planes.map((p) => ({ id: `plane:${p.icao24}`, lat: p.lat, lng: p.lng, kind: 'plane' as const, heading: p.headingDeg ?? 0 })) : []),
  ], [placesOn, allPlaces, visible, fresh, sel, planes]);
  const pickGlobe = useCallback((id: string) => {
    const a = located.find((x) => x.url === id) ?? allPlaces.find((x) => x.url === id);
    if (a) select(sel?.url === a.url ? null : a);
  }, [located, allPlaces, sel, select]);
  const avgTone = tone.length ? tone.slice(-12).reduce((a, b) => a + b, 0) / Math.min(12, tone.length) : null;
  const volume = useMemo(() => {
    if (vol.length) return vol;
    if (!arts.length) return [];
    const now = Date.now();
    const hours = span === '1h' ? 1 : span === '6h' ? 6 : span === '24h' ? 24 : 24 * 7;
    const bins = new Array(24).fill(0) as number[];
    for (const a of arts) {
      const m = /^(\d{4})(\d\d)(\d\d)T(\d\d)(\d\d)(\d\d)/.exec(a.seendate);
      if (!m) continue;
      const t = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
      const age = (now - t) / 3_600_000;
      if (age < 0 || age > hours) continue;
      const i = Math.min(23, Math.floor((age / hours) * 24));
      bins[23 - i] += 1;
    }
    return bins;
  }, [vol, arts, span]);
  const loading = busy > 0;

  return (
    <div className="mx-auto max-w-[1280px] space-y-8 px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-6 pt-4">
        <div>
          <HeroTitle>{mt(lang, 'title')}</HeroTitle>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-neutral-600 dark:text-slate-400 sm:text-lg">{mt(lang, 'subtitle')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="spatial-glass inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs">
            <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60" /><span className="relative inline-flex h-2 w-2 rounded-full bg-current" /></span>
            {mt(lang, 'live')}{updated ? ` · ${updated.toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' })}` : ''}
          </span>
          {provider && <span className="spatial-glass inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs"><Globe2 className="h-3.5 w-3.5" />{providerName(provider)}</span>}
          <SegmentedControl value={layout} onChange={setLayout} options={[{ value: 'center', label: mt(lang, 'allTopics') }, { value: 'focus', label: mt(lang, 'mapFocus') }]} />
          <SegmentedControl value={span} onChange={setSpan} options={SPANS.map((s) => ({ value: s, label: s }))} />
          <SegmentedControl value={eng} onChange={setEng} options={[{ value: 'en', label: mt(lang, 'english') }, { value: 'all', label: mt(lang, 'allLangs') }]} />
          <MagneticButton variant="glass" size="sm" onClick={() => setTick((t) => t + 1)}><RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />{mt(lang, 'refresh')}</MagneticButton>
        </div>
      </div>

      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); const q = draft.trim(); if (q.length >= 3) { setCustomQ(q); setTopic('custom'); setLayout('focus'); } }}>
        <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={mt(lang, 'searchPh')} aria-label={mt(lang, 'search')} className="spatial-glass min-h-[40px] flex-1 rounded-full px-4 text-sm outline-none" />
        <MagneticButton variant="primary" size="sm" type="submit">{mt(lang, 'search')}</MagneticButton>
      </form>

          {layout === 'center' ? <>
          <div className="spatial-card relative min-h-[360px] overflow-hidden p-2">
            <MonitorGlobe rotate={rotate} markers={globeMarkers} focus={null} onPick={pickGlobe} />
            <div className="pointer-events-none absolute inset-x-4 bottom-3 flex items-center justify-between text-[11px] text-white/70">
              <span>{`${visible.length} live stories · ${points.length} hotspots`}</span>
              <span className="rounded-full bg-black/40 px-2 py-1">{provider ? `${providerName(provider)} wire` : 'Live wire'}</span>
            </div>
          </div>
          <CommandCenter span={span} eng={eng} tick={tick} lang={lang} onOpen={(id) => { setTopic(id); setLayout('focus'); }} />
          </> : (<>
      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
        {customQ && <button type="button" onClick={() => setTopic('custom')} aria-pressed={topic === 'custom'} className={`tactile-press shrink-0 cursor-pointer rounded-full px-4 py-2 text-[13px] font-medium ${topic === 'custom' ? 'bg-blue-600 text-white' : 'spatial-glass text-neutral-700 dark:text-slate-200'}`}>“{customQ}”</button>}
        {TOPICS.map((tp) => (
          <button key={tp.id} type="button" onClick={() => setTopic(tp.id)} aria-pressed={topic === tp.id}
            className={`tactile-press shrink-0 cursor-pointer rounded-full px-4 py-2 text-[13px] font-medium ${topic === tp.id ? 'bg-blue-600 text-white' : 'spatial-glass text-neutral-700 dark:text-slate-200'}`}>{mt(lang, tp.id as MonitorKey)}</button>
        ))}
        {place && <button type="button" onClick={() => setPlace(null)} className="tactile-press spatial-glass inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-medium">{place}<X className="h-3.5 w-3.5" /></button>}
      </div>

      {err && (
        <div role="alert" className="spatial-card flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
          <span>The live wire slowed down ({err}). Showing the most recent cached stories. <button type="button" onClick={() => setTick((t) => t + 1)} className="underline">Try again</button></span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="space-y-5 lg:col-span-8">
          <div className="relative flex flex-wrap items-center gap-2">
            <button type="button" aria-pressed={placesOn} onClick={() => setShowPlaces(!placesOn)} className={`tactile-press cursor-pointer rounded-full px-4 py-2 text-[13px] font-medium ${placesOn ? 'bg-sky-600 text-white' : 'spatial-glass'}`}>All places ({allPlaces.length})</button>
            <input value={finder} onChange={(e) => setFinder(e.target.value)} placeholder="Find a place…" aria-label="Find a place" className="spatial-glass min-h-[36px] w-48 rounded-full px-4 text-sm outline-none" />
            {matches.length > 0 && <ul className="spatial-glass absolute start-0 top-11 z-20 w-64 overflow-hidden rounded-xl text-sm">{matches.map((m) => <li key={m.url}><button type="button" onClick={() => { setShowPlaces(true); select(m); setFinder(''); }} className="block w-full cursor-pointer px-4 py-2 text-start hover:bg-black/[.06] dark:hover:bg-white/10">{m.place}</button></li>)}</ul>}
            <button type="button" aria-pressed={live} onClick={() => setLive(!live)} className={`tactile-press inline-flex cursor-pointer items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-medium ${live ? 'bg-emerald-600 text-white' : 'spatial-glass'}`}>{live ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}{live ? 'Live · 5s' : 'Paused'}</button>
            <input value={watch} onChange={(e) => setWatch(e.target.value)} onFocus={enableAlerts} placeholder="Watchlist: keywords, comma-separated" aria-label="Watchlist keywords" className="spatial-glass min-h-[36px] w-64 rounded-full px-4 text-sm outline-none" />
            {watch && <Bell className="h-4 w-4 text-amber-500" aria-label="Alerts on" />}
            <button type="button" aria-pressed={savedOnly} onClick={() => setSavedOnly(!savedOnly)} className={`tactile-press inline-flex cursor-pointer items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-medium ${savedOnly ? 'bg-amber-500 text-black' : 'spatial-glass'}`}><Star className="h-3.5 w-3.5" />Saved ({Object.keys(saved).length})</button>
            <button type="button" onClick={exportCsv} disabled={!shown.length} className="tactile-press spatial-glass inline-flex cursor-pointer items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-medium disabled:opacity-40"><Download className="h-3.5 w-3.5" />CSV</button>
            <select value={maxAge} onChange={(e) => setMaxAge(e.target.value as typeof maxAge)} aria-label="Recency filter" className="spatial-glass min-h-[36px] cursor-pointer rounded-full px-3 text-[13px] outline-none"><option value="all">Any age</option><option value="15">Last 15 min</option><option value="60">Last hour</option><option value="360">Last 6 h</option></select>
            <button type="button" onClick={() => setSortBy(sortBy === 'new' ? 'place' : 'new')} className="tactile-press spatial-glass cursor-pointer rounded-full px-4 py-2 text-[13px] font-medium">Sort: {sortBy === 'new' ? 'newest' : 'place'}</button>
            <button type="button" aria-pressed={rotate} onClick={() => setRotate(!rotate)} className={`tactile-press inline-flex cursor-pointer items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-medium ${rotate ? 'bg-sky-600 text-white' : 'spatial-glass'}`}><Globe2 className="h-3.5 w-3.5" />Spin</button>
            {err && <span className="text-xs text-neutral-500 dark:text-slate-400">News unavailable: showing places instead.</span>}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500 dark:text-slate-400" aria-live="polite">
            <span><strong className="text-neutral-900 dark:text-white">{visible.length}</strong> stories</span><span aria-hidden="true">·</span>
            <span><strong className="text-neutral-900 dark:text-white">{placeCount}</strong> places</span><span aria-hidden="true">·</span>
            <span><strong className="text-neutral-900 dark:text-white">{fresh.size}</strong> new</span>
            {updated && <><span aria-hidden="true">·</span><span>Updated {updated.toLocaleTimeString()}</span></>}
            <span className="hidden md:inline">· Keys: j/k next/prev, s save, l live, r spin, Esc clear</span>
            {topSources.map(([d, n]) => <button key={d} type="button" aria-pressed={srcFilter === d} onClick={() => setSrcFilter(srcFilter === d ? null : d)} className={`cursor-pointer rounded-full px-2.5 py-1 ${srcFilter === d ? 'bg-blue-600 text-white' : 'spatial-glass'}`}>{d} ({n})</button>)}
            {srcFilter && <button type="button" onClick={() => setSrcFilter(null)} className="cursor-pointer underline">clear source</button>}
          </div>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div className="spatial-card relative overflow-hidden p-2">
            <svg viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`} className="w-full" role="img" aria-label="Map of news hotspots">
              <WorldBase />
              {points.map((p, i) => {
                const [x, y] = proj(p.lat, p.lng), r = (2.5 + Math.min(9, Math.sqrt(p.count) * 0.9)) * Math.max(kz, 0.3), sel2 = place === short(p.name);
                return (
                  <g key={`${p.name}-${i}`} className="cursor-pointer" onClick={() => setPlace(sel2 ? null : short(p.name))}>
                    <title>{`${p.name} · ${p.count}`}</title>
                    {i < 5 && <circle cx={x} cy={y} r={r} className="monitor-ping fill-none stroke-neutral-900 dark:stroke-white" />}
                    <circle cx={x} cy={y} r={r} className={sel2 ? 'fill-neutral-900 dark:fill-white' : 'fill-neutral-900/55 dark:fill-white/60'} stroke="currentColor" strokeWidth={0.4 * kz} />
                  </g>
                );
              })}
              {placesOn && allPlaces.map((a) => { const [x, y] = proj(a.lat, a.lng), isSel = sel?.url === a.url; return (
                <g key={a.url} className="cursor-pointer" onClick={() => select(isSel ? null : a)}>
                  <title>{`${a.place} · ${a.lat.toFixed(2)}, ${a.lng.toFixed(2)}`}</title>
                  <circle cx={x} cy={y} r={(isSel ? 4.5 : 2.6) * Math.max(kz, 0.25)} className={isSel ? 'fill-sky-500 stroke-white' : 'fill-sky-500/60 stroke-sky-700/60'} strokeWidth={0.4 * kz} />
                  {kz < 0.6 && <text x={x + 4 * kz} y={y + 1.5 * kz} fontSize={5 * kz * 1.6} className="pointer-events-none fill-neutral-700 dark:fill-slate-200">{short(a.place)}</text>}
                </g>); })}
              {visible.filter((a) => a.geo !== false).slice(0, 80).map((a) => {
                const [x, y] = proj(a.lat, a.lng), isSel = sel?.url === a.url, isNew = fresh.has(a.url), r = (isSel ? 6 : isNew ? 5 : 3.2) * Math.max(kz, 0.22);
                return (
                  <g key={a.url} className="cursor-pointer" onClick={() => select(isSel ? null : a)}>
                    <title>{a.title}</title>
                    <circle cx={x} cy={y} r={r * 2.2} className={`fill-amber-400/25 ${isNew || isSel ? 'monitor-ping' : ''}`} />
                    <circle cx={x} cy={y} r={r} className="fill-amber-400 stroke-amber-600" strokeWidth={0.5 * kz} style={{ filter: 'drop-shadow(0 0 3px rgba(251,191,36,.95))' }} />
                  </g>
                );
              })}
              {sel && planes.map((p) => { const [x, y] = proj(p.lat, p.lng); return (
                <g key={p.icao24} transform={`translate(${x} ${y}) rotate(${p.headingDeg ?? 0}) scale(${Math.max(kz, 0.22)})`}>
                  <title>{`${p.callsign || p.icao24} · ${p.country}`}</title>
                  <path d="M0,-5 L3,5 L0,3 L-3,5Z" className="fill-sky-500 stroke-white" strokeWidth={0.5} />
                </g>); })}
            </svg>
            <p className="px-3 pb-2 text-xs text-neutral-500 dark:text-slate-400">
              {points.length ? (usingGeo ? 'Markers: places mentioned in coverage (GDELT GEO). Click one to drill in.' : 'Markers: countries publishing the coverage (location data unavailable). Click one to drill in.') : loading ? 'Loading map data…' : 'No locations for this selection.'}
            </p>
          </div>
          <div className="spatial-card relative min-h-[340px] overflow-hidden p-2 xl:min-h-0">
            <MonitorGlobe rotate={rotate} markers={globeMarkers} focus={sel ? { lat: sel.lat, lng: sel.lng } : null} onPick={pickGlobe} />
          </div>
          </div>

          {sel && (
            <div className="spatial-card overflow-hidden">
              <div className="flex flex-col gap-4 p-4 sm:flex-row">
                <NewsPhoto key={sel.url} src={sel.isPlace ? undefined : sel.socialimage} topic={sel.place} className="h-40 w-full rounded-xl object-cover sm:w-56 sm:shrink-0" />
                <div className="min-w-0 flex-1 space-y-2">
                  <h3 className="font-display text-lg font-bold leading-snug">{sel.title}</h3>
                  <div className="text-xs text-neutral-500 dark:text-slate-400">{sel.isPlace ? 'Place' : `${sel.domain} · ${ago(sel.seendate, lang)} · ${sel.place}${sel.exact ? '' : ' (publisher country)'}`} · <span className="font-mono-tabular">{sel.lat.toFixed(3)}, {sel.lng.toFixed(3)}</span></div>
                  {sel.isPlace && <PlaceSummary name={sel.place} />}
                  <div className="flex flex-wrap gap-2">
                    <a href={sel.isPlace ? `https://en.wikipedia.org/wiki/${encodeURIComponent(sel.place.replace(/\s+/g, '_'))}` : sel.url} target="_blank" rel="noopener noreferrer" className="tactile-press inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-blue-600 px-4 py-2 text-[13px] font-medium text-white"><ExternalLink className="h-3.5 w-3.5" />{sel.isPlace ? 'Wikipedia' : 'Read article'}</a>
                    <a href={`https://www.google.com/maps/@${sel.lat},${sel.lng},8z`} target="_blank" rel="noopener noreferrer" className="tactile-press spatial-glass inline-flex cursor-pointer items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-medium"><ExternalLink className="h-3.5 w-3.5" />Maps</a>
                    {!sel.isPlace && <button type="button" onClick={() => copyLink(sel.url)} className="tactile-press spatial-glass inline-flex cursor-pointer items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-medium"><Copy className="h-3.5 w-3.5" />{copied ? 'Copied' : 'Copy link'}</button>}
                    {!sel.isPlace && <button type="button" onClick={() => toggleSave(sel)} aria-pressed={!!saved[sel.url]} className="tactile-press spatial-glass inline-flex cursor-pointer items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-medium"><Star className={`h-3.5 w-3.5 ${saved[sel.url] ? 'fill-amber-400 text-amber-500' : ''}`} />{saved[sel.url] ? 'Saved' : 'Save'}</button>}
                    <button type="button" onClick={() => select(null)} className="tactile-press spatial-glass inline-flex cursor-pointer items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-medium"><ZoomOut className="h-3.5 w-3.5" />World view</button>
                  </div>
                </div>
              </div>
              <div className="border-t border-neutral-200/70 px-4 py-3 dark:border-white/10">
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold"><PlaneIcon className="h-3.5 w-3.5" />Live aircraft within ~3° of this location <span className="font-normal opacity-60">(OpenSky, {planes.length})</span></div>
                {planeErr && <div className="text-xs text-neutral-500 dark:text-slate-400">{planeErr}</div>}
                {!planeErr && !planes.length && <div className="text-xs text-neutral-500 dark:text-slate-400">No aircraft reported here right now.</div>}
                <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  {planes.slice(0, 8).map((p) => (
                    <li key={p.icao24} className="flex items-center gap-3 rounded-xl border border-neutral-200/70 p-2 text-xs dark:border-white/10">
                      {planes.indexOf(p) < 4 && <PlanePhoto hex={p.icao24} />}
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold">{p.callsign || p.icao24.toUpperCase()} <span className="font-normal opacity-60">· {p.country}</span></div>
                        <div className="opacity-70">{p.onGround ? 'On ground' : `${p.altM != null ? Math.round(p.altM * 3.281).toLocaleString() : '?'} ft`} · {p.speedMs != null ? Math.round(p.speedMs * 1.944) : '?'} kt · {p.headingDeg != null ? `${Math.round(p.headingDeg)}°` : '?'}{p.vRateMs ? ` · ${p.vRateMs > 0 ? '▲' : '▼'}${Math.abs(Math.round(p.vRateMs * 196.85))} ft/min` : ''}</div>
                      </div>
                      <a href={p.callsign ? `https://www.flightradar24.com/${p.callsign}` : `https://opensky-network.org/aircraft-profile?icao24=${p.icao24}`} target="_blank" rel="noopener noreferrer" aria-label="Open flight details" className="shrink-0 opacity-70 hover:opacity-100"><ExternalLink className="h-3.5 w-3.5" /></a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {points.slice(0, 8).map((p) => (
              <button key={p.name} type="button" onClick={() => setPlace(short(p.name))} className="tactile-press spatial-glass cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-medium">{short(p.name)} <span className="opacity-60">{p.count}</span></button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="spatial-card p-5"><div className="text-xs text-neutral-500 dark:text-slate-400">Articles in feed</div><div className="mt-1 font-display text-4xl font-bold tracking-tight">{loading && !arts.length ? '…' : arts.length}</div></div>
            <div className="spatial-card p-5 text-neutral-900 dark:text-slate-100"><div className="text-xs text-neutral-500 dark:text-slate-400">Coverage volume</div><Spark v={volume} /></div>
            <div className="spatial-card p-5 text-neutral-900 dark:text-slate-100"><div className="flex items-baseline justify-between text-xs text-neutral-500 dark:text-slate-400"><span>Average tone</span><span className="font-mono-tabular text-sm font-semibold text-neutral-900 dark:text-slate-100">{avgTone === null ? (loading ? '…' : '—') : avgTone.toFixed(1)}</span></div><Spark v={tone} /></div>
          </div>
        </div>

        <aside className="spatial-card flex max-h-[760px] flex-col overflow-hidden lg:col-span-4" aria-label="Live feed">
          <div className="flex items-center justify-between border-b border-neutral-200/70 px-5 py-4 dark:border-white/10"><h2 className="font-display text-lg font-bold">{mt(lang, 'liveFeed')}</h2><span className="text-xs text-neutral-500 dark:text-slate-400">{arts.length} {mt(lang, 'stories')}</span></div>
          <ul className="flex-1 divide-y divide-neutral-200/70 overflow-y-auto dark:divide-white/10">
            {loading && !arts.length && Array.from({ length: 7 }, (_, i) => <li key={i} className="p-5"><div className="h-3 w-11/12 animate-pulse rounded-full bg-black/10 dark:bg-white/10" /><div className="mt-2 h-3 w-2/3 animate-pulse rounded-full bg-black/10 dark:bg-white/10" /></li>)}
            {!savedOnly && located.length === 0 && arts.map((a) => (
              <li key={a.url}><a href={a.url} target="_blank" rel="noopener noreferrer" className="block px-5 py-4 text-sm font-medium">{a.title}</a></li>
            ))}
            {savedOnly && !shown.length && <li className="p-6 text-sm text-neutral-500 dark:text-slate-400">No saved stories yet. Use the star on any story.</li>}
            {shown.map((a) => (
              <li key={a.url} className={`${sel?.url === a.url ? 'bg-amber-400/10' : ''} ${isWatched(a) ? 'border-s-4 border-amber-400' : ''}`}>
                <div className="group flex items-start gap-3 px-5 py-4 transition-colors hover:bg-black/[.04] dark:hover:bg-white/[.05]">
                  {a.socialimage && <img src={a.socialimage} alt="" loading="lazy" referrerPolicy="no-referrer" onError={(e) => { (e.currentTarget.style.display = 'none'); }} className="h-14 w-20 shrink-0 rounded-lg object-cover" />}
                  <button type="button" onClick={() => select(sel?.url === a.url ? null : a)} className="min-w-0 flex-1 cursor-pointer text-start">
                    <div className="text-sm font-medium leading-snug">{fresh.has(a.url) && <span className="me-1.5 rounded bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold text-black">NEW</span>}{isWatched(a) && <span className="me-1.5 rounded bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white">WATCH</span>}{a.title}</div>
                    <div className="mt-1.5 flex items-center gap-1.5 text-xs text-neutral-500 dark:text-slate-400"><span className="truncate">{a.domain}</span><span aria-hidden="true">·</span><span className="shrink-0">{a.place}</span><span aria-hidden="true">·</span><span className="shrink-0">{ago(a.seendate, lang)}</span></div>
                  </button>
                  <button type="button" onClick={() => toggleSave(a)} aria-pressed={!!saved[a.url]} aria-label="Save story" className="shrink-0 cursor-pointer"><Star className={`h-3.5 w-3.5 ${saved[a.url] ? 'fill-amber-400 text-amber-500' : 'opacity-50 hover:opacity-100'}`} /></button>
                  <a href={a.url} target="_blank" rel="noopener noreferrer" aria-label="Open article" className="shrink-0 opacity-50 hover:opacity-100"><ExternalLink className="h-3.5 w-3.5" /></a>
                </div>
              </li>
            ))}
            {!loading && !arts.length && !err && <li className="p-6 text-sm text-neutral-500 dark:text-slate-400">No stories matched. Try a longer time range or All languages.</li>}
          </ul>
        </aside>
      </div>
      </>)}

      <p className="text-xs leading-relaxed text-neutral-500 dark:text-slate-400">Sources: GDELT Project (news media) and OpenSky Network (live aircraft near the selected story; story locations are inferred from the headline or publisher country). Coverage is collected automatically and not fact-checked; tone is an automated sentiment score of the coverage, not a verdict on events. Headlines belong to their original publishers.</p>
    </div>
  );
}
