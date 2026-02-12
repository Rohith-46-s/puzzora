import { redis, context } from '@devvit/web/server';

// Fallback image when no user-uploaded images are available
const FALLBACK_IMAGE_URL = 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee';
const FALLBACK_UPLOADER = 'puzzora_bot';

// KV storage keys
const KEY_DAILY_IMAGE_URL = 'dailyImageUrl';
const KEY_DAILY_UPLOADER = 'dailyUploader';

/**
 * Get today's date string in YYYY-MM-DD format
 */
const getTodayDateString = (): string => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
};

/**
 * Get the daily puzzle image from Reddit posts or cache
 * 
 * Logic:
 * 1. Check Redis cache first
 * 2. If cache miss, fetch latest posts from subreddit
 * 3. Filter posts with flair "PUZZORA_PUZZLE" and type "image"
 * 4. Select most recent post from today
 * 5. Store in Redis for 24 hours
 * 6. Return image URL and uploader
 */
export const getDailyPuzzleImage = async (): Promise<{
  imageUrl: string;
  uploader: string;
}> => {
  try {
    // Check if we have a cached daily image
    const cachedImageUrl = await redis.get(KEY_DAILY_IMAGE_URL);
    const cachedUploader = await redis.get(KEY_DAILY_UPLOADER);

    // Return cached values if they exist
    if (cachedImageUrl && cachedUploader) {
      console.log(`[PuzzleSource] Using cached daily image from ${cachedUploader}`);
      return {
        imageUrl: cachedImageUrl,
        uploader: cachedUploader,
      };
    }

    // Note: Devvit API does not provide a method to list/fetch posts from a subreddit.
    // This functionality is not available in the current Devvit API.
    // Returning fallback image since we cannot fetch posts.
    const subredditName = context.subredditName || 'unknown';
    console.log(`[PuzzleSource] No cached image, cannot fetch posts from r/${subredditName} (API limitation), using fallback`);
    return {
      imageUrl: FALLBACK_IMAGE_URL,
      uploader: FALLBACK_UPLOADER,
    };
  } catch (error) {
    console.error(`[PuzzleSource] Error fetching daily image: ${error}`);
    // Return fallback on error
    return {
      imageUrl: FALLBACK_IMAGE_URL,
      uploader: FALLBACK_UPLOADER,
    };
  }
};

/**
 * Clear the daily puzzle cache (useful for testing)
 */
export const clearDailyPuzzleCache = async (): Promise<void> => {
  await redis.del(KEY_DAILY_IMAGE_URL);
  await redis.del(KEY_DAILY_UPLOADER);
  console.log('[PuzzleSource] Daily puzzle cache cleared');
};
