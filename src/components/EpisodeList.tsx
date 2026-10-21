import { useCallback, useEffect, useMemo, useState } from 'react';
import PodcastPlayer from './PodcastPlayer';

type Episode = {
  id: string;
  source: string;
  audioUrl: string;
  image?: string;
  pubDate?: string;
};

function EpisodeList() {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  const currentEpisode = useMemo(() => episodes[currentIndex] ?? null, [episodes, currentIndex]);
  const isLastEpisode = useMemo(() => episodes.length > 0 && currentIndex === episodes.length - 1, [episodes.length, currentIndex]);

  useEffect(() => {
    fetch('https://podcast-app-backend-production.up.railway.app/api/episodes')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.length > 0) {
          setEpisodes(data);
          setCurrentIndex(0);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching episodes:', err);
        setLoading(false);
      });
  }, []);

  const handleSelectEpisode = useCallback(
    (nextIndex: number) => {
      if (!episodes.length) return;

      const clampedIndex = Math.min(Math.max(nextIndex, 0), episodes.length - 1);
      setCurrentIndex(clampedIndex);
    },
    [episodes.length]
  );

  const handleNext = useCallback(() => {
    if (!episodes.length) return;
    setCurrentIndex((prev) => (prev + 1) % episodes.length);
  }, [episodes.length]);

  const handlePrevious = useCallback(() => {
    if (!episodes.length) return;
    setCurrentIndex((prev) => (prev === 0 ? episodes.length - 1 : prev - 1));
  }, [episodes.length]);

  return (
    <div className="flex w-full justify-center items-center px-4">
      <div className="w-full max-w-md md:max-w-lg lg:max-w-xl">
        <PodcastPlayer
          source={currentEpisode?.source ?? ''}
          audioUrl={currentEpisode?.audioUrl ?? ''}
          image={currentEpisode?.image}
          loading={loading}
          pubDate={currentEpisode?.pubDate}
          currentEpisodeIndex={currentIndex}
          onSelectEpisode={handleSelectEpisode}
          onClickNext={handleNext}
          onClickPrevious={handlePrevious}
          isLastEpisode={isLastEpisode}
        />
      </div>
    </div>
  );
}

export default EpisodeList;
