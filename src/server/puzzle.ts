import { redis, reddit } from '@devvit/web/server';
import { 
  PuzzleMetadata, 
  PuzzleWithQuestions, 
  PuzzleQuestion, 
  GridSize,
  GetNextPuzzleResponse,
  SolvePuzzleRequest,
  SolvePuzzleResponse,
  GetPuzzlesByUserResponse,
  GetPuzzleSolversResponse,
  SolverInfo
} from '../shared/types/api.js';

// ============================================
// REDIS KEY CONSTANTS
// ============================================

const PUZZLE_KEY = (puzzleId: string) => `puzzora:puzzle:${puzzleId}`;
const PUZZLE_QUESTIONS_KEY = (puzzleId: string) => `puzzora:puzzle:questions:${puzzleId}`;
const USER_CREATED_PUZZLES_KEY = (userId: string) => `puzzora:user:${userId}:created`;
const USER_PLAYED_PUZZLES_KEY = (userId: string) => `puzzora:user:${userId}:played`;
const USER_SOLVED_PUZZLES_KEY = (userId: string) => `puzzora:user:${userId}:solved`;
const PUZZLE_SOLVERS_KEY = (puzzleId: string) => `puzzora:puzzle:${puzzleId}:solvers`;
const PUZZLE_SOLVE_COUNT_KEY = (puzzleId: string) => `puzzora:puzzle:${puzzleId}:solveCount`;
const CREATOR_STATS_KEY = (userId: string) => `puzzora:creator:${userId}:stats`;
const DAILY_PUZZLE_KEY = 'puzzora:daily:puzzle';
const ALL_PUZZLES_KEY = 'puzzora:all:puzzles';
const PUZZLE_COUNTER_KEY = 'puzzora:puzzle:counter';

// ============================================
// UTILITY FUNCTIONS
// ============================================

function generatePuzzleId(counter: number): string {
  const timestamp = Date.now().toString(36);
  return `puz_${timestamp}_${counter}`;
}

function validateQuestion(question: PuzzleQuestion): { valid: boolean; reason?: string } {
  if (question.options.length < 3) {
    return { valid: false, reason: 'Question must have at least 3 options' };
  }
  
  if (question.options.length > 5) {
    return { valid: false, reason: 'Question can have at most 5 options' };
  }
  
  const correctCount = question.options.filter(o => o.isCorrect).length;
  if (correctCount !== 1) {
    return { valid: false, reason: 'Question must have exactly one correct answer' };
  }
  
  const optionTexts = question.options.map(o => o.text.toLowerCase().trim());
  const uniqueTexts = new Set(optionTexts);
  if (optionTexts.length !== uniqueTexts.size) {
    return { valid: false, reason: 'Question cannot have duplicate options' };
  }
  
  return { valid: true };
}

function validatePuzzleQuestions(questions: PuzzleQuestion[]): { valid: boolean; reason?: string } {
  if (questions.length === 0) {
    return { valid: false, reason: 'Puzzle must have at least one question' };
  }
  
  const questionIds = questions.map(q => q.id);
  const uniqueIds = new Set(questionIds);
  if (questionIds.length !== uniqueIds.size) {
    return { valid: false, reason: 'Puzzle cannot have duplicate questions' };
  }
  
  for (const question of questions) {
    const validation = validateQuestion(question);
    if (!validation.valid) {
      return validation;
    }
  }
  
  return { valid: true };
}

// Fisher-Yates shuffle for random selection
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = shuffled[i];
    shuffled[i] = shuffled[j] as T;
    shuffled[j] = temp as T;
  }
  return shuffled;
}

// ============================================
// PUZZLE CREATION
// ============================================

interface CreatePuzzleParams {
  imageUri: string;
  gridSize: GridSize;
  questions: PuzzleQuestion[];
}

export async function createPuzzle(params: CreatePuzzleParams): Promise<{ success: boolean; puzzleId?: string; reason?: string }> {
  try {
    const username = await reddit.getCurrentUsername();
    if (!username) {
      return { success: false, reason: 'User not authenticated' };
    }
    
    const validation = validatePuzzleQuestions(params.questions);
    if (!validation.valid) {
      return { success: false, reason: validation.reason || 'Validation failed' };
    }
    
    const counter = await redis.incrBy(PUZZLE_COUNTER_KEY, 1);
    const puzzleId = generatePuzzleId(counter);
    const now = Date.now();
    
    const metadata: PuzzleMetadata = {
      puzzleId,
      creatorUserId: username,
      creatorUsername: username,
      imageUri: params.imageUri,
      gridSize: params.gridSize,
      createdAt: now,
      totalQuestions: params.questions.length,
    };
    
    // Store puzzle metadata with creator attribution
    await redis.hSet(PUZZLE_KEY(puzzleId), {
      puzzleId: metadata.puzzleId,
      creatorUserId: metadata.creatorUserId,
      creatorUsername: metadata.creatorUsername,
      imageUri: metadata.imageUri,
      gridSize: String(metadata.gridSize),
      createdAt: String(metadata.createdAt),
      totalQuestions: String(metadata.totalQuestions),
    });
    
    // Store locked questions (never reshuffled)
    await redis.set(PUZZLE_QUESTIONS_KEY(puzzleId), JSON.stringify(params.questions));
    
    // Add to user's created puzzles (SET-like storage using comma-separated values)
    const createdPuzzles = await redis.get(USER_CREATED_PUZZLES_KEY(username)) || '';
    const updatedCreated = createdPuzzles ? `${createdPuzzles},${puzzleId}` : puzzleId;
    await redis.set(USER_CREATED_PUZZLES_KEY(username), updatedCreated);
    
    // Add to all puzzles set
    const allPuzzles = await redis.get(ALL_PUZZLES_KEY) || '';
    const updatedAll = allPuzzles ? `${allPuzzles},${puzzleId}` : puzzleId;
    await redis.set(ALL_PUZZLES_KEY, updatedAll);
    
    // Initialize solver count for this puzzle
    await redis.set(PUZZLE_SOLVE_COUNT_KEY(puzzleId), '0');
    
    // Initialize creator stats
    const creatorStats = await redis.get(CREATOR_STATS_KEY(username)) || '';
    const statsParts = creatorStats.split(',');
    const totalCreated = statsParts[0] ? parseInt(statsParts[0]) + 1 : 1;
    const totalSolves = statsParts[1] ? parseInt(statsParts[1]) : 0;
    await redis.set(CREATOR_STATS_KEY(username), `${totalCreated},${totalSolves}`);
    
    return { success: true, puzzleId };
    
  } catch (error) {
    console.error('Error creating puzzle:', error);
    return { success: false, reason: 'Failed to create puzzle' };
  }
}

// ============================================
// PUZZLE RETRIEVAL
// ============================================

function safeGetString(record: Record<string, string>, key: string, defaultValue: string): string {
  const value = record[key];
  return value !== undefined ? value : defaultValue;
}

export async function getPuzzleWithQuestions(puzzleId: string): Promise<PuzzleWithQuestions | null> {
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

export async function getPuzzleMetadata(puzzleId: string): Promise<PuzzleMetadata | null> {
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

// ============================================
// PUZZLE SELECTION ALGORITHM
// ============================================

interface GetNextPuzzleParams {
  userId: string;
}

interface GetNextPuzzleResult {
  status: 'success' | 'no_puzzles_available' | 'error';
  puzzle?: PuzzleWithQuestions;
  reason?: string;
}

/**
 * Get the next puzzle for a user that they haven't played before
 * and that they didn't create themselves.
 * 
 * This guarantees:
 * - No repeats per user (tracks user:{userId}:played)
 * - Users never see their own puzzles (tracks user:{userId}:created)
 * - Fair rotation (random selection from available puzzles)
 * - Community-wide distribution
 */
export async function getNextPuzzleForUser(params: GetNextPuzzleParams): Promise<GetNextPuzzleResult> {
  try {
    const { userId } = params;
    
    if (!userId) {
      return { status: 'error', reason: 'User ID is required' };
    }
    
    // Step 1: Fetch all puzzleIds
    const allPuzzlesStr = await redis.get(ALL_PUZZLES_KEY) || '';
    const allPuzzleIds = allPuzzlesStr.split(',').filter(Boolean);
    
    if (allPuzzleIds.length === 0) {
      return { status: 'no_puzzles_available', reason: 'No puzzles exist yet' };
    }
    
    // Step 2: Get puzzles created by this user
    const createdPuzzlesStr = await redis.get(USER_CREATED_PUZZLES_KEY(userId)) || '';
    const userCreatedPuzzles = new Set(createdPuzzlesStr.split(',').filter(Boolean));
    
    // Step 3: Get puzzles already played/solved by this user
    const playedPuzzlesStr = await redis.get(USER_PLAYED_PUZZLES_KEY(userId)) || '';
    const userPlayedPuzzles = new Set(playedPuzzlesStr.split(',').filter(Boolean));
    
    // Step 4: Filter out excluded puzzles
    const availablePuzzles = allPuzzleIds.filter(puzzleId => 
      puzzleId && 
      !userCreatedPuzzles.has(puzzleId) && 
      !userPlayedPuzzles.has(puzzleId)
    );
    
    // Step 5: If no puzzles remain, return no_puzzles_available
    if (availablePuzzles.length === 0) {
      return { status: 'no_puzzles_available', reason: 'User has played all available puzzles' };
    }
    
    // Step 6: Randomly select ONE puzzle from remaining
    const shuffledPuzzles = shuffleArray(availablePuzzles);
    const selectedPuzzleId = shuffledPuzzles[0] ?? '';
    
    // Step 7: Return full puzzle payload with locked questions
    if (!selectedPuzzleId) {
      return { status: 'no_puzzles_available', reason: 'No puzzles available after filtering' };
    }
    
    const puzzle = await getPuzzleWithQuestions(selectedPuzzleId);
    
    if (!puzzle) {
      // If puzzle doesn't exist, try another one
      for (const puzzleId of shuffledPuzzles.slice(1)) {
        const existingPuzzle = await getPuzzleWithQuestions(puzzleId);
        if (existingPuzzle) {
          return { status: 'success', puzzle: existingPuzzle };
        }
      }
      return { status: 'no_puzzles_available', reason: 'All puzzles have been removed' };
    }
    
    return { status: 'success', puzzle };
    
  } catch (error) {
    console.error('Error getting next puzzle:', error);
    return { status: 'error', reason: 'Failed to select puzzle' };
  }
}

// ============================================
// PUZZLE SOLVING & ATTRIBUTION
// ============================================

interface MarkPuzzleSolvedParams {
  userId: string;
  puzzleId: string;
  timeTaken: number;  // in seconds
  score: number;
}

interface MarkPuzzleSolvedResult {
  status: 'success' | 'error';
  reason?: string;
  creatorUsername?: string;
  creatorNotified?: boolean;
}

/**
 * Mark a puzzle as solved by a user.
 * 
 * This function:
 * - Adds puzzleId to user:{userId}:played (prevents repeat plays)
 * - Adds userId to puzzle:{puzzleId}:solvers (tracks who solved it)
 * - Increments creator's total solve count
 * - Records solve metadata (time, score)
 * 
 * All operations are wrapped in try/catch for safety.
 */
export async function markPuzzleSolved(params: MarkPuzzleSolvedParams): Promise<MarkPuzzleSolvedResult> {
  try {
    const { userId, puzzleId, timeTaken, score } = params;
    
    if (!userId || !puzzleId) {
      return { status: 'error', reason: 'User ID and Puzzle ID are required' };
    }
    
    // Get puzzle metadata to identify creator
    const puzzle = await getPuzzleMetadata(puzzleId);
    if (!puzzle) {
      return { status: 'error', reason: 'Puzzle not found' };
    }
    
    const creatorUsername = puzzle.creatorUsername;
    
    // Check if user already solved this puzzle (idempotency)
    const playedPuzzlesStr = await redis.get(USER_PLAYED_PUZZLES_KEY(userId)) || '';
    const playedPuzzles = new Set(playedPuzzlesStr.split(',').filter(Boolean));
    
    if (playedPuzzles.has(puzzleId)) {
      return { 
        status: 'error', 
        reason: 'Puzzle already solved by this user',
        creatorUsername 
      };
    }
    
    // Step 1: Add puzzleId to user:{userId}:played
    const updatedPlayed = playedPuzzlesStr 
      ? `${playedPuzzlesStr},${puzzleId}` 
      : puzzleId;
    await redis.set(USER_PLAYED_PUZZLES_KEY(userId), updatedPlayed);
    
    // Step 2: Add userId to puzzle:{puzzleId}:solvers
    const solversKey = PUZZLE_SOLVERS_KEY(puzzleId);
    const solversData = await redis.get(solversKey) || '';
    const solvers = solversData.split(',').filter(Boolean);
    
    if (!solvers.includes(userId)) {
      const updatedSolvers = solversData 
        ? `${solversData},${userId}` 
        : userId;
      await redis.set(solversKey, updatedSolvers);
    }
    
    // Step 3: Increment puzzle's solve count
    const solveCountStr = await redis.get(PUZZLE_SOLVE_COUNT_KEY(puzzleId)) || '0';
    const currentSolveCount = parseInt(solveCountStr) || 0;
    await redis.set(PUZZLE_SOLVE_COUNT_KEY(puzzleId), String(currentSolveCount + 1));
    
    // Step 4: Increment creator's total solve count
    const creatorStats = await redis.get(CREATOR_STATS_KEY(creatorUsername)) || '';
    const statsParts = creatorStats.split(',');
    const totalCreated = statsParts[0] ? parseInt(statsParts[0]) : 1;
    const totalSolves = statsParts[1] ? parseInt(statsParts[1]) + 1 : 1;
    await redis.set(CREATOR_STATS_KEY(creatorUsername), `${totalCreated},${totalSolves}`);
    
    // Step 5: Record solve metadata (time, score)
    const solveMetadataKey = `puzzora:solve:${userId}:${puzzleId}`;
    await redis.hSet(solveMetadataKey, {
      solvedAt: String(Date.now()),
      timeTaken: String(timeTaken),
      score: String(score),
      puzzleId,
      creatorUserId: puzzle.creatorUserId,
      creatorUsername,
    });
    
    // Set expiration for solve metadata (1 year)
    await redis.expire(solveMetadataKey, 31536000);
    
    // Optional: Trigger creator notification (placeholder for actual notification logic)
    const creatorNotified = await notifyCreatorOfSolve(
      puzzle.creatorUserId,
      userId,
      puzzleId,
      timeTaken,
      score
    );
    
    return { 
      status: 'success', 
      creatorUsername,
      creatorNotified 
    };
    
  } catch (error) {
    console.error('Error marking puzzle as solved:', error);
    return { status: 'error', reason: 'Failed to record puzzle solve' };
  }
}

/**
 * Notify the creator that someone solved their puzzle.
 * This is a placeholder - actual implementation would depend on the platform.
 */
async function notifyCreatorOfSolve(
  creatorUserId: string,
  solverUserId: string,
  puzzleId: string,
  timeTaken: number,
  score: number
): Promise<boolean> {
  try {
    // TODO: Implement actual notification logic
    // This could be a Reddit message, in-app notification, etc.
    console.log(`Creator ${creatorUserId} notified: ${solverUserId} solved ${puzzleId} in ${timeTaken}s with score ${score}`);
    
    // Store notification for later processing
    const notificationKey = `puzzora:notification:${Date.now()}`;
    await redis.hSet(notificationKey, {
      type: 'puzzle_solved',
      creatorUserId,
      solverUserId,
      puzzleId,
      timeTaken: String(timeTaken),
      score: String(score),
      createdAt: String(Date.now()),
    });
    await redis.expire(notificationKey, 604800); // 1 week expiration
    
    return true;
  } catch (error) {
    console.error('Error notifying creator:', error);
    return false;
  }
}

// ============================================
// ATTRIBUTION & CREATOR RECOGNITION
// ============================================

interface CreatorStats {
  totalPuzzlesCreated: number;
  totalSolves: number;
}

export async function getCreatorStats(userId: string): Promise<CreatorStats | null> {
  try {
    const stats = await redis.get(CREATOR_STATS_KEY(userId)) || '';
    const parts = stats.split(',');
    
    if (parts.length < 2) {
      return { totalPuzzlesCreated: 0, totalSolves: 0 };
    }
    
    return {
      totalPuzzlesCreated: parseInt(parts[0] ?? '0') || 0,
      totalSolves: parseInt(parts[1] ?? '0') || 0,
    };
  } catch (error) {
    console.error('Error getting creator stats:', error);
    return null;
  }
}

export async function getPuzzleSolveCount(puzzleId: string): Promise<number> {
  try {
    const count = await redis.get(PUZZLE_SOLVE_COUNT_KEY(puzzleId)) || '0';
    return parseInt(count) || 0;
  } catch (error) {
    console.error('Error getting puzzle solve count:', error);
    return 0;
  }
}

export async function getPuzzleSolvers(puzzleId: string): Promise<SolverInfo[]> {
  try {
    const solversData = await redis.get(PUZZLE_SOLVERS_KEY(puzzleId)) || '';
    const solverIds = solversData.split(',').filter(Boolean);
    
    const solvers: SolverInfo[] = [];
    for (const solverId of solverIds) {
      const solveMetadataKey = `puzzora:solve:${solverId}:${puzzleId}`;
      const metadata = await redis.hGetAll(solveMetadataKey);
      
      if (metadata && metadata.solvedAt) {
        solvers.push({
          userId: solverId,
          solvedAt: parseInt(metadata.solvedAt ?? '0'),
          timeTaken: parseInt(metadata.timeTaken ?? '0') || 0,
          score: parseInt(metadata.score ?? '0') || 0,
        });
      } else {
        // Fallback if metadata not found
        solvers.push({
          userId: solverId,
          solvedAt: Date.now(),
          timeTaken: 0,
          score: 0,
        });
      }
    }
    
    // Sort by solve time (most recent first)
    solvers.sort((a, b) => b.solvedAt - a.solvedAt);
    
    return solvers;
  } catch (error) {
    console.error('Error getting puzzle solvers:', error);
    return [];
  }
}

// ============================================
// DAILY PUZZLE MANAGEMENT
// ============================================

export async function setDailyPuzzle(puzzleId: string): Promise<boolean> {
  try {
    const puzzle = await getPuzzleMetadata(puzzleId);
    if (!puzzle) {
      return false;
    }
    
    await redis.set(DAILY_PUZZLE_KEY, puzzleId);
    return true;
    
  } catch (error) {
    console.error('Error setting daily puzzle:', error);
    return false;
  }
}

export async function getDailyPuzzle(): Promise<PuzzleWithQuestions | null> {
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
// USER PUZZLE MANAGEMENT
// ============================================

export async function getUserCreatedPuzzles(userId?: string): Promise<PuzzleMetadata[]> {
  try {
    const username = userId || await reddit.getCurrentUsername();
    if (!username) {
      return [];
    }
    
    const createdPuzzles = await redis.get(USER_CREATED_PUZZLES_KEY(username)) || '';
    const puzzleIds = createdPuzzles.split(',').filter(Boolean);
    
    const puzzles: PuzzleMetadata[] = [];
    for (const puzzleId of puzzleIds) {
      if (puzzleId) {
        const metadata = await getPuzzleMetadata(puzzleId);
        if (metadata) {
          puzzles.push(metadata);
        }
      }
    }
    
    return puzzles;
    
  } catch (error) {
    console.error('Error getting user created puzzles:', error);
    return [];
  }
}

export async function getUserSolvedPuzzles(userId: string): Promise<string[]> {
  try {
    const solvedPuzzles = await redis.get(USER_SOLVED_PUZZLES_KEY(userId)) || '';
    return solvedPuzzles.split(',').filter(Boolean);
  } catch (error) {
    console.error('Error getting user solved puzzles:', error);
    return [];
  }
}

export async function hasUserPlayedPuzzle(userId: string, puzzleId: string): Promise<boolean> {
  try {
    const playedPuzzles = await redis.get(USER_PLAYED_PUZZLES_KEY(userId)) || '';
    const puzzleIds = new Set(playedPuzzles.split(',').filter(Boolean));
    return puzzleIds.has(puzzleId);
  } catch (error) {
    console.error('Error checking if user played puzzle:', error);
    return false;
  }
}

// ============================================
// API ENDPOINT IMPLEMENTATIONS
// ============================================

/**
 * Handler for POST /api/puzzle/get-next
 * Returns the next puzzle for the current user
 */
export async function handleGetNextPuzzle(
  request: unknown
): Promise<GetNextPuzzleResponse> {
  try {
    const username = await reddit.getCurrentUsername();
    if (!username) {
      return {
        type: 'getNextPuzzleResponse',
        success: false,
        status: 'error',
        reason: 'User not authenticated'
      };
    }
    
    const result = await getNextPuzzleForUser({ userId: username });
    
    if (result.status === 'success' && result.puzzle) {
      return {
        type: 'getNextPuzzleResponse',
        success: true,
        status: 'success',
        puzzle: result.puzzle
      };
    }
    
    return {
      type: 'getNextPuzzleResponse',
      success: false,
      status: result.status
    };
    
  } catch (error) {
    console.error('Error in handleGetNextPuzzle:', error);
    return {
      type: 'getNextPuzzleResponse',
      success: false,
      status: 'error',
      reason: 'Failed to get next puzzle'
    };
  }
}

/**
 * Handler for POST /api/puzzle/solve
 * Records a puzzle solve and updates attribution
 */
export async function handleSolvePuzzle(
  request: SolvePuzzleRequest
): Promise<SolvePuzzleResponse> {
  try {
    const username = await reddit.getCurrentUsername();
    if (!username) {
      return {
        type: 'solvePuzzleResponse',
        success: false,
        reason: 'User not authenticated'
      };
    }
    
    const result = await markPuzzleSolved({
      userId: username,
      puzzleId: request.puzzleId,
      timeTaken: request.timeTaken,
      score: request.score
    });
    
    if (result.status === 'success') {
      const response: SolvePuzzleResponse = {
        type: 'solvePuzzleResponse',
        success: true
      };
      if (result.creatorUsername) {
        response.creatorUsername = result.creatorUsername;
      }
      if (result.creatorNotified !== undefined) {
        response.creatorNotified = result.creatorNotified;
      }
      return response;
    }
    
    return {
      type: 'solvePuzzleResponse',
      success: false
    };
    
  } catch (error) {
    console.error('Error in handleSolvePuzzle:', error);
    return {
      type: 'solvePuzzleResponse',
      success: false,
      reason: 'Failed to record puzzle solve'
    };
  }
}

/**
 * Handler for GET /api/puzzle/created-by/:userId
 * Returns all puzzles created by a specific user
 */
export async function handleGetPuzzlesByUser(
  userId: string
): Promise<GetPuzzlesByUserResponse> {
  try {
    const puzzles = await getUserCreatedPuzzles(userId);
    const creatorStats = await getCreatorStats(userId);
    
    return {
      type: 'getPuzzlesByUserResponse',
      success: true,
      puzzles,
      totalPuzzles: puzzles.length,
      totalSolves: creatorStats?.totalSolves || 0,
      creatorUsername: userId
    };
    
  } catch (error) {
    console.error('Error in handleGetPuzzlesByUser:', error);
    return {
      type: 'getPuzzlesByUserResponse',
      success: false,
      reason: 'Failed to get user puzzles',
      puzzles: [],
      totalPuzzles: 0,
      totalSolves: 0,
      creatorUsername: userId
    };
  }
}

/**
 * Handler for GET /api/puzzle/solved-by/:puzzleId
 * Returns all users who solved a specific puzzle
 */
export async function handleGetPuzzleSolvers(
  puzzleId: string
): Promise<GetPuzzleSolversResponse> {
  try {
    const puzzle = await getPuzzleMetadata(puzzleId);
    if (!puzzle) {
      return {
        type: 'getPuzzleSolversResponse',
        success: false,
        reason: 'Puzzle not found',
        solvers: [],
        solveCount: 0
      };
    }
    
    const solvers = await getPuzzleSolvers(puzzleId);
    const solveCount = await getPuzzleSolveCount(puzzleId);
    
    return {
      type: 'getPuzzleSolversResponse',
      success: true,
      puzzleId,
      creatorUsername: puzzle.creatorUsername,
      solvers,
      solveCount
    };
    
  } catch (error) {
    console.error('Error in handleGetPuzzleSolvers:', error);
    return {
      type: 'getPuzzleSolversResponse',
      success: false,
      reason: 'Failed to get puzzle solvers',
      solvers: [],
      solveCount: 0
    };
  }
}
