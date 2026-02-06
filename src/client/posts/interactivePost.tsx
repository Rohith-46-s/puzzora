import React, { useState, useCallback } from 'react';
import { demoPuzzle, PuzzleTile, MAX_HEARTS, GRID_COLS } from '../utils/puzzles';
import { Hearts } from '../components/Hearts';
import { Tile } from '../components/Tile';
import { GameOver } from '../components/GameOver';

/**
 * Interactive Post - Main game controller and screen
 * Manages puzzle state, hearts, and game flow
 */
export const InteractivePost: React.FC = () => {
  // Game state
  const [tiles, setTiles] = useState<PuzzleTile[]>(
    demoPuzzle.tiles.map((tile) => ({ ...tile, revealed: false }))
  );
  const [hearts, setHearts] = useState<number>(MAX_HEARTS);
  const [gameOver, setGameOver] = useState<boolean>(false);
  
  // Question modal state
  const [selectedTile, setSelectedTile] = useState<PuzzleTile | null>(null);
  const [answerResult, setAnswerResult] = useState<'correct' | 'wrong' | null>(null);

  /**
   * Handle tile click - opens question modal
   */
  const handleTileClick = useCallback((tile: PuzzleTile) => {
    if (!gameOver && !tile.revealed) {
      setSelectedTile(tile);
      setAnswerResult(null);
    }
  }, [gameOver]);

  /**
   * Handle answer selection from question modal
   */
  const handleAnswerSelect = useCallback((selectedIndex: number) => {
    if (!selectedTile || answerResult) return;

    if (selectedIndex === selectedTile.correctIndex) {
      // Correct answer
      setAnswerResult('correct');
      
      // Reveal the tile after a short delay
      setTimeout(() => {
        setTiles((prev) =>
          prev.map((t) =>
            t.id === selectedTile.id ? { ...t, revealed: true } : t
          )
        );
        setSelectedTile(null);
        setAnswerResult(null);
      }, 500);
    } else {
      // Wrong answer
      setAnswerResult('wrong');
      
      // Decrease hearts
      const newHearts = hearts - 1;
      setHearts(newHearts);
      
      // Check for game over
      if (newHearts <= 0) {
        setTimeout(() => {
          setGameOver(true);
          setSelectedTile(null);
          setAnswerResult(null);
        }, 1000);
      } else {
        // Close modal after showing wrong answer
        setTimeout(() => {
          setSelectedTile(null);
          setAnswerResult(null);
        }, 1000);
      }
    }
  }, [selectedTile, answerResult, hearts]);

  /**
   * Close the question modal without answering
   */
  const handleCloseModal = useCallback(() => {
    if (!answerResult) {
      setSelectedTile(null);
      setAnswerResult(null);
    }
  }, [answerResult]);

  /**
   * Restart the game - reset all state
   */
  const handleRestart = useCallback(() => {
    setTiles(demoPuzzle.tiles.map((tile) => ({ ...tile, revealed: false })));
    setHearts(MAX_HEARTS);
    setGameOver(false);
    setSelectedTile(null);
    setAnswerResult(null);
  }, []);

  /**
   * Switch to a new puzzle (placeholder for future)
   */
  const handleNewPuzzle = useCallback(() => {
    // For now, just restart the same puzzle
    handleRestart();
  }, [handleRestart]);

  /**
   * Check if all tiles are revealed
   */
  const allRevealed = tiles.every((tile) => tile.revealed);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-6 px-4">
      {/* Header with Hearts */}
      <div className="w-full max-w-md">
        <Hearts hearts={hearts} maxHearts={MAX_HEARTS} />
      </div>

      {/* Puzzle Title */}
      <h1 className="text-xl font-bold text-gray-800 mb-4">
        {demoPuzzle.title}
      </h1>

      {/* Progress indicator */}
      <p className="text-sm text-gray-600 mb-4">
        {tiles.filter((t) => t.revealed).length} / {tiles.length} tiles revealed
        {allRevealed && ' - You Win!'}
      </p>

      {/* Puzzle Grid */}
      <div
        className="grid gap-3 w-full max-w-md"
        style={{
          gridTemplateColumns: `repeat(${GRID_COLS}, minmax(0, 1fr))`,
        }}
      >
        {tiles.map((tile) => (
          <Tile
            key={tile.id}
            tile={tile}
            onClick={() => handleTileClick(tile)}
            disabled={gameOver}
          />
        ))}
      </div>

      {/* Question Modal */}
      {selectedTile && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={handleCloseModal}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-sm w-full p-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Question */}
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              {selectedTile.question}
            </h3>

            {/* Answer Options */}
            <div className="space-y-2">
              {selectedTile.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleAnswerSelect(index)}
                  disabled={answerResult !== null}
                  className={`
                    w-full py-3 px-4 rounded-lg text-left font-medium transition-all duration-200
                    focus:outline-none focus:ring-2 focus:ring-blue-300
                    ${
                      answerResult === null
                        ? 'bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300'
                        : answerResult === 'correct' && index === selectedTile.correctIndex
                        ? 'bg-green-500 text-white'
                        : index === selectedTile.correctIndex
                        ? 'bg-green-500 text-white'
                        : answerResult !== null
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300'
                    }
                  `}
                >
                  <span className="inline-block w-6 h-6 bg-gray-300 text-gray-700 rounded-full text-center text-sm leading-6 mr-2">
                    {String.fromCharCode(65 + index)}
                  </span>
                  {option}
                </button>
              ))}
            </div>

            {/* Result Feedback */}
            {answerResult && (
              <div
                className={`mt-4 p-3 rounded-lg text-center font-semibold ${
                  answerResult === 'correct'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}
              >
                {answerResult === 'correct' ? '✓ Correct!' : `✗ Wrong! -${1} Heart`}
              </div>
            )}

            {/* Close button (only when no result) */}
            {answerResult === null && (
              <button
                onClick={handleCloseModal}
                className="mt-4 w-full py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      )}

      {/* Game Over Modal */}
      {gameOver && (
        <GameOver onRestart={handleRestart} onNewPuzzle={handleNewPuzzle} />
      )}

      {/* Victory Modal */}
      {allRevealed && !gameOver && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Congratulations!</h2>
            <p className="text-gray-600 mb-6">
              You revealed all tiles with {hearts} hearts remaining!
            </p>
            <button
              onClick={handleRestart}
              className="bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-orange-300"
            >
              Play Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default InteractivePost;
