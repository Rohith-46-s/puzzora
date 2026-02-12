import { redis, context } from '@devvit/web/server';
import { getDailyLeaderboardKey, getGlobalLeaderboardKey, getUserStatsKey } from '../shared/scoring.js';
import { LeaderboardEntry } from '../shared/types/api.js';

/**
 * Submit a score to the leaderboard
 * Handles anti-cheat rules automatically
 */
export async function submitScore(
  username: string,
  puzzleId: string,
  heartsRemaining: number,
  gridSize: number,
  timeSeconds: number,
  streakDays: number = 0
): Promise<{ success: boolean; score: number; rank?: number; reason?: string }> {
  // Anti-cheat: Must complete puzzle (heartsRemaining >= 0 means completed)
  if (heartsRemaining < 0) {
    return { success: false, score: 0, reason: 'Puzzle not completed' };
  }

  // Anti-cheat: Time must be >= 5 seconds
  if (timeSeconds < 5) {
    return { success: false, score: 0, reason: 'Suspicious time (too fast)' };
  }

  // Calculate total score
  const totalScore = 100 + heartsRemaining * 15 + (gridSize === 3 ? 0 : gridSize === 4 ? 40 : 80) + (timeSeconds <= 30 ? 80 : timeSeconds <= 60 ? 50 : timeSeconds <= 120 ? 25 : 0) + Math.min(streakDays * 10, 50);

  // Get today's date for daily key
  const today = new Date().toISOString().split('T')[0];
  const dailyKey = `leaderboard:daily:${today}`;
  const globalKey = 'leaderboard:global';

  // Anti-cheat: Check if user already has a higher score for this puzzle today
  const puzzleScoreKey = `user:puzzle:${username}:${puzzleId}:${today}`;
  const existingScore = await redis.get(puzzleScoreKey);

  if (existingScore && Number(existingScore) >= totalScore) {
    return { success: false, score: totalScore, reason: 'Lower score ignored (only highest counts)' };
  }

  // Store the score for this puzzle
  await redis.set(puzzleScoreKey, totalScore.toString());

  // Update daily leaderboard (store as hash: username -> score)
  const dailyData = await redis.hGetAll(dailyKey);
  dailyData[username] = totalScore.toString();
  await redis.hSet(dailyKey, dailyData);

  // Update global leaderboard
  const globalData = await redis.hGetAll(globalKey);
  globalData[username] = String(Number(globalData[username] || '0') + totalScore);
  await redis.hSet(globalKey, globalData);

  // Update user stats
  const statsKey = getUserStatsKey(username);
  const currentStats = await redis.hGetAll(statsKey);
  await redis.hSet(statsKey, {
    solvedCount: String((Number(currentStats.solvedCount) || 0) + 1),
    bestTime: currentStats.bestTime && Number(currentStats.bestTime) < timeSeconds ? currentStats.bestTime : String(timeSeconds),
    lastSolvedAt: String(Math.floor(Date.now() / 1000)),
  });

  return { success: true, score: totalScore };
}

/**
 * Get daily leaderboard entries (top 10)
 */
export async function getDailyLeaderboard(_date?: string): Promise<LeaderboardEntry[]> {
  const today = new Date().toISOString().split('T')[0];
  const dailyKey = `leaderboard:daily:${today}`;

  const scores = await redis.hGetAll(dailyKey);
  
  if (!scores || Object.keys(scores).length === 0) {
    return [];
  }

  // Convert to array and sort by score descending
  const entries: LeaderboardEntry[] = Object.entries(scores)
    .map(([username, score]) => ({
      username,
      score: Number(score),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map((entry, index) => ({
      rank: index + 1,
      username: entry.username,
      score: entry.score,
      heartsRemaining: 0,
      gridSize: 3,
      timeSeconds: 60,
    }));

  return entries;
}

/**
 * Get global leaderboard entries
 */
export async function getGlobalLeaderboard(limit: number = 10): Promise<LeaderboardEntry[]> {
  const globalKey = 'leaderboard:global';

  const scores = await redis.hGetAll(globalKey);
  
  if (!scores || Object.keys(scores).length === 0) {
    return [];
  }

  const entries: LeaderboardEntry[] = Object.entries(scores)
    .map(([username, score]) => ({
      username,
      score: Number(score),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry, index) => ({
      rank: index + 1,
      username: entry.username,
      score: entry.score,
      heartsRemaining: 0,
      gridSize: 3,
      timeSeconds: 60,
    }));

  return entries;
}

/**
 * Get user's rank on daily leaderboard
 */
export async function getUserDailyRank(username: string): Promise<number | null> {
  const today = new Date().toISOString().split('T')[0];
  const dailyKey = `leaderboard:daily:${today}`;

  const scores = await redis.hGetAll(dailyKey);
  
  if (!scores || !scores[username]) {
    return null;
  }

  const userScore = Number(scores[username]);
  const higherScores = Object.values(scores).filter(s => Number(s) > userScore).length;
  
  return higherScores + 1;
}

/**
 * Get user's rank on global leaderboard
 */
export async function getUserGlobalRank(username: string): Promise<number | null> {
  const globalKey = 'leaderboard:global';

  const scores = await redis.hGetAll(globalKey);
  
  if (!scores || !scores[username]) {
    return null;
  }

  const userScore = Number(scores[username]);
  const higherScores = Object.values(scores).filter(s => Number(s) > userScore).length;
  
  return higherScores + 1;
}

/**
 * Get user's stats
 */
export async function getUserStats(username: string): Promise<{
  solvedCount: number;
  bestTime: number | null;
  lastSolvedAt: number | null;
} | null> {
  const key = getUserStatsKey(username);
  const stats = await redis.hGetAll(key);

  if (!stats || Object.keys(stats).length === 0) {
    return null;
  }

  return {
    solvedCount: Number(stats.solvedCount) || 0,
    bestTime: stats.bestTime ? Number(stats.bestTime) : null,
    lastSolvedAt: stats.lastSolvedAt ? Number(stats.lastSolvedAt) : null,
  };
}
