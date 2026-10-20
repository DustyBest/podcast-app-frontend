import { useEffect } from 'react';
import AudioPlayer from 'react-h5-audio-player';

interface UseMediaSessionProps {
  audioUrl?: string;
  source?: string;
  image?: string;
  audioRef: React.RefObject<InstanceType<typeof AudioPlayer> | null>;
  onClickNext?: () => void;
  onClickPrevious?: () => void;
  skipJustHappenedRef: React.MutableRefObject<boolean>;
  cancelAnnouncement: () => void;
}

const MEDIA_SESSION_BUTTONS = ['play', 'pause', 'previoustrack', 'nexttrack'] as const;

export function useMediaSession({
  audioUrl,
  source,
  image,
  audioRef,
  onClickNext,
  onClickPrevious,
  skipJustHappenedRef,
  cancelAnnouncement,
}: UseMediaSessionProps) {
  useEffect(() => {
    if (!audioUrl || !source || !('mediaSession' in navigator)) {
      return;
    }

    const audioEl = audioRef.current?.audio?.current;
    const artworkSrc = image ?? '/pwa-512x512.png';

    navigator.mediaSession.metadata = new MediaMetadata({
      title: source,
      artwork: [{ src: artworkSrc, sizes: '512x512', type: 'image/png' }],
    });

    const safePlay = () => {
      if (!audioEl) return;

      const playPromise = audioEl.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch((error) => console.warn('MediaSession play failed', error));
      }
    };

    navigator.mediaSession.setActionHandler('play', () => {
      safePlay();
    });

    navigator.mediaSession.setActionHandler('pause', () => {
      audioEl?.pause();
    });

    navigator.mediaSession.setActionHandler('previoustrack', () => {
      if (!onClickPrevious) return;

      skipJustHappenedRef.current = true;
      cancelAnnouncement();
      onClickPrevious();
      window.setTimeout(() => {
        if (audioRef.current?.audio?.current) {
          audioRef.current.audio.current.play().catch(console.error);
        }
      }, 250);
    });

    navigator.mediaSession.setActionHandler('nexttrack', () => {
      if (!onClickNext) return;

      skipJustHappenedRef.current = true;
      cancelAnnouncement();
      onClickNext();
      window.setTimeout(() => {
        if (audioRef.current?.audio?.current) {
          audioRef.current.audio.current.play().catch(console.error);
        }
      }, 250);
    });

    return () => {
      for (const action of MEDIA_SESSION_BUTTONS) {
        navigator.mediaSession.setActionHandler(action, null);
      }
    };
  }, [audioUrl, source, image, audioRef, onClickNext, onClickPrevious, skipJustHappenedRef, cancelAnnouncement]);
}
