import React, { useState, useEffect } from 'react';
import TaskForm from './components/TaskForm';
import CopilotChat from './components/CopilotChat';
import { FocusTimerContainer } from './components/TimeTracking/TaskTimer';
import TrackerLayout from './components/Tracker/TrackerLayout';
import { Note } from './types/notes';

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
  const [newTaskDate, setNewTaskDate] = useState<Date | null>(null);
  const [newTaskTime, setNewTaskTime] = useState<string | null>(null);

  // Notes state
  const [notes, setNotes] = useState<Note[]>([]);

  // Copilot AI Assistant state
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);

  // Focus Timer state
  const [focusTaskId, setFocusTaskId] = useState<number | null>(null);
  const [focusTaskTitle, setFocusTaskTitle] = useState<string | null>(null);
  const [isFocusExpanded, setIsFocusExpanded] = useState(false);

  useEffect(() => {
    loadTasks();
    loadNotes();
    syncExistingTags();
    
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
      t.due_date === today && 
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
  };

  const handleUpdateNote = async (id: number, noteData: Partial<Note>) => {
    await window.electronAPI.updateNote(id, noteData);
    await loadNotes();
  };

  const handleDeleteNote = async (id: number) => {
    await window.electronAPI.deleteNote(id);
    await loadNotes();
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

  return (
    <>
      <TrackerLayout
        tasks={tasks}
        notes={notes}
        onAddTask={handleAddTask}
        onUpdateTask={handleUpdateTask}
        onDeleteTask={handleDeleteTask}
        onEditTask={handleEditTask}
        onAddNote={handleAddNote}
        onUpdateNote={handleUpdateNote}
        onDeleteNote={handleDeleteNote}
        onStartFocus={handleStartFocus}
        onOpenTaskForm={(date?: Date, time?: string) => {
          setNewTaskDate(date || null);
          setNewTaskTime(time || null);
          setEditingTask(null);
          setIsFormOpen(true);
        }}
      />

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

      {/* Copilot AI Assistant */}
      <CopilotChat 
        isOpen={isCopilotOpen} 
        onClose={() => setIsCopilotOpen(false)} 
      />

      {/* Focus Timer */}
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
    </>
  );
}

export default App;
