import { BookOpen, HelpCircle, Scale, Send, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { t } from '../i18n/languages';
import { useAtlasStore } from '../store/useAtlasStore';

interface AssistantReply {
  summary: string;
  verifiedFacts: string[];
  scholarlyInterpretations: string[];
  disputedClaims: string[];
  sources: string[];
}

export function HistorianAssistant({
  contextName,
  contextType,
}: {
  contextName: string;
  contextType: string;
}) {
  const lang = useAtlasStore((s) => s.progress.preferences.language);
  const year = useAtlasStore((s) => s.selectedYear);

  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reply, setReply] = useState<AssistantReply | null>(null);

  const suggestedPrompts = [
    `What verified archaeological evidence defines ${contextName}?`,
    `What scholarly debates or myths surround ${contextName}?`,
    `How did ${contextName} influence neighboring civilizations?`,
  ];

  const askQuestion = async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/ai/history-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: trimmed,
          contextName,
          contextType,
          year,
          language: lang,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to consult historian assistant');
      }
      setReply(data as AssistantReply);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error contacting historian service');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-neutral-200/80 dark:border-slate-800/80 bg-neutral-100/60 dark:bg-[#070d1b]/70 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-blue-700 dark:text-blue-400" />
          <h4 className="text-sm font-semibold text-neutral-900 dark:text-slate-100">
            {t(lang, 'askHistorian')}
          </h4>
        </div>
        <span className="text-[11px] text-neutral-500 dark:text-slate-400">Evidence-tiered</span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {suggestedPrompts.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => {
              setQuestion(p);
              void askQuestion(p);
            }}
            className="text-left text-[11px] rounded-lg border border-neutral-200 dark:border-slate-800 px-2.5 py-1 text-neutral-600 dark:text-slate-300 hover:border-blue-600/60 cursor-pointer transition-colors"
          >
            {p}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void askQuestion(question);
        }}
        className="flex items-center gap-2"
      >
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={t(lang, 'askPlaceholder')}
          className="flex-1 rounded-xl border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs text-neutral-900 dark:text-slate-100 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
        />
        <button
          type="submit"
          disabled={loading || !question.trim()}
          aria-label="Send question"
          className="tactile-press flex h-8 w-8 items-center justify-center rounded-xl bg-blue-800 hover:bg-blue-700 text-white disabled:opacity-50 cursor-pointer shrink-0"
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </form>

      {loading && (
        <div className="text-xs text-neutral-500 dark:text-slate-400 py-2">
          Consulting primary historical & scientific records...
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      {reply && !loading && (
        <div className="space-y-3 pt-2 border-t border-neutral-200 dark:border-slate-800 text-xs">
          <p className="text-neutral-800 dark:text-slate-200 leading-relaxed">{reply.summary}</p>

          {reply.verifiedFacts?.length > 0 && (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-400">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>{t(lang, 'verifiedFacts')}</span>
              </div>
              <ul className="space-y-1 text-neutral-700 dark:text-slate-300 list-disc pl-4">
                {reply.verifiedFacts.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </div>
          )}

          {reply.scholarlyInterpretations?.length > 0 && (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-blue-700 dark:text-blue-400">
                <Scale className="h-3.5 w-3.5" />
                <span>{t(lang, 'scholarlyInterpretations')}</span>
              </div>
              <ul className="space-y-1 text-neutral-700 dark:text-slate-300 list-disc pl-4">
                {reply.scholarlyInterpretations.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </div>
          )}

          {reply.disputedClaims?.length > 0 && (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
                <HelpCircle className="h-3.5 w-3.5" />
                <span>{t(lang, 'disputedClaims')}</span>
              </div>
              <ul className="space-y-1 text-neutral-700 dark:text-slate-300 list-disc pl-4">
                {reply.disputedClaims.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </div>
          )}

          {reply.sources?.length > 0 && (
            <div className="pt-1 text-[11px] text-neutral-500 dark:text-slate-400">
              Sources: {reply.sources.join(' · ')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
