import React, { useEffect, useState } from 'react';
import { Mic, Wifi, WifiOff, Volume2, VolumeX, Sparkles, ShieldCheck } from 'lucide-react';
import { useAtlasStore } from '../store/useAtlasStore';

export const MobileEnhancements: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [hapticsEnabled, setHapticsEnabled] = useState<boolean>(true);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [voiceStatus, setVoiceStatus] = useState<string>('');

  const setSearchOpen = useAtlasStore((s) => s.setSearchOpen);
  const recordSearchTerm = useAtlasStore((s) => s.recordSearchTerm);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const handleGlobalClick = () => {
      if (hapticsEnabled && 'vibrate' in navigator) {
        try {
          navigator.vibrate(20);
        } catch {
          // Ignore
        }
      }
      if (soundEnabled) {
        playClickSound();
      }
    };

    window.addEventListener('click', handleGlobalClick);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('click', handleGlobalClick);
    };
  }, [hapticsEnabled, soundEnabled]);

  const playClickSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const audioCtx = new AudioCtx();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.04);
      gain.gain.setValueAtTime(0.015, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.04);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.04);
    } catch {
      // AudioContext might require user gesture first
    }
  };

  const startVoiceSearch = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Voice Search is available on mobile Chrome or Safari.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setVoiceStatus('Listening... Speak now');
        if (hapticsEnabled && 'vibrate' in navigator) {
          try { navigator.vibrate([40, 60, 40]); } catch {}
        }
      };

      recognition.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        setIsListening(false);
        setVoiceStatus('');
        if (text) {
          recordSearchTerm(text);
          setSearchOpen(true);
        }
      };

      recognition.onerror = (err: any) => {
        setIsListening(false);
        setVoiceStatus('Voice recognition error. Try again.');
      };

      recognition.onend = () => {
        setIsListening(false);
        setVoiceStatus('');
      };

      recognition.start();
    } catch (e) {
      setIsListening(false);
      alert('Could not start microphone speech recognition.');
    }
  };

  return (
    <>
      {/* Network Status Banner */}
      {!isOnline && (
        <div className="fixed top-2 left-1/2 -translate-x-1/2 z-50 bg-red-600/90 backdrop-blur-md text-white px-4 py-1.5 rounded-full text-xs font-medium shadow-lg flex items-center gap-2 animate-pulse">
          <WifiOff className="w-3.5 h-3.5" />
          <span>Offline Mode — Chronos Local Caching Active</span>
        </div>
      )}

      {/* Floating Action Island for Mobile & Desktop */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900/90 backdrop-blur-2xl border border-amber-500/40 rounded-full px-5 py-3 shadow-2xl flex items-center gap-4 text-slate-200">
        <button
          onClick={startVoiceSearch}
          title="Voice Search"
          className={`p-2.5 rounded-full transition-all flex items-center justify-center ${
            isListening ? 'bg-red-500 text-white animate-bounce' : 'bg-slate-800 hover:bg-amber-500/20 text-amber-400'
          }`}
        >
          <Mic className="w-4 h-4" />
        </button>

        <div className="w-px h-4 bg-slate-700" />

        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          title="Toggle Sound FX"
          className="p-2.5 rounded-full bg-slate-800 hover:bg-amber-500/20 text-cyan-400 transition-all"
        >
          {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
        </button>

        <button
          onClick={() => setHapticsEnabled(!hapticsEnabled)}
          title="Toggle Haptics"
          className={`p-2.5 rounded-full transition-all ${
            hapticsEnabled ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-500'
          }`}
        >
          <Sparkles className="w-4 h-4" />
        </button>

        <div className="w-px h-4 bg-slate-700" />

        <div className="flex items-center gap-1.5 text-xs text-amber-400 font-semibold px-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden sm:inline">Active DB Sync</span>
        </div>
      </div>

      {/* Voice Transcript Modal Feedback */}
      {isListening && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/60 p-8 rounded-3xl text-center shadow-2xl max-w-sm w-full animate-pulse">
            <div className="w-16 h-16 bg-amber-500/20 border border-amber-500 rounded-full flex items-center justify-center mx-auto mb-4 text-amber-400">
              <Mic className="w-8 h-8 animate-pulse" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Listening for Epoch...</h3>
            <p className="text-sm text-slate-400">{voiceStatus || 'Speak a historical event, year, or civilization name.'}</p>
          </div>
        </div>
      )}
    </>
  );
};
