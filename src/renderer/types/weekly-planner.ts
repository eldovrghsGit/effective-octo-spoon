// Weekly Planner Type Definitions

export interface WeeklyGoal {
  id: string;
  text: string;
  completed: boolean;
  priority: 'high' | 'medium' | 'low';
}

export interface WeeklyPriority {
  taskId: number;
  taskTitle: string;
  dayScheduled?: string; // ISO date string
  timeSlot?: string; // 'morning', 'afternoon', 'evening'
  estimatedMinutes?: number;
}

export interface WeeklyPlan {
  id: number;
  week_start_date: string; // Monday of the week (ISO date)
  goals: WeeklyGoal[]; // JSON parsed from DB
  priorities: WeeklyPriority[]; // JSON parsed from DB
  capacity_hours: number;
  notes: string | null;
  status: 'planning' | 'active' | 'completed' | 'reviewed';
  copilot_suggestions: string | null;
  created_at: string;
  updated_at: string;
}

export interface WeeklyReview {
  id: number;
  weekly_plan_id: number;
  week_start_date: string;
  tasks_planned: number;
  tasks_completed: number;
  total_time_minutes: number;
  productivity_score: number | null;
  best_time_of_day: string | null;
  avg_focus_quality: number | null;
  estimation_accuracy: number | null;
  copilot_insights: string | null;
  improvement_suggestions: string | null;
  wins: string | null; // JSON array
  challenges: string | null; // JSON array
  created_at: string;
}

// Form data types for creating/updating
export interface WeeklyPlanFormData {
  week_start_date: string;
  goals: WeeklyGoal[];
  priorities: WeeklyPriority[];
  capacity_hours: number;
  notes?: string;
}

export interface WeeklyPlanUpdateData {
  goals?: WeeklyGoal[];
  priorities?: WeeklyPriority[];
  capacity_hours?: number;
  notes?: string;
  status?: 'planning' | 'active' | 'completed' | 'reviewed';
  copilot_suggestions?: string;
}

// Day view for the weekly planner grid
export interface DayPlan {
  date: string; // ISO date
  dayName: string; // 'Monday', 'Tuesday', etc.
  tasks: WeeklyPriority[];
  totalMinutes: number;
  isToday: boolean;
  isPast: boolean;
}

// Weekly stats summary
export interface WeeklyStats {
  totalTasksPlanned: number;
  totalTasksCompleted: number;
  completionRate: number;
  totalTimeMinutes: number;
  averageFocusQuality: number;
  mostProductiveDay: string | null;
  goalsCompleted: number;
  goalsTotal: number;
}
