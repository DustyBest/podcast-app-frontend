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

  // Direct Jump Handlers
  const handleRewind10 = useCallback(() => {
    const audioEl = audioRef.current?.audio?.current;
    if (audioEl) {
      audioEl.currentTime = Math.max(audioEl.currentTime - 10, 0);
    }
  }, []);

  const handleSkip30 = useCallback(() => {
    const audioEl = audioRef.current?.audio?.current;
    if (audioEl) {
      audioEl.currentTime = Math.min(audioEl.currentTime + 30, audioEl.duration || Infinity);
    }
  }, []);

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
          <div>
            {/* Quick-Jump Shortcut Bar */}
            <div className="flex justify-center items-center gap-6 mb-3">
              <button
                type="button"
                onClick={handleRewind10}
                className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 bg-gray-800 hover:bg-gray-700 active:bg-gray-600 rounded-full border border-gray-700 text-gray-200 transition-colors focus-visible:ring-2 focus-visible:ring-orange-400"
                aria-label="Rewind 10 seconds"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12.5 3C17.15 3 21 6.85 21 11.5C21 16.15 17.15 20 12.5 20C8.64 20 5.41 17.41 4.41 13.88L6.45 13.29C7.2 15.93 9.62 18 12.5 18C16.09 18 19 15.09 19 11.5C19 7.91 16.09 5 12.5 5C10.15 5 8.09 6.25 6.95 8.12L9 10.17H3V4.17L5.38 6.55C6.96 4.38 9.56 3 12.5 3Z" />
                </svg>
                -10s
              </button>

              <button
                type="button"
                onClick={handleSkip30}
                className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 bg-gray-800 hover:bg-gray-700 active:bg-gray-600 rounded-full border border-gray-700 text-gray-200 transition-colors focus-visible:ring-2 focus-visible:ring-orange-400"
                aria-label="Skip 30 seconds"
              >
                +30s
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M11.5 3C6.85 3 3 6.85 3 11.5C3 16.15 6.85 20 11.5 20C15.36 20 18.59 17.41 19.59 13.88L17.55 13.29C16.8 15.93 14.38 18 11.5 18C7.91 18 5 15.09 5 11.5C5 7.91 7.91 5 11.5 5C13.85 5 15.91 6.25 17.05 8.12L15 10.17H21V4.17L18.62 6.55C17.04 4.38 14.44 3 11.5 3Z" />
                </svg>
              </button>
            </div>

            <AudioPlayer
              ref={audioRef}
              src={audioUrl}
              showSkipControls={true}
              showJumpControls={false}
              customAdditionalControls={[]}
              aria-label={source ? `Audio player for ${source}` : 'Audio player'}
              onListen={handleListen}
              onClickNext={handleNext}
              onClickPrevious={handlePrevious}
              onEnded={handleEnded}
              onPlay={handlePlay}
              className={playerClassName}
            />
          </div>
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