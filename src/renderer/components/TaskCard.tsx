import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Clock, Edit, Trash2, CheckCircle2, Circle, AlertCircle, ChevronUp, Check, X, Tag as TagIcon, MoreHorizontal, Hourglass } from 'lucide-react';
import { format } from 'date-fns';
import { Task } from '../App';
import { StartFocusButton } from './TimeTracking/TaskTimer';
import { useTheme } from '../contexts/ThemeContext';

interface TaskCardProps {
  task: Task;
  taskNumber?: number;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (status: Task['status']) => void;
  onUpdateTask: (id: number, updates: Partial<Task>) => void;
  onStartFocus?: (taskId: number, taskTitle: string) => void;
  compact?: boolean;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, taskNumber, onEdit, onDelete, onStatusChange, onUpdateTask, onStartFocus, compact = false }) => {
  const [subtaskCount, setSubtaskCount] = useState({ completed: 0, total: 0 });
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(task.title);
  const [isEditingDate, setIsEditingDate] = useState(false);
  const [editedDate, setEditedDate] = useState(task.due_date || '');
  const [isEditingTime, setIsEditingTime] = useState(false);
  const [editedStartTime, setEditedStartTime] = useState(task.start_time || '');
  const [editedEndTime, setEditedEndTime] = useState(task.end_time || '');
  const [isEditingTags, setIsEditingTags] = useState(false);
  const [editedTags, setEditedTags] = useState(task.tags || '');
  const [showActions, setShowActions] = useState(false);
  const [isLoggingTime, setIsLoggingTime] = useState(false);
  const [logHours, setLogHours] = useState(0);
  const [logMinutes, setLogMinutes] = useState(0);
  const [logSaving, setLogSaving] = useState(false);
  const [logSuccess, setLogSuccess] = useState(false);
  
  const titleInputRef = useRef<HTMLInputElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const timeInputRef = useRef<HTMLInputElement>(null);
  const tagsInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const { theme } = useTheme();
  const isLight = theme === 'light';

  const t = {
    bg: isLight ? 'bg-white' : 'bg-slate-900',
    border: isLight ? 'border-gray-100' : 'border-slate-800',
    text: isLight ? 'text-gray-900' : 'text-white',
    textMuted: isLight ? 'text-gray-500' : 'text-slate-400',
    hoverBg: isLight ? 'hover:bg-gray-50' : 'hover:bg-slate-800/50',
    rowBg: isLight ? 'bg-white' : 'bg-slate-900',
    rowHover: isLight ? 'hover:bg-gray-50' : 'hover:bg-slate-800/30',
  };

  useEffect(() => {
    window.electronAPI.getSubtasks(task.id).then(subtasks => {
      setSubtaskCount({
        completed: subtasks.filter((s: any) => s.completed).length,
        total: subtasks.length,
      });
    });
  }, [task.id]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  useEffect(() => {
    if (isEditingDate && dateInputRef.current) {
      dateInputRef.current.focus();
    }
  }, [isEditingDate]);

  useEffect(() => {
    if (isEditingTime && timeInputRef.current) {
      timeInputRef.current.focus();
    }
  }, [isEditingTime]);

  useEffect(() => {
    if (isEditingTags && tagsInputRef.current) {
      tagsInputRef.current.focus();
    }
  }, [isEditingTags]);

  // Update local state when task prop changes
  useEffect(() => {
    setEditedTitle(task.title);
    setEditedDate(task.due_date || '');
    setEditedStartTime(task.start_time || '');
    setEditedEndTime(task.end_time || '');
    setEditedTags(task.tags || '');
  }, [task]);

  // Handlers for inline editing
  const handleTitleSave = () => {
    if (editedTitle.trim() && editedTitle !== task.title) {
      onUpdateTask(task.id, { title: editedTitle.trim() });
    }
    setIsEditingTitle(false);
  };

  const handleTitleCancel = () => {
    setEditedTitle(task.title);
    setIsEditingTitle(false);
  };

  const handleDateSave = () => {
    if (editedDate !== task.due_date) {
      onUpdateTask(task.id, { due_date: editedDate || null });
    }
    setIsEditingDate(false);
  };

  const handleDateCancel = () => {
    setEditedDate(task.due_date || '');
    setIsEditingDate(false);
  };

  const handleTimeSave = () => {
    const updates: Partial<Task> = {};
    if (editedStartTime !== task.start_time) updates.start_time = editedStartTime || null;
    if (editedEndTime !== task.end_time) updates.end_time = editedEndTime || null;
    if (Object.keys(updates).length > 0) {
      onUpdateTask(task.id, updates);
    }
    setIsEditingTime(false);
  };

  const handleTimeCancel = () => {
    setEditedStartTime(task.start_time || '');
    setEditedEndTime(task.end_time || '');
    setIsEditingTime(false);
  };

  const handleTagsSave = () => {
    if (editedTags !== task.tags) {
      onUpdateTask(task.id, { tags: editedTags || null });
    }
    setIsEditingTags(false);
  };

  const handleTagsCancel = () => {
    setEditedTags(task.tags || '');
    setIsEditingTags(false);
  };

  const handleLogTime = async () => {
    const totalMinutes = logHours * 60 + logMinutes;
    if (totalMinutes <= 0) return;
    setLogSaving(true);
    try {
      const now = new Date();
      const startTime = new Date(now.getTime() - totalMinutes * 60000);
      await window.electronAPI.createTimeSession({
        task_id: task.id,
        session_type: 'manual',
        duration_minutes: totalMinutes,
        planned_duration: totalMinutes,
        start_time: startTime.toISOString(),
        end_time: now.toISOString(),
        interruptions: 0,
        focus_quality: 'medium',
        notes: null,
        completed: true,
      });
      // Update local task with new actual_minutes so the badge refreshes
      const newActual = (task.actual_minutes || 0) + totalMinutes;
      onUpdateTask(task.id, { actual_minutes: newActual });
      setLogSuccess(true);
      setTimeout(() => {
        setIsLoggingTime(false);
        setLogHours(0);
        setLogMinutes(0);
        setLogSuccess(false);
      }, 1200);
    } catch (err) {
      console.error('Failed to log time:', err);
    } finally {
      setLogSaving(false);
    }
  };

  const handlePriorityClick = () => {
    const priorities: Task['priority'][] = ['low', 'medium', 'high'];
    const currentIndex = priorities.indexOf(task.priority);
    const nextPriority = priorities[(currentIndex + 1) % priorities.length];
    onUpdateTask(task.id, { priority: nextPriority });
  };

  const handleMoscowClick = () => {
    const moscowOptions: Task['moscow'][] = ['must', 'should', 'want', 'wont'];
    const currentIndex = moscowOptions.indexOf(task.moscow || 'should');
    const nextMoscow = moscowOptions[(currentIndex + 1) % moscowOptions.length];
    onUpdateTask(task.id, { moscow: nextMoscow });
  };

  const moscowColors = {
    must: 'border-l-red-500 bg-red-500/5',
    should: 'border-l-yellow-500 bg-yellow-500/5',
    want: 'border-l-blue-500 bg-blue-500/5',
    wont: 'border-l-gray-500 bg-gray-500/5',
  };

  const moscowIcons = {
    must: <ChevronUp size={16} className="text-red-400" />,
    should: <ChevronUp size={16} className="text-yellow-400" />,
    want: null,
    wont: null,
  };

  const priorityBadges = {
    low: 'bg-green-500/20 text-green-400',
    medium: 'bg-yellow-500/20 text-yellow-400',
    high: 'bg-red-500/20 text-red-400',
  };

  const getTagColor = (tag: string): string => {
    const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500', 'bg-orange-500'];
    let hash = 0;
    for (let i = 0; i < tag.length; i++) {
      hash = tag.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const tags = task.tags ? task.tags.split(',').filter(t => t.trim()) : [];

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    try {
      return format(new Date(dateString), 'MMM d');
    } catch {
      return dateString;
    }
  };

  const isOverdue = task.due_date && task.status !== 'done' && new Date(task.due_date) < new Date();

  // Native HTML5 drag handlers
  const handleDragStart = (e: React.DragEvent) => {
    setIsDragging(true);
    e.dataTransfer.setData('taskId', task.id.toString());
    e.dataTransfer.setData('moscow', task.moscow || 'should');
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  // Compact table row style (like reference image)
  if (compact) {
    const compactPriorityColors = {
      low: isLight ? 'bg-green-100 text-green-700' : 'bg-green-500/20 text-green-400',
      medium: isLight ? 'bg-yellow-100 text-yellow-700' : 'bg-yellow-500/20 text-yellow-400',
      high: isLight ? 'bg-red-100 text-red-700' : 'bg-red-500/20 text-red-400',
    };

    return (
      <div
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
      <div
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        className={`group flex items-center gap-2 px-3 py-1.5 border-b ${t.border} ${t.rowBg} ${t.rowHover} transition-colors ${
          isDragging ? 'opacity-50' : ''
        }`}
      >
        {/* Status Checkbox */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            const statuses: Task['status'][] = ['todo', 'in-progress', 'done'];
            const currentIndex = statuses.indexOf(task.status);
            const nextStatus = statuses[(currentIndex + 1) % statuses.length];
            onStatusChange(nextStatus);
          }}
          className="flex-shrink-0 hover:scale-110 transition-transform"
        >
          {task.status === 'done' ? (
            <CheckCircle2 size={14} className="text-green-500" />
          ) : task.status === 'in-progress' ? (
            <Clock size={14} className="text-blue-500" />
          ) : (
            <div className={`w-3.5 h-3.5 rounded border-2 ${isLight ? 'border-gray-300' : 'border-slate-600'}`} />
          )}
        </button>

        {/* Task Title - Editable inline */}
        <div className="flex-1 min-w-0">
          {isEditingTitle ? (
            <input
              ref={titleInputRef}
              type="text"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleTitleSave();
                if (e.key === 'Escape') handleTitleCancel();
              }}
              onBlur={handleTitleSave}
              className={`w-full px-1 py-0.5 text-xs rounded border border-blue-500 outline-none ${isLight ? 'bg-white text-gray-900' : 'bg-slate-800 text-white'}`}
            />
          ) : (
            <div 
              className={`text-xs truncate cursor-text ${task.status === 'done' ? `line-through ${t.textMuted}` : t.text}`}
              onClick={() => setIsEditingTitle(true)}
            >
              {task.title}
            </div>
          )}
        </div>

        {/* Tags - Compact pills */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className={`${getTagColor(tag)} text-white px-1.5 py-0.5 rounded text-[10px] truncate max-w-[60px]`}
            >
              {tag}
            </span>
          ))}
          {tags.length > 2 && (
            <span className={`text-[10px] ${t.textMuted}`}>+{tags.length - 2}</span>
          )}
        </div>

        {/* Subtasks count */}
        {subtaskCount.total > 0 && (
          <div className={`text-[10px] ${t.textMuted} flex-shrink-0`}>
            {subtaskCount.completed}/{subtaskCount.total}
          </div>
        )}

        {/* Tracked time */}
        {(task.actual_minutes ?? 0) > 0 && (
          <div className={`text-[10px] flex items-center gap-0.5 flex-shrink-0 ${isLight ? 'text-amber-600' : 'text-amber-400'}`} title={`${task.actual_minutes}min tracked`}>
            <Hourglass size={10} />
            <span>{(task.actual_minutes ?? 0) >= 60 ? `${Math.floor((task.actual_minutes ?? 0) / 60)}h${(task.actual_minutes ?? 0) % 60 > 0 ? `${(task.actual_minutes ?? 0) % 60}m` : ''}` : `${task.actual_minutes}m`}</span>
          </div>
        )}

        {/* Date */}
        <div className="w-16 flex-shrink-0">
          <span className={`text-[11px] ${isOverdue ? 'text-red-500' : t.textMuted}`}>
            {task.due_date ? formatDate(task.due_date) : ''}
          </span>
        </div>

        {/* Time */}
        <div className="w-20 flex-shrink-0 hidden sm:block">
          <span className={`text-[10px] ${t.textMuted}`}>
            {task.start_time ? `${task.start_time}${task.end_time ? `-${task.end_time}` : ''}` : ''}
          </span>
        </div>

        {/* Priority Badge */}
        <button
          onClick={handlePriorityClick}
          className={`px-2 py-0.5 rounded text-[10px] font-medium flex-shrink-0 transition-all ${compactPriorityColors[task.priority]}`}
        >
          {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
        </button>

        {/* Actions - Show on hover */}
        <div className={`flex items-center gap-0.5 flex-shrink-0 transition-opacity ${showActions ? 'opacity-100' : 'opacity-0'}`}>
          {/* Focus Button */}
          {onStartFocus && task.status !== 'done' && (
            <StartFocusButton
              taskId={task.id}
              taskTitle={task.title}
              onStartFocus={onStartFocus}
              size="sm"
            />
          )}
          {/* Log Time Button */}
          {task.status !== 'done' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsLoggingTime(!isLoggingTime);
              }}
              className={`p-1 rounded ${t.textMuted} hover:text-amber-500`}
              title="Log time manually"
            >
              <Hourglass size={12} />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className={`p-1 rounded ${t.textMuted} hover:text-blue-500`}
          >
            <Edit size={12} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className={`p-1 rounded ${t.textMuted} hover:text-red-500`}
          >
            <Trash2 size={12} />
          </button>
        </div>

        {/* More menu when actions hidden */}
        {!showActions && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className={`p-1 rounded ${t.textMuted} hover:text-blue-500 flex-shrink-0`}
          >
            <MoreHorizontal size={14} />
          </button>
        )}
      </div>

      {/* Manual Time Logging Panel (compact) */}
      {isLoggingTime && (
        <div className={`col-span-full flex items-center gap-2 px-3 py-1.5 border-t ${t.border} ${isLight ? 'bg-amber-50' : 'bg-amber-500/10'}`} onClick={e => e.stopPropagation()}>
          <Hourglass size={12} className="text-amber-500 flex-shrink-0" />
          <span className={`text-[10px] ${t.textMuted} flex-shrink-0`}>Log:</span>
          <input
            type="number"
            min={0}
            max={23}
            value={logHours}
            onChange={e => setLogHours(Math.max(0, parseInt(e.target.value) || 0))}
            className={`w-10 px-1 py-0.5 text-[11px] rounded border ${isLight ? 'border-gray-300 bg-white text-gray-900' : 'border-slate-600 bg-slate-800 text-white'} text-center`}
            onClick={e => e.stopPropagation()}
          />
          <span className={`text-[10px] ${t.textMuted}`}>h</span>
          <input
            type="number"
            min={0}
            max={59}
            value={logMinutes}
            onChange={e => setLogMinutes(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
            className={`w-10 px-1 py-0.5 text-[11px] rounded border ${isLight ? 'border-gray-300 bg-white text-gray-900' : 'border-slate-600 bg-slate-800 text-white'} text-center`}
            onClick={e => e.stopPropagation()}
          />
          <span className={`text-[10px] ${t.textMuted}`}>m</span>
          {logSuccess ? (
            <span className="text-green-500 text-[10px] flex items-center gap-1"><Check size={10} /> Saved!</span>
          ) : (
            <>
              <button
                onClick={handleLogTime}
                disabled={logSaving || (logHours === 0 && logMinutes === 0)}
                className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                  logSaving || (logHours === 0 && logMinutes === 0)
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-amber-500 text-white hover:bg-amber-600'
                }`}
              >
                {logSaving ? '...' : 'Save'}
              </button>
              <button
                onClick={() => { setIsLoggingTime(false); setLogHours(0); setLogMinutes(0); }}
                className={`p-0.5 rounded ${t.textMuted} hover:text-red-500`}
              >
                <X size={10} />
              </button>
            </>
          )}
        </div>
      )}
    </div>
    );
  }

  // Original full card layout
  return (
    <div
      className={`border-l-4 ${moscowColors[task.moscow || 'should']} hover:bg-[#2a2a3e]/50 transition-all duration-200 ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={`group flex items-start gap-0 py-3 px-2`}
    >
      {/* Line number */}
      {taskNumber && (
        <div className="w-8 text-xs text-gray-600 font-mono pt-0.5 flex-shrink-0">
          {taskNumber}
        </div>
      )}

      {/* Status checkbox */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          const statuses: Task['status'][] = ['todo', 'in-progress', 'done'];
          const currentIndex = statuses.indexOf(task.status);
          const nextStatus = statuses[(currentIndex + 1) % statuses.length];
          onStatusChange(nextStatus);
        }}
        className="mr-3 mt-0.5 hover:scale-110 transition-transform flex-shrink-0"
      >
        {task.status === 'done' ? (
          <CheckCircle2 size={20} className="text-green-400" />
        ) : task.status === 'in-progress' ? (
          <Clock size={20} className="text-blue-400" />
        ) : (
          <Circle size={20} className="text-gray-500" />
        )}
      </button>

      {/* Moscow priority indicator - Clickable */}
      <button
        onClick={handleMoscowClick}
        className="mr-2 flex-shrink-0 mt-0.5 hover:scale-110 transition-transform"
        title="Click to cycle priority"
      >
        {moscowIcons[task.moscow || 'should'] || <ChevronUp size={16} className="text-gray-400" />}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Editable Title */}
        {isEditingTitle ? (
          <div className="flex items-center gap-1 mb-1">
            <input
              ref={titleInputRef}
              type="text"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleTitleSave();
                if (e.key === 'Escape') handleTitleCancel();
              }}
              className="flex-1 bg-[#2a2a3e] text-white px-2 py-0.5 rounded text-sm border border-blue-500 focus:outline-none"
            />
            <button onClick={handleTitleSave} className="p-1 text-green-400 hover:bg-green-500/20 rounded">
              <Check size={14} />
            </button>
            <button onClick={handleTitleCancel} className="p-1 text-red-400 hover:bg-red-500/20 rounded">
              <X size={14} />
            </button>
          </div>
        ) : (
          <div 
            className={`font-medium cursor-text hover:bg-[#2a2a3e]/30 rounded px-1 -ml-1 ${task.status === 'done' ? 'text-gray-500 line-through' : 'text-white'}`}
            onClick={() => setIsEditingTitle(true)}
          >
            {task.title}
          </div>
        )}
        
        {/* Meta info row */}
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          {/* Priority badge - Clickable */}
          <button
            onClick={handlePriorityClick}
            className={`px-1.5 py-0.5 rounded text-xs font-medium transition-all hover:ring-1 hover:ring-white/30 ${priorityBadges[task.priority]}`}
            title="Click to change priority"
          >
            {task.priority}
          </button>

          {/* Editable Due Date */}
          {isEditingDate ? (
            <div className="flex items-center gap-1">
              <input
                ref={dateInputRef}
                type="date"
                value={editedDate}
                onChange={(e) => setEditedDate(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleDateSave();
                  if (e.key === 'Escape') handleDateCancel();
                }}
                className="bg-[#2a2a3e] text-white px-1.5 py-0.5 rounded text-xs border border-blue-500 focus:outline-none"
              />
              <button onClick={handleDateSave} className="p-0.5 text-green-400 hover:bg-green-500/20 rounded">
                <Check size={12} />
              </button>
              <button onClick={handleDateCancel} className="p-0.5 text-red-400 hover:bg-red-500/20 rounded">
                <X size={12} />
              </button>
            </div>
          ) : (
            <div 
              className={`flex items-center gap-1 text-xs cursor-pointer hover:bg-[#2a2a3e]/50 rounded px-1 py-0.5 ${isOverdue ? 'text-red-400' : 'text-gray-400'}`}
              onClick={() => setIsEditingDate(true)}
              title="Click to edit date"
            >
              {isOverdue && <AlertCircle size={12} />}
              <Calendar size={12} />
              <span>{task.due_date ? formatDate(task.due_date) : 'No date'}</span>
            </div>
          )}

          {/* Editable Time */}
          {isEditingTime ? (
            <div className="flex items-center gap-1">
              <input
                ref={timeInputRef}
                type="time"
                value={editedStartTime}
                onChange={(e) => setEditedStartTime(e.target.value)}
                className="bg-[#2a2a3e] text-white px-1.5 py-0.5 rounded text-xs border border-blue-500 focus:outline-none w-20"
              />
              <span className="text-gray-400">-</span>
              <input
                type="time"
                value={editedEndTime}
                onChange={(e) => setEditedEndTime(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleTimeSave();
                  if (e.key === 'Escape') handleTimeCancel();
                }}
                className="bg-[#2a2a3e] text-white px-1.5 py-0.5 rounded text-xs border border-blue-500 focus:outline-none w-20"
              />
              <button onClick={handleTimeSave} className="p-0.5 text-green-400 hover:bg-green-500/20 rounded">
                <Check size={12} />
              </button>
              <button onClick={handleTimeCancel} className="p-0.5 text-red-400 hover:bg-red-500/20 rounded">
                <X size={12} />
              </button>
            </div>
          ) : (
            task.start_time && (
              <div 
                className="flex items-center gap-1 text-xs text-gray-400 cursor-pointer hover:bg-[#2a2a3e]/50 rounded px-1 py-0.5"
                onClick={() => setIsEditingTime(true)}
                title="Click to edit time"
              >
                <Clock size={12} />
                <span>{task.start_time}{task.end_time && ` - ${task.end_time}`}</span>
              </div>
            )
          )}

          {/* Subtasks */}
          {subtaskCount.total > 0 && (
            <div className="flex items-center gap-1 text-xs text-gray-400 bg-[#2a2a3e] px-1.5 py-0.5 rounded">
              {subtaskCount.completed}/{subtaskCount.total}
            </div>
          )}

          {/* Tracked time */}
          {(task.actual_minutes ?? 0) > 0 && (
            <div className="flex items-center gap-1 text-xs text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded" title={`${task.actual_minutes}min tracked`}>
              <Hourglass size={12} />
              <span>{(task.actual_minutes ?? 0) >= 60 ? `${Math.floor((task.actual_minutes ?? 0) / 60)}h${(task.actual_minutes ?? 0) % 60 > 0 ? ` ${(task.actual_minutes ?? 0) % 60}m` : ''}` : `${task.actual_minutes}m`}</span>
            </div>
          )}

          {/* Editable Tags */}
          {isEditingTags ? (
            <div className="flex items-center gap-1">
              <TagIcon size={12} className="text-gray-400" />
              <input
                ref={tagsInputRef}
                type="text"
                value={editedTags}
                onChange={(e) => setEditedTags(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleTagsSave();
                  if (e.key === 'Escape') handleTagsCancel();
                }}
                placeholder="tag1, tag2"
                className="bg-[#2a2a3e] text-white px-1.5 py-0.5 rounded text-xs border border-blue-500 focus:outline-none w-32"
              />
              <button onClick={handleTagsSave} className="p-0.5 text-green-400 hover:bg-green-500/20 rounded">
                <Check size={12} />
              </button>
              <button onClick={handleTagsCancel} className="p-0.5 text-red-400 hover:bg-red-500/20 rounded">
                <X size={12} />
              </button>
            </div>
          ) : (
            <>
              {tags.map((tag) => (
                <span
                  key={tag}
                  className={`${getTagColor(tag)} text-white px-2 py-0.5 rounded text-xs cursor-pointer hover:opacity-80`}
                  onClick={() => setIsEditingTags(true)}
                  title="Click to edit tags"
                >
                  {tag}
                </span>
              ))}
              {tags.length === 0 && (
                <button
                  onClick={() => setIsEditingTags(true)}
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-400 px-1.5 py-0.5 rounded hover:bg-[#2a2a3e]/50"
                  title="Add tags"
                >
                  <TagIcon size={12} />
                  <span>Add tags</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-1 ml-2 opacity-0 group-hover:opacity-100 hover:opacity-100">
        {/* Focus button - only show if not done and onStartFocus is provided */}
        {onStartFocus && task.status !== 'done' && (
          <StartFocusButton
            taskId={task.id}
            taskTitle={task.title}
            onStartFocus={onStartFocus}
            size="sm"
          />
        )}
        {/* Log time manually */}
        {task.status !== 'done' && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsLoggingTime(!isLoggingTime);
            }}
            className="p-1.5 text-gray-400 hover:text-amber-400 rounded transition-all"
            title="Log time manually"
          >
            <Hourglass size={14} />
          </button>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="p-1.5 text-gray-400 hover:text-blue-400 rounded transition-all"
          title="Edit"
        >
          <Edit size={14} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-1.5 text-gray-400 hover:text-red-400 rounded transition-all"
          title="Delete"
        >
          <Trash2 size={14} />
        </button>
      </div>
      </div>

      {/* Manual Time Logging Panel (full card) */}
      {isLoggingTime && (
        <div className={`mt-2 mx-2 flex items-center gap-2 px-2 py-2 rounded-lg ${isLight ? 'bg-amber-50 border border-amber-200' : 'bg-amber-500/10 border border-amber-500/20'}`} onClick={e => e.stopPropagation()}>
          <Hourglass size={14} className="text-amber-500 flex-shrink-0" />
          <span className={`text-xs ${isLight ? 'text-gray-600' : 'text-slate-400'}`}>Log time:</span>
          <input
            type="number"
            min={0}
            max={23}
            value={logHours}
            onChange={e => setLogHours(Math.max(0, parseInt(e.target.value) || 0))}
            className={`w-12 px-1.5 py-0.5 text-xs rounded border ${isLight ? 'border-gray-300 bg-white text-gray-900' : 'border-slate-600 bg-slate-800 text-white'} text-center`}
          />
          <span className={`text-xs ${isLight ? 'text-gray-500' : 'text-slate-400'}`}>h</span>
          <input
            type="number"
            min={0}
            max={59}
            value={logMinutes}
            onChange={e => setLogMinutes(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
            className={`w-12 px-1.5 py-0.5 text-xs rounded border ${isLight ? 'border-gray-300 bg-white text-gray-900' : 'border-slate-600 bg-slate-800 text-white'} text-center`}
          />
          <span className={`text-xs ${isLight ? 'text-gray-500' : 'text-slate-400'}`}>m</span>
          {logSuccess ? (
            <span className="text-green-500 text-xs flex items-center gap-1"><Check size={12} /> Saved!</span>
          ) : (
            <>
              <button
                onClick={handleLogTime}
                disabled={logSaving || (logHours === 0 && logMinutes === 0)}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  logSaving || (logHours === 0 && logMinutes === 0)
                    ? isLight ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                    : 'bg-amber-500 text-white hover:bg-amber-600'
                }`}
              >
                {logSaving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => { setIsLoggingTime(false); setLogHours(0); setLogMinutes(0); }}
                className={`p-1 rounded ${isLight ? 'text-gray-400 hover:text-red-500' : 'text-slate-400 hover:text-red-400'}`}
              >
                <X size={14} />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default TaskCard;
