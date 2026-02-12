import React from "react";
import { TopBar } from "../components/TopBar";
import type { MatrixSize } from "../hooks/usePuzzle";

type HomeScreenProps = {
  matrixSize: MatrixSize;
  onMatrixSizeChange: (size: MatrixSize) => void;
  onPlayPuzzle: () => void;
  onUploadImage: () => void;
};

export const HomeScreen: React.FC<HomeScreenProps> = ({
  matrixSize,
  onMatrixSizeChange,
  onPlayPuzzle,
  onUploadImage,
}) => {
  return (
    <div className="pz-screen">
      <TopBar />
      <main className="pz-main">
        <div className="pz-card pz-card--center">
          <h2 className="pz-heading">Start your puzzle journey</h2>
          <p className="pz-body">
            Play a ready-made puzzle or upload your own image to turn it into a brain teaser.
          </p>

          <div className="pz-matrix-select">
            <span className="pz-matrix-label">Grid size</span>
            <div className="pz-matrix-options">
              {([3, 4, 5] as const).map((size) => (
                <button
                  key={size}
                  type="button"
                  className={`pz-button pz-button--matrix ${matrixSize === size ? "pz-button--matrix-active" : ""}`}
                  onClick={() => onMatrixSizeChange(size)}
                >
                  {size}×{size}
                </button>
              ))}
            </div>
          </div>

          <div className="pz-actions">
            <button
              type="button"
              className="pz-button pz-button--primary"
              onClick={onPlayPuzzle}
            >
              Play Puzzle
            </button>
            <button
              type="button"
              className="pz-button pz-button--secondary"
              onClick={onUploadImage}
            >
              Upload Image
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

