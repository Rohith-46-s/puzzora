/**
 * Puzzle data for PUZZORA game
 * Demo puzzle with 9 tiles and brain-test questions
 */

export interface PuzzleTile {
  id: number;
  question: string;
  options: string[];
  correctIndex: number;
  revealed: boolean;
}

export interface Puzzle {
  id: string;
  title: string;
  tiles: PuzzleTile[];
}

const GRID_SIZE = 9;

/**
 * Demo puzzle with simple brain-test questions
 */
export const demoPuzzle: Puzzle = {
  id: 'demo-001',
  title: 'Brain Teasers',
  tiles: [
    {
      id: 1,
      question: 'What comes once in a minute, twice in a moment, but never in a thousand years?',
      options: ['The letter M', 'Lightning', 'A heartbeat', 'Time'],
      correctIndex: 0,
      revealed: false,
    },
    {
      id: 2,
      question: 'I have cities, but no houses. I have mountains, but no trees. I have water, but no fish. What am I?',
      options: ['A dream', 'A map', 'A book', 'A mirror'],
      correctIndex: 1,
      revealed: false,
    },
    {
      id: 3,
      question: 'The more of this there is, the less you see. What is it?',
      options: ['Fog', 'Darkness', 'Sleep', 'Clouds'],
      correctIndex: 1,
      revealed: false,
    },
    {
      id: 4,
      question: 'I speak without a mouth and hear without ears. I have no body, but I come alive with wind. What am I?',
      options: ['A ghost', 'An echo', 'A radio', 'A shadow'],
      correctIndex: 1,
      revealed: false,
    },
    {
      id: 5,
      question: 'What has to be broken before you can use it?',
      options: ['A code', 'A lock', 'An egg', 'A promise'],
      correctIndex: 2,
      revealed: false,
    },
    {
      id: 6,
      question: 'I\'m tall when I\'m young, and I\'m short when I\'m old. What am I?',
      options: ['A candle', 'A tree', 'A person', 'A building'],
      correctIndex: 0,
      revealed: false,
    },
    {
      id: 7,
      question: 'What is full of holes but still holds water?',
      options: ['A sponge', 'A bucket', 'A net', 'A filter'],
      correctIndex: 0,
      revealed: false,
    },
    {
      id: 8,
      question: 'What goes up but never comes down?',
      options: ['A balloon', 'Your age', 'Smoke', 'Rain'],
      correctIndex: 1,
      revealed: false,
    },
    {
      id: 9,
      question: 'What can you break, even if you never pick it up or touch it?',
      options: ['A promise', 'A glass', 'A bone', 'A heart'],
      correctIndex: 0,
      revealed: false,
    },
  ],
};

/**
 * Game constants
 */
export const MAX_HEARTS = 5;
export const GRID_COLS = 3;
