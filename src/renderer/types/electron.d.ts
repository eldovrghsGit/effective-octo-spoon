export {};

declare global {
  interface Window {
    electronAPI: {
      getTasks: () => Promise<any[]>;
      createTask: (task: any) => Promise<any>;
      updateTask: (id: number, updates: any) => Promise<any>;
      deleteTask: (id: number) => Promise<{ success: boolean }>;
      getSubtasks: (taskId: number) => Promise<any[]>;
      createSubtask: (subtask: any) => Promise<any>;
      updateSubtask: (id: number, updates: any) => Promise<any>;
      deleteSubtask: (id: number) => Promise<{ success: boolean }>;
      // Tags API
      getTags: () => Promise<Array<{ id: number; name: string; color: string; usage_count: number; created_at: string; updated_at: string }>>;
      createTag: (tagName: string) => Promise<{ id: number; name: string; usage_count: number } | null>;
      updateTagUsage: (tagNames: string[]) => Promise<{ success: boolean }>;
      deleteTag: (id: number) => Promise<{ success: boolean }>;
      searchTags: (query: string) => Promise<Array<{ id: number; name: string; color: string; usage_count: number }>>;
      // Notes API
      getNotes: () => Promise<any[]>;
      createNote: (note: any) => Promise<any>;
      updateNote: (id: number, updates: any) => Promise<any>;
      deleteNote: (id: number) => Promise<{ success: boolean }>;
      // Habits API
      getHabits: () => Promise<any[]>;
      createHabit: (habit: any) => Promise<any>;
      updateHabit: (id: number, updates: any) => Promise<any>;
      deleteHabit: (id: number) => Promise<{ success: boolean }>;
      getHabitCompletions: () => Promise<any[]>;
      toggleHabitCompletion: (habitId: number, date: string) => Promise<{ completed: boolean }>;
      // Journal API
      getJournalEntries: () => Promise<any[]>;
      createJournalEntry: (entry: any) => Promise<any>;
      updateJournalEntry: (id: number, updates: any) => Promise<any>;
      deleteJournalEntry: (id: number) => Promise<{ success: boolean }>;
      // Time Tracking / Pomodoro Timer API
      getTimeSessions: () => Promise<any[]>;
      getTimeSessionsByTask: (taskId: number) => Promise<any[]>;
      getTimeSessionsByDate: (date: string) => Promise<any[]>;
      createTimeSession: (session: any) => Promise<any>;
      updateTimeSession: (id: number, updates: any) => Promise<any>;
      deleteTimeSession: (id: number) => Promise<{ success: boolean }>;
      getDailyTimeStats: (date: string) => Promise<{
        date: string;
        totalMinutes: number;
        totalSessions: number;
        completedSessions: number;
        averageFocusQuality: number;
        taskBreakdown: Array<{ taskId: number; taskTitle: string; minutes: number; sessions: number }>;
      }>;
      getWeeklyTimeStats: (weekStartDate: string) => Promise<{
        weekStartDate: string;
        totalMinutes: number;
        totalSessions: number;
        dailyStats: any[];
        mostProductiveDay: string | null;
        mostProductiveTime: string;
        averageSessionsPerDay: number;
      }>;
      getTaskTimeStats: (taskId: number) => Promise<{
        taskId: number;
        totalMinutes: number;
        pomodorosCompleted: number;
        averageFocusQuality: 'high' | 'medium' | 'low';
        sessions: any[];
      }>;
      getTodaySessionCount: () => Promise<number>;
      // Weekly Planner API
      getWeeklyPlan: (weekStartDate: string) => Promise<{
        id: number;
        week_start_date: string;
        goals: Array<{ id: string; text: string; completed: boolean; priority: 'high' | 'medium' | 'low' }>;
        priorities: Array<{ taskId: number; taskTitle: string; dayScheduled?: string; timeSlot?: string; estimatedMinutes?: number }>;
        capacity_hours: number;
        notes: string | null;
        status: 'planning' | 'active' | 'completed' | 'reviewed';
        copilot_suggestions: string | null;
        created_at: string;
        updated_at: string;
      } | null>;
      getCurrentWeeklyPlan: () => Promise<{
        id: number;
        week_start_date: string;
        goals: Array<{ id: string; text: string; completed: boolean; priority: 'high' | 'medium' | 'low' }>;
        priorities: Array<{ taskId: number; taskTitle: string; dayScheduled?: string; timeSlot?: string; estimatedMinutes?: number }>;
        capacity_hours: number;
        notes: string | null;
        status: 'planning' | 'active' | 'completed' | 'reviewed';
        copilot_suggestions: string | null;
        created_at: string;
        updated_at: string;
      } | null>;
      getAllWeeklyPlans: () => Promise<Array<{
        id: number;
        week_start_date: string;
        goals: Array<{ id: string; text: string; completed: boolean; priority: 'high' | 'medium' | 'low' }>;
        priorities: Array<{ taskId: number; taskTitle: string; dayScheduled?: string; timeSlot?: string; estimatedMinutes?: number }>;
        capacity_hours: number;
        notes: string | null;
        status: 'planning' | 'active' | 'completed' | 'reviewed';
        copilot_suggestions: string | null;
        created_at: string;
        updated_at: string;
      }>>;
      createWeeklyPlan: (data: {
        week_start_date: string;
        goals?: Array<{ id: string; text: string; completed: boolean; priority: 'high' | 'medium' | 'low' }>;
        priorities?: Array<{ taskId: number; taskTitle: string; dayScheduled?: string; timeSlot?: string; estimatedMinutes?: number }>;
        capacity_hours?: number;
        notes?: string;
      }) => Promise<any>;
      updateWeeklyPlan: (id: number, data: {
        goals?: Array<{ id: string; text: string; completed: boolean; priority: 'high' | 'medium' | 'low' }>;
        priorities?: Array<{ taskId: number; taskTitle: string; dayScheduled?: string; timeSlot?: string; estimatedMinutes?: number }>;
        capacity_hours?: number;
        notes?: string;
        status?: 'planning' | 'active' | 'completed' | 'reviewed';
        copilot_suggestions?: string;
      }) => Promise<{ success: boolean }>;
      deleteWeeklyPlan: (id: number) => Promise<{ success: boolean }>;
      // Weekly Review API
      getWeeklyReview: (weeklyPlanId: number) => Promise<{
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
        wins: string[];
        challenges: string[];
        created_at: string;
      } | null>;
      getWeeklyReviewByDate: (weekStartDate: string) => Promise<{
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
        wins: string[];
        challenges: string[];
        created_at: string;
      } | null>;
      createWeeklyReview: (data: {
        weekly_plan_id: number;
        week_start_date: string;
        tasks_planned?: number;
        tasks_completed?: number;
        total_time_minutes?: number;
        productivity_score?: number;
        best_time_of_day?: string;
        avg_focus_quality?: number;
        estimation_accuracy?: number;
        copilot_insights?: string;
        improvement_suggestions?: string;
        wins?: string[];
        challenges?: string[];
      }) => Promise<any>;
      updateWeeklyReview: (id: number, data: {
        tasks_planned?: number;
        tasks_completed?: number;
        total_time_minutes?: number;
        productivity_score?: number;
        best_time_of_day?: string;
        avg_focus_quality?: number;
        estimation_accuracy?: number;
        copilot_insights?: string;
        improvement_suggestions?: string;
        wins?: string[];
        challenges?: string[];
      }) => Promise<{ success: boolean }>;
      // Weekly Statistics API
      getWeeklyStats: (weekStartDate: string) => Promise<{
        totalTasksPlanned: number;
        totalTasksCompleted: number;
        completionRate: number;
        totalTimeMinutes: number;
        averageFocusQuality: number;
        mostProductiveDay: string | null;
        goalsCompleted: number;
        goalsTotal: number;
        estimationAccuracy: number | null;
      }>;
      // Copilot API
      copilot: {
        init: () => Promise<void>;
        send: (prompt: string) => Promise<string>;
        status: () => Promise<{ initialized: boolean }>;
        stop: () => Promise<void>;
        onDelta: (callback: (delta: string) => void) => () => void;
      };
      // Event listener
      on: (channel: string, callback: (...args: any[]) => void) => () => void;
    };
  }
}
