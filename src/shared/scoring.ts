/**
 * Puzzora Scoring System
 * Rewards: Completion + Accuracy + Difficulty + Speed + Daily Streak
 */

// Constants
const BASE_COMPLETION = 100;
const HEARTS_MULTIPLIER = 15;
const GRID_BONUSES: Record<number, number> = {
  3: 0,   // 3x3 grid
  4: 40,  // 4x4 grid
  5: 80,  // 5x5 grid
};
const SPEED_BONUS_THRESHOLDS = [
  { maxSeconds: 30, bonus: 80 },
  { maxSeconds: 60, bonus: 50 },
  { maxSeconds: 120, bonus: 25 },
] as const;
const MAX_STREAK_BONUS = 50;
const STREAK_MULTIPLIER = 10;

// Anti-cheat constants
const MIN_VALID_TIME_SECONDS = 5;
const MAX_SCORE_PER_PUZZLE_PER_DAY = 1;

export interface ScoreBreakdown {
  baseCompletion: number;
  heartsBonus: number;
  gridBonus: number;
  speedBonus: number;
  streakBonus: number;
  totalScore: number;
  accuracy: number;
  speed: number;
  difficulty: number;
}

/**
 * Calculate hearts bonus based on remaining hearts
 */
export function calculateHeartsBonus(heartsRemaining: number): number {
  return heartsRemaining * HEARTS_MULTIPLIER;
}

/**
 * Calculate grid difficulty bonus based on grid size
 */
export function calculateGridBonus(gridSize: number): number {
  return GRID_BONUSES[gridSize] ?? 0;
}

/**
 * Calculate speed bonus based on time taken (tiered buckets)
 */
export function calculateSpeedBonus(timeSeconds: number): number {
  if (timeSeconds < MIN_VALID_TIME_SECONDS) {
    return -1; // Anti-cheat: suspicious time
  }

  for (const threshold of SPEED_BONUS_THRESHOLDS) {
    if (timeSeconds <= threshold.maxSeconds) {
      return threshold.bonus;
    }
  }
  return 0; // Takes longer than 2 minutes
}

/**
 * Calculate daily streak bonus (capped at MAX_STREAK_BONUS)
 */
export function calculateStreakBonus(streakDays: number): number {
  return Math.min(streakDays * STREAK_MULTIPLIER, MAX_STREAK_BONUS);
}

/**
 * Main scoring function - calculates total score with full breakdown
 */
export function calculateScore(
  heartsRemaining: number,
  gridSize: number,
  timeSeconds: number,
  streakDays: number = 0
): ScoreBreakdown {
  // Anti-cheat: reject suspicious times
  if (timeSeconds < MIN_VALID_TIME_SECONDS) {
    return {
      baseCompletion: 0,
      heartsBonus: 0,
      gridBonus: 0,
      speedBonus: -1,
      streakBonus: 0,
      totalScore: 0,
      accuracy: 0,
      speed: 0,
      difficulty: 0,
    };
  }

  const heartsBonus = calculateHeartsBonus(heartsRemaining);
  const gridBonus = calculateGridBonus(gridSize);
  const speedBonus = calculateSpeedBonus(timeSeconds);
  const streakBonus = calculateStreakBonus(streakDays);

  const totalScore =
    BASE_COMPLETION +
    heartsBonus +
    gridBonus +
    speedBonus +
    streakBonus;

  // Calculate percentages for tooltip
  const accuracy = Math.round((heartsBonus / totalScore) * 100);
  const speed = Math.round((speedBonus / totalScore) * 100);
  const difficulty = Math.round(((gridBonus + BASE_COMPLETION) / totalScore) * 100);

  return {
    baseCompletion: BASE_COMPLETION,
    heartsBonus,
    gridBonus,
    speedBonus,
    streakBonus,
    totalScore,
    accuracy: accuracy || 0,
    speed: speed || 0,
    difficulty: difficulty || 0,
  };
}

/**
 * Validate score for anti-cheat rules
 */
export function validateScore(
  heartsRemaining: number,
  gridSize: number,
  timeSeconds: number,
  streakDays: number = 0
): { valid: boolean; reason?: string } {
  // Rule 1: Must complete puzzle (heartsRemaining must be > 0)
  if (heartsRemaining < 0) {
    return { valid: false, reason: 'Puzzle not completed' };
  }

  // Rule 2: Time must be >= 5 seconds (bot protection)
  if (timeSeconds < MIN_VALID_TIME_SECONDS) {
    return { valid: false, reason: 'Suspicious time (too fast)' };
  }

  return { valid: true };
}

/**
 * Get Redis key for daily leaderboard
 */
export function getDailyLeaderboardKey(date?: string): string {
  const targetDate = date || new Date().toISOString().split('T')[0];
  return `leaderboard:daily:${targetDate}`;
}

/**
 * Get Redis key for global leaderboard
 */
export function getGlobalLeaderboardKey(): string {
  return 'leaderboard:global';
}

/**
 * Get user stats key
 */
export function getUserStatsKey(username: string): string {
  return `user:stats:${username}`;
}
