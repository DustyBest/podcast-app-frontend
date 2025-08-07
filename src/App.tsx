// src/App.tsx
import EpisodeList from './components/EpisodeList';

function App() {
  return (
    <div className='flex flex-col items-center justify-center h-full min-w-full p-8 bg-gradient-to-r from-orange-500 via-pink-500 to-cyan-500 animate-gradient-x' style={{
        background: 'radial-gradient(circle at center, #3b82f6 0%, #1e293b 80%)',
      }}>
      <EpisodeList />
    </div>
  );
}

export default App;
