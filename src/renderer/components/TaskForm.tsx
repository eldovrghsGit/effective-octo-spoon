import React, { useState, useEffect } from 'react';
import { 
  X, 
  Type, 
  AlignLeft, 
  Flag, 
  Calendar, 
  Clock, 
  CheckSquare, 
  Tag,
  Sparkles,
  ChevronDown,
  Circle,
  CircleDot,
  CheckCircle2,
  AlertTriangle,
  Minus,
  ArrowUp,
  Target
} from 'lucide-react';
import { Task } from '../App';
import RichTextEditor from './RichTextEditor';
import SubtaskList, { Subtask } from './SubtaskList';
import TagInput from './TagInput';
import TimePicker from './TimePicker';
import { useTheme } from '../contexts/ThemeContext';

interface TaskFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (task: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => void;
  editingTask?: Task | null;
  initialDate?: Date | null;
  initialTime?: string | null;
}

const TaskForm: React.FC<TaskFormProps> = ({ isOpen, onClose, onSubmit, editingTask, initialDate, initialTime }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<Task['status']>('todo');
  const [priority, setPriority] = useState<Task['priority']>('medium');
  const [moscow, setMoscow] = useState<Task['moscow']>('should');
  const [dueDate, setDueDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [tags, setTags] = useState<string[]>([]);

  // Status options for visual indicators
  const statusOptions = [
    { value: 'todo', label: 'To Do', icon: Circle, color: 'text-slate-400', bg: 'bg-slate-500/20' },
    { value: 'in-progress', label: 'In Progress', icon: CircleDot, color: 'text-blue-400', bg: 'bg-blue-500/20' },
    { value: 'done', label: 'Done', icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
  ];

  const priorityOptions = [
    { value: 'low', label: 'Low', icon: Minus, color: 'text-slate-400', bg: 'bg-slate-500/20', border: 'border-slate-500/30' },
    { value: 'medium', label: 'Medium', icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/20', border: 'border-amber-500/30' },
    { value: 'high', label: 'High', icon: ArrowUp, color: 'text-rose-400', bg: 'bg-rose-500/20', border: 'border-rose-500/30' },
  ];

  const moscowOptions = [
    { value: 'must', label: 'Must Have', short: 'Must', color: 'from-rose-600 to-rose-700', ring: 'ring-rose-500/50' },
    { value: 'should', label: 'Should Have', short: 'Should', color: 'from-amber-600 to-amber-700', ring: 'ring-amber-500/50' },
    { value: 'want', label: 'Could Have', short: 'Could', color: 'from-blue-600 to-blue-700', ring: 'ring-blue-500/50' },
    { value: 'wont', label: "Won't Have", short: "Won't", color: 'from-slate-600 to-slate-700', ring: 'ring-slate-500/50' },
  ];

  useEffect(() => {
    if (editingTask) {
      setTitle(editingTask.title);
      setDescription(editingTask.description || '');
      setStatus(editingTask.status);
      setPriority(editingTask.priority);
      setMoscow(editingTask.moscow || 'should');
      setDueDate(editingTask.due_date || '');
      setStartTime(editingTask.start_time || '');
      setEndTime(editingTask.end_time || '');
      setTags(editingTask.tags ? editingTask.tags.split(',') : []);
      
      if (editingTask.id) {
        window.electronAPI.getSubtasks(editingTask.id).then(setSubtasks);
      }
    } else {
      resetForm();
      if (initialDate) {
        const dateStr = initialDate.toISOString().split('T')[0];
        setDueDate(dateStr);
      }
      if (initialTime) {
        setStartTime(initialTime);
        const [hours] = initialTime.split(':');
        const endHour = (parseInt(hours) + 1).toString().padStart(2, '0');
        setEndTime(`${endHour}:00`);
      }
    }
  }, [editingTask, isOpen, initialDate, initialTime]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setStatus('todo');
    setPriority('medium');
    setMoscow('should');
    setDueDate('');
    setStartTime('');
    setEndTime('');
    setSubtasks([]);
    setTags([]);
  };

  const handleAddSubtask = async (title: string) => {
    if (editingTask?.id) {
      const newSubtask = await window.electronAPI.createSubtask({
        task_id: editingTask.id,
        title,
        completed: false,
      });
      setSubtasks([...subtasks, newSubtask]);
    } else {
      // For new tasks, just add to local state
      setSubtasks([...subtasks, { title, completed: false }]);
    }
  };

  const handleToggleSubtask = async (subtask: Subtask) => {
    if (subtask.id) {
      await window.electronAPI.updateSubtask(subtask.id, { completed: !subtask.completed });
      setSubtasks(subtasks.map(s => s.id === subtask.id ? { ...s, completed: !subtask.completed } : s));
    } else {
      // For new tasks without IDs, just toggle in local state
      setSubtasks(subtasks.map(s => s.title === subtask.title ? { ...s, completed: !s.completed } : s));
    }
  };

  const handleDeleteSubtask = async (subtask: Subtask) => {
    if (subtask.id) {
      await window.electronAPI.deleteSubtask(subtask.id);
      setSubtasks(subtasks.filter(s => s.id !== subtask.id));
    } else {
      // For new tasks without IDs, remove by title
      setSubtasks(subtasks.filter(s => s.title !== subtask.title));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      alert('Please enter a task title');
      return;
    }

    onSubmit({
      title: title.trim(),
      description: description.trim(),
      status,
      priority,
      moscow,
      due_date: dueDate || null,
      start_time: startTime || null,
      end_time: endTime || null,
      tags: tags.length > 0 ? tags.join(',') : null,
    });

    // Don't reset here - let the parent component handle closing and resetting
    // resetForm();
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTimeDisplay = (timeStr: string) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  if (!isOpen) return null;

  const currentStatus = statusOptions.find(s => s.value === status)!;
  const currentPriority = priorityOptions.find(p => p.value === priority)!;

  // Theme
  const { theme } = useTheme();
  const isLight = theme === 'light';
  
  // Apple-style minimal theme
  const t = {
    bg: isLight ? 'bg-white' : 'bg-slate-900',
    cardBg: isLight ? 'bg-gray-50' : 'bg-slate-800/50',
    border: isLight ? 'border-gray-100' : 'border-slate-800',
    borderInput: isLight ? 'border-gray-200' : 'border-slate-700',
    text: isLight ? 'text-gray-900' : 'text-white',
    textMuted: isLight ? 'text-gray-400' : 'text-slate-500',
    textLabel: isLight ? 'text-gray-500' : 'text-slate-400',
    inputBg: isLight ? 'bg-white' : 'bg-slate-800',
    rowBg: isLight ? 'bg-gray-50' : 'bg-slate-800/30',
    hoverBg: isLight ? 'hover:bg-gray-100' : 'hover:bg-slate-700',
    divider: isLight ? 'border-gray-100' : 'border-slate-800',
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className={`${t.bg} rounded-2xl shadow-xl w-full max-w-md max-h-[85vh] overflow-hidden flex flex-col`}>
        
        {/* Header */}
        <div className={`flex items-center justify-between px-4 py-3 border-b ${t.border}`}>
          <h2 className={`text-base font-semibold ${t.text}`}>
            {editingTask ? 'Edit Task' : 'New Task'}
          </h2>
          <button
            onClick={handleClose}
            className={`w-7 h-7 rounded-full flex items-center justify-center ${t.textMuted} ${t.hoverBg} transition-colors`}
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-3">
            
            {/* Title - inline style */}
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title"
              className={`w-full px-3 py-2 ${t.inputBg} border ${t.borderInput} rounded-lg ${t.text} text-sm placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 outline-none`}
              autoFocus
            />

            {/* Description - compact */}
            <div className={`rounded-lg overflow-hidden border ${t.borderInput}`}>
              <RichTextEditor
                content={description}
                onChange={setDescription}
                placeholder="Add details..."
              />
            </div>

            {/* Settings Card - Apple grouped style */}
            <div className={`${t.cardBg} rounded-xl overflow-hidden divide-y ${t.divider}`}>
              
              {/* Row: Status + Priority */}
              <div className="flex items-center px-3 py-2">
                <span className={`text-xs ${t.textLabel} w-16`}>Status</span>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as Task['status'])}
                  className={`flex-1 appearance-none bg-transparent ${t.text} text-sm outline-none cursor-pointer`}
                >
                  {statusOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <div className={`w-px h-4 ${isLight ? 'bg-gray-200' : 'bg-slate-700'} mx-3`} />
                <div className="flex gap-0.5">
                  {priorityOptions.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setPriority(opt.value as Task['priority'])}
                      className={`px-2 py-1 rounded text-[11px] font-medium transition-all ${
                        priority === opt.value
                          ? `${opt.bg} ${opt.color}`
                          : `${t.textMuted} ${t.hoverBg}`
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Row: MoSCoW */}
              <div className="flex items-center px-3 py-2">
                <span className={`text-xs ${t.textLabel} w-16`}>MoSCoW</span>
                <div className="flex-1 flex gap-0.5">
                  {moscowOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setMoscow(opt.value as Task['moscow'])}
                      className={`flex-1 py-1.5 rounded text-[11px] font-medium transition-all ${
                        moscow === opt.value
                          ? `bg-gradient-to-br ${opt.color} text-white`
                          : `${t.textMuted} ${t.hoverBg}`
                      }`}
                    >
                      {opt.short}
                    </button>
                  ))}
                </div>
              </div>

              {/* Row: Date */}
              <div className="flex items-center px-3 py-2">
                <span className={`text-xs ${t.textLabel} w-16`}>Date</span>
                <div className="flex-1 flex items-center gap-2">
                  <div className="relative flex-1">
                    <Calendar size={12} className={`absolute left-2 top-1/2 -translate-y-1/2 ${t.textMuted}`} />
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className={`w-full pl-7 pr-1 py-1 bg-transparent ${t.text} text-xs outline-none cursor-pointer ${isLight ? '' : '[color-scheme:dark]'}`}
                    />
                  </div>
                </div>
              </div>

              {/* Row: Time - Outlook style */}
              <div className="flex items-center px-3 py-2">
                <span className={`text-xs ${t.textLabel} w-16`}>Time</span>
                <div className="flex-1 flex items-center gap-3">
                  <div>
                    <span className={`text-[10px] ${t.textMuted} mb-0.5 block`}>Start</span>
                    <TimePicker
                      value={startTime}
                      onChange={setStartTime}
                      placeholder="Start time"
                    />
                  </div>
                  <span className={`text-xs ${t.textMuted} mt-4`}>→</span>
                  <div>
                    <span className={`text-[10px] ${t.textMuted} mb-0.5 block`}>End</span>
                    <TimePicker
                      value={endTime}
                      onChange={setEndTime}
                      referenceTime={startTime}
                      showDuration={true}
                      placeholder="End time"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Subtasks - Compact inline */}
            <div className={`${t.cardBg} rounded-xl px-3 py-2`}>
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs ${t.textLabel}`}>
                  Subtasks
                  {subtasks.length > 0 && ` (${subtasks.filter(s => s.completed).length}/${subtasks.length})`}
                </span>
              </div>
              <SubtaskList
                subtasks={subtasks}
                onAdd={handleAddSubtask}
                onToggle={handleToggleSubtask}
                onDelete={handleDeleteSubtask}
              />
            </div>

            {/* Tags - Inline */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs ${t.textLabel}`}>Tags</span>
              <TagInput
                tags={tags}
                onChange={setTags}
              />
            </div>
          </div>

          {/* Footer - Compact */}
          <div className={`px-4 py-3 border-t ${t.border} flex gap-2`}>
            <button
              type="button"
              onClick={handleClose}
              className={`flex-1 px-3 py-2 ${t.cardBg} ${t.text} text-sm font-medium rounded-lg ${t.hoverBg} transition-colors`}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-[2] px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 size={14} />
              {editingTask ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskForm;
