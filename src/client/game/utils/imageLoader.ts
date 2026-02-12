/**
 * Puzzora Image Loader & Rotation System
 * 
 * ARCHITECTURE:
 * - Images stored in /assets/puzzle-images/ folder
 * - Vite imports images at build time
 * - Current image index stored in Redis (post-level)
 * - Rotation logic ensures non-repeating cycle
 * 
 * FUTURE ENHANCEMENT (User Uploads):
 * - When implemented, images will be uploaded to Reddit media
 * - Stored with mediaId in Redis
 * - Can mix default and user-uploaded images
 */

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface PuzzleImage {
  /** Unique identifier for the image */
  id: string;
  /** Display name for the image */
  name: string;
  /** Path or URL to the image */
  path: string;
  /** Theme/tags for categorization */
  theme?: string;
}

// ============================================
// DEFAULT IMAGES REGISTRY
// ============================================

/**
 * DEFAULT IMAGES FOLDER: /assets/puzzle-images/
 * 
 * To add new default images:
 * 1. Drop image files (.png, .jpg, .webp) into /assets/puzzle-images/
 * 2. The following images are automatically available:
 *    - puzzle-1.png, puzzle-2.png, puzzle-3.png, etc.
 */

// Build-time image imports - Vite will bundle these
// Images should be placed in: /assets/puzzle-images/
// For testing, using working images from /splash/ folder
const BUILD_TIME_IMAGES: PuzzleImage[] = [
  {
    id: 'default-1',
    name: 'Puzzle 1',
    path: '/splash/background.png',
    theme: 'default',
  },
  {
    id: 'default-2',
    name: 'Puzzle 2',
    path: '/splash/logo.png',
    theme: 'default',
  },
  {
    id: 'default-3',
    name: 'Puzzle 3',
    path: '/puzzora-icon.svg',
    theme: 'default',
  },
  {
    id: 'default-4',
    name: 'Puzzle 4',
    path: '/splash/background.png',
    theme: 'default',
  },
  {
    id: 'default-5',
    name: 'Puzzle 5',
    path: '/splash/logo.png',
    theme: 'default',
  },
];

export const DEFAULT_PUZZLE_IMAGES: PuzzleImage[] = BUILD_TIME_IMAGES;

// Fallback if no images found
const FALLBACK_IMAGE: PuzzleImage = {
  id: 'fallback',
  name: 'Placeholder',
  path: '/assets/default-splash.png',
  theme: 'fallback',
};

// ============================================
// IMAGE SELECTION & ROTATION LOGIC
// ============================================

/**
 * Get the next image in non-repeating rotation.
 * 
 * LOGIC:
 * - Cycle through all images sequentially
 * - After completing all images, wrap back to start
 * 
 * @param currentIndex - Current position in rotation
 * @param totalImages - Total available images
 * @returns New index for next image
 */
export function getNextImageIndex(currentIndex: number, totalImages: number): number {
  if (totalImages <= 1) return 0;
  return (currentIndex + 1) % totalImages;
}

/**
 * Get image by index with bounds checking.
 */
export function getImageByIndex(index: number, images: PuzzleImage[]): PuzzleImage {
  if (images.length === 0) return FALLBACK_IMAGE;
  const safeIndex = Math.max(0, Math.min(index, images.length - 1));
  return images[safeIndex] ?? FALLBACK_IMAGE;
}

/**
 * Generate initial image index deterministically.
 * Uses puzzle/post ID to ensure consistent selection across sessions.
 */
export function getInitialImageIndex(seed: string, totalImages: number): number {
  if (totalImages <= 1) return 0;
  
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  return Math.abs(hash) % totalImages;
}

// ============================================
// SERVER API INTEGRATION
// ============================================

/**
 * Fetch image rotation state from server.
 */
export async function fetchImageIndexFromServer(): Promise<number | null> {
  try {
    const response = await fetch('/my/api/puzzle/image-index');
    if (!response.ok) return null;
    const data = await response.json();
    return typeof data.index === 'number' ? data.index : null;
  } catch {
    console.warn('Could not fetch image index from server');
    return null;
  }
}

/**
 * Request server to rotate to next image.
 */
export async function rotateImageOnServer(currentIndex: number): Promise<{
  success: boolean;
  newIndex: number;
  imageUrl?: string;
}> {
  try {
    const response = await fetch('/my/api/puzzle/rotate-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentIndex }),
    });
    
    if (!response.ok) {
      return { success: false, newIndex: currentIndex };
    }
    
    const data = await response.json();
    return {
      success: true,
      newIndex: typeof data.newIndex === 'number' ? data.newIndex : currentIndex,
      imageUrl: data.imageUrl,
    };
  } catch (error) {
    console.error('Failed to rotate image:', error);
    return { success: false, newIndex: currentIndex };
  }
}

/**
 * Initialize image index on server if not set.
 */
export async function initializeImageIndex(seed: string): Promise<number> {
  try {
    const response = await fetch('/my/api/puzzle/init-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seed }),
    });
    
    if (!response.ok) {
      return getInitialImageIndex(seed, DEFAULT_PUZZLE_IMAGES.length);
    }
    
    const data = await response.json();
    return typeof data.index === 'number' 
      ? data.index 
      : getInitialImageIndex(seed, DEFAULT_PUZZLE_IMAGES.length);
  } catch {
    return getInitialImageIndex(seed, DEFAULT_PUZZLE_IMAGES.length);
  }
}

// ============================================
// CLIENT-SIDE IMAGE LOADING
// ============================================

/**
 * Load puzzle image for display.
 * Fetches current image index from server and returns the image.
 */
export async function loadPuzzleImage(postId: string): Promise<PuzzleImage> {
  const totalImages = DEFAULT_PUZZLE_IMAGES.length;
  
  if (totalImages === 0) {
    return FALLBACK_IMAGE;
  }
  
  const serverIndex = await fetchImageIndexFromServer();
  
  if (serverIndex !== null) {
    return getImageByIndex(serverIndex, DEFAULT_PUZZLE_IMAGES);
  }
  
  const localIndex = getInitialImageIndex(postId, totalImages);
  return getImageByIndex(localIndex, DEFAULT_PUZZLE_IMAGES);
}

/**
 * Get current puzzle image synchronously.
 */
export function getCurrentImage(index: number): PuzzleImage {
  return getImageByIndex(index, DEFAULT_PUZZLE_IMAGES);
}

// ============================================
// FUTURE USER UPLOAD INTEGRATION
// ============================================

/**
 * FUTURE: User Upload Image System
 * 
 * When implementing user image uploads:
 * 
 * 1. UPLOAD TO REDDIT MEDIA:
 *    const response = await context.reddit.media.upload({
 *      data: imageDataUrl,
 *      filename: file.name,
 *      mimeType: file.type,
 *    });
 * 
 * 2. STORE IN REDDIS:
 *    await redis.hSet(`puzzora:upload:${response.mediaId}`, {
 *      mediaId: response.mediaId,
 *      mediaUrl: response.url,
 *      uploadedBy: context.userName,
 *      uploadedAt: Date.now(),
 *    });
 * 
 * 3. MIX WITH DEFAULT IMAGES:
 *    - Store user uploads in separate Redis list
 *    - Include both defaults and uploads in rotation
 *    - Mark source (default vs user) for display
 * 
 * Example structure:
 * 
 * interface UserUploadedImage {
 *   mediaId: string;
 *   mediaUrl: string;
 *   uploadedBy: string;
 *   uploadedAt: number;
 *   puzzleId?: string;
 * }
 * 
 * async function uploadUserImage(context, file): Promise<UserUploadedImage | null> {
 *   // ... upload logic ...
 * }
 * 
 * async function getUserUploadedImages(context): Promise<UserUploadedImage[]> {
 *   // Fetch from Redis
 * }
 */

// ============================================
// IMAGE RENDERING HELPERS
// ============================================

/**
 * Get the full URL for rendering an image.
 */
export function getImageUrl(image: PuzzleImage): string {
  if (!image?.path) return FALLBACK_IMAGE.path;
  
  if (image.path.startsWith('https://')) return image.path;
  if (image.path.startsWith('data:')) return image.path;
  
  return image.path;
}

/**
 * Preload images for smoother UX.
 */
export function preloadImages(images: PuzzleImage[]): void {
  if (typeof window === 'undefined') return;
  
  images.forEach((image) => {
    const img = new Image();
    img.src = getImageUrl(image);
  });
}

// ============================================
// DIAGNOSTICS & DEBUG
// ============================================

export function getImageStats(): {
  totalImages: number;
  imageIds: string[];
  imageNames: string[];
} {
  return {
    totalImages: DEFAULT_PUZZLE_IMAGES.length,
    imageIds: DEFAULT_PUZZLE_IMAGES.map((img) => img.id),
    imageNames: DEFAULT_PUZZLE_IMAGES.map((img) => img.name),
  };
}

export function describeImage(image: PuzzleImage): string {
  return `[${image.id}] ${image.name}${image.theme ? ` (${image.theme})` : ''}`;
}
