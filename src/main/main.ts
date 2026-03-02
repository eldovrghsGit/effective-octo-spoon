import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import { registerCopilotHandlers, cleanupCopilot } from './copilot/index.js';
import { registerTimeTrackingHandlers } from './time-tracking-handlers.js';
import { registerWeeklyPlannerHandlers } from './weekly-planner-handlers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;
let db: Database.Database;

// Initialize SQLite database
function initDatabase() {
  const dbPath = path.join(app.getPath('userData'), 'workplanner.db');
  db = new Database(dbPath);

  // Create tasks table
  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'todo',
      priority TEXT DEFAULT 'medium',
      moscow TEXT DEFAULT 'should',
      due_date TEXT,
      start_time TEXT,
      end_time TEXT,
      tags TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Migration: Add missing columns if they don't exist
  try {
    const tableInfo = db.pragma('table_info(tasks)') as Array<{ name: string }>;
    const hasStartTime = tableInfo.some((col) => col.name === 'start_time');
    const hasEndTime = tableInfo.some((col) => col.name === 'end_time');
    const hasTags = tableInfo.some((col) => col.name === 'tags');
    const hasMoscow = tableInfo.some((col) => col.name === 'moscow');
    
    if (!hasStartTime) {
      db.exec('ALTER TABLE tasks ADD COLUMN start_time TEXT');
      console.log('✅ Added start_time column to tasks table');
    }
    if (!hasEndTime) {
      db.exec('ALTER TABLE tasks ADD COLUMN end_time TEXT');
      console.log('✅ Added end_time column to tasks table');
    }
    if (!hasTags) {
      db.exec('ALTER TABLE tasks ADD COLUMN tags TEXT');
      console.log('✅ Added tags column to tasks table');
    }
    if (!hasMoscow) {
      db.exec("ALTER TABLE tasks ADD COLUMN moscow TEXT DEFAULT 'should'");
      console.log('✅ Added moscow column to tasks table');
    }
  } catch (error) {
    console.error('Migration error:', error);
  }

  // Create subtasks table
  db.exec(`
    CREATE TABLE IF NOT EXISTS subtasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      completed INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE
    )
  `);

  // Create notes table
  db.exec(`
    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT,
      tags TEXT,
      is_pinned INTEGER DEFAULT 0,
      color TEXT DEFAULT 'default',
      note_type TEXT DEFAULT 'regular',
      date TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Migration: Add missing columns to notes table if they don't exist
  try {
    const notesTableInfo = db.pragma('table_info(notes)') as Array<{ name: string }>;
    const hasNoteType = notesTableInfo.some((col) => col.name === 'note_type');
    const hasDate = notesTableInfo.some((col) => col.name === 'date');
    
    if (!hasNoteType) {
      db.exec("ALTER TABLE notes ADD COLUMN note_type TEXT DEFAULT 'regular'");
      console.log('✅ Added note_type column to notes table');
    }
    if (!hasDate) {
      db.exec('ALTER TABLE notes ADD COLUMN date TEXT');
      console.log('✅ Added date column to notes table');
    }
  } catch (error) {
    console.error('Notes table migration error:', error);
  }

  // Create habits table
  db.exec(`
    CREATE TABLE IF NOT EXISTS habits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      frequency TEXT DEFAULT 'daily',
      color TEXT DEFAULT 'blue',
      icon TEXT DEFAULT '💪',
      target_count INTEGER DEFAULT 1,
      current_streak INTEGER DEFAULT 0,
      best_streak INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create habit_completions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS habit_completions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      habit_id INTEGER NOT NULL,
      completed_date TEXT NOT NULL,
      count INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (habit_id) REFERENCES habits (id) ON DELETE CASCADE,
      UNIQUE(habit_id, completed_date)
    )
  `);

  // Create journal table
  db.exec(`
    CREATE TABLE IF NOT EXISTS journal (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT,
      mood TEXT DEFAULT 'okay',
      date TEXT NOT NULL,
      tags TEXT,
      weather TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create time_sessions table for Pomodoro timer tracking
  db.exec(`
    CREATE TABLE IF NOT EXISTS time_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER,
      session_type TEXT DEFAULT 'pomodoro',
      duration_minutes INTEGER,
      planned_duration INTEGER DEFAULT 25,
      start_time TEXT,
      end_time TEXT,
      interruptions INTEGER DEFAULT 0,
      focus_quality TEXT DEFAULT 'medium',
      notes TEXT,
      completed INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE
    )
  `);

  // Migration: Add time tracking columns to tasks table
  try {
    const tasksTableInfo = db.pragma('table_info(tasks)') as Array<{ name: string }>;
    const hasEstimatedMinutes = tasksTableInfo.some((col) => col.name === 'estimated_minutes');
    const hasActualMinutes = tasksTableInfo.some((col) => col.name === 'actual_minutes');
    const hasPomodorosCompleted = tasksTableInfo.some((col) => col.name === 'pomodoros_completed');
    const hasEnergyLevel = tasksTableInfo.some((col) => col.name === 'energy_level');
    const hasBestTimeOfDay = tasksTableInfo.some((col) => col.name === 'best_time_of_day');

    if (!hasEstimatedMinutes) {
      db.exec('ALTER TABLE tasks ADD COLUMN estimated_minutes INTEGER');
      console.log('✅ Added estimated_minutes column to tasks table');
    }
    if (!hasActualMinutes) {
      db.exec('ALTER TABLE tasks ADD COLUMN actual_minutes INTEGER DEFAULT 0');
      console.log('✅ Added actual_minutes column to tasks table');
    }
    if (!hasPomodorosCompleted) {
      db.exec('ALTER TABLE tasks ADD COLUMN pomodoros_completed INTEGER DEFAULT 0');
      console.log('✅ Added pomodoros_completed column to tasks table');
    }
    if (!hasEnergyLevel) {
      db.exec("ALTER TABLE tasks ADD COLUMN energy_level TEXT DEFAULT 'medium'");
      console.log('✅ Added energy_level column to tasks table');
    }
    if (!hasBestTimeOfDay) {
      db.exec('ALTER TABLE tasks ADD COLUMN best_time_of_day TEXT');
      console.log('✅ Added best_time_of_day column to tasks table');
    }
  } catch (error) {
    console.error('Tasks time tracking migration error:', error);
  }

  // Create weekly_plans table for weekly planning
  db.exec(`
    CREATE TABLE IF NOT EXISTS weekly_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      week_start_date TEXT UNIQUE,
      goals TEXT,
      priorities TEXT,
      capacity_hours INTEGER DEFAULT 40,
      notes TEXT,
      status TEXT DEFAULT 'planning',
      copilot_suggestions TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create weekly_reviews table for weekly analysis
  db.exec(`
    CREATE TABLE IF NOT EXISTS weekly_reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      weekly_plan_id INTEGER,
      week_start_date TEXT,
      tasks_planned INTEGER DEFAULT 0,
      tasks_completed INTEGER DEFAULT 0,
      total_time_minutes INTEGER DEFAULT 0,
      productivity_score REAL,
      best_time_of_day TEXT,
      avg_focus_quality REAL,
      estimation_accuracy REAL,
      copilot_insights TEXT,
      improvement_suggestions TEXT,
      wins TEXT,
      challenges TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (weekly_plan_id) REFERENCES weekly_plans (id) ON DELETE CASCADE
    )
  `);

  // Migration: Add weekly_plan_id to tasks table
  try {
    const tasksTableInfo2 = db.pragma('table_info(tasks)') as Array<{ name: string }>;
    const hasWeeklyPlanId = tasksTableInfo2.some((col) => col.name === 'weekly_plan_id');

    if (!hasWeeklyPlanId) {
      db.exec('ALTER TABLE tasks ADD COLUMN weekly_plan_id INTEGER');
      console.log('✅ Added weekly_plan_id column to tasks table');
    }
  } catch (error) {
    console.error('Tasks weekly plan migration error:', error);
  }

  // Create tags table for storing unique tags with usage count
  db.exec(`
    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      color TEXT DEFAULT 'blue',
      usage_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log('Database initialized at:', dbPath);
}

async function createWindow() {
  const preloadPath = path.join(__dirname, '../dist-preload/preload.js');
  console.log('Preload path:', preloadPath);
  console.log('NODE_ENV:', process.env.NODE_ENV);
  
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#1e293b',
      symbolColor: '#ffffff',
      height: 40,
    },
  });

  // Load the app
  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) {
    // Try common Vite ports
    const tryPorts = [5173, 5174, 5175, 5176];
    let loaded = false;
    
    for (const port of tryPorts) {
      try {
        const devUrl = `http://localhost:${port}`;
        console.log('Trying dev URL:', devUrl);
        await mainWindow.loadURL(devUrl);
        console.log('Successfully loaded from port:', port);
        loaded = true;
        break;
      } catch (err) {
        console.log(`Port ${port} failed, trying next...`);
      }
    }
    
    if (!loaded) {
      console.error('Could not connect to Vite dev server on any common port');
    }
    
    mainWindow.webContents.openDevTools();
  } else {
    const indexPath = path.join(__dirname, '../dist-renderer/index.html');
    console.log('Loading production file:', indexPath);
    mainWindow.loadFile(indexPath);
  }

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load:', errorCode, errorDescription);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC Handlers for database operations
ipcMain.handle('db:getTasks', () => {
  console.log('📋 Getting all tasks from database...');
  const stmt = db.prepare('SELECT * FROM tasks ORDER BY created_at DESC');
  const tasks = stmt.all();
  console.log(`📋 Found ${tasks.length} tasks:`, tasks);
  return tasks;
});

ipcMain.handle('db:createTask', (_, task: any) => {
  console.log('➕ Creating task:', task);
  const stmt = db.prepare(`
    INSERT INTO tasks (title, description, status, priority, moscow, due_date, start_time, end_time, tags)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    task.title,
    task.description || null,
    task.status || 'todo',
    task.priority || 'medium',
    task.moscow || 'should',
    task.due_date || null,
    task.start_time || null,
    task.end_time || null,
    task.tags || null
  );
  const newTask = { id: result.lastInsertRowid, ...task };
  console.log('✅ Task created with ID:', newTask.id);
  return newTask;
});

ipcMain.handle('db:updateTask', (_, id: number, updates: any) => {
  const fields = Object.keys(updates)
    .map(key => `${key} = ?`)
    .join(', ');
  const values = Object.values(updates);
  
  const stmt = db.prepare(`
    UPDATE tasks 
    SET ${fields}, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);
  stmt.run([...values, id]);
  
  return db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
});

ipcMain.handle('db:deleteTask', (_, id: number) => {
  const stmt = db.prepare('DELETE FROM tasks WHERE id = ?');
  stmt.run(id);
  return { success: true };
});

// Subtask handlers
ipcMain.handle('db:getSubtasks', (_, taskId: number) => {
  const stmt = db.prepare('SELECT * FROM subtasks WHERE task_id = ? ORDER BY created_at ASC');
  return stmt.all(taskId);
});

ipcMain.handle('db:createSubtask', (_, subtask: any) => {
  const stmt = db.prepare(`
    INSERT INTO subtasks (task_id, title, completed)
    VALUES (?, ?, ?)
  `);
  const result = stmt.run(
    subtask.task_id,
    subtask.title,
    subtask.completed ? 1 : 0
  );
  return { id: result.lastInsertRowid, ...subtask };
});

ipcMain.handle('db:updateSubtask', (_, id: number, updates: any) => {
  const fields = Object.keys(updates)
    .map(key => `${key} = ?`)
    .join(', ');
  const values = Object.values(updates).map(v => typeof v === 'boolean' ? (v ? 1 : 0) : v);
  
  const stmt = db.prepare(`UPDATE subtasks SET ${fields} WHERE id = ?`);
  stmt.run([...values, id]);
  
  return db.prepare('SELECT * FROM subtasks WHERE id = ?').get(id);
});

ipcMain.handle('db:deleteSubtask', (_, id: number) => {
  const stmt = db.prepare('DELETE FROM subtasks WHERE id = ?');
  stmt.run(id);
  return { success: true };
});

// Tags handlers
ipcMain.handle('db:getTags', () => {
  const stmt = db.prepare('SELECT * FROM tags ORDER BY usage_count DESC, name ASC');
  return stmt.all();
});

ipcMain.handle('db:createTag', (_, tagName: string) => {
  const name = tagName.trim().toLowerCase();
  if (!name) return null;
  
  // Check if tag already exists
  const existing = db.prepare('SELECT * FROM tags WHERE name = ?').get(name);
  if (existing) {
    return existing;
  }
  
  const stmt = db.prepare(`
    INSERT INTO tags (name, usage_count)
    VALUES (?, 0)
  `);
  const result = stmt.run(name);
  return { id: result.lastInsertRowid, name, usage_count: 0 };
});

ipcMain.handle('db:updateTagUsage', (_, tagNames: string[]) => {
  // Increment usage count for each tag, create if doesn't exist
  const insertOrUpdate = db.prepare(`
    INSERT INTO tags (name, usage_count) VALUES (?, 1)
    ON CONFLICT(name) DO UPDATE SET 
      usage_count = usage_count + 1,
      updated_at = CURRENT_TIMESTAMP
  `);
  
  const transaction = db.transaction((tags: string[]) => {
    for (const tag of tags) {
      const name = tag.trim().toLowerCase();
      if (name) {
        insertOrUpdate.run(name);
      }
    }
  });
  
  transaction(tagNames);
  return { success: true };
});

ipcMain.handle('db:deleteTag', (_, id: number) => {
  const stmt = db.prepare('DELETE FROM tags WHERE id = ?');
  stmt.run(id);
  return { success: true };
});

ipcMain.handle('db:searchTags', (_, query: string) => {
  const searchTerm = `%${query.toLowerCase()}%`;
  const stmt = db.prepare('SELECT * FROM tags WHERE name LIKE ? ORDER BY usage_count DESC LIMIT 10');
  return stmt.all(searchTerm);
});

// Notes handlers
ipcMain.handle('db:getNotes', () => {
  const stmt = db.prepare('SELECT * FROM notes ORDER BY is_pinned DESC, updated_at DESC');
  return stmt.all();
});

ipcMain.handle('db:createNote', (_, note: any) => {
  const stmt = db.prepare(`
    INSERT INTO notes (title, content, tags, is_pinned, color, note_type, date)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    note.title,
    note.content || null,
    note.tags || null,
    note.is_pinned ? 1 : 0,
    note.color || 'default',
    note.note_type || 'regular',
    note.date || null
  );
  return { id: result.lastInsertRowid, ...note };
});

ipcMain.handle('db:updateNote', (_, id: number, updates: any) => {
  const fields = Object.keys(updates)
    .map(key => `${key} = ?`)
    .join(', ');
  const values = Object.values(updates).map(v => typeof v === 'boolean' ? (v ? 1 : 0) : v);
  
  const stmt = db.prepare(`
    UPDATE notes 
    SET ${fields}, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);
  stmt.run([...values, id]);
  
  return db.prepare('SELECT * FROM notes WHERE id = ?').get(id);
});

ipcMain.handle('db:deleteNote', (_, id: number) => {
  const stmt = db.prepare('DELETE FROM notes WHERE id = ?');
  stmt.run(id);
  return { success: true };
});

// Habits handlers
ipcMain.handle('db:getHabits', () => {
  const stmt = db.prepare('SELECT * FROM habits ORDER BY created_at DESC');
  return stmt.all();
});

ipcMain.handle('db:createHabit', (_, habit: any) => {
  const stmt = db.prepare(`
    INSERT INTO habits (name, description, frequency, color, icon, target_count)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    habit.name,
    habit.description || null,
    habit.frequency || 'daily',
    habit.color || 'blue',
    habit.icon || '💪',
    habit.target_count || 1
  );
  return { id: result.lastInsertRowid, ...habit, current_streak: 0, best_streak: 0 };
});

ipcMain.handle('db:updateHabit', (_, id: number, updates: any) => {
  const fields = Object.keys(updates)
    .map(key => `${key} = ?`)
    .join(', ');
  const values = Object.values(updates);
  
  const stmt = db.prepare(`
    UPDATE habits 
    SET ${fields}, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);
  stmt.run([...values, id]);
  
  return db.prepare('SELECT * FROM habits WHERE id = ?').get(id);
});

ipcMain.handle('db:deleteHabit', (_, id: number) => {
  db.prepare('DELETE FROM habit_completions WHERE habit_id = ?').run(id);
  db.prepare('DELETE FROM habits WHERE id = ?').run(id);
  return { success: true };
});

// Habit Completions handlers
ipcMain.handle('db:getHabitCompletions', () => {
  const stmt = db.prepare('SELECT * FROM habit_completions ORDER BY completed_date DESC');
  return stmt.all();
});

ipcMain.handle('db:toggleHabitCompletion', (_, habitId: number, date: string) => {
  // Check if completion exists
  const existing = db.prepare(
    'SELECT * FROM habit_completions WHERE habit_id = ? AND completed_date = ?'
  ).get(habitId, date) as any;

  if (existing) {
    // Remove completion
    db.prepare('DELETE FROM habit_completions WHERE id = ?').run(existing.id);
    // Update streak (simplified - just decrement)
    db.prepare('UPDATE habits SET current_streak = MAX(0, current_streak - 1) WHERE id = ?').run(habitId);
    return { completed: false };
  } else {
    // Add completion
    db.prepare(
      'INSERT INTO habit_completions (habit_id, completed_date, count) VALUES (?, ?, 1)'
    ).run(habitId, date);
    // Update streak
    const habit = db.prepare('SELECT * FROM habits WHERE id = ?').get(habitId) as any;
    const newStreak = (habit?.current_streak || 0) + 1;
    const bestStreak = Math.max(newStreak, habit?.best_streak || 0);
    db.prepare('UPDATE habits SET current_streak = ?, best_streak = ? WHERE id = ?').run(newStreak, bestStreak, habitId);
    return { completed: true };
  }
});

// Journal handlers
ipcMain.handle('db:getJournalEntries', () => {
  const stmt = db.prepare('SELECT * FROM journal ORDER BY date DESC, created_at DESC');
  return stmt.all();
});

ipcMain.handle('db:createJournalEntry', (_, entry: any) => {
  const stmt = db.prepare(`
    INSERT INTO journal (title, content, mood, date, tags, weather)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    entry.title,
    entry.content || null,
    entry.mood || 'okay',
    entry.date,
    entry.tags || null,
    entry.weather || null
  );
  return { id: result.lastInsertRowid, ...entry };
});

ipcMain.handle('db:updateJournalEntry', (_, id: number, updates: any) => {
  const fields = Object.keys(updates)
    .map(key => `${key} = ?`)
    .join(', ');
  const values = Object.values(updates);
  
  const stmt = db.prepare(`
    UPDATE journal 
    SET ${fields}, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);
  stmt.run([...values, id]);
  
  return db.prepare('SELECT * FROM journal WHERE id = ?').get(id);
});

ipcMain.handle('db:deleteJournalEntry', (_, id: number) => {
  const stmt = db.prepare('DELETE FROM journal WHERE id = ?');
  stmt.run(id);
  return { success: true };
});

// Helper function to get main window
function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}

// App lifecycle
app.whenReady().then(async () => {
  initDatabase();
  
  // Register Time Tracking handlers
  registerTimeTrackingHandlers(db);
  
  // Register Weekly Planner handlers
  registerWeeklyPlannerHandlers(db);
  
  // Register Copilot handlers
  registerCopilotHandlers(db, getMainWindow);
  
  await createWindow();

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    db.close();
    app.quit();
  }
});

app.on('before-quit', async () => {
  // Cleanup Copilot before quitting
  await cleanupCopilot();
  
  if (db) {
    db.close();
  }
});
