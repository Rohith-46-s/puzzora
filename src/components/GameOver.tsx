import React from 'react';

interface GameOverProps {
  onRestart: () => void;
  onNewPuzzle?: () => void;
}

/**
 * GameOver component - shown when player runs out of hearts
 * Displays final state and restart/new puzzle options
 */
export const GameOver: React.FC<GameOverProps> = ({ onRestart, onNewPuzzle }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 text-center animate-fade-in">
        <div className="text-6xl mb-4">💔</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Game Over!</h2>
        <p className="text-gray-600 mb-6">
          You ran out of hearts. Better luck next time!
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={onRestart}
            className="bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-orange-300"
          >
            Try Again
          </button>
          {onNewPuzzle && (
            <button
              onClick={onNewPuzzle}
              className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-300"
            >
              New Puzzle
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
