import { useState, useRef, useEffect } from 'react';
import AudioPlayer from 'react-h5-audio-player';
import 'react-h5-audio-player/lib/styles.css';
import { useSpeechAnnouncement } from '../hooks/useSpeechAnnouncement';
import { useProgressPersistence } from '../hooks/useProgressPersistence';
import { useMediaSession } from '../hooks/useMediaSession';

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

  const userPlayedRef = useRef(false);
  const skipJustHappenedRef = useRef(false);
  
  const {
    announce,
    cancelAnnouncement,
    resetAnnouncedFlag,
    setAnnouncedFlag,
    hasAnnounced
  } = useSpeechAnnouncement();

  const {
    handleListen,
    clearProgress,
    getSavedProgress
  } = useProgressPersistence(audioUrl, audioRef);

  useMediaSession({
    audioUrl,
    source,
    image,
    audioRef,
    onClickNext,
    onClickPrevious,
    skipJustHappenedRef,
    cancelAnnouncement
  });

  // Reset announced flag for new episodes
  useEffect(() => {
    if (!audioUrl) return;
    resetAnnouncedFlag();
  }, [audioUrl, resetAnnouncedFlag]);

  // Announce + autoplay after a skip (but only if not already announced)
  useEffect(() => {
    if (!audioUrl || !source || !audioRef.current?.audio?.current) return;
    if (!skipJustHappenedRef.current) return;

    const audioEl = audioRef.current.audio.current;

    // handler runs once the element can play; ensures we pause any auto-play that raced in
    const handleCanPlay = async () => {
      // If another handler already announced, bail out
      if (hasAnnounced()) {
        skipJustHappenedRef.current = false;
        audioEl.removeEventListener('canplay', handleCanPlay);
        return;
      }

      // ensure we set the announced guard immediately so other handlers won't announce
      setAnnouncedFlag();

      // Stop any early playback from react-h5-audio-player
      try { audioEl.pause(); } catch(e) {console.log(e);}

      const progress = getSavedProgress();

      const announcementResult = await announce(source, progress > 2, pubDate);

      // restore saved time
      if (progress > 0) audioEl.currentTime = progress;

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
    // but guard against double-run using hasAnnounced above
    setTimeout(() => {
      if (!hasAnnounced() && !skipJustHappenedRef.current) return;
      // nothing to do here — we rely on the canplay listener
    }, 0);

    return () => {
      audioEl.removeEventListener('canplay', handleCanPlay);
    };
  }, [audioUrl, source, pubDate, announce, hasAnnounced, setAnnouncedFlag, getSavedProgress]);





  const handleEnded = async () => {
    clearProgress();
    if (onEnded) onEnded();

    if (isLastEpisode) {
      // Final announcement instead of loading another episode
      await announce("That's all for today. See you next time!", false, undefined, true);
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

    // If another path already set announced flag, skip announcing again
    if (hasAnnounced()) return;

    // Reserve the announced slot immediately so canplay or other handlers don't race in
    setAnnouncedFlag();

    // Pause before announcing to avoid overlap
    try { audioEl.pause(); } catch(e) {console.log(e);}

    const progress = getSavedProgress();

    const announcementResult = await announce(source, progress > 2, pubDate);

    if (progress > 0) audioEl.currentTime = progress;

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
    cancelAnnouncement();
    skipJustHappenedRef.current = true;
    if (onClickNext) onClickNext();
  };

  const handlePrevious = () => {
    cancelAnnouncement();
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
