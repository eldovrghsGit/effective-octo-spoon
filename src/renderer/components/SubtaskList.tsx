import React, { useState } from 'react';
import { Plus, X, Check, Circle } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export interface Subtask {
  id?: number;
  task_id?: number;
  title: string;
  completed: boolean;
  created_at?: string;
}

interface SubtaskListProps {
  taskId?: number;
  subtasks: Subtask[];
  onAdd: (title: string) => void;
  onToggle: (subtask: Subtask) => void;
  onDelete: (subtask: Subtask) => void;
}

const SubtaskList: React.FC<SubtaskListProps> = ({ 
  subtasks, 
  onAdd, 
  onToggle, 
  onDelete 
}) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // Theme classes
  const t = {
    text: isLight ? 'text-gray-900' : 'text-white',
    textMuted: isLight ? 'text-gray-500' : 'text-slate-400',
    textCompleted: isLight ? 'text-gray-400' : 'text-slate-500',
    itemBg: isLight ? 'hover:bg-gray-50' : 'hover:bg-slate-700/50',
    progressBg: isLight ? 'bg-gray-200' : 'bg-slate-700',
  };

  const handleAdd = () => {
    if (newSubtaskTitle.trim()) {
      onAdd(newSubtaskTitle.trim());
      setNewSubtaskTitle('');
      setIsAdding(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAdd();
    } else if (e.key === 'Escape') {
      setIsAdding(false);
      setNewSubtaskTitle('');
    }
  };

  const completedCount = subtasks.filter(s => s.completed).length;
  const totalCount = subtasks.length;

  return (
    <div className="space-y-2">
      {/* Subtask list */}
      {subtasks.length > 0 && (
        <div className="space-y-1">
          {subtasks.map((subtask) => (
            <div
              key={subtask.id || subtask.title}
              className={`flex items-center gap-2 group rounded-lg px-2 py-1.5 ${t.itemBg} transition-colors`}
            >
              <button
                onClick={() => onToggle(subtask)}
                className={`flex-shrink-0 ${t.textMuted} hover:text-blue-500 transition-colors`}
              >
                {subtask.completed ? (
                  <Check size={16} className="text-blue-500" />
                ) : (
                  <Circle size={16} />
                )}
              </button>
              <span
                className={`flex-1 text-sm ${
                  subtask.completed
                    ? `${t.textCompleted} line-through`
                    : t.text
                }`}
              >
                {subtask.title}
              </span>
              <button
                onClick={() => onDelete(subtask)}
                className={`flex-shrink-0 opacity-0 group-hover:opacity-100 ${t.textMuted} hover:text-red-500 transition-all`}
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add new subtask input */}
      {isAdding ? (
        <div className="flex items-center gap-2 px-2 py-1.5">
          <Circle size={16} className={t.textMuted} />
          <input
            type="text"
            value={newSubtaskTitle}
            onChange={(e) => setNewSubtaskTitle(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Add a subtask..."
            className={`flex-1 bg-transparent border-none outline-none text-sm ${t.text} placeholder-gray-400`}
            autoFocus
          />
          <div className="flex gap-1">
            <button
              onClick={handleAdd}
              className={`p-1 ${t.textMuted} hover:text-blue-500 transition-colors`}
              title="Add"
            >
              <Check size={14} />
            </button>
            <button
              onClick={() => {
                setIsAdding(false);
                setNewSubtaskTitle('');
              }}
              className={`p-1 ${t.textMuted} hover:text-red-500 transition-colors`}
              title="Cancel"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsAdding(true)}
          className={`flex items-center gap-1.5 text-xs ${isLight ? 'text-blue-600 hover:text-blue-700' : 'text-blue-400 hover:text-blue-300'} transition-colors px-2 py-1`}
        >
          <Plus size={14} />
          Add subtask
        </button>
      )}
    </div>
  );
};

export default SubtaskList;
