import { useRef, useCallback } from 'react';

let cachedGoogleVoice: SpeechSynthesisVoice | null = null;
let isAnnouncing = false;

function loadVoices() {
  const voices = speechSynthesis.getVoices();
  cachedGoogleVoice = voices.find(v => v.name === 'Google UK English Female') || null;
}

if ('speechSynthesis' in window) {
  loadVoices();
  window.speechSynthesis.onvoiceschanged = loadVoices;
}

async function announcePodcastNameAndWait(
  name: string,
  isContinuing = false,
  pubDate?: string,
  skipPrefix = false
): Promise<'ended' | 'interrupted'> {
  if (isAnnouncing || !('speechSynthesis' in window)) return 'ended';
  isAnnouncing = true;

  return new Promise(resolve => {
    speechSynthesis.cancel();

    let text;
    if (skipPrefix) {
      text = name;
    } else if (pubDate) {
      const dateObj = new Date(pubDate);
      const dayOfWeek = dateObj.toLocaleDateString(undefined, { weekday: 'long' });
      const timeString = dateObj.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true });

      text = isContinuing
        ? `Continuing ${name}, from ${dayOfWeek} at ${timeString}.`
        : `From ${name}, on ${dayOfWeek} at ${timeString}.`;
    } else {
      text = `From ${name}.`;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    if (cachedGoogleVoice) {
      utterance.voice = cachedGoogleVoice;
      utterance.lang = cachedGoogleVoice.lang;
    }

    const handleEndOrAbort = (type: 'ended' | 'interrupted') => {
      isAnnouncing = false;
      resolve(type);
    };

    utterance.addEventListener('end', () => handleEndOrAbort('ended'));
    utterance.addEventListener('error', () => handleEndOrAbort('ended'));
    utterance.addEventListener('pause', () => handleEndOrAbort('interrupted'));
    utterance.addEventListener('abort', () => handleEndOrAbort('interrupted'));

    speechSynthesis.speak(utterance);
  });
}

export function useSpeechAnnouncement() {
  const announcedRef = useRef(false);

  const announce = useCallback(async (
    name: string,
    isContinuing = false,
    pubDate?: string,
    skipPrefix = false
  ): Promise<'ended' | 'interrupted'> => {
    return announcePodcastNameAndWait(name, isContinuing, pubDate, skipPrefix);
  }, []);

  const cancelAnnouncement = useCallback(() => {
    speechSynthesis.cancel();
    isAnnouncing = false;
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

  return {
    announce,
    cancelAnnouncement,
    resetAnnouncedFlag,
    setAnnouncedFlag,
    hasAnnounced,
    isAnnouncing: () => isAnnouncing
  };
}
