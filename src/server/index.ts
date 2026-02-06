import express from 'express';
import { InitResponse, IncrementResponse, DecrementResponse } from '../shared/types/api';
import { redis, reddit, createServer, context, getServerPort } from '@devvit/web/server';
import { createPost } from './core/post';
import { getDailyPuzzleImage } from './puzzleSource';

const app = express();

// Middleware for JSON body parsing
app.use(express.json());
// Middleware for URL-encoded body parsing
app.use(express.urlencoded({ extended: true }));
// Middleware for plain text body parsing
app.use(express.text());

const router = express.Router();

router.get<{ postId: string }, InitResponse | { status: string; message: string }>(
  '/api/init',
  async (_req, res): Promise<void> => {
    const { postId } = context;

    if (!postId) {
      console.error('API Init Error: postId not found in devvit context');
      res.status(400).json({
        status: 'error',
        message: 'postId is required but missing from context',
      });
      return;
    }

    try {
      const [count, username] = await Promise.all([
        redis.get('count'),
        reddit.getCurrentUsername(),
      ]);

      res.json({
        type: 'init',
        postId: postId,
        count: count ? parseInt(count) : 0,
        username: username ?? 'anonymous',
      });
    } catch (error) {
      console.error(`API Init Error for post ${postId}:`, error);
      let errorMessage = 'Unknown error during initialization';
      if (error instanceof Error) {
        errorMessage = `Initialization failed: ${error.message}`;
      }
      res.status(400).json({ status: 'error', message: errorMessage });
    }
  }
);

router.post<{ postId: string }, IncrementResponse | { status: string; message: string }, unknown>(
  '/api/increment',
  async (_req, res): Promise<void> => {
    const { postId } = context;
    if (!postId) {
      res.status(400).json({
        status: 'error',
        message: 'postId is required',
      });
      return;
    }

    res.json({
      count: await redis.incrBy('count', 1),
      postId,
      type: 'increment',
    });
  }
);

router.post<{ postId: string }, DecrementResponse | { status: string; message: string }, unknown>(
  '/api/decrement',
  async (_req, res): Promise<void> => {
    const { postId } = context;
    if (!postId) {
      res.status(400).json({
        status: 'error',
        message: 'postId is required',
      });
      return;
    }

    res.json({
      count: await redis.incrBy('count', -1),
      postId,
      type: 'decrement',
    });
  }
);

// API endpoint to get the daily puzzle image
router.get<null, { imageUrl: string; uploader: string } | { status: string; message: string }>(
  '/api/daily-puzzle',
  async (_req, res): Promise<void> => {
    try {
      const puzzleImage = await getDailyPuzzleImage();
      res.json(puzzleImage);
    } catch (error) {
      console.error('API Daily Puzzle Error:', error);
      let errorMessage = 'Unknown error';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      res.status(400).json({ status: 'error', message: errorMessage });
    }
  }
);

// API endpoint to get saved puzzle image for a post
router.get<{ postId: string }, { imageUrl: string; uploader: string } | { status: string; message: string }>(
  '/api/puzzle-image',
  async (req, res): Promise<void> => {
    const { postId } = req.query;
    
    if (!postId || typeof postId !== 'string') {
      res.status(400).json({ status: 'error', message: 'postId is required' });
      return;
    }

    try {
      const imageUrl = await redis.get(`puzzleImage:${postId}`);
      const uploader = await redis.get(`puzzleUploader:${postId}`);

      if (imageUrl) {
        res.json({ imageUrl, uploader: uploader || '' });
      } else {
        res.json({ status: 'not_found', message: 'No puzzle image found for this post' });
      }
    } catch (error) {
      console.error('API Puzzle Image Error:', error);
      res.status(400).json({ status: 'error', message: 'Failed to get puzzle image' });
    }
  }
);

// API endpoint to save puzzle image for a post
interface SavePuzzleImageRequest {
  postId: string;
  imageUrl: string;
  uploader: string;
}

router.post<null, { status: string; message: string }, SavePuzzleImageRequest>(
  '/api/save-puzzle-image',
  async (req, res): Promise<void> => {
    const { postId, imageUrl, uploader } = req.body;

    if (!postId || !imageUrl) {
      res.status(400).json({ status: 'error', message: 'postId and imageUrl are required' });
      return;
    }

    try {
      // Save puzzle image and uploader with 1 year expiration
      await redis.set(`puzzleImage:${postId}`, imageUrl);
      await redis.set(`puzzleUploader:${postId}`, uploader);

      // Set expiration (1 year = 31536000 seconds)
      await redis.expire(`puzzleImage:${postId}`, 31536000);
      await redis.expire(`puzzleUploader:${postId}`, 31536000);

      console.log(`[API] Saved puzzle image for post ${postId}`);
      res.json({ status: 'success', message: 'Puzzle image saved' });
    } catch (error) {
      console.error('API Save Puzzle Image Error:', error);
      res.status(400).json({ status: 'error', message: 'Failed to save puzzle image' });
    }
  }
);

router.post('/internal/on-app-install', async (_req, res): Promise<void> => {
  try {
    const post = await createPost();

    res.json({
      status: 'success',
      message: `Post created in subreddit ${context.subredditName} with id ${post.id}`,
    });
  } catch (error) {
    console.error(`Error creating post: ${error}`);
    res.status(400).json({
      status: 'error',
      message: 'Failed to create post',
    });
  }
});

router.post('/internal/menu/post-create', async (_req, res): Promise<void> => {
  try {
    const post = await createPost();

    res.json({
      navigateTo: `https://reddit.com/r/${context.subredditName}/comments/${post.id}`,
    });
  } catch (error) {
    console.error(`Error creating post: ${error}`);
    res.status(400).json({
      status: 'error',
      message: 'Failed to create post',
    });
  }
});

// Use router middleware
app.use(router);

// Get port from environment variable with fallback
const port = getServerPort();

const server = createServer(app);
server.on('error', (err) => console.error(`server error; ${err.stack}`));
server.listen(port);
