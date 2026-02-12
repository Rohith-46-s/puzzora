import '../index.css';
import { navigateTo, context, requestExpandedMode } from '@devvit/web/client';
import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import logoUrl from './logo.png';
import bgUrl from './background.png';

interface LeaderboardEntry {
  rank: number;
  username: string;
  score: number;
  heartsRemaining: number;
  gridSize: number;
  timeSeconds: number;
}

// Tooltip component for score breakdown
const ScoreBreakdownTooltip = ({ entry }: { entry: LeaderboardEntry }) => {
  const [show, setShow] = useState(false);
  
  const heartsBonus = entry.heartsRemaining * 15;
  const gridBonus = entry.gridSize === 3 ? 0 : entry.gridSize === 4 ? 40 : 80;
  const speedBonus = entry.timeSeconds <= 30 ? 80 : entry.timeSeconds <= 60 ? 50 : entry.timeSeconds <= 120 ? 25 : 0;
  const totalBonus = heartsBonus + gridBonus + speedBonus;
  
  const accuracyPct = Math.round((heartsBonus / totalBonus) * 100);
  const speedPct = Math.round((speedBonus / totalBonus) * 100);
  const difficultyPct = Math.round((gridBonus / totalBonus) * 100);
  
  return (
    <div className="relative inline-block">
      <span
        className="cursor-help text-blue-400 hover:text-blue-300"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
      >
        {entry.score} pts
      </span>
      {show && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-gray-900/95 backdrop-blur-sm border border-blue-500/30 rounded-lg p-3 text-xs shadow-xl z-50">
          <div className="font-bold text-blue-400 mb-2 text-center">Score Breakdown</div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-gray-300">Accuracy</span>
            <span className="text-blue-300">{accuracyPct}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-1.5 mb-2">
            <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${accuracyPct}%` }} />
          </div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-gray-300">Speed</span>
            <span className="text-blue-300">{speedPct}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-1.5 mb-2">
            <div className="bg-yellow-500 h-1.5 rounded-full" style={{ width: `${speedPct}%` }} />
          </div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-gray-300">Difficulty</span>
            <span className="text-blue-300">{difficultyPct}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-1.5">
            <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: `${difficultyPct}%` }} />
          </div>
        </div>
      )}
    </div>
  );
};

export const Splash = () => {
  // Mock data for the leaderboard - Replace with real data from your plugin later
  const leaderboardData: LeaderboardEntry[] = [
    { rank: 1, username: 'PlayerOne', score: 390, heartsRemaining: 6, gridSize: 5, timeSeconds: 28 },
    { rank: 2, username: 'PuzzleMaster', score: 340, heartsRemaining: 5, gridSize: 5, timeSeconds: 45 },
    { rank: 3, username: 'Rohith_46', score: 290, heartsRemaining: 4, gridSize: 4, timeSeconds: 55 },
    { rank: 4, username: 'BrainStorm', score: 245, heartsRemaining: 3, gridSize: 5, timeSeconds: 90 },
    { rank: 5, username: 'QuickSolve', score: 220, heartsRemaining: 4, gridSize: 3, timeSeconds: 25 },
  ];

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen overflow-hidden font-sans text-white">
      
      {/* 1. BACKGROUND */}
      <div 
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `url(${bgUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Dark overlay to make leaderboard readable */}
        <div className="absolute inset-0 bg-black/40" />
      </div>

      {/* 2. LOGO */}
      <div className="relative z-10 mb-4 animate-bounce-slow">
        <img src={logoUrl} alt="Puzzora" className="w-48 md:w-60" />
      </div>

      {/* 3. LEADERBOARD CONTAINER */}
      <div className="relative z-10 w-full max-w-sm mx-4 bg-black/60 backdrop-blur-md border border-blue-500/30 rounded-2xl p-6 shadow-[0_0_20px_rgba(59,130,246,0.2)]">
        <h2 className="text-blue-400 text-center font-bold uppercase tracking-widest mb-1 border-b border-blue-500/20 pb-2">
          Daily Leaderboard
        </h2>
        <p className="text-center text-blue-300/70 text-xs mb-4">
          Today's sharpest minds 🧠
        </p>
        
        <div className="flex flex-col gap-3">
          {leaderboardData.map((player) => (
            <div key={player.rank} className="flex justify-between items-center text-sm">
              <div className="flex gap-3 items-center">
                <span className={`${player.rank <= 3 ? 'text-yellow-400' : 'text-blue-500/70'} font-mono font-bold`}>
                  #{player.rank}
                </span>
                <span className={`${player.rank <= 3 ? 'text-white' : 'text-gray-300'} font-semibold`}>
                  {player.username}
                </span>
              </div>
              <ScoreBreakdownTooltip entry={player} />
            </div>
          ))}
        </div>
      </div>

      {/* 4. CONTROLS */}
      <div className="relative z-10 mt-8 flex flex-col items-center gap-4">
        <button
          className="bg-blue-600 hover:bg-blue-500 text-white font-black px-12 py-3 rounded-xl border-b-4 border-blue-800 active:border-b-0 active:translate-y-1 transition-all uppercase tracking-tighter italic shadow-xl"
          onClick={(e) => requestExpandedMode(e.nativeEvent, 'game')}
        >
          Tap to Start
        </button>
        
        <div className="flex gap-2 text-[10px] font-bold uppercase tracking-widest text-white/50">
          <button onClick={() => navigateTo('https://www.reddit.com/r/Devvit')}>r/Puzzora</button>
          <span>|</span>
          <button className="bg-blue-700/50 px-2 py-0.5 rounded text-white">Subscribe</button>
        </div>
      </div>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Splash />
  </StrictMode>
);
