/**
 * Shared question type and programmatically generated question bank (~500 questions).
 * Used by the puzzle engine with difficulty scaling, role diversity, and no repeats within a puzzle.
 */

/**
 * Question roles for diversity within a puzzle session.
 * Each role serves a different cognitive purpose.
 */
export type QuestionRole =
  | 'IDENTIFY'   // Basic identification questions
  | 'DETAIL'     // Questions about specific details
  | 'LOGIC'      // Logical reasoning questions
  | 'CONTEXT'    // Context-based questions
  | 'TRICK';     // Trick/puzzle questions

export type QuestionCategory = 'logic' | 'riddle' | 'pattern' | 'wordplay' | 'trick';

/**
 * Difficulty levels for progressive challenge.
 */
export type QuestionDifficulty = 1 | 2 | 3 | 4 | 5;

export type Question = {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
  category: QuestionCategory;
  difficulty: QuestionDifficulty;
  reusable: boolean;
  /** Optional role for diversity enforcement. Defaults to 'IDENTIFY' if not set. */
  role?: QuestionRole;
};

// --- Stopwords for semantic similarity guard ---
const STOPWORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare',
  'what', 'which', 'who', 'whom', 'whose', 'where', 'when', 'why',
  'how', 'in', 'on', 'at', 'by', 'for', 'with', 'about', 'against',
  'between', 'into', 'through', 'during', 'before', 'after', 'above',
  'below', 'to', 'from', 'up', 'down', 'out', 'off', 'over', 'under',
  'again', 'further', 'then', 'once', 'here', 'there', 'all', 'each',
  'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not',
  'only', 'own', 'same', 'so', 'than', 'too', 'very', 's', 't',
  'just', 'don', 'now', 'you', 'your', 'i', 'me', 'my', 'we', 'our',
]);

// --- Templates for programmatic generation (short, mobile-friendly) ---

const LOGIC_STEMS: string[] = [
  "What has keys but no locks?", "What gets wetter as it dries?", "What has hands but cannot clap?",
  "What has a head and tail but no body?", "What has one eye but cannot see?", "What has legs but cannot walk?",
  "What has a face but no eyes?", "What has a neck but no head?", "What has teeth but cannot bite?",
  "What has a thumb but no fingers?", "What has a ring but no finger?", "What has a bank but no money?",
  "What has a bed but never sleeps?", "What has a mouth but never talks?", "What has a foot but no legs?",
  "What runs but never walks?", "What has 13 hearts but no organs?", "What has a spine but no bones?",
  "What has leaves but is not a tree?", "What has a bottom at the top?", "What can you catch but not throw?",
  "What has four wheels and flies?", "What gets bigger the more you take away?",
  "What has many keys but cannot open locks?", "What has a head, a tail, is brown, and has no legs?",
  "What goes up when rain comes down?", "What has hands but cannot hold anything?",
  "What has a face that never frowns?", "What has a tongue but never talks?",
  "What has ears but cannot hear?", "What has a sole but no tongue?", "What has a bark but no bite?",
  "What has a crown but no head?", "What has a belt but no waist?", "What has a face and two hands?",
  "What has a stem but is not a flower?", "What has a cap but no head?",
  "What has a blade but is not a knife?", "What has a point but no end?", "What has a hole but holds water?",
];

const RIDDLE_STEMS: string[] = [
  "I speak without a mouth. What am I?", "What can you break without touching?",
  "What goes up and never comes down?", "What is full of holes but holds water?",
  "What comes once in a minute, twice in a moment?",
  "The more you take, the more you leave behind. What am I?",
  "What has cities but no houses?", "What has words but never speaks?",
  "What can travel around the world while staying in a corner?",
  "What has a heart that doesn't beat?", "What has a head and a tail but no body?",
  "What gets wetter the more it dries?", "What can you hold without touching?",
  "What has a face and two hands but no arms?", "What has a thumb and four fingers but is not alive?",
  "What has a neck but no head?", "What has an eye but cannot see?", "What has a spine but no bones?",
  "What has a foot but no legs?", "What has a mouth but never eats?",
  "What has a bed but never sleeps?", "What has a bank but no money?",
  "What has a ring but no finger?", "What has a tongue but never talks?",
  "What has ears but cannot hear?", "What runs but never gets tired?",
  "What has a sole but no tongue?", "What has a bark but no bite?",
  "What has leaves but is not a tree?", "What has a bottom at the top?",
  "What can you catch but not throw?", "What goes up when rain comes down?",
  "What has 13 hearts but no organs?", "What has hands but cannot clap?",
  "What has a face that never frowns?", "What has a crown but no head?",
  "What has a belt but no waist?", "What has a stem but is not a flower?",
  "What has a cap but no head?", "What has a blade but is not a knife?",
];

const PATTERN_STEMS: string[] = [
  "What comes next: 2, 4, 6, 8?", "What letter is missing: A, C, E, _?",
  "What number is one more than 99?", "How many sides does a hexagon have?",
  "What is 15 minus 7?", "What day comes after Tuesday?",
  "What month has 28 days?", "How many zeros in one thousand?",
  "What is half of 14?", "What comes before 100?",
  "How many legs do 3 cats have?", "What is 6 times 7?",
  "What letter comes after G?", "How many days in a week?",
  "What is 20 divided by 4?", "What shape has 4 equal sides?",
  "How many months in a year?", "What is 9 plus 8?",
  "What number is between 5 and 7?", "How many hours in a day?",
  "What is 12 minus 5?", "What comes next: 5, 10, 15, _?",
  "How many sides does a triangle have?", "What is 3 times 4?",
  "What letter is first in the alphabet?", "How many minutes in an hour?",
  "What is 100 minus 37?", "What comes before Saturday?",
  "How many legs does a spider have?", "What is 8 plus 9?",
  "What shape has no sides?", "How many seasons are there?",
  "What is 50 divided by 10?", "What number is missing: 1, 2, 3, _, 5?",
  "How many continents are there?", "What is 11 times 2?",
  "What letter is last in the alphabet?", "How many wheels on a bicycle?",
  "What is 25 plus 25?", "What comes next: 1, 1, 2, 3, 5?",
];

const WORDPLAY_STEMS: string[] = [
  "What word becomes shorter when you add two letters?",
  "What word is spelled wrong in every dictionary?",
  "What five-letter word has one left when two are removed?",
  "What word has k and e in it?", "What starts with T, ends with T, and has T in it?",
  "What word has three double letters in a row?", "What is at the end of everything?",
  "What word sounds the same when you remove 4 letters?",
  "What 4-letter word can be written forward or backward?",
  "What word has hundreds of letters?", "What begins with E and ends with E but has one letter?",
  "What common word has 4 vowels in a row?", "What word becomes a palindrome when you add one letter?",
  "What is the longest word in the dictionary?", "What word has five letters and sounds like one?",
  "What starts with P and ends with E and has a million letters?",
  "What word has three consecutive double letters?",
  "What 7-letter word has hundreds of letters?", "What word is always pronounced wrong?",
  "What has 4 letters, sometimes 9, never 5?", "What word looks the same upside down?",
  "What is the only word that grows when you add an s?", "What word has no vowels?",
  "What word has all the vowels in order?", "What common word has no vowels except y?",
  "What word becomes smaller when you add two letters?",
  "What 5-letter word has one left when 2 are removed?",
  "What word starts and ends with und?", "What word has 3 double letters in a row?",
  "What is the only 15-letter word with no repeated letter?",
  "What word has 4 letters and can be written forward, backward, upside down?",
  "What word sounds the same when you remove 5 letters?",
  "What word has 2 e's and 2 e's?",
  "What word in English has 9 letters and remains a word as you remove one?",
  "What word has 8 letters and is still a word as you remove one?",
  "What common word has 3 sets of double letters?",
  "What word has 4 letters and starts with gas?", "What word has 5 letters and ends in e?",
  "What word has 6 letters and when you take 1 away, 12 remain?",
  "What word has 4 letters and sometimes has 9?",
];

const TRICK_STEMS: string[] = [
  "How many months have 28 days?",
  "A plane crashes on the border of two countries. Where do they bury the survivors?",
  "How many animals did Moses take on the ark?", "What can you hold without touching?",
  "If you have me, you want to share me. If you share me, you don't have me. What am I?",
  "What disappears as soon as you say its name?", "I have no life but I can die. What am I?",
  "What gets broken without being held?", "What can run but never walks?",
  "What has 4 legs in the morning, 2 at noon, 3 at night?",
  "The person who makes it doesn't need it. The person who buys it doesn't use it. What is it?",
  "What can you keep after giving to someone?",
  "What has a head, a tail, is brown, and has no legs?",
  "What goes up and down but never moves?", "What has hands but cannot clap?",
  "What has a face and two hands but no arms or legs?", "What has one eye but cannot see?",
  "What has a neck but no head?", "What has teeth but cannot bite?",
  "What has a thumb and four fingers but is not alive?", "What has 13 hearts but no organs?",
  "What has a spine but no bones?", "What has a foot but no legs?",
  "What has a mouth but never eats?", "What has a bed but never sleeps?",
  "What has a bank but no money?", "What has a ring but no finger?",
  "What has a tongue but never talks?", "What has ears but cannot hear?",
  "What runs but never gets tired?", "What has a sole but no tongue?",
  "What has a bark but no bite?", "What has leaves but is not a tree?",
  "What has a bottom at the top?", "What can you catch but not throw?",
  "What goes up when rain comes down?", "What has a face that never frowns?",
  "What has a crown but no head?", "What has a belt but no waist?",
  "What has a stem but is not a flower?", "What has a cap but no head?",
];

const COMMON_WRONG_OPTIONS: string[] = [
  "Piano", "Map", "Clock", "Door", "Key", "Book", "Phone", "Glass",
  "Towel", "Water", "Ice", "Sun", "Moon", "Star", "Tree", "River",
  "Nothing", "Silence", "Echo", "Shadow", "Secret", "Promise", "Time",
  "Stamp", "Letter", "Coin", "Needle", "Button", "Bottle", "River",
  "Foot", "Hand", "Eye", "Ear", "Nose", "Mouth", "Head", "Tail",
  "Elephant", "Snake", "Fish", "Bird", "Dog", "Cat", "Mouse", "Frog",
  "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight",
  "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
  "Short", "Wrong", "Right", "Long", "Post office", "Coffin", "Moses", "Zero",
];

function buildOptionsDeterministic(seed: number, correct: string): { options: string[]; correctIndex: number } {
  const wrong = COMMON_WRONG_OPTIONS.filter((o) => o !== correct);
  
  // Build raw options array with guaranteed values
  const raw: string[] = [correct];
  
  if (wrong.length >= 3) {
    const seen = new Set<number>();
    for (let i = 0; seen.size < 3; i++) {
      const idx = Math.abs(seed + i * 17) % wrong.length;
      seen.add(idx);
    }
    let count = 0;
    for (const idx of seen) {
      raw.push(wrong[idx]!);
      count++;
      if (count >= 3) break;
    }
  } else {
    raw.push("None", "None", "None");
  }
  
  const options: string[] = [];
  const used = new Set<number>();
  for (let i = 0; i < 4; i++) {
    let j = Math.abs(seed + i * 13) % 4;
    while (used.has(j)) j = (j + 1) % 4;
    used.add(j);
    options.push(raw[j] ?? "None");
  }
  
  const correctIndex = options.indexOf(correct);
  return { options, correctIndex: correctIndex >= 0 ? correctIndex : 0 };
}

const LOGIC_CORRECT: string[] = [
  "Piano", "Towel", "Clock", "Coin", "Needle", "Compass", "Clock", "Bottle", "Comb",
  "Glove", "Ring", "River", "River", "Ruler", "Water", "Deck of cards",
  "Book", "Book", "Legs", "Cold", "Garbage truck", "Hole", "Piano", "Penny",
  "Umbrella", "Clock", "Clock", "Shoe", "Book", "Shoe", "Tree", "Crown",
  "Belt", "Clock", "Apple", "Bottle", "Blade of grass", "Needle", "Sponge",
];
const RIDDLE_CORRECT: string[] = [
  "Echo", "Promise", "Age", "Sponge", "Letter M", "Footsteps", "Map", "Book",
  "Stamp", "Artichoke", "Coin", "Towel", "Promise", "Clock", "Glove",
  "Book", "River", "Book", "Needle", "River", "Clock", "Book", "Ring",
  "Shoe", "River", "Stamp", "Clock", "Needle", "River", "Umbrella",
  "Shoe", "Tree", "Book", "Legs", "Clock", "Penny", "Echo", "Stamp",
  "Bottle", "Needle",
];
const PATTERN_CORRECT: string[] = [
  "10", "G", "100", "6", "8", "Wednesday", "All", "3", "7", "99",
  "12", "42", "H", "7", "5", "Square", "12", "17", "6", "24",
  "7", "20", "3", "12", "A", "60", "63", "Friday", "8", "17",
  "Circle", "4", "5", "4", "7", "6", "22", "2", "50", "8",
];
const WORDPLAY_CORRECT: string[] = [
  "Short", "Wrong", "Stone", "Take", "Teapot", "Bookkeeper", "G", "Queue",
  "Noon", "Post office", "Envelope", "Queue", "Palindrome", "Smiles",
  "Queue", "Post office", "Bookkeeper", "Post office", "Wrong", "What",
  "Noon", "Noise", "Rhythm", "Facetiously", "Myth", "Small", "Stone",
  "Understood", "Bookkeeper", "Uncopyrightable", "Noon", "Queue",
  "Ewe", "Abstentious", "Sprite", "Starting", "Gas", "Alone", "Dozens",
  "What", "Queue",
];
const TRICK_CORRECT: string[] = [
  "All", "Nowhere", "None", "Your breath", "Secret", "Silence", "Battery",
  "Promise", "Water", "Man", "Coffin", "Your word", "Penny", "Stairs",
  "Clock", "Clock", "Bottle", "Glove", "Deck of cards", "River", "Book",
  "Ring", "Shoe", "River", "Stamp", "Clock", "Needle", "River",
  "Umbrella", "Shoe", "Tree", "Book", "Legs", "Clock", "Penny", "Echo",
  "Stamp", "Bottle", "Needle", "Apple",
];

type CategoryConfig = {
  category: QuestionCategory;
  stems: string[];
  correct: string[];
  defaultRole: QuestionRole;
};

const CATEGORIES: CategoryConfig[] = [
  { category: "logic", stems: LOGIC_STEMS, correct: LOGIC_CORRECT, defaultRole: 'IDENTIFY' },
  { category: "riddle", stems: RIDDLE_STEMS, correct: RIDDLE_CORRECT, defaultRole: 'CONTEXT' },
  { category: "pattern", stems: PATTERN_STEMS, correct: PATTERN_CORRECT, defaultRole: 'IDENTIFY' },
  { category: "wordplay", stems: WORDPLAY_STEMS, correct: WORDPLAY_CORRECT, defaultRole: 'LOGIC' },
  { category: "trick", stems: TRICK_STEMS, correct: TRICK_CORRECT, defaultRole: 'TRICK' },
];

function generateQuestionBank(): Question[] {
  const bank: Question[] = [];
  let id = 0;

  for (const cat of CATEGORIES) {
    const stemsLen = cat.stems.length;
    const correctLen = cat.correct.length;
    
    for (let i = 0; i < stemsLen; i += 1) {
      const stem = cat.stems[i]!;
      const correctAnswer = i < correctLen ? cat.correct[i]! : "None";
      const { options, correctIndex } = buildOptionsDeterministic(id, correctAnswer);
      const difficulty = (id % 5) + 1 as QuestionDifficulty;
      bank.push({
        id: `q-${id}`,
        text: stem,
        options,
        correctIndex,
        category: cat.category,
        difficulty,
        reusable: true,
        role: cat.defaultRole,
      });
      id += 1;
    }
  }

  const target = 500;
  while (bank.length < target) {
    const catIdx = bank.length % CATEGORIES.length;
    const cat = CATEGORIES[catIdx]!;
    const stemIdx = bank.length % cat.stems.length;
    const stem = cat.stems[stemIdx]!;
    const correctAnswer = stemIdx < cat.correct.length ? cat.correct[stemIdx]! : "None";
    const { options, correctIndex } = buildOptionsDeterministic(bank.length, correctAnswer);
    const difficulty = (bank.length % 5) + 1 as QuestionDifficulty;
    bank.push({
      id: `q-${bank.length}`,
      text: stem,
      options,
      correctIndex,
      category: cat.category,
      difficulty,
      reusable: true,
      role: cat.defaultRole,
    });
  }

  return bank;
}

export const QUESTION_BANK: Question[] = generateQuestionBank();

export function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = arr[i];
    arr[i] = arr[j] as T;
    arr[j] = temp as T;
  }
  return arr;
}

function shuffleOptions(q: Question): Question {
  const indices = [0, 1, 2, 3];
  shuffle(indices);
  const newOptions: string[] = [];
  for (const idx of indices) {
    const opt = q.options[idx];
    if (opt !== undefined) newOptions.push(opt);
  }
  const newCorrectIndex = indices.indexOf(q.correctIndex);
  return {
    ...q,
    options: newOptions,
    correctIndex: newCorrectIndex >= 0 ? newCorrectIndex : 0,
  };
}

export type TileQuestionAssignment = {
  tileIndex: number;
  question: Question;
};

function extractKeywords(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 1 && !STOPWORDS.has(word))
  );
}

function countSharedKeywords(text1: string, text2: string): number {
  const keywords1 = extractKeywords(text1);
  const keywords2 = extractKeywords(text2);
  let shared = 0;
  for (const keyword of keywords1) {
    if (keywords2.has(keyword)) {
      shared += 1;
    }
  }
  return shared;
}

function isTooSimilar(newQuestion: Question, selected: Question[], maxShared: number = 3): boolean {
  for (const existing of selected) {
    if (countSharedKeywords(newQuestion.text, existing.text) > maxShared) {
      return true;
    }
  }
  return false;
}

export function difficultyLevelName(diff: QuestionDifficulty): string {
  if (diff <= 1) return 'EASY';
  if (diff <= 2) return 'EASY-MEDIUM';
  if (diff <= 3) return 'MEDIUM';
  if (diff <= 4) return 'MEDIUM-HARD';
  return 'HARD';
}

function difficultyForPosition(position: number, totalTiles: number): [number, number] {
  if (position === 0) return [1, 2];
  if (position === 1) return [2, 3];
  if (position === 2) return [3, 4];
  if (totalTiles <= 9) return [3, 4];
  return [3, 5];
}

function getRandomItem<T>(arr: T[], rng: (() => number) | null): T | undefined {
  if (arr.length === 0) return undefined;
  const idx = rng ? Math.floor(rng() * arr.length) : Math.floor(Math.random() * arr.length);
  return arr[idx];
}

export function generatePuzzleQuestions(
  matrixSize: number,
  usedQuestionIds: Set<string>,
  seed?: number
): TileQuestionAssignment[] {
  const totalTiles = matrixSize * matrixSize;
  const rng = seed !== undefined ? createSeededRNG(seed) : null;
  
  const usedRoles = new Set<QuestionRole>();
  const selectedQuestions: Question[] = [];
  const usedInThisPuzzle = new Set<string>();
  
  const questionsByRole = new Map<QuestionRole, Question[]>();
  for (const q of QUESTION_BANK) {
    const role = q.role ?? 'IDENTIFY';
    const list = questionsByRole.get(role) ?? [];
    list.push(q);
    questionsByRole.set(role, list);
  }
  
  const allRoles: QuestionRole[] = ['IDENTIFY', 'DETAIL', 'LOGIC', 'CONTEXT', 'TRICK'];
  if (rng) {
    shuffleArray(rng, allRoles);
  } else {
    shuffle(allRoles);
  }
  
  const assignments: TileQuestionAssignment[] = [];
  
  for (let tileIndex = 0; tileIndex < totalTiles; tileIndex += 1) {
    const [minDiff, maxDiff] = difficultyForPosition(tileIndex, totalTiles);
    
    const difficultyPool = QUESTION_BANK.filter(q => 
      q.difficulty >= minDiff && q.difficulty <= maxDiff
    );
    
    let chosen: Question | undefined = undefined;
    
    for (const role of allRoles) {
      if (usedRoles.has(role)) continue;
      
      const roleQuestions = questionsByRole.get(role) ?? [];
      const candidates = roleQuestions.filter(q => 
        !usedInThisPuzzle.has(q.id) && 
        (!usedQuestionIds.has(q.id) || q.reusable) &&
        q.difficulty >= minDiff && q.difficulty <= maxDiff &&
        !isTooSimilar(q, selectedQuestions, 3)
      );
      
      if (candidates.length > 0) {
        chosen = getRandomItem(candidates, rng) ?? candidates[0]!;
        usedRoles.add(role);
        break;
      }
    }
    
    if (!chosen) {
      const candidates = difficultyPool.filter(q => 
        !usedInThisPuzzle.has(q.id) && 
        (!usedQuestionIds.has(q.id) || q.reusable) &&
        !isTooSimilar(q, selectedQuestions, 3)
      );
      
      if (candidates.length > 0) {
        chosen = getRandomItem(candidates, rng) ?? candidates[0]!;
      }
    }
    
    if (!chosen) {
      const candidates = difficultyPool.filter(q => 
        !usedInThisPuzzle.has(q.id) && 
        (!usedQuestionIds.has(q.id) || q.reusable)
      );
      
      if (candidates.length > 0) {
        chosen = getRandomItem(candidates, rng) ?? candidates[0]!;
      }
    }
    
    if (!chosen) {
      const allUnused = QUESTION_BANK.filter(q => !usedInThisPuzzle.has(q.id));
      if (allUnused.length > 0) {
        chosen = getRandomItem(allUnused, rng) ?? allUnused[0]!;
      }
    }
    
    if (chosen) {
      usedInThisPuzzle.add(chosen.id);
      usedQuestionIds.add(chosen.id);
      selectedQuestions.push(chosen);
      assignments.push({ tileIndex, question: shuffleOptions(chosen) });
    }
  }
  
  if (rng) {
    shuffleArray(rng, assignments);
  } else {
    shuffle(assignments);
  }
  
  return assignments.map((a, idx) => ({ ...a, tileIndex: idx }));
}

function createSeededRNG(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

function shuffleArray<T>(rng: () => number, arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const temp = arr[i];
    arr[i] = arr[j] as T;
    arr[j] = temp as T;
  }
}

export function generatePuzzleQuestionsLegacy(
  matrixSize: number,
  usedQuestionIds: Set<string>
): TileQuestionAssignment[] {
  const totalTiles = matrixSize * matrixSize;
  const [minDiff, maxDiff] = (() => {
    if (matrixSize <= 3) return [1, 2] as [number, number];
    if (matrixSize <= 4) return [2, 3] as [number, number];
    return [3, 5] as [number, number];
  })();

  const byDifficulty = new Map<number, Question[]>();
  for (let d = minDiff; d <= maxDiff; d += 1) {
    byDifficulty.set(d, QUESTION_BANK.filter((q) => q.difficulty === d));
  }

  const usedInThisPuzzle = new Set<string>();
  const assignments: TileQuestionAssignment[] = [];

  for (let tileIndex = 0; tileIndex < totalTiles; tileIndex += 1) {
    const row = Math.floor(tileIndex / matrixSize);
    const col = tileIndex % matrixSize;
    const center = (matrixSize - 1) / 2;
    const dist = Math.max(Math.abs(row - center), Math.abs(col - center));
    const diffLevel = Math.min(
      maxDiff,
      minDiff + Math.floor((dist / Math.ceil(matrixSize / 2)) * (maxDiff - minDiff + 1))
    );
    const difficulty = Math.max(minDiff, Math.min(maxDiff, diffLevel));

    const pool = byDifficulty.get(difficulty) ?? byDifficulty.get(minDiff) ?? [];
    let candidates = pool.filter(
      (q) => !usedInThisPuzzle.has(q.id) && (!usedQuestionIds.has(q.id) || q.reusable)
    );
    if (candidates.length === 0) {
      candidates = pool.filter((q) => !usedInThisPuzzle.has(q.id));
    }
    if (candidates.length === 0) {
      candidates = QUESTION_BANK.filter((q) => !usedInThisPuzzle.has(q.id));
    }

    const chosen = candidates[Math.floor(Math.random() * candidates.length)];
    if (!chosen) continue;

    usedInThisPuzzle.add(chosen.id);
    usedQuestionIds.add(chosen.id);
    assignments.push({ tileIndex, question: shuffleOptions(chosen) });
  }

  return assignments.sort((a, b) => a.tileIndex - b.tileIndex);
}
