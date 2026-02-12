/**
 * Puzzora Image Manager
 * 
 * Handles both default assets and user-uploaded images:
 * - Default images: stored in /assets/puzzle-images/ as static assets
 * - User uploads: uploaded via context.reddit.media.upload()
 * 
 * Fallback: If uploaded image fails, use default asset image
 */

import { getPuzzleAssetUrl } from './imageAssets';

// ============================================
// IMAGE TYPES
// ============================================

export type ImageType = 'asset' | 'upload';

export interface PuzzleImage {
  /** Unique ID */
  id: string;
  /** Image type: static asset or user upload */
  type: ImageType;
  /** Source: asset name or mediaId */
  source: string;
  /** Display name */
  name: string;
  /** Upload timestamp (for uploads) */
  uploadedAt?: number;
  /** Uploader username (for uploads) */
  uploadedBy?: string;
}

// ============================================
// DEFAULT ASSETS
// ============================================

// Fallback image when no defaults available
const FALLBACK_IMAGE: PuzzleImage = {
  id: 'fallback',
  type: 'asset',
  source: 'puzzle-1.png',
  name: 'Fallback',
};

/**
 * Default puzzle images from /assets/puzzle-images/
 * These are static bundled assets that work in Devvit
 */
export const DEFAULT_IMAGES: PuzzleImage[] = [
  { id: 'default-1', type: 'asset', source: 'puzzle-1.png', name: 'Puzzle 1' },
  { id: 'default-2', type: 'asset', source: 'puzzle-2.png', name: 'Puzzle 2' },
  { id: 'default-3', type: 'asset', source: 'puzzle-3.png', name: 'Puzzle 3' },
  { id: 'default-4', type: 'asset', source: 'puzzle-4.png', name: 'Puzzle 4' },
  { id: 'default-5', type: 'asset', source: 'puzzle-5.png', name: 'Puzzle 5' },
  { id: 'default-6', type: 'asset', source: 'puzzle-6.png', name: 'Puzzle 6' },
  { id: 'default-7', type: 'asset', source: 'puzzle-7.png', name: 'Puzzle 7' },
  { id: 'default-8', type: 'asset', source: 'puzzle-8.png', name: 'Puzzle 8' },
  { id: 'default-9', type: 'asset', source: 'puzzle-9.png', name: 'Puzzle 9' },
  { id: 'default-10', type: 'asset', source: 'puzzle-10.png', name: 'Puzzle 10' },
  { id: 'default-11', type: 'asset', source: 'puzzle-11.png', name: 'Puzzle 11' },
  { id: 'default-12', type: 'asset', source: 'puzzle-12.png', name: 'Puzzle 12' },
  { id: 'default-13', type: 'asset', source: 'puzzle-13.png', name: 'Puzzle 13' },
  { id: 'default-14', type: 'asset', source: 'puzzle-14.png', name: 'Puzzle 14' },
  { id: 'default-15', type: 'asset', source: 'puzzle-15.png', name: 'Puzzle 15' },
  { id: 'default-16', type: 'asset', source: 'puzzle-16.png', name: 'Puzzle 16' },
  { id: 'default-17', type: 'asset', source: 'puzzle-17.png', name: 'Puzzle 17' },
  { id: 'default-18', type: 'asset', source: 'puzzle-18.png', name: 'Puzzle 18' },
  { id: 'default-19', type: 'asset', source: 'puzzle-19.png', name: 'Puzzle 19' },
  { id: 'default-20', type: 'asset', source: 'puzzle-20.png', name: 'Puzzle 20' },
];

// ============================================
// IMAGE URL HELPERS
// ============================================

/**
 * Get asset URL for Devvit Image component
 * Static assets in /assets/puzzle-images/ are referenced by filename
 */
export function getAssetUrl(assetName: string): string {
  // Return just the filename for Devvit asset reference
  return assetName;
}

/**
 * Get upload URL from mediaId
 * User uploads are stored on Reddit CDN
 */
export function getUploadUrl(mediaId: string): string {
  return `https://i.redd.it/${mediaId}.jpg`;
}

// ============================================
// IMAGE SELECTION
// ============================================

/**
 * Get deterministic initial image index
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

/**
 * Get next image in rotation
 */
export function getNextImageIndex(currentIndex: number, totalImages: number): number {
  if (totalImages <= 1) return 0;
  return (currentIndex + 1) % totalImages;
}

/**
 * Get image by index with bounds checking
 */
export function getImageByIndex(index: number, images: PuzzleImage[]): PuzzleImage {
  if (images.length === 0) {
    return FALLBACK_IMAGE;
  }
  const safeIndex = Math.min(Math.max(0, index), images.length - 1);
  return images[safeIndex] ?? FALLBACK_IMAGE;
}

// ============================================
// USER UPLOAD INTEGRATION
// ============================================

/**
 * FUTURE: Upload user image to Reddit media
 * 
 * On server:
 * const response = await context.reddit.media.upload({
 *   data: imageDataUrl,
 *   filename: file.name,
 *   mimeType: file.type,
 * });
 * 
 * Returns: { mediaId: string, url: string }
 */

/**
 * Store uploaded image info
 */
export function createUploadedImage(
  mediaId: string,
  _mediaUrl: string,
  uploader: string
): PuzzleImage {
  return {
    id: `upload-${mediaId}`,
    type: 'upload',
    source: mediaId, // Store mediaId
    name: `Uploaded by ${uploader}`,
    uploadedAt: Date.now(),
    uploadedBy: uploader,
  };
}

// ============================================
// FALLBACK LOGIC
// ============================================

/**
 * Get image URL for rendering
 * Falls back to default asset if upload fails
 */
export function getRenderUrl(image: PuzzleImage): string {
  if (image.type === 'asset') {
    // Static asset - use Vite-processed URL for web views
    return getPuzzleAssetUrl(image.source);
  } else {
    // User upload - use Reddit CDN URL
    return `https://i.redd.it/${image.source}.jpg`;
  }
}

/**
 * Check if image is valid/loadable
 */
export async function checkImageLoadable(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    
    img.src = url;
    
    // Timeout after 5 seconds
    setTimeout(() => resolve(false), 5000);
  });
}

/**
 * Get best available image with fallback
 */
export async function getBestAvailableImage(
  preferred: PuzzleImage | null,
  defaults: PuzzleImage[] = DEFAULT_IMAGES
): Promise<PuzzleImage> {
  // If no preferred image, use default
  if (!preferred) {
    const first = defaults[0];
    return first ?? FALLBACK_IMAGE;
  }
  
  // If preferred is an asset, use it directly
  if (preferred.type === 'asset') {
    return preferred;
  }
  
  // If preferred is an upload, check if it loads
  if (preferred.type === 'upload') {
    const url = getRenderUrl(preferred);
    const isValid = await checkImageLoadable(url);
    
    if (isValid) {
      return preferred;
    }
    
    // Fallback to default
    console.log('Uploaded image failed to load, using default');
    const firstDefault = defaults[0];
    return firstDefault ?? FALLBACK_IMAGE;
  }
  
  const first = defaults[0];
  return first ?? FALLBACK_IMAGE;
}
