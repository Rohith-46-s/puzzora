import React from 'react';
import { PuzzleTile } from '../utils/puzzles';

interface TileProps {
  tile: PuzzleTile;
  onClick: () => void;
  disabled?: boolean;
}

/**
 * Tile component - individual puzzle tile in the grid
 * Shows question mark when hidden, checkmark when revealed
 */
export const Tile: React.FC<TileProps> = ({ tile, onClick, disabled }) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled || tile.revealed}
      className={`
        w-full aspect-square rounded-lg border-2 text-4xl font-bold
        transition-all duration-300 ease-in-out
        focus:outline-none focus:ring-2 focus:ring-blue-300
        ${
          tile.revealed
            ? 'bg-green-100 border-green-400 text-green-600 cursor-default'
            : 'bg-gray-100 border-gray-300 text-gray-500 hover:bg-gray-200 hover:border-gray-400 cursor-pointer active:scale-95'
        }
        ${disabled && !tile.revealed ? 'opacity-50 cursor-not-allowed' : ''}
      `}
      aria-label={tile.revealed ? `Tile ${tile.id} revealed` : `Tile ${tile.id} hidden`}
    >
      {tile.revealed ? (
        <span className="flex items-center justify-center w-full h-full">
          ✓
        </span>
      ) : (
        <span className="flex items-center justify-center w-full h-full">
          ?
        </span>
      )}
    </button>
  );
};
