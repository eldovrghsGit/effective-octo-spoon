// Time Tracking Types for Pomodoro Timer System

export type SessionType = 'pomodoro' | 'manual' | 'stopwatch';
export type FocusQuality = 'high' | 'medium' | 'low';
export type EnergyLevel = 'high' | 'medium' | 'low';
export type TimeOfDay = 'morning' | 'afternoon' | 'evening';

export interface TimeSession {
  id: number;
  task_id: number | null;
  session_type: SessionType;
  duration_minutes: number;
  planned_duration: number;
  start_time: string;
  end_time: string | null;
  interruptions: number;
  focus_quality: FocusQuality;
  notes: string | null;
  completed: boolean;
  created_at: string;
}

export interface PomodoroSettings {
  workDuration: number; // minutes
  shortBreakDuration: number; // minutes
  longBreakDuration: number; // minutes
  sessionsUntilLongBreak: number;
  autoStartBreaks: boolean;
  autoStartPomodoros: boolean;
  soundEnabled: boolean;
  notificationsEnabled: boolean;
}

export interface TimerState {
  isRunning: boolean;
  isPaused: boolean;
  mode: 'work' | 'shortBreak' | 'longBreak';
  timeRemaining: number; // seconds
  currentSession: number; // session count
  totalSessionsToday: number;
  activeTaskId: number | null;
  activeTaskTitle: string | null;
  startedAt: string | null;
  pausedAt: string | null;
}

export interface TaskTimeStats {
  taskId: number;
  totalMinutes: number;
  pomodorosCompleted: number;
  averageFocusQuality: FocusQuality;
  sessions: TimeSession[];
}

export interface DailyTimeStats {
  date: string;
  totalMinutes: number;
  totalSessions: number;
  completedSessions: number;
  averageFocusQuality: number; // 0-1 scale
  taskBreakdown: {
    taskId: number;
    taskTitle: string;
    minutes: number;
    sessions: number;
  }[];
}

export interface WeeklyTimeStats {
  weekStartDate: string;
  totalMinutes: number;
  totalSessions: number;
  dailyStats: DailyTimeStats[];
  mostProductiveDay: string;
  mostProductiveTime: TimeOfDay;
  averageSessionsPerDay: number;
}

// Default Pomodoro settings
export const DEFAULT_POMODORO_SETTINGS: PomodoroSettings = {
  workDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  sessionsUntilLongBreak: 4,
  autoStartBreaks: false,
  autoStartPomodoros: false,
  soundEnabled: true,
  notificationsEnabled: true,
};

// Initial timer state
export const INITIAL_TIMER_STATE: TimerState = {
  isRunning: false,
  isPaused: false,
  mode: 'work',
  timeRemaining: DEFAULT_POMODORO_SETTINGS.workDuration * 60,
  currentSession: 1,
  totalSessionsToday: 0,
  activeTaskId: null,
  activeTaskTitle: null,
  startedAt: null,
  pausedAt: null,
};
