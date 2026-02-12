import React, { useState } from "react";
import { TopBar } from "../components/TopBar";
import { Hearts } from "../components/Hearts";
import { PuzzleGrid } from "../components/PuzzleGrid";
import { QuestionModal } from "../components/QuestionModal";
import type { PuzzleState } from "../hooks/usePuzzle";

type PuzzleScreenProps = {
  puzzle: PuzzleState;
  onAnswerTile: (tileIndex: number, isCorrect: boolean) => void;
  onRestart: () => void;
  onBack: () => void;
};

export const PuzzleScreen: React.FC<PuzzleScreenProps> = ({
  puzzle,
  onAnswerTile,
  onRestart,
  onBack,
}) => {
  const { hearts, maxHearts, isGameOver, isComplete, tiles } = puzzle;
  const [selectedTileIndex, setSelectedTileIndex] = useState<number | null>(null);

  const handleTileClick = (tileIndex: number) => {
    const tile = tiles.find((t) => t.index === tileIndex);
    if (tile && !tile.revealed && !isGameOver && !isComplete) {
      setSelectedTileIndex(tileIndex);
    }
  };

  const handleCloseModal = () => {
    setSelectedTileIndex(null);
  };

  const handleAnswer = (tileIndex: number, optionIndex: number) => {
    const tile = puzzle.tiles.find((t) => t.index === tileIndex);
    if (!tile) {
      return;
    }
    const isCorrect = optionIndex === tile.question.correctIndex;
    onAnswerTile(tileIndex, isCorrect);
    setSelectedTileIndex(null);
  };

  const selectedTile = selectedTileIndex !== null 
    ? tiles.find((t) => t.index === selectedTileIndex) 
    : null;

  return (
    <div className="pz-screen">
      <TopBar
        showBack
        onBack={onBack}
        subtitle="Answer questions to reveal each slice"
      />
      <main className="pz-main">
        <div className="pz-card">
          <div className="pz-row pz-row--between pz-row--center">
            <Hearts hearts={hearts} maxHearts={maxHearts} />
            <div className="pz-status-text">
              {tiles.filter((tile) => tile.revealed).length} /{" "}
              {tiles.length} tiles revealed
            </div>
          </div>

          <PuzzleGrid 
            puzzle={puzzle} 
            onAnswerTile={handleTileClick}
          />

          {isGameOver && (
            <div className="pz-message pz-message--error pz-message--center">
              Game Over — you ran out of hearts.
            </div>
          )}

          <div className="pz-actions pz-actions--stacked">
            <button
              type="button"
              className="pz-button pz-button--primary"
              onClick={onRestart}
            >
              Restart
            </button>
          </div>
        </div>
      </main>

      {/* Question Modal */}
      {selectedTile && (
        <QuestionModal
          tile={selectedTile}
          disabled={false}
          onAnswer={handleAnswer}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
};
