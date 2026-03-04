/**
 * Browser-safe mock for window.electronAPI.
 * Used when the renderer runs in a regular browser (outside Electron)
 * so that the app can render without crashing.
 *
 * Data is stored in-memory with localStorage persistence where possible.
 * On first load (empty localStorage) the stores are seeded with demo data.
 */

/* ---------- helpers ---------- */
let nextId = 100;
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

/* ---------- date helpers for seed data ---------- */
function fmtDate(d: Date): string {
  return d.toISOString().split('T')[0];
}
function relDay(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return fmtDate(d);
}

/* ---------- seed data (used only when localStorage is empty) ---------- */
const TODAY = relDay(0);
const YESTERDAY = relDay(-1);
const TOMORROW = relDay(1);
const DAY_AFTER = relDay(2);
const LAST_MON = relDay(-7);

const SEED_TASKS: any[] = [
  // Must Do — active
  { id: 1, title: 'Fix critical bug in auth module', description: 'Users are getting 401 errors intermittently on login. Investigate JWT token expiry logic.', status: 'todo', priority: 'high', moscow: 'must', due_date: TODAY, start_time: '09:00', end_time: '10:30', tags: 'bug,auth', actual_minutes: null, pomodoros_completed: null, estimated_minutes: 90, created_at: now(), updated_at: now() },
  { id: 2, title: 'Deploy hotfix to production', description: 'Push the auth fix to prod after QA sign-off.', status: 'in-progress', priority: 'high', moscow: 'must', due_date: TODAY, start_time: '11:00', end_time: '12:00', tags: 'devops', actual_minutes: 20, pomodoros_completed: 0, estimated_minutes: 60, created_at: now(), updated_at: now() },
  { id: 3, title: 'Team standup', description: 'Daily sync with engineering team.', status: 'todo', priority: 'medium', moscow: 'must', due_date: TODAY, start_time: '10:00', end_time: '10:30', tags: 'meeting', actual_minutes: null, pomodoros_completed: null, estimated_minutes: 30, created_at: now(), updated_at: now() },
  { id: 4, title: 'Review security audit report', description: 'Go through the pen test findings and prioritise remediations.', status: 'todo', priority: 'high', moscow: 'must', due_date: TOMORROW, start_time: '14:00', end_time: '15:30', tags: 'security', actual_minutes: null, pomodoros_completed: null, estimated_minutes: 90, created_at: now(), updated_at: now() },

  // Should Do — active
  { id: 5, title: 'Code review — feature/user-profile PR', description: 'Review and leave comments on the user profile feature branch.', status: 'todo', priority: 'medium', moscow: 'should', due_date: TODAY, start_time: '14:00', end_time: '15:00', tags: 'code-review', actual_minutes: null, pomodoros_completed: null, estimated_minutes: 60, created_at: now(), updated_at: now() },
  { id: 6, title: 'Update API documentation', description: 'Sync Swagger docs with the latest endpoint changes from last sprint.', status: 'todo', priority: 'medium', moscow: 'should', due_date: TOMORROW, start_time: null, end_time: null, tags: 'docs', actual_minutes: null, pomodoros_completed: null, estimated_minutes: 45, created_at: now(), updated_at: now() },
  { id: 7, title: 'Write unit tests for payment service', description: 'Increase coverage from 62% to above 80%.', status: 'in-progress', priority: 'medium', moscow: 'should', due_date: DAY_AFTER, start_time: null, end_time: null, tags: 'testing', actual_minutes: 45, pomodoros_completed: 1, estimated_minutes: 120, created_at: now(), updated_at: now() },
  { id: 8, title: 'Sprint retrospective prep', description: 'Gather team feedback and prepare slides for Friday retro.', status: 'todo', priority: 'low', moscow: 'should', due_date: DAY_AFTER, start_time: '16:00', end_time: '17:00', tags: 'meeting', actual_minutes: null, pomodoros_completed: null, estimated_minutes: 60, created_at: now(), updated_at: now() },

  // Could Do — active
  { id: 9, title: 'Refactor utils module', description: 'Break up the 800-line utils.ts into domain-specific helpers.', status: 'todo', priority: 'low', moscow: 'want', due_date: null, start_time: null, end_time: null, tags: 'refactor,tech-debt', actual_minutes: null, pomodoros_completed: null, estimated_minutes: 180, created_at: now(), updated_at: now() },
  { id: 10, title: 'Explore dark mode palette options', description: 'Try out a few alternative dark themes for the dashboard.', status: 'todo', priority: 'low', moscow: 'want', due_date: null, start_time: null, end_time: null, tags: 'design', actual_minutes: null, pomodoros_completed: null, estimated_minutes: 30, created_at: now(), updated_at: now() },

  // Completed
  { id: 11, title: 'Set up CI/CD pipeline', description: 'Configured GitHub Actions for auto-deploy on merge to main.', status: 'done', priority: 'high', moscow: 'must', due_date: YESTERDAY, start_time: '09:00', end_time: '12:00', tags: 'devops', actual_minutes: 165, pomodoros_completed: 3, estimated_minutes: 180, created_at: now(), updated_at: now() },
  { id: 12, title: 'Weekly planning session', description: 'Planned tasks and set priorities for the week.', status: 'done', priority: 'medium', moscow: 'should', due_date: YESTERDAY, start_time: '08:30', end_time: '09:00', tags: 'planning', actual_minutes: 30, pomodoros_completed: 1, estimated_minutes: 30, created_at: now(), updated_at: now() },
  { id: 13, title: 'Fix homepage loading performance', description: 'Reduced initial bundle size by 40% using code splitting.', status: 'done', priority: 'high', moscow: 'must', due_date: LAST_MON, start_time: null, end_time: null, tags: 'performance', actual_minutes: 240, pomodoros_completed: 4, estimated_minutes: 120, created_at: now(), updated_at: now() },
];

const SEED_SUBTASKS: any[] = [
  { id: 20, task_id: 1, title: 'Reproduce the 401 error locally', completed: true, created_at: now() },
  { id: 21, task_id: 1, title: 'Trace JWT expiry in middleware', completed: false, created_at: now() },
  { id: 22, task_id: 1, title: 'Add refresh-token retry logic', completed: false, created_at: now() },
  { id: 23, task_id: 7, title: 'Scaffold test file structure', completed: true, created_at: now() },
  { id: 24, task_id: 7, title: 'Write happy-path tests', completed: false, created_at: now() },
  { id: 25, task_id: 7, title: 'Write error-path tests', completed: false, created_at: now() },
];

const SEED_TAGS: any[] = [
  { id: 30, name: 'bug', color: '#ef4444', usage_count: 3, created_at: now(), updated_at: now() },
  { id: 31, name: 'auth', color: '#f97316', usage_count: 2, created_at: now(), updated_at: now() },
  { id: 32, name: 'devops', color: '#3b82f6', usage_count: 4, created_at: now(), updated_at: now() },
  { id: 33, name: 'meeting', color: '#8b5cf6', usage_count: 5, created_at: now(), updated_at: now() },
  { id: 34, name: 'code-review', color: '#06b6d4', usage_count: 6, created_at: now(), updated_at: now() },
  { id: 35, name: 'docs', color: '#10b981', usage_count: 3, created_at: now(), updated_at: now() },
  { id: 36, name: 'testing', color: '#f59e0b', usage_count: 4, created_at: now(), updated_at: now() },
  { id: 37, name: 'refactor', color: '#6366f1', usage_count: 2, created_at: now(), updated_at: now() },
  { id: 38, name: 'performance', color: '#ec4899', usage_count: 3, created_at: now(), updated_at: now() },
  { id: 39, name: 'security', color: '#ef4444', usage_count: 2, created_at: now(), updated_at: now() },
  { id: 40, name: 'design', color: '#a855f7', usage_count: 1, created_at: now(), updated_at: now() },
  { id: 41, name: 'planning', color: '#14b8a6', usage_count: 3, created_at: now(), updated_at: now() },
  { id: 42, name: 'tech-debt', color: '#78716c', usage_count: 2, created_at: now(), updated_at: now() },
];

const SEED_NOTES: any[] = [
  {
    id: 50, date: TODAY, title: `Daily Note — ${TODAY}`,
    content: '<h2>Today\'s Focus</h2><p>Main priority is resolving the auth bug before standup. After that, catch up on PR reviews.</p><h3>Blockers</h3><ul><li>Waiting for QA environment access from DevOps</li><li>Need design sign-off on profile page changes</li></ul><h3>Notes from Standup</h3><p>Backend team is unblocking the payment service refactor this afternoon. Frontend has the dark mode spike ready for review.</p>',
    created_at: now(), updated_at: now(),
  },
  {
    id: 51, date: YESTERDAY, title: `Daily Note — ${YESTERDAY}`,
    content: '<h2>Yesterday\'s Summary</h2><p>Successfully set up the CI/CD pipeline — took longer than expected but works reliably now. Weekly planning session helped clarify the sprint priorities.</p><h3>Learnings</h3><ul><li>GitHub Actions caching can cut build time by ~50%</li><li>Keep deployment scripts idempotent to avoid manual rollbacks</li></ul>',
    created_at: now(), updated_at: now(),
  },
];

const SEED_HABITS: any[] = [
  { id: 60, name: 'Morning exercise', description: '30 min workout or walk', frequency: 'daily', target_count: 1, color: '#10b981', icon: '🏃', created_at: now(), updated_at: now() },
  { id: 61, name: 'Read 30 minutes', description: 'Technical book or articles', frequency: 'daily', target_count: 1, color: '#6366f1', icon: '📚', created_at: now(), updated_at: now() },
  { id: 62, name: 'Daily standup notes', description: 'Write down key takeaways', frequency: 'daily', target_count: 1, color: '#f59e0b', icon: '📝', created_at: now(), updated_at: now() },
  { id: 63, name: 'Code review', description: 'Review at least one PR', frequency: 'daily', target_count: 1, color: '#06b6d4', icon: '👀', created_at: now(), updated_at: now() },
];

const SEED_HABIT_COMPLETIONS: any[] = [
  { id: 70, habit_id: 60, date: YESTERDAY },
  { id: 71, habit_id: 61, date: YESTERDAY },
  { id: 72, habit_id: 62, date: YESTERDAY },
  { id: 73, habit_id: 63, date: YESTERDAY },
  { id: 74, habit_id: 60, date: relDay(-2) },
  { id: 75, habit_id: 61, date: relDay(-2) },
  { id: 76, habit_id: 62, date: relDay(-2) },
  { id: 77, habit_id: 60, date: relDay(-3) },
  { id: 78, habit_id: 61, date: relDay(-3) },
  { id: 79, habit_id: 63, date: relDay(-3) },
];

const SEED_JOURNAL: any[] = [
  {
    id: 80,
    date: YESTERDAY,
    mood: 'good',
    energy: 4,
    content: '<h3>Wins</h3><p>Got the CI pipeline working after the Docker caching issue. Also had a great 1:1 with the PM — good alignment on Q3 goals.</p><h3>Challenges</h3><p>The auth bug is proving tricky to reproduce consistently. Will pair with the backend team tomorrow.</p><h3>Gratitude</h3><p>Team was really supportive during the incident earlier this week.</p>',
    created_at: now(), updated_at: now(),
  },
  {
    id: 81,
    date: relDay(-2),
    mood: 'okay',
    energy: 3,
    content: '<h3>Reflection</h3><p>Productive morning but hit a wall in the afternoon. Need to protect deep-work blocks more aggressively.</p><h3>Tomorrow\'s Intention</h3><p>Start with the hardest task first — no email until 10 AM.</p>',
    created_at: now(), updated_at: now(),
  },
];

const SEED_TIME_SESSIONS: any[] = [
  { id: 90, task_id: 11, type: 'pomodoro', duration_minutes: 25, started_at: `${YESTERDAY}T09:00:00.000Z`, ended_at: `${YESTERDAY}T09:25:00.000Z`, focus_quality: 'high', notes: 'Solid focus block', date: YESTERDAY, created_at: now() },
  { id: 91, task_id: 11, type: 'pomodoro', duration_minutes: 25, started_at: `${YESTERDAY}T09:30:00.000Z`, ended_at: `${YESTERDAY}T09:55:00.000Z`, focus_quality: 'high', notes: '', date: YESTERDAY, created_at: now() },
  { id: 92, task_id: 11, type: 'pomodoro', duration_minutes: 25, started_at: `${YESTERDAY}T10:05:00.000Z`, ended_at: `${YESTERDAY}T10:30:00.000Z`, focus_quality: 'medium', notes: 'A few interruptions', date: YESTERDAY, created_at: now() },
  { id: 93, task_id: 2, type: 'pomodoro', duration_minutes: 20, started_at: `${TODAY}T11:00:00.000Z`, ended_at: `${TODAY}T11:20:00.000Z`, focus_quality: 'medium', notes: 'Still in progress', date: TODAY, created_at: now() },
];

const SEED_WEEKLY_PLANS: any[] = [
  {
    id: 95,
    week_start_date: relDay(-((new Date().getDay() || 7) - 1)), // Monday of current week (handles Sunday)
    goals: [
      { id: 'g1', text: 'Resolve all P0 bugs before end of week', completed: false, priority: 'high' },
      { id: 'g2', text: 'Bring test coverage above 80%', completed: false, priority: 'medium' },
      { id: 'g3', text: 'Complete security audit review', completed: false, priority: 'high' },
      { id: 'g4', text: 'Finish onboarding docs for new hire', completed: true, priority: 'low' },
    ],
    priorities: [
      { taskId: 1, taskTitle: 'Fix critical bug in auth module', dayScheduled: TODAY, timeSlot: '09:00', estimatedMinutes: 90 },
      { taskId: 4, taskTitle: 'Review security audit report', dayScheduled: TOMORROW, timeSlot: '14:00', estimatedMinutes: 90 },
      { taskId: 7, taskTitle: 'Write unit tests for payment service', dayScheduled: DAY_AFTER, timeSlot: '10:00', estimatedMinutes: 120 },
    ],
    capacity_hours: 32,
    notes: 'Focus week — minimize meetings, protect deep-work slots in the morning.',
    status: 'active',
    copilot_suggestions: null,
    created_at: now(),
    updated_at: now(),
  },
];

/* ---------- in-memory stores ---------- */
const SEED_VERSION = 'v1'; // bump to reset seed data for returning users

function seedStore<T>(key: string, seed: T[]): T[] {
  saveStore(key, seed);
  return seed.slice();
}

// Only seed if this is a fresh session (no seed-version marker)
const isFreshSession = !localStorage.getItem('mock_seed_version');
if (isFreshSession) {
  localStorage.setItem('mock_seed_version', SEED_VERSION);
}

let tasks: any[] = isFreshSession ? seedStore('mock_tasks', SEED_TASKS) : loadStore('mock_tasks', SEED_TASKS);
let subtasks: any[] = isFreshSession ? seedStore('mock_subtasks', SEED_SUBTASKS) : loadStore('mock_subtasks', SEED_SUBTASKS);
let tags: any[] = isFreshSession ? seedStore('mock_tags', SEED_TAGS) : loadStore('mock_tags', SEED_TAGS);
let notes: any[] = isFreshSession ? seedStore('mock_notes', SEED_NOTES) : loadStore('mock_notes', SEED_NOTES);
let habits: any[] = isFreshSession ? seedStore('mock_habits', SEED_HABITS) : loadStore('mock_habits', SEED_HABITS);
let habitCompletions: any[] = isFreshSession ? seedStore('mock_habitCompletions', SEED_HABIT_COMPLETIONS) : loadStore('mock_habitCompletions', SEED_HABIT_COMPLETIONS);
let journalEntries: any[] = isFreshSession ? seedStore('mock_journal', SEED_JOURNAL) : loadStore('mock_journal', SEED_JOURNAL);
let timeSessions: any[] = isFreshSession ? seedStore('mock_timeSessions', SEED_TIME_SESSIONS) : loadStore('mock_timeSessions', SEED_TIME_SESSIONS);
let weeklyPlans: any[] = isFreshSession ? seedStore('mock_weeklyPlans', SEED_WEEKLY_PLANS) : loadStore('mock_weeklyPlans', SEED_WEEKLY_PLANS);
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
  getDailyTimeStats: async (_date: string) => {
    const daySessions = timeSessions.filter((s) => s.date === _date);
    const totalMinutes = daySessions.reduce((sum: number, s: any) => sum + (s.duration_minutes || 0), 0);
    const qualityMap: Record<string, number> = { high: 3, medium: 2, low: 1 };
    const avgQuality = daySessions.length > 0
      ? daySessions.reduce((sum: number, s: any) => sum + (qualityMap[s.focus_quality] || 2), 0) / daySessions.length
      : 0;
    const taskMap: Record<number, { taskId: number; taskTitle: string; minutes: number; sessions: number }> = {};
    for (const s of daySessions) {
      const task = tasks.find((t: any) => t.id === s.task_id);
      if (!taskMap[s.task_id]) taskMap[s.task_id] = { taskId: s.task_id, taskTitle: task?.title || 'Unknown', minutes: 0, sessions: 0 };
      taskMap[s.task_id].minutes += s.duration_minutes || 0;
      taskMap[s.task_id].sessions += 1;
    }
    return { date: _date, totalMinutes, totalSessions: daySessions.length, completedSessions: daySessions.length, averageFocusQuality: avgQuality, taskBreakdown: Object.values(taskMap) };
  },
  getWeeklyTimeStats: async (weekStartDate: string) => {
    const weekStart = new Date(weekStartDate);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const weekSessions = timeSessions.filter((s: any) => {
      const d = new Date(s.date);
      return d >= weekStart && d < weekEnd;
    });
    return {
      weekStartDate,
      totalMinutes: weekSessions.reduce((sum: number, s: any) => sum + (s.duration_minutes || 0), 0),
      totalSessions: weekSessions.length,
      dailyStats: [],
      mostProductiveDay: weekSessions.length > 0 ? weekSessions[0].date : null,
      mostProductiveTime: '09:00',
      averageSessionsPerDay: weekSessions.length / 7,
    };
  },
  getTaskTimeStats: async (taskId: number) => {
    const taskSessions = timeSessions.filter((s: any) => s.task_id === taskId);
    const totalMinutes = taskSessions.reduce((sum: number, s: any) => sum + (s.duration_minutes || 0), 0);
    return {
      taskId,
      totalMinutes,
      pomodorosCompleted: taskSessions.length,
      averageFocusQuality: 'medium' as const,
      sessions: taskSessions,
    };
  },
  getTodaySessionCount: async () => {
    const today = fmtDate(new Date());
    return timeSessions.filter((s: any) => s.date === today).length;
  },

  // Weekly Planner
  getWeeklyPlan: async (_weekStartDate: string) => weeklyPlans.find((p: any) => p.week_start_date === _weekStartDate) ?? null,
  getCurrentWeeklyPlan: async () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysToMon = (dayOfWeek || 7) - 1; // Sunday (0) → 6, Monday (1) → 0, etc.
    const mon = new Date(today);
    mon.setDate(today.getDate() - daysToMon);
    const mondayStr = fmtDate(mon);
    return weeklyPlans.find((p: any) => p.week_start_date === mondayStr) ?? (weeklyPlans.length > 0 ? weeklyPlans[weeklyPlans.length - 1] : null);
  },
  getAllWeeklyPlans: async () => weeklyPlans,
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
  getWeeklyStats: async (_weekStartDate: string) => {
    const weekStart = new Date(_weekStartDate);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const plan = weeklyPlans.find((p: any) => p.week_start_date === _weekStartDate);
    const weekTasks = tasks.filter((t: any) => {
      if (!t.due_date) return false;
      const d = new Date(t.due_date);
      return d >= weekStart && d < weekEnd;
    });
    const completed = weekTasks.filter((t: any) => t.status === 'done');
    const weekSessions = timeSessions.filter((s: any) => {
      const d = new Date(s.date);
      return d >= weekStart && d < weekEnd;
    });
    const totalMins = weekSessions.reduce((sum: number, s: any) => sum + (s.duration_minutes || 0), 0);
    const goals = plan?.goals ?? [];
    return {
      totalTasksPlanned: weekTasks.length,
      totalTasksCompleted: completed.length,
      completionRate: weekTasks.length > 0 ? Math.round((completed.length / weekTasks.length) * 100) : 0,
      totalTimeMinutes: totalMins,
      averageFocusQuality: 2.5,
      mostProductiveDay: weekSessions.length > 0 ? weekSessions[0].date : null,
      goalsCompleted: goals.filter((g: any) => g.completed).length,
      goalsTotal: goals.length,
      estimationAccuracy: null,
    };
  },

  // Copilot
  copilot: {
    init: async () => ({ isConnected: false, isInitialized: false }),
    send: async (_prompt: string) => ({ success: false, response: 'Copilot is not available in browser mode.' }),
    generateContent: async (_prompt: string) => ({ success: false, error: 'Copilot is not available in browser mode.' }),
    status: async () => ({ isConnected: false, isInitialized: false }),
    stop: async () => ({ success: true }),
    onDelta: (_callback: (delta: string) => void) => () => {},
    onInlineDelta: (_callback: (delta: string) => void) => () => {},
    getSettings: async () => ({ provider: 'github', model: 'gpt-4o', hasApiKey: false, hasGithubToken: false }),
    updateSettings: async (_settings: any) => ({ isConnected: false, isInitialized: false }),
  },

  // Event listener (no-op in browser)
  on: (_channel: string, _callback: (...args: any[]) => void) => () => {},
};
