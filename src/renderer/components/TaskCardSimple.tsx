import React from 'react';
import { Calendar, Clock, Edit, Trash2, CheckCircle2, Circle, AlertCircle, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { useDraggable } from '@dnd-kit/core';
import { Task } from '../App';

interface TaskCardSimpleProps {
  task: Task;
  lineNumber?: number;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (status: Task['status']) => void;
}

const TaskCardSimple: React.FC<TaskCardSimpleProps> = ({ 
  task, 
  lineNumber,
  onEdit, 
  onDelete, 
  onStatusChange 
}) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    data: { task },
  });

  const moscowColors = {
    must: 'border-l-red-500 bg-red-500/5',
    should: 'border-l-yellow-500 bg-yellow-500/5',
    want: 'border-l-blue-500 bg-blue-500/5',
    wont: 'border-l-gray-500 bg-gray-500/5',
  };

  const moscowIcons = {
    must: <TrendingUp size={14} className="text-red-400" />,
    should: <TrendingUp size={14} className="text-yellow-400" />,
    want: null,
    wont: null,
  };

  const statusIcons = {
    todo: <Circle size={18} className="text-gray-500 hover:text-gray-300" />,
    'in-progress': <Clock size={18} className="text-blue-400 animate-pulse" />,
    done: <CheckCircle2 size={18} className="text-green-400" />,
  };

  const formatTime = (start: string | null, end: string | null) => {
    if (!start) return null;
    const formatT = (t: string) => {
      const [h, m] = t.split(':');
      return `${h}:${m}`;
    };
    return end ? `${formatT(start)} - ${formatT(end)}` : formatT(start);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    try {
      return format(new Date(dateString), 'MMM d');
    } catch {
      return dateString;
    }
  };

  const tags = task.tags ? task.tags.split(',').filter(t => t.trim()) : [];
  const isOverdue = task.due_date && task.status !== 'done' && new Date(task.due_date) < new Date();

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`group flex items-center gap-3 py-3 px-4 border-l-4 rounded-lg ${moscowColors[task.moscow || 'should']} 
        hover:bg-[#2a2a3e]/50 cursor-grab active:cursor-grabbing transition-all duration-150 ${
        isDragging ? 'opacity-50 scale-[1.02]' : ''
      }`}
    >
      {/* Line Number */}
      {lineNumber !== undefined && (
        <span className="text-xs text-gray-600 w-6 text-right font-mono">{lineNumber}</span>
      )}

      {/* Moscow Icon */}
      <div className="w-4 flex-shrink-0">
        {moscowIcons[task.moscow || 'should']}
      </div>

      {/* Status Toggle */}
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
        {statusIcons[task.status]}
      </button>

      {/* Task Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`font-medium ${task.status === 'done' ? 'text-gray-500 line-through' : 'text-white'}`}>
            {task.title}
          </span>
          
          {/* Toggle indicator for time tasks */}
          {task.start_time && task.end_time && (
            <div className="w-8 h-4 bg-blue-500 rounded-full relative">
              <div className="absolute right-0.5 top-0.5 w-3 h-3 bg-white rounded-full" />
            </div>
          )}
        </div>
        
        {/* Meta info - inline */}
        <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
          {/* Priority Badge */}
          <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
            task.priority === 'high' ? 'bg-red-500/20 text-red-400' :
            task.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
            'bg-green-500/20 text-green-400'
          }`}>
            {task.priority}
          </span>

          {/* Date */}
          {task.due_date && (
            <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-400' : ''}`}>
              {isOverdue && <AlertCircle size={10} />}
              <Calendar size={10} />
              {formatDate(task.due_date)}
            </span>
          )}

          {/* Time */}
          {task.start_time && (
            <span className="flex items-center gap-1">
              <Clock size={10} />
              {formatTime(task.start_time, task.end_time)}
            </span>
          )}
        </div>
      </div>

      {/* Right side - Tags and Actions */}
      <div className="flex items-center gap-2">
        {/* Tags */}
        {tags.slice(0, 1).map((tag) => (
          <span
            key={tag}
            className="px-2 py-0.5 rounded text-xs bg-blue-500/20 text-blue-400 font-medium"
          >
            {tag}
          </span>
        ))}
        
        {/* NW tag style like LunaTask */}
        {task.moscow !== 'must' && (
          <span className="px-1.5 py-0.5 rounded text-[10px] bg-gray-600 text-gray-300 font-medium uppercase">
            NW
          </span>
        )}

        {/* Actions - show on hover */}
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="p-1 text-gray-400 hover:text-blue-400 rounded transition-colors"
          >
            <Edit size={14} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1 text-gray-400 hover:text-red-400 rounded transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskCardSimple;
