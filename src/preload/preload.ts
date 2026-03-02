import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // Tasks
  getTasks: () => ipcRenderer.invoke('db:getTasks'),
  createTask: (task: any) => ipcRenderer.invoke('db:createTask', task),
  updateTask: (id: number, updates: any) => ipcRenderer.invoke('db:updateTask', id, updates),
  deleteTask: (id: number) => ipcRenderer.invoke('db:deleteTask', id),
  
  // Subtasks
  getSubtasks: (taskId: number) => ipcRenderer.invoke('db:getSubtasks', taskId),
  createSubtask: (subtask: any) => ipcRenderer.invoke('db:createSubtask', subtask),
  updateSubtask: (id: number, updates: any) => ipcRenderer.invoke('db:updateSubtask', id, updates),
  deleteSubtask: (id: number) => ipcRenderer.invoke('db:deleteSubtask', id),
  
  // Tags
  getTags: () => ipcRenderer.invoke('db:getTags'),
  createTag: (tagName: string) => ipcRenderer.invoke('db:createTag', tagName),
  updateTagUsage: (tagNames: string[]) => ipcRenderer.invoke('db:updateTagUsage', tagNames),
  deleteTag: (id: number) => ipcRenderer.invoke('db:deleteTag', id),
  searchTags: (query: string) => ipcRenderer.invoke('db:searchTags', query),
  
  // Notes
  getNotes: () => ipcRenderer.invoke('db:getNotes'),
  createNote: (note: any) => ipcRenderer.invoke('db:createNote', note),
  updateNote: (id: number, updates: any) => ipcRenderer.invoke('db:updateNote', id, updates),
  deleteNote: (id: number) => ipcRenderer.invoke('db:deleteNote', id),

  // Habits
  getHabits: () => ipcRenderer.invoke('db:getHabits'),
  createHabit: (habit: any) => ipcRenderer.invoke('db:createHabit', habit),
  updateHabit: (id: number, updates: any) => ipcRenderer.invoke('db:updateHabit', id, updates),
  deleteHabit: (id: number) => ipcRenderer.invoke('db:deleteHabit', id),
  getHabitCompletions: () => ipcRenderer.invoke('db:getHabitCompletions'),
  toggleHabitCompletion: (habitId: number, date: string) => ipcRenderer.invoke('db:toggleHabitCompletion', habitId, date),

  // Journal
  getJournalEntries: () => ipcRenderer.invoke('db:getJournalEntries'),
  createJournalEntry: (entry: any) => ipcRenderer.invoke('db:createJournalEntry', entry),
  updateJournalEntry: (id: number, updates: any) => ipcRenderer.invoke('db:updateJournalEntry', id, updates),
  deleteJournalEntry: (id: number) => ipcRenderer.invoke('db:deleteJournalEntry', id),

  // Time Tracking / Pomodoro Timer
  getTimeSessions: () => ipcRenderer.invoke('db:getTimeSessions'),
  getTimeSessionsByTask: (taskId: number) => ipcRenderer.invoke('db:getTimeSessionsByTask', taskId),
  getTimeSessionsByDate: (date: string) => ipcRenderer.invoke('db:getTimeSessionsByDate', date),
  createTimeSession: (session: any) => ipcRenderer.invoke('db:createTimeSession', session),
  updateTimeSession: (id: number, updates: any) => ipcRenderer.invoke('db:updateTimeSession', id, updates),
  deleteTimeSession: (id: number) => ipcRenderer.invoke('db:deleteTimeSession', id),
  getDailyTimeStats: (date: string) => ipcRenderer.invoke('db:getDailyTimeStats', date),
  getWeeklyTimeStats: (weekStartDate: string) => ipcRenderer.invoke('db:getWeeklyTimeStats', weekStartDate),
  getTaskTimeStats: (taskId: number) => ipcRenderer.invoke('db:getTaskTimeStats', taskId),
  getTodaySessionCount: () => ipcRenderer.invoke('db:getTodaySessionCount'),

  // Weekly Planner
  getWeeklyPlan: (weekStartDate: string) => ipcRenderer.invoke('db:getWeeklyPlan', weekStartDate),
  getCurrentWeeklyPlan: () => ipcRenderer.invoke('db:getCurrentWeeklyPlan'),
  getAllWeeklyPlans: () => ipcRenderer.invoke('db:getAllWeeklyPlans'),
  createWeeklyPlan: (data: any) => ipcRenderer.invoke('db:createWeeklyPlan', data),
  updateWeeklyPlan: (id: number, data: any) => ipcRenderer.invoke('db:updateWeeklyPlan', id, data),
  deleteWeeklyPlan: (id: number) => ipcRenderer.invoke('db:deleteWeeklyPlan', id),

  // Weekly Reviews
  getWeeklyReview: (weeklyPlanId: number) => ipcRenderer.invoke('db:getWeeklyReview', weeklyPlanId),
  getWeeklyReviewByDate: (weekStartDate: string) => ipcRenderer.invoke('db:getWeeklyReviewByDate', weekStartDate),
  createWeeklyReview: (data: any) => ipcRenderer.invoke('db:createWeeklyReview', data),
  updateWeeklyReview: (id: number, data: any) => ipcRenderer.invoke('db:updateWeeklyReview', id, data),

  // Weekly Statistics
  getWeeklyStats: (weekStartDate: string) => ipcRenderer.invoke('db:getWeeklyStats', weekStartDate),
  
  // Copilot AI Assistant
  copilot: {
    init: () => ipcRenderer.invoke('copilot:init'),
    send: (prompt: string) => ipcRenderer.invoke('copilot:send', prompt),
    status: () => ipcRenderer.invoke('copilot:status'),
    stop: () => ipcRenderer.invoke('copilot:stop'),
    onDelta: (callback: (delta: string) => void) => {
      const handler = (_event: any, delta: string) => callback(delta);
      ipcRenderer.on('copilot:delta', handler);
      return () => ipcRenderer.removeListener('copilot:delta', handler);
    },
  },
  
  // Generic event listener for tasks refresh
  on: (channel: string, callback: (...args: any[]) => void) => {
    const handler = (_event: any, ...args: any[]) => callback(...args);
    ipcRenderer.on(channel, handler);
    return () => ipcRenderer.removeListener(channel, handler);
  },
});
