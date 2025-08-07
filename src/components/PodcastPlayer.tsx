import React, { useState, useRef, useEffect, useCallback } from 'react';
import AudioPlayer from 'react-h5-audio-player';
import 'react-h5-audio-player/lib/styles.css';

interface PodcastPlayerProps {
  source?: string;
  audioUrl?: string;
  image?: string;
  loading?: boolean;
  onClickNext?: () => void;
  onClickPrevious?: () => void;
  onEnded?: () => void;
}

let cachedGoogleVoice: SpeechSynthesisVoice | null = null;

function loadVoices() {
  const voices = speechSynthesis.getVoices();
  cachedGoogleVoice = voices.find(v => v.name === 'Google UK English Female') || null;
}

if ('speechSynthesis' in window) {
  loadVoices();
  window.speechSynthesis.onvoiceschanged = loadVoices;
}

function announcePodcastNameAndWait(name: string): Promise<void> {
  return new Promise(resolve => {
    if (!('speechSynthesis' in window)) return resolve();

    const utterance = new SpeechSynthesisUtterance(`Now playing ${name}`);
    if (cachedGoogleVoice) {
      utterance.voice = cachedGoogleVoice;
      utterance.lang = cachedGoogleVoice.lang;
    }

    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();

    speechSynthesis.cancel();
    speechSynthesis.speak(utterance);
  });
}

const SAVE_INTERVAL_MS = 5000;

const PodcastPlayer = ({
  source,
  audioUrl,
  image,
  loading = false,
  onClickNext,
  onClickPrevious,
  onEnded,
}: PodcastPlayerProps) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const audioRef = useRef<InstanceType<typeof AudioPlayer> | null>(null);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track if user manually pressed play at least once (required for autoplay)
  const userPlayedRef = useRef(false);

  // Track if skip just happened to trigger announcement + play
  const skipJustHappenedRef = useRef(false);

  // Reset announcement flag when episode changes
  const announcedRef = useRef(false);

  // Load saved progress when audioUrl changes
  useEffect(() => {
    if (!audioUrl) return;
    const savedTime = localStorage.getItem(`progress_${audioUrl}`);
    if (savedTime && audioRef.current?.audio?.current) {
      audioRef.current.audio.current.currentTime = Number(savedTime);
    }
  }, [audioUrl]);

  // Announce and autoplay after skip
  useEffect(() => {
    if (!audioUrl || !source || !audioRef.current?.audio?.current) return;
    if (!skipJustHappenedRef.current) return; // Only run after skip

    const audioEl = audioRef.current.audio.current;

    const run = async () => {
      audioEl.pause();
      await announcePodcastNameAndWait(source);

      // Restore saved position
      const savedTime = localStorage.getItem(`progress_${audioUrl}`);
      if (savedTime) audioEl.currentTime = Number(savedTime);

      try {
        await audioEl.play();
      } catch (e) {
        console.warn('Playback failed after skip announcement', e);
      }

      skipJustHappenedRef.current = false;
      announcedRef.current = true; // Mark announced to avoid double announcement
    };

    run();
  }, [audioUrl, source]);

  // Save progress throttled every 5 seconds
  const handleListen = useCallback(() => {
    if (!audioRef.current?.audio?.current || !audioUrl) return;

    if (saveTimeout.current) return;

    const currentTime = audioRef.current.audio.current.currentTime;
    localStorage.setItem(`progress_${audioUrl}`, currentTime.toString());

    saveTimeout.current = setTimeout(() => {
      saveTimeout.current = null;
    }, SAVE_INTERVAL_MS);
  }, [audioUrl]);

  const handleEnded = () => {
    if (audioUrl) {
      localStorage.removeItem(`progress_${audioUrl}`);
    }
    if (onEnded) onEnded();

    if (onClickNext) {
      skipJustHappenedRef.current = true; // flag for announcing and autoplaying next episode
      onClickNext();
    }
  };


  // User pressed play: announce if not already announced
  const handlePlay = async () => {
    if (!audioRef.current?.audio?.current || !source) return;
    const audioEl = audioRef.current.audio.current;

    userPlayedRef.current = true;

    if (!announcedRef.current) {
      announcedRef.current = true;
      audioEl.pause();
      await announcePodcastNameAndWait(source);
      try {
        await audioEl.play();
      } catch (e) {
        console.warn('Playback failed after user play announcement', e);
      }
    }
  };

  // Wrapped skip handlers to set skip flag and trigger parent's onClickNext/Previous
  const handleNext = () => {
    skipJustHappenedRef.current = true;
    if (onClickNext) onClickNext();
  };

  const handlePrevious = () => {
    skipJustHappenedRef.current = true;
    if (onClickPrevious) onClickPrevious();
  };

  // Initial load: do NOT announce or autoplay automatically without user interaction
  // User must press play for first episode announcement

  return (
    <div className="max-w-md mx-auto p-4 relative bg-gray-900 rounded-lg shadow-lg text-white">
      <div className="w-full aspect-square mb-4 relative">
        {!imageLoaded && (
          <div className="absolute inset-0 bg-gray-700 animate-pulse rounded-md z-0" />
        )}

        {image && (
          <img
            src={image}
            alt="Podcast Cover"
            onLoad={() => setImageLoaded(true)}
            className={`w-full h-full object-cover rounded-md transition-opacity duration-500 z-10 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            loading="lazy"
          />
        )}
      </div>

      <h2 className="text-xl font-semibold mb-4">
        {loading ? 'Loading Your News...' : source}
      </h2>

      <div className="relative">
        {!loading && audioUrl ? (
          <AudioPlayer
            ref={audioRef}
            src={audioUrl}
            showSkipControls
            onListen={handleListen}
            onClickNext={handleNext}
            onClickPrevious={handlePrevious}
            onEnded={handleEnded}
            onPlay={handlePlay}
            className="rounded-md"
          />
        ) : (
          <div className="h-[72px] w-full animate-pulse bg-gray-200 rounded-md" />
        )}

        <div
          className={`absolute inset-0 bg-white transition-opacity duration-500 ease-in-out
            ${loading ? 'opacity-50 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
          aria-hidden="true"
        />
      </div>
    </div>
  );
};

export default PodcastPlayer;
