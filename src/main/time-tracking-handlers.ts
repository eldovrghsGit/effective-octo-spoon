import { ipcMain } from 'electron';
import Database from 'better-sqlite3';

// Time Session interfaces (matching renderer types)
interface TimeSession {
  id?: number;
  task_id: number | null;
  session_type: 'pomodoro' | 'manual' | 'stopwatch';
  duration_minutes: number;
  planned_duration: number;
  start_time: string;
  end_time: string | null;
  interruptions: number;
  focus_quality: 'high' | 'medium' | 'low';
  notes: string | null;
  completed: boolean;
}

export function registerTimeTrackingHandlers(db: Database.Database) {
  // Get all time sessions
  ipcMain.handle('db:getTimeSessions', () => {
    console.log('⏱️ Getting all time sessions...');
    const stmt = db.prepare('SELECT * FROM time_sessions ORDER BY created_at DESC');
    const sessions = stmt.all();
    console.log(`⏱️ Found ${sessions.length} time sessions`);
    return sessions;
  });

  // Get time sessions for a specific task
  ipcMain.handle('db:getTimeSessionsByTask', (_, taskId: number) => {
    console.log(`⏱️ Getting time sessions for task ${taskId}...`);
    const stmt = db.prepare('SELECT * FROM time_sessions WHERE task_id = ? ORDER BY created_at DESC');
    const sessions = stmt.all(taskId);
    console.log(`⏱️ Found ${sessions.length} sessions for task ${taskId}`);
    return sessions;
  });

  // Get time sessions for a specific date
  ipcMain.handle('db:getTimeSessionsByDate', (_, date: string) => {
    console.log(`⏱️ Getting time sessions for date ${date}...`);
    const stmt = db.prepare(`
      SELECT * FROM time_sessions 
      WHERE DATE(start_time) = DATE(?) 
      ORDER BY start_time DESC
    `);
    const sessions = stmt.all(date);
    console.log(`⏱️ Found ${sessions.length} sessions for date ${date}`);
    return sessions;
  });

  // Create a new time session
  ipcMain.handle('db:createTimeSession', (_, session: TimeSession) => {
    console.log('⏱️ Creating time session:', session);
    const stmt = db.prepare(`
      INSERT INTO time_sessions (
        task_id, session_type, duration_minutes, planned_duration,
        start_time, end_time, interruptions, focus_quality, notes, completed
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      session.task_id,
      session.session_type || 'pomodoro',
      session.duration_minutes,
      session.planned_duration || 25,
      session.start_time,
      session.end_time,
      session.interruptions || 0,
      session.focus_quality || 'medium',
      session.notes || null,
      session.completed ? 1 : 0
    );
    
    // If this session is for a task, update the task's actual_minutes and pomodoros_completed
    if (session.task_id && session.completed) {
      updateTaskTimeStats(db, session.task_id, session.duration_minutes, session.session_type === 'pomodoro');
    }
    
    const newSession = { id: result.lastInsertRowid, ...session };
    console.log('✅ Time session created with ID:', newSession.id);
    return newSession;
  });

  // Update a time session
  ipcMain.handle('db:updateTimeSession', (_, id: number, updates: Partial<TimeSession>) => {
    console.log(`⏱️ Updating time session ${id}:`, updates);
    const fields = Object.keys(updates)
      .map(key => `${key} = ?`)
      .join(', ');
    const values = Object.values(updates).map(v => 
      typeof v === 'boolean' ? (v ? 1 : 0) : v
    );
    
    const stmt = db.prepare(`UPDATE time_sessions SET ${fields} WHERE id = ?`);
    stmt.run([...values, id]);
    
    return db.prepare('SELECT * FROM time_sessions WHERE id = ?').get(id);
  });

  // Delete a time session
  ipcMain.handle('db:deleteTimeSession', (_, id: number) => {
    console.log(`⏱️ Deleting time session ${id}`);
    const stmt = db.prepare('DELETE FROM time_sessions WHERE id = ?');
    stmt.run(id);
    return { success: true };
  });

  // Get daily time stats
  ipcMain.handle('db:getDailyTimeStats', (_, date: string) => {
    console.log(`📊 Getting daily time stats for ${date}...`);
    
    const sessionsStmt = db.prepare(`
      SELECT ts.*, t.title as task_title
      FROM time_sessions ts
      LEFT JOIN tasks t ON ts.task_id = t.id
      WHERE DATE(ts.start_time) = DATE(?)
      ORDER BY ts.start_time DESC
    `);
    const sessions = sessionsStmt.all(date) as any[];
    
    const totalMinutes = sessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
    const completedSessions = sessions.filter(s => s.completed).length;
    
    // Calculate average focus quality
    const focusScores = { high: 1, medium: 0.66, low: 0.33 };
    const avgFocusQuality = sessions.length > 0
      ? sessions.reduce((sum, s) => sum + (focusScores[s.focus_quality as keyof typeof focusScores] || 0.5), 0) / sessions.length
      : 0;
    
    // Group by task
    const taskBreakdown: Record<number, { taskId: number; taskTitle: string; minutes: number; sessions: number }> = {};
    sessions.forEach(s => {
      if (s.task_id) {
        if (!taskBreakdown[s.task_id]) {
          taskBreakdown[s.task_id] = {
            taskId: s.task_id,
            taskTitle: s.task_title || 'Unknown Task',
            minutes: 0,
            sessions: 0
          };
        }
        taskBreakdown[s.task_id].minutes += s.duration_minutes || 0;
        taskBreakdown[s.task_id].sessions += 1;
      }
    });
    
    return {
      date,
      totalMinutes,
      totalSessions: sessions.length,
      completedSessions,
      averageFocusQuality: avgFocusQuality,
      taskBreakdown: Object.values(taskBreakdown)
    };
  });

  // Get weekly time stats
  ipcMain.handle('db:getWeeklyTimeStats', (_, weekStartDate: string) => {
    console.log(`📊 Getting weekly time stats for week starting ${weekStartDate}...`);
    
    const sessionsStmt = db.prepare(`
      SELECT ts.*, t.title as task_title
      FROM time_sessions ts
      LEFT JOIN tasks t ON ts.task_id = t.id
      WHERE DATE(ts.start_time) >= DATE(?)
        AND DATE(ts.start_time) < DATE(?, '+7 days')
      ORDER BY ts.start_time DESC
    `);
    const sessions = sessionsStmt.all(weekStartDate, weekStartDate) as any[];
    
    const totalMinutes = sessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
    
    // Group by day
    const dailyStats: Record<string, any> = {};
    sessions.forEach(s => {
      const day = s.start_time.split('T')[0];
      if (!dailyStats[day]) {
        dailyStats[day] = {
          date: day,
          totalMinutes: 0,
          totalSessions: 0,
          completedSessions: 0,
          sessions: []
        };
      }
      dailyStats[day].totalMinutes += s.duration_minutes || 0;
      dailyStats[day].totalSessions += 1;
      if (s.completed) dailyStats[day].completedSessions += 1;
      dailyStats[day].sessions.push(s);
    });
    
    // Find most productive day
    const dailyStatsArray = Object.values(dailyStats);
    const mostProductiveDay = dailyStatsArray.length > 0
      ? dailyStatsArray.reduce((max, day) => day.totalMinutes > max.totalMinutes ? day : max).date
      : null;
    
    // Determine most productive time of day
    const timeOfDayCounts = { morning: 0, afternoon: 0, evening: 0 };
    sessions.forEach(s => {
      const hour = parseInt(s.start_time.split('T')[1]?.split(':')[0] || '12');
      if (hour >= 5 && hour < 12) timeOfDayCounts.morning += s.duration_minutes || 0;
      else if (hour >= 12 && hour < 17) timeOfDayCounts.afternoon += s.duration_minutes || 0;
      else timeOfDayCounts.evening += s.duration_minutes || 0;
    });
    const mostProductiveTime = Object.entries(timeOfDayCounts)
      .reduce((max, [time, mins]) => mins > max[1] ? [time, mins] : max, ['morning', 0])[0];
    
    return {
      weekStartDate,
      totalMinutes,
      totalSessions: sessions.length,
      dailyStats: dailyStatsArray,
      mostProductiveDay,
      mostProductiveTime,
      averageSessionsPerDay: dailyStatsArray.length > 0 
        ? sessions.length / dailyStatsArray.length 
        : 0
    };
  });

  // Get task time stats
  ipcMain.handle('db:getTaskTimeStats', (_, taskId: number) => {
    console.log(`📊 Getting time stats for task ${taskId}...`);
    
    const sessionsStmt = db.prepare(`
      SELECT * FROM time_sessions 
      WHERE task_id = ? 
      ORDER BY start_time DESC
    `);
    const sessions = sessionsStmt.all(taskId) as any[];
    
    const totalMinutes = sessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
    const pomodorosCompleted = sessions.filter(s => s.session_type === 'pomodoro' && s.completed).length;
    
    // Calculate average focus quality
    const focusScores = { high: 1, medium: 0.66, low: 0.33 };
    const avgScore = sessions.length > 0
      ? sessions.reduce((sum, s) => sum + (focusScores[s.focus_quality as keyof typeof focusScores] || 0.5), 0) / sessions.length
      : 0;
    
    let avgFocusQuality: 'high' | 'medium' | 'low' = 'medium';
    if (avgScore >= 0.8) avgFocusQuality = 'high';
    else if (avgScore <= 0.4) avgFocusQuality = 'low';
    
    return {
      taskId,
      totalMinutes,
      pomodorosCompleted,
      averageFocusQuality: avgFocusQuality,
      sessions
    };
  });

  // Get today's session count
  ipcMain.handle('db:getTodaySessionCount', () => {
    const today = new Date().toISOString().split('T')[0];
    const stmt = db.prepare(`
      SELECT COUNT(*) as count FROM time_sessions 
      WHERE DATE(start_time) = DATE(?) AND completed = 1
    `);
    const result = stmt.get(today) as { count: number };
    return result.count;
  });

  console.log('✅ Time tracking handlers registered');
}

// Helper function to update task time statistics
function updateTaskTimeStats(db: Database.Database, taskId: number, additionalMinutes: number, isPomodoro: boolean) {
  const task = db.prepare('SELECT actual_minutes, pomodoros_completed FROM tasks WHERE id = ?').get(taskId) as any;
  
  if (task) {
    const newActualMinutes = (task.actual_minutes || 0) + additionalMinutes;
    const newPomodoros = (task.pomodoros_completed || 0) + (isPomodoro ? 1 : 0);
    
    db.prepare(`
      UPDATE tasks 
      SET actual_minutes = ?, pomodoros_completed = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(newActualMinutes, newPomodoros, taskId);
    
    console.log(`✅ Updated task ${taskId}: actual_minutes=${newActualMinutes}, pomodoros=${newPomodoros}`);
  }
}
