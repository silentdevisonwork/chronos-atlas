import * as Dialog from '@radix-ui/react-dialog';
import { Award, Bookmark, Compass, LogOut, ShieldCheck, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { t } from '../i18n/languages';
import { signInWithGoogle, signOutUser } from '../lib/firebase';
import { useAtlasStore } from '../store/useAtlasStore';
import { MagneticButton } from './ui/DesignPrimitives';

export function AuthModal() {
  const open = useAtlasStore((s) => s.authModalOpen);
  const setOpen = useAtlasStore((s) => s.setAuthModalOpen);
  const user = useAtlasStore((s) => s.user);
  const progress = useAtlasStore((s) => s.progress);
  const lang = progress.preferences.language;
  const setView = useAtlasStore((s) => s.setView);
  const [busy, setBusy] = useState(false);

  const handleGoogleSignIn = async () => {
    setBusy(true);
    try {
      await signInWithGoogle();
      toast.success('Signed in with Google');
      setOpen(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Google sign-in canceled or blocked';
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const handleSignOut = async () => {
    setBusy(true);
    try {
      await signOutUser();
      toast.success('Signed out cleanly');
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Sign-out failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-md" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl spatial-glass p-6 focus:outline-none">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="font-display text-2xl font-bold text-neutral-950 dark:text-slate-50">
                {user ? 'Scholar Account' : 'Chronos Atlas Account'}
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-neutral-600 dark:text-slate-400">
                {user
                  ? 'Your discoveries, favorites, quiz scores, and preferences sync across devices.'
                  : 'Explore freely as a guest, or sign in with Google to save your progress permanently.'}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                aria-label="Close account dialog"
                className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-200/70 dark:text-slate-400 dark:hover:bg-slate-800/70 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          {user ? (
            <div className="mt-6 space-y-5">
              <div className="flex items-center gap-4 rounded-xl border border-neutral-200 dark:border-slate-800 bg-neutral-100/80 dark:bg-slate-900/70 p-4">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName ?? 'Profile'}
                    referrerPolicy="no-referrer"
                    className="h-12 w-12 rounded-full object-cover border border-blue-500/40"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-800 text-white font-semibold">
                    {(user.displayName ?? 'S').charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="font-semibold text-neutral-900 dark:text-slate-100 truncate">
                    {user.displayName || 'Scholar'}
                  </div>
                  <div className="text-xs text-neutral-500 dark:text-slate-400 truncate">
                    {user.email}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-xl border border-neutral-200 dark:border-slate-800 p-3">
                  <Compass className="mx-auto h-4 w-4 text-blue-700 dark:text-blue-400" />
                  <div className="mt-1 font-mono-tabular text-lg font-semibold">
                    {progress.exploredLocations.length}
                  </div>
                  <div className="text-[11px] text-neutral-500 dark:text-slate-400">Explored</div>
                </div>
                <div className="rounded-xl border border-neutral-200 dark:border-slate-800 p-3">
                  <Bookmark className="mx-auto h-4 w-4 text-blue-600 dark:text-blue-300" />
                  <div className="mt-1 font-mono-tabular text-lg font-semibold">
                    {progress.favoriteCountries.length + progress.favoriteCivilizations.length}
                  </div>
                  <div className="text-[11px] text-neutral-500 dark:text-slate-400">Favorites</div>
                </div>
                <div className="rounded-xl border border-neutral-200 dark:border-slate-800 p-3">
                  <Award className="mx-auto h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <div className="mt-1 font-mono-tabular text-lg font-semibold">
                    {progress.achievements.length}
                  </div>
                  <div className="text-[11px] text-neutral-500 dark:text-slate-400">Badges</div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 pt-2">
                <MagneticButton
                  variant="secondary"
                  className="flex-1"
                  onClick={() => {
                    setView('profile');
                    setOpen(false);
                  }}
                >
                  {t(lang, 'navProfile')}
                </MagneticButton>
                <MagneticButton variant="ghost" onClick={handleSignOut} disabled={busy}>
                  <LogOut className="h-4 w-4" />
                  {t(lang, 'signOut')}
                </MagneticButton>
              </div>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              <button
                type="button"
                disabled={busy}
                onClick={handleGoogleSignIn}
                className="tactile-press flex w-full items-center justify-center gap-3 rounded-xl bg-blue-800 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 px-5 py-3 text-sm font-semibold text-white cursor-pointer disabled:opacity-60 shadow-lg"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M21.35 11.1H12v3.2h5.35c-.25 1.4-1.6 4.1-5.35 4.1a6.1 6.1 0 1 1 0-12.2c1.75 0 2.95.75 3.65 1.4l2.5-2.4A9.4 9.4 0 0 0 12 2.5a9.5 9.5 0 1 0 0 19c5.5 0 9.15-3.85 9.15-9.25 0-.65-.05-1.15-.15-1.15Z"
                  />
                </svg>
                {busy ? 'Connecting...' : t(lang, 'signInGoogle')}
              </button>

              <div className="flex items-start gap-2.5 rounded-xl border border-neutral-200 dark:border-slate-800 p-3.5 text-xs text-neutral-600 dark:text-slate-400">
                <ShieldCheck className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <span>
                  Authenticated via Firebase Google OAuth. Guest explorers retain local progress on this device without creating an account.
                </span>
              </div>

              <div className="flex justify-end">
                <MagneticButton variant="ghost" size="sm" onClick={() => setOpen(false)}>
                  Continue as {t(lang, 'guestMode')}
                </MagneticButton>
              </div>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
