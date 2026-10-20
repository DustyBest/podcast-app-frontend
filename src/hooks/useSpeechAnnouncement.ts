import { useCallback, useEffect, useRef } from 'react';

type AnnouncementResult = 'ended' | 'interrupted';

let cachedGoogleVoice: SpeechSynthesisVoice | null = null;
let isAnnouncing = false;
let announcementGeneration = 0;

function loadVoices() {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

  const voices = window.speechSynthesis.getVoices();
  cachedGoogleVoice = voices.find((voice) => voice.name === 'Google UK English Female') ?? null;
}

function ensureSpeechSynthesisReady() {
  if (typeof window === 'undefined') return false;
  return 'speechSynthesis' in window;
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

async function announcePodcastNameAndWait(
  name: string,
  isContinuing = false,
  pubDate?: string,
  skipPrefix = false
): Promise<AnnouncementResult> {
  if (!ensureSpeechSynthesisReady()) {
    return 'ended';
  }

  const currentGeneration = ++announcementGeneration;
  const synthesis = window.speechSynthesis;

  if (isAnnouncing) {
    synthesis.cancel();
  }

  isAnnouncing = true;

  return new Promise((resolve) => {
    const text = buildAnnouncementText(name, isContinuing, pubDate, skipPrefix);
    const utterance = new SpeechSynthesisUtterance(text);

    if (cachedGoogleVoice) {
      utterance.voice = cachedGoogleVoice;
      utterance.lang = cachedGoogleVoice.lang;
    }

    const finalize = (result: AnnouncementResult) => {
      if (currentGeneration !== announcementGeneration) {
        return;
      }

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
      return announcePodcastNameAndWait(name, isContinuing, pubDate, skipPrefix);
    },
    []
  );

  const cancelAnnouncement = useCallback(() => {
    if (!ensureSpeechSynthesisReady()) return;

    window.speechSynthesis.cancel();
    isAnnouncing = false;
    announcementGeneration += 1;
  }, []);

  const resetAnnouncedFlag = useCallback(() => {
    announcedRef.current = false;
  }, []);

  const setAnnouncedFlag = useCallback(() => {
    announcedRef.current = true;
  }, []);

  const hasAnnounced = useCallback(() => {
    return announcedRef.current;
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
    resetAnnouncedFlag,
    setAnnouncedFlag,
    hasAnnounced,
    isAnnouncing: () => isAnnouncing,
  };
}
