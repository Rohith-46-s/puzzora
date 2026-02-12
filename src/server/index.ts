import express from 'express';
import { 
  InitResponse, 
  IncrementResponse, 
  DecrementResponse, 
  LeaderboardResponse, 
  SubmitScoreRequest, 
  SubmitScoreResponse,
  UploadPuzzleRequest,
  UploadPuzzleResponse,
  GetPuzzleRequest,
  GetPuzzleResponse,
  MarkPuzzlePlayedRequest,
  MarkPuzzlePlayedResponse,
  GetUserPlayedPuzzlesResponse,
  GetNextPuzzleResponse,
  SolvePuzzleRequest,
  SolvePuzzleResponse,
  GetPuzzlesByUserResponse,
  GetPuzzleSolversResponse,
  PuzzleMetadata,
  PuzzleWithQuestions,
  PuzzleQuestion,
  GridSize
} from '../shared/types/api';
import { 
  getNextPuzzleForUser,
  markPuzzleSolved,
  getUserCreatedPuzzles,
  getPuzzleSolvers,
  getPuzzleSolveCount,
  getCreatorStats
} from './puzzle';
import { redis, reddit, createServer, context, getServerPort } from '@devvit/web/server';
import { createPost } from './core/post';

// ============================================
// PUZZLE STORAGE FUNCTIONS (Inlined for reliability)
// ============================================

const PUZZLE_KEY = (puzzleId: string) => `puzzora:puzzle:${puzzleId}`;
const PUZZLE_QUESTIONS_KEY = (puzzleId: string) => `puzzora:puzzle:questions:${puzzleId}`;
const USER_CREATED_PUZZLES_KEY = (userId: string) => `puzzora:user:${userId}:created`;
const USER_PLAYED_PUZZLES_KEY = (userId: string) => `puzzora:user:${userId}:played`;
const DAILY_PUZZLE_KEY = 'puzzora:daily:puzzle';
const ALL_PUZZLES_KEY = 'puzzora:all:puzzles';
const PUZZLE_COUNTER_KEY = 'puzzora:puzzle:counter';

function generatePuzzleId(counter: number): string {
  const timestamp = Date.now().toString(36);
  return `puz_${timestamp}_${counter}`;
}

function safeGetString(record: Record<string, string>, key: string, defaultValue: string): string {
  const value = record[key];
  return value !== undefined ? value : defaultValue;
}

async function getPuzzleMetadata(puzzleId: string): Promise<PuzzleMetadata | null> {
  try {
    const metadata = await redis.hGetAll(PUZZLE_KEY(puzzleId));
    if (!metadata || Object.keys(metadata).length === 0) {
      return null;
    }
    return {
      puzzleId: safeGetString(metadata, 'puzzleId', puzzleId),
      creatorUserId: safeGetString(metadata, 'creatorUserId', 'unknown'),
      creatorUsername: safeGetString(metadata, 'creatorUsername', 'unknown'),
      imageUri: safeGetString(metadata, 'imageUri', ''),
      gridSize: parseInt(safeGetString(metadata, 'gridSize', '3')) as GridSize,
      createdAt: parseInt(safeGetString(metadata, 'createdAt', String(Date.now()))),
      totalQuestions: parseInt(safeGetString(metadata, 'totalQuestions', '0')),
    };
  } catch (error) {
    console.error('Error getting puzzle metadata:', error);
    return null;
  }
}

async function getPuzzleWithQuestions(puzzleId: string): Promise<PuzzleWithQuestions | null> {
  try {
    const metadata = await redis.hGetAll(PUZZLE_KEY(puzzleId));
    if (!metadata || Object.keys(metadata).length === 0) {
      return null;
    }
    const questionsJson = await redis.get(PUZZLE_QUESTIONS_KEY(puzzleId));
    const questions: PuzzleQuestion[] = questionsJson ? JSON.parse(questionsJson) : [];
    return {
      puzzleId: safeGetString(metadata, 'puzzleId', puzzleId),
      creatorUserId: safeGetString(metadata, 'creatorUserId', 'unknown'),
      creatorUsername: safeGetString(metadata, 'creatorUsername', 'unknown'),
      imageUri: safeGetString(metadata, 'imageUri', ''),
      gridSize: parseInt(safeGetString(metadata, 'gridSize', '3')) as GridSize,
      createdAt: parseInt(safeGetString(metadata, 'createdAt', String(Date.now()))),
      totalQuestions: parseInt(safeGetString(metadata, 'totalQuestions', String(questions.length))),
      questions,
    };
  } catch (error) {
    console.error('Error getting puzzle:', error);
    return null;
  }
}

async function createPuzzle(params: { imageUri: string; gridSize: GridSize; questions: PuzzleQuestion[] }): Promise<{ success: boolean; puzzleId?: string; reason?: string }> {
  try {
    const username = await reddit.getCurrentUsername();
    if (!username) {
      return { success: false, reason: 'User not authenticated' };
    }
    
    // Basic validation
    if (!params.questions || params.questions.length === 0) {
      return { success: false, reason: 'Puzzle must have at least one question' };
    }
    
    const counter = await redis.incrBy(PUZZLE_COUNTER_KEY, 1);
    const puzzleId = generatePuzzleId(counter);
    const now = Date.now();
    
    await redis.hSet(PUZZLE_KEY(puzzleId), {
      puzzleId,
      creatorUserId: username,
      creatorUsername: username,
      imageUri: params.imageUri,
      gridSize: String(params.gridSize),
      createdAt: String(now),
      totalQuestions: String(params.questions.length),
    });
    
    await redis.set(PUZZLE_QUESTIONS_KEY(puzzleId), JSON.stringify(params.questions));
    
    const createdPuzzles = await redis.get(USER_CREATED_PUZZLES_KEY(username)) || '';
    const updatedCreated = createdPuzzles ? `${createdPuzzles},${puzzleId}` : puzzleId;
    await redis.set(USER_CREATED_PUZZLES_KEY(username), updatedCreated);
    
    const allPuzzles = await redis.get(ALL_PUZZLES_KEY) || '';
    const updatedAll = allPuzzles ? `${allPuzzles},${puzzleId}` : puzzleId;
    await redis.set(ALL_PUZZLES_KEY, updatedAll);
    
    return { success: true, puzzleId };
  } catch (error) {
    console.error('Error creating puzzle:', error);
    return { success: false, reason: 'Failed to create puzzle' };
  }
}

async function selectPuzzleForUser(excludePuzzleIds?: string[]): Promise<{ puzzle: PuzzleWithQuestions | null; isDailyPuzzle: boolean; reason?: string }> {
  try {
    const username = await reddit.getCurrentUsername();
    if (!username) {
      return { puzzle: null, isDailyPuzzle: false, reason: 'User not authenticated' };
    }
    
    const createdPuzzles = await redis.get(USER_CREATED_PUZZLES_KEY(username)) || '';
    const userCreatedPuzzles = createdPuzzles.split(',').filter(Boolean);
    const excludeCreator = new Set(userCreatedPuzzles);
    
    const playedPuzzles = await redis.get(USER_PLAYED_PUZZLES_KEY(username)) || '';
    const userPlayedPuzzles = playedPuzzles.split(',').filter(Boolean);
    const excludePlayed = new Set([...(excludePuzzleIds || []), ...userPlayedPuzzles]);
    
    const allPuzzles = await redis.get(ALL_PUZZLES_KEY) || '';
    const allPuzzleIds = allPuzzles.split(',').filter(Boolean);
    
    const availablePuzzles = allPuzzleIds.filter(id => 
      id && !excludeCreator.has(id) && !excludePlayed.has(id)
    );
    
    if (availablePuzzles.length > 0) {
      const selectedId = availablePuzzles[0];
      if (selectedId) {
        const puzzle = await getPuzzleWithQuestions(selectedId);
        if (puzzle) {
          return { puzzle, isDailyPuzzle: false };
        }
      }
    }
    
    const dailyPuzzleId = await redis.get(DAILY_PUZZLE_KEY);
    if (dailyPuzzleId && !excludePlayed.has(dailyPuzzleId)) {
      const puzzle = await getPuzzleWithQuestions(dailyPuzzleId);
      if (puzzle) {
        return { puzzle, isDailyPuzzle: true };
      }
    }
    
    return { puzzle: null, isDailyPuzzle: false, reason: 'No puzzles available' };
  } catch (error) {
    console.error('Error selecting puzzle:', error);
    return { puzzle: null, isDailyPuzzle: false, reason: 'Failed to select puzzle' };
  }
}

async function markPuzzlePlayed(params: { puzzleId: string; completed: boolean; heartsRemaining: number; timeSeconds: number }): Promise<{ success: boolean; reason?: string }> {
  try {
    const username = await reddit.getCurrentUsername();
    if (!username) {
      return { success: false, reason: 'User not authenticated' };
    }
    
    const puzzle = await getPuzzleMetadata(params.puzzleId);
    if (!puzzle) {
      return { success: false, reason: 'Puzzle not found' };
    }
    
    const playedPuzzles = await redis.get(USER_PLAYED_PUZZLES_KEY(username)) || '';
    const updatedPlayed = playedPuzzles ? `${playedPuzzles},${params.puzzleId}` : params.puzzleId;
    await redis.set(USER_PLAYED_PUZZLES_KEY(username), updatedPlayed);
    
    const playResultKey = `puzzora:play:${username}:${params.puzzleId}`;
    await redis.hSet(playResultKey, {
      completed: String(params.completed),
      heartsRemaining: String(params.heartsRemaining),
      timeSeconds: String(params.timeSeconds),
      playedAt: String(Date.now()),
    });
    
    await redis.expire(playResultKey, 31536000);
    return { success: true };
  } catch (error) {
    console.error('Error marking puzzle as played:', error);
    return { success: false, reason: 'Failed to record play' };
  }
}

async function getUserPlayedPuzzles(): Promise<string[]> {
  try {
    const username = await reddit.getCurrentUsername();
    if (!username) {
      return [];
    }
    const playedPuzzles = await redis.get(USER_PLAYED_PUZZLES_KEY(username)) || '';
    return playedPuzzles.split(',').filter(Boolean);
  } catch (error) {
    console.error('Error getting user played puzzles:', error);
    return [];
  }
}

async function getDailyPuzzle(): Promise<PuzzleWithQuestions | null> {
  try {
    const dailyPuzzleId = await redis.get(DAILY_PUZZLE_KEY);
    if (!dailyPuzzleId) {
      return null;
    }
    return await getPuzzleWithQuestions(dailyPuzzleId);
  } catch (error) {
    console.error('Error getting daily puzzle:', error);
    return null;
  }
}

// ============================================
// LEADERBOARD FUNCTIONS (Inlined)
// ============================================

const LEADERBOARD_DAILY_KEY = (date: string) => `leaderboard:daily:${date}`;
const LEADERBOARD_GLOBAL_KEY = 'leaderboard:global';
const USER_STATS_KEY = (username: string) => `user:stats:${username}`;

async function submitLeaderboardScore(username: string, puzzleId: string, heartsRemaining: number, gridSize: number, timeSeconds: number, streakDays: number = 0): Promise<{ success: boolean; score: number; reason?: string }> {
  if (heartsRemaining < 0) {
    return { success: false, score: 0, reason: 'Puzzle not completed' };
  }
  if (timeSeconds < 5) {
    return { success: false, score: 0, reason: 'Suspicious time (too fast)' };
  }
  
  const totalScore = 100 + heartsRemaining * 15 + (gridSize === 3 ? 0 : gridSize === 4 ? 40 : 80) + (timeSeconds <= 30 ? 80 : timeSeconds <= 60 ? 50 : timeSeconds <= 120 ? 25 : 0) + Math.min(streakDays * 10, 50);
  
  const todayStr = new Date().toISOString().split('T')[0];
  const today = todayStr || '';
  const dailyKey = LEADERBOARD_DAILY_KEY(today);
  
  const existingScore = await redis.get(`user:puzzle:${username}:${puzzleId}:${today}`);
  if (existingScore && Number(existingScore) >= totalScore) {
    return { success: false, score: totalScore, reason: 'Lower score ignored' };
  }
  
  await redis.set(`user:puzzle:${username}:${puzzleId}:${today}`, totalScore.toString());
  
  const currentDailyData = await redis.hGetAll(dailyKey);
  currentDailyData[username] = String((Number(currentDailyData[username]) || 0) + totalScore);
  await redis.hSet(dailyKey, currentDailyData);
  
  const currentGlobalData = await redis.hGetAll(LEADERBOARD_GLOBAL_KEY);
  currentGlobalData[username] = String((Number(currentGlobalData[username]) || 0) + totalScore);
  await redis.hSet(LEADERBOARD_GLOBAL_KEY, currentGlobalData);
  
  const statsKey = USER_STATS_KEY(username);
  const stats = await redis.hGetAll(statsKey);
  await redis.hSet(statsKey, {
    solvedCount: String((Number(stats.solvedCount) || 0) + 1),
    bestTime: stats.bestTime && Number(stats.bestTime) < timeSeconds ? stats.bestTime : String(timeSeconds),
    lastSolvedAt: String(Math.floor(Date.now() / 1000)),
  });
  
  return { success: true, score: totalScore };
}

async function getDailyLeaderboard(): Promise<Array<{ rank: number; username: string; score: number; heartsRemaining?: number; gridSize?: number; timeSeconds?: number }>> {
  const todayStr = new Date().toISOString().split('T')[0];
  const today = todayStr || '';
  const dailyKey = LEADERBOARD_DAILY_KEY(today);
  const scores = await redis.hGetAll(dailyKey);
  if (!scores || Object.keys(scores).length === 0) {
    return [];
  }
  return Object.entries(scores)
    .map(([username, score]) => ({ username, score: Number(score) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map((entry, index) => ({ rank: index + 1, ...entry }));
}

async function getGlobalLeaderboard(limit: number = 10): Promise<Array<{ rank: number; username: string; score: number }>> {
  const scores = await redis.hGetAll(LEADERBOARD_GLOBAL_KEY);
  if (!scores || Object.keys(scores).length === 0) {
    return [];
  }
  return Object.entries(scores)
    .map(([username, score]) => ({ username, score: Number(score) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry, index) => ({ rank: index + 1, ...entry }));
}

async function getUserStats(username: string): Promise<{ solvedCount: number; bestTime: number | null; lastSolvedAt: number | null } | null> {
  const stats = await redis.hGetAll(USER_STATS_KEY(username));
  if (!stats || Object.keys(stats).length === 0) {
    return null;
  }
  return {
    solvedCount: Number(stats.solvedCount) || 0,
    bestTime: stats.bestTime ? Number(stats.bestTime) : null,
    lastSolvedAt: stats.lastSolvedAt ? Number(stats.lastSolvedAt) : null,
  };
}

// ============================================
// SERVER SETUP
// ============================================

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.text());

const router = express.Router();

// Init API
router.get<{ postId: string }, InitResponse | { status: string; message: string }>(
  '/api/init',
  async (_req, res): Promise<void> => {
    const { postId } = context;
    if (!postId) {
      res.status(400).json({ status: 'error', message: 'postId required' });
      return;
    }
    try {
      const [count, username] = await Promise.all([
        redis.get('count'),
        reddit.getCurrentUsername(),
      ]);
      res.json({
        type: 'init',
        postId,
        count: count ? parseInt(count) : 0,
        username: username ?? 'anonymous',
      });
    } catch (error) {
      res.status(400).json({ status: 'error', message: 'Init failed' });
    }
  }
);

// Submit score
router.post<null, SubmitScoreResponse, SubmitScoreRequest>(
  '/api/submit-score',
  async (req, res): Promise<void> => {
    const { puzzleId, heartsRemaining, gridSize, timeSeconds } = req.body;
    if (!puzzleId || heartsRemaining === undefined || !gridSize || !timeSeconds) {
      res.json({ type: 'submitScoreResponse', success: false, score: 0, reason: 'Missing fields' });
      return;
    }
    try {
      const username = await reddit.getCurrentUsername();
      if (!username) {
        res.json({ type: 'submitScoreResponse', success: false, score: 0, reason: 'Not authenticated' });
        return;
      }
      const result = await submitLeaderboardScore(username, puzzleId, heartsRemaining, gridSize, timeSeconds);
      res.json({ type: 'submitScoreResponse', ...result });
    } catch (error) {
      res.json({ type: 'submitScoreResponse', success: false, score: 0, reason: 'Failed' });
    }
  }
);

// Get daily leaderboard
router.get<null, LeaderboardResponse>(
  '/api/leaderboard/daily',
  async (_req, res): Promise<void> => {
    try {
      const entries = await getDailyLeaderboard();
      res.json({ type: 'leaderboard', entries, leaderboardType: 'daily' });
    } catch (error) {
      res.json({ type: 'leaderboard', entries: [], leaderboardType: 'daily' });
    }
  }
);

// Get global leaderboard
router.get<null, LeaderboardResponse>(
  '/api/leaderboard/global',
  async (req, res): Promise<void> => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const entries = await getGlobalLeaderboard(limit);
      res.json({ type: 'leaderboard', entries, leaderboardType: 'global' });
    } catch (error) {
      res.json({ type: 'leaderboard', entries: [], leaderboardType: 'global' });
    }
  }
);

// Get user stats
router.get<null, { solvedCount: number; bestTime: number | null; lastSolvedAt: number | null }>(
  '/api/user/stats',
  async (_req, res): Promise<void> => {
    try {
      const username = await reddit.getCurrentUsername();
      if (!username) {
        res.json({ solvedCount: 0, bestTime: null, lastSolvedAt: null });
        return;
      }
      const stats = await getUserStats(username);
      res.json(stats || { solvedCount: 0, bestTime: null, lastSolvedAt: null });
    } catch (error) {
      res.json({ solvedCount: 0, bestTime: null, lastSolvedAt: null });
    }
  }
);

// ============================================
// PUZZLE API ENDPOINTS
// ============================================

// Upload puzzle
router.post<null, UploadPuzzleResponse, UploadPuzzleRequest>(
  '/api/puzzle/upload',
  async (req, res): Promise<void> => {
    const { imageUri, gridSize, questions } = req.body;
    if (!imageUri || !gridSize || !questions) {
      res.json({ type: 'uploadPuzzleResponse', success: false, reason: 'Missing fields' });
      return;
    }
    try {
      const result = await createPuzzle({ imageUri, gridSize, questions });
      res.json({ type: 'uploadPuzzleResponse', ...result });
    } catch (error) {
      res.json({ type: 'uploadPuzzleResponse', success: false, reason: 'Failed' });
    }
  }
);

// Get puzzle to play
router.post<null, GetPuzzleResponse, GetPuzzleRequest>(
  '/api/puzzle/get',
  async (req, res): Promise<void> => {
    const { excludePuzzleIds } = req.body || {};
    try {
      const result = await selectPuzzleForUser(excludePuzzleIds);
      if (result.puzzle) {
        res.json({ type: 'getPuzzleResponse', success: true, puzzle: result.puzzle, isDailyPuzzle: result.isDailyPuzzle });
      } else {
        res.json({ type: 'getPuzzleResponse', success: false, reason: result.reason || 'No puzzle' });
      }
    } catch (error) {
      res.json({ type: 'getPuzzleResponse', success: false, reason: 'Failed' });
    }
  }
);

// Mark puzzle as played
router.post<null, MarkPuzzlePlayedResponse, MarkPuzzlePlayedRequest>(
  '/api/puzzle/mark-played',
  async (req, res): Promise<void> => {
    const { puzzleId, completed, heartsRemaining, timeSeconds } = req.body;
    if (!puzzleId || completed === undefined || heartsRemaining === undefined || !timeSeconds) {
      res.json({ type: 'markPuzzlePlayedResponse', success: false, reason: 'Missing fields' });
      return;
    }
    try {
      const result = await markPuzzlePlayed({ puzzleId, completed, heartsRemaining, timeSeconds });
      res.json({ type: 'markPuzzlePlayedResponse', ...result });
    } catch (error) {
      res.json({ type: 'markPuzzlePlayedResponse', success: false, reason: 'Failed' });
    }
  }
);

// Get played puzzles
router.get<null, GetUserPlayedPuzzlesResponse>(
  '/api/puzzle/played',
  async (_req, res): Promise<void> => {
    try {
      const puzzleIds = await getUserPlayedPuzzles();
      res.json({ type: 'getUserPlayedPuzzles', puzzleIds });
    } catch (error) {
      res.json({ type: 'getUserPlayedPuzzles', puzzleIds: [] });
    }
  }
);

// Get daily puzzle
router.get<null, GetPuzzleResponse>(
  '/api/puzzle/daily',
  async (_req, res): Promise<void> => {
    try {
      const puzzle = await getDailyPuzzle();
      if (puzzle) {
        res.json({ type: 'getPuzzleResponse', success: true, puzzle, isDailyPuzzle: true });
      } else {
        res.json({ type: 'getPuzzleResponse', success: false, reason: 'No daily puzzle' });
      }
    } catch (error) {
      res.json({ type: 'getPuzzleResponse', success: false, reason: 'Failed' });
    }
  }
);

// ============================================
// NEW PUZZLE SELECTION & ATTRIBUTION ENDPOINTS
// ============================================

// Get next puzzle for user (non-repeat selection)
router.post<null, GetNextPuzzleResponse>(
  '/api/puzzle/get-next',
  async (_req, res): Promise<void> => {
    try {
      const username = await reddit.getCurrentUsername();
      if (!username) {
        res.json({ type: 'getNextPuzzleResponse', success: false, status: 'error', reason: 'User not authenticated' });
        return;
      }
      
      const result = await getNextPuzzleForUser({ userId: username });
      
      if (result.status === 'success' && result.puzzle) {
        res.json({ type: 'getNextPuzzleResponse', success: true, status: 'success', puzzle: result.puzzle });
      } else {
        const response: GetNextPuzzleResponse = { type: 'getNextPuzzleResponse', success: false, status: result.status };
        if (result.reason) {
          response.reason = result.reason;
        }
        res.json(response);
      }
    } catch (error) {
      console.error('Error in get-next endpoint:', error);
      res.json({ type: 'getNextPuzzleResponse', success: false, status: 'error', reason: 'Failed to get next puzzle' });
    }
  }
);

// Solve puzzle and update attribution
router.post<null, SolvePuzzleResponse, SolvePuzzleRequest>(
  '/api/puzzle/solve',
  async (req, res): Promise<void> => {
    const { puzzleId, timeTaken, score } = req.body;
    if (!puzzleId || timeTaken === undefined || score === undefined) {
      res.json({ type: 'solvePuzzleResponse', success: false, reason: 'Missing fields' });
      return;
    }
    
    try {
      const username = await reddit.getCurrentUsername();
      if (!username) {
        res.json({ type: 'solvePuzzleResponse', success: false, reason: 'User not authenticated' });
        return;
      }
      
      const result = await markPuzzleSolved({
        userId: username,
        puzzleId,
        timeTaken,
        score
      });
      
      if (result.status === 'success') {
        const response: SolvePuzzleResponse = { type: 'solvePuzzleResponse', success: true };
        if (result.creatorUsername) {
          response.creatorUsername = result.creatorUsername;
        }
        if (result.creatorNotified !== undefined) {
          response.creatorNotified = result.creatorNotified;
        }
        res.json(response);
      } else {
        const errorResponse: SolvePuzzleResponse = { type: 'solvePuzzleResponse', success: false };
        if (result.reason) {
          errorResponse.reason = result.reason;
        }
        res.json(errorResponse);
      }
    } catch (error) {
      console.error('Error in solve endpoint:', error);
      res.json({ type: 'solvePuzzleResponse', success: false, reason: 'Failed to record puzzle solve' });
    }
  }
);

// Get puzzles created by a user
router.get<{ userId: string }, GetPuzzlesByUserResponse>(
  '/api/puzzle/created-by/:userId',
  async (req, res): Promise<void> => {
    const { userId } = req.params;
    try {
      const puzzles = await getUserCreatedPuzzles(userId);
      const stats = await getCreatorStats(userId);
      res.json({
        type: 'getPuzzlesByUserResponse',
        success: true,
        puzzles,
        totalPuzzles: puzzles.length,
        totalSolves: stats?.totalSolves ?? 0,
        creatorUsername: userId
      });
    } catch (error) {
      console.error('Error in created-by endpoint:', error);
      res.json({
        type: 'getPuzzlesByUserResponse',
        success: false,
        puzzles: [],
        totalPuzzles: 0,
        totalSolves: 0,
        creatorUsername: userId,
        reason: 'Failed to get user puzzles'
      });
    }
  }
);

// Get solvers of a puzzle
router.get<{ puzzleId: string }, GetPuzzleSolversResponse>(
  '/api/puzzle/solved-by/:puzzleId',
  async (req, res): Promise<void> => {
    const { puzzleId } = req.params;
    try {
      const solvers = await getPuzzleSolvers(puzzleId);
      const solveCount = await getPuzzleSolveCount(puzzleId);
      
      // Get creator username from puzzle metadata
      const puzzle = await getPuzzleMetadata(puzzleId);
      
      res.json({
        type: 'getPuzzleSolversResponse',
        success: true,
        puzzleId,
        creatorUsername: puzzle?.creatorUsername ?? 'unknown',
        solvers,
        solveCount
      });
    } catch (error) {
      console.error('Error in solved-by endpoint:', error);
      res.json({
        type: 'getPuzzleSolversResponse',
        success: false,
        puzzleId,
        creatorUsername: 'unknown',
        solvers: [],
        solveCount: 0,
        reason: 'Failed to get puzzle solvers'
      });
    }
  }
);

// ============================================
// IMAGE ROTATION ENDPOINTS
// ============================================

/**
 * Redis key for storing current image index.
 * Stored at post-level for persistence.
 */
const IMAGE_INDEX_KEY = 'puzzora:image:index';

/**
 * Total number of default puzzle images.
 * In production, this would be dynamic based on files in /assets/puzzle-images/
 */
const TOTAL_DEFAULT_IMAGES = 20;

/**
 * Get current image index from Redis.
 * GET /my/api/puzzle/image-index
 */
router.get('/api/puzzle/image-index', async (_req, res): Promise<void> => {
  try {
    const indexStr = await redis.get(IMAGE_INDEX_KEY);
    const index = indexStr ? parseInt(indexStr, 10) : 0;
    
    res.json({ 
      success: true, 
      index: isNaN(index) ? 0 : index 
    });
  } catch (error) {
    console.error('Error getting image index:', error);
    res.json({ success: false, index: 0 });
  }
});

/**
 * Initialize image index if not set.
 * POST /my/api/puzzle/init-image
 */
router.post('/api/puzzle/init-image', async (req, res): Promise<void> => {
  try {
    const { seed } = req.body as { seed?: string };
    
    // Check if already initialized
    const existingIndex = await redis.get(IMAGE_INDEX_KEY);
    if (existingIndex) {
      res.json({ success: true, index: parseInt(existingIndex, 10) });
      return;
    }
    
    // Generate deterministic index from seed
    let index = 0;
    if (seed) {
      let hash = 0;
      for (let i = 0; i < seed.length; i++) {
        const char = seed.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      index = Math.abs(hash) % TOTAL_DEFAULT_IMAGES;
    }
    
    // Store for persistence
    await redis.set(IMAGE_INDEX_KEY, String(index));
    
    res.json({ success: true, index });
  } catch (error) {
    console.error('Error initializing image index:', error);
    res.json({ success: false, index: 0 });
  }
});

/**
 * Rotate to next image and return new index.
 * POST /my/api/puzzle/rotate-image
 */
router.post('/api/puzzle/rotate-image', async (req, res): Promise<void> => {
  try {
    const { currentIndex } = req.body as { currentIndex?: number };
    
    // Get current index or default
    let index = 0;
    if (typeof currentIndex === 'number') {
      index = currentIndex;
    } else {
      const storedIndex = await redis.get(IMAGE_INDEX_KEY);
      if (storedIndex) {
        index = parseInt(storedIndex, 10);
      }
    }
    
    // Calculate next index (non-repeating rotation)
    const nextIndex = (index + 1) % TOTAL_DEFAULT_IMAGES;
    
    // Store new index
    await redis.set(IMAGE_INDEX_KEY, String(nextIndex));
    
    // Generate image URL for client
    // Using puzzle images from /assets/puzzle-images/
    const imageUrls = [
      '/assets/puzzle-images/puzzle-1.png',
      '/assets/puzzle-images/puzzle-2.png',
      '/assets/puzzle-images/puzzle-3.png',
      '/assets/puzzle-images/puzzle-4.png',
      '/assets/puzzle-images/puzzle-5.png',
      '/assets/puzzle-images/puzzle-6.png',
      '/assets/puzzle-images/puzzle-7.png',
      '/assets/puzzle-images/puzzle-8.png',
      '/assets/puzzle-images/puzzle-9.png',
      '/assets/puzzle-images/puzzle-10.png',
      '/assets/puzzle-images/puzzle-11.png',
      '/assets/puzzle-images/puzzle-12.png',
      '/assets/puzzle-images/puzzle-13.png',
      '/assets/puzzle-images/puzzle-14.png',
      '/assets/puzzle-images/puzzle-15.png',
      '/assets/puzzle-images/puzzle-16.png',
      '/assets/puzzle-images/puzzle-17.png',
      '/assets/puzzle-images/puzzle-18.png',
      '/assets/puzzle-images/puzzle-19.png',
      '/assets/puzzle-images/puzzle-20.png',
    ];
    const imageUrl = imageUrls[nextIndex] || imageUrls[0];
    
    res.json({ 
      success: true, 
      newIndex: nextIndex,
      imageUrl 
    });
  } catch (error) {
    console.error('Error rotating image:', error);
    res.json({ success: false, newIndex: 0, imageUrl: '/assets/puzzle-images/puzzle-1.png' });
  }
});

// Internal endpoints
router.post('/internal/on-app-install', async (_req, res): Promise<void> => {
  try {
    const post = await createPost();
    res.json({ status: 'success', message: `Post created in ${context.subredditName}` });
  } catch (error) {
    res.status(400).json({ status: 'error', message: 'Failed' });
  }
});

router.post('/internal/menu/post-create', async (_req, res): Promise<void> => {
  try {
    const post = await createPost();
    res.json({ navigateTo: `https://reddit.com/r/${context.subredditName}/comments/${post.id}` });
  } catch (error) {
    res.status(400).json({ status: 'error', message: 'Failed' });
  }
});

app.use(router);

const port = getServerPort();
const server = createServer(app);
server.on('error', (err) => console.error(`server error; ${err.stack}`));
server.listen(port);
