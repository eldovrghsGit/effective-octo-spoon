/**
 * Copilot SDK Integration Service
 *
 * Uses @github/copilot-sdk to provide AI assistant capabilities.
 * The SDK talks to GitHub Copilot CLI via JSON-RPC and supports
 * streaming, custom tools, and system-message customisation.
 *
 * Authentication:
 *  1. Logged-in GitHub CLI user (default — no config needed)
 *  2. GitHub token passed via settings
 *  3. Custom provider (OpenAI / Azure / Anthropic / Ollama)
 *
 * @module copilot-service
 */

import { CopilotClient, CopilotSession, defineTool } from '@github/copilot-sdk';
import { z } from 'zod';
import Database from 'better-sqlite3';

// ────────────────────── Types ──────────────────────

export interface CopilotMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface CopilotStatus {
  isConnected: boolean;
  isInitialized: boolean;
  model?: string;
  error?: string;
}

export interface CopilotSettings {
  provider: 'github' | 'openai' | 'azure' | 'anthropic' | 'ollama';
  model: string;
  apiKey?: string;
  baseUrl?: string;
  githubToken?: string;
}

const DEFAULT_SETTINGS: CopilotSettings = {
  provider: 'github',
  model: 'gpt-4o',
};

// ────────────────────── Singletons ──────────────────────

let db: Database.Database | null = null;
let client: CopilotClient | null = null;
let session: CopilotSession | null = null;
let currentSettings: CopilotSettings = { ...DEFAULT_SETTINGS };
let currentStatus: CopilotStatus = {
  isConnected: false,
  isInitialized: false,
};

// ────────────────────── Helpers: app-data tools ──────────────────────

function getAppTools() {
  if (!db) return [];

  return [
    defineTool('get_tasks', {
      description:
        'Retrieve tasks from the user\'s personal tracker. Can filter by status, priority, or MoSCoW category. Returns JSON array of tasks.',
      parameters: z.object({
        status: z
          .enum(['todo', 'in-progress', 'done', 'all'])
          .optional()
          .describe('Filter by task status. Defaults to "all".'),
        priority: z
          .enum(['low', 'medium', 'high', 'all'])
          .optional()
          .describe('Filter by priority.'),
        moscow: z
          .enum(['must', 'should', 'want', 'wont', 'all'])
          .optional()
          .describe('Filter by MoSCoW category.'),
        limit: z.number().optional().describe('Max results to return. Default 50.'),
      }),
      handler: async ({ status, priority, moscow, limit }) => {
        console.log('🔧 Tool: get_tasks called with', { status, priority, moscow, limit });
        try {
          let sql = 'SELECT * FROM tasks WHERE 1=1';
          const params: any[] = [];

          if (status && status !== 'all') {
            sql += ' AND status = ?';
            params.push(status);
          }
          if (priority && priority !== 'all') {
            sql += ' AND priority = ?';
            params.push(priority);
          }
          if (moscow && moscow !== 'all') {
            sql += ' AND moscow = ?';
            params.push(moscow);
          }
          sql += ' ORDER BY created_at DESC LIMIT ?';
          params.push(limit ?? 50);

          const rows = db!.prepare(sql).all(...params);
          console.log('🔧 Tool: get_tasks returned', rows.length, 'rows');
          return JSON.stringify(rows, null, 2);
        } catch (err) {
          console.error('🔧 Tool: get_tasks ERROR:', err);
          return JSON.stringify({ error: String(err) });
        }
      },
    }),

    defineTool('create_task', {
      description:
        'Create a new task in the user\'s personal tracker. Returns the created task.',
      parameters: z.object({
        title: z.string().describe('Task title (required)'),
        description: z.string().optional().describe('Task description'),
        priority: z.enum(['low', 'medium', 'high']).optional().describe('Priority level. Defaults to medium.'),
        moscow: z
          .enum(['must', 'should', 'want', 'wont'])
          .optional()
          .describe('MoSCoW category. Defaults to should.'),
        due_date: z.string().optional().describe('Due date in YYYY-MM-DD format.'),
        start_time: z.string().optional().describe('Start time in HH:MM format.'),
        end_time: z.string().optional().describe('End time in HH:MM format.'),
        tags: z.string().optional().describe('Comma-separated tags.'),
      }),
      handler: async ({ title, description, priority, moscow, due_date, start_time, end_time, tags }) => {
        const stmt = db!.prepare(`
          INSERT INTO tasks (title, description, status, priority, moscow, due_date, start_time, end_time, tags)
          VALUES (?, ?, 'todo', ?, ?, ?, ?, ?, ?)
        `);
        const result = stmt.run(
          title,
          description ?? '',
          priority ?? 'medium',
          moscow ?? 'should',
          due_date ?? null,
          start_time ?? null,
          end_time ?? null,
          tags ?? null,
        );
        const created = db!.prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid);
        return JSON.stringify(created, null, 2);
      },
    }),

    defineTool('update_task', {
      description: 'Update an existing task by ID. Only changed fields need to be provided.',
      parameters: z.object({
        id: z.number().describe('Task ID to update'),
        title: z.string().optional(),
        description: z.string().optional(),
        status: z.enum(['todo', 'in-progress', 'done']).optional(),
        priority: z.enum(['low', 'medium', 'high']).optional(),
        moscow: z.enum(['must', 'should', 'want', 'wont']).optional(),
        due_date: z.string().optional(),
        start_time: z.string().optional(),
        end_time: z.string().optional(),
        tags: z.string().optional(),
      }),
      handler: async (params) => {
        const { id, ...updates } = params;
        const sets: string[] = [];
        const vals: any[] = [];

        for (const [key, value] of Object.entries(updates)) {
          if (value !== undefined) {
            sets.push(`${key} = ?`);
            vals.push(value);
          }
        }
        if (sets.length === 0) return 'No fields to update.';

        sets.push("updated_at = datetime('now')");
        vals.push(id);

        db!.prepare(`UPDATE tasks SET ${sets.join(', ')} WHERE id = ?`).run(...vals);
        const updated = db!.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
        return JSON.stringify(updated, null, 2);
      },
    }),

    defineTool('get_habits', {
      description: 'Retrieve the user\'s habit list with streak information.',
      parameters: z.object({}),
      handler: async () => {
        const habits = db!.prepare('SELECT * FROM habits ORDER BY created_at DESC').all();
        return JSON.stringify(habits, null, 2);
      },
    }),

    defineTool('get_habit_completions', {
      description: 'Get habit completion records to analyse streaks and consistency.',
      parameters: z.object({
        days: z.number().optional().describe('Number of days back to look. Defaults to 30.'),
      }),
      handler: async ({ days }) => {
        const d = days ?? 30;
        const rows = db!
          .prepare(
            `SELECT hc.*, h.name as habit_name
             FROM habit_completions hc
             JOIN habits h ON hc.habit_id = h.id
             WHERE hc.completed_date >= date('now', '-' || ? || ' days')
             ORDER BY hc.completed_date DESC`,
          )
          .all(d);
        return JSON.stringify(rows, null, 2);
      },
    }),

    defineTool('get_journal_entries', {
      description: 'Retrieve journal entries. Useful for mood tracking and reflection analysis.',
      parameters: z.object({
        days: z.number().optional().describe('Number of recent days. Defaults to 14.'),
      }),
      handler: async ({ days }) => {
        const d = days ?? 14;
        const rows = db!
          .prepare(
            `SELECT * FROM journal
             WHERE date >= date('now', '-' || ? || ' days')
             ORDER BY date DESC`,
          )
          .all(d);
        return JSON.stringify(rows, null, 2);
      },
    }),

    defineTool('get_time_sessions', {
      description:
        'Get Pomodoro / focus time sessions. Useful for productivity analysis.',
      parameters: z.object({
        days: z.number().optional().describe('Number of recent days. Defaults to 7.'),
        task_id: z.number().optional().describe('Filter by task ID.'),
      }),
      handler: async ({ days, task_id }) => {
        let sql = `SELECT ts.*, t.title as task_title
                   FROM time_sessions ts
                   LEFT JOIN tasks t ON ts.task_id = t.id
                   WHERE ts.created_at >= date('now', '-' || ? || ' days')`;
        const params: any[] = [days ?? 7];

        if (task_id) {
          sql += ' AND ts.task_id = ?';
          params.push(task_id);
        }
        sql += ' ORDER BY ts.created_at DESC';

        const rows = db!.prepare(sql).all(...params);
        return JSON.stringify(rows, null, 2);
      },
    }),

    defineTool('get_notes', {
      description: 'Retrieve the user\'s notes.',
      parameters: z.object({
        limit: z.number().optional().describe('Max results. Defaults to 20.'),
      }),
      handler: async ({ limit }) => {
        const rows = db!
          .prepare('SELECT * FROM notes ORDER BY updated_at DESC LIMIT ?')
          .all(limit ?? 20);
        return JSON.stringify(rows, null, 2);
      },
    }),

    defineTool('write_daily_note', {
      description:
        'Write or replace the content of a daily note for a specific date. The content should be valid HTML (paragraphs, headings, lists, etc). If no daily note exists for the date, one will be created.',
      parameters: z.object({
        date: z.string().describe('Date in YYYY-MM-DD format. Use today\'s date if not specified.'),
        content: z.string().describe('HTML content to write into the daily note. Use semantic HTML: <h2>, <p>, <ul><li>...</li></ul>, <ol>, <blockquote>, etc.'),
        title: z.string().optional().describe('Optional title for the note. Defaults to "Daily – <date>".'),
      }),
      handler: async ({ date, content, title }) => {
        const existing = db!.prepare(
          "SELECT * FROM notes WHERE date = ? AND note_type = 'daily_planner'",
        ).get(date) as any;

        if (existing) {
          db!.prepare(
            "UPDATE notes SET content = ?, title = ?, updated_at = datetime('now') WHERE id = ?",
          ).run(content, title ?? existing.title, existing.id);
          return JSON.stringify({ action: 'updated', id: existing.id, date });
        } else {
          const result = db!.prepare(
            `INSERT INTO notes (title, content, date, note_type, is_pinned, color)
             VALUES (?, ?, ?, 'daily_planner', 0, 'default')`,
          ).run(title ?? `Daily – ${date}`, content, date);
          return JSON.stringify({ action: 'created', id: result.lastInsertRowid, date });
        }
      },
    }),

    defineTool('append_to_daily_note', {
      description:
        'Append HTML content to an existing daily note (or create one with the content). Use this when the user asks to add something to today\'s note without overwriting existing content.',
      parameters: z.object({
        date: z.string().describe('Date in YYYY-MM-DD format.'),
        content: z.string().describe('HTML content to append. Use semantic HTML tags.'),
      }),
      handler: async ({ date, content }) => {
        const existing = db!.prepare(
          "SELECT * FROM notes WHERE date = ? AND note_type = 'daily_planner'",
        ).get(date) as any;

        if (existing) {
          const updated = (existing.content || '') + '\n' + content;
          db!.prepare(
            "UPDATE notes SET content = ?, updated_at = datetime('now') WHERE id = ?",
          ).run(updated, existing.id);
          return JSON.stringify({ action: 'appended', id: existing.id, date });
        } else {
          const result = db!.prepare(
            `INSERT INTO notes (title, content, date, note_type, is_pinned, color)
             VALUES (?, ?, ?, 'daily_planner', 0, 'default')`,
          ).run(`Daily – ${date}`, content, date);
          return JSON.stringify({ action: 'created', id: result.lastInsertRowid, date });
        }
      },
    }),

    defineTool('get_weekly_plan', {
      description: 'Get the current or a specific weekly plan.',
      parameters: z.object({
        week_start_date: z
          .string()
          .optional()
          .describe('Week start date (YYYY-MM-DD, Monday). Empty = current week.'),
      }),
      handler: async ({ week_start_date }) => {
        let plan;
        if (week_start_date) {
          plan = db!.prepare('SELECT * FROM weekly_plans WHERE week_start_date = ?').get(week_start_date);
        } else {
          plan = db!.prepare("SELECT * FROM weekly_plans ORDER BY week_start_date DESC LIMIT 1").get();
        }
        return plan ? JSON.stringify(plan, null, 2) : 'No weekly plan found.';
      },
    }),

    defineTool('get_productivity_summary', {
      description:
        'Get a comprehensive productivity summary including task stats, time tracked, habits, and recent activity. Useful for daily/weekly reviews.',
      parameters: z.object({
        days: z.number().optional().describe('Number of days to summarise. Defaults to 7.'),
      }),
      handler: async ({ days }) => {
        const d = days ?? 7;

        const taskStats = db!
          .prepare(
            `SELECT
               COUNT(*) as total,
               SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as done,
               SUM(CASE WHEN status = 'in-progress' THEN 1 ELSE 0 END) as in_progress,
               SUM(CASE WHEN status = 'todo' THEN 1 ELSE 0 END) as todo,
               SUM(CASE WHEN moscow = 'must' AND status != 'done' THEN 1 ELSE 0 END) as must_pending
             FROM tasks`,
          )
          .get();

        const recentCompleted = db!
          .prepare(
            `SELECT COUNT(*) as count FROM tasks
             WHERE status = 'done' AND updated_at >= date('now', '-' || ? || ' days')`,
          )
          .get(d) as any;

        const timeStats = db!
          .prepare(
            `SELECT
               COALESCE(SUM(duration_minutes), 0) as total_minutes,
               COUNT(*) as sessions
             FROM time_sessions
             WHERE created_at >= date('now', '-' || ? || ' days')`,
          )
          .get(d) as any;

        const habitStats = db!
          .prepare(
            `SELECT COUNT(DISTINCT habit_id) as active_habits,
                    COUNT(*) as completions
             FROM habit_completions
             WHERE completed_date >= date('now', '-' || ? || ' days')`,
          )
          .get(d) as any;

        const overdueTasks = db!
          .prepare(
            `SELECT title, due_date FROM tasks
             WHERE status != 'done' AND due_date < date('now')
             ORDER BY due_date ASC LIMIT 5`,
          )
          .all();

        return JSON.stringify(
          {
            period_days: d,
            tasks: taskStats,
            recently_completed: recentCompleted?.count ?? 0,
            time_tracking: timeStats,
            habits: habitStats,
            overdue_tasks: overdueTasks,
          },
          null,
          2,
        );
      },
    }),
  ];
}

// ────────────────────── System prompt ──────────────────────

function getSystemMessage(): string {
  const today = new Date().toISOString().split('T')[0];
  const dayOfWeek = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  return `
<persona>
You are an AI productivity assistant embedded inside a personal tracker desktop app.
The app manages tasks (with MoSCoW prioritization & Pomodoro time-tracking),
habits, journal entries, notes, and weekly plans.
</persona>

<context>
Today: ${dayOfWeek}, ${today}
</context>

<capabilities>
You have access to tools that read and write the user's data:
- get_tasks / create_task / update_task — full task CRUD
- get_habits / get_habit_completions — habit data
- get_journal_entries — journal/mood entries
- get_time_sessions — Pomodoro/focus session data
- get_notes — user's notes
- write_daily_note — create or replace a daily note's HTML content
- append_to_daily_note — append HTML content to a daily note without overwriting
- get_weekly_plan — weekly planning data
- get_productivity_summary — aggregate stats

Always use these tools to answer questions about the user's data rather than guessing.
When asked to write into a daily note, use write_daily_note or append_to_daily_note.
Produce well-structured HTML: use <h2> for section headings, <p> for paragraphs, <ul>/<ol> for lists, <blockquote> for quotes.
</capabilities>

<guidelines>
- Be concise, actionable, and encouraging.
- Use markdown formatting (bold, bullet lists, numbered lists) for readability.
- When the user asks you to create or update tasks, use the tools — then confirm what you did.
- For planning requests, first fetch current data with tools, then provide structured recommendations.
- For productivity reviews, pull real stats and give concrete, personalised insights.
- If you're unsure, ask a clarifying question rather than hallucinating data.
- Keep responses under 400 words unless the user asks for detail.
</guidelines>
`.trim();
}

// ────────────────────── Public API ──────────────────────

/**
 * Initialise Copilot — creates the CopilotClient and a session.
 */
export async function initCopilot(
  database: Database.Database,
  settings?: Partial<CopilotSettings>,
): Promise<CopilotStatus> {
  db = database;

  // Merge any saved settings
  if (settings) {
    currentSettings = { ...DEFAULT_SETTINGS, ...settings };
  }

  // Load settings from DB if available
  try {
    const row = db.prepare("SELECT value FROM app_settings WHERE key = 'copilot_settings'").get() as
      | { value: string }
      | undefined;
    if (row) {
      const saved = JSON.parse(row.value) as Partial<CopilotSettings>;
      currentSettings = { ...currentSettings, ...saved };
    }
  } catch {
    // Table may not exist yet — that's fine
  }

  try {
    // Clean up any previous client
    if (client) {
      try {
        await client.stop();
      } catch { /* ignore */ }
    }

    // Build client options
    const clientOpts: any = {
      autoStart: true,
      autoRestart: true,
      logLevel: 'warning',
    };

    if (currentSettings.githubToken) {
      clientOpts.githubToken = currentSettings.githubToken;
    }

    client = new CopilotClient(clientOpts);
    await client.start();

    // Build session config
    const sessionConfig: any = {
      model: currentSettings.model || 'gpt-4o',
      tools: getAppTools(),
      systemMessage: {
        content: getSystemMessage(),
      },
      // Auto-approve all tool permission requests — our tools are local DB queries
      onPermissionRequest: (request: any) => {
        console.log('🔐 Permission request:', request.kind, request.toolCallId);
        return { kind: 'approved' };
      },
    };

    // Custom provider (BYOK)
    if (currentSettings.provider !== 'github' && currentSettings.baseUrl) {
      sessionConfig.provider = {
        type: currentSettings.provider === 'ollama' ? 'openai' : currentSettings.provider,
        baseUrl: currentSettings.baseUrl,
        apiKey: currentSettings.apiKey,
      };
    }

    session = await client.createSession(sessionConfig);

    currentStatus = {
      isConnected: true,
      isInitialized: true,
      model: currentSettings.model,
    };

    console.log('✅ Copilot SDK initialized — model:', currentSettings.model);
    return currentStatus;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('❌ Copilot init failed:', msg);

    currentStatus = {
      isConnected: false,
      isInitialized: false,
      error: msg,
    };
    return currentStatus;
  }
}

/**
 * Send a message and stream the response via a callback.
 * Returns the full response text.
 */
export async function sendMessage(
  prompt: string,
  onDelta?: (content: string) => void,
): Promise<string> {
  if (!session) {
    throw new Error('Copilot not initialised. Call initCopilot first.');
  }

  console.log('💬 Sending to Copilot SDK:', prompt.substring(0, 80));

  let fullResponse = '';

  // Set up streaming listener — log ALL events for debugging
  const unsub = session.on((event: any) => {
    const t = event.type || event?.event || 'unknown';
    if (t === 'assistant.message_delta') {
      const delta = event.data?.deltaContent ?? '';
      if (delta) {
        fullResponse += delta;
        onDelta?.(delta);
      }
    } else {
      console.log('🔔 Copilot event:', t, JSON.stringify(event.data ?? event).substring(0, 300));
    }
  });

  try {
    console.log('📤 Calling session.sendAndWait...');
    const result = await session.sendAndWait({ prompt }, 120_000);
    console.log('📥 sendAndWait result type:', result?.type, 'has content:', !!(result?.data?.content));

    // If sendAndWait returned a complete message and we didn't stream, use it
    if (result?.data?.content && !fullResponse) {
      fullResponse = result.data.content;
    }

    return fullResponse || result?.data?.content || 'No response received.';
  } catch (err) {
    console.error('❌ sendAndWait error:', err);
    throw err;
  } finally {
    unsub();
  }
}

/**
 * Get current connection status.
 */
export function getStatus(): CopilotStatus {
  return { ...currentStatus };
}

/**
 * Get current settings (safe — no secrets).
 */
export function getSettings(): Omit<CopilotSettings, 'apiKey' | 'githubToken'> & { hasApiKey: boolean; hasGithubToken: boolean } {
  return {
    provider: currentSettings.provider,
    model: currentSettings.model,
    baseUrl: currentSettings.baseUrl,
    hasApiKey: !!currentSettings.apiKey,
    hasGithubToken: !!currentSettings.githubToken,
  };
}

/**
 * Update and persist settings.
 */
export async function updateSettings(
  newSettings: Partial<CopilotSettings>,
): Promise<CopilotStatus> {
  currentSettings = { ...currentSettings, ...newSettings };

  // Persist to DB
  if (db) {
    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS app_settings (
          key TEXT PRIMARY KEY,
          value TEXT,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);
      db.prepare(
        `INSERT OR REPLACE INTO app_settings (key, value, updated_at)
         VALUES ('copilot_settings', ?, datetime('now'))`,
      ).run(JSON.stringify(currentSettings));
    } catch (err) {
      console.error('Failed to persist copilot settings:', err);
    }
  }

  // Re-initialise with new settings
  if (db) {
    return initCopilot(db);
  }

  return currentStatus;
}

/**
 * Stop Copilot and clean up.
 */
export async function stopCopilot(): Promise<void> {
  try {
    if (session) {
      await session.destroy();
      session = null;
    }
  } catch { /* ignore */ }

  try {
    if (client) {
      await client.stop();
      client = null;
    }
  } catch { /* ignore */ }

  currentStatus = { isConnected: false, isInitialized: false };
  console.log('✅ Copilot cleanup complete');
}
