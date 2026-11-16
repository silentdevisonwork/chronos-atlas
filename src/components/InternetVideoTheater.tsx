import { ExternalLink, Film, Globe2, Play, Search, Tv } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { INTERNET_VIDEOS } from '../data/internetVideos';
import { useAtlasStore } from '../store/useAtlasStore';
import type { InternetVideoEntry } from '../types';
import { DocumentaryVideoPlayer } from './DocumentaryVideoPlayer';
import { SegmentedControl } from './ui/DesignPrimitives';

interface InternetVideoTheaterProps {
  initialTopic?: 'all' | InternetVideoEntry['topic'];
  compact?: boolean;
  filterVideoIds?: string[];
  subjectName?: string;
  strictSubjectMatch?: boolean;
}

export function InternetVideoTheater({
  initialTopic = 'all',
  compact = false,
  filterVideoIds,
  subjectName,
  strictSubjectMatch = false,
}: InternetVideoTheaterProps) {
  const setSelectedYear = useAtlasStore((s) => s.setSelectedYear);
  const setFlyToCoords = useAtlasStore((s) => s.setFlyToCoords);
  const setView = useAtlasStore((s) => s.setView);

  const [topic, setTopic] = useState<'all' | InternetVideoEntry['topic']>(initialTopic);
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'youtube' | 'local-reel'>('youtube');

  const pool = useMemo(() => {
    let base = INTERNET_VIDEOS;
    if (filterVideoIds !== undefined) {
      if (strictSubjectMatch) {
        base = base.filter((v) => filterVideoIds.includes(v.id));
      } else if (filterVideoIds.length > 0) {
        const matched = base.filter((v) => filterVideoIds.includes(v.id));
        if (matched.length > 0) base = matched;
      }
    }
    if (topic !== 'all') {
      base = base.filter((v) => v.topic === topic);
    }
    const q = query.trim().toLowerCase();
    if (q) {
      base = base.filter(
        (v) =>
          v.title.toLowerCase().includes(q) ||
          v.channel.toLowerCase().includes(q) ||
          v.summary.toLowerCase().includes(q) ||
          v.keywords.some((k) => k.toLowerCase().includes(q))
      );
    }
    return base;
  }, [topic, query, filterVideoIds, strictSubjectMatch]);

  const [selectedId, setSelectedId] = useState<string>(() => pool[0]?.id ?? '');

  useEffect(() => {
    if (pool.length > 0 && !pool.some((v) => v.id === selectedId)) {
      setSelectedId(pool[0].id);
    } else if (pool.length === 0 && selectedId !== '') {
      setSelectedId('');
    }
  }, [pool, selectedId]);

  const activeVideo: InternetVideoEntry | null =
    pool.find((v) => v.id === selectedId) ?? pool[0] ?? (strictSubjectMatch ? null : INTERNET_VIDEOS[0]);

  return (
    <div className="space-y-4">
      {!compact && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="overflow-x-auto max-w-full">
            <SegmentedControl
              size="xs"
              value={topic}
              onChange={setTopic}
              options={[
                { value: 'all', label: `All (${INTERNET_VIDEOS.length})` },
                { value: 'civilizations', label: 'Civilizations' },
                { value: 'countries', label: 'Countries' },
                { value: 'figures', label: 'Figures' },
                { value: 'wars', label: 'Wars' },
                { value: 'trade-gdp', label: 'Trade & GDP' },
                { value: 'cosmos', label: 'Cosmos' },
              ]}
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search videos, wars, GDP..."
                className="rounded-xl spatial-card pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 w-48 sm:w-56"
              />
            </div>

            <SegmentedControl
              size="xs"
              value={mode}
              onChange={setMode}
              options={[
                { value: 'youtube', label: 'Internet Stream' },
                { value: 'local-reel', label: 'Archival Reel' },
              ]}
            />
          </div>
        </div>
      )}

      {compact && (
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-neutral-800 dark:text-slate-200 flex items-center gap-1.5">
            <Tv className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            {subjectName ? `${subjectName} Documentaries` : 'Internet Documentary Stream'}
          </span>
          <SegmentedControl
            size="xs"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'youtube', label: 'YouTube' },
              { value: 'local-reel', label: 'Canvas Reel' },
            ]}
          />
        </div>
      )}

      {mode === 'local-reel' ? (
        <DocumentaryVideoPlayer
          compact={compact}
          onSyncChapterTo3D={(ch) => {
            setSelectedYear(ch.year);
            setFlyToCoords(ch.coords);
            setView('explore');
          }}
        />
      ) : !activeVideo ? (
        <div className="rounded-2xl border border-neutral-200/80 dark:border-slate-800/80 spatial-card p-5 space-y-3 text-xs">
          <div className="font-semibold text-neutral-900 dark:text-slate-100">
            No pre-indexed documentary stream matches “{subjectName ?? 'this subject'}”
          </div>
          <p className="text-neutral-600 dark:text-slate-400 leading-relaxed">
            To avoid displaying footage from an unrelated region, unrelated videos are hidden here. Search YouTube directly for documentaries on {subjectName ?? 'this topic'} or switch to the animated Archival Canvas Reel.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={`https://www.youtube.com/results?search_query=${encodeURIComponent(
                `${subjectName ?? 'world'} history documentary`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="tactile-press inline-flex items-center gap-1.5 rounded-xl bg-blue-800 hover:bg-blue-700 px-3 py-2 text-xs font-semibold text-white"
            >
              Search “{subjectName ?? 'History'}” on YouTube
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <button
              type="button"
              onClick={() => setMode('local-reel')}
              className="tactile-press inline-flex items-center gap-1.5 rounded-xl border border-neutral-300/80 dark:border-slate-700/80 px-3 py-2 text-xs font-medium text-neutral-800 dark:text-slate-200 hover:border-blue-500/60 cursor-pointer"
            >
              <Film className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              Open Archival Canvas Reel
            </button>
          </div>
        </div>
      ) : (
        <div className={`grid grid-cols-1 ${compact ? 'gap-3' : 'lg:grid-cols-12 gap-5'}`}>
          <div className={`${compact ? '' : 'lg:col-span-8'} space-y-3`}>
            <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-neutral-300/70 dark:border-slate-800 bg-slate-950 shadow-xl">
              <iframe
                key={activeVideo.youtubeId}
                src={`https://www.youtube-nocookie.com/embed/${activeVideo.youtubeId}?rel=0&modestbranding=1`}
                title={activeVideo.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                loading="lazy"
                className="h-full w-full border-0"
              />
            </div>

            <div className="rounded-2xl spatial-card p-4 flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono-tabular text-blue-700 dark:text-blue-400">
                  <span>{activeVideo.channel}</span>
                  <span aria-hidden="true">·</span>
                  <span>{activeVideo.yearLabel}</span>
                  <span aria-hidden="true">·</span>
                  <span>{activeVideo.duration}</span>
                </div>
                <h3 className="font-display text-lg sm:text-xl font-bold text-neutral-950 dark:text-slate-50">
                  {activeVideo.title}
                </h3>
                <p className="text-xs text-neutral-600 dark:text-slate-300 leading-relaxed">
                  {activeVideo.summary}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {activeVideo.coords && (
                  <button
                    type="button"
                    onClick={() => {
                      if (activeVideo.targetYear !== undefined) setSelectedYear(activeVideo.targetYear);
                      if (activeVideo.coords) setFlyToCoords(activeVideo.coords);
                      setView('explore');
                    }}
                    className="tactile-press inline-flex items-center gap-1.5 rounded-xl bg-blue-800 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 px-3 py-2 text-xs font-semibold text-white cursor-pointer"
                  >
                    <Globe2 className="h-3.5 w-3.5" />
                    Sync 3D Globe
                  </button>
                )}

                <a
                  href={`https://www.youtube.com/watch?v=${activeVideo.youtubeId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="tactile-press inline-flex items-center gap-1.5 rounded-xl border border-neutral-300/80 dark:border-slate-700/80 px-3 py-2 text-xs font-medium text-neutral-800 dark:text-slate-200 hover:border-blue-600/60"
                >
                  Open on YouTube
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          </div>

          <div className={`${compact ? '' : 'lg:col-span-4'} space-y-2`}>
            <div className="flex items-center justify-between text-xs font-semibold text-neutral-700 dark:text-slate-300 px-1">
              <span className="flex items-center gap-1.5">
                <Film className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                Documentary Queue ({pool.length})
              </span>
              <span className="text-[11px] text-neutral-500">Click to watch</span>
            </div>

            <div className={`space-y-1.5 overflow-y-auto pr-1 ${compact ? 'max-h-52' : 'max-h-[470px]'}`}>
              {pool.map((vid) => {
                const isSelected = vid.id === activeVideo.id;
                return (
                  <button
                    key={vid.id}
                    type="button"
                    onClick={() => setSelectedId(vid.id)}
                    className={`w-full rounded-xl border p-3 text-left transition-colors cursor-pointer ${
                      isSelected
                        ? 'border-blue-600/80 bg-blue-950/15 dark:bg-blue-950/40'
                        : 'border-neutral-200/80 dark:border-slate-800/80 hover:border-blue-500/50 spatial-card'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[10px] font-mono-tabular text-blue-700 dark:text-blue-400">
                          {vid.channel} · {vid.duration}
                        </div>
                        <div className="text-xs font-semibold text-neutral-950 dark:text-slate-100 line-clamp-2 mt-0.5">
                          {vid.title}
                        </div>
                      </div>
                      <Play
                        className={`h-3.5 w-3.5 shrink-0 mt-1 ${
                          isSelected ? 'text-blue-600 fill-blue-600 dark:text-blue-400 dark:fill-blue-400' : 'text-neutral-400'
                        }`}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
