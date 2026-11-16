/**
 * Runtime auto-translation layer.
 *
 * The whole product is authored in English. Instead of hand-wrapping thousands
 * of literals, this layer walks the rendered DOM, batches unseen English
 * phrases to `/api/translate` (server-cached), and swaps the visible copy.
 * React re-renders are re-translated by a MutationObserver, and every phrase is
 * cached in localStorage per language so repeat visits are instant and offline.
 *
 * It intentionally skips data-heavy surfaces (`[data-no-i18n]`), code, inputs,
 * SVG and anything that is not Latin-script English, so proper nouns and
 * already-localized content are never mangled.
 */

const CACHE_PREFIX = 'chronos-mt-v1:';
const MAX_CACHE = 6000;

const SKIP_TAGS = new Set([
  'SCRIPT', 'STYLE', 'NOSCRIPT', 'CODE', 'PRE', 'KBD', 'SVG', 'CANVAS', 'INPUT', 'TEXTAREA', 'OPTION',
]);
const ATTRS = ['placeholder', 'aria-label', 'title', 'alt'];

/* Non-Latin scripts + Turkish-specific letters mean "already localized". */
const NON_ENGLISH = /[\u00c0-\u024f\u0370-\u03ff\u0400-\u04ff\u0590-\u05ff\u0600-\u06ff\u0900-\u097f\u0e00-\u0e7f\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/;

type Listener = () => void;

let activeLang = 'en';
const memory = new Map<string, string>();
const originals = new Map<Text, string>();
const attrOriginals = new WeakMap<Element, Record<string, string>>();
const queue = new Set<string>();
const inflight = new Set<string>();
let timer: number | null = null;
let observer: MutationObserver | null = null;
let enabled = false;

function isLatin(_lang: string) {
  return true;
}

function shouldTranslate(text: string) {
  const t = text.trim();
  if (t.length < 2 || t.length > 320) return false;
  if (!/[A-Za-z]/.test(t)) return false;
  if (!/[A-Za-z]{2}/.test(t)) return false;
  if (NON_ENGLISH.test(t)) return false;
  // Skip pure identifiers / URLs / file names
  if (/^https?:\/\//.test(t) || /^[\w.-]+@[\w.-]+$/.test(t)) return false;
  if (/^[\w-]+\.[a-z]{2,4}(\/\S*)?$/i.test(t)) return false;
  // Brand and product names stay as written.
  if (/Chronos Atlas/i.test(t)) return false;
  return true;
}

function readCache(lang: string) {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + lang);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, string>;
    for (const [k, v] of Object.entries(parsed)) memory.set(`${lang}\u0000${k}`, v);
  } catch {
    /* ignore quota / corrupt cache */
  }
}

let saveTimer: number | null = null;
function persist(lang: string) {
  if (saveTimer) return;
  saveTimer = window.setTimeout(() => {
    saveTimer = null;
    try {
      const out: Record<string, string> = {};
      let count = 0;
      for (const [key, value] of memory) {
        if (!key.startsWith(lang + '\u0000')) continue;
        out[key.slice(lang.length + 1)] = value;
        if (++count >= MAX_CACHE) break;
      }
      localStorage.setItem(CACHE_PREFIX + lang, JSON.stringify(out));
    } catch {
      /* ignore */
    }
  }, 1200);
}

function remember(lang: string, source: string, translated: string) {
  memory.set(`${lang}\u0000${source}`, translated);
  persist(lang);
}

function lookup(lang: string, source: string) {
  return memory.get(`${lang}\u0000${source}`);
}

function applyText(node: Text) {
  const parent = node.parentElement;
  if (!parent || SKIP_TAGS.has(parent.tagName) || parent.closest('[data-no-i18n],[translate="no"]')) return;
  const current = node.nodeValue;
  if (current === null) return;

  const original = originals.get(node) ?? current;
  if (!originals.has(node) && shouldTranslate(original)) originals.set(node, original);

  const source = (originals.get(node) ?? '').trim();
  if (!source) return;
  const translated = lookup(activeLang, source);
  if (!translated) {
    queue.add(source);
    schedule();
    return;
  }
  const lead = original.match(/^\s*/)?.[0] ?? '';
  const trail = original.match(/\s*$/)?.[0] ?? '';
  const next = lead + translated + trail;
  if (current !== next) node.nodeValue = next;
}

function applyAttrs(el: Element) {
  if (SKIP_TAGS.has(el.tagName) && el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA') return;
  if (el.closest('[data-no-i18n],[translate="no"]')) return;
  let store = attrOriginals.get(el);
  for (const attr of ATTRS) {
    const value = el.getAttribute(attr);
    if (!value || !shouldTranslate(value)) continue;
    if (!store) {
      store = {};
      attrOriginals.set(el, store);
    }
    if (!(attr in store)) store[attr] = value;
    const source = store[attr];
    const translated = lookup(activeLang, source.trim());
    if (!translated) {
      queue.add(source.trim());
      schedule();
      continue;
    }
    const next = translated;
    if (value !== next) el.setAttribute(attr, next);
  }
}

function walk(root: Node) {
  if (!enabled || activeLang === 'en' || !isLatin(activeLang)) return;
  if (root.nodeType === Node.TEXT_NODE) {
    applyText(root as Text);
    return;
  }
  if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) return;
  const el = root as Element;
  if (el.nodeType === Node.ELEMENT_NODE) {
    if (SKIP_TAGS.has(el.tagName)) return;
    if (el.closest('[data-no-i18n],[translate="no"]')) return;
    applyAttrs(el);
    for (const child of Array.from(el.children)) walk(child);
  }
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let n: Node | null;
  while ((n = walker.nextNode())) applyText(n as Text);
}

function schedule() {
  if (timer || activeLang === 'en') return;
  timer = window.setTimeout(flush, 90);
}

async function flush() {
  timer = null;
  if (activeLang === 'en') return;
  const lang = activeLang;
  const batch: string[] = [];
  for (const text of queue) {
    if (batch.length >= 40) break;
    if (inflight.has(text)) continue;
    if (lookup(lang, text)) continue;
    batch.push(text);
    inflight.add(text);
  }
  if (!batch.length) return;
  queue.clear();

  try {
    const res = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: lang, texts: batch }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as { translations?: string[] };
    const list = data.translations ?? [];
    batch.forEach((source, i) => {
      const translated = list[i];
      if (translated && translated.trim()) remember(lang, source, translated);
    });
  } catch {
    // Retry the same phrases once the network recovers.
    for (const text of batch) queue.add(text);
  } finally {
    for (const text of batch) inflight.delete(text);
  }

  if (activeLang !== lang) return;
  retranslateVisible();
  if (queue.size) schedule();
}

function retranslateVisible() {
  for (const [node, original] of originals) {
    if (!node.isConnected) {
      originals.delete(node);
      continue;
    }
    const parent = node.parentElement;
    if (!parent || SKIP_TAGS.has(parent.tagName)) continue;
    const source = original.trim();
    const translated = lookup(activeLang, source);
    if (!translated) {
      if (shouldTranslate(original)) {
        queue.add(source);
      }
      continue;
    }
    const lead = original.match(/^\s*/)?.[0] ?? '';
    const trail = original.match(/\s*$/)?.[0] ?? '';
    node.nodeValue = lead + translated + trail;
  }
  if (queue.size) schedule();
}

export function setTranslateLanguage(lang: string) {
  if (lang === activeLang) return;
  activeLang = lang;
  if (lang !== 'en' && isLatin(lang) && !memory.size) readCache(lang);
  if (lang !== 'en') readCache(lang);
  // Restore English sources first, then translate into the new language.
  for (const [node, original] of originals) {
    if (node.isConnected) node.nodeValue = original;
  }
  queue.clear();
  if (lang === 'en') return;
  requestAnimationFrame(() => {
    walk(document.body);
    if (queue.size) schedule();
  });
}

export function installAutoTranslate(lang: string) {
  if (enabled) {
    setTranslateLanguage(lang);
    return;
  }
  enabled = true;
  activeLang = lang;
  if (lang !== 'en') readCache(lang);

  observer = new MutationObserver((records) => {
    if (activeLang === 'en') return;
    for (const record of records) {
      if (record.type === 'childList') {
        record.addedNodes.forEach((node) => walk(node));
      } else if (record.type === 'characterData' && record.target.nodeType === Node.TEXT_NODE) {
        const node = record.target as Text;
        const original = originals.get(node);
        const current = node.nodeValue ?? '';
        if (original && current !== original && lookup(activeLang, original.trim())) {
          // React wrote English again — re-apply the translation.
          applyText(node);
        } else {
          applyText(node);
        }
      } else if (record.type === 'attributes' && record.target.nodeType === Node.ELEMENT_NODE) {
        applyAttrs(record.target as Element);
      }
    }
  });
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ATTRS,
  });

  window.addEventListener('chronos:language', (event) => {
    const detail = (event as CustomEvent<string>).detail;
    if (typeof detail === 'string') setTranslateLanguage(detail);
  });

  if (lang !== 'en') walk(document.body);
}
