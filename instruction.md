# Work Planner Desktop App - Build Instructions

## 🎯 Project Overview
Build a modern desktop work planner app using Electron + React + TypeScript with offline-first architecture and future cloud sync capability.

**Inspiration**: Upbase-style interface with sidebar navigation, daily planner, calendar view, and task management.

---

## 🛠️ Tech Stack

### Core Framework
- **Electron**: Desktop app framework (cross-platform)
- **React 18**: UI framework
- **TypeScript**: Type-safe development
- **Vite**: Fast build tool and dev server

### UI & Styling
- **Tailwind CSS**: Utility-first CSS framework
- **shadcn/ui**: Modern component library
- **Lucide React**: Icon library
- **React Beautiful DND** or **dnd-kit**: Drag-and-drop functionality

### Data Layer
- **SQLite** (better-sqlite3): Local database
- **Prisma** or **Drizzle ORM**: Type-safe database queries
- **Zustand** or **Jotai**: State management

### Features Libraries
- **date-fns**: Date manipulation
- **React Day Picker**: Calendar component
- **TipTap** or **Lexical**: Rich text editor for task details
- **electron-store**: Settings/preferences persistence

---

## 📁 Project Structure

```
personal-tracker/
├── electron/                  # Electron main process
│   ├── main.ts               # Main entry point
│   ├── preload.ts            # Bridge between main & renderer
│   └── database/             # SQLite setup & migrations
│       ├── schema.ts
│       └── queries.ts
├── src/                      # React app (renderer process)
│   ├── main.tsx
│   ├── App.tsx
│   ├── components/
│   │   ├── ui/              # shadcn/ui components
│   │   ├── Layout/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   └── MainContent.tsx
│   │   ├── Tasks/
│   │   │   ├── TaskList.tsx
│   │   │   ├── TaskItem.tsx
│   │   │   ├── TaskForm.tsx
│   │   │   └── TaskDetails.tsx
│   │   ├── Calendar/
│   │   │   ├── CalendarView.tsx
│   │   │   └── DayView.tsx
│   │   └── Notes/
│   │       └── NotesEditor.tsx
│   ├── hooks/               # Custom React hooks
│   ├── lib/                 # Utilities & helpers
│   ├── store/               # State management
│   └── types/               # TypeScript types
├── public/                   # Static assets
├── package.json
├── tsconfig.json
├── vite.config.ts
└── electron-builder.json    # Packaging configuration
```

---

## 🚀 Phase 1: Initial Setup & Basic Functionality

### Step 1.1: Project Initialization
```bash
# Create Electron + Vite + React + TypeScript project
npm create @quick-start/electron
# or
npm create vite@latest . -- --template react-ts
npm install electron electron-builder --save-dev
```

### Step 1.2: Install Core Dependencies
```bash
# UI & Styling
npm install tailwindcss postcss autoprefixer
npm install @radix-ui/react-* # shadcn/ui dependencies
npm install lucide-react
npm install class-variance-authority clsx tailwind-merge

# Database
npm install better-sqlite3
npm install @types/better-sqlite3 --save-dev

# State & Data
npm install zustand
npm install date-fns

# Utilities
npm install electron-store
```

### Step 1.3: Setup SQLite Database Schema

**Tables to create:**
```sql
-- Tasks table
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'todo', -- 'todo', 'in-progress', 'done'
  priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high'
  due_date TEXT, -- ISO date string
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  category_id TEXT,
  time_estimate INTEGER, -- minutes
  time_spent INTEGER DEFAULT 0 -- minutes
);

-- Categories/Projects table
CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL, -- hex color
  icon TEXT,
  created_at TEXT NOT NULL
);

-- Settings table
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

### Step 1.4: Build Basic UI Components

**Must-have for Phase 1:**
1. ✅ **Sidebar Navigation**
   - Schedule/Today view
   - My Tasks
   - Categories list
   - Settings

2. ✅ **Task List View**
   - Display tasks in a list
   - Add new task button
   - Task item with checkbox, title, due date

3. ✅ **Task Form Modal**
   - Title input (required)
   - Description textarea
   - Due date picker
   - Category selector
   - Priority selector
   - Save/Cancel buttons

4. ✅ **Basic Layout**
   - Header with date/time
   - Main content area
   - Responsive design

### Step 1.5: Core Functionality
- ✅ Create task (C)
- ✅ Read/List tasks (R)
- ✅ Update task (U)
- ✅ Delete task (D)
- ✅ Mark task as complete
- ✅ Filter by date (today, week, all)
- ✅ SQLite persistence

---

## 🎨 Phase 2: Enhanced UI/UX

### Step 2.1: Calendar Integration
- [ ] Monthly calendar view (React Day Picker)
- [ ] Week view
- [ ] Day view with timeline
- [ ] Drag tasks to calendar dates
- [ ] Visual task density indicators

### Step 2.2: Rich Task Details
- [ ] TipTap rich text editor for descriptions
- [ ] Add subtasks/checklist
- [ ] Add tags
- [ ] File attachments (local storage)
- [ ] Comments/notes section

### Step 2.3: Visual Enhancements
- [ ] Dark mode toggle
- [ ] Custom themes
- [ ] Task color coding by priority
- [ ] Progress bars for task completion
- [ ] Animations & transitions
- [ ] System tray integration

---

## ⏱️ Phase 3: Time Tracking & Reminders

### Step 3.1: Time Tracking
- [ ] Start/stop timer for tasks
- [ ] Manual time entry
- [ ] Time estimate vs actual tracking
- [ ] Daily/weekly time reports
- [ ] Pomodoro timer integration

### Step 3.2: Reminders & Notifications
- [ ] Native desktop notifications
- [ ] Reminder before due date (15 min, 1 hour, 1 day)
- [ ] Recurring task reminders
- [ ] Custom reminder times
- [ ] Sound alerts (optional)

### Step 3.3: Daily Planning
- [ ] Morning daily planner prompt
- [ ] Daily notes section
- [ ] Quick capture inbox
- [ ] Review yesterday/plan today workflow

---

## 📊 Phase 4: Analytics & Reports

### Step 4.1: Productivity Insights
- [ ] Task completion rate
- [ ] Time spent by category
- [ ] Productivity trends chart
- [ ] Weekly/monthly summaries
- [ ] Export reports (PDF/CSV)

### Step 4.2: Goal Tracking
- [ ] Set weekly goals
- [ ] Track goal progress
- [ ] Habit tracking
- [ ] Streaks & achievements

---

## ☁️ Phase 5: Cloud Sync Preparation

### Step 5.1: Architecture Updates
- [ ] Separate sync layer from database layer
- [ ] Add sync status tracking
- [ ] Conflict resolution strategy
- [ ] Offline queue for pending changes

### Step 5.2: Backend Options
**Choose one:**
- **Option A**: Supabase (PostgreSQL + Auth + Realtime)
- **Option B**: Firebase (Firestore + Auth)
- **Option C**: Custom Node.js API + PostgreSQL
- **Option D**: Azure SQL + Azure Functions

### Step 5.3: Sync Features
- [ ] User authentication
- [ ] Sync on app start/close
- [ ] Real-time sync (optional)
- [ ] Conflict resolution UI
- [ ] Multi-device support
- [ ] Cloud backup & restore

---

## 🚢 Phase 6: Distribution

### Step 6.1: App Packaging
```bash
# Build for Windows
npm run build:win

# Build for macOS
npm run build:mac

# Build for Linux
npm run build:linux
```

### Step 6.2: Auto-Updates
- [ ] Integrate electron-updater
- [ ] Update notifications
- [ ] Automatic download & install

### Step 6.3: Installer Options
- [ ] Windows: NSIS installer
- [ ] macOS: DMG file
- [ ] Linux: AppImage, deb, rpm

---

## 💡 Feature Ideas (Future Enhancements)

### Collaboration (Cloud-enabled)
- [ ] Share tasks with team members
- [ ] Comments & mentions
- [ ] Team calendar
- [ ] Assign tasks to others

### Integrations
- [ ] Google Calendar sync
- [ ] Microsoft To Do import
- [ ] Outlook calendar integration
- [ ] Slack notifications
- [ ] GitHub issues integration

### Advanced Features
- [ ] AI task suggestions (prioritization)
- [ ] Voice input for tasks
- [ ] Email to task (send email to add task)
- [ ] Time blocking automation
- [ ] Focus mode (block distractions)
- [ ] Custom keyboard shortcuts

### Mobile Companion
- [ ] React Native mobile app
- [ ] Quick capture widget
- [ ] Push notifications
- [ ] Share sync backend with desktop

---

## 📋 Development Checklist

### Before Starting Each Phase:
- [ ] Review previous phase completion
- [ ] Update dependencies
- [ ] Run tests (if applicable)
- [ ] Backup database schema
- [ ] Document API changes

### Best Practices:
- ✅ Use TypeScript strictly (no `any` types)
- ✅ Component-driven development
- ✅ Keep components small & focused
- ✅ Use custom hooks for logic reuse
- ✅ Implement error boundaries
- ✅ Add loading states
- ✅ Handle edge cases (empty states, errors)
- ✅ Test on all target platforms

---

## 🎯 Success Criteria

### Phase 1 Complete When:
- Can add, edit, delete, and complete tasks
- Tasks persist in SQLite database
- Basic UI is functional and looks modern
- App can be launched and used daily

### Overall Project Success:
- Daily usage without crashes
- Fast performance (< 100ms UI updates)
- Intuitive UX (minimal learning curve)
- Reliable data persistence
- Cloud sync works seamlessly (Phase 5)

---

## 📚 Resources & References

### Documentation
- [Electron Docs](https://www.electronjs.org/docs)
- [React Docs](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com)

### Similar Apps for Inspiration
- **Upbase**: Project management + tasks
- **Notion Calendar**: Calendar + tasks integration
- **Todoist**: Task management
- **TickTick**: Tasks + time tracking
- **Sunsama**: Daily planning focus
- **Motion**: AI-powered scheduling

### Design Resources
- [Dribble - Task Management](https://dribbble.com/search/task-management)
- [Mobbin](https://mobbin.com) - UI patterns
- Material Design Guidelines
- Apple Human Interface Guidelines

---

## 🐛 Troubleshooting

### Common Issues:
1. **Electron won't start**: Check Node.js version (>=18)
2. **SQLite errors**: Ensure better-sqlite3 is compiled for Electron
3. **Hot reload not working**: Check Vite config for Electron
4. **Build fails**: Clear node_modules and reinstall

---

## 📝 Notes

- Start simple, iterate quickly
- Focus on daily usability over features
- Test on real workflows (your own tasks)
- Gather feedback early and often
- Don't over-engineer Phase 1

**Remember**: A working simple app beats a perfect incomplete one. Ship Phase 1, then iterate! 🚀
