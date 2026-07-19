import { Badge, LeaderboardEntry, PartOfSpeech, Progress, Word } from './models';

export const POS_COLORS: Record<PartOfSpeech, string> = {
  noun: '#10a19a',
  verb: '#e7695b',
  adjective: '#f2a93b',
  phrase: '#7c6bc4',
  adverb: '#0b6e6a',
};

export const VOCAB: Word[] = [];

export const BADGES: Badge[] = [
  {
    id: 'first-steps',
    title: 'First Steps',
    icon: '🌱',
    description: 'Review your very first word.',
    isEarned: (p) => Object.keys(p.mastery).length > 0,
  },
  {
    id: 'word-wizard',
    title: 'Word Wizard',
    icon: '🧙',
    description: 'Master 10 words.',
    isEarned: (p) => Object.values(p.mastery).filter((s) => s === 'mastered').length >= 10,
  },
  {
    id: 'streak-keeper',
    title: 'Streak Keeper',
    icon: '🔥',
    description: 'Reach a 7-day streak.',
    isEarned: (p) => p.streak >= 7,
  },
  {
    id: 'perfect-quiz',
    title: 'Perfect Quiz',
    icon: '🎯',
    description: 'Get a perfect score in Speed Quiz.',
    isEarned: (p) => !!p.bests.quiz && p.bests.quiz.total > 0 && p.bests.quiz.score === p.bests.quiz.total,
  },
  {
    id: 'deck-builder',
    title: 'Deck Builder',
    icon: '📁',
    description: 'Create your first custom deck.',
    isEarned: (_p, folders) => folders.length > 0,
  },
  {
    id: 'polyglot',
    title: 'Polyglot',
    icon: '🌐',
    description: 'Master 25 words.',
    isEarned: (p) => Object.values(p.mastery).filter((s) => s === 'mastered').length >= 25,
  },
  {
    id: 'match-master',
    title: 'Match Master',
    icon: '🧩',
    description: 'Get a perfect score in Word Match.',
    isEarned: (p) => !!p.bests.match && p.bests.match.total > 0 && p.bests.match.score === p.bests.match.total,
  },
  {
    id: 'point-collector',
    title: 'Point Collector',
    icon: '💎',
    description: 'Earn 500 points.',
    isEarned: (p) => p.points >= 500,
  },
];

export const LEADERBOARD: LeaderboardEntry[] = [
  { name: 'Pim', points: 890 },
  { name: 'Nong', points: 740 },
  { name: 'Aom', points: 610 },
  { name: 'Beam', points: 520 },
  { name: 'Ploy', points: 410 },
];
