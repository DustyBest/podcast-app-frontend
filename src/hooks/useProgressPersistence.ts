import { useRef, useCallback, useEffect } from 'react';
import AudioPlayer from 'react-h5-audio-player';

const SAVE_INTERVAL_MS = 5000;

export function useProgressPersistence(
  audioUrl: string | undefined,
  audioRef: React.RefObject<InstanceType<typeof AudioPlayer> | null>
) {
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load saved progress when audioUrl changes
  const loadProgress = useCallback(() => {
    if (!audioUrl || !audioRef.current?.audio?.current) return;
    
    const savedTime = localStorage.getItem(`progress_${audioUrl}`);
    if (savedTime) {
      audioRef.current.audio.current.currentTime = Number(savedTime);
    }
  }, [audioUrl, audioRef]);

  // Save progress throttled every 5 seconds
  const handleListen = useCallback(() => {
    if (!audioRef.current?.audio?.current || !audioUrl) return;
    if (saveTimeout.current) return;

    const currentTime = audioRef.current.audio.current.currentTime;
    localStorage.setItem(`progress_${audioUrl}`, currentTime.toString());

    saveTimeout.current = setTimeout(() => {
      saveTimeout.current = null;
    }, SAVE_INTERVAL_MS);
  }, [audioUrl, audioRef]);

  // Clear progress when episode ends
  const clearProgress = useCallback(() => {
    if (audioUrl) {
      localStorage.removeItem(`progress_${audioUrl}`);
    }
  }, [audioUrl]);

  // Get saved progress for announcements
  const getSavedProgress = useCallback(() => {
    if (!audioUrl) return 0;
    const savedTime = localStorage.getItem(`progress_${audioUrl}`);
    return savedTime ? Number(savedTime) : 0;
  }, [audioUrl]);

  // Auto-load progress when audioUrl changes
  useEffect(() => {
    loadProgress();
  }, [loadProgress]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeout.current) {
        clearTimeout(saveTimeout.current);
      }
    };
  }, []);

  return {
    handleListen,
    clearProgress,
    getSavedProgress,
    loadProgress
  };
}
