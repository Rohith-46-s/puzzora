import React, { useState, useEffect, useCallback, useMemo } from "react";

// ============================================================================
// TYPES
// ============================================================================

interface DevvitContext {
  userId?: string;
  userName?: string;
  post?: {
    id: string;
    authorId: string;
  };
  redis: {
    get: (key: string) => Promise<string | null>;
    set: (key: string, value: string) => Promise<void>;
  };
  reddit: {
    uploadMedia: (opts: { file: Uint8Array; mimeType: string }) => Promise<{ mediaUrl?: string }>;
  };
}

interface AppProps {
  context: DevvitContext;
}

interface Question {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
}

interface LeaderboardEntry {
  userId: string;
  username: string;
  timeMs: number;
}

interface PuzzleState {
  imageUrl: string;
  uploaderId: string;
  leaderboard: LeaderboardEntry[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

const STORAGE_KEY = "puzzora:state";
const MAX_HEARTS = 5;
const GRID_SIZE = 3;

// Questions - brain-test style, neutral
const QUESTIONS: Question[] = [
  { id: "q1", prompt: "What has keys but no locks?", options: ["Piano", "Map", "Keyboard", "Door"], correctIndex: 2 },
  { id: "q2", prompt: "What gets wet while drying?", options: ["Towel", "Water", "Ice", "Sponge"], correctIndex: 0 },
  { id: "q3", prompt: "What has a head and tail but no body?", options: ["Coin", "Snake", "Arrow", "List"], correctIndex: 0 },
  { id: "q4", prompt: "What comes once in a minute?", options: ["Moon", "Second", "Letter M", "Bus"], correctIndex: 2 },
  { id: "q5", prompt: "What has many teeth but cannot bite?", options: ["Comb", "Saw", "Alligator", "Zipper"], correctIndex: 3 },
  { id: "q6", prompt: "What is full of holes but holds water?", options: ["Bucket", "Sponge", "Net", "Strainer"], correctIndex: 1 },
  { id: "q7", prompt: "What goes up but never down?", options: ["Age", "Balloon", "Smoke", "Temperature"], correctIndex: 0 },
  { id: "q8", prompt: "What has cities but no houses?", options: ["Map", "World", "Country", "State"], correctIndex: 0 },
  { id: "q9", prompt: "What can you break without touching?", options: ["Promise", "Glass", "Heart", "Rule"], correctIndex: 0 },
];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function getRandomQuestions(count: number): Question[] {
  const shuffled = [...QUESTIONS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

async function loadState(context: DevvitContext): Promise<PuzzleState | null> {
  try {
    const raw = await context.redis.get(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PuzzleState;
  } catch (e) {
    console.error("Failed to load state:", e);
    return null;
  }
}

async function saveState(context: DevvitContext, state: PuzzleState): Promise<void> {
  try {
    await context.redis.set(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error("Failed to save state:", e);
  }
}

async function initializePuzzle(context: DevvitContext, imageUrl: string): Promise<PuzzleState> {
  const state: PuzzleState = {
    imageUrl,
    uploaderId: context.userId || "unknown",
    leaderboard: [],
  };
  await saveState(context, state);
  return state;
}

async function recordCompletion(
  context: DevvitContext,
  timeMs: number
): Promise<PuzzleState> {
  const state = await loadState(context);
  if (!state) throw new Error("Puzzle not initialized");

  const userId = context.userId || "unknown";
  const username = context.userName || "anonymous";

  const existingIndex = state.leaderboard.findIndex((e) => e.userId === userId);
  if (existingIndex === -1) {
    state.leaderboard.push({ userId, username, timeMs });
  } else {
    const current = state.leaderboard[existingIndex];
    if (current && timeMs < current.timeMs) {
      state.leaderboard[existingIndex] = { userId, username, timeMs };
    }
  }

  state.leaderboard.sort((a, b) => a.timeMs - b.timeMs);
  state.leaderboard = state.leaderboard.slice(0, 5);

  await saveState(context, state);
  return state;
}

// ============================================================================
// STYLES
// ============================================================================

const styles = {
  container: {
    padding: "12px",
    background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
    borderRadius: "12px",
    color: "#e8e8e8",
    fontFamily: "system-ui, -apple-system, sans-serif",
    minHeight: "300px",
  } as const,

  header: {
    marginBottom: "12px",
  } as const,

  title: {
    fontSize: "18px",
    fontWeight: "bold",
    marginBottom: "4px",
  } as const,

  subtitle: {
    fontSize: "12px",
    opacity: 0.7,
  } as const,

  uploadButton: {
    width: "100%",
    padding: "12px 16px",
    borderRadius: "8px",
    border: "none",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    color: "white",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
  } as const,

  uploadInput: {
    display: "none",
  } as const,

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "4px",
    marginTop: "12px",
  } as const,

  tile: {
    position: "relative" as const,
    width: "100%",
    paddingBottom: "100%",
    borderRadius: "6px",
    overflow: "hidden",
  } as const,

  tileOverlay: {
    position: "absolute" as const,
    inset: 0,
    display: "flex",
    flexDirection: "column" as const,
    justifyContent: "center",
    alignItems: "center",
    padding: "8px",
    background: "rgba(0, 0, 0, 0.85)",
    fontSize: "11px",
    textAlign: "center" as const,
  } as const,

  optionBtn: {
    width: "100%",
    marginTop: "4px",
    padding: "6px 8px",
    borderRadius: "4px",
    border: "none",
    background: "rgba(255, 255, 255, 0.1)",
    color: "#e8e8e8",
    fontSize: "10px",
    cursor: "pointer",
  } as const,

  hearts: {
    display: "flex",
    gap: "4px",
    marginTop: "8px",
    fontSize: "16px",
  } as const,

  heart: {
    color: "#ff6b6b",
  } as const,

  heartEmpty: {
    color: "#4a4a4a",
  } as const,

  status: {
    marginTop: "8px",
    fontSize: "12px",
    textAlign: "center" as const,
    opacity: 0.8,
  } as const,

  leaderboard: {
    marginTop: "16px",
    padding: "12px",
    background: "rgba(0, 0, 0, 0.3)",
    borderRadius: "8px",
  } as const,

  leaderboardTitle: {
    fontSize: "12px",
    fontWeight: "bold",
    marginBottom: "8px",
  } as const,

  leaderboardEntry: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "11px",
    padding: "4px 0",
  } as const,

  placeholder: {
    textAlign: "center" as const,
    padding: "40px 20px",
    color: "#888",
  } as const,

  error: {
    padding: "16px",
    background: "rgba(255, 0, 0, 0.1)",
    borderRadius: "8px",
    color: "#ff6b6b",
    fontSize: "12px",
  } as const,
};

// ============================================================================
// TILE COMPONENT
// ============================================================================

interface TileProps {
  imageUrl: string;
  index: number;
  row: number;
  col: number;
  question: Question;
  isRevealed: boolean;
  disabled: boolean;
  onCorrect: () => void;
  onWrong: () => void;
}

function Tile({ imageUrl, index, row, col, question, isRevealed, disabled, onCorrect, onWrong }: TileProps) {
  const bgPosition = `${col * 50}% ${row * 50}%`;

  const handleOptionClick = (optionIndex: number) => {
    if (disabled || isRevealed) return;
    if (optionIndex === question.correctIndex) {
      onCorrect();
    } else {
      onWrong();
    }
  };

  return (
    <div
      style={{
        ...styles.tile,
        backgroundImage: `url(${imageUrl})`,
        backgroundSize: "300% 300%",
        backgroundPosition: bgPosition,
      }}
    >
      {!isRevealed && (
        <div style={styles.tileOverlay}>
          <div style={{ marginBottom: "4px", fontWeight: "600" }}>{question.prompt}</div>
          {question.options.map((option, i) => (
            <button
              key={i}
              style={styles.optionBtn}
              onClick={() => handleOptionClick(i)}
              disabled={disabled}
            >
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// GRID COMPONENT
// ============================================================================

interface GridProps {
  imageUrl: string;
  questions: Question[];
  revealed: boolean[];
  hearts: number;
  onCorrect: (index: number) => void;
  onWrong: (index: number) => void;
}

function Grid({ imageUrl, questions, revealed, hearts, onCorrect, onWrong }: GridProps) {
  const tiles = Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, i) => ({
    index: i,
    row: Math.floor(i / GRID_SIZE),
    col: i % GRID_SIZE,
  }));

  const allRevealed = revealed.every(Boolean);

  return (
    <div>
      <div style={styles.hearts}>
        {Array.from({ length: MAX_HEARTS }).map((_, i) => (
          <span key={i} style={i < hearts ? styles.heart : styles.heartEmpty}>
            ♥
          </span>
        ))}
      </div>
      <div style={{ ...styles.grid, gap: allRevealed ? "0px" : "4px" }}>
        {tiles.map(({ index, row, col }) => {
          const q = questions[index];
          const r = revealed[index];
          if (!q || r === undefined) return null;
          return (
            <Tile
              key={index}
              imageUrl={imageUrl}
              index={index}
              row={row}
              col={col}
              question={q}
              isRevealed={r}
              disabled={hearts <= 0}
              onCorrect={() => onCorrect(index)}
              onWrong={() => onWrong(index)}
            />
          );
        })}
      </div>
      {allRevealed && (
        <div style={styles.status}>Puzzle Complete!</div>
      )}
    </div>
  );
}

// ============================================================================
// LEADERBOARD COMPONENT
// ============================================================================

interface LeaderboardProps {
  entries: LeaderboardEntry[];
}

function Leaderboard({ entries }: LeaderboardProps) {
  if (entries.length === 0) {
    return null;
  }

  return (
    <div style={styles.leaderboard}>
      <div style={styles.leaderboardTitle}>Top Solvers</div>
      {entries.map((entry, i) => (
        <div key={entry.userId} style={styles.leaderboardEntry}>
          <span>#{i + 1} {entry.username}</span>
          <span>{formatTime(entry.timeMs)}</span>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// UPLOAD COMPONENT
// ============================================================================

interface UploadProps {
  context: DevvitContext;
  onUploaded: (imageUrl: string) => void;
}

function Upload({ context, onUploaded }: UploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const data = new Uint8Array(arrayBuffer);
      const mimeType = file.type || "image/png";

      const result = await context.reddit.uploadMedia({ file: data, mimeType });
      const mediaUrl = (result as { mediaUrl?: string }).mediaUrl;

      if (!mediaUrl) {
        throw new Error("No URL returned from upload");
      }

      onUploaded(mediaUrl);
    } catch (err) {
      console.error("Upload failed:", err);
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <div style={styles.placeholder}>
        <p style={{ marginBottom: "16px" }}>Upload an image to start the puzzle</p>
        <button
          style={{
            ...styles.uploadButton,
            opacity: uploading ? 0.6 : 1,
          }}
          onClick={() => document.getElementById("puzzora-upload")?.click()}
          disabled={uploading}
        >
          {uploading ? "Uploading..." : "Choose Image"}
        </button>
        <input
          id="puzzora-upload"
          type="file"
          accept="image/*"
          style={styles.uploadInput}
          onChange={handleFileChange}
        />
        {error && <div style={{ ...styles.error, marginTop: "12px" }}>{error}</div>}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN APP COMPONENT
// ============================================================================

export default function App({ context }: AppProps) {
  // Defensive: validate context
  if (!context) {
    return (
      <div style={styles.container}>
        <div style={styles.placeholder}>Initializing...</div>
      </div>
    );
  }

  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<PuzzleState | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Game state
  const [questions, setQuestions] = useState<Question[]>([]);
  const [revealed, setRevealed] = useState<boolean[]>([]);
  const [hearts, setHearts] = useState(MAX_HEARTS);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [completed, setCompleted] = useState(false);

  // Computed values
  const isAuthor = context.userId === state?.uploaderId;
  const canPlay = state && state.imageUrl && !isAuthor && !completed;

  // Load puzzle state on mount
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const loaded = await loadState(context);
        if (!cancelled) {
          setState(loaded);
          if (loaded?.imageUrl) {
            setQuestions(getRandomQuestions(GRID_SIZE * GRID_SIZE));
            setRevealed(new Array(GRID_SIZE * GRID_SIZE).fill(false));
            setHearts(MAX_HEARTS);
          }
        }
      } catch (err) {
        console.error("Failed to load:", err);
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [context]);

  // Handle puzzle completion
  useEffect(() => {
    if (!canPlay || !revealed.length) return;

    const allRevealed = revealed.every(Boolean);
    if (!allRevealed || !startTime) return;

    const record = async () => {
      try {
        const timeMs = Date.now() - startTime;
        await recordCompletion(context, timeMs);
        const updated = await loadState(context);
        setState(updated);
        setCompleted(true);
      } catch (err) {
        console.error("Failed to record completion:", err);
      }
    };

    record();
  }, [revealed, canPlay, startTime, context]);

  const handleImageUploaded = async (imageUrl: string) => {
    try {
      const newState = await initializePuzzle(context, imageUrl);
      setState(newState);
      setQuestions(getRandomQuestions(GRID_SIZE * GRID_SIZE));
      setRevealed(new Array(GRID_SIZE * GRID_SIZE).fill(false));
      setHearts(MAX_HEARTS);
      setStartTime(null);
      setCompleted(false);
    } catch (err) {
      console.error("Failed to initialize:", err);
      setError(err instanceof Error ? err.message : "Failed to save");
    }
  };

  const handleCorrect = (index: number) => {
    setRevealed((prev) => {
      const next = [...prev];
      next[index] = true;
      return next;
    });
    setStartTime((prev) => (prev === null ? Date.now() : prev));
  };

  const handleWrong = () => {
    setHearts((prev) => Math.max(0, prev - 1));
  };

  const handleRestart = () => {
    setQuestions(getRandomQuestions(GRID_SIZE * GRID_SIZE));
    setRevealed(new Array(GRID_SIZE * GRID_SIZE).fill(false));
    setHearts(MAX_HEARTS);
    setStartTime(null);
    setCompleted(false);
  };

  // Loading state
  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.placeholder}>Loading PUZZORA...</div>
      </div>
    );
  }

  // Error state
  if (error && !state) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>{error}</div>
      </div>
    );
  }

  // No puzzle yet - show upload to author
  if (!state?.imageUrl) {
    if (context.userId === context.post?.authorId) {
      return (
        <div style={styles.container}>
          <div style={styles.header}>
            <div style={styles.title}>PUZZORA</div>
            <div style={styles.subtitle}>Create a puzzle for others to solve</div>
          </div>
          <Upload context={context} onUploaded={handleImageUploaded} />
        </div>
      );
    }

    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.title}>PUZZORA</div>
          <div style={styles.subtitle}>Waiting for puzzle...</div>
        </div>
        <div style={styles.placeholder}>
          The post author has not created a puzzle yet.
        </div>
      </div>
    );
  }

  // Author view - show leaderboard only
  if (isAuthor) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.title}>PUZZORA</div>
          <div style={styles.subtitle}>You created this puzzle</div>
        </div>
        <div style={styles.placeholder}>
          Others are solving your puzzle!
        </div>
        <Leaderboard entries={state.leaderboard} />
      </div>
    );
  }

  // Completed view
  if (completed) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.title}>PUZZORA</div>
          <div style={styles.subtitle}>You solved it!</div>
        </div>
        <Leaderboard entries={state.leaderboard} />
      </div>
    );
  }

  // Player view - show puzzle
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.title}>PUZZORA</div>
        <div style={styles.subtitle}>Solve all tiles to reveal the image</div>
      </div>

      {hearts <= 0 && (
        <div style={{ ...styles.error, marginBottom: "12px" }}>
          Out of hearts! Try again.
        </div>
      )}

      <Grid
        imageUrl={state.imageUrl}
        questions={questions}
        revealed={revealed}
        hearts={hearts}
        onCorrect={handleCorrect}
        onWrong={handleWrong}
      />

      <button
        style={{
          ...styles.optionBtn,
          marginTop: "12px",
          width: "100%",
          background: "rgba(255, 255, 255, 0.1)",
        }}
        onClick={handleRestart}
      >
        Restart
      </button>

      <Leaderboard entries={state.leaderboard} />
    </div>
  );
}
"// MANUAL TEST" 
