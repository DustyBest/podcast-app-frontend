import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  currentEpisodeIndex?: number;
  onSelectEpisode?: (nextEpisodeIndex: number) => void;
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
  currentEpisodeIndex,
  onSelectEpisode,
}: PodcastPlayerProps) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const audioRef = useRef<InstanceType<typeof AudioPlayer> | null>(null);
  const skipJustHappenedRef = useRef(false);
  const [announcementMessage, setAnnouncementMessage] = useState('');

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
    skipJustHappenedRef.current = false;
    setAnnouncementMessage('');
  }, [audioUrl, resetAnnouncedFlag]);

  useEffect(() => {
    if (!audioUrl || !source || currentEpisodeIndex === undefined) return;

    const audioEl = audioRef.current?.audio?.current;
    if (!audioEl) return;

    let isCancelled = false;

    const triggerEpisodeAnnouncement = async () => {
      if (isCancelled || !audioEl) return;

      const progress = getSavedProgress();
      const shouldContinue = progress > 2;
      const result = await announce(source, shouldContinue, pubDate);

      if (isCancelled) return;

      if (progress > 0 && progress < audioEl.duration) {
        audioEl.currentTime = progress;
      }

      if (result === 'ended') {
        try {
          await audioEl.play();
        } catch (error) {
          console.warn('Playback failed after episode change announcement', error);
        }
      }

      setAnnouncementMessage(`${source} is now playing.`);
    };

    if (skipJustHappenedRef.current) {
      void triggerEpisodeAnnouncement();
    }

    return () => {
      isCancelled = true;
    };
  }, [announce, audioUrl, currentEpisodeIndex, getSavedProgress, pubDate, source]);

  const handleEnded = useCallback(async () => {
    clearProgress();
    if (onEnded) onEnded();

    if (isLastEpisode) {
      await announce("That's all for today. See you next time!", false, undefined, true);
      setAnnouncementMessage("That's all for today. See you next time!");
      return;
    }

    if (typeof currentEpisodeIndex === 'number' && onSelectEpisode) {
      onSelectEpisode(currentEpisodeIndex + 1);
    }
  }, [announce, clearProgress, currentEpisodeIndex, isLastEpisode, onEnded, onSelectEpisode]);

  const handlePlay = useCallback(async () => {
    if (!audioRef.current?.audio?.current || !source || !audioUrl) return;

    const audioEl = audioRef.current.audio.current;

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

    setAnnouncementMessage(`${source} is playing.`);
  }, [announce, audioUrl, getSavedProgress, hasAnnounced, pubDate, setAnnouncedFlag, source]);

  const handleNext = useCallback(() => {
    cancelAnnouncement();
    skipJustHappenedRef.current = true;
    if (onClickNext) onClickNext();
  }, [cancelAnnouncement, onClickNext]);

  const handlePrevious = useCallback(() => {
    cancelAnnouncement();
    skipJustHappenedRef.current = true;
    if (onClickPrevious) onClickPrevious();
  }, [cancelAnnouncement, onClickPrevious]);

  const playerClassName = useMemo(
    () =>
      'rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900',
    []
  );

  return (
    <div className="max-w-md mx-auto p-4 relative bg-gray-900 rounded-lg shadow-lg text-white">
      <div className="w-full aspect-square mb-4 relative">
        {!imageLoaded && (
          <div className="absolute inset-0 bg-gray-700 animate-pulse rounded-md z-0" aria-hidden="true" />
        )}

        {image && (
          <img
            src={image}
            alt={source ? `${source} cover art` : 'Podcast cover art'}
            onLoad={() => setImageLoaded(true)}
            className={`w-full h-full object-cover rounded-md transition-opacity duration-500 z-10 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            loading="lazy"
          />
        )}
      </div>

      <h2
        id="podcast-player-title"
        className="text-xl font-semibold mb-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
      >
        {loading ? 'Loading Your News...' : source}
      </h2>

      <div className="relative" aria-live="polite" aria-atomic="true">
        {!loading && audioUrl ? (
          <AudioPlayer
            ref={audioRef}
            src={audioUrl}
            showSkipControls
            showJumpControls={true}
            progressJumpSteps={{
              backward: 10000,
              forward: 30000,
            }}
            aria-label={source ? `Audio player for ${source}` : 'Audio player'}
            onListen={handleListen}
            onClickNext={handleNext}
            onClickPrevious={handlePrevious}
            onEnded={handleEnded}
            onPlay={handlePlay}
            className={playerClassName}
          />
        ) : (
          <div className="h-[72px] w-full animate-pulse bg-gray-200 rounded-md" aria-hidden="true" />
        )}

        <div
          className={`absolute inset-0 bg-white transition-opacity duration-500 ease-in-out ${
            loading ? 'opacity-50 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
          aria-hidden="true"
        />
      </div>

      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {announcementMessage}
      </div>
    </div>
  );
};

export default PodcastPlayer;