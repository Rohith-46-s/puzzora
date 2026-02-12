import React, { useState } from "react";
import { TileState } from "../hooks/usePuzzle";
import { getTileBackgroundPosition } from "../utils/sliceImage";

type TileProps = {
  tile: TileState;
  imageDataUrl: string;
  gridSize: number;
  disabled: boolean;
  isShaking?: boolean;
  /** Stagger delay for completion cinematic (ms). */
  completionDelayMs?: number;
  onSelectTile: (tileIndex: number) => void;
};

export const Tile: React.FC<TileProps> = ({
  tile,
  imageDataUrl,
  gridSize,
  disabled,
  isShaking = false,
  completionDelayMs,
  onSelectTile,
}) => {
  const { index, revealed } = tile;
  const backgroundPosition = getTileBackgroundPosition(index, gridSize);
  const backgroundSize = `${gridSize * 100}% ${gridSize * 100}%`;
  const [imageError, setImageError] = useState(false);

  const handleClick = () => {
    if (disabled || revealed) {
      return;
    }
    onSelectTile(index);
  };

  const handleImageError = () => {
    setImageError(true);
    console.error(`[Tile] Image failed to load: ${imageDataUrl}`);
  };

  // Debug: Show the URL being used
  if (revealed && imageError) {
    console.warn(`[Tile] Revealed tile ${index} has image error. URL: ${imageDataUrl}`);
  }

  const style: React.CSSProperties = revealed
    ? {
        backgroundImage: imageError ? 'none' : `url(${imageDataUrl})`,
        backgroundSize,
        backgroundPosition,
      }
    : {};

  if (completionDelayMs != null) {
    (style as Record<string, unknown>)["--pz-tile-delay"] = `${completionDelayMs}ms`;
  }

  const className = [
    "pz-tile",
    revealed ? "pz-tile--revealed pz-tile--reveal pz-tile--correct" : "pz-tile--hidden",
    isShaking ? "pz-tile--shake" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={className}
      style={style}
      onClick={handleClick}
      role="button"
      tabIndex={revealed || disabled ? -1 : 0}
      aria-label={revealed ? "Tile revealed" : "Select tile to answer question"}
    >
      {/* Debug: Show placeholder text if image fails */}
      {revealed && imageError && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#333',
          color: '#fff',
          fontSize: '0.8rem',
          textAlign: 'center',
          padding: '4px',
        }}>
          <span>Img Error</span>
        </div>
      )}
      
      {!revealed && (
        <div className="pz-tile-conceal">
          <span className="pz-tile-question-mark">?</span>
        </div>
      )}
    </div>
  );
};
