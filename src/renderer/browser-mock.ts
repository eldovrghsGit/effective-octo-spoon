/**
 * Browser-safe mock for window.electronAPI.
 * Used when the renderer runs in a regular browser (outside Electron)
 * so that the app can render without crashing.
 *
 * Data is stored in-memory with localStorage persistence where possible.
 */

/* ---------- helpers ---------- */
let nextId = 1;
const now = () => new Date().toISOString();

function loadStore<T>(key: string, fallback: T[]): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
function saveStore<T>(key: string, data: T[]) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // quota exceeded – silently ignore
  }
}

/* ---------- in-memory stores ---------- */
let tasks: any[] = loadStore('mock_tasks', []);
let subtasks: any[] = loadStore('mock_subtasks', []);
let tags: any[] = loadStore('mock_tags', []);
let notes: any[] = loadStore('mock_notes', []);
let habits: any[] = loadStore('mock_habits', []);
let habitCompletions: any[] = loadStore('mock_habitCompletions', []);
let journalEntries: any[] = loadStore('mock_journal', []);
let timeSessions: any[] = loadStore('mock_timeSessions', []);
let weeklyPlans: any[] = loadStore('mock_weeklyPlans', []);
let weeklyReviews: any[] = loadStore('mock_weeklyReviews', []);

// ensure id counter is above existing max
function bumpNextId() {
  const all = [...tasks, ...subtasks, ...tags, ...notes, ...habits, ...habitCompletions, ...journalEntries, ...timeSessions, ...weeklyPlans, ...weeklyReviews];
  const maxId = all.reduce((m, r) => Math.max(m, r.id ?? 0), 0);
  nextId = maxId + 1;
}
bumpNextId();

/* ---------- mock API ---------- */
export const browserElectronAPI = {
  // Tasks
  getTasks: async () => tasks,
  createTask: async (task: any) => {
    const t = { id: nextId++, ...task, created_at: now(), updated_at: now() };
    tasks.push(t);
    saveStore('mock_tasks', tasks);
    return t;
  },
  updateTask: async (id: number, updates: any) => {
    const idx = tasks.findIndex((t) => t.id === id);
    if (idx !== -1) {
      tasks[idx] = { ...tasks[idx], ...updates, updated_at: now() };
      saveStore('mock_tasks', tasks);
    }
    return tasks[idx] ?? null;
  },
  deleteTask: async (id: number) => {
    tasks = tasks.filter((t) => t.id !== id);
    saveStore('mock_tasks', tasks);
    return { success: true };
  },

  // Subtasks
  getSubtasks: async (taskId: number) => subtasks.filter((s) => s.task_id === taskId),
  createSubtask: async (sub: any) => {
    const s = { id: nextId++, ...sub, created_at: now() };
    subtasks.push(s);
    saveStore('mock_subtasks', subtasks);
    return s;
  },
  updateSubtask: async (id: number, updates: any) => {
    const idx = subtasks.findIndex((s) => s.id === id);
    if (idx !== -1) subtasks[idx] = { ...subtasks[idx], ...updates };
    saveStore('mock_subtasks', subtasks);
    return subtasks[idx] ?? null;
  },
  deleteSubtask: async (id: number) => {
    subtasks = subtasks.filter((s) => s.id !== id);
    saveStore('mock_subtasks', subtasks);
    return { success: true };
  },

  // Tags
  getTags: async () => tags,
  createTag: async (tagName: string) => {
    const existing = tags.find((t) => t.name === tagName);
    if (existing) return existing;
    const t = { id: nextId++, name: tagName, color: '#6366f1', usage_count: 1, created_at: now(), updated_at: now() };
    tags.push(t);
    saveStore('mock_tags', tags);
    return t;
  },
  updateTagUsage: async (_tagNames: string[]) => ({ success: true }),
  deleteTag: async (id: number) => {
    tags = tags.filter((t) => t.id !== id);
    saveStore('mock_tags', tags);
    return { success: true };
  },
  searchTags: async (query: string) => tags.filter((t) => t.name.toLowerCase().includes(query.toLowerCase())),

  // Notes
  getNotes: async () => notes,
  createNote: async (note: any) => {
    const n = { id: nextId++, ...note, created_at: now(), updated_at: now() };
    notes.push(n);
    saveStore('mock_notes', notes);
    return n;
  },
  updateNote: async (id: number, updates: any) => {
    const idx = notes.findIndex((n) => n.id === id);
    if (idx !== -1) notes[idx] = { ...notes[idx], ...updates, updated_at: now() };
    saveStore('mock_notes', notes);
    return notes[idx] ?? null;
  },
  deleteNote: async (id: number) => {
    notes = notes.filter((n) => n.id !== id);
    saveStore('mock_notes', notes);
    return { success: true };
  },

  // Habits
  getHabits: async () => habits,
  createHabit: async (habit: any) => {
    const h = { id: nextId++, ...habit, created_at: now(), updated_at: now() };
    habits.push(h);
    saveStore('mock_habits', habits);
    return h;
  },
  updateHabit: async (id: number, updates: any) => {
    const idx = habits.findIndex((h) => h.id === id);
    if (idx !== -1) habits[idx] = { ...habits[idx], ...updates, updated_at: now() };
    saveStore('mock_habits', habits);
    return habits[idx] ?? null;
  },
  deleteHabit: async (id: number) => {
    habits = habits.filter((h) => h.id !== id);
    saveStore('mock_habits', habits);
    return { success: true };
  },
  getHabitCompletions: async () => habitCompletions,
  toggleHabitCompletion: async (habitId: number, date: string) => {
    const idx = habitCompletions.findIndex((c) => c.habit_id === habitId && c.date === date);
    if (idx !== -1) {
      habitCompletions.splice(idx, 1);
      saveStore('mock_habitCompletions', habitCompletions);
      return { completed: false };
    }
    habitCompletions.push({ id: nextId++, habit_id: habitId, date });
    saveStore('mock_habitCompletions', habitCompletions);
    return { completed: true };
  },

  // Journal
  getJournalEntries: async () => journalEntries,
  createJournalEntry: async (entry: any) => {
    const e = { id: nextId++, ...entry, created_at: now(), updated_at: now() };
    journalEntries.push(e);
    saveStore('mock_journal', journalEntries);
    return e;
  },
  updateJournalEntry: async (id: number, updates: any) => {
    const idx = journalEntries.findIndex((e) => e.id === id);
    if (idx !== -1) journalEntries[idx] = { ...journalEntries[idx], ...updates, updated_at: now() };
    saveStore('mock_journal', journalEntries);
    return journalEntries[idx] ?? null;
  },
  deleteJournalEntry: async (id: number) => {
    journalEntries = journalEntries.filter((e) => e.id !== id);
    saveStore('mock_journal', journalEntries);
    return { success: true };
  },

  // Time Sessions
  getTimeSessions: async () => timeSessions,
  getTimeSessionsByTask: async (taskId: number) => timeSessions.filter((s) => s.task_id === taskId),
  getTimeSessionsByDate: async (date: string) => timeSessions.filter((s) => s.date === date),
  createTimeSession: async (session: any) => {
    const s = { id: nextId++, ...session, created_at: now() };
    timeSessions.push(s);
    saveStore('mock_timeSessions', timeSessions);
    return s;
  },
  updateTimeSession: async (id: number, updates: any) => {
    const idx = timeSessions.findIndex((s) => s.id === id);
    if (idx !== -1) timeSessions[idx] = { ...timeSessions[idx], ...updates };
    saveStore('mock_timeSessions', timeSessions);
    return timeSessions[idx] ?? null;
  },
  deleteTimeSession: async (id: number) => {
    timeSessions = timeSessions.filter((s) => s.id !== id);
    saveStore('mock_timeSessions', timeSessions);
    return { success: true };
  },
  getDailyTimeStats: async (_date: string) => ({
    date: _date,
    totalMinutes: 0,
    totalSessions: 0,
    completedSessions: 0,
    averageFocusQuality: 0,
    taskBreakdown: [],
  }),
  getWeeklyTimeStats: async (weekStartDate: string) => ({
    weekStartDate,
    totalMinutes: 0,
    totalSessions: 0,
    dailyStats: [],
    mostProductiveDay: null,
    mostProductiveTime: '',
    averageSessionsPerDay: 0,
  }),
  getTaskTimeStats: async (taskId: number) => ({
    taskId,
    totalMinutes: 0,
    pomodorosCompleted: 0,
    averageFocusQuality: 'medium' as const,
    sessions: [],
  }),
  getTodaySessionCount: async () => 0,

  // Weekly Planner
  getWeeklyPlan: async (_weekStartDate: string) => null,
  getCurrentWeeklyPlan: async () => null,
  getAllWeeklyPlans: async () => [],
  createWeeklyPlan: async (data: any) => {
    const p = { id: nextId++, ...data, created_at: now(), updated_at: now() };
    weeklyPlans.push(p);
    saveStore('mock_weeklyPlans', weeklyPlans);
    return p;
  },
  updateWeeklyPlan: async (id: number, data: any) => {
    const idx = weeklyPlans.findIndex((p) => p.id === id);
    if (idx !== -1) weeklyPlans[idx] = { ...weeklyPlans[idx], ...data, updated_at: now() };
    saveStore('mock_weeklyPlans', weeklyPlans);
    return { success: true };
  },
  deleteWeeklyPlan: async (id: number) => {
    weeklyPlans = weeklyPlans.filter((p) => p.id !== id);
    saveStore('mock_weeklyPlans', weeklyPlans);
    return { success: true };
  },

  // Weekly Reviews
  getWeeklyReview: async (_weeklyPlanId: number) => null,
  getWeeklyReviewByDate: async (_weekStartDate: string) => null,
  createWeeklyReview: async (data: any) => {
    const r = { id: nextId++, ...data, created_at: now() };
    weeklyReviews.push(r);
    saveStore('mock_weeklyReviews', weeklyReviews);
    return r;
  },
  updateWeeklyReview: async (id: number, data: any) => {
    const idx = weeklyReviews.findIndex((r) => r.id === id);
    if (idx !== -1) weeklyReviews[idx] = { ...weeklyReviews[idx], ...data };
    saveStore('mock_weeklyReviews', weeklyReviews);
    return { success: true };
  },

  // Weekly Statistics
  getWeeklyStats: async (_weekStartDate: string) => ({
    totalTasksPlanned: 0,
    totalTasksCompleted: 0,
    completionRate: 0,
    totalTimeMinutes: 0,
    averageFocusQuality: 0,
    mostProductiveDay: null,
    goalsCompleted: 0,
    goalsTotal: 0,
    estimationAccuracy: null,
  }),

  // Copilot
  copilot: {
    init: async () => ({ isConnected: false, isInitialized: false }),
    send: async (_prompt: string) => ({ success: false, response: 'Copilot is not available in browser mode.' }),
    status: async () => ({ isConnected: false, isInitialized: false }),
    stop: async () => ({ success: true }),
    onDelta: (_callback: (delta: string) => void) => () => {},
  },

  // Event listener (no-op in browser)
  on: (_channel: string, _callback: (...args: any[]) => void) => () => {},
};
