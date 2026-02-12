import React, { useEffect } from "react";
import { TileState } from "../hooks/usePuzzle";

type QuestionModalProps = {
  tile: TileState;
  disabled: boolean;
  onAnswer: (tileIndex: number, optionIndex: number) => void;
  onClose: () => void;
};

export const QuestionModal: React.FC<QuestionModalProps> = ({
  tile,
  disabled,
  onAnswer,
  onClose,
}) => {
  const { index, question } = tile;

  // Handle Escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !disabled) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [disabled, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const handleOptionClick = (optionIndex: number) => {
    if (disabled) {
      return;
    }
    onAnswer(index, optionIndex);
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !disabled) {
      onClose();
    }
  };

  return (
    <div className="pz-modal-backdrop" onClick={handleBackdropClick}>
      <div className="pz-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="pz-modal-header">
          <h2 className="pz-modal-title">Question</h2>
          {!disabled && (
            <button
              type="button"
              className="pz-modal-close"
              onClick={onClose}
              aria-label="Close modal"
            >
              ×
            </button>
          )}
        </div>

        <div className="pz-modal-content">
          <p className="pz-modal-question">{question.question}</p>

          <div className="pz-modal-options">
            {question.options.map((option, optionIndex) => (
              <button
                key={optionIndex}
                type="button"
                className="pz-button pz-button--modal-option"
                onClick={() => handleOptionClick(optionIndex)}
                disabled={disabled}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
