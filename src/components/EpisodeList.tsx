import React, { useEffect, useState } from 'react';
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

  useEffect(() => {
    fetch('https://podcast-app-backend-production.up.railway.app/api/episodes')
      .then(res => res.json())
      .then(data => {
        if (data && data.length > 0) {
          setEpisodes(data);
          setCurrentIndex(0); // Start at first episode
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching episodes:', err);
        setLoading(false);
      });
  }, []);

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % episodes.length);
  };

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? episodes.length - 1 : prev - 1));
  };

  const currentEpisode = episodes[currentIndex] ?? null;

  return (
    <div className="flex w-full justify-center items-center px-4">
      <div className="w-full max-w-md md:max-w-lg lg:max-w-xl">
        <PodcastPlayer
        source={currentEpisode?.source ?? ''}
        audioUrl={currentEpisode?.audioUrl ?? ''}
        image={currentEpisode?.image}
        loading={loading}
        pubDate={currentEpisode?.pubDate}
        onClickNext={handleNext}
        onClickPrevious={handlePrevious}
        onEnded={handleNext}
      />
      </div>
    </div>
  );
}

export default EpisodeList;
