import React, { useState, useEffect } from 'react';
import { Plus, ChevronLeft, ChevronRight, Calendar, Bot, Tag, X } from 'lucide-react';
import TaskList from './components/TaskList';
import TaskForm from './components/TaskForm';
import CalendarView from './components/Calendar/CalendarView';
import OutlookCalendar from './components/Calendar/OutlookCalendar';
import TaskCard from './components/TaskCard';
import TopNavBar from './components/TopNavBar';
import NotesLayout from './components/Notes/NotesLayout';
import HabitList from './components/HabitList';
import HabitForm from './components/HabitForm';
import JournalList from './components/JournalList';
import JournalEditor from './components/JournalEditor';
import CopilotChat from './components/CopilotChat';
import { FocusTimerContainer } from './components/TimeTracking/TaskTimer';
import { getTagColor } from './components/TagInput';
import WeeklyPlannerView from './components/WeeklyPlanner/WeeklyPlannerView';
import WorkbenchLayout from './components/Workbench/WorkbenchLayout';
import { Note } from './types/notes';
import { Habit, HabitCompletion } from './types/habits';
import { JournalEntry } from './types/journal';

export interface Task {
  id: number;
  title: string;
  description: string;
  status: 'todo' | 'in-progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  moscow: 'must' | 'should' | 'want' | 'wont';
  due_date: string | null;
  start_time: string | null;
  end_time: string | null;
  tags: string | null;
  created_at: string;
  updated_at: string;
}

function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [filter, setFilter] = useState<'all' | 'todo' | 'in-progress' | 'done'>('all');
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [calendarView, setCalendarView] = useState<'day' | 'week' | 'month'>('week');
  const [newTaskDate, setNewTaskDate] = useState<Date | null>(null);
  const [newTaskTime, setNewTaskTime] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'tasks' | 'notes' | 'habits' | 'journal' | 'people' | 'planner' | 'workbench'>('tasks');
  const [isCalendarExpanded, setIsCalendarExpanded] = useState(true);

  // Notes state
  const [notes, setNotes] = useState<Note[]>([]);
  const [isNoteFormOpen, setIsNoteFormOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);

  // Habits state
  const [habits, setHabits] = useState<Habit[]>([]);
  const [habitCompletions, setHabitCompletions] = useState<HabitCompletion[]>([]);
  const [isHabitFormOpen, setIsHabitFormOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);

  // Journal state
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [isJournalFormOpen, setIsJournalFormOpen] = useState(false);
  const [editingJournalEntry, setEditingJournalEntry] = useState<JournalEntry | null>(null);

  // Copilot AI Assistant state
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);

  // Focus Timer state
  const [focusTaskId, setFocusTaskId] = useState<number | null>(null);
  const [focusTaskTitle, setFocusTaskTitle] = useState<string | null>(null);
  const [isFocusExpanded, setIsFocusExpanded] = useState(false);

  useEffect(() => {
    loadTasks();
    loadNotes();
    loadHabits();
    loadJournalEntries();
    syncExistingTags(); // Sync any existing tags from tasks to the tags table
    
    // Listen for task refresh events from main process (e.g., after AI creates a task)
    const removeListener = window.electronAPI.on?.('tasks:refresh', () => {
      console.log('🔄 Refreshing tasks after AI creation');
      loadTasks();
    });
    
    return () => {
      removeListener?.();
    };
  }, []);

  const loadTasks = async () => {
    const allTasks = await window.electronAPI.getTasks();
    setTasks(allTasks);
  };

  // Sync existing task tags to the tags table (runs once on mount)
  const syncExistingTags = async () => {
    try {
      const allTasks = await window.electronAPI.getTasks();
      const allTagsFromTasks = allTasks
        .filter((t: Task) => t.tags)
        .flatMap((t: Task) => t.tags!.split(',').map(tag => tag.trim().toLowerCase()))
        .filter((tag: string) => tag);
      
      // Get unique tags
      const uniqueTags = [...new Set(allTagsFromTasks)];
      
      if (uniqueTags.length > 0) {
        // This will create tags if they don't exist (with usage_count = 1 initially)
        // We use a simple approach - just ensure each tag exists
        for (const tag of uniqueTags) {
          await window.electronAPI.createTag(tag);
        }
      }
    } catch (error) {
      console.error('Failed to sync existing tags:', error);
    }
  };

  // Focus Timer functions
  const handleStartFocus = (taskId: number, taskTitle: string) => {
    setFocusTaskId(taskId);
    setFocusTaskTitle(taskTitle);
    setIsFocusExpanded(true);
  };

  const handleCloseFocus = () => {
    setFocusTaskId(null);
    setFocusTaskTitle(null);
    setIsFocusExpanded(false);
  };

  const handleExpandFocus = () => {
    setIsFocusExpanded(true);
  };

  const handleMinimizeFocus = () => {
    setIsFocusExpanded(false);
  };

  // Handle completing a task from the timer
  const handleTimerTaskComplete = async (taskId: number) => {
    await window.electronAPI.updateTask(taskId, { status: 'done' });
    await loadTasks();
    handleCloseFocus();
  };

  // Handle switching to next planned task
  const handleNextTask = () => {
    // Find tasks planned for today that are not done
    const today = new Date().toISOString().split('T')[0];
    const plannedTasks = tasks.filter(t => 
      t.status !== 'done' && 
      t.scheduled_date === today && 
      t.id !== focusTaskId
    );
    
    if (plannedTasks.length > 0) {
      const nextTask = plannedTasks[0];
      setFocusTaskId(nextTask.id);
      setFocusTaskTitle(nextTask.title);
    } else {
      handleCloseFocus();
    }
  };

  // Notes functions
  const loadNotes = async () => {
    const allNotes = await window.electronAPI.getNotes();
    setNotes(allNotes);
  };

  const handleAddNote = async (noteData: Omit<Note, 'id' | 'created_at' | 'updated_at'>) => {
    await window.electronAPI.createNote(noteData);
    await loadNotes();
    setIsNoteFormOpen(false);
  };

  const handleUpdateNote = async (id: number, noteData: Partial<Note>) => {
    await window.electronAPI.updateNote(id, noteData);
    await loadNotes();
    setIsNoteFormOpen(false);
    setEditingNote(null);
  };

  const handleDeleteNote = async (id: number) => {
    await window.electronAPI.deleteNote(id);
    await loadNotes();
  };

  const handleTogglePin = async (id: number, isPinned: boolean) => {
    await window.electronAPI.updateNote(id, { is_pinned: !isPinned });
    await loadNotes();
  };

  const handleEditNote = (note: Note) => {
    setEditingNote(note);
    setIsNoteFormOpen(true);
  };

  // Habits functions
  const loadHabits = async () => {
    const allHabits = await window.electronAPI.getHabits();
    const allCompletions = await window.electronAPI.getHabitCompletions();
    setHabits(allHabits);
    setHabitCompletions(allCompletions);
  };

  const handleAddHabit = async (habitData: Omit<Habit, 'id' | 'created_at' | 'updated_at' | 'current_streak' | 'best_streak'>) => {
    await window.electronAPI.createHabit(habitData);
    await loadHabits();
    setIsHabitFormOpen(false);
  };

  const handleUpdateHabit = async (id: number, habitData: Partial<Habit>) => {
    await window.electronAPI.updateHabit(id, habitData);
    await loadHabits();
    setIsHabitFormOpen(false);
    setEditingHabit(null);
  };

  const handleDeleteHabit = async (id: number) => {
    await window.electronAPI.deleteHabit(id);
    await loadHabits();
  };

  const handleCompleteHabit = async (habitId: number, date: string) => {
    await window.electronAPI.toggleHabitCompletion(habitId, date);
    await loadHabits();
  };

  const handleEditHabit = (habit: Habit) => {
    setEditingHabit(habit);
    setIsHabitFormOpen(true);
  };

  // Journal functions
  const loadJournalEntries = async () => {
    const entries = await window.electronAPI.getJournalEntries();
    setJournalEntries(entries);
  };

  const handleAddJournalEntry = async (entryData: Omit<JournalEntry, 'id' | 'created_at' | 'updated_at'>) => {
    await window.electronAPI.createJournalEntry(entryData);
    await loadJournalEntries();
    setIsJournalFormOpen(false);
  };

  const handleUpdateJournalEntry = async (id: number, entryData: Partial<JournalEntry>) => {
    await window.electronAPI.updateJournalEntry(id, entryData);
    await loadJournalEntries();
    setIsJournalFormOpen(false);
    setEditingJournalEntry(null);
  };

  const handleDeleteJournalEntry = async (id: number) => {
    await window.electronAPI.deleteJournalEntry(id);
    await loadJournalEntries();
  };

  const handleEditJournalEntry = (entry: JournalEntry) => {
    setEditingJournalEntry(entry);
    setIsJournalFormOpen(true);
  };

  const handleAddTask = async (taskData: Omit<Task, 'id' | 'created_at' | 'updated_at'>): Promise<number | null> => {
    const result = await window.electronAPI.createTask(taskData);
    // Track tag usage when task is created
    if (taskData.tags) {
      const tagList = taskData.tags.split(',').map(t => t.trim()).filter(t => t);
      if (tagList.length > 0) {
        await window.electronAPI.updateTagUsage(tagList);
      }
    }
    await loadTasks();
    setIsFormOpen(false);
    return result?.id || null;
  };

  const handleUpdateTask = async (id: number, taskData: Partial<Task>) => {
    await window.electronAPI.updateTask(id, taskData);
    // Track tag usage when task is updated with new tags
    if (taskData.tags) {
      const tagList = taskData.tags.split(',').map(t => t.trim()).filter(t => t);
      if (tagList.length > 0) {
        await window.electronAPI.updateTagUsage(tagList);
      }
    }
    await loadTasks();
    setIsFormOpen(false);
    setEditingTask(null);
  };

  const handleDeleteTask = async (id: number) => {
    await window.electronAPI.deleteTask(id);
    await loadTasks();
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setIsFormOpen(true);
  };

  const filteredTasks = tasks.filter(task => {
    // Status filter
    const statusMatch = filter === 'all' 
      ? task.status !== 'done'
      : task.status === filter;
    
    // Tag filter - if tags are selected, task must have at least one matching tag
    const tagMatch = tagFilter.length === 0 || (
      task.tags && tagFilter.some(tag => 
        task.tags!.toLowerCase().split(',').map(t => t.trim()).includes(tag.toLowerCase())
      )
    );
    
    return statusMatch && tagMatch;
  });

  // Get all unique tags from tasks for the filter UI
  const allTaskTags = [...new Set(
    tasks
      .filter(t => t.tags)
      .flatMap(t => t.tags!.split(',').map(tag => tag.trim().toLowerCase()))
  )].sort();

  return (
    <div className="flex flex-col h-screen bg-[#1a1a2e]">
      {/* Top Navigation Bar */}
      <TopNavBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        taskCount={tasks.length}
        habitCount={0}
      />
      
      <div className="flex flex-1 overflow-hidden">
        {/* Main Content Area - LEFT SIDE */}
        <div className="flex-1 flex flex-col">
          {/* Header - only show for Tasks tab */}
          {activeTab === 'tasks' && (
            <div className="bg-[#1e1e2e] border-b border-[#2a2a3e] px-6 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <h1 className="text-xl font-bold text-white">Tasks</h1>
                  {/* Filter Pills */}
                  <div className="flex gap-1">
                    {(['all', 'todo', 'in-progress', 'done'] as const).map((filterOption) => (
                      <button
                        key={filterOption}
                        onClick={() => setFilter(filterOption)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                          filter === filterOption
                            ? 'bg-blue-600 text-white'
                            : 'bg-transparent text-gray-400 hover:text-white hover:bg-[#2a2a3e]'
                        }`}
                      >
                        {filterOption === 'all' ? 'All' : filterOption === 'todo' ? 'To Do' : filterOption === 'in-progress' ? 'In Progress' : 'Done'}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Hidden on mobile, shown on desktop - button moved to floating */}
                <button
                  onClick={() => {
                    setEditingTask(null);
                    setNewTaskDate(null);
                    setNewTaskTime(null);
                    setIsFormOpen(true);
                  }}
                  className="hidden md:flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all duration-200"
                >
                  <Plus size={18} />
                  Add Task
                </button>
              </div>
              
              {/* Tag Filter Row */}
              {allTaskTags.length > 0 && (
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <Tag size={12} />
                    Filter by tags:
                  </span>
                  {allTaskTags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => {
                        if (tagFilter.includes(tag)) {
                          setTagFilter(tagFilter.filter(t => t !== tag));
                        } else {
                          setTagFilter([...tagFilter, tag]);
                        }
                      }}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border transition-all ${
                        tagFilter.includes(tag)
                          ? getTagColor(tag) + ' ring-2 ring-offset-1 ring-offset-[#1e1e2e]'
                          : 'bg-slate-700/50 text-slate-400 border-slate-600 hover:bg-slate-700'
                      }`}
                    >
                      {tag}
                      {tagFilter.includes(tag) && <X size={10} />}
                    </button>
                  ))}
                  {tagFilter.length > 0 && (
                    <button
                      onClick={() => setTagFilter([])}
                      className="text-xs text-blue-400 hover:text-blue-300 ml-2"
                    >
                      Clear all
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Header for Habits tab */}
          {activeTab === 'habits' && (
            <div className="h-14 bg-[#1e1e2e] border-b border-[#2a2a3e] flex items-center justify-between px-6">
              <div className="flex items-center gap-4">
                <h1 className="text-xl font-bold text-white">Habits</h1>
                <span className="text-sm text-gray-400">{habits.length} habits</span>
              </div>
              <button
                onClick={() => {
                  setEditingHabit(null);
                  setIsHabitFormOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium shadow-lg shadow-green-600/30 hover:shadow-xl transition-all duration-200"
              >
                <Plus size={18} />
                Add Habit
              </button>
            </div>
          )}

          {/* Header for Journal tab */}
          {activeTab === 'journal' && (
            <div className="h-14 bg-[#1e1e2e] border-b border-[#2a2a3e] flex items-center justify-between px-6">
              <div className="flex items-center gap-4">
                <h1 className="text-xl font-bold text-white">Journal</h1>
                <span className="text-sm text-gray-400">{journalEntries.length} entries</span>
              </div>
              <button
                onClick={() => {
                  setEditingJournalEntry(null);
                  setIsJournalFormOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow-lg shadow-indigo-600/30 hover:shadow-xl transition-all duration-200"
              >
                <Plus size={18} />
                New Entry
              </button>
            </div>
          )}

          {/* Main Content */}
          <div className="flex-1 overflow-auto bg-[#16213e] relative">
            {activeTab === 'tasks' && (
              <>
                <div className="p-6 pb-20">
                  <TaskList
                    tasks={filteredTasks}
                    onEdit={handleEditTask}
                    onDelete={handleDeleteTask}
                    onStatusChange={(id, status) => handleUpdateTask(id, { status: status as Task['status'] })}
                    onUpdateTask={handleUpdateTask}
                    onStartFocus={handleStartFocus}
                  />
                </div>
                
                {/* Floating Add Button */}
                <button
                  onClick={() => {
                    setEditingTask(null);
                    setNewTaskDate(null);
                    setNewTaskTime(null);
                    setIsFormOpen(true);
                  }}
                  className="fixed bottom-6 left-6 w-14 h-14 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg shadow-blue-500/40 hover:shadow-xl hover:scale-105 transition-all duration-200 flex items-center justify-center z-50"
                  title="Add Task"
                >
                  <Plus size={28} />
                </button>
                
                {/* Floating AI Assistant Button */}
                <button
                  onClick={() => setIsCopilotOpen(true)}
                  className="fixed bottom-6 left-24 w-14 h-14 bg-purple-600 hover:bg-purple-700 text-white rounded-full shadow-lg shadow-purple-600/40 hover:shadow-xl hover:scale-105 transition-all duration-200 flex items-center justify-center z-50"
                  title="AI Assistant"
                >
                  <Bot size={24} />
                </button>
              </>
            )}
            
            {/* Notes Tab - Full-height Layout */}
            {activeTab === 'notes' && (
              <NotesLayout
                notes={notes}
                tasks={tasks}
                onAddNote={handleAddNote}
                onUpdateNote={handleUpdateNote}
                onDeleteNote={handleDeleteNote}
                onTogglePin={handleTogglePin}
                onAddTask={handleAddTask}
                onUpdateTask={handleUpdateTask}
              />
            )}
            
            {activeTab === 'habits' && (
              <div className="p-6">
                <HabitList
                  habits={habits}
                  completions={habitCompletions}
                  onComplete={handleCompleteHabit}
                  onEdit={handleEditHabit}
                  onDelete={handleDeleteHabit}
                />
              </div>
            )}
            
            {activeTab === 'journal' && (
              <div className="p-6">
                <JournalList
                  entries={journalEntries}
                  onEdit={handleEditJournalEntry}
                  onDelete={handleDeleteJournalEntry}
                />
              </div>
            )}
            
            {activeTab === 'people' && (
              <div className="flex items-center justify-center h-full text-gray-400">
                <div className="text-center">
                  <h2 className="text-2xl font-bold mb-2">People</h2>
                  <p>Coming soon...</p>
                </div>
              </div>
            )}

            {activeTab === 'planner' && (
              <WeeklyPlannerView onTasksChange={loadTasks} />
            )}

            {activeTab === 'workbench' && (
              <WorkbenchLayout
                tasks={tasks}
                notes={notes}
                onEditTask={handleEditTask}
                onDeleteTask={handleDeleteTask}
                onUpdateTask={handleUpdateTask}
                onAddTask={handleAddTask}
                onStartFocus={(taskId, taskTitle) => {
                  setFocusTaskId(taskId);
                  setFocusTaskTitle(taskTitle);
                }}
                onAddNote={(note) => {
                  window.electronAPI.addNote(note).then(loadNotes);
                }}
                onUpdateNote={(id, updates) => {
                  window.electronAPI.updateNote(id, updates).then(loadNotes);
                }}
                onOpenTaskForm={(date, time) => {
                  setNewTaskDate(date || null);
                  setNewTaskTime(time || null);
                  setEditingTask(null);
                  setIsFormOpen(true);
                }}
                onOpenCopilot={() => setIsCopilotOpen(true)}
              />
            )}
          </div>
        </div>

        {/* Right Sidebar - Calendar Panel */}
        {activeTab === 'tasks' && (
          <div className={`border-l border-[#2a2a3e] bg-[#1e1e2e] flex flex-col transition-all duration-300 ${isCalendarExpanded ? 'w-80' : 'w-12'}`}>
            {/* Collapse/Expand Toggle */}
            <div className={`p-2 border-b border-[#2a2a3e] flex ${isCalendarExpanded ? 'justify-between' : 'justify-center'}`}>
              {isCalendarExpanded && (
                <span className="text-sm font-medium text-gray-400 flex items-center gap-2">
                  <Calendar size={16} />
                  Calendar
                </span>
              )}
              <button
                onClick={() => setIsCalendarExpanded(!isCalendarExpanded)}
                className="p-1.5 rounded-lg bg-[#2a2a3e] hover:bg-[#3a3a4e] text-gray-400 hover:text-white transition-all"
                title={isCalendarExpanded ? 'Collapse calendar' : 'Expand calendar'}
              >
                {isCalendarExpanded ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
              </button>
            </div>
            
            {isCalendarExpanded && (
              <>
                {/* Calendar View Toggle */}
                <div className="p-4 border-b border-[#2a2a3e]">
                  <div className="flex bg-[#16213e] rounded-lg p-1">
                    {(['day', 'week', 'month'] as const).map((view) => (
                      <button
                        key={view}
                        onClick={() => setCalendarView(view)}
                        className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${
                          calendarView === view
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        {view.charAt(0).toUpperCase() + view.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Calendar */}
                <div className="flex-1 overflow-hidden">
                  {calendarView === 'week' ? (
                    <OutlookCalendar
                      tasks={tasks}
                      onEditTask={handleEditTask}
                      onAddTask={(date, time) => {
                        setNewTaskDate(date);
                        setNewTaskTime(time || null);
                        setEditingTask(null);
                        setIsFormOpen(true);
                      }}
                      onUpdateTask={handleUpdateTask}
                      habits={habits.slice(0, 1).map(h => ({ id: h.id, name: h.name, color: h.color || 'blue' }))}
                      onCompleteHabit={(id) => handleCompleteHabit(id, new Date().toISOString().split('T')[0])}
                    />
                  ) : (
                    <div className="p-4">
                      <CalendarView
                        tasks={filteredTasks}
                        view={calendarView}
                        onAddTask={(date, time) => {
                          setNewTaskDate(date);
                          setNewTaskTime(time || null);
                          setEditingTask(null);
                          setIsFormOpen(true);
                        }}
                        onEditTask={handleEditTask}
                        onToggleStatus={(id, status) => handleUpdateTask(id, { status: status as Task['status'] })}
                      />
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Task Form Modal */}
      <TaskForm
        isOpen={isFormOpen}
        editingTask={editingTask}
        initialDate={newTaskDate}
        initialTime={newTaskTime}
        onSubmit={(data) => {
          if (editingTask) {
            handleUpdateTask(editingTask.id, data);
          } else {
            handleAddTask(data as Omit<Task, 'id' | 'created_at' | 'updated_at'>);
          }
        }}
        onClose={() => {
          setIsFormOpen(false);
          setEditingTask(null);
          setNewTaskDate(null);
          setNewTaskTime(null);
        }}
      />

      {/* Habit Form Modal */}
      <HabitForm
        isOpen={isHabitFormOpen}
        editingHabit={editingHabit}
        onSubmit={(data) => {
          if (editingHabit) {
            handleUpdateHabit(editingHabit.id, data);
          } else {
            handleAddHabit(data as Omit<Habit, 'id' | 'created_at' | 'updated_at' | 'current_streak' | 'best_streak'>);
          }
        }}
        onClose={() => {
          setIsHabitFormOpen(false);
          setEditingHabit(null);
        }}
      />

      {/* Journal Editor Modal */}
      <JournalEditor
        isOpen={isJournalFormOpen}
        editingEntry={editingJournalEntry}
        onSubmit={(data) => {
          if (editingJournalEntry) {
            handleUpdateJournalEntry(editingJournalEntry.id, data);
          } else {
            handleAddJournalEntry(data as Omit<JournalEntry, 'id' | 'created_at' | 'updated_at'>);
          }
        }}
        onClose={() => {
          setIsJournalFormOpen(false);
          setEditingJournalEntry(null);
        }}
      />

      {/* Copilot AI Assistant */}
      <CopilotChat 
        isOpen={isCopilotOpen} 
        onClose={() => setIsCopilotOpen(false)} 
      />

      {/* Focus Timer - Single persistent instance with modal/floating modes */}
      {focusTaskId && (
        <FocusTimerContainer
          taskId={focusTaskId}
          taskTitle={focusTaskTitle || ''}
          isExpanded={isFocusExpanded}
          onExpand={handleExpandFocus}
          onMinimize={handleMinimizeFocus}
          onClose={handleCloseFocus}
          onTaskComplete={handleTimerTaskComplete}
          onNextTask={handleNextTask}
        />
      )}
    </div>
  );
}

export default App;
