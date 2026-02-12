/**
 * Puzzora Puzzle Images
 * 
 * CURRENTLY USING (for testing):
 *   - /splash/background.png
 *   - /splash/logo.png
 *   - /puzzora-icon.svg
 * 
 * FOR PRODUCTION:
 * Add your puzzle images to: /assets/puzzle-images/
 * 
 * Example folder structure:
 *   /assets/puzzle-images/puzzle-1.png  (800x800 recommended)
 *   /assets/puzzle-images/puzzle-2.png
 *   /assets/puzzle-images/puzzle-3.png
 * 
 * IMAGE REQUIREMENTS:
 * - Format: PNG or JPG
 * - Size: 800x800 pixels (square) recommended
 * - Max: 5MB per file
 * 
 * TO USE YOUR IMAGES:
 * 1. Add PNG/JPG files to /assets/puzzle-images/
 * 2. Update code to reference: /puzzle-images/puzzle-X.png
 * 3. Rebuild the app
 * 
 * ROTATION LOGIC:
 * - Images cycle: 1 → 2 → 3 → ... → n → 1 → ...
 * - Index stored in Redis: puzzora:image:index
 * - Same image for all users (persistent)
 */
