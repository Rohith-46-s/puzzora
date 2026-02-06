import React, { useEffect, useState } from "react";
import { HomeScreen } from "./screens/Home";
import { UploadScreen } from "./screens/Upload";
import { PuzzleScreen } from "./screens/Puzzle";
import { CompleteScreen } from "./screens/Complete";
import { usePuzzle } from "./hooks/usePuzzle";
import "./styles/game.css";

type AppProps = {
  // Devvit passes a context object, but this UI is
  // intentionally client-only and does not depend on it.
  // Kept for compatibility with `src/devvit.tsx`.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  context?: any;
};

export type ScreenId = "home" | "upload" | "puzzle" | "complete";

const App: React.FC<AppProps> = () => {
  const [screen, setScreen] = useState<ScreenId>("home");

  const {
    puzzle,
    startDefaultPuzzle,
    createPuzzleFromImage,
    answerTile,
    restartCurrentPuzzle,
    resetPuzzle,
  } = usePuzzle();

  // Ensure we never land on the puzzle or complete screens without a puzzle.
  useEffect(() => {
    if (!puzzle && (screen === "puzzle" || screen === "complete")) {
      setScreen("home");
    }
  }, [puzzle, screen]);

  const handlePlayDefault = () => {
    startDefaultPuzzle();
    setScreen("puzzle");
  };

  const handleGoToUpload = () => {
    setScreen("upload");
  };

  const handleCreateFromUpload = (imageDataUrl: string) => {
    createPuzzleFromImage(imageDataUrl);
    setScreen("puzzle");
  };

  const handleGameOverRestart = () => {
    restartCurrentPuzzle();
  };

  const handleTileAnswer = (tileIndex: number, isCorrect: boolean) => {
    const result = answerTile(tileIndex, isCorrect);
    if (!result) {
      return;
    }

    if (result === "completed") {
      setScreen("complete");
    }
  };

  const handlePlayAnother = () => {
    resetPuzzle();
    startDefaultPuzzle();
    setScreen("puzzle");
  };

  const handleBackToHome = () => {
    setScreen("home");
  };

  return (
    <div className="pz-root">
      {screen === "home" && (
        <HomeScreen
          onPlayPuzzle={handlePlayDefault}
          onUploadImage={handleGoToUpload}
        />
      )}

      {screen === "upload" && (
        <UploadScreen
          onBack={handleBackToHome}
          onCreatePuzzle={handleCreateFromUpload}
        />
      )}

      {screen === "puzzle" && puzzle && (
        <PuzzleScreen
          puzzle={puzzle}
          onAnswerTile={handleTileAnswer}
          onRestart={handleGameOverRestart}
          onBack={handleBackToHome}
        />
      )}

      {screen === "puzzle" && !puzzle && (
        <HomeScreen
          onPlayPuzzle={handlePlayDefault}
          onUploadImage={handleGoToUpload}
        />
      )}

      {screen === "complete" && puzzle && (
        <CompleteScreen puzzle={puzzle} onPlayAnother={handlePlayAnother} />
      )}

      {screen === "complete" && !puzzle && (
        <HomeScreen
          onPlayPuzzle={handlePlayDefault}
          onUploadImage={handleGoToUpload}
        />
      )}
    </div>
  );
};

export default App;
