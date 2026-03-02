export interface Habit {
  id: number;
  name: string;
  description: string | null;
  frequency: 'daily' | 'weekly' | 'monthly';
  color: HabitColor;
  icon: string;
  target_count: number;
  current_streak: number;
  best_streak: number;
  created_at: string;
  updated_at: string;
}

export interface HabitCompletion {
  id: number;
  habit_id: number;
  completed_date: string;
  count: number;
  created_at: string;
}

export type HabitColor = 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'pink' | 'yellow' | 'teal';

export const habitColorClasses: Record<HabitColor, { bg: string; border: string; text: string; ring: string }> = {
  blue: {
    bg: 'bg-blue-500/20',
    border: 'border-blue-500/50',
    text: 'text-blue-400',
    ring: 'ring-blue-500',
  },
  green: {
    bg: 'bg-green-500/20',
    border: 'border-green-500/50',
    text: 'text-green-400',
    ring: 'ring-green-500',
  },
  purple: {
    bg: 'bg-purple-500/20',
    border: 'border-purple-500/50',
    text: 'text-purple-400',
    ring: 'ring-purple-500',
  },
  orange: {
    bg: 'bg-orange-500/20',
    border: 'border-orange-500/50',
    text: 'text-orange-400',
    ring: 'ring-orange-500',
  },
  red: {
    bg: 'bg-red-500/20',
    border: 'border-red-500/50',
    text: 'text-red-400',
    ring: 'ring-red-500',
  },
  pink: {
    bg: 'bg-pink-500/20',
    border: 'border-pink-500/50',
    text: 'text-pink-400',
    ring: 'ring-pink-500',
  },
  yellow: {
    bg: 'bg-yellow-500/20',
    border: 'border-yellow-500/50',
    text: 'text-yellow-400',
    ring: 'ring-yellow-500',
  },
  teal: {
    bg: 'bg-teal-500/20',
    border: 'border-teal-500/50',
    text: 'text-teal-400',
    ring: 'ring-teal-500',
  },
};

export const habitIcons = [
  '💪', '🏃', '📚', '💧', '🧘', '💤', '🥗', '💊',
  '🎯', '✍️', '🎨', '🎵', '🌱', '🧠', '❤️', '⭐',
];
