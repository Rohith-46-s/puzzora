export type InitResponse = {
  type: 'init';
  postId: string;
  count: number;
  username: string;
};

export type IncrementResponse = {
  type: 'increment';
  postId: string;
  count: number;
};

export type DecrementResponse = {
  type: 'decrement';
  postId: string;
  count: number;
};

export type LeaderboardEntry = {
  rank: number;
  username: string;
  score: number;
  heartsRemaining?: number;
  gridSize?: number;
  timeSeconds?: number;
};

export type LeaderboardResponse = {
  type: 'leaderboard';
  entries: LeaderboardEntry[];
  leaderboardType: 'daily' | 'global' | 'creator';
  date?: string;
};

export type SubmitScoreRequest = {
  type: 'submitScore';
  puzzleId: string;
  heartsRemaining: number;
  gridSize: number;
  timeSeconds: number;
};

export type SubmitScoreResponse = {
  type: 'submitScoreResponse';
  success: boolean;
  score: number;
  rank?: number;
  reason?: string;
};

// ============================================
// PUZZLE TYPES
// ============================================

export type GridSize = 3 | 4 | 5;

export type QuestionOption = {
  text: string;
  isCorrect: boolean;
};

export type PuzzleQuestion = {
  id: string;
  questionText: string;
  options: QuestionOption[];
  // Locked per puzzle instance, never reshuffled
};

export type PuzzleMetadata = {
  puzzleId: string;
  creatorUserId: string;
  creatorUsername: string;
  imageUri: string;
  gridSize: GridSize;
  createdAt: number;
  totalQuestions: number;
  // Questions stored separately for security
};

export type PuzzleWithQuestions = PuzzleMetadata & {
  questions: PuzzleQuestion[];
};

export type UploadPuzzleRequest = {
  type: 'uploadPuzzle';
  imageUri: string;
  gridSize: GridSize;
  questions: PuzzleQuestion[];
};

export type UploadPuzzleResponse = {
  type: 'uploadPuzzleResponse';
  success: boolean;
  puzzleId?: string;
  reason?: string;
};

export type GetPuzzleRequest = {
  type: 'getPuzzle';
  excludePuzzleIds?: string[]; // Already played puzzles
};

export type GetPuzzleResponse = {
  type: 'getPuzzleResponse';
  success: boolean;
  puzzle?: PuzzleWithQuestions;
  isDailyPuzzle?: boolean;
  reason?: string;
};

export type MarkPuzzlePlayedRequest = {
  type: 'markPuzzlePlayed';
  puzzleId: string;
  completed: boolean;
  heartsRemaining: number;
  timeSeconds: number;
};

export type MarkPuzzlePlayedResponse = {
  type: 'markPuzzlePlayedResponse';
  success: boolean;
  reason?: string;
};

export type GetUserPlayedPuzzlesResponse = {
  type: 'getUserPlayedPuzzles';
  puzzleIds: string[];
};

// ============================================
// PUZZLE SELECTION & SOLVING TYPES
// ============================================

// Response for GET NEXT PUZZLE endpoint
export type GetNextPuzzleResponse = {
  type: 'getNextPuzzleResponse';
  success: boolean;
  status?: 'success' | 'no_puzzles_available' | 'error';
  puzzle?: PuzzleWithQuestions;
  reason?: string;
};

// Request for SOLVE PUZZLE endpoint
export type SolvePuzzleRequest = {
  type: 'solvePuzzle';
  puzzleId: string;
  timeTaken: number;  // in seconds
  score: number;
};

// Response for SOLVE PUZZLE endpoint
export type SolvePuzzleResponse = {
  type: 'solvePuzzleResponse';
  success: boolean;
  creatorUsername?: string;
  creatorNotified?: boolean;
  reason?: string;
};

// Solver information for attribution
export type SolverInfo = {
  userId: string;
  solvedAt: number;
  timeTaken: number;
  score: number;
};

// Response for GET PUZZLES BY USER endpoint
export type GetPuzzlesByUserResponse = {
  type: 'getPuzzlesByUserResponse';
  success: boolean;
  puzzles: PuzzleMetadata[];
  totalPuzzles: number;
  totalSolves: number;
  creatorUsername: string;
  reason?: string;
};

// Response for GET PUZZLE SOLVERS endpoint
export type GetPuzzleSolversResponse = {
  type: 'getPuzzleSolversResponse';
  success: boolean;
  puzzleId?: string;
  creatorUsername?: string;
  solvers: SolverInfo[];
  solveCount?: number;
  reason?: string;
};

// ============================================
// CREATOR ATTRIBUTION TYPES
// ============================================

export type CreatorStats = {
  totalPuzzlesCreated: number;
  totalSolves: number;
};

export type PuzzleSolveMetadata = {
  solvedAt: number;
  timeTaken: number;
  score: number;
  puzzleId: string;
  creatorUserId: string;
  creatorUsername: string;
};
