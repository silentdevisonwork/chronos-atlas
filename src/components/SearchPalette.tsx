import * as Dialog from '@radix-ui/react-dialog';
import { Command } from 'cmdk';
import {
  ArrowRight,
  Calendar,
  Compass,
  Globe2,
  MapPin,
  Orbit,
  Search,
  Swords,
  TrendingUp,
  Tv,
  User,
  X,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import { t } from '../i18n/languages';
import { useAtlasStore } from '../store/useAtlasStore';
import type { SearchResultItem } from '../types';
import { POPULAR_SEARCH_TERMS, searchMultilingual } from '../utils/multilingualSearch';
import { SegmentedControl } from './ui/DesignPrimitives';

const CATEGORY_ICON: Record<SearchResultItem['entityType'], typeof Globe2> = {
  country: Globe2,
  civilization: Compass,
  figure: User,
  event: Calendar,
  site: MapPin,
  planet: Orbit,
  period: Calendar,
  war: Swords,
  trade: TrendingUp,
  video: Tv,
};

const GROUP_LABELS: Record<SearchResultItem['entityType'], string> = {
  country: 'Countries, Territories & GDP',
  civilization: 'Ancient Civilizations & Empires',
  war: 'Major Wars & Decisive Battles',
  trade: 'Global Trade Networks',
  figure: 'Historical Figures',
  site: 'Cities, Monuments & Archaeological Sites',
  event: 'Historical Events & Turning Points',
  video: 'Internet Documentary Videos',
  planet: 'Solar System & Celestial Bodies',
  period: 'Historical Periods',
};

export function SearchPalette() {
  const open = useAtlasStore((s) => s.searchOpen);
  const setOpen = useAtlasStore((s) => s.setSearchOpen);
  const lang = useAtlasStore((s) => s.progress.preferences.language);
  const recentSearches = useAtlasStore((s) => s.progress.recentSearches);
  const recordSearchTerm = useAtlasStore((s) => s.recordSearchTerm);

  const setView = useAtlasStore((s) => s.setView);
  const setInspector = useAtlasStore((s) => s.setInspector);
  const setSelectedYear = useAtlasStore((s) => s.setSelectedYear);
  const setFlyToCoords = useAtlasStore((s) => s.setFlyToCoords);
  const setSelectedPlanetId = useAtlasStore((s) => s.setSelectedPlanetId);
  const recordExploredLocation = useAtlasStore((s) => s.recordExploredLocation);

  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | SearchResultItem['entityType']>('all');

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(!open);
      } else if (
        e.key === '/' &&
        !open &&
        !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, setOpen]);

  const results = useMemo(() => {
    const all = searchMultilingual(query, lang, 48);
    if (activeCategory === 'all') return all.slice(0, 28);
    return all.filter((r) => r.entityType === activeCategory).slice(0, 28);
  }, [query, lang, activeCategory]);

  const grouped = useMemo(() => {
    const map = new Map<SearchResultItem['entityType'], SearchResultItem[]>();
    for (const item of results) {
      const list = map.get(item.entityType) ?? [];
      list.push(item);
      map.set(item.entityType, list);
    }
    return Array.from(map.entries());
  }, [results]);

  const navigateToResult = (item: SearchResultItem) => {
    if (query.trim()) recordSearchTerm(query.trim());

    if (item.targetYear !== undefined) setSelectedYear(item.targetYear);
    if (item.coords) setFlyToCoords(item.coords);

    if (item.entityType === 'planet' && item.targetId) {
      setSelectedPlanetId(item.targetId);
      setView('solar-system');
    } else if (item.entityType === 'country' && item.targetId) {
      if (item.targetId.startsWith('dyn:')) {
        const [, isoNumeric, ...nameParts] = item.targetId.split(':');
        const countryName = nameParts.join(':') || item.title;
        recordExploredLocation(isoNumeric || countryName);
        setInspector({
          type: 'dynamic-country',
          id: `dyn-${isoNumeric}`,
          isoNumeric,
          title: countryName,
          coords: item.coords,
        });
        setView('explore');
      } else {
        recordExploredLocation(item.targetId);
        setInspector({ type: 'country', id: item.targetId, coords: item.coords });
        setView('countries');
      }
    } else if (item.entityType === 'civilization' && item.targetId) {
      recordExploredLocation(item.targetId);
      setInspector({ type: 'civilization', id: item.targetId, coords: item.coords });
      setView('civilizations');
    } else if (item.entityType === 'figure' && item.targetId) {
      setInspector({ type: 'figure', id: item.targetId, coords: item.coords });
      setView('figures');
    } else if (item.entityType === 'site' && item.targetId) {
      recordExploredLocation(item.targetId);
      setInspector({ type: 'site', id: item.targetId, coords: item.coords });
      setView('explore');
    } else if (item.entityType === 'war' || item.entityType === 'trade') {
      setView(item.coords ? 'explore' : 'timeline');
    } else {
      setView(item.targetView);
    }

    setOpen(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-md" />
        <Dialog.Content className="fixed left-1/2 top-[8vh] z-50 w-[94vw] max-w-2xl -translate-x-1/2 focus:outline-none">
          <Dialog.Title className="sr-only">Universal Multilingual Search</Dialog.Title>
          <Dialog.Description className="sr-only">
            Search across 177+ countries, GDP records, civilizations, figures, wars, trade routes, videos, monuments, and planets in 20 languages.
          </Dialog.Description>

          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            className="overflow-hidden rounded-2xl spatial-glass shadow-2xl"
          >
            <Command shouldFilter={false} loop className="w-full">
              <div className="flex items-center gap-3 border-b border-neutral-200/80 dark:border-slate-800/80 px-4 py-3.5">
                <Search className="h-5 w-5 text-blue-700 dark:text-blue-400 shrink-0" />
                <Command.Input
                  autoFocus
                  value={query}
                  onValueChange={setQuery}
                  placeholder={t(lang, 'searchPlaceholder')}
                  className="w-full bg-transparent text-sm sm:text-base text-neutral-900 dark:text-slate-100 placeholder:text-neutral-400 dark:placeholder:text-slate-500 focus:outline-none"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    className="rounded-lg px-2 py-1 text-xs font-medium text-neutral-500 hover:text-neutral-800 dark:hover:text-slate-200 cursor-pointer"
                  >
                    Clear
                  </button>
                )}
                <Dialog.Close asChild>
                  <button
                    aria-label="Close search"
                    className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-200/70 dark:hover:bg-slate-800/80 cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </Dialog.Close>
              </div>

              <div className="border-b border-neutral-200/70 dark:border-slate-800/70 px-4 py-2 overflow-x-auto">
                <SegmentedControl
                  size="xs"
                  value={activeCategory}
                  onChange={setActiveCategory}
                  options={[
                    { value: 'all', label: 'All' },
                    { value: 'country', label: 'Countries' },
                    { value: 'civilization', label: 'Civilizations' },
                    { value: 'war', label: 'Wars' },
                    { value: 'trade', label: 'Trade' },
                    { value: 'figure', label: 'Figures' },
                    { value: 'video', label: 'Videos' },
                    { value: 'site', label: 'Sites' },
                    { value: 'planet', label: 'Solar' },
                  ]}
                />
              </div>

              {!query.trim() && (
                <div className="border-b border-neutral-200/60 dark:border-slate-800/60 px-4 py-3 space-y-2">
                  {recentSearches.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="text-neutral-500 dark:text-slate-400 font-medium">Recent:</span>
                      {recentSearches.slice(0, 4).map((term) => (
                        <button
                          key={term}
                          type="button"
                          onClick={() => setQuery(term)}
                          className="rounded-lg bg-neutral-200/70 dark:bg-slate-800/80 px-2.5 py-1 text-neutral-700 dark:text-slate-300 hover:text-blue-700 dark:hover:text-blue-400 cursor-pointer transition-colors"
                        >
                          {term}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-neutral-500 dark:text-slate-400 font-medium">Try searching:</span>
                    {POPULAR_SEARCH_TERMS.map((term) => (
                      <button
                        key={term}
                        type="button"
                        onClick={() => setQuery(term)}
                        className="rounded-lg border border-neutral-200/80 dark:border-slate-800 px-2.5 py-1 text-neutral-700 dark:text-slate-300 hover:border-blue-600/70 cursor-pointer transition-colors"
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <Command.List className="max-h-[52vh] overflow-y-auto p-2">
                <Command.Empty className="py-10 text-center text-sm text-neutral-500 dark:text-slate-400">
                  No historical, economic, or astronomical matches found for "{query}".
                </Command.Empty>

                {grouped.map(([type, items]) => (
                  <Command.Group
                    key={type}
                    heading={GROUP_LABELS[type]}
                    className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-neutral-400 dark:[&_[cmdk-group-heading]]:text-slate-500"
                  >
                    {items.map((item) => {
                      const Icon = CATEGORY_ICON[item.entityType];
                      return (
                        <Command.Item
                          key={item.id}
                          value={`${item.title} ${item.subtitle} ${item.matchedAlias ?? ''}`}
                          onSelect={() => navigateToResult(item)}
                          className="group flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-200/80 dark:bg-slate-800/90 text-blue-700 dark:text-blue-400 shrink-0">
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-neutral-900 dark:text-slate-100 truncate">
                                {item.title}
                              </div>
                              <div className="text-xs text-neutral-500 dark:text-slate-400 truncate">
                                {item.subtitle}
                                {item.matchedAlias ? ` · Alias: ${item.matchedAlias}` : ''}
                              </div>
                            </div>
                          </div>
                          <ArrowRight className="h-3.5 w-3.5 text-neutral-400 group-data-[selected=true]:text-blue-500 transition-transform group-data-[selected=true]:translate-x-0.5 shrink-0" />
                        </Command.Item>
                      );
                    })}
                  </Command.Group>
                ))}
              </Command.List>

              <div className="flex items-center justify-between border-t border-neutral-200/70 dark:border-slate-800/70 px-4 py-2 text-[11px] text-neutral-500 dark:text-slate-400">
                <span>Use ↑ ↓ arrows to navigate · Enter to jump</span>
                <span className="font-mono-tabular">177+ Countries · Wars · Trade · Videos</span>
              </div>
            </Command>
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
