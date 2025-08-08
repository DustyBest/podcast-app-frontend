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

export function useMediaSession({
  audioUrl,
  source,
  image,
  audioRef,
  onClickNext,
  onClickPrevious,
  skipJustHappenedRef,
  cancelAnnouncement
}: UseMediaSessionProps) {
  
  useEffect(() => {
    if (!audioUrl || !source || !('mediaSession' in navigator)) return;
    
    const artworkSrc = image ?? '/pwa-512x512.png';

    // Set media metadata
    navigator.mediaSession.metadata = new MediaMetadata({
      title: source,
      artwork: [{ src: artworkSrc, sizes: '512x512', type: 'image/png' }],
    });

    // Set action handlers
    navigator.mediaSession.setActionHandler('play', () => {
      audioRef.current?.audio?.current?.play();
    });

    navigator.mediaSession.setActionHandler('pause', () => {
      audioRef.current?.audio?.current?.pause();
    });

    navigator.mediaSession.setActionHandler('previoustrack', () => {
      // lock-screen / hardware controls must act immediately — don't announce on lock skips
      if (onClickPrevious) {
        skipJustHappenedRef.current = true;
        // cancel any ongoing speech to avoid overlap
        cancelAnnouncement();
        onClickPrevious();
        // play ASAP so OS/mediaSession doesn't think playback stopped
        setTimeout(() => audioRef.current?.audio?.current?.play().catch(console.error), 250);
      }
    });

    navigator.mediaSession.setActionHandler('nexttrack', () => {
      if (onClickNext) {
        skipJustHappenedRef.current = true;
        cancelAnnouncement();
        onClickNext();
        setTimeout(() => audioRef.current?.audio?.current?.play().catch(console.error), 250);
      }
    });

    // Cleanup function to remove action handlers
    return () => {
      if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('play', null);
        navigator.mediaSession.setActionHandler('pause', null);
        navigator.mediaSession.setActionHandler('previoustrack', null);
        navigator.mediaSession.setActionHandler('nexttrack', null);
      }
    };
  }, [audioUrl, source, image, onClickNext, onClickPrevious, cancelAnnouncement, audioRef, skipJustHappenedRef]);
}
