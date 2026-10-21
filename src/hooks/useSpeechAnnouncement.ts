import { useCallback, useEffect, useRef } from 'react';

type AnnouncementResult = 'ended' | 'interrupted';

let cachedVoice: SpeechSynthesisVoice | null = null;
let isAnnouncing = false;
let announcementGeneration = 0;
let currentAudioElement: HTMLAudioElement | null = null;

function loadVoices() {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  const voices = window.speechSynthesis.getVoices();
  cachedVoice =
    voices.find((v) => v.name.includes('Natural') || v.name.includes('Enhanced')) ??
    voices.find((v) => v.name === 'Google UK English Female') ??
    null;
}

function ensureSpeechSynthesisReady() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

function buildAnnouncementText(name: string, isContinuing: boolean, pubDate?: string, skipPrefix = false) {
  if (skipPrefix) return name;

  if (pubDate) {
    const dateObj = new Date(pubDate);
    const dayOfWeek = dateObj.toLocaleDateString(undefined, { weekday: 'long' });
    const timeString = dateObj.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    return isContinuing
      ? `Continuing ${name}, from ${dayOfWeek} at ${timeString}.`
      : `From ${name}, on ${dayOfWeek} at ${timeString}.`;
  }

  return `From ${name}.`;
}

// 1. ElevenLabs Audio Fetcher via Backend Proxy
async function playElevenLabsAnnouncement(text: string): Promise<boolean> {
  try {
    const apiBase = import.meta.env.VITE_API_BASE_URL || '';
    const res = await fetch(`${apiBase}/api/tts?text=${encodeURIComponent(text)}`);

    if (!res.ok) return false;

    const blob = await res.blob();
    const audioUrl = URL.createObjectURL(blob);

    return new Promise((resolve) => {
      const audio = new Audio(audioUrl);
      currentAudioElement = audio;

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        currentAudioElement = null;
        resolve(true);
      };

      audio.onerror = () => {
        URL.revokeObjectURL(audioUrl);
        currentAudioElement = null;
        resolve(false);
      };

      audio.play().catch(() => resolve(false));
    });
  } catch {
    return false;
  }
}

// 2. Native SpeechSynthesis Fallback
async function announceNativeFallback(text: string): Promise<AnnouncementResult> {
  if (!ensureSpeechSynthesisReady()) return 'ended';

  const currentGeneration = ++announcementGeneration;
  const synthesis = window.speechSynthesis;

  if (isAnnouncing) synthesis.cancel();
  isAnnouncing = true;

  return new Promise((resolve) => {
    const utterance = new SpeechSynthesisUtterance(text);
    if (cachedVoice) {
      utterance.voice = cachedVoice;
      utterance.lang = cachedVoice.lang;
    }
    utterance.rate = 0.94;

    const finalize = (result: AnnouncementResult) => {
      if (currentGeneration !== announcementGeneration) return;
      isAnnouncing = false;
      resolve(result);
    };

    utterance.addEventListener('end', () => finalize('ended'));
    utterance.addEventListener('error', () => finalize('ended'));
    utterance.addEventListener('pause', () => finalize('interrupted'));
    utterance.addEventListener('abort', () => finalize('interrupted'));

    synthesis.cancel();
    synthesis.speak(utterance);
  });
}

export function useSpeechAnnouncement() {
  const announcedRef = useRef(false);

  const announce = useCallback(
    async (
      name: string,
      isContinuing = false,
      pubDate?: string,
      skipPrefix = false
    ): Promise<AnnouncementResult> => {
      const text = buildAnnouncementText(name, isContinuing, pubDate, skipPrefix);

      // Attempt ElevenLabs HD Voice first
      const elevenLabsSuccess = await playElevenLabsAnnouncement(text);
      if (elevenLabsSuccess) return 'ended';

      // Fallback to Native Speech Synthesis
      return announceNativeFallback(text);
    },
    []
  );

  const cancelAnnouncement = useCallback(() => {
    if (currentAudioElement) {
      currentAudioElement.pause();
      currentAudioElement = null;
    }

    if (ensureSpeechSynthesisReady()) {
      window.speechSynthesis.cancel();
      isAnnouncing = false;
      announcementGeneration += 1;
    }
  }, []);

  useEffect(() => {
    if (!ensureSpeechSynthesisReady()) return;
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      cancelAnnouncement();
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, [cancelAnnouncement]);

  return {
    announce,
    cancelAnnouncement,
    resetAnnouncedFlag: useCallback(() => {
      announcedRef.current = false;
    }, []),
    setAnnouncedFlag: useCallback(() => {
      announcedRef.current = true;
    }, []),
    hasAnnounced: useCallback(() => announcedRef.current, []),
    isAnnouncing: () => isAnnouncing || !!currentAudioElement,
  };
}