import { useEffect, useRef, useState } from 'react';
import AudioPlayer from 'react-h5-audio-player';
import 'react-h5-audio-player/lib/styles.css';
import { useMediaSession } from '../hooks/useMediaSession';
import { useProgressPersistence } from '../hooks/useProgressPersistence';
import { useSpeechAnnouncement } from '../hooks/useSpeechAnnouncement';

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

  const { announce, cancelAnnouncement, resetAnnouncedFlag, setAnnouncedFlag, hasAnnounced } =
    useSpeechAnnouncement();

  const { handleListen, clearProgress, getSavedProgress } = useProgressPersistence(audioUrl, audioRef);

  useMediaSession({
    audioUrl,
    source,
    image,
    audioRef,
    onClickNext,
    onClickPrevious,
    skipJustHappenedRef,
    cancelAnnouncement,
  });

  useEffect(() => {
    if (!audioUrl) return;
    resetAnnouncedFlag();
    userPlayedRef.current = false;
    skipJustHappenedRef.current = false;
  }, [audioUrl, resetAnnouncedFlag]);

  useEffect(() => {
    if (!audioUrl || !source || !audioRef.current?.audio?.current || !skipJustHappenedRef.current) {
      return;
    }

    const audioEl = audioRef.current.audio.current;
    let cancelled = false;

    const handleCanPlay = async () => {
      if (cancelled || hasAnnounced()) {
        return;
      }

      setAnnouncedFlag();

      try {
        audioEl.pause();
      } catch (error) {
        console.warn('Skip announcement pre-pause failed', error);
      }

      const progress = getSavedProgress();
      const announcementResult = await announce(source, progress > 2, pubDate);

      if (progress > 0 && progress < audioEl.duration) {
        audioEl.currentTime = progress;
      }

      if (announcementResult === 'ended') {
        try {
          await audioEl.play();
        } catch (error) {
          console.warn('Playback failed after skip announcement', error);
        }
      }

      cancelled = true;
      skipJustHappenedRef.current = false;
      audioEl.removeEventListener('canplay', handleCanPlay);
    };

    audioEl.addEventListener('canplay', handleCanPlay);

    return () => {
      cancelled = true;
      audioEl.removeEventListener('canplay', handleCanPlay);
    };
  }, [audioUrl, source, pubDate, announce, hasAnnounced, setAnnouncedFlag, getSavedProgress]);

  const handleEnded = async () => {
    clearProgress();
    if (onEnded) onEnded();

    if (isLastEpisode) {
      await announce("That's all for today. See you next time!", false, undefined, true);
      return;
    }

    if (onClickNext) {
      skipJustHappenedRef.current = true;
      onClickNext();
    }
  };

  const handlePlay = async () => {
    if (!audioRef.current?.audio?.current || !source || !audioUrl) return;

    const audioEl = audioRef.current.audio.current;
    userPlayedRef.current = true;

    if (hasAnnounced()) return;

    setAnnouncedFlag();

    try {
      audioEl.pause();
    } catch (error) {
      console.warn('Play announcement pre-pause failed', error);
    }

    const progress = getSavedProgress();
    const announcementResult = await announce(source, progress > 2, pubDate);

    if (progress > 0 && progress < audioEl.duration) {
      audioEl.currentTime = progress;
    }

    if (announcementResult === 'ended') {
      try {
        await audioEl.play();
      } catch (error) {
        console.warn('Playback failed after user play announcement', error);
      }
    }
  };

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
        {!imageLoaded && <div className="absolute inset-0 bg-gray-700 animate-pulse rounded-md z-0" />}

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

      <h2 className="text-xl font-semibold mb-4">{loading ? 'Loading Your News...' : source}</h2>

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
          className={`absolute inset-0 bg-white transition-opacity duration-500 ease-in-out ${
            loading ? 'opacity-50 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
          aria-hidden="true"
        />
      </div>
    </div>
  );
};

export default PodcastPlayer;
