import React from "react";
import type { PuzzleState } from "../hooks/usePuzzle";
import { Tile } from "./Tile";
import { getTileBackgroundPosition } from "../utils/sliceImage";

interface PuzzleGridProps {
  puzzle: PuzzleState;
  onAnswerTile: (tileIndex: number, isCorrect: boolean) => void;
}

export const PuzzleGrid: React.FC<PuzzleGridProps> = ({ puzzle, onAnswerTile }) => {
  const { tiles, matrixSize, imageUrl, isGameOver, isComplete } = puzzle;

  console.log(`[PuzzleGrid] Rendering with imageUrl: ${imageUrl}`);

  const gridStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: `repeat(${matrixSize}, 1fr)`,
    width: "100%",
    maxWidth: "350px",
    aspectRatio: "1",
    gap: "4px",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    padding: "4px",
    borderRadius: "8px",
    margin: "0 auto",
  };

  const handleTileClick = (tileIndex: number) => {
    if (isGameOver || isComplete) {
      return;
    }
    
    const tile = tiles.find((t) => t.index === tileIndex);
    if (tile && !tile.revealed) {
      onAnswerTile(tileIndex, false);
    }
  };

  return (
    <div style={gridStyle}>
      {tiles.map((tile) => {
        const backgroundPosition = getTileBackgroundPosition(tile.index, matrixSize);
        const backgroundSize = `${matrixSize * 100}% ${matrixSize * 100}%`;
        
        return (
          <Tile
            key={`tile-${tile.index}`}
            tile={tile}
            imageDataUrl={imageUrl}
            gridSize={matrixSize}
            disabled={tile.revealed || isGameOver || isComplete}
            onSelectTile={handleTileClick}
          />
        );
      })}
    </div>
  );
};
