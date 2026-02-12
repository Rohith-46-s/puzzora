import React, { useState, useRef } from "react";
import { HomeScreen } from "./screens/Home";
import { UploadScreen } from "./screens/Upload";
import { PuzzleScreen } from "./screens/Puzzle";
import { CompleteScreen } from "./screens/Complete";
import { usePuzzle, type MatrixSize } from "./hooks/usePuzzle";
import { playCompletionSound } from "./utils/sound";
import "./styles/game.css";

const COMPLETION_CINEMATIC_MS = 1200;

type AppProps = {
  context?: any;
};

export type ScreenId = "home" | "upload" | "puzzle" | "complete";

interface Question {
  id: string;
  questionText: string;
  options: { text: string; isCorrect: boolean }[];
}

const App: React.FC<AppProps> = () => {
  const [screen, setScreen] = useState<ScreenId>("home");
  const [selectedMatrixSize, setSelectedMatrixSize] = useState<MatrixSize>(3);

  const completionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const {
    puzzle,
    startDefaultPuzzle,
    createPuzzleFromImage,
    answerTile,
    restartCurrentPuzzle,
    resetPuzzle,
  } = usePuzzle();

  const safeScreen: ScreenId = screen || "home";

  const handlePlayDefault = () => {
    startDefaultPuzzle(selectedMatrixSize, 'default');
    setScreen("puzzle");
  };

  const handleGoToUpload = () => {
    setScreen("upload");
  };

  const handleCreateFromUpload = (imageUrl: string, gridSize: number, questions: Question[] | null) => {
    // Create puzzle locally - this is for the uploader to play only
    // Images are NOT stored on server for other users
    createPuzzleFromImage(imageUrl, gridSize as MatrixSize, questions ?? undefined);
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
      playCompletionSound();
      if (completionTimeoutRef.current) clearTimeout(completionTimeoutRef.current);
      completionTimeoutRef.current = setTimeout(() => {
        setScreen("complete");
        completionTimeoutRef.current = null;
      }, COMPLETION_CINEMATIC_MS);
    }
  };

  const handlePlayAnother = () => {
    const size = puzzle?.matrixSize ?? selectedMatrixSize;
    resetPuzzle();
    startDefaultPuzzle(size, 'default');
    setScreen("puzzle");
  };

  const handleBackToHome = () => {
    setScreen("home");
  };

  try {
    return (
      <div className="pz-root">
        {safeScreen === "home" && (
          <HomeScreen
            matrixSize={selectedMatrixSize}
            onMatrixSizeChange={setSelectedMatrixSize}
            onPlayPuzzle={handlePlayDefault}
            onUploadImage={handleGoToUpload}
          />
        )}

        {safeScreen === "upload" && (
          <UploadScreen
            onBack={handleBackToHome}
            onCreatePuzzle={handleCreateFromUpload}
          />
        )}

        {safeScreen === "puzzle" && puzzle && (
          <PuzzleScreen
            puzzle={puzzle}
            onAnswerTile={handleTileAnswer}
            onRestart={handleGameOverRestart}
            onBack={handleBackToHome}
          />
        )}

        {safeScreen === "puzzle" && !puzzle && (
          <HomeScreen
            matrixSize={selectedMatrixSize}
            onMatrixSizeChange={setSelectedMatrixSize}
            onPlayPuzzle={handlePlayDefault}
            onUploadImage={handleGoToUpload}
          />
        )}

        {safeScreen === "complete" && puzzle && (
          <CompleteScreen puzzle={puzzle} onPlayAnother={handlePlayAnother} />
        )}

        {safeScreen === "complete" && !puzzle && (
          <HomeScreen
            matrixSize={selectedMatrixSize}
            onMatrixSizeChange={setSelectedMatrixSize}
            onPlayPuzzle={handlePlayDefault}
            onUploadImage={handleGoToUpload}
          />
        )}

        {safeScreen !== "home" &&
          safeScreen !== "upload" &&
          safeScreen !== "puzzle" &&
          safeScreen !== "complete" && (
            <HomeScreen
              matrixSize={selectedMatrixSize}
              onMatrixSizeChange={setSelectedMatrixSize}
              onPlayPuzzle={handlePlayDefault}
              onUploadImage={handleGoToUpload}
            />
          )}
      </div>
    );
  } catch (error) {
    console.error("App render error:", error);
    return (
      <div className="pz-root">
        <HomeScreen
          matrixSize={selectedMatrixSize}
          onMatrixSizeChange={setSelectedMatrixSize}
          onPlayPuzzle={handlePlayDefault}
          onUploadImage={handleGoToUpload}
        />
      </div>
    );
  }
};

export default App;
