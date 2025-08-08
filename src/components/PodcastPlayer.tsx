import { useState, useRef, useEffect, useCallback } from 'react';
import AudioPlayer from 'react-h5-audio-player';
import 'react-h5-audio-player/lib/styles.css';

interface PodcastPlayerProps {
  source?: string;
  audioUrl?: string;
  image?: string;
  loading?: boolean;
  pubDate?: string;
  isLastEpisode?: boolean;
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

let isAnnouncing = false;
async function announcePodcastNameAndWait(
  name: string,
  isContinuing = false,
  pubDate?: string,
  skipPrefix = false  // new optional param, default false
): Promise<'ended' | 'interrupted'> {
  if (isAnnouncing || !('speechSynthesis' in window)) return 'ended';
  isAnnouncing = true;

  return new Promise(resolve => {
    speechSynthesis.cancel();

    let text;
    if (skipPrefix) {
      text = name;  // say exactly what is passed, no extra text
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

const SAVE_INTERVAL_MS = 5000;

const PodcastPlayer = ({
  source,
  audioUrl,
  image,
  loading = false,
  onClickNext,
  onClickPrevious,
  onEnded,
  pubDate,
  isLastEpisode,
}: PodcastPlayerProps) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const audioRef = useRef<InstanceType<typeof AudioPlayer> | null>(null);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const userPlayedRef = useRef(false);
  const skipJustHappenedRef = useRef(false);
  const announcedRef = useRef(false); // <-- single guard for "we've announced this episode"

  // Load saved progress when audioUrl changes
  useEffect(() => {
    if (!audioUrl) return;
    const savedTime = localStorage.getItem(`progress_${audioUrl}`);
    if (savedTime && audioRef.current?.audio?.current) {
      audioRef.current.audio.current.currentTime = Number(savedTime);
    }
    // reset announced flag for a new episode so announcements can happen again
    announcedRef.current = false;
  }, [audioUrl]);

  // Announce + autoplay after a skip (but only if not already announced)
  useEffect(() => {
    if (!audioUrl || !source || !audioRef.current?.audio?.current) return;
    if (!skipJustHappenedRef.current) return;

    const audioEl = audioRef.current.audio.current;

    // handler runs once the element can play; ensures we pause any auto-play that raced in
    const handleCanPlay = async () => {
      // If another handler already announced, bail out
      if (announcedRef.current) {
        skipJustHappenedRef.current = false;
        audioEl.removeEventListener('canplay', handleCanPlay);
        return;
      }

      // ensure we set the announced guard immediately so other handlers won't announce
      announcedRef.current = true;

      // Stop any early playback from react-h5-audio-player
      try { audioEl.pause(); } catch(e) {console.log(e);}

      const savedTime = localStorage.getItem(`progress_${audioUrl}`);
      const progress = savedTime ? Number(savedTime) : 0;

      const announcementResult = await announcePodcastNameAndWait(source, progress > 2, pubDate);

      // restore saved time
      if (savedTime) audioEl.currentTime = Number(savedTime);

      if (announcementResult === 'ended') {
        try {
          await audioEl.play();
        } catch (e) {
          console.warn('Playback failed after skip announcement', e);
        }
      } else {
        // Announcement was interrupted, so intentionally stay paused.
        console.log('Announcement interrupted, audio stays paused');
      }

      skipJustHappenedRef.current = false;
      audioEl.removeEventListener('canplay', handleCanPlay);
    };

    // attach once; will fire when the audio has buffered enough
    audioEl.addEventListener('canplay', handleCanPlay);

    // in case canplay already fired before we added listener, call it on next tick
    // but guard against double-run using announcedRef above
    setTimeout(() => {
      if (!announcedRef.current && !skipJustHappenedRef.current) return;
      // nothing to do here — we rely on the canplay listener
    }, 0);

    return () => {
      audioEl.removeEventListener('canplay', handleCanPlay);
    };
  }, [audioUrl, source, pubDate]);

  // Media session setup (unchanged except it uses handlers that now set skipJustHappenedRef)
  useEffect(() => {
    if (!audioUrl || !source || !('mediaSession' in navigator)) return;
    const artworkSrc = image ?? '/pwa-512x512.png';

    navigator.mediaSession.metadata = new MediaMetadata({
      title: source,
      artwork: [{ src: artworkSrc, sizes: '512x512', type: 'image/png' }],
    });

    navigator.mediaSession.setActionHandler('play', () => {
      audioRef.current?.audio?.current.play();
    });
    navigator.mediaSession.setActionHandler('pause', () => {
      audioRef.current?.audio?.current.pause();
    });
    navigator.mediaSession.setActionHandler('previoustrack', () => {
      // lock-screen / hardware controls must act immediately — don't announce on lock skips
      if (onClickPrevious) {
        skipJustHappenedRef.current = true;
        // cancel any ongoing speech to avoid overlap
        speechSynthesis.cancel();
        isAnnouncing = false;
        onClickPrevious();
        // play ASAP so OS/mediaSession doesn't think playback stopped
        setTimeout(() => audioRef.current?.audio?.current?.play().catch(console.error), 250);
      }
    });
    navigator.mediaSession.setActionHandler('nexttrack', () => {
      if (onClickNext) {
        skipJustHappenedRef.current = true;
        speechSynthesis.cancel();
        isAnnouncing = false;
        onClickNext();
        setTimeout(() => audioRef.current?.audio?.current?.play().catch(console.error), 250);
      }
    });
  }, [audioUrl, source, image, onClickNext, onClickPrevious]);

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

  const handleEnded = async () => {
    if (audioUrl) {
      localStorage.removeItem(`progress_${audioUrl}`);
    }
    if (onEnded) onEnded();

    if (isLastEpisode) {
      // Final announcement instead of loading another episode
      await announcePodcastNameAndWait("That's all for today. See you next time!", false, undefined, true);
      return; // Don't autoplay next
    }

    // For natural end-of-track we still want the next episode announced.
    if (onClickNext) {
      skipJustHappenedRef.current = true;
      onClickNext();
    }
  };

  // User pressed play: announce if not already announced (user interaction allowed)
  const handlePlay = async () => {
    if (!audioRef.current?.audio?.current || !source || !audioUrl) return;
    const audioEl = audioRef.current.audio.current;

    userPlayedRef.current = true;

    // If another path already set announcedRef, skip announcing again
    if (announcedRef.current) return;

    // Reserve the announced slot immediately so canplay or other handlers don't race in
    announcedRef.current = true;

    // Pause before announcing to avoid overlap
    try { audioEl.pause(); } catch(e) {console.log(e);}

    const savedTime = localStorage.getItem(`progress_${audioUrl}`);
    const progress = savedTime ? Number(savedTime) : 0;

    const announcementResult = await announcePodcastNameAndWait(source, progress > 2, pubDate);

    if (savedTime) audioEl.currentTime = Number(savedTime);

    if (announcementResult === 'ended') {
      try {
        await audioEl.play();
      } catch (e) {
        console.warn('Playback failed after user play announcement', e);
      }
    } else {
      // user interrupted announcement; keep paused
      console.log('User interrupted announcement; staying paused');
    }
  };

  // Wrapped skip handlers from the UI (not lock-screen) — they should cancel speech and set the flag
  const handleNext = () => {
    speechSynthesis.cancel();
    isAnnouncing = false;
    skipJustHappenedRef.current = true;
    if (onClickNext) onClickNext();
  };

  const handlePrevious = () => {
    speechSynthesis.cancel();
    isAnnouncing = false;
    skipJustHappenedRef.current = true;
    if (onClickPrevious) onClickPrevious();
  };

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
