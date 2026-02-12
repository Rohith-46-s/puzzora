import type { Question } from "../../../shared/questions";

export type TileQuestion = {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
};

/**
 * Map shared Question (text) to client TileQuestion (question) for components.
 */
export function questionFromShared(q: Question): TileQuestion {
  return {
    id: q.id,
    question: q.text,
    options: q.options,
    correctIndex: q.correctIndex,
  };
}

/**
 * Convert custom questions from upload screen to TileQuestion format
 */
export function questionsFromCustom(customQuestions: {
  id: string;
  questionText: string;
  options: { text: string; isCorrect: boolean }[];
}[]): TileQuestion[] {
  return customQuestions.map((q, idx) => {
    const correctIndex = q.options.findIndex((o) => o.isCorrect);
    return {
      id: q.id,
      question: q.questionText,
      options: q.options.map((o) => o.text),
      correctIndex: correctIndex >= 0 ? correctIndex : 0,
    };
  });
}
