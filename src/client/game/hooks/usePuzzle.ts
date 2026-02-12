import { useCallback, useMemo, useRef, useState } from "react";
import { generatePuzzleQuestions } from "../../../shared/questions";
import { TileQuestion, questionFromShared, questionsFromCustom } from "../utils/questions";
import {
  DEFAULT_IMAGES,
  getImageByIndex,
  getInitialImageIndex,
  getRenderUrl,
  type PuzzleImage,
} from "../utils/imageManager";

export type MatrixSize = 3 | 4 | 5;

export type TileState = {
  index: number;
  question: TileQuestion;
  revealed: boolean;
};

export type PuzzleState = {
  imageUrl: string;
  imageSource: string;
  imageType: 'asset' | 'upload';
  imageId: string;
  tiles: TileState[];
  hearts: number;
  maxHearts: number;
  isGameOver: boolean;
  isComplete: boolean;
  matrixSize: MatrixSize;
};

type AnswerResult = "correct" | "wrong" | "completed" | null;

const MAX_HEARTS = 5;

// Placeholder SVG when no images are available
const PLACEHOLDER_IMAGE_DATA_URL =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDMwMCAzMDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZzI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJnIiB4MT0iMCUiIHkxPSIwJSIgeDI9IjEwMCUiIHkyPSIxMDAlIj48c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjMjQzNTY5Ii8+PHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjRjQ3RjgyIi8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+PHJlY3Qgd2lkdGg9IjMwMCIgaGVpZ2h0PSIzMDAiIGZpbGw9InVybCgjZykiIHJ4PSIyNiIvPjxjaXJjbGUgY3g9Ijc1IiBjeT0iMTIwIiByPSI0MCIgZmlsbD0iI2ZmZiIgZmlsbC1vcGFjaXR5PSIwLjkiLz48Y2lyY2xlIGN4PSIyMDAiIGN5PSIxOTAiIHI9IjUwIiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuOSIgc3Ryb2tlPSIjRkZGIiBzdHJva2Utd2lkdGg9IjQiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iI0ZGRiIgZm9udC1zaXplPSI0MCIgZm9udC1mYW1pbHk9IkFyZWFsLCBzeXN0ZW0tdWkiPkJVWjwvdGV4dD48L3N2Zz4=";

interface CustomQuestion {
  id: string;
  questionText: string;
  options: { text: string; isCorrect: boolean }[];
}

export const usePuzzle = () => {
  const [imageUrl, setImageUrl] = useState<string>(PLACEHOLDER_IMAGE_DATA_URL);
  const [imageSource, setImageSource] = useState<string>('');
  const [imageType, setImageType] = useState<'asset' | 'upload'>('asset');
  const [imageId, setImageId] = useState<string>('default-1');
  const [tiles, setTiles] = useState<TileState[] | null>(null);
  const [hearts, setHearts] = useState<number>(MAX_HEARTS);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [matrixSize, setMatrixSize] = useState<MatrixSize>(3);

  const usedQuestionIdsRef = useRef<Set<string>>(new Set<string>());

  // ============================================
  // IMAGE LOADING
  // ============================================

  /**
   * Load a puzzle image (asset or upload)
   */
  const loadPuzzleImage = useCallback((
    image: PuzzleImage,
    _onLoad?: () => void,
    _onError?: () => void
  ) => {
    const url = getRenderUrl(image);
    setImageUrl(url);
    setImageSource(image.source);
    setImageType(image.type);
    setImageId(image.id);
    console.log('Loaded image:', image.name, '(', image.type, '):', url);
  }, []);

  /**
   * Start a default puzzle with asset image
   */
  const startDefaultPuzzle = useCallback(
    async (size: MatrixSize = 3, postId: string = 'default') => {
      console.log('Starting default puzzle...');
      
      // Get image based on deterministic index
      const index = getInitialImageIndex(postId, DEFAULT_IMAGES.length);
      const image = getImageByIndex(index, DEFAULT_IMAGES);
      
      // Load the image
      loadPuzzleImage(image);
      
      // Generate tiles
      const assignments = generatePuzzleQuestions(size, usedQuestionIdsRef.current);
      const newTiles = assignments.map((a) => ({
        index: a.tileIndex,
        question: questionFromShared(a.question),
        revealed: false,
      }));

      setMatrixSize(size);
      setTiles(newTiles);
      setHearts(MAX_HEARTS);
      setIsGameOver(false);
      setIsComplete(false);
      
      console.log('Puzzle ready with image:', image.name);
    },
    [loadPuzzleImage]
  );

  /**
   * Start puzzle with uploaded image
   */
  const startUploadedPuzzle = useCallback(
    async (
      mediaId: string,
      uploader: string,
      size: MatrixSize = 3
    ) => {
      console.log('Starting uploaded puzzle from:', uploader);
      
      const image: PuzzleImage = {
        id: `upload-${mediaId}`,
        type: 'upload',
        source: mediaId,
        name: `Uploaded by ${uploader}`,
        uploadedAt: Date.now(),
        uploadedBy: uploader,
      };
      
      // Load the uploaded image
      loadPuzzleImage(image);
      
      // Generate tiles
      const assignments = generatePuzzleQuestions(size, usedQuestionIdsRef.current);
      const newTiles = assignments.map((a) => ({
        index: a.tileIndex,
        question: questionFromShared(a.question),
        revealed: false,
      }));

      setMatrixSize(size);
      setTiles(newTiles);
      setHearts(MAX_HEARTS);
      setIsGameOver(false);
      setIsComplete(false);
      
      console.log('Uploaded puzzle ready');
    },
    [loadPuzzleImage]
  );

  // ============================================
  // PUZZLE STATE
  // ============================================

  const effectiveTiles = useMemo<TileState[] | null>(() => tiles, [tiles]);

  const puzzle: PuzzleState | null = useMemo(() => {
    if (!effectiveTiles) {
      return null;
    }

    return {
      imageUrl,
      imageSource,
      imageType,
      imageId,
      tiles: effectiveTiles,
      hearts,
      maxHearts: MAX_HEARTS,
      isGameOver,
      isComplete,
      matrixSize,
    };
  }, [imageUrl, imageSource, imageType, imageId, effectiveTiles, hearts, isGameOver, isComplete, matrixSize]);

  // ============================================
  // PUZZLE INITIALIZATION
  // ============================================

  const initialisePuzzle = useCallback(
    (url: string, source: string, type: 'asset' | 'upload', size: MatrixSize, customQuestions?: CustomQuestion[]) => {
      let newTiles: TileState[];

      if (customQuestions && customQuestions.length > 0) {
        const tileQuestions = questionsFromCustom(customQuestions);
        newTiles = tileQuestions.map((q, idx) => ({
          index: idx,
          question: q,
          revealed: false,
        }));
      } else {
        const assignments = generatePuzzleQuestions(size, usedQuestionIdsRef.current);
        newTiles = assignments.map((a) => ({
          index: a.tileIndex,
          question: questionFromShared(a.question),
          revealed: false,
        }));
      }

      setMatrixSize(size);
      setImageUrl(url);
      setImageSource(source);
      setImageType(type);
      setImageId(type === 'asset' ? source : `upload-${source}`);
      setTiles(newTiles);
      setHearts(MAX_HEARTS);
      setIsGameOver(false);
      setIsComplete(false);
    },
    []
  );

  const createPuzzleFromImage = useCallback(
    (url: string, size: MatrixSize = 3, customQuestions?: CustomQuestion[]) => {
      initialisePuzzle(url, url, 'upload', size, customQuestions);
    },
    [initialisePuzzle]
  );

  // ============================================
  // GAME LOGIC
  // ============================================

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
      const newlyRevealedCount = effectiveTiles.filter((tile, idx) =>
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
    if (!imageUrl) {
      return;
    }
    initialisePuzzle(imageUrl, imageSource, imageType, matrixSize);
  }, [imageUrl, imageSource, imageType, matrixSize, initialisePuzzle]);

  const resetPuzzle = useCallback(() => {
    setImageUrl(PLACEHOLDER_IMAGE_DATA_URL);
    setImageSource('');
    setImageType('asset');
    setImageId('default-1');
    setTiles(null);
    setHearts(MAX_HEARTS);
    setIsGameOver(false);
    setIsComplete(false);
  }, []);

  return {
    puzzle,
    startDefaultPuzzle,
    startUploadedPuzzle,
    createPuzzleFromImage,
    answerTile,
    restartCurrentPuzzle,
    resetPuzzle,
    loadPuzzleImage,
    DEFAULT_IMAGES,
  };
};
