import { ipcMain } from 'electron';
import Database from 'better-sqlite3';

// Weekly Planner interfaces (matching renderer types)
interface WeeklyGoal {
  id: string;
  text: string;
  completed: boolean;
  priority: 'high' | 'medium' | 'low';
}

interface WeeklyPriority {
  taskId: number;
  taskTitle: string;
  dayScheduled?: string;
  timeSlot?: string;
  estimatedMinutes?: number;
}

interface WeeklyPlanInput {
  week_start_date: string;
  goals?: WeeklyGoal[];
  priorities?: WeeklyPriority[];
  capacity_hours?: number;
  notes?: string;
  status?: string;
  copilot_suggestions?: string;
}

// Helper function to get Monday of a given week
function getMonday(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

export function registerWeeklyPlannerHandlers(db: Database.Database) {
  // ============================================
  // WEEKLY PLAN HANDLERS
  // ============================================

  // Get weekly plan by week start date
  ipcMain.handle('db:getWeeklyPlan', (_, weekStartDate: string) => {
    console.log(`📅 Getting weekly plan for ${weekStartDate}...`);
    const stmt = db.prepare('SELECT * FROM weekly_plans WHERE week_start_date = ?');
    const plan = stmt.get(weekStartDate) as Record<string, unknown> | undefined;
    
    if (plan) {
      // Parse JSON fields
      return {
        ...plan,
        goals: plan.goals ? JSON.parse(plan.goals as string) : [],
        priorities: plan.priorities ? JSON.parse(plan.priorities as string) : [],
      };
    }
    return null;
  });

  // Get current week's plan
  ipcMain.handle('db:getCurrentWeeklyPlan', () => {
    const monday = getMonday(new Date());
    console.log(`📅 Getting current weekly plan (week of ${monday})...`);
    const stmt = db.prepare('SELECT * FROM weekly_plans WHERE week_start_date = ?');
    const plan = stmt.get(monday) as Record<string, unknown> | undefined;
    
    if (plan) {
      return {
        ...plan,
        goals: plan.goals ? JSON.parse(plan.goals as string) : [],
        priorities: plan.priorities ? JSON.parse(plan.priorities as string) : [],
      };
    }
    return null;
  });

  // Get all weekly plans
  ipcMain.handle('db:getAllWeeklyPlans', () => {
    console.log('📅 Getting all weekly plans...');
    const stmt = db.prepare('SELECT * FROM weekly_plans ORDER BY week_start_date DESC');
    const plans = stmt.all() as Record<string, unknown>[];
    
    return plans.map(plan => ({
      ...plan,
      goals: plan.goals ? JSON.parse(plan.goals as string) : [],
      priorities: plan.priorities ? JSON.parse(plan.priorities as string) : [],
    }));
  });

  // Create weekly plan
  ipcMain.handle('db:createWeeklyPlan', (_, data: WeeklyPlanInput) => {
    console.log(`📅 Creating weekly plan for ${data.week_start_date}...`);
    
    const stmt = db.prepare(`
      INSERT INTO weekly_plans (week_start_date, goals, priorities, capacity_hours, notes, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      data.week_start_date,
      JSON.stringify(data.goals || []),
      JSON.stringify(data.priorities || []),
      data.capacity_hours || 40,
      data.notes || null,
      data.status || 'planning'
    );
    
    console.log(`📅 Created weekly plan with ID ${result.lastInsertRowid}`);
    return { id: result.lastInsertRowid, ...data };
  });

  // Update weekly plan
  ipcMain.handle('db:updateWeeklyPlan', (_, id: number, data: Partial<WeeklyPlanInput>) => {
    console.log(`📅 Updating weekly plan ${id}...`);
    
    const updates: string[] = [];
    const values: unknown[] = [];
    
    if (data.goals !== undefined) {
      updates.push('goals = ?');
      values.push(JSON.stringify(data.goals));
    }
    if (data.priorities !== undefined) {
      updates.push('priorities = ?');
      values.push(JSON.stringify(data.priorities));
    }
    if (data.capacity_hours !== undefined) {
      updates.push('capacity_hours = ?');
      values.push(data.capacity_hours);
    }
    if (data.notes !== undefined) {
      updates.push('notes = ?');
      values.push(data.notes);
    }
    if (data.status !== undefined) {
      updates.push('status = ?');
      values.push(data.status);
    }
    if (data.copilot_suggestions !== undefined) {
      updates.push('copilot_suggestions = ?');
      values.push(data.copilot_suggestions);
    }
    
    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);
    
    const stmt = db.prepare(`UPDATE weekly_plans SET ${updates.join(', ')} WHERE id = ?`);
    stmt.run(...values);
    
    console.log(`📅 Updated weekly plan ${id}`);
    return { success: true };
  });

  // Delete weekly plan
  ipcMain.handle('db:deleteWeeklyPlan', (_, id: number) => {
    console.log(`📅 Deleting weekly plan ${id}...`);
    const stmt = db.prepare('DELETE FROM weekly_plans WHERE id = ?');
    stmt.run(id);
    console.log(`📅 Deleted weekly plan ${id}`);
    return { success: true };
  });

  // ============================================
  // WEEKLY REVIEW HANDLERS
  // ============================================

  // Get weekly review by weekly plan ID
  ipcMain.handle('db:getWeeklyReview', (_, weeklyPlanId: number) => {
    console.log(`📊 Getting weekly review for plan ${weeklyPlanId}...`);
    const stmt = db.prepare('SELECT * FROM weekly_reviews WHERE weekly_plan_id = ?');
    const review = stmt.get(weeklyPlanId) as Record<string, unknown> | undefined;
    
    if (review) {
      return {
        ...review,
        wins: review.wins ? JSON.parse(review.wins as string) : [],
        challenges: review.challenges ? JSON.parse(review.challenges as string) : [],
      };
    }
    return null;
  });

  // Get weekly review by week start date
  ipcMain.handle('db:getWeeklyReviewByDate', (_, weekStartDate: string) => {
    console.log(`📊 Getting weekly review for week ${weekStartDate}...`);
    const stmt = db.prepare('SELECT * FROM weekly_reviews WHERE week_start_date = ?');
    const review = stmt.get(weekStartDate) as Record<string, unknown> | undefined;
    
    if (review) {
      return {
        ...review,
        wins: review.wins ? JSON.parse(review.wins as string) : [],
        challenges: review.challenges ? JSON.parse(review.challenges as string) : [],
      };
    }
    return null;
  });

  // Create weekly review
  ipcMain.handle('db:createWeeklyReview', (_, data: {
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
  }) => {
    console.log(`📊 Creating weekly review for plan ${data.weekly_plan_id}...`);
    
    const stmt = db.prepare(`
      INSERT INTO weekly_reviews (
        weekly_plan_id, week_start_date, tasks_planned, tasks_completed,
        total_time_minutes, productivity_score, best_time_of_day,
        avg_focus_quality, estimation_accuracy, copilot_insights,
        improvement_suggestions, wins, challenges
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      data.weekly_plan_id,
      data.week_start_date,
      data.tasks_planned || 0,
      data.tasks_completed || 0,
      data.total_time_minutes || 0,
      data.productivity_score || null,
      data.best_time_of_day || null,
      data.avg_focus_quality || null,
      data.estimation_accuracy || null,
      data.copilot_insights || null,
      data.improvement_suggestions || null,
      JSON.stringify(data.wins || []),
      JSON.stringify(data.challenges || [])
    );
    
    console.log(`📊 Created weekly review with ID ${result.lastInsertRowid}`);
    return { id: result.lastInsertRowid, ...data };
  });

  // Update weekly review
  ipcMain.handle('db:updateWeeklyReview', (_, id: number, data: {
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
  }) => {
    console.log(`📊 Updating weekly review ${id}...`);
    
    const updates: string[] = [];
    const values: unknown[] = [];
    
    if (data.tasks_planned !== undefined) {
      updates.push('tasks_planned = ?');
      values.push(data.tasks_planned);
    }
    if (data.tasks_completed !== undefined) {
      updates.push('tasks_completed = ?');
      values.push(data.tasks_completed);
    }
    if (data.total_time_minutes !== undefined) {
      updates.push('total_time_minutes = ?');
      values.push(data.total_time_minutes);
    }
    if (data.productivity_score !== undefined) {
      updates.push('productivity_score = ?');
      values.push(data.productivity_score);
    }
    if (data.best_time_of_day !== undefined) {
      updates.push('best_time_of_day = ?');
      values.push(data.best_time_of_day);
    }
    if (data.avg_focus_quality !== undefined) {
      updates.push('avg_focus_quality = ?');
      values.push(data.avg_focus_quality);
    }
    if (data.estimation_accuracy !== undefined) {
      updates.push('estimation_accuracy = ?');
      values.push(data.estimation_accuracy);
    }
    if (data.copilot_insights !== undefined) {
      updates.push('copilot_insights = ?');
      values.push(data.copilot_insights);
    }
    if (data.improvement_suggestions !== undefined) {
      updates.push('improvement_suggestions = ?');
      values.push(data.improvement_suggestions);
    }
    if (data.wins !== undefined) {
      updates.push('wins = ?');
      values.push(JSON.stringify(data.wins));
    }
    if (data.challenges !== undefined) {
      updates.push('challenges = ?');
      values.push(JSON.stringify(data.challenges));
    }
    
    if (updates.length === 0) {
      return { success: true };
    }
    
    values.push(id);
    const stmt = db.prepare(`UPDATE weekly_reviews SET ${updates.join(', ')} WHERE id = ?`);
    stmt.run(...values);
    
    console.log(`📊 Updated weekly review ${id}`);
    return { success: true };
  });

  // ============================================
  // STATISTICS HANDLERS
  // ============================================

  // Get weekly statistics for a given week
  ipcMain.handle('db:getWeeklyStats', (_, weekStartDate: string) => {
    console.log(`📈 Calculating weekly stats for week of ${weekStartDate}...`);
    
    // Calculate end of week (Sunday)
    const startDate = new Date(weekStartDate);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);
    const weekEndDate = endDate.toISOString().split('T')[0];
    
    // Get tasks for the week
    const tasksStmt = db.prepare(`
      SELECT * FROM tasks 
      WHERE (due_date >= ? AND due_date <= ?) 
         OR (start_time >= ? AND start_time <= ?)
    `);
    const tasks = tasksStmt.all(weekStartDate, weekEndDate, weekStartDate, weekEndDate) as Array<{
      id: number;
      status: string;
      estimated_minutes: number | null;
      actual_minutes: number | null;
    }>;
    
    const totalTasksPlanned = tasks.length;
    const totalTasksCompleted = tasks.filter(t => t.status === 'done').length;
    const completionRate = totalTasksPlanned > 0 
      ? Math.round((totalTasksCompleted / totalTasksPlanned) * 100) 
      : 0;
    
    // Get time sessions for the week
    const sessionsStmt = db.prepare(`
      SELECT * FROM time_sessions 
      WHERE start_time >= ? AND start_time <= ?
    `);
    const sessions = sessionsStmt.all(weekStartDate, weekEndDate + 'T23:59:59') as Array<{
      duration_minutes: number;
      focus_quality: string;
      start_time: string;
    }>;
    
    const totalTimeMinutes = sessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
    
    // Calculate average focus quality
    const qualityMap: Record<string, number> = { high: 3, medium: 2, low: 1 };
    const qualityScores = sessions.map(s => qualityMap[s.focus_quality] || 2);
    const avgFocusQuality = qualityScores.length > 0
      ? qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length
      : 0;
    
    // Find most productive day
    const dayMinutes: Record<string, number> = {};
    sessions.forEach(session => {
      if (session.start_time) {
        const day = new Date(session.start_time).toLocaleDateString('en-US', { weekday: 'long' });
        dayMinutes[day] = (dayMinutes[day] || 0) + (session.duration_minutes || 0);
      }
    });
    
    let mostProductiveDay: string | null = null;
    let maxMinutes = 0;
    for (const [day, minutes] of Object.entries(dayMinutes)) {
      if (minutes > maxMinutes) {
        maxMinutes = minutes;
        mostProductiveDay = day;
      }
    }
    
    // Get weekly plan goals if exists
    const planStmt = db.prepare('SELECT goals FROM weekly_plans WHERE week_start_date = ?');
    const plan = planStmt.get(weekStartDate) as { goals: string } | undefined;
    let goalsTotal = 0;
    let goalsCompleted = 0;
    
    if (plan?.goals) {
      try {
        const goals = JSON.parse(plan.goals) as WeeklyGoal[];
        goalsTotal = goals.length;
        goalsCompleted = goals.filter(g => g.completed).length;
      } catch {
        // Ignore parse errors
      }
    }
    
    // Calculate estimation accuracy
    const tasksWithEstimates = tasks.filter(t => t.estimated_minutes && t.actual_minutes);
    let estimationAccuracy: number | null = null;
    if (tasksWithEstimates.length > 0) {
      const accuracies = tasksWithEstimates.map(t => {
        const estimated = t.estimated_minutes || 1;
        const actual = t.actual_minutes || 1;
        return Math.min(estimated, actual) / Math.max(estimated, actual);
      });
      estimationAccuracy = Math.round(
        (accuracies.reduce((a, b) => a + b, 0) / accuracies.length) * 100
      );
    }
    
    const stats = {
      totalTasksPlanned,
      totalTasksCompleted,
      completionRate,
      totalTimeMinutes,
      averageFocusQuality: Math.round(avgFocusQuality * 100) / 100,
      mostProductiveDay,
      goalsCompleted,
      goalsTotal,
      estimationAccuracy,
    };
    
    console.log(`📈 Weekly stats calculated:`, stats);
    return stats;
  });
}
