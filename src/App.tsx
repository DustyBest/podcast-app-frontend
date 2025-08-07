// src/App.tsx
import React from 'react';
import EpisodeList from './components/EpisodeList';

function App() {
  return (
    <div className='flex flex-col items-center justify-center h-full min-w-full p-8'>
      <EpisodeList />
    </div>
  );
}

export default App;
