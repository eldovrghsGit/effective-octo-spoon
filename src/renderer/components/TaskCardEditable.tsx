import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Clock, Edit, Trash2, CheckCircle2, Circle, AlertCircle, ChevronUp, X, Check } from 'lucide-react';
import { format } from 'date-fns';
import { useDraggable } from '@dnd-kit/core';
import { Task } from '../App';

interface TaskCardEditableProps {
  task: Task;
  taskNumber?: number;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (status: Task['status']) => void;
  onUpdateTask: (id: number, updates: Partial<Task>) => void;
}

// Inline editable text component
const InlineEdit: React.FC<{
  value: string;
  onSave: (value: string) => void;
  className?: string;
  inputClassName?: string;
  placeholder?: string;
}> = ({ value, onSave, className = '', inputClassName = '', placeholder = '' }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  const handleSave = () => {
    if (editValue !== value) {
      onSave(editValue);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setEditValue(value);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className={`bg-[#2a2a3e] border border-blue-500 rounded px-1.5 py-0.5 outline-none ${inputClassName}`}
        placeholder={placeholder}
      />
    );
  }

  return (
    <span
      onClick={() => setIsEditing(true)}
      className={`cursor-pointer hover:bg-[#2a2a3e]/50 rounded px-1 -mx-1 ${className}`}
      title="Click to edit"
    >
      {value || <span className="text-gray-500">{placeholder}</span>}
    </span>
  );
};

// Priority dropdown component
const PriorityDropdown: React.FC<{
  value: Task['priority'];
  onChange: (value: Task['priority']) => void;
}> = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const priorityStyles = {
    low: 'bg-green-500/20 text-green-400 hover:bg-green-500/30',
    medium: 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30',
    high: 'bg-red-500/20 text-red-400 hover:bg-red-500/30',
  };

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`px-1.5 py-0.5 rounded text-xs font-medium cursor-pointer transition-colors ${priorityStyles[value]}`}
      >
        {value}
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-[#1e1e2e] border border-[#3a3a4e] rounded-md shadow-lg z-50 min-w-[80px]">
          {(['low', 'medium', 'high'] as const).map((priority) => (
            <button
              key={priority}
              onClick={() => {
                onChange(priority);
                setIsOpen(false);
              }}
              className={`w-full px-2 py-1.5 text-xs text-left hover:bg-[#2a2a3e] first:rounded-t-md last:rounded-b-md ${
                value === priority ? 'bg-[#2a2a3e]' : ''
              } ${priorityStyles[priority].replace('hover:', '')}`}
            >
              {priority}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// Moscow dropdown component
const MoscowDropdown: React.FC<{
  value: Task['moscow'];
  onChange: (value: Task['moscow']) => void;
}> = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const moscowStyles = {
    must: 'text-red-400 hover:bg-red-500/20',
    should: 'text-yellow-400 hover:bg-yellow-500/20',
    want: 'text-blue-400 hover:bg-blue-500/20',
    wont: 'text-gray-400 hover:bg-gray-500/20',
  };

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-0.5 rounded cursor-pointer transition-colors ${moscowStyles[value]}`}
        title="Change priority category"
      >
        <ChevronUp size={16} />
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-[#1e1e2e] border border-[#3a3a4e] rounded-md shadow-lg z-50 min-w-[80px]">
          {(['must', 'should', 'want', 'wont'] as const).map((moscow) => (
            <button
              key={moscow}
              onClick={() => {
                onChange(moscow);
                setIsOpen(false);
              }}
              className={`w-full px-2 py-1.5 text-xs text-left hover:bg-[#2a2a3e] first:rounded-t-md last:rounded-b-md flex items-center gap-2 ${
                value === moscow ? 'bg-[#2a2a3e]' : ''
              } ${moscowStyles[moscow]}`}
            >
              <ChevronUp size={12} />
              {moscow}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// Date picker component
const DatePicker: React.FC<{
  value: string | null;
  onChange: (value: string | null) => void;
  isOverdue?: boolean;
}> = ({ value, onChange, isOverdue }) => {
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    try {
      return format(new Date(dateString), 'MMM d');
    } catch {
      return dateString;
    }
  };

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        <input
          ref={inputRef}
          type="date"
          value={value || ''}
          onChange={(e) => {
            onChange(e.target.value || null);
            setIsEditing(false);
          }}
          onBlur={() => setIsEditing(false)}
          className="bg-[#2a2a3e] border border-blue-500 rounded px-1 py-0.5 text-xs outline-none text-white"
        />
        <button
          onClick={() => {
            onChange(null);
            setIsEditing(false);
          }}
          className="p-0.5 text-gray-400 hover:text-red-400"
        >
          <X size={12} />
        </button>
      </div>
    );
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      className={`flex items-center gap-1 text-xs cursor-pointer hover:bg-[#2a2a3e]/50 rounded px-1 -mx-1 ${
        isOverdue ? 'text-red-400' : 'text-gray-400'
      }`}
      title="Click to change date"
    >
      {isOverdue && <AlertCircle size={12} />}
      <Calendar size={12} />
      <span>{formatDate(value) || 'No date'}</span>
    </div>
  );
};

// Time picker component
const TimePicker: React.FC<{
  startTime: string | null;
  endTime: string | null;
  onChangeStart: (value: string | null) => void;
  onChangeEnd: (value: string | null) => void;
}> = ({ startTime, endTime, onChangeStart, onChangeEnd }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempStart, setTempStart] = useState(startTime || '');
  const [tempEnd, setTempEnd] = useState(endTime || '');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTempStart(startTime || '');
    setTempEnd(endTime || '');
  }, [startTime, endTime]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        handleSave();
      }
    };
    if (isEditing) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isEditing, tempStart, tempEnd]);

  const handleSave = () => {
    onChangeStart(tempStart || null);
    onChangeEnd(tempEnd || null);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div ref={containerRef} className="flex items-center gap-1">
        <Clock size={12} className="text-gray-400" />
        <input
          type="time"
          value={tempStart}
          onChange={(e) => setTempStart(e.target.value)}
          className="bg-[#2a2a3e] border border-blue-500 rounded px-1 py-0.5 text-xs outline-none text-white w-20"
          placeholder="Start"
        />
        <span className="text-gray-500">-</span>
        <input
          type="time"
          value={tempEnd}
          onChange={(e) => setTempEnd(e.target.value)}
          className="bg-[#2a2a3e] border border-blue-500 rounded px-1 py-0.5 text-xs outline-none text-white w-20"
          placeholder="End"
        />
        <button
          onClick={handleSave}
          className="p-0.5 text-green-400 hover:text-green-300"
        >
          <Check size={14} />
        </button>
        <button
          onClick={() => {
            onChangeStart(null);
            onChangeEnd(null);
            setIsEditing(false);
          }}
          className="p-0.5 text-gray-400 hover:text-red-400"
        >
          <X size={12} />
        </button>
      </div>
    );
  }

  if (!startTime && !endTime) {
    return (
      <div
        onClick={() => setIsEditing(true)}
        className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer hover:bg-[#2a2a3e]/50 rounded px-1 -mx-1"
        title="Click to set time"
      >
        <Clock size={12} />
        <span>Set time</span>
      </div>
    );
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      className="flex items-center gap-1 text-xs text-gray-400 cursor-pointer hover:bg-[#2a2a3e]/50 rounded px-1 -mx-1"
      title="Click to change time"
    >
      <Clock size={12} />
      <span>{startTime}{endTime && ` - ${endTime}`}</span>
    </div>
  );
};

// Tag editor component
const TagEditor: React.FC<{
  tags: string | null;
  onChange: (tags: string | null) => void;
}> = ({ tags, onChange }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const tagList = tags ? tags.split(',').filter(t => t.trim()) : [];

  const getTagColor = (tag: string): string => {
    const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500', 'bg-orange-500'];
    let hash = 0;
    for (let i = 0; i < tag.length; i++) {
      hash = tag.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const handleAddTag = () => {
    if (inputValue.trim()) {
      const newTags = [...tagList, inputValue.trim()].join(',');
      onChange(newTags);
      setInputValue('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const newTags = tagList.filter(t => t !== tagToRemove).join(',');
    onChange(newTags || null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setInputValue('');
    }
  };

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {tagList.map((tag) => (
        <span
          key={tag}
          className={`${getTagColor(tag)} text-white px-2 py-0.5 rounded text-xs flex items-center gap-1 group`}
        >
          {tag}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleRemoveTag(tag);
            }}
            className="opacity-0 group-hover:opacity-100 hover:text-red-200 transition-opacity"
          >
            <X size={10} />
          </button>
        </span>
      ))}
      {isEditing ? (
        <div className="flex items-center gap-1">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              handleAddTag();
              setIsEditing(false);
            }}
            className="bg-[#2a2a3e] border border-blue-500 rounded px-1.5 py-0.5 text-xs outline-none text-white w-24"
            placeholder="Add tag..."
          />
        </div>
      ) : (
        <button
          onClick={() => setIsEditing(true)}
          className="text-xs text-gray-500 hover:text-blue-400 px-1 py-0.5 rounded hover:bg-[#2a2a3e]/50"
        >
          + tag
        </button>
      )}
    </div>
  );
};

const TaskCardEditable: React.FC<TaskCardEditableProps> = ({ 
  task, 
  taskNumber, 
  onEdit, 
  onDelete, 
  onStatusChange,
  onUpdateTask 
}) => {
  const [subtaskCount, setSubtaskCount] = useState({ completed: 0, total: 0 });
  
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    data: { task },
  });

  useEffect(() => {
    window.electronAPI.getSubtasks(task.id).then(subtasks => {
      setSubtaskCount({
        completed: subtasks.filter((s: any) => s.completed).length,
        total: subtasks.length,
      });
    });
  }, [task.id]);

  const moscowColors = {
    must: 'border-l-red-500 bg-red-500/5',
    should: 'border-l-yellow-500 bg-yellow-500/5',
    want: 'border-l-blue-500 bg-blue-500/5',
    wont: 'border-l-gray-500 bg-gray-500/5',
  };

  const isOverdue = task.due_date && task.status !== 'done' && new Date(task.due_date) < new Date();

  return (
    <div
      ref={setNodeRef}
      className={`group flex items-start gap-0 border-l-4 ${moscowColors[task.moscow || 'should']} hover:bg-[#2a2a3e]/50 transition-all duration-200 py-3 px-2 ${
        isDragging ? 'opacity-50' : ''
      }`}
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
        {...attributes}
        {...listeners}
      >
        {task.status === 'done' ? (
          <CheckCircle2 size={20} className="text-green-400" />
        ) : task.status === 'in-progress' ? (
          <Clock size={20} className="text-blue-400" />
        ) : (
          <Circle size={20} className="text-gray-500" />
        )}
      </button>

      {/* Moscow priority indicator */}
      <MoscowDropdown 
        value={task.moscow || 'should'} 
        onChange={(moscow) => onUpdateTask(task.id, { moscow })}
      />

      {/* Content */}
      <div className="flex-1 min-w-0 ml-2">
        {/* Title - Inline Editable */}
        <div className={`font-medium ${task.status === 'done' ? 'text-gray-500 line-through' : 'text-white'}`}>
          <InlineEdit
            value={task.title}
            onSave={(title) => onUpdateTask(task.id, { title })}
            inputClassName="text-white text-sm w-full"
          />
        </div>
        
        {/* Meta info row */}
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          {/* Priority dropdown */}
          <PriorityDropdown
            value={task.priority}
            onChange={(priority) => onUpdateTask(task.id, { priority })}
          />

          {/* Due Date - Editable */}
          <DatePicker
            value={task.due_date}
            onChange={(due_date) => onUpdateTask(task.id, { due_date })}
            isOverdue={!!isOverdue}
          />

          {/* Time - Editable */}
          <TimePicker
            startTime={task.start_time}
            endTime={task.end_time}
            onChangeStart={(start_time) => onUpdateTask(task.id, { start_time })}
            onChangeEnd={(end_time) => onUpdateTask(task.id, { end_time })}
          />

          {/* Subtasks - Read only, click to edit full task */}
          {subtaskCount.total > 0 && (
            <div 
              onClick={onEdit}
              className="flex items-center gap-1 text-xs text-gray-400 bg-[#2a2a3e] px-1.5 py-0.5 rounded cursor-pointer hover:bg-[#3a3a4e]"
              title="Click to manage subtasks"
            >
              {subtaskCount.completed}/{subtaskCount.total}
            </div>
          )}

          {/* Tags - Editable */}
          <TagEditor
            tags={task.tags}
            onChange={(tags) => onUpdateTask(task.id, { tags })}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="p-1.5 text-gray-400 hover:text-blue-400 rounded transition-all"
          title="Edit full details"
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
  );
};

export default TaskCardEditable;
