import type { CustomPostContext } from "@devvit/public-api";

// Shape of a single leaderboard entry for a given puzzle.
export interface LeaderboardEntry {
  userId: string;
  username: string;
  bestTimeMs: number;
}

// Overall per-post puzzle state persisted in Redis.
export interface PuzzleState {
  imageUrl: string;
  uploaderId: string;
  createdAt: string;
  leaderboard: LeaderboardEntry[];
}

const keyForPost = (postId: string | undefined): string => {
  if (!postId) {
    throw new Error("Missing postId for PUZZORA storage key.");
  }
  return `puzzora:post:${postId}`;
};

// Load puzzle state for a given post. Returns null if none exists yet.
export const getPuzzleState = async (
  context: CustomPostContext
): Promise<PuzzleState | null> => {
  const key = keyForPost(context.post?.id);
  const raw = await context.redis.get(key);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as PuzzleState;
    // Basic validation to guard against corrupted data.
    if (!parsed.imageUrl || !parsed.uploaderId) {
      throw new Error("Invalid PUZZORA state in storage.");
    }
    return parsed;
  } catch (error) {
    console.error("Failed to parse PUZZORA state from Redis:", error);
    throw error;
  }
};

// Persist full puzzle state back to Redis.
export const savePuzzleState = async (
  context: CustomPostContext,
  state: PuzzleState
): Promise<void> => {
  const key = keyForPost(context.post?.id);
  try {
    await context.redis.set(key, JSON.stringify(state));
  } catch (error) {
    console.error("Failed to save PUZZORA state to Redis:", error);
    throw error;
  }
};

// Initialize a puzzle when the uploader first uploads an image.
export const initializePuzzleState = async (
  context: CustomPostContext,
  imageUrl: string,
  uploaderId: string
): Promise<PuzzleState> => {
  const existing = await getPuzzleState(context);
  // If state already exists, keep it to avoid overwriting leaderboard/history.
  if (existing) {
    return existing;
  }

  const initialState: PuzzleState = {
    imageUrl,
    uploaderId,
    createdAt: new Date().toISOString(),
    leaderboard: [],
  };

  await savePuzzleState(context, initialState);
  return initialState;
};

// Record a successful puzzle completion for a given user and time.
// Only keeps the best (lowest) time per user.
export const recordCompletion = async (
  context: CustomPostContext,
  timeMs: number
): Promise<PuzzleState> => {
  const userId = context.userId;
  if (!userId) {
    throw new Error("Missing userId in context when recording completion.");
  }

  const username = context.userName ?? "unknown";

  const state = await getPuzzleState(context);
  if (!state) {
    throw new Error("Cannot record completion before puzzle is initialized.");
  }

  const existingIndex = state.leaderboard.findIndex(
    (entry) => entry.userId === userId
  );

  if (existingIndex === -1) {
    state.leaderboard.push({
      userId,
      username,
      bestTimeMs: timeMs,
    });
  } else {
    const current = state.leaderboard[existingIndex];
    if (timeMs < current.bestTimeMs) {
      state.leaderboard[existingIndex] = {
        ...current,
        bestTimeMs: timeMs,
      };
    }
  }

  // Sort ascending by bestTimeMs and trim to top 10.
  state.leaderboard.sort((a, b) => a.bestTimeMs - b.bestTimeMs);
  state.leaderboard = state.leaderboard.slice(0, 10);

  await savePuzzleState(context, state);
  return state;
};

