import { useCallback, useMemo, useState } from "react";
import { GRID_SIZE } from "../utils/sliceImage";
import { TILE_QUESTIONS, TileQuestion } from "../utils/questions";

export type TileState = {
  index: number;
  question: TileQuestion;
  revealed: boolean;
};

export type PuzzleState = {
  imageDataUrl: string;
  tiles: TileState[];
  hearts: number;
  maxHearts: number;
  isGameOver: boolean;
  isComplete: boolean;
};

type AnswerResult = "correct" | "wrong" | "completed" | null;

const MAX_HEARTS = 5;

// Small inline SVG placeholder so the app always works
// even if the user never uploads an image.
const PLACEHOLDER_IMAGE_DATA_URL =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDMwMCAzMDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJnIiB4MT0iMCUiIHkxPSIwJSIgeDI9IjEwMCUiIHkyPSIxMDAlIj48c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjMjQzNTY5Ii8+PHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjRjQ3RjgyIi8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+PHJlY3Qgd2lkdGg9IjMwMCIgaGVpZ2h0PSIzMDAiIGZpbGw9InVybCgjZykiIHJ4PSIyNiIvPjxjaXJjbGUgY3g9Ijc1IiBjeT0iMTIwIiByPSI0MCIgZmlsbD0iI2ZmZiIgZmlsbC1vcGFjaXR5PSIwLjkiLz48Y2lyY2xlIGN4PSIyMDAiIGN5PSIxOTAiIHI9IjUwIiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuOSIgc3Ryb2tlPSIjRkZGIiBzdHJva2Utd2lkdGg9IjQiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iI0ZGRiIgZm9udC1zaXplPSI0MCIgZm9udC1mYW1pbHk9IkFyZWFsLCBzeXN0ZW0tdWkiPkJVWjwvdGV4dD48L3N2Zz4=";

const getRandomTileQuestions = (count: number): TileQuestion[] => {
  const pool = TILE_QUESTIONS.slice();

  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = pool[i];
    pool[i] = pool[j];
    pool[j] = temp;
  }

  return pool.slice(0, count);
};

const buildTiles = (questions: TileQuestion[]): TileState[] =>
  questions.map((question, index) => ({
    index,
    question,
    revealed: false,
  }));

export const usePuzzle = () => {
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [tiles, setTiles] = useState<TileState[] | null>(null);
  const [hearts, setHearts] = useState<number>(MAX_HEARTS);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const effectiveTiles = useMemo<TileState[] | null>(() => tiles, [tiles]);

  const puzzle: PuzzleState | null = useMemo(() => {
    if (!imageDataUrl || !effectiveTiles) {
      return null;
    }

    return {
      imageDataUrl,
      tiles: effectiveTiles,
      hearts,
      maxHearts: MAX_HEARTS,
      isGameOver,
      isComplete,
    };
  }, [imageDataUrl, effectiveTiles, hearts, isGameOver, isComplete]);

  const initialisePuzzle = useCallback(
    (image: string) => {
      const totalTiles = GRID_SIZE * GRID_SIZE;
      const randomisedQuestions = getRandomTileQuestions(totalTiles);

      setImageDataUrl(image);
      setTiles(buildTiles(randomisedQuestions));
      setHearts(MAX_HEARTS);
      setIsGameOver(false);
      setIsComplete(false);
    },
    []
  );

  const startDefaultPuzzle = useCallback(() => {
    initialisePuzzle(PLACEHOLDER_IMAGE_DATA_URL);
  }, [initialisePuzzle]);

  const createPuzzleFromImage = useCallback(
    (image: string) => {
      initialisePuzzle(image);
    },
    [initialisePuzzle]
  );

  const answerTile = useCallback(
    (tileIndex: number, isCorrect: boolean): AnswerResult => {
      if (!effectiveTiles || tileIndex < 0 || tileIndex >= effectiveTiles.length) {
        return null;
      }

      if (isGameOver || isComplete) {
        return null;
      }

      if (!isCorrect) {
        setHearts((prev) => {
          const next = Math.max(0, prev - 1);
          if (next === 0) {
            setIsGameOver(true);
          }
          return next;
        });
        return "wrong";
      }

      setTiles((prevTiles) => {
        if (!prevTiles) {
          return prevTiles;
        }

        const updated = prevTiles.map((tile) =>
          tile.index === tileIndex ? { ...tile, revealed: true } : tile
        );

        const allRevealed = updated.every((tile) => tile.revealed);
        if (allRevealed) {
          setIsComplete(true);
        }

        return updated;
      });

      const totalTiles = effectiveTiles.length;
      const newlyRevealedCount =
        effectiveTiles.filter((tile, idx) =>
          idx === tileIndex ? true : tile.revealed
        ).length;

      if (newlyRevealedCount === totalTiles) {
        setIsComplete(true);
        return "completed";
      }

      return "correct";
    },
    [effectiveTiles, isComplete, isGameOver]
  );

  const restartCurrentPuzzle = useCallback(() => {
    if (!imageDataUrl) {
      return;
    }
    initialisePuzzle(imageDataUrl);
  }, [imageDataUrl, initialisePuzzle]);

  const resetPuzzle = useCallback(() => {
    setImageDataUrl(null);
    setTiles(null);
    setHearts(MAX_HEARTS);
    setIsGameOver(false);
    setIsComplete(false);
  }, []);

  return {
    puzzle,
    startDefaultPuzzle,
    createPuzzleFromImage,
    answerTile,
    restartCurrentPuzzle,
    resetPuzzle,
  };
};

