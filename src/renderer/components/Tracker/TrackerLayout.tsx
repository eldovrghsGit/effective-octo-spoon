import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  Plus, CheckSquare, Circle, CheckCircle2, Clock, 
  ChevronLeft, ChevronRight, GripVertical, Sparkles,
  Flag, Trash2, Edit2, MoreHorizontal, Calendar,
  Sun, Moon, Settings, Play, Pause, RotateCcw,
  ChevronDown, ChevronUp, X, Search, MessageSquare
} from 'lucide-react';
import { 
  format, startOfWeek, endOfWeek, addWeeks, subWeeks, 
  eachDayOfInterval, isToday, isSameDay, isBefore, isWeekend, addDays 
} from 'date-fns';
import { useTheme } from '../../contexts/ThemeContext';
import { Task } from '../../App';
import { Note } from '../../types/notes';
import DailyCanvas from './DailyCanvas';

/* ───── props ───── */
interface TrackerLayoutProps {
  tasks: Task[];
  notes: Note[];
  onAddTask: (data: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => Promise<number | null>;
  onUpdateTask: (id: number, updates: Partial<Task>) => void;
  onDeleteTask: (id: number) => void;
  onEditTask: (task: Task) => void;
  onAddNote: (note: Omit<Note, 'id' | 'created_at' | 'updated_at'>) => void;
  onUpdateNote: (id: number, updates: Partial<Note>) => void;
  onDeleteNote: (id: number) => void;
  onStartFocus: (taskId: number, taskTitle: string) => void;
  onOpenTaskForm: (date?: Date, time?: string) => void;
  onToggleCopilot?: () => void;
}

/* ───── MoSCoW config ───── */
const moscowConfig = {
  must:   { label: 'Must Do',   color: 'bg-red-500',    dot: 'bg-red-400',    text: 'text-red-400',    border: 'border-red-500/30' },
  should: { label: 'Should Do', color: 'bg-amber-500',  dot: 'bg-amber-400',  text: 'text-amber-400',  border: 'border-amber-500/30' },
  want:   { label: 'Could Do',  color: 'bg-blue-500',   dot: 'bg-blue-400',   text: 'text-blue-400',   border: 'border-blue-500/30' },
  wont:   { label: "Won't Do",  color: 'bg-slate-500',  dot: 'bg-slate-400',  text: 'text-slate-400',  border: 'border-slate-500/30' },
};

/* ───── Time slots 6 AM – 10 PM ───── */
const TIME_SLOTS = Array.from({ length: 17 }, (_, i) => i + 6);

/* ───── Helpers ───── */
function getTaskStartHour(task: Task): number {
  return task.start_time ? parseInt(task.start_time.split(':')[0]) : 9;
}
function getTaskStartMinuteOffset(task: Task): number {
  return task.start_time ? parseInt(task.start_time.split(':')[1]) : 0;
}
function getTaskDuration(task: Task): number {
  if (task.start_time && task.end_time) {
    const [sh, sm] = task.start_time.split(':').map(Number);
    const [eh, em] = task.end_time.split(':').map(Number);
    return Math.max((eh * 60 + em) - (sh * 60 + sm), 30);
  }
  return 60;
}
function getTaskStartMinutes(task: Task): number {
  if (task.start_time) {
    const [h, m] = task.start_time.split(':').map(Number);
    return h * 60 + m;
  }
  return 9 * 60; // default 9 AM
}
function getTaskEndMinutes(task: Task): number {
  return getTaskStartMinutes(task) + getTaskDuration(task);
}

/** Outlook-style column layout: assigns column index & total columns to overlapping tasks */
interface LayoutInfo { task: Task; col: number; totalCols: number; }
function layoutOverlappingTasks(dayTasks: Task[]): LayoutInfo[] {
  if (dayTasks.length === 0) return [];
  // Sort by start time, then by duration descending
  const sorted = [...dayTasks].sort((a, b) => {
    const diff = getTaskStartMinutes(a) - getTaskStartMinutes(b);
    return diff !== 0 ? diff : getTaskDuration(b) - getTaskDuration(a);
  });

  // Build overlap groups
  const groups: Task[][] = [];
  let currentGroup: Task[] = [sorted[0]];
  let groupEnd = getTaskEndMinutes(sorted[0]);

  for (let i = 1; i < sorted.length; i++) {
    const t = sorted[i];
    if (getTaskStartMinutes(t) < groupEnd) {
      // overlaps with current group
      currentGroup.push(t);
      groupEnd = Math.max(groupEnd, getTaskEndMinutes(t));
    } else {
      groups.push(currentGroup);
      currentGroup = [t];
      groupEnd = getTaskEndMinutes(t);
    }
  }
  groups.push(currentGroup);

  // Assign columns within each group
  const result: LayoutInfo[] = [];
  for (const group of groups) {
    // For each task, find the first available column
    const columns: { end: number }[] = []; // track end times per column
    for (const task of group) {
      const start = getTaskStartMinutes(task);
      let placed = false;
      for (let c = 0; c < columns.length; c++) {
        if (columns[c].end <= start) {
          columns[c].end = getTaskEndMinutes(task);
          result.push({ task, col: c, totalCols: 0 }); // totalCols filled later
          placed = true;
          break;
        }
      }
      if (!placed) {
        columns.push({ end: getTaskEndMinutes(task) });
        result.push({ task, col: columns.length - 1, totalCols: 0 });
      }
    }
    const totalCols = columns.length;
    // Fill totalCols for this group's entries
    for (const r of result) {
      if (group.includes(r.task) && r.totalCols === 0) {
        r.totalCols = totalCols;
      }
    }
  }
  return result;
}

/* ═══════════════════════════════════════════════
   TRACKER LAYOUT — single-page unified tracker
   ═══════════════════════════════════════════════ */
const TrackerLayout: React.FC<TrackerLayoutProps> = ({
  tasks, notes, onAddTask, onUpdateTask, onDeleteTask, onEditTask,
  onAddNote, onUpdateNote, onDeleteNote, onStartFocus, onOpenTaskForm,
  onToggleCopilot,
}) => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  /* ── resizable panel widths ── */
  const containerRef = useRef<HTMLDivElement>(null);
  const [leftWidth, setLeftWidth] = useState(280);
  const [rightWidth, setRightWidth] = useState(340);
  const dragging = useRef<'left' | 'right' | null>(null);

  const onMouseDown = (panel: 'left' | 'right') => (e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = panel;
    const startX = e.clientX;
    const startLeft = leftWidth;
    const startRight = rightWidth;

    const onMove = (ev: MouseEvent) => {
      if (dragging.current === 'left') {
        setLeftWidth(Math.max(220, Math.min(420, startLeft + (ev.clientX - startX))));
      } else {
        setRightWidth(Math.max(280, Math.min(500, startRight - (ev.clientX - startX))));
      }
    };
    const onUp = () => {
      dragging.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  /* ── weekly calendar state ── */
  const [weekOffset, setWeekOffset] = useState(0);
  const currentWeekStart = startOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 });
  const weekDates = eachDayOfInterval({ start: currentWeekStart, end: endOfWeek(currentWeekStart, { weekStartsOn: 1 }) });
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());

  /* ── quick-add state ── */
  const [quickAdd, setQuickAdd] = useState('');
  const [quickAddMoscow, setQuickAddMoscow] = useState<'must' | 'should' | 'want'>('should');

  /* ── collapsed sections ── */
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({ wont: true });

  /* ── pomodoro mini-timer ── */
  const [pomodoroActive, setPomodoroActive] = useState(false);
  const [pomodoroSeconds, setPomodoroSeconds] = useState(25 * 60);
  const pomodoroInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (pomodoroActive && pomodoroSeconds > 0) {
      pomodoroInterval.current = setInterval(() => {
        setPomodoroSeconds(s => {
          if (s <= 1) { setPomodoroActive(false); return 0; }
          return s - 1;
        });
      }, 1000);
    }
    return () => { if (pomodoroInterval.current) clearInterval(pomodoroInterval.current); };
  }, [pomodoroActive]);

  /* ── task grouping ── */
  const activeTasks = tasks.filter(t => t.status !== 'done');
  const doneTasks = tasks.filter(t => t.status === 'done');
  const grouped: Record<string, Task[]> = {
    must:   activeTasks.filter(t => (t.moscow || 'should') === 'must'),
    should: activeTasks.filter(t => (t.moscow || 'should') === 'should'),
    want:   activeTasks.filter(t => (t.moscow || 'should') === 'want'),
    wont:   activeTasks.filter(t => (t.moscow || 'should') === 'wont'),
  };

  /* ── scheduled tasks for calendar ── */
  const getScheduledForDay = (day: Date) =>
    tasks.filter(t => {
      if (!t.due_date) return false;
      try { return isSameDay(new Date(t.due_date), day); } catch { return false; }
    });

  /* ── quick add handler ── */
  const handleQuickAdd = async () => {
    const title = quickAdd.trim();
    if (!title) return;
    await onAddTask({
      title,
      description: '',
      status: 'todo',
      priority: 'medium',
      moscow: quickAddMoscow,
      due_date: null,
      start_time: null,
      end_time: null,
      tags: null,
    });
    setQuickAdd('');
  };

  /* ── Outlook-style layout for selected day ── */
  const dayLayout = (() => {
    const dayTasks = getScheduledForDay(selectedDay);
    return layoutOverlappingTasks(dayTasks);
  })();

  /* ── drag-and-drop state ── */
  const [dragTaskId, setDragTaskId] = useState<number | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<string | null>(null); // "day|hour"

  const handleDragStart = (taskId: number) => (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', String(taskId));
    e.dataTransfer.effectAllowed = 'move';
    setDragTaskId(taskId);
  };

  const handleDragEnd = () => {
    setDragTaskId(null);
    setDragOverSlot(null);
  };

  const handleSlotDragOver = (slotKey: string) => (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverSlot(slotKey);
  };

  const handleSlotDragLeave = () => {
    setDragOverSlot(null);
  };

  const handleSlotDrop = (day: Date, hour: number) => (e: React.DragEvent) => {
    e.preventDefault();
    const taskId = Number(e.dataTransfer.getData('text/plain'));
    if (taskId) {
      onUpdateTask(taskId, {
        due_date: format(day, 'yyyy-MM-dd'),
        start_time: `${hour.toString().padStart(2, '0')}:00`,
        end_time: `${(hour + 1).toString().padStart(2, '0')}:00`,
      });
      setSelectedDay(day);
    }
    setDragTaskId(null);
    setDragOverSlot(null);
  };

  /* ── today's note ── */
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayNote = notes.find(n => n.date === todayStr) || null;

  /* ── styles ── */
  const s = {
    bg:         isDark ? 'bg-[#0f0f1a]'      : 'bg-slate-50',
    panel:      isDark ? 'bg-[#16162a]'       : 'bg-white',
    panelAlt:   isDark ? 'bg-[#1a1a30]'       : 'bg-gray-50',
    border:     isDark ? 'border-white/[0.06]' : 'border-gray-200',
    text:       isDark ? 'text-slate-100'      : 'text-gray-900',
    textMuted:  isDark ? 'text-slate-400'      : 'text-gray-500',
    textDim:    isDark ? 'text-slate-500'      : 'text-gray-400',
    hover:      isDark ? 'hover:bg-white/[0.04]' : 'hover:bg-gray-50',
    hoverAlt:   isDark ? 'hover:bg-white/[0.06]' : 'hover:bg-gray-100',
    card:       isDark ? 'bg-white/[0.03]'    : 'bg-white',
    cardHover:  isDark ? 'hover:bg-white/[0.06]' : 'hover:bg-gray-50',
    input:      isDark ? 'bg-white/[0.05] border-white/[0.08] text-slate-200 placeholder-slate-500' : 'bg-gray-50 border-gray-200 text-gray-800 placeholder-gray-400',
    ring:       isDark ? 'focus:ring-violet-500/30' : 'focus:ring-violet-500/20',
    accent:     'bg-violet-600 hover:bg-violet-700 text-white',
  };

  return (
    <div ref={containerRef} className={`flex flex-col h-screen ${s.bg} select-none`}>
      {/* ═══ TOP BAR ═══ */}
      <header className={`h-12 flex items-center justify-between pl-5 pr-[140px] border-b ${s.border} ${s.panel}`} style={{ WebkitAppRegion: 'drag' } as any}>
        <div className="flex items-center gap-3" style={{ WebkitAppRegion: 'no-drag' } as any}>
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white font-bold text-xs shadow-lg shadow-violet-500/20">
            P
          </div>
          <span className={`text-sm font-semibold ${s.text}`}>Personal Tracker</span>
        </div>

        <div className={`text-xs font-medium ${s.textMuted}`} style={{ WebkitAppRegion: 'no-drag' } as any}>
          {format(new Date(), 'EEEE, MMMM d, yyyy')}
        </div>

        <div className="flex items-center gap-1.5" style={{ WebkitAppRegion: 'no-drag' } as any}>
          {onToggleCopilot && (
            <button
              onClick={onToggleCopilot}
              className={`p-2 rounded-lg transition-colors ${s.hover} group relative`}
              title="AI Assistant"
            >
              <Sparkles size={15} className="text-violet-500" />
            </button>
          )}
          <button onClick={toggleTheme} className={`p-2 rounded-lg transition-colors ${s.hover} ${s.textMuted}`}>
            {isDark ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </div>
      </header>

      {/* ═══ 3-PANEL BODY ═══ */}
      <div className="flex flex-1 overflow-hidden">

        {/* ──── LEFT: Todo Tracker ──── */}
        <div className={`flex flex-col border-r ${s.border} ${s.panel} overflow-hidden`} style={{ width: leftWidth, minWidth: 220 }}>
          {/* Quick Add */}
          <div className={`p-3 border-b ${s.border}`}>
            <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${s.input} ${s.ring} focus-within:ring-2 transition-all`}>
              <Plus size={14} className={s.textDim} />
              <input
                value={quickAdd}
                onChange={e => setQuickAdd(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleQuickAdd()}
                placeholder="Add a task..."
                className="flex-1 bg-transparent text-sm outline-none"
              />
              <select
                value={quickAddMoscow}
                onChange={e => setQuickAddMoscow(e.target.value as any)}
                className={`text-[10px] font-semibold rounded px-1.5 py-0.5 ${isDark ? 'bg-white/10 text-slate-300' : 'bg-gray-100 text-gray-600'} border-none outline-none cursor-pointer`}
              >
                <option value="must">Must</option>
                <option value="should">Should</option>
                <option value="want">Could</option>
              </select>
            </div>
          </div>

          {/* Task Groups */}
          <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
            {(['must', 'should', 'want', 'wont'] as const).map(moscow => {
              const cfg = moscowConfig[moscow];
              const list = grouped[moscow];
              if (list.length === 0 && moscow === 'wont') return null;
              const isCollapsed = collapsed[moscow];

              return (
                <div key={moscow}>
                  {/* Section header */}
                  <button
                    onClick={() => setCollapsed(p => ({ ...p, [moscow]: !p[moscow] }))}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[11px] font-semibold uppercase tracking-wider ${cfg.text} ${s.hover} transition-colors`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                    <span>{cfg.label}</span>
                    <span className={`ml-auto px-1.5 py-0.5 rounded text-[10px] ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}>
                      {list.length}
                    </span>
                    {isCollapsed ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
                  </button>

                  {/* Tasks */}
                  {!isCollapsed && (
                    <div className="space-y-0.5 mt-0.5">
                      {list.length === 0 ? (
                        <p className={`text-[11px] px-3 py-2 ${s.textDim}`}>No tasks</p>
                      ) : (
                        list.map(task => (
                          <TaskRow
                            key={task.id}
                            task={task}
                            isDark={isDark}
                            s={s}
                            onToggle={() => onUpdateTask(task.id, { status: task.status === 'done' ? 'todo' : 'done' })}
                            onEdit={() => onEditTask(task)}
                            onDelete={() => onDeleteTask(task.id)}
                            onStartFocus={() => onStartFocus(task.id, task.title)}
                            onDragStart={handleDragStart(task.id)}
                            onDragEnd={handleDragEnd}
                          />
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Completed section */}
            {doneTasks.length > 0 && (
              <div>
                <button
                  onClick={() => setCollapsed(p => ({ ...p, done: !p.done }))}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[11px] font-semibold uppercase tracking-wider ${s.textDim} ${s.hover} mt-2`}
                >
                  <CheckCircle2 size={12} />
                  <span>Completed</span>
                  <span className={`ml-auto px-1.5 py-0.5 rounded text-[10px] ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}>
                    {doneTasks.length}
                  </span>
                  {collapsed.done ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
                </button>
                {!collapsed.done && (
                  <div className="space-y-0.5 mt-0.5">
                    {doneTasks.slice(0, 10).map(task => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        isDark={isDark}
                        s={s}
                        onToggle={() => onUpdateTask(task.id, { status: 'todo' })}
                        onEdit={() => onEditTask(task)}
                        onDelete={() => onDeleteTask(task.id)}
                        onStartFocus={() => onStartFocus(task.id, task.title)}
                        onDragStart={handleDragStart(task.id)}
                        onDragEnd={handleDragEnd}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Task stats footer */}
          <div className={`px-3 py-2 border-t ${s.border} flex items-center justify-between`}>
            <span className={`text-[11px] ${s.textDim}`}>
              {activeTasks.length} active · {doneTasks.length} done
            </span>
            <button
              onClick={() => onOpenTaskForm()}
              className="text-[11px] font-medium text-violet-400 hover:text-violet-300 transition-colors"
            >
              + Detailed
            </button>
          </div>
        </div>

        {/* ──── LEFT RESIZE HANDLE ──── */}
        <div
          onMouseDown={onMouseDown('left')}
          className={`w-1 cursor-col-resize flex-shrink-0 ${isDark ? 'hover:bg-violet-500/30' : 'hover:bg-violet-500/20'} transition-colors active:bg-violet-500/50`}
        />

        {/* ──── CENTER: Daily Infinity Canvas ──── */}
        <div className={`flex-1 flex flex-col overflow-hidden ${s.panelAlt}`}>
          <DailyCanvas
            tasks={tasks}
            notes={notes}
            selectedDate={selectedDay}
            onAddTask={onAddTask}
            onUpdateTask={onUpdateTask}
            onAddNote={onAddNote}
            onUpdateNote={onUpdateNote}
            isDark={isDark}
            s={s}
          />
        </div>

        {/* ──── RIGHT RESIZE HANDLE ──── */}
        <div
          onMouseDown={onMouseDown('right')}
          className={`w-1 cursor-col-resize flex-shrink-0 ${isDark ? 'hover:bg-violet-500/30' : 'hover:bg-violet-500/20'} transition-colors active:bg-violet-500/50`}
        />

        {/* ──── RIGHT: Weekly Calendar ──── */}
        <div className={`flex flex-col border-l ${s.border} ${s.panel} overflow-hidden`} style={{ width: rightWidth, minWidth: 280 }}>
          {/* Week nav */}
          <div className={`flex items-center justify-between px-3 py-2 border-b ${s.border}`}>
            <button onClick={() => setWeekOffset(w => w - 1)} className={`p-1.5 rounded-lg ${s.hover} ${s.textMuted}`}>
              <ChevronLeft size={14} />
            </button>
            <div className="text-center">
              <button 
                onClick={() => setWeekOffset(0)} 
                className={`text-xs font-semibold ${s.text} hover:text-violet-400 transition-colors`}
              >
                {weekOffset === 0 ? 'This Week' : format(currentWeekStart, 'MMM d') + ' – ' + format(endOfWeek(currentWeekStart, { weekStartsOn: 1 }), 'MMM d')}
              </button>
              <p className={`text-[10px] ${s.textDim}`}>{format(currentWeekStart, 'MMMM yyyy')}</p>
            </div>
            <button onClick={() => setWeekOffset(w => w + 1)} className={`p-1.5 rounded-lg ${s.hover} ${s.textMuted}`}>
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Day selector strip */}
          <div className={`grid grid-cols-7 border-b ${s.border}`}>
            {weekDates.map(day => {
              const isSel = isSameDay(day, selectedDay);
              const isTod = isToday(day);
              const dayTasks = getScheduledForDay(day);
              const dayKey = `day-${format(day, 'yyyy-MM-dd')}`;
              const isDayDrop = dragOverSlot === dayKey;
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDay(day)}
                  onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverSlot(dayKey); }}
                  onDragLeave={() => setDragOverSlot(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    const taskId = Number(e.dataTransfer.getData('text/plain'));
                    if (taskId) {
                      onUpdateTask(taskId, { due_date: format(day, 'yyyy-MM-dd') });
                      setSelectedDay(day);
                    }
                    setDragTaskId(null);
                    setDragOverSlot(null);
                  }}
                  className={`py-2 text-center transition-all relative ${
                    isDayDrop
                      ? isDark ? 'bg-violet-500/25 ring-1 ring-inset ring-violet-400' : 'bg-violet-100 ring-1 ring-inset ring-violet-500'
                      : isSel 
                        ? isDark ? 'bg-violet-500/15' : 'bg-violet-50' 
                        : s.hover
                  }`}
                >
                  <div className={`text-[10px] font-medium ${isTod ? 'text-violet-400' : s.textDim}`}>
                    {format(day, 'EEE')}
                  </div>
                  <div className={`text-sm font-semibold ${
                    isTod ? 'text-violet-400' : isSel ? s.text : isDark ? 'text-slate-300' : 'text-gray-600'
                  }`}>
                    {format(day, 'd')}
                  </div>
                  {dayTasks.length > 0 && (
                    <div className="flex justify-center gap-0.5 mt-0.5">
                      {dayTasks.slice(0, 3).map((_, i) => (
                        <div key={i} className="w-1 h-1 rounded-full bg-violet-500" />
                      ))}
                    </div>
                  )}
                  {isTod && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-violet-500 rounded-full" />}
                </button>
              );
            })}
          </div>

          {/* Timeline for selected day */}
          <div className="flex-1 overflow-y-auto">
            <div className="relative" style={{ height: `${TIME_SLOTS.length * 48}px` }}>
              {/* Hour grid lines + drop zones */}
              {TIME_SLOTS.map(hour => {
                const slotKey = `${format(selectedDay, 'yyyy-MM-dd')}|${hour}`;
                const isDropTarget = dragOverSlot === slotKey;
                return (
                  <div
                    key={hour}
                    onClick={() => onOpenTaskForm(selectedDay, `${hour.toString().padStart(2, '0')}:00`)}
                    onDragOver={handleSlotDragOver(slotKey)}
                    onDragLeave={handleSlotDragLeave}
                    onDrop={handleSlotDrop(selectedDay, hour)}
                    className={`absolute left-0 right-0 flex border-b cursor-pointer transition-colors ${s.border} ${
                      isDropTarget
                        ? isDark ? 'bg-violet-500/20 ring-1 ring-inset ring-violet-500/40' : 'bg-violet-100 ring-1 ring-inset ring-violet-400/40'
                        : s.hover
                    }`}
                    style={{ top: `${(hour - TIME_SLOTS[0]) * 48}px`, height: '48px' }}
                  >
                    <div className={`w-12 flex-shrink-0 flex items-start justify-end pr-2 pt-0.5 text-[10px] ${s.textDim}`}>
                      {hour === 12 ? '12pm' : hour > 12 ? `${hour - 12}pm` : `${hour}am`}
                    </div>
                  </div>
                );
              })}

              {/* Task cards — Outlook-style absolute positioned with columns */}
              {dayLayout.map(({ task, col, totalCols }) => {
                const startMin = getTaskStartMinutes(task);
                const dur = getTaskDuration(task);
                const topPx = ((startMin - TIME_SLOTS[0] * 60) / 60) * 48;
                const heightPx = Math.max((dur / 60) * 48, 22);
                const leftPct = 12 + (col / totalCols) * 88; // 12 = time label width ~w-12
                const widthPct = (1 / totalCols) * 88 - 1; // 1% gap between columns

                const priorityStyle = task.priority === 'high'
                  ? isDark ? 'bg-red-500/15 border-l-red-500 text-red-300 hover:bg-red-500/25' : 'bg-red-50 border-l-red-500 text-red-700 hover:bg-red-100'
                  : task.priority === 'low'
                    ? isDark ? 'bg-green-500/15 border-l-green-500 text-green-300 hover:bg-green-500/25' : 'bg-green-50 border-l-green-500 text-green-700 hover:bg-green-100'
                    : isDark ? 'bg-amber-500/15 border-l-amber-500 text-amber-300 hover:bg-amber-500/25' : 'bg-amber-50 border-l-amber-500 text-amber-700 hover:bg-amber-100';

                return (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={handleDragStart(task.id)}
                    onDragEnd={handleDragEnd}
                    onClick={e => { e.stopPropagation(); onEditTask(task); }}
                    className={`absolute rounded px-2 py-0.5 text-[11px] font-medium cursor-grab active:cursor-grabbing border-l-2 transition-colors z-[5] overflow-hidden ${priorityStyle}`}
                    style={{
                      top: `${topPx + 1}px`,
                      height: `${heightPx - 2}px`,
                      left: `${leftPct}%`,
                      width: `${widthPct}%`,
                    }}
                    title={`${task.title}${task.start_time ? ` (${task.start_time}${task.end_time ? '–' + task.end_time : ''})` : ''}`}
                  >
                    <div className="truncate leading-tight">{task.title}</div>
                    {heightPx > 30 && task.start_time && (
                      <div className={`text-[9px] mt-0.5 ${isDark ? 'opacity-60' : 'opacity-50'}`}>
                        {task.start_time}{task.end_time ? ` – ${task.end_time}` : ''}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Current time indicator */}
              {isToday(selectedDay) && (() => {
                const now = new Date();
                const nowMin = now.getHours() * 60 + now.getMinutes();
                const topPx = ((nowMin - TIME_SLOTS[0] * 60) / 60) * 48;
                if (topPx < 0 || topPx > TIME_SLOTS.length * 48) return null;
                return (
                  <div
                    className="absolute left-10 right-0 border-t-2 border-red-500 z-20 pointer-events-none"
                    style={{ top: `${topPx}px` }}
                  >
                    <div className="absolute -left-1 -top-1.5 w-2.5 h-2.5 rounded-full bg-red-500" />
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Mini Pomodoro Timer */}
          <div className={`px-3 py-2.5 border-t ${s.border} flex items-center gap-3`}>
            <div className={`flex items-center gap-2 flex-1`}>
              <Clock size={14} className="text-violet-400" />
              <span className={`text-sm font-mono font-semibold ${s.text}`}>
                {Math.floor(pomodoroSeconds / 60).toString().padStart(2, '0')}:{(pomodoroSeconds % 60).toString().padStart(2, '0')}
              </span>
            </div>
            <button
              onClick={() => setPomodoroActive(!pomodoroActive)}
              className={`p-1.5 rounded-lg transition-colors ${pomodoroActive ? 'bg-red-500/15 text-red-400 hover:bg-red-500/25' : 'bg-violet-500/15 text-violet-400 hover:bg-violet-500/25'}`}
            >
              {pomodoroActive ? <Pause size={14} /> : <Play size={14} />}
            </button>
            <button
              onClick={() => { setPomodoroActive(false); setPomodoroSeconds(25 * 60); }}
              className={`p-1.5 rounded-lg ${s.hover} ${s.textMuted}`}
            >
              <RotateCcw size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ═══════ TaskRow sub-component ═══════ */
interface TaskRowProps {
  task: Task;
  isDark: boolean;
  s: Record<string, string>;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onStartFocus: () => void;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
}

const TaskRow: React.FC<TaskRowProps> = ({ task, isDark, s, onToggle, onEdit, onDelete, onStartFocus, onDragStart, onDragEnd }) => {
  const [hovered, setHovered] = useState(false);
  const done = task.status === 'done';

  const priorityDot = task.priority === 'high' ? 'bg-red-400' : task.priority === 'low' ? 'bg-green-400' : 'bg-amber-400';

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`group flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-grab active:cursor-grabbing transition-all ${s.cardHover}`}
    >
      {/* Checkbox */}
      <button onClick={onToggle} className="flex-shrink-0">
        {done ? (
          <CheckCircle2 size={16} className="text-emerald-500" />
        ) : (
          <Circle size={16} className={isDark ? 'text-slate-600 hover:text-violet-400' : 'text-gray-300 hover:text-violet-500'} />
        )}
      </button>

      {/* Title */}
      <span
        onClick={onEdit}
        className={`flex-1 text-sm truncate transition-colors ${
          done ? 'line-through text-slate-500' : isDark ? 'text-slate-200' : 'text-gray-700'
        }`}
      >
        {task.title}
      </span>

      {/* Priority dot */}
      {!done && <div className={`w-1.5 h-1.5 rounded-full ${priorityDot} flex-shrink-0`} />}

      {/* Actions on hover */}
      {hovered && !done && (
        <div className="flex items-center gap-0.5">
          <button onClick={onStartFocus} className={`p-1 rounded ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-200'}`} title="Focus">
            <Play size={11} className="text-violet-400" />
          </button>
          <button onClick={onDelete} className={`p-1 rounded ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-200'}`} title="Delete">
            <Trash2 size={11} className="text-red-400" />
          </button>
        </div>
      )}

      {/* Due date badge */}
      {!done && task.due_date && (
        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${isDark ? 'bg-white/5 text-slate-400' : 'bg-gray-100 text-gray-500'}`}>
          {format(new Date(task.due_date), 'MMM d')}
        </span>
      )}
    </div>
  );
};

export default TrackerLayout;
