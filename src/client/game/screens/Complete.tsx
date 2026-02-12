import React from "react";
import { TopBar } from "../components/TopBar";
import { PuzzleState } from "../hooks/usePuzzle";

type CompleteScreenProps = {
  puzzle: PuzzleState;
  onPlayAnother: () => void;
};

export const CompleteScreen: React.FC<CompleteScreenProps> = ({
  puzzle,
  onPlayAnother,
}) => {
  // Calculate score (simplified - can be extended with actual scoring logic)
  const heartsRemaining = puzzle.hearts;
  const tilesRevealed = puzzle.tiles.filter((t) => t.revealed).length;
  const totalTiles = puzzle.tiles.length;
  const score = heartsRemaining * 100 + tilesRevealed * 50;

  return (
    <div className="pz-screen">
      <TopBar subtitle="You revealed the full image!" />
      <main className="pz-main">
        <div className="pz-card pz-card--center pz-card--achievement">
          <div
            className="pz-complete-image"
            style={{ backgroundImage: `url(${puzzle.imageDataUrl})` }}
          />
          <h2 className="pz-heading">Puzzle Completed! 🎉</h2>
          <p className="pz-body">
            Nice work! All {totalTiles} tiles are solved and the grid lines are gone.
          </p>
          
          {/* Score Display */}
          <div className="pz-complete-score-section">
            <div className="pz-complete-label">Final Score</div>
            <div className="pz-complete-score">{score}</div>
          </div>
          
          {/* Score Breakdown */}
          <div className="pz-success-details">
            <div className="pz-success-detail">
              <span>Hearts Remaining</span>
              <span>{heartsRemaining} × 100 = {heartsRemaining * 100}</span>
            </div>
            <div className="pz-success-detail">
              <span>Tiles Revealed</span>
              <span>{tilesRevealed} × 50 = {tilesRevealed * 50}</span>
            </div>
            <div className="pz-success-detail">
              <span>Grid Size</span>
              <span>{puzzle.matrixSize}×{puzzle.matrixSize}</span>
            </div>
          </div>
          
          <div className="pz-actions">
            <button
              type="button"
              className="pz-button pz-button--primary"
              onClick={onPlayAnother}
            >
              Play Another
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

