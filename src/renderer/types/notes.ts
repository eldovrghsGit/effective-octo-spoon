export interface Note {
  id: number;
  title: string;
  content: string | null;
  tags: string | null;
  is_pinned: boolean;
  color: NoteColor;
  note_type: 'regular' | 'daily_planner' | 'weekly_planner_archive';
  date: string | null; // For daily planner notes - stores week start date
  week_start_date?: string | null; // Week start date (Sunday) for weekly planners
  checklist_items: ChecklistItem[] | null; // Embedded checklist items
  created_at: string;
  updated_at: string;
}

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  taskId?: number | null; // Link to Task.id
}

export type NoteColor = 'default' | 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'pink';

export const noteColorClasses: Record<NoteColor, { bg: string; border: string; hover: string }> = {
  default: {
    bg: 'bg-[#2a2a3e]',
    border: 'border-[#3a3a4e]',
    hover: 'hover:bg-[#3a3a4e]',
  },
  red: {
    bg: 'bg-red-900/30',
    border: 'border-red-700/50',
    hover: 'hover:bg-red-900/50',
  },
  orange: {
    bg: 'bg-orange-900/30',
    border: 'border-orange-700/50',
    hover: 'hover:bg-orange-900/50',
  },
  yellow: {
    bg: 'bg-yellow-900/30',
    border: 'border-yellow-700/50',
    hover: 'hover:bg-yellow-900/50',
  },
  green: {
    bg: 'bg-green-900/30',
    border: 'border-green-700/50',
    hover: 'hover:bg-green-900/50',
  },
  blue: {
    bg: 'bg-blue-900/30',
    border: 'border-blue-700/50',
    hover: 'hover:bg-blue-900/50',
  },
  purple: {
    bg: 'bg-purple-900/30',
    border: 'border-purple-700/50',
    hover: 'hover:bg-purple-900/50',
  },
  pink: {
    bg: 'bg-pink-900/30',
    border: 'border-pink-700/50',
    hover: 'hover:bg-pink-900/50',
  },
};
