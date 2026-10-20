import { useCallback, useEffect, useRef } from 'react';
import AudioPlayer from 'react-h5-audio-player';

const SAVE_INTERVAL_MS = 5000;
const STORAGE_PREFIX = 'progress_';

function readSavedProgress(key: string): number {
  const saved = window.localStorage.getItem(key);
  if (!saved) return 0;

  const parsed = Number(saved);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;

  return parsed;
}

function safeSetProgress(audioUrl: string, currentTime: number) {
  const safeValue = Number.isFinite(currentTime) ? Math.max(0, currentTime) : 0;
  window.localStorage.setItem(`${STORAGE_PREFIX}${audioUrl}`, safeValue.toString());
}

export function useProgressPersistence(
  audioUrl: string | undefined,
  audioRef: React.RefObject<InstanceType<typeof AudioPlayer> | null>
) {
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSaveTimer = useCallback(() => {
    if (saveTimeout.current) {
      clearTimeout(saveTimeout.current);
      saveTimeout.current = null;
    }
  }, []);

  const loadProgress = useCallback(() => {
    if (!audioUrl || !audioRef.current?.audio?.current) return;

    const savedTime = readSavedProgress(`${STORAGE_PREFIX}${audioUrl}`);
    const audioEl = audioRef.current.audio.current;

    if (savedTime > 0 && savedTime < audioEl.duration) {
      audioEl.currentTime = savedTime;
    }
  }, [audioUrl, audioRef]);

  const handleListen = useCallback(() => {
    if (!audioRef.current?.audio?.current || !audioUrl) return;

    const currentTime = audioRef.current.audio.current.currentTime;
    const safeTime = Number.isFinite(currentTime) ? Math.max(0, currentTime) : 0;

    if (saveTimeout.current) {
      clearTimeout(saveTimeout.current);
    }

    safeSetProgress(audioUrl, safeTime);
    saveTimeout.current = setTimeout(() => {
      saveTimeout.current = null;
    }, SAVE_INTERVAL_MS);
  }, [audioUrl, audioRef]);

  const clearProgress = useCallback(() => {
    if (audioUrl) {
      window.localStorage.removeItem(`${STORAGE_PREFIX}${audioUrl}`);
    }
  }, [audioUrl]);

  const getSavedProgress = useCallback(() => {
    if (!audioUrl) return 0;
    return readSavedProgress(`${STORAGE_PREFIX}${audioUrl}`);
  }, [audioUrl]);

  useEffect(() => {
    if (!audioUrl) {
      clearSaveTimer();
      return;
    }

    loadProgress();

    return () => {
      clearSaveTimer();
    };
  }, [audioUrl, loadProgress, clearSaveTimer]);

  useEffect(() => {
    return () => {
      clearSaveTimer();
    };
  }, [clearSaveTimer]);

  return {
    handleListen,
    clearProgress,
    getSavedProgress,
    loadProgress,
  };
}
