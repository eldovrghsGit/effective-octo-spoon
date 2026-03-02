# Personal Tracker - Enhanced Planning System Implementation Plan

## 🎯 Vision
Transform the Personal Tracker into an intelligent weekly/daily planning system with AI-powered insights, time tracking, and productivity analysis.

---

## 📊 Current State Analysis

### Existing Features
- ✅ Tasks with scheduling (start_time, end_time, due_date, priority, MoSCoW)
- ✅ Calendar views (Day/Week/Month with drag-and-drop)
- ✅ Journal entries (daily reflections with mood)
- ✅ Notes system (with tagging and pinning)
- ✅ Habits tracking (with streaks and completions)
- ✅ Copilot AI assistant (task creation and analysis)

### Current Database Schema
```sql
-- Tasks: Full scheduling support
tasks (id, title, description, status, priority, moscow, due_date, start_time, end_time, tags, created_at, updated_at)

-- Subtasks: Task breakdown
subtasks (id, task_id, title, completed, created_at)

-- Notes: General note-taking
notes (id, title, content, tags, is_pinned, color, note_type, date, created_at, updated_at)

-- Habits: Habit tracking
habits (id, name, description, frequency, color, icon, target_count, current_streak, best_streak, created_at, updated_at)

-- Habit Completions: Daily completions
habit_completions (id, habit_id, completed_date, count, created_at)

-- Journal: Daily reflections
journal (id, title, content, mood, date, tags, weather, created_at, updated_at)
```

---

## 🚀 Implementation Phases

### PHASE 1: Enhanced Database Schema ⏳ (Week 1)
**Status:** Not Started

#### 1.1 Time Tracking Tables
```sql
CREATE TABLE time_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER,
  session_type TEXT DEFAULT 'pomodoro', -- 'pomodoro', 'manual', 'stopwatch'
  duration_minutes INTEGER,
  planned_duration INTEGER DEFAULT 25,
  start_time TEXT,
  end_time TEXT,
  interruptions INTEGER DEFAULT 0,
  focus_quality TEXT DEFAULT 'medium', -- 'high', 'medium', 'low'
  notes TEXT,
  completed INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE
)
```

#### 1.2 Weekly Planning Tables
```sql
CREATE TABLE weekly_plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  week_start_date TEXT UNIQUE, -- Monday of the week
  goals TEXT, -- JSON array of goals
  priorities TEXT, -- JSON array of priority tasks
  capacity_hours INTEGER DEFAULT 40,
  notes TEXT,
  status TEXT DEFAULT 'planning', -- 'planning', 'active', 'completed', 'reviewed'
  copilot_suggestions TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
)

CREATE TABLE weekly_reviews (
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
  copilot_insights TEXT, -- AI-generated insights
  improvement_suggestions TEXT, -- AI-generated suggestions
  wins TEXT, -- Things that went well
  challenges TEXT, -- Things to improve
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (weekly_plan_id) REFERENCES weekly_plans (id)
)
```

#### 1.3 Extend Tasks Table
```sql
ALTER TABLE tasks ADD COLUMN estimated_minutes INTEGER;
ALTER TABLE tasks ADD COLUMN actual_minutes INTEGER DEFAULT 0;
ALTER TABLE tasks ADD COLUMN weekly_plan_id INTEGER;
ALTER TABLE tasks ADD COLUMN energy_level TEXT DEFAULT 'medium'; -- 'high', 'medium', 'low'
ALTER TABLE tasks ADD COLUMN best_time_of_day TEXT; -- 'morning', 'afternoon', 'evening'
ALTER TABLE tasks ADD COLUMN pomodoros_completed INTEGER DEFAULT 0;
```

#### 1.4 Extend Notes for Daily Planning
```sql
ALTER TABLE notes ADD COLUMN note_category TEXT DEFAULT 'general'; -- 'daily-plan', 'meeting', 'general'
ALTER TABLE notes ADD COLUMN has_todos INTEGER DEFAULT 0;
ALTER TABLE notes ADD COLUMN parsed_todos TEXT; -- JSON array of extracted tasks
```

---

### PHASE 2: Pomodoro Timer System ✅ (Week 2)
**Status:** Complete

#### 2.1 Database Schema for Time Tracking ✅
- ✅ Create `time_sessions` table
- ✅ Add `estimated_minutes`, `actual_minutes`, `pomodoros_completed` to tasks

#### 2.2 Backend Handlers ✅
- ✅ File: `src/main/time-tracking-handlers.ts`
- ✅ IPC handlers for CRUD operations on time_sessions
- ✅ Calculate total time per task
- ✅ Session statistics

#### 2.3 Preload API Extension ✅
- ✅ Add time tracking methods to electronAPI
- ✅ Session management (start, pause, complete, abandon)

#### 2.4 Pomodoro Timer Component ✅
- ✅ File: `src/renderer/components/TimeTracking/PomodoroTimer.tsx`
- ✅ 25-minute work sessions, 5-minute short breaks, 15-minute long breaks
- ✅ Visual countdown timer with circular progress
- ✅ Audio/visual notifications
- ✅ Session counter (4 sessions = long break)
- ✅ Pause/resume functionality
- ✅ Settings panel for customization

#### 2.5 Task Timer Integration ✅
- ✅ File: `src/renderer/components/TimeTracking/TaskTimer.tsx`
- ✅ "Start Focus" button on task cards
- ✅ Floating timer when session active
- ✅ Real-time duration updates
- ✅ Quick complete/abandon actions

#### 2.6 Session History Component ✅
- ✅ File: `src/renderer/components/TimeTracking/SessionHistory.tsx`
- ✅ List of sessions per task
- ✅ Total time spent
- ✅ Focus quality indicators
- ✅ Daily/weekly summaries

#### 2.7 Type Definitions ✅
- ✅ File: `src/renderer/types/time-tracking.ts`
- ✅ TimeSession, TimerState, PomodoroSettings interfaces

---

### PHASE 3: Weekly Planner ✅ (Week 3)
**Status:** Complete

#### 3.1 Weekly Planner View ✅
- ✅ Week-at-a-glance dashboard
- ✅ 7-day grid with task allocation
- ✅ Capacity bar (planned vs available hours)
- ✅ Quick stats bar (goals, tasks, time, completion rate)

#### 3.2 Week Planning Form ✅
- ✅ Set weekly goals (3-5) with priority
- ✅ Define capacity hours (slider)
- ✅ Notes section
- ✅ Add/edit/remove goals

#### 3.3 Copilot Weekly Planning ✅
- ✅ "Plan my week" command
- ✅ "What should I work on today?" command
- ✅ Auto-scheduling suggestions based on priorities
- ✅ Balance workload recommendations

#### 3.4 Backend & API ✅
- ✅ Database schema (weekly_plans, weekly_reviews tables)
- ✅ Type definitions (weekly-planner.ts)
- ✅ IPC handlers (weekly-planner-handlers.ts)
- ✅ Preload API methods
- ✅ Weekly statistics calculation

---

### PHASE 4: Daily Notes with Inline Copilot (Week 4)
**Status:** Not Started

#### 4.1 Daily Note Auto-Creation
- Automatic note for current day
- Morning/evening templates
- Link to weekly plan

#### 4.2 Inline Task Extraction
- Detect TODO patterns: `- [ ]`, `TODO:`, `@task:`
- Extract deadlines from natural language
- Create tasks with proper metadata

#### 4.3 Copilot Slash Commands
- `/plan` - Generate tasks from note content
- `/schedule` - Suggest time blocks
- `/analyze` - Summarize and extract actions

---

### PHASE 5: Weekly AI Analysis (Week 5)
**Status:** Not Started

#### 5.1 Analytics Engine
- Collect productivity metrics
- Calculate patterns and trends
- Identify peak performance times

#### 5.2 Weekly Review Generator
- Automated weekly report
- Productivity score calculation
- AI-powered insights and recommendations

#### 5.3 Learning System
- Track estimation accuracy
- Learn user patterns
- Personalized suggestions

---

### PHASE 6: Enhanced Copilot Intelligence (Week 6)
**Status:** Not Started

#### 6.1 Planning Workflow
- Sunday evening planning assistant
- Daily morning briefings
- Proactive suggestions

#### 6.2 Context-Aware Assistance
- Based on time of day
- Based on energy patterns
- Based on task dependencies

---

## 📁 File Structure

```
src/
├── main/
│   ├── main.ts                    # Database schema updates
│   ├── time-tracking-handlers.ts  # NEW: Time session handlers
│   ├── weekly-plan-handlers.ts    # NEW: Weekly planning handlers
│   └── copilot/
│       ├── copilot-service.ts     # Enhanced with analytics
│       ├── copilot-ipc.ts
│       ├── weekly-planning-agent.ts  # NEW
│       ├── weekly-reviewer.ts        # NEW
│       ├── analytics-engine.ts       # NEW
│       └── task-extractor.ts         # NEW
├── preload/
│   └── preload.ts                 # Extended API
└── renderer/
    ├── App.tsx                    # New tabs/views
    ├── components/
    │   ├── TimeTracking/          # NEW FOLDER
    │   │   ├── PomodoroTimer.tsx
    │   │   ├── TaskTimer.tsx
    │   │   ├── SessionHistory.tsx
    │   │   └── FocusStats.tsx
    │   ├── WeeklyPlanner/         # NEW FOLDER
    │   │   ├── WeekPlannerView.tsx
    │   │   ├── WeekPlanForm.tsx
    │   │   ├── CapacityBar.tsx
    │   │   └── GoalsSetting.tsx
    │   ├── Analytics/             # NEW FOLDER
    │   │   ├── WeeklyReview.tsx
    │   │   ├── InsightsPanel.tsx
    │   │   └── ProductivityChart.tsx
    │   └── DailyNote/             # NEW FOLDER
    │       ├── DailyNote.tsx
    │       └── TaskExtraction.tsx
    └── types/
        ├── time-tracking.ts       # NEW
        ├── weekly-plan.ts         # NEW
        └── analytics.ts           # NEW
```

---

## 🔄 Recommended Workflow (After Implementation)

### Sunday Evening: Week Planning
1. Open Weekly Planner → Copilot reviews last week
2. Set 3-5 goals → Copilot suggests task priorities
3. Allocate tasks to days → Auto-schedule option
4. Review capacity → Adjust if overbooked

### Daily Morning: Day Planning
1. Daily Note auto-opens → Shows today's focus
2. Add morning thoughts → Copilot extracts TODOs
3. Review time blocks → Adjust as needed

### During Day: Execution
1. Start Pomodoro on current task
2. Track focus quality after each session
3. Log interruptions if any
4. Take scheduled breaks

### Evening: Reflection
1. Review completed tasks
2. Update estimates for incomplete tasks
3. Add notes about blockers
4. Preview tomorrow

### Friday: Weekly Review
1. Copilot generates report
2. Review metrics and patterns
3. Read improvement suggestions
4. Celebrate wins!

---

## ✅ Implementation Checklist

### Phase 2: Pomodoro Timer (Current)
- [ ] Step 1: Update database schema (time_sessions table + task columns)
- [ ] Step 2: Create type definitions
- [ ] Step 3: Create time-tracking-handlers.ts
- [ ] Step 4: Update preload.ts with time tracking API
- [ ] Step 5: Create PomodoroTimer component
- [ ] Step 6: Create TaskTimer component
- [ ] Step 7: Create SessionHistory component
- [ ] Step 8: Integrate timer with TaskCard
- [ ] Step 9: Add floating timer to App.tsx
- [ ] Step 10: Update Copilot to understand time queries
- [ ] Step 11: Build and test

---

## 📝 Notes
- All data stored locally in SQLite
- No cloud sync required
- Copilot works offline with local analysis
- Performance optimized with proper indexing

---

*Last Updated: January 23, 2026*
