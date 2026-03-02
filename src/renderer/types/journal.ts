export interface JournalEntry {
  id: number;
  title: string;
  content: string | null;
  mood: JournalMood;
  date: string;
  tags: string | null;
  weather: string | null;
  created_at: string;
  updated_at: string;
}

export type JournalMood = 'amazing' | 'good' | 'okay' | 'bad' | 'terrible';

export const moodEmojis: Record<JournalMood, { emoji: string; label: string; color: string }> = {
  amazing: { emoji: '😄', label: 'Amazing', color: 'text-green-400' },
  good: { emoji: '🙂', label: 'Good', color: 'text-blue-400' },
  okay: { emoji: '😐', label: 'Okay', color: 'text-yellow-400' },
  bad: { emoji: '😔', label: 'Bad', color: 'text-orange-400' },
  terrible: { emoji: '😢', label: 'Terrible', color: 'text-red-400' },
};

export const weatherIcons = [
  { icon: '☀️', label: 'Sunny' },
  { icon: '⛅', label: 'Partly Cloudy' },
  { icon: '☁️', label: 'Cloudy' },
  { icon: '🌧️', label: 'Rainy' },
  { icon: '⛈️', label: 'Stormy' },
  { icon: '❄️', label: 'Snowy' },
  { icon: '🌤️', label: 'Clear' },
];
