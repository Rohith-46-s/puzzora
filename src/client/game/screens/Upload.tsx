import React, { useState } from "react";
import { TopBar } from "../components/TopBar";
import { QUESTION_BANK, shuffle, Question as SharedQuestion } from "../../../shared/questions";

type UploadScreenProps = {
  onCreatePuzzle: (imageDataUrl: string, gridSize: number, questions: Question[] | null) => void;
  onBack: () => void;
};

type FileValidationState = {
  message: string;
  level: "error" | "info" | "success";
} | null;

type QuestionType = "default" | "custom";

interface Question {
  id: string;
  questionText: string;
  options: { text: string; isCorrect: boolean }[];
}

const MAX_BYTES = 2 * 1024 * 1024; // 2MB
const GRID_OPTIONS = [3, 4, 5] as const;

export const UploadScreen: React.FC<UploadScreenProps> = ({
  onCreatePuzzle,
  onBack,
}) => {
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [validation, setValidation] = useState<FileValidationState>(null);
  const [isReading, setIsReading] = useState(false);
  const [gridSize, setGridSize] = useState<typeof GRID_OPTIONS[number]>(3);
  const [questionType, setQuestionType] = useState<QuestionType>("default");
  const [customQuestions, setCustomQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showQuestionEditor, setShowQuestionEditor] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const generateQuestionId = () => `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const createDefaultQuestions = (size: number): Question[] => {
    const numQuestions = size * size;
    
    // Get shuffled questions from the question bank
    const shuffledQuestions = shuffle([...QUESTION_BANK]);
    
    // Take the first N questions we need
    const selectedQuestions = shuffledQuestions.slice(0, numQuestions);
    
    // Convert to the format expected by the puzzle system
    const questions: Question[] = selectedQuestions.map((q: SharedQuestion, index: number) => {
      const questionText = q.text;
      
      // Convert options array to the format expected
      const options = q.options.map((optText: string, optIndex: number) => ({
        text: optText,
        isCorrect: optIndex === q.correctIndex
      }));
      
      return {
        id: q.id,
        questionText: questionText,
        options: options
      };
    });
    
    return questions;
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files;
    const file = fileList && fileList[0] ? fileList[0] : null;

    if (!file) {
      setPreviewSrc(null);
      setValidation(null);
      return;
    }

    if (file.size > MAX_BYTES) {
      setPreviewSrc(null);
      setValidation({
        level: "error",
        message: "File is too large. Please choose an image under 2MB.",
      });
      return;
    }

    const mime = file.type;
    const isPngOrJpg =
      mime === "image/png" ||
      mime === "image/jpeg" ||
      mime === "image/jpg";

    if (!isPngOrJpg) {
      setPreviewSrc(null);
      setValidation({
        level: "error",
        message: "Only PNG and JPG images are supported.",
      });
      return;
    }

    setIsReading(true);
    setValidation({
      level: "info",
      message: "Loading preview…",
    });

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : null;
      setPreviewSrc(result);
      setIsReading(false);
      setValidation(
        result
          ? null
          : {
              level: "error",
              message: "Could not read image. Please try another file.",
            }
      );
    };
    reader.onerror = () => {
      setIsReading(false);
      setPreviewSrc(null);
      setValidation({
        level: "error",
        message: "Failed to read image file.",
      });
    };
    reader.readAsDataURL(file);
  };

  const handleGridSizeChange = (size: typeof GRID_OPTIONS[number]) => {
    setGridSize(size);
    if (questionType === "custom") {
      setCustomQuestions([]);
      setCurrentQuestionIndex(0);
      setShowQuestionEditor(false);
    }
  };

  const handleQuestionTypeChange = (type: QuestionType) => {
    setQuestionType(type);
    if (type === "custom") {
      setCustomQuestions([
        {
          id: generateQuestionId(),
          questionText: "",
          options: [
            { text: "", isCorrect: true },
            { text: "", isCorrect: false },
            { text: "", isCorrect: false },
            { text: "", isCorrect: false },
          ],
        },
      ]);
      setCurrentQuestionIndex(0);
      setShowQuestionEditor(true);
    } else {
      setShowQuestionEditor(false);
      setCustomQuestions([]);
    }
  };

  const handleCreatePuzzle = () => {
    if (!previewSrc) {
      setValidation({
        level: "error",
        message: "Please choose an image first.",
      });
      return;
    }

    if (questionType === "custom") {
      const allFilled = customQuestions.every((q) => {
        if (!q.questionText.trim()) return false;
        return q.options.every((o) => o.text.trim());
      });
      if (!allFilled) {
        setValidation({
          level: "error",
          message: "Please fill in all questions and options.",
        });
        return;
      }
    }

    setIsUploading(true);
    setValidation({
      level: "info",
      message: "Creating puzzle...",
    });

    if (questionType === "custom") {
      onCreatePuzzle(previewSrc, gridSize, customQuestions);
    } else {
      const defaultQuestions = createDefaultQuestions(gridSize);
      onCreatePuzzle(previewSrc, gridSize, defaultQuestions);
    }

    setTimeout(() => {
      setIsUploading(false);
      setUploadSuccess(true);
      setValidation({
        level: "success",
        message: "✅ Puzzle created successfully!",
      });
    }, 500);
  };

  const updateQuestion = (question: Question) => {
    const updated = [...customQuestions];
    updated[currentQuestionIndex] = question;
    setCustomQuestions(updated);
  };

  const goToQuestion = (index: number) => {
    if (index >= 0 && index < customQuestions.length) {
      setCurrentQuestionIndex(index);
    }
  };

  const addNewQuestion = () => {
    if (customQuestions.length < gridSize * gridSize) {
      setCustomQuestions([
        ...customQuestions,
        {
          id: generateQuestionId(),
          questionText: "",
          options: [
            { text: "", isCorrect: true },
            { text: "", isCorrect: false },
            { text: "", isCorrect: false },
            { text: "", isCorrect: false },
          ],
        },
      ]);
      setCurrentQuestionIndex(customQuestions.length);
    }
  };

  const currentQuestion = customQuestions[currentQuestionIndex];
  const canCreate = Boolean(previewSrc) && !isReading && !isUploading;

  // Success state - show confirmation
  if (uploadSuccess) {
    return (
      <div className="pz-screen">
        <TopBar showBack onBack={onBack} subtitle="Puzzle Created!" />
        <main className="pz-main">
          <div className="pz-card">
            <div className="pz-success-message">
              <div className="pz-success-icon">🎉</div>
              <h2 className="pz-heading">Puzzle Created Successfully!</h2>
              <p className="pz-body">
                Your puzzle has been stored and is ready to play.
                {questionType === "custom" && (
                  <span> You created {customQuestions.length} custom questions.</span>
                )}
              </p>
              <div className="pz-success-details">
                <div className="pz-success-detail">
                  <span>📐 Grid Size:</span>
                  <span>{gridSize}×{gridSize}</span>
                </div>
                <div className="pz-success-detail">
                  <span>❓ Questions:</span>
                  <span>{questionType === "custom" ? customQuestions.length : "Default"}</span>
                </div>
              </div>
            </div>
            <div className="pz-actions">
              <button
                type="button"
                className="pz-button pz-button--secondary"
                onClick={onBack}
              >
                Back to Home
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (showQuestionEditor && questionType === "custom" && currentQuestion) {
    return (
      <div className="pz-screen">
        <TopBar
          showBack
          onBack={() => {
            if (currentQuestionIndex === 0) {
              setShowQuestionEditor(false);
              setQuestionType("default");
            } else {
              goToQuestion(currentQuestionIndex - 1);
            }
          }}
          subtitle={`Question ${currentQuestionIndex + 1} of ${gridSize * gridSize}`}
        />
        <main className="pz-main">
          <div className="pz-card">
            <div className="pz-question-editor">
              <div className="pz-question-progress">
                {customQuestions.map((_, idx) => (
                  <div
                    key={idx}
                    className={`pz-progress-dot ${
                      idx === currentQuestionIndex
                        ? "pz-progress-dot--active"
                        : "pz-progress-dot--done"
                    }`}
                    onClick={() => goToQuestion(idx)}
                  />
                ))}
                {customQuestions.length < gridSize * gridSize && (
                  <div
                    className="pz-progress-dot pz-progress-dot--empty"
                    onClick={addNewQuestion}
                  >
                    +
                  </div>
                )}
              </div>

              <label className="pz-input-label">
                Question
                <input
                  type="text"
                  className="pz-input"
                  placeholder="Enter your question..."
                  value={currentQuestion.questionText}
                  onChange={(e) =>
                    updateQuestion({
                      ...currentQuestion,
                      questionText: e.target.value,
                    })
                  }
                />
              </label>

              <div className="pz-options-section">
                <p className="pz-options-label">Options (select ✓ for correct answer)</p>
                {currentQuestion.options.map((option, idx) => (
                  <div key={idx} className="pz-option-row">
                    <button
                      className={`pz-correct-btn ${
                        option.isCorrect ? "pz-correct-btn--active" : ""
                      }`}
                      onClick={() => {
                        const updated = currentQuestion.options.map((o, i) => ({
                          ...o,
                          isCorrect: i === idx,
                        }));
                        updateQuestion({ ...currentQuestion, options: updated });
                      }}
                    >
                      {option.isCorrect ? "✓" : ""}
                    </button>
                    <input
                      type="text"
                      className="pz-input pz-option-input"
                      placeholder={`Option ${idx + 1}`}
                      value={option.text}
                      onChange={(e) => {
                        const updated = [...currentQuestion.options];
                        updated[idx] = { ...option, text: e.target.value };
                        updateQuestion({ ...currentQuestion, options: updated });
                      }}
                    />
                  </div>
                ))}
              </div>

              <div className="pz-question-nav">
                {currentQuestionIndex > 0 && (
                  <button
                    className="pz-button pz-button--secondary"
                    onClick={() => goToQuestion(currentQuestionIndex - 1)}
                  >
                    Previous
                  </button>
                )}
                <div className="pz-spacer" />
                {currentQuestionIndex < gridSize * gridSize - 1 ? (
                  <button
                    className="pz-button pz-button--primary"
                    onClick={addNewQuestion}
                  >
                    Add Next Question
                  </button>
                ) : (
                  <button
                    className="pz-button pz-button--primary"
                    onClick={handleCreatePuzzle}
                    disabled={!canCreate}
                  >
                    Create Puzzle ({customQuestions.length}/{gridSize * gridSize})
                  </button>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="pz-screen">
      <TopBar showBack onBack={onBack} subtitle="Turn your image into a puzzle" />
      <main className="pz-main">
        <div className="pz-card">
          <h2 className="pz-heading">Upload image</h2>
          <p className="pz-body">
            Choose a PNG or JPG under 2MB.
          </p>

          <label className="pz-file-input">
            <span className="pz-button pz-button--secondary pz-file-input-button">
              Select image
            </span>
            <input
              type="file"
              accept="image/png,image/jpeg"
              onChange={handleFileChange}
            />
          </label>

          {previewSrc && (
            <div className="pz-preview">
              <div
                className="pz-preview-image"
                style={{ backgroundImage: `url(${previewSrc})` }}
              />
            </div>
          )}

          {previewSrc && (
            <>
              <div className="pz-divider" />

              <h3 className="pz-section-title">Grid Size</h3>
              <div className="pz-matrix-options">
                {GRID_OPTIONS.map((size) => (
                  <button
                    key={size}
                    className={`pz-button pz-button--matrix ${
                      gridSize === size ? "pz-button--matrix-active" : ""
                    }`}
                    onClick={() => handleGridSizeChange(size)}
                  >
                    {size}×{size}
                  </button>
                ))}
              </div>

              <div className="pz-divider" />

              <h3 className="pz-section-title">Questions</h3>
              <p className="pz-body" style={{ fontSize: "12px", marginBottom: "12px" }}>
                How should players answer questions?
              </p>

              <div className="pz-question-type-options">
                <button
                  className={`pz-button pz-button--option ${
                    questionType === "default" ? "pz-button--option-active" : ""
                  }`}
                  onClick={() => handleQuestionTypeChange("default")}
                >
                  <span className="pz-option-icon">🎯</span>
                  <span>Default Questions</span>
                  <span className="pz-option-desc">Auto-generated tile questions</span>
                </button>
                <button
                  className={`pz-button pz-button--option ${
                    questionType === "custom" ? "pz-button--option-active" : ""
                  }`}
                  onClick={() => handleQuestionTypeChange("custom")}
                >
                  <span className="pz-option-icon">✏️</span>
                  <span>Custom Questions</span>
                  <span className="pz-option-desc">Create your own Q&A</span>
                </button>
              </div>
            </>
          )}

          {validation && (
            <div
              className={
                validation.level === "error"
                  ? "pz-message pz-message--error"
                  : validation.level === "success"
                  ? "pz-message pz-message--success"
                  : "pz-message pz-message--info"
              }
            >
              {validation.message}
            </div>
          )}

          <div className="pz-actions pz-actions--align-right">
            <button
              type="button"
              className="pz-button pz-button--primary"
              disabled={!canCreate}
              onClick={handleCreatePuzzle}
            >
              {questionType === "custom"
                ? `Create with ${customQuestions.length || 0} Custom Questions`
                : "Create Puzzle"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};
