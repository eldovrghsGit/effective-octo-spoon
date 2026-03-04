import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Plus, Calendar, FileText, Search, Tag as TagIcon, Pin, Trash2, Square, Check, CheckSquare, Type, Heading1, Heading2, List, ListOrdered, ListPlus, X, Clock, Flag, Archive, Sparkles, Loader2, Send } from 'lucide-react';
import { Note, ChecklistItem } from '../../types/notes';
import { Task } from '../../App';
import NotesSidebar from './NotesSidebar';
import { format, startOfWeek, endOfWeek, isSameWeek, parseISO, getDay, addDays } from 'date-fns';
import { useTheme } from '../../contexts/ThemeContext';

interface NotesLayoutProps {
  notes: Note[];
  tasks: Task[];
  onAddNote: (note: Omit<Note, 'id' | 'created_at' | 'updated_at'>) => void;
  onUpdateNote: (id: number, updates: Partial<Note>) => void;
  onDeleteNote: (id: number) => void;
  onTogglePin: (id: number, isPinned: boolean) => void;
  onAddTask: (task: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => Promise<number | null>;
  onUpdateTask: (id: number, updates: Partial<Task>) => void;
}

// Block types for the infinite canvas
interface ContentBlock {
  id: string;
  type: 'text' | 'checkbox' | 'h1' | 'h2' | 'h3' | 'bullet' | 'numbered';
  content: string;
  checked?: boolean;
  taskId?: number | null;
}

// Helper to map HTML tag names to ContentBlock types
function htmlTagToBlockType(tagName: string): ContentBlock['type'] {
  switch (tagName.toUpperCase()) {
    case 'H1': return 'h1';
    case 'H2': return 'h2';
    case 'H3': return 'h3';
    case 'UL': case 'LI': return 'bullet';
    case 'OL': return 'numbered';
    default: return 'text';
  }
}

// Slash command menu options
const slashCommands = [
  { id: 'text', label: 'Text', icon: Type, description: 'Plain text block' },
  { id: 'checkbox', label: 'To-do', icon: CheckSquare, description: 'Checkbox that syncs with Tasks' },
  { id: 'h1', label: 'Heading 1', icon: Heading1, description: 'Large heading' },
  { id: 'h2', label: 'Heading 2', icon: Heading2, description: 'Medium heading' },
  { id: 'bullet', label: 'Bullet List', icon: List, description: 'Bulleted list item' },
  { id: 'numbered', label: 'Numbered List', icon: ListOrdered, description: 'Numbered list item' },
  { id: 'copilot', label: 'AI Copilot', icon: Sparkles, description: 'Generate content with AI' },
];

// Editable block component that manages its own content without parent re-renders
interface EditableBlockProps {
  initialContent: string;
  placeholder?: string;
  className?: string;
  onContentChange: (content: string) => void;
  onKeyDown: (e: React.KeyboardEvent, content: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  blockRef?: (el: HTMLDivElement | null) => void;
}

const EditableBlock: React.FC<EditableBlockProps> = React.memo(({
  initialContent,
  placeholder,
  className,
  onContentChange,
  onKeyDown,
  onFocus,
  onBlur,
  blockRef
}) => {
  const innerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef(initialContent);
  
  // Set initial content only once on mount
  useEffect(() => {
    if (innerRef.current && innerRef.current.innerText !== initialContent) {
      innerRef.current.innerText = initialContent;
      contentRef.current = initialContent;
    }
  }, []); // Only on mount
  
  // Update content when initialContent changes from external source (e.g., note switch)
  useEffect(() => {
    if (innerRef.current && contentRef.current !== initialContent) {
      // Only update if we're not focused (avoid disrupting typing)
      if (document.activeElement !== innerRef.current) {
        innerRef.current.innerText = initialContent;
        contentRef.current = initialContent;
      }
    }
  }, [initialContent]);
  
  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const text = (e.target as HTMLDivElement).innerText;
    contentRef.current = text;
    onContentChange(text);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    onKeyDown(e, contentRef.current);
  };
  
  const setRefs = (el: HTMLDivElement | null) => {
    innerRef.current = el;
    if (blockRef) blockRef(el);
  };
  
  return (
    <div
      ref={setRefs}
      contentEditable
      suppressContentEditableWarning
      onInput={handleInput}
      onKeyDown={handleKeyDown}
      onFocus={onFocus}
      onBlur={onBlur}
      className={className}
      data-placeholder={placeholder}
    />
  );
}, (prevProps, nextProps) => {
  // Only re-render if these specific props change (NOT initialContent during typing)
  return prevProps.placeholder === nextProps.placeholder &&
         prevProps.className === nextProps.className;
});

// Existing Task Picker Modal - Modern multi-select picker
interface ExistingTaskPickerProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  alreadyLinkedTaskIds: Set<number>;
  onAddTasks: (tasks: Task[]) => void;
}

const ExistingTaskPicker: React.FC<ExistingTaskPickerProps> = ({
  isOpen,
  onClose,
  tasks,
  alreadyLinkedTaskIds,
  onAddTasks
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  // Filter tasks: only show incomplete tasks not already linked
  const availableTasks = tasks.filter(task => 
    task.status !== 'done' && 
    !alreadyLinkedTaskIds.has(task.id) &&
    (searchQuery === '' || 
     task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
     (task.tags && task.tags.toLowerCase().includes(searchQuery.toLowerCase())))
  );

  // Reset selections when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedIds(new Set());
      setSearchQuery('');
    }
  }, [isOpen]);

  const toggleSelection = (taskId: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === availableTasks.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(availableTasks.map(t => t.id)));
    }
  };

  const handleAddSelected = () => {
    const selectedTasks = tasks.filter(t => selectedIds.has(t.id));
    onAddTasks(selectedTasks);
    onClose();
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-400 bg-red-400/20';
      case 'medium': return 'text-yellow-400 bg-yellow-400/20';
      case 'low': return 'text-green-400 bg-green-400/20';
      default: return 'text-gray-400 bg-gray-400/20';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className={`w-full max-w-lg mx-4 rounded-2xl shadow-2xl overflow-hidden ${isDark ? 'bg-[#1e293b]' : 'bg-white'}`}>
        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <ListPlus className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Add Existing Tasks</h2>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Select tasks to add to today's list</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className={`px-5 py-3 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 ${isDark ? 'bg-gray-800 text-white placeholder-gray-500 border border-gray-700' : 'bg-gray-100 text-gray-900 placeholder-gray-400 border border-gray-200'}`}
              autoFocus
            />
          </div>
        </div>

        {/* Select All / Count */}
        <div className={`flex items-center justify-between px-5 py-2 ${isDark ? 'bg-gray-800/50' : 'bg-gray-50'}`}>
          <button
            onClick={handleSelectAll}
            className={`text-sm font-medium transition-colors ${isDark ? 'text-purple-400 hover:text-purple-300' : 'text-purple-600 hover:text-purple-500'}`}
          >
            {selectedIds.size === availableTasks.length && availableTasks.length > 0 ? 'Deselect All' : 'Select All'}
          </button>
          <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            {selectedIds.size} of {availableTasks.length} selected
          </span>
        </div>

        {/* Task List */}
        <div className="max-h-80 overflow-y-auto">
          {availableTasks.length === 0 ? (
            <div className={`flex flex-col items-center justify-center py-12 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              <CheckSquare className="w-12 h-12 mb-3 opacity-40" />
              <p className="text-sm font-medium">No available tasks</p>
              <p className="text-xs mt-1">All tasks are either completed or already added</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-700/50">
              {availableTasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => toggleSelection(task.id)}
                  className={`flex items-center gap-3 px-5 py-3 cursor-pointer transition-colors ${
                    selectedIds.has(task.id)
                      ? isDark ? 'bg-purple-500/20' : 'bg-purple-50'
                      : isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-50'
                  }`}
                >
                  {/* Checkbox */}
                  <div className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                    selectedIds.has(task.id)
                      ? 'bg-purple-500 border-purple-500'
                      : isDark ? 'border-gray-600' : 'border-gray-300'
                  }`}>
                    {selectedIds.has(task.id) && <Check className="w-3 h-3 text-white" />}
                  </div>

                  {/* Task Info */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {task.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {task.priority && (
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium ${getPriorityColor(task.priority)}`}>
                          <Flag className="w-3 h-3" />
                          {task.priority}
                        </span>
                      )}
                      {task.due_date && (
                        <span className={`inline-flex items-center gap-1 text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          <Clock className="w-3 h-3" />
                          {format(new Date(task.due_date), 'MMM d')}
                        </span>
                      )}
                      {task.tags && (
                        <span className={`text-xs px-1.5 py-0.5 rounded ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'}`}>
                          {task.tags.split(',')[0]}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`flex items-center justify-end gap-3 px-5 py-4 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
          >
            Cancel
          </button>
          <button
            onClick={handleAddSelected}
            disabled={selectedIds.size === 0}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedIds.size === 0
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-purple-600 text-white hover:bg-purple-700'
            }`}
          >
            Add {selectedIds.size > 0 ? `${selectedIds.size} Task${selectedIds.size > 1 ? 's' : ''}` : 'Tasks'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Main Note Content View - Infinite Canvas with Block Editor
const NoteContentView: React.FC<{
  note: Note;
  tasks: Task[];
  onUpdateNote: (updates: Partial<Note>) => void;
  onAddTask: (task: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => Promise<number | null>;
  onUpdateTask: (id: number, updates: Partial<Task>) => void;
  onDeleteNote: () => void;
}> = ({ note, tasks, onUpdateNote, onAddTask, onUpdateTask, onDeleteNote }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [title, setTitle] = useState(note.title);
  const [blocks, setBlocks] = useState<ContentBlock[]>([]);
  const [focusedBlockId, setFocusedBlockId] = useState<string | null>(null);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashMenuBlockId, setSlashMenuBlockId] = useState<string | null>(null);
  const [slashFilter, setSlashFilter] = useState('');
  const [slashStartPos, setSlashStartPos] = useState<number | null>(null);
  const blockRefs = useRef<Record<string, HTMLElement | null>>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const pendingContentRef = useRef<Record<string, string>>({});
  const [allSelected, setAllSelected] = useState(false);
  const [selectedBlockIds, setSelectedBlockIds] = useState<Set<string>>(new Set());
  const lastSelectedBlockId = useRef<string | null>(null);
  const isTypingRef = useRef(false);
  const [showExistingTaskPicker, setShowExistingTaskPicker] = useState(false);

  // Copilot inline prompt state
  const [copilotPrompt, setCopilotPrompt] = useState<{ show: boolean; blockId: string | null }>({ show: false, blockId: null });
  const [copilotInput, setCopilotInput] = useState('');
  const [copilotLoading, setCopilotLoading] = useState(false);
  const copilotInputRef = useRef<HTMLInputElement>(null);

  // Compute already-linked task IDs from TODAY'S section only (not the entire note)
  const alreadyLinkedTaskIds = useMemo(() => {
    const today = format(new Date(), 'EEEE, MMMM d, yyyy');
    const todayHeaderIdx = blocks.findIndex(b => b.type === 'h2' && b.content === today);
    
    if (todayHeaderIdx === -1) {
      // No today section yet - no tasks are "already added"
      return new Set<number>();
    }
    
    // Find the end of today's section (next h2 date header or end of blocks)
    let endIdx = blocks.length;
    for (let i = todayHeaderIdx + 1; i < blocks.length; i++) {
      if (blocks[i].type === 'h2') {
        endIdx = i;
        break;
      }
    }
    
    // Get task IDs only from today's section
    const todayBlocks = blocks.slice(todayHeaderIdx, endIdx);
    return new Set(
      todayBlocks.filter(b => b.type === 'checkbox' && b.taskId).map(b => b.taskId!)
    );
  }, [blocks]);

  // Handle adding existing tasks from the picker
  const handleAddExistingTasks = useCallback((selectedTasks: Task[]) => {
    if (selectedTasks.length === 0) return;

    // Create new checkbox blocks linked to the selected tasks
    const newBlocks: ContentBlock[] = selectedTasks.map((task, idx) => ({
      id: `block-${Date.now()}-task-${task.id}-${idx}`,
      type: 'checkbox' as const,
      content: task.title,
      checked: task.status === 'done',
      taskId: task.id,
    }));

    // Find the position to insert: after today's time period header, or at end
    setBlocks(prev => {
      // Find today's date header
      const today = format(new Date(), 'EEEE, MMMM d, yyyy');
      const todayHeaderIdx = prev.findIndex(b => b.type === 'h2' && b.content === today);
      
      if (todayHeaderIdx !== -1) {
        // Find the last item under today's section (before next date header or end)
        let insertIdx = todayHeaderIdx + 1;
        while (insertIdx < prev.length && prev[insertIdx].type !== 'h2') {
          insertIdx++;
        }
        // Insert before the next date header
        const result = [...prev];
        result.splice(insertIdx, 0, ...newBlocks);
        return result;
      }
      
      // Fallback: append at end
      return [...prev, ...newBlocks];
    });
  }, []);

  // Parse content into blocks
  const parseContentToBlocks = useCallback((content: string | null): ContentBlock[] => {
    if (!content) return [{ id: `block-${Date.now()}`, type: 'text', content: '' }];
    
    const lines = content.split('\n');
    return lines.map((line, index) => {
      const id = `block-${Date.now()}-${index}`;
      
      // Checkbox patterns: [ ], [x], - [ ], - [x] with optional taskId
      // Format: - [x] content <!-- taskId:123 -->
      const checkboxMatch = line.match(/^(-\s*)?\[([\sx])\]\s*(.*)$/i);
      if (checkboxMatch) {
        let content = checkboxMatch[3] || '';
        let taskId: number | null = null;
        
        // Extract taskId from HTML comment
        const taskIdMatch = content.match(/<!--\s*taskId:(\d+)\s*-->/);
        if (taskIdMatch) {
          taskId = parseInt(taskIdMatch[1], 10);
          content = content.replace(/<!--\s*taskId:\d+\s*-->/, '').trim();
        }
        
        return {
          id,
          type: 'checkbox' as const,
          content,
          checked: checkboxMatch[2].toLowerCase() === 'x',
          taskId,
        };
      }
      
      // Headings
      if (line.startsWith('### ')) {
        return { id, type: 'h3' as const, content: line.slice(4) };
      }
      if (line.startsWith('## ')) {
        return { id, type: 'h2' as const, content: line.slice(3) };
      }
      if (line.startsWith('# ')) {
        return { id, type: 'h1' as const, content: line.slice(2) };
      }
      
      // Bullet list
      if (line.startsWith('- ') || line.startsWith('* ')) {
        return { id, type: 'bullet' as const, content: line.slice(2) };
      }
      
      // Numbered list
      const numberedMatch = line.match(/^(\d+)\.\s+(.*)/);
      if (numberedMatch) {
        return { id, type: 'numbered' as const, content: numberedMatch[2] };
      }
      
      return { id, type: 'text' as const, content: line };
    });
  }, []);

  // Convert blocks back to content string
  const blocksToContent = useCallback((blocks: ContentBlock[]): string => {
    return blocks.map((block, index) => {
      switch (block.type) {
        case 'checkbox':
          const taskIdComment = block.taskId ? ` <!-- taskId:${block.taskId} -->` : '';
          return `- [${block.checked ? 'x' : ' '}] ${block.content}${taskIdComment}`;
        case 'h1':
          return `# ${block.content}`;
        case 'h2':
          return `## ${block.content}`;
        case 'h3':
          return `### ${block.content}`;
        case 'bullet':
          return `- ${block.content}`;
        case 'numbered':
          return `${index + 1}. ${block.content}`;
        default:
          return block.content;
      }
    }).join('\n');
  }, []);

  // Check if today's date header exists in content
  const hasTodayHeader = useCallback((content: string | null): boolean => {
    if (!content) return false;
    const today = format(new Date(), 'EEEE, MMMM d, yyyy');
    return content.includes(`## ${today}`);
  }, []);

  // Get current time period (Morning, Afternoon, Evening)
  const getTimePeriod = (): string => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return '🌅 Morning';
    if (hour >= 12 && hour < 17) return '☀️ Afternoon';
    if (hour >= 17 && hour < 21) return '🌆 Evening';
    return '🌙 Night';
  };

  // Check if current time period section exists for today
  const hasTodayTimePeriod = useCallback((content: string | null, period: string): boolean => {
    if (!content) return false;
    const today = format(new Date(), 'EEEE, MMMM d, yyyy');
    const todayIndex = content.indexOf(`## ${today}`);
    if (todayIndex === -1) return false;
    
    // Check if the period exists after today's header
    const afterToday = content.substring(todayIndex);
    return afterToday.includes(`### ${period}`);
  }, []);

  // Helper to detect if a block is a date header (for daily planner)
  const isDateHeader = (content: string): boolean => {
    // Match patterns like "Monday, January 19, 2026"
    // Using a more lenient pattern to catch various date formats
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    
    for (const day of days) {
      for (const month of months) {
        if (content.startsWith(`${day}, ${month} `)) {
          return true;
        }
      }
    }
    return false;
  };

  // Helper to detect if a block is a time period header
  const isTimePeriodHeader = (content: string): boolean => {
    return content.includes('🌅 Morning') || 
           content.includes('☀️ Afternoon') || 
           content.includes('🌆 Evening') || 
           content.includes('🌙 Night');
  };

  // Parse date header into components
  const parseDateHeader = (content: string): { day: string; month: string; date: string; year: string; dayOfWeek: string } | null => {
    // More flexible parsing: "Monday, January 19, 2026"
    const parts = content.split(', ');
    if (parts.length >= 2) {
      const dayOfWeek = parts[0];
      const rest = parts.slice(1).join(', '); // "January 19, 2026"
      const dateMatch = rest.match(/(\w+)\s+(\d{1,2}),?\s+(\d{4})/);
      if (dateMatch) {
        return {
          dayOfWeek,
          month: dateMatch[1].substring(0, 3).toUpperCase(),
          date: dateMatch[2],
          year: dateMatch[3],
          day: dayOfWeek
        };
      }
    }
    return null;
  };

  // Get time period style
  const getTimePeriodStyle = (content: string): { bg: string; text: string; icon: string } => {
    if (content.includes('Morning')) return { bg: 'bg-amber-500/20', text: 'text-amber-400', icon: '🌅' };
    if (content.includes('Afternoon')) return { bg: 'bg-orange-500/20', text: 'text-orange-400', icon: '☀️' };
    if (content.includes('Evening')) return { bg: 'bg-purple-500/20', text: 'text-purple-400', icon: '🌆' };
    return { bg: 'bg-indigo-500/20', text: 'text-indigo-400', icon: '🌙' };
  };

  // Initialize blocks from note content
  useEffect(() => {
    setTitle(note.title);
    let initialBlocks = parseContentToBlocks(note.content);
    const timePeriod = getTimePeriod();
    
    // For daily planner, add today's date header and time period if not present
    if (note.note_type === 'daily_planner') {
      const todayHeader = format(new Date(), 'EEEE, MMMM d, yyyy');
      const hasToday = hasTodayHeader(note.content);
      const hasTimePeriod = hasTodayTimePeriod(note.content, timePeriod);
      
      if (!hasToday) {
        // New day - add date header and time period
        const dateBlock: ContentBlock = {
          id: `block-date-${Date.now()}`,
          type: 'h2',
          content: todayHeader
        };
        const periodBlock: ContentBlock = {
          id: `block-period-${Date.now()}`,
          type: 'h3',
          content: timePeriod
        };
        const emptyBlock: ContentBlock = {
          id: `block-${Date.now()}`,
          type: 'text',
          content: ''
        };
        // Add at the beginning (most recent at top)
        initialBlocks = [dateBlock, periodBlock, emptyBlock, ...initialBlocks.filter(b => b.content)];
      } else if (!hasTimePeriod) {
        // Same day, but new time period - find today's header and add period after it
        const todayIndex = initialBlocks.findIndex(b => b.type === 'h2' && b.content === todayHeader);
        if (todayIndex !== -1) {
          const periodBlock: ContentBlock = {
            id: `block-period-${Date.now()}`,
            type: 'h3',
            content: timePeriod
          };
          const emptyBlock: ContentBlock = {
            id: `block-${Date.now()}`,
            type: 'text',
            content: ''
          };
          // Insert after the date header (or after existing time periods)
          let insertIndex = todayIndex + 1;
          // Skip past existing time period blocks for today
          while (insertIndex < initialBlocks.length && 
                 initialBlocks[insertIndex].type === 'h3' && 
                 (initialBlocks[insertIndex].content.includes('Morning') || 
                  initialBlocks[insertIndex].content.includes('Afternoon') || 
                  initialBlocks[insertIndex].content.includes('Evening') ||
                  initialBlocks[insertIndex].content.includes('Night'))) {
            insertIndex++;
            // Skip content under that period until next period or date
            while (insertIndex < initialBlocks.length && 
                   initialBlocks[insertIndex].type !== 'h2' && 
                   initialBlocks[insertIndex].type !== 'h3') {
              insertIndex++;
            }
          }
          initialBlocks.splice(todayIndex + 1, 0, periodBlock, emptyBlock);
        }
      }
    }
    
    setBlocks(initialBlocks);
  }, [note.id]);

  // Auto-save title
  useEffect(() => {
    if (title !== note.title) {
      const timer = setTimeout(() => {
        onUpdateNote({ title });
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [title]);

  // Auto-save blocks
  useEffect(() => {
    const timer = setTimeout(() => {
      const newContent = blocksToContent(blocks);
      if (newContent !== note.content) {
        onUpdateNote({ content: newContent });
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [blocks]);

  // Sync checkbox states with task statuses
  // Sync checkbox states with task statuses (by taskId)
  useEffect(() => {
    if (tasks.length === 0) return;
    
    setBlocks(prev => {
      let hasChanges = false;
      const updated = prev.map(block => {
        if (block.type === 'checkbox' && block.taskId) {
          const linkedTask = tasks.find(t => t.id === block.taskId);
          
          if (linkedTask) {
            const shouldBeChecked = linkedTask.status === 'done';
            if (block.checked !== shouldBeChecked) {
              hasChanges = true;
              return { ...block, checked: shouldBeChecked };
            }
          }
        }
        return block;
      });
      
      return hasChanges ? updated : prev;
    });
  }, [tasks]);

  // Handle block selection (click with modifiers)
  const handleBlockSelect = useCallback((blockId: string, e: React.MouseEvent) => {
    // Shift+Click - range select
    if (e.shiftKey && lastSelectedBlockId.current) {
      const startIdx = blocks.findIndex(b => b.id === lastSelectedBlockId.current);
      const endIdx = blocks.findIndex(b => b.id === blockId);
      if (startIdx !== -1 && endIdx !== -1) {
        const minIdx = Math.min(startIdx, endIdx);
        const maxIdx = Math.max(startIdx, endIdx);
        const rangeIds = blocks.slice(minIdx, maxIdx + 1).map(b => b.id);
        setSelectedBlockIds(new Set(rangeIds));
        setAllSelected(false);
        e.preventDefault();
        return;
      }
    }
    
    // Ctrl+Click - toggle individual selection
    if (e.ctrlKey || e.metaKey) {
      setSelectedBlockIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(blockId)) {
          newSet.delete(blockId);
        } else {
          newSet.add(blockId);
        }
        return newSet;
      });
      lastSelectedBlockId.current = blockId;
      setAllSelected(false);
      e.preventDefault();
      return;
    }
    
    // Regular click - clear selection
    if (selectedBlockIds.size > 0) {
      setSelectedBlockIds(new Set());
    }
    lastSelectedBlockId.current = blockId;
  }, [blocks, selectedBlockIds]);

  // Delete selected blocks
  const deleteSelectedBlocks = useCallback(() => {
    if (selectedBlockIds.size === 0) return;
    
    // Clean up pending content for deleted blocks
    selectedBlockIds.forEach(id => {
      delete pendingContentRef.current[id];
    });
    
    setBlocks(prev => {
      const remaining = prev.filter(b => !selectedBlockIds.has(b.id));
      if (remaining.length === 0) {
        return [{ id: `block-${Date.now()}`, type: 'text', content: '' }];
      }
      return remaining;
    });
    
    setSelectedBlockIds(new Set());
    
    // Focus first remaining block
    setTimeout(() => {
      const firstBlock = document.querySelector('[contenteditable="true"]') as HTMLElement;
      firstBlock?.focus();
    }, 0);
  }, [selectedBlockIds]);

  // Handle Ctrl+A (Select All) and Delete/Backspace to clear content
  const handleContainerKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Delete selected blocks
    if (selectedBlockIds.size > 0 && (e.key === 'Delete' || e.key === 'Backspace')) {
      e.preventDefault();
      deleteSelectedBlocks();
      return;
    }
    
    // Ctrl+A - Select All
    if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
      e.preventDefault();
      setAllSelected(true);
      setSelectedBlockIds(new Set(blocks.map(b => b.id)));
    }
    
    // Delete or Backspace when all is selected - clear all content
    if (allSelected && (e.key === 'Delete' || e.key === 'Backspace')) {
      e.preventDefault();
      pendingContentRef.current = {};
      setBlocks([{ id: `block-${Date.now()}`, type: 'text', content: '' }]);
      setAllSelected(false);
      setSelectedBlockIds(new Set());
      // Focus the new empty block
      setTimeout(() => {
        const firstBlock = document.querySelector('[contenteditable="true"]') as HTMLElement;
        firstBlock?.focus();
      }, 0);
    }
    
    // Escape to clear selection
    if (e.key === 'Escape') {
      setSelectedBlockIds(new Set());
      setAllSelected(false);
    }
    
    // Any other key press should deselect all
    if (allSelected && e.key !== 'Control' && e.key !== 'Meta' && e.key !== 'Shift') {
      if (e.key !== 'Delete' && e.key !== 'Backspace' && e.key !== 'a') {
        setAllSelected(false);
        setSelectedBlockIds(new Set());
      }
    }
  }, [allSelected, selectedBlockIds, blocks, deleteSelectedBlocks]);

  // Reset selection when clicking outside blocks
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      // Only reset if clicking on canvas area, not on blocks
      const target = e.target as HTMLElement;
      if (target.classList.contains('canvas-area') || target === containerRef.current) {
        if (allSelected) setAllSelected(false);
        if (selectedBlockIds.size > 0) setSelectedBlockIds(new Set());
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [allSelected, selectedBlockIds]);

  // Handle native text selection across blocks and delete
  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) return;
      
      // Find all blocks that contain selected text
      const selectedBlocks = new Set<string>();
      const range = selection.getRangeAt(0);
      
      blocks.forEach(block => {
        const el = blockRefs.current[block.id];
        if (el && range.intersectsNode(el)) {
          selectedBlocks.add(block.id);
        }
      });
      
      if (selectedBlocks.size > 1) {
        setSelectedBlockIds(selectedBlocks);
      }
    };
    
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [blocks]);

  // Handle delete for cross-block native text selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed) return;
        
        // Check if selection spans multiple blocks
        const range = selection.getRangeAt(0);
        const blocksInSelection: string[] = [];
        
        blocks.forEach(block => {
          const el = blockRefs.current[block.id];
          if (el && range.intersectsNode(el)) {
            blocksInSelection.push(block.id);
          }
        });
        
        // If selection spans multiple blocks, handle specially
        if (blocksInSelection.length > 1) {
          e.preventDefault();
          
          // Get first and last block in selection
          const firstBlockId = blocksInSelection[0];
          const lastBlockId = blocksInSelection[blocksInSelection.length - 1];
          const firstEl = blockRefs.current[firstBlockId];
          const lastEl = blockRefs.current[lastBlockId];
          
          // Get remaining text before selection in first block
          const firstBlockText = firstEl?.innerText || '';
          const startOffset = range.startContainer === firstEl 
            ? range.startOffset 
            : (range.startContainer.parentElement === firstEl ? range.startOffset : 0);
          const beforeText = firstBlockText.substring(0, startOffset);
          
          // Get remaining text after selection in last block
          const lastBlockText = lastEl?.innerText || '';
          const endOffset = range.endContainer === lastEl 
            ? range.endOffset 
            : (range.endContainer.parentElement === lastEl ? range.endOffset : lastBlockText.length);
          const afterText = lastBlockText.substring(endOffset);
          
          // Merge remaining content into first block
          const mergedContent = beforeText + afterText;
          
          // Remove middle blocks and update first block
          const middleBlockIds = blocksInSelection.slice(1);
          middleBlockIds.forEach(id => {
            delete pendingContentRef.current[id];
          });
          
          setBlocks(prev => {
            const remaining = prev.filter(b => !middleBlockIds.includes(b.id));
            return remaining.map(b => 
              b.id === firstBlockId ? { ...b, content: mergedContent } : b
            );
          });
          
          // Update the DOM and set cursor
          setTimeout(() => {
            if (firstEl) {
              firstEl.innerText = mergedContent;
              firstEl.focus();
              // Set cursor at merge point
              const newRange = document.createRange();
              const textNode = firstEl.firstChild || firstEl;
              const cursorPos = Math.min(beforeText.length, textNode.textContent?.length || 0);
              newRange.setStart(textNode, cursorPos);
              newRange.collapse(true);
              selection.removeAllRanges();
              selection.addRange(newRange);
            }
          }, 0);
          
          setSelectedBlockIds(new Set());
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [blocks]);

  // Update block content
  const updateBlock = (id: string, updates: Partial<ContentBlock>) => {
    setBlocks(prev => prev.map(block => 
      block.id === id ? { ...block, ...updates } : block
    ));
  };

  // Add new block after specified block
  const addBlockAfter = (afterId: string, type: ContentBlock['type'] = 'text') => {
    const newBlock: ContentBlock = {
      id: `block-${Date.now()}`,
      type,
      content: '',
      checked: type === 'checkbox' ? false : undefined,
    };
    
    setBlocks(prev => {
      const index = prev.findIndex(b => b.id === afterId);
      const newBlocks = [...prev];
      newBlocks.splice(index + 1, 0, newBlock);
      return newBlocks;
    });
    
    // Focus new block
    setTimeout(() => {
      setFocusedBlockId(newBlock.id);
      blockRefs.current[newBlock.id]?.focus();
    }, 0);
    
    return newBlock;
  };

  // Delete block
  const deleteBlock = (id: string) => {
    setBlocks(prev => {
      if (prev.length <= 1) {
        // Keep at least one block
        return [{ id: `block-${Date.now()}`, type: 'text', content: '' }];
      }
      const index = prev.findIndex(b => b.id === id);
      const newBlocks = prev.filter(b => b.id !== id);
      
      // Focus previous block
      if (index > 0) {
        setTimeout(() => {
          const prevBlock = newBlocks[index - 1];
          setFocusedBlockId(prevBlock.id);
          blockRefs.current[prevBlock.id]?.focus();
        }, 0);
      }
      
      return newBlocks;
    });
  };

  // Toggle checkbox
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isTypingRef.current) return;
      
      let hasChanges = false;
      const updates: Array<{ id: string; content: string }> = [];
      
      Object.entries(pendingContentRef.current).forEach(([id, content]) => {
        const block = blocks.find(b => b.id === id);
        if (block && block.content !== content) {
          updates.push({ id, content });
          hasChanges = true;
        }
      });
      
      if (hasChanges) {
        setBlocks(prev => prev.map(block => {
          const update = updates.find(u => u.id === block.id);
          return update ? { ...block, content: update.content } : block;
        }));
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [blocks]);

  // Toggle checkbox
  const toggleCheckbox = (blockId: string) => {
    const block = blocks.find(b => b.id === blockId);
    if (block && block.type === 'checkbox') {
      const newChecked = !block.checked;
      updateBlock(blockId, { checked: newChecked });
      
      // Sync with linked task by ID
      if (block.taskId) {
        onUpdateTask(block.taskId, { status: newChecked ? 'done' : 'todo' });
      }
    }
  };

  // Apply slash command
  const applySlashCommand = (commandId: string) => {
    if (slashMenuBlockId) {
      // Handle Copilot command specially
      if (commandId === 'copilot') {
        // Clear the slash text from the block
        const blockEl = blockRefs.current[slashMenuBlockId];
        if (blockEl) {
          blockEl.innerText = '';
        }
        updateBlock(slashMenuBlockId, { content: '', type: 'text' });
        setShowSlashMenu(false);
        setSlashStartPos(null);
        setCopilotPrompt({ show: true, blockId: slashMenuBlockId });
        setCopilotInput('');
        setSlashMenuBlockId(null);
        setTimeout(() => copilotInputRef.current?.focus(), 50);
        return;
      }

      // Get the current content and remove the /command part
      const blockEl = blockRefs.current[slashMenuBlockId];
      const currentContent = blockEl?.innerText || '';
      
      // Find and remove the slash command text (from slash position to current cursor or end of filter)
      let newContent = '';
      if (slashStartPos !== null) {
        // Remove everything from slash position to current position (slash + filter text)
        const beforeSlash = currentContent.substring(0, slashStartPos);
        const afterCommand = currentContent.substring(slashStartPos + 1 + slashFilter.length);
        newContent = (beforeSlash + afterCommand).trim();
      }
      
      updateBlock(slashMenuBlockId, { 
        type: commandId as ContentBlock['type'],
        content: newContent,
        checked: commandId === 'checkbox' ? false : undefined
      });
    }
    setShowSlashMenu(false);
    setSlashMenuBlockId(null);
    setSlashStartPos(null);
    
    // Focus the block
    setTimeout(() => {
      if (slashMenuBlockId) {
        blockRefs.current[slashMenuBlockId]?.focus();
      }
    }, 0);
  };

  // Filter slash commands
  const filteredCommands = slashCommands.filter(cmd => 
    cmd.label.toLowerCase().includes(slashFilter.toLowerCase())
  );

  // Copilot inline content generation
  const handleCopilotSubmit = async () => {
    if (!copilotInput.trim() || copilotLoading || !copilotPrompt.blockId) return;
    setCopilotLoading(true);

    try {
      const result = await window.electronAPI.copilot.generateContent(copilotInput.trim());

      if (result.success && result.content) {
        // Clean up the response
        let text = result.content
          .replace(/^```html?\n?/i, '')
          .replace(/\n?```$/i, '')
          .trim();

        // Strip HTML tags for block-based content (convert to plain text)
        const plainText = text.replace(/<[^>]*>/g, '').trim();

        // Insert the generated content into the current block
        updateBlock(copilotPrompt.blockId, { content: plainText });

        // Also try to create additional blocks from structured content
        // Parse HTML and create blocks for each element
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = text;
        const children = Array.from(tempDiv.children);

        if (children.length > 1) {
          // Multi-block content: update first block, add remaining as new blocks
          const firstChild = children[0];
          const firstType = htmlTagToBlockType(firstChild.tagName);
          const firstContent = firstChild.textContent?.trim() || '';
          updateBlock(copilotPrompt.blockId, { content: firstContent, type: firstType });

          // Add remaining blocks after the current one
          const currentIdx = blocks.findIndex(b => b.id === copilotPrompt.blockId);
          const newBlocks: ContentBlock[] = children.slice(1).map(child => ({
            id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: htmlTagToBlockType(child.tagName),
            content: child.textContent?.trim() || '',
          }));

          setBlocks(prev => {
            const updated = [...prev];
            updated.splice(currentIdx + 1, 0, ...newBlocks);
            return updated;
          });
        } else if (children.length === 1) {
          const child = children[0];
          updateBlock(copilotPrompt.blockId, {
            content: child.textContent?.trim() || '',
            type: htmlTagToBlockType(child.tagName),
          });
        }
      }
    } catch (err) {
      updateBlock(copilotPrompt.blockId, { content: '⚠ Copilot generation failed. Please try again.' });
    } finally {
      setCopilotLoading(false);
      setCopilotPrompt({ show: false, blockId: null });
      setCopilotInput('');
    }
  };

  const handleCopilotCancel = () => {
    setCopilotPrompt({ show: false, blockId: null });
    setCopilotInput('');
    setCopilotLoading(false);
    // Refocus the block
    if (copilotPrompt.blockId) {
      setTimeout(() => blockRefs.current[copilotPrompt.blockId!]?.focus(), 0);
    }
  };
  // Render block based on type
  const renderBlock = (block: ContentBlock, index: number) => {
    const placeholder = getPlaceholder(block.type, block.id);
    const isSelected = selectedBlockIds.has(block.id);
    const selectionClass = isSelected ? 'bg-purple-500/20 ring-1 ring-purple-500/50 rounded' : '';
    
    const handleContentChange = (content: string) => {
      pendingContentRef.current[block.id] = content;
      
      // Update slash filter if menu is open
      if (showSlashMenu && slashMenuBlockId === block.id && slashStartPos !== null) {
        // Extract text after the slash to use as filter
        const textAfterSlash = content.substring(slashStartPos + 1);
        // Find the filter (text until space or end)
        const filterMatch = textAfterSlash.match(/^(\S*)/);
        const filter = filterMatch ? filterMatch[1] : '';
        setSlashFilter(filter);
        
        // Close menu if user deleted the slash or typed space
        if (slashStartPos >= content.length || content[slashStartPos] !== '/') {
          setShowSlashMenu(false);
          setSlashMenuBlockId(null);
          setSlashStartPos(null);
        }
      }
      
      // Check for live conversions
      if (block.type === 'text') {
        if (content.startsWith('[] ') || content.startsWith('[ ] ')) {
          const newContent = content.replace(/^\[\s?\]\s*/, '');
          updateBlock(block.id, { type: 'checkbox', content: newContent, checked: false });
          return;
        }
        if (content.startsWith('# ') && content.length > 2) {
          updateBlock(block.id, { type: 'h1', content: content.slice(2) });
          return;
        }
        if (content.startsWith('## ') && content.length > 3) {
          updateBlock(block.id, { type: 'h2', content: content.slice(3) });
          return;
        }
        if ((content.startsWith('- ') || content.startsWith('* ')) && content.length > 2) {
          updateBlock(block.id, { type: 'bullet', content: content.slice(2) });
          return;
        }
      }
    };
    
    const handleKeyDown = (e: React.KeyboardEvent, currentContent: string) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        
        // Sync content before creating new block
        if (currentContent !== block.content) {
          updateBlock(block.id, { content: currentContent });
        }
        
        // If empty list/checkbox, break out to text
        if ((block.type === 'checkbox' || block.type === 'bullet' || block.type === 'numbered') && !currentContent.trim()) {
          updateBlock(block.id, { type: 'text', content: '', checked: undefined });
          return;
        }
        
        const newType = block.type === 'checkbox' || block.type === 'bullet' || block.type === 'numbered' 
          ? block.type 
          : 'text';
        
        // Create linked task for checkbox with content (only if not already linked)
        if (block.type === 'checkbox' && currentContent.trim() && !block.taskId) {
          onAddTask({
            title: currentContent.trim(),
            description: `From note: ${note.title}`,
            status: block.checked ? 'done' : 'todo',
            priority: 'medium',
            moscow: 'should',
            due_date: note.date || format(new Date(), 'yyyy-MM-dd'),
            start_time: null,
            end_time: null,
            tags: 'from-note'
          }).then(taskId => {
            if (taskId) {
              updateBlock(block.id, { taskId });
            }
          });
        }
        
        addBlockAfter(block.id, newType);
      }
      
      if (e.key === 'Backspace' && !currentContent) {
        e.preventDefault();
        deleteBlock(block.id);
      }
      
      if (e.key === '/') {
        // Get cursor position
        const selection = window.getSelection();
        const cursorPos = selection?.focusOffset || 0;
        setShowSlashMenu(true);
        setSlashMenuBlockId(block.id);
        setSlashFilter('');
        setSlashStartPos(cursorPos);
      }
      
      if (e.key === 'Escape') {
        setShowSlashMenu(false);
        setSlashMenuBlockId(null);
        setSlashStartPos(null);
      }
      
      if (block.type === 'text' && currentContent === '[' && e.key === ']') {
        e.preventDefault();
        updateBlock(block.id, { type: 'checkbox', content: '', checked: false });
      }
    };
    
    const handleBlur = () => {
      const pendingContent = pendingContentRef.current[block.id];
      if (pendingContent !== undefined && pendingContent !== block.content) {
        updateBlock(block.id, { content: pendingContent });
      }
    };

    switch (block.type) {
      case 'checkbox':
        return (
          <div 
            key={block.id} 
            className={`flex items-center gap-2.5 py-1 group rounded-lg transition-colors ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-gray-50'} ${selectionClass}`}
            onClick={(e) => handleBlockSelect(block.id, e)}
          >
            <button
              onClick={(e) => { e.stopPropagation(); toggleCheckbox(block.id); }}
              className="flex-shrink-0 transition-all hover:scale-105"
            >
              {block.checked ? (
                <div className="w-5 h-5 rounded-md bg-emerald-500 flex items-center justify-center shadow-sm">
                  <Check size={12} className="text-white" strokeWidth={3} />
                </div>
              ) : (
                <div className={`w-5 h-5 rounded-md border-2 transition-colors ${isDark ? 'border-slate-600 hover:border-violet-400' : 'border-gray-300 hover:border-violet-500'}`} />
              )}
            </button>
            <EditableBlock
              initialContent={block.content}
              placeholder={placeholder}
              className={`outline-none flex-1 text-sm leading-relaxed ${block.checked ? `line-through ${isDark ? 'text-slate-500' : 'text-gray-400'}` : isDark ? 'text-slate-200' : 'text-gray-700'}`}
              onContentChange={handleContentChange}
              onKeyDown={handleKeyDown}
              onFocus={() => setFocusedBlockId(block.id)}
              onBlur={handleBlur}
              blockRef={(el) => { blockRefs.current[block.id] = el; }}
            />
            <button
              onClick={() => deleteBlock(block.id)}
              className={`opacity-0 group-hover:opacity-100 p-1 rounded transition-all ${isDark ? 'text-slate-500 hover:text-red-400 hover:bg-red-400/10' : 'text-gray-400 hover:text-red-500 hover:bg-red-50'}`}
            >
              <Trash2 size={14} />
            </button>
          </div>
        );

      case 'h1':
        return (
          <div 
            key={block.id} 
            className={`py-2 ${selectionClass}`}
            onClick={(e) => handleBlockSelect(block.id, e)}
          >
            <EditableBlock
              initialContent={block.content}
              placeholder={placeholder}
              className={`outline-none text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}
              onContentChange={handleContentChange}
              onKeyDown={handleKeyDown}
              onFocus={() => setFocusedBlockId(block.id)}
              onBlur={handleBlur}
              blockRef={(el) => { blockRefs.current[block.id] = el; }}
            />
          </div>
        );

      case 'h2':
        // Debug logging
        console.log('Rendering H2:', {
          noteType: note.note_type,
          content: block.content,
          isDateHeader: isDateHeader(block.content),
          parsedDate: parseDateHeader(block.content)
        });
        
        // Special rendering for date headers in daily planner
        if (note.note_type === 'daily_planner' && isDateHeader(block.content)) {
          const dateInfo = parseDateHeader(block.content);
          const isToday = block.content === format(new Date(), 'EEEE, MMMM d, yyyy');
          
          return (
            <div 
              key={block.id} 
              className={`flex items-center gap-4 pt-8 pb-4 first:pt-2 ${selectionClass}`}
              onClick={(e) => handleBlockSelect(block.id, e)}
            >
              {/* Date Badge - Loop style rounded square */}
              <div className={`flex-shrink-0 w-14 h-14 rounded-2xl flex flex-col items-center justify-center shadow-sm ${
                isToday 
                  ? 'bg-gradient-to-br from-violet-500 to-purple-600 text-white' 
                  : isDark ? 'bg-slate-800 text-slate-300 border border-slate-700' : 'bg-white text-gray-700 border border-gray-200'
              }`}>
                <span className="text-[10px] font-semibold uppercase tracking-wide opacity-80">
                  {dateInfo?.month}
                </span>
                <span className="text-xl font-bold leading-none">
                  {dateInfo?.date}
                </span>
              </div>
              
              {/* Date Title */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-base font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {dateInfo?.dayOfWeek}
                  </span>
                  {isToday && (
                    <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-500 rounded-full text-[10px] font-semibold uppercase tracking-wide">
                      Today
                    </span>
                  )}
                </div>
                <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                  {dateInfo?.month} {dateInfo?.date}, {dateInfo?.year}
                </div>
              </div>
            </div>
          );
        }
        
        // Regular h2 rendering
        return (
          <div 
            key={block.id} 
            className={`py-1.5 ${selectionClass}`}
            onClick={(e) => handleBlockSelect(block.id, e)}
          >
            <EditableBlock
              initialContent={block.content}
              placeholder={placeholder}
              className={`outline-none text-2xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}
              onContentChange={handleContentChange}
              onKeyDown={handleKeyDown}
              onFocus={() => setFocusedBlockId(block.id)}
              onBlur={handleBlur}
              blockRef={(el) => { blockRefs.current[block.id] = el; }}
            />
          </div>
        );

      case 'h3':
        // Special rendering for time period headers in daily planner
        if (note.note_type === 'daily_planner' && isTimePeriodHeader(block.content)) {
          const periodStyle = getTimePeriodStyle(block.content);
          const periodName = block.content.replace(/[🌅☀️🌆🌙]\s*/, '');
          const isCurrentPeriod = block.content === getTimePeriod();
          
          return (
            <div 
              key={block.id} 
              className={`flex items-center gap-2 py-2 mt-3 mb-1 ${selectionClass}`}
              onClick={(e) => handleBlockSelect(block.id, e)}
            >
              <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${periodStyle.bg} ${periodStyle.text}`}>
                <span>{periodStyle.icon}</span>
                <span>{periodName}</span>
                {isCurrentPeriod && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" title="Now" />
                )}
              </div>
              <div className={`flex-1 h-px ${isDark ? 'bg-gradient-to-r from-slate-700 to-transparent' : 'bg-gradient-to-r from-gray-200 to-transparent'}`} />
            </div>
          );
        }
        
        // Regular h3 rendering
        return (
          <div 
            key={block.id} 
            className={`py-1 ${selectionClass}`}
            onClick={(e) => handleBlockSelect(block.id, e)}
          >
            <EditableBlock
              initialContent={block.content}
              placeholder={placeholder}
              className={`outline-none text-xl font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}
              onContentChange={handleContentChange}
              onKeyDown={handleKeyDown}
              onFocus={() => setFocusedBlockId(block.id)}
              onBlur={handleBlur}
              blockRef={(el) => { blockRefs.current[block.id] = el; }}
            />
          </div>
        );

      case 'bullet':
        return (
          <div 
            key={block.id} 
            className={`flex items-start gap-2.5 py-0.5 group rounded-lg transition-colors ${isDark ? 'hover:bg-slate-800/30' : 'hover:bg-gray-50'} ${selectionClass}`}
            onClick={(e) => handleBlockSelect(block.id, e)}
          >
            <span className={`mt-2 w-1.5 h-1.5 rounded-full flex-shrink-0 ${isDark ? 'bg-slate-500' : 'bg-gray-400'}`} />
            <EditableBlock
              initialContent={block.content}
              placeholder={placeholder}
              className={`outline-none flex-1 text-sm leading-relaxed ${isDark ? 'text-slate-200' : 'text-gray-700'}`}
              onContentChange={handleContentChange}
              onKeyDown={handleKeyDown}
              onFocus={() => setFocusedBlockId(block.id)}
              onBlur={handleBlur}
              blockRef={(el) => { blockRefs.current[block.id] = el; }}
            />
          </div>
        );

      case 'numbered':
        return (
          <div 
            key={block.id} 
            className={`flex items-start gap-2.5 py-0.5 group rounded-lg transition-colors ${isDark ? 'hover:bg-slate-800/30' : 'hover:bg-gray-50'} ${selectionClass}`}
            onClick={(e) => handleBlockSelect(block.id, e)}
          >
            <span className={`flex-shrink-0 w-5 text-right text-sm ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>{index + 1}.</span>
            <EditableBlock
              initialContent={block.content}
              placeholder={placeholder}
              className={`outline-none flex-1 text-sm leading-relaxed ${isDark ? 'text-slate-200' : 'text-gray-700'}`}
              onContentChange={handleContentChange}
              onKeyDown={handleKeyDown}
              onFocus={() => setFocusedBlockId(block.id)}
              onBlur={handleBlur}
              blockRef={(el) => { blockRefs.current[block.id] = el; }}
            />
          </div>
        );

      default: // text
        return (
          <div 
            key={block.id} 
            className={`py-0.5 relative rounded-lg transition-colors ${isDark ? 'hover:bg-slate-800/20' : 'hover:bg-gray-50/50'} ${selectionClass}`}
            onClick={(e) => handleBlockSelect(block.id, e)}
          >
            <EditableBlock
              initialContent={block.content}
              placeholder={placeholder}
              className={`outline-none min-h-[1.5em] text-sm leading-relaxed ${isDark ? 'text-slate-300' : 'text-gray-600'} ${!block.content ? 'empty-block' : ''}`}
              onContentChange={handleContentChange}
              onKeyDown={handleKeyDown}
              onFocus={() => setFocusedBlockId(block.id)}
              onBlur={handleBlur}
              blockRef={(el) => { blockRefs.current[block.id] = el; }}
            />
            {/* Slash menu */}
            {showSlashMenu && slashMenuBlockId === block.id && (
              <div className={`absolute left-0 top-full mt-1 rounded-xl shadow-xl z-50 w-56 overflow-hidden border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
                {slashFilter && (
                  <div className={`px-3 py-1.5 text-xs border-b ${isDark ? 'border-slate-700 text-slate-400' : 'border-gray-100 text-gray-500'}`}>
                    Filtering: <span className={`font-medium ${isDark ? 'text-violet-400' : 'text-violet-600'}`}>/{slashFilter}</span>
                  </div>
                )}
                <div className="max-h-64 overflow-y-auto p-1">
                  {filteredCommands.length > 0 ? (
                    filteredCommands.map((cmd) => (
                      <button
                        key={cmd.id}
                        onClick={() => applySlashCommand(cmd.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left ${isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-50'}`}
                      >
                        <div className={`p-1.5 rounded-lg ${isDark ? 'bg-slate-700' : 'bg-gray-100'}`}>
                          <cmd.icon size={14} className={isDark ? 'text-slate-400' : 'text-gray-500'} />
                        </div>
                        <div>
                          <div className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{cmd.label}</div>
                          <div className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>{cmd.description}</div>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className={`px-3 py-2 text-sm ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                      No commands found
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
    }
  };

  // Only show placeholder on first empty text block
  const getPlaceholder = (type: ContentBlock['type'], blockId: string): string => {
    switch (type) {
      case 'checkbox': return 'To-do...';
      case 'h1': return 'Heading 1';
      case 'h2': return 'Heading 2';
      case 'h3': return 'Heading 3';
      case 'bullet': return 'List item';
      case 'numbered': return 'List item';
      default:
        // Only show hint on first block
        const firstEmptyBlock = blocks.find(b => b.type === 'text' && !b.content);
        if (firstEmptyBlock && firstEmptyBlock.id === blockId) {
          return "Type '/' for commands, '[]' for checkbox, '#' for heading...";
        }
        return '';
    }
  };

  return (
    <div className={`flex flex-col h-full overflow-hidden ${isDark ? 'bg-slate-950' : 'bg-white'}`}>
      {/* Note Header - Loop style minimal header */}
      <div className={`flex items-center justify-between px-6 py-3 border-b ${isDark ? 'border-slate-800/60 bg-slate-950' : 'border-gray-100 bg-white'}`}>
        <div className="flex items-center gap-3">
          {note.note_type === 'daily_planner' && (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium ${isDark ? 'bg-violet-500/15 text-violet-400 border border-violet-500/20' : 'bg-violet-50 text-violet-600 border border-violet-100'}`}>
              <Calendar size={14} />
              <span>Daily Planner - Running Journal</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          {/* Add Existing Tasks button - only for daily planner */}
          {note.note_type === 'daily_planner' && (
            <button
              onClick={() => setShowExistingTaskPicker(true)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${isDark ? 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/20' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-100'}`}
              title="Add existing tasks to today's list"
            >
              <ListPlus size={14} />
              <span>Add Tasks</span>
            </button>
          )}
          <button
            onClick={() => onUpdateNote({ is_pinned: !note.is_pinned })}
            className={`p-2 rounded-lg transition-all ${
              note.is_pinned
                ? 'text-amber-400 bg-amber-400/15'
                : isDark ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-800' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
            }`}
            title={note.is_pinned ? 'Unpin' : 'Pin'}
          >
            <Pin size={16} />
          </button>
          <button
            onClick={() => {
              if (confirm('Delete this note?')) {
                onDeleteNote();
              }
            }}
            className={`p-2 rounded-lg transition-all ${isDark ? 'text-slate-500 hover:text-red-400 hover:bg-red-400/10' : 'text-gray-400 hover:text-red-500 hover:bg-red-50'}`}
            title="Delete"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Infinite Canvas - Loop style clean background */}
      <div 
        ref={containerRef}
        className={`flex-1 overflow-y-auto ${isDark ? 'bg-slate-900/50' : 'bg-gray-50/50'}`}
        tabIndex={0}
        onKeyDown={handleContainerKeyDown}
        onClick={(e) => {
          // Click on empty space adds new block at end
          if (e.target === containerRef.current || (e.target as HTMLElement).classList.contains('canvas-area')) {
            const lastBlock = blocks[blocks.length - 1];
            if (lastBlock && lastBlock.content === '') {
              blockRefs.current[lastBlock.id]?.focus();
            } else {
              addBlockAfter(blocks[blocks.length - 1]?.id || '', 'text');
            }
          }
        }}
      >
        <div className={`max-w-2xl mx-auto px-6 py-8 canvas-area min-h-full ${allSelected ? 'ring-2 ring-violet-500/50 bg-violet-500/5 rounded-xl' : ''}`}>
          {/* Title - hide for daily planner as it has a fixed name */}
          {note.note_type !== 'daily_planner' && (
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Untitled"
              className={`w-full text-3xl font-bold bg-transparent border-none outline-none mb-6 ${isDark ? 'text-white placeholder-slate-600' : 'text-gray-900 placeholder-gray-400'}`}
            />
          )}

          {/* Daily Planner specific hint */}
          {note.note_type === 'daily_planner' && blocks.length <= 3 && (
            <div className={`text-xs mb-6 flex items-center gap-2 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
              <span className="inline-block w-1 h-1 rounded-full bg-violet-500" />
              <span>Your running daily journal. New date and time-of-day headers are added automatically.</span>
            </div>
          )}

          {/* Hint - only show when no content (for regular notes) */}
          {note.note_type !== 'daily_planner' && blocks.length <= 1 && !blocks[0]?.content && (
            <div className={`text-xs mb-6 flex items-center gap-4 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
              <span>Type <kbd className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-gray-100 text-gray-500'}`}>/</kbd> for commands</span>
              <span>Type <kbd className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-gray-100 text-gray-500'}`}>[]</kbd> for checkbox</span>
              <span>Type <kbd className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-gray-100 text-gray-500'}`}>#</kbd> for heading</span>
            </div>
          )}

          {/* Blocks */}
          <div className={`space-y-0.5 ${allSelected ? 'select-all-highlight' : ''}`}>
            {blocks.map((block, index) => renderBlock(block, index))}
          </div>

          {/* Selection indicator */}
          {allSelected && (
            <div className="text-xs text-violet-400 mt-4 flex items-center gap-2">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-violet-400" />
              <span>All content selected. Press Delete or Backspace to remove. Esc to cancel.</span>
            </div>
          )}

          {/* Click area to add more */}
          <div className="canvas-area min-h-[200px]" />
        </div>
      </div>

      {/* Styles for empty placeholders */}
      <style>{`
        .empty-block:empty::before {
          content: attr(data-placeholder);
          color: ${isDark ? '#64748b' : '#9ca3af'};
          pointer-events: none;
        }
        [contenteditable]:empty::before {
          content: attr(data-placeholder);
          color: ${isDark ? '#64748b' : '#9ca3af'};
          pointer-events: none;
        }
        .select-all-highlight [contenteditable],
        .select-all-highlight .flex {
          background-color: rgba(139, 92, 246, 0.1);
          border-radius: 6px;
        }
      `}</style>

      {/* Existing Task Picker Modal */}
      <ExistingTaskPicker
        isOpen={showExistingTaskPicker}
        onClose={() => setShowExistingTaskPicker(false)}
        tasks={tasks}
        alreadyLinkedTaskIds={alreadyLinkedTaskIds}
        onAddTasks={handleAddExistingTasks}
      />

      {/* Copilot inline prompt */}
      {copilotPrompt.show && (
        <div
          className={`fixed z-50 rounded-xl border shadow-2xl p-4 w-96 ${
            isDark ? 'bg-slate-800 border-slate-700 shadow-black/50' : 'bg-white border-gray-200 shadow-gray-200/50'
          }`}
          style={{
            left: copilotPrompt.blockId && blockRefs.current[copilotPrompt.blockId]
              ? Math.min(
                  blockRefs.current[copilotPrompt.blockId]!.getBoundingClientRect().left,
                  window.innerWidth - 420
                )
              : '50%',
            top: copilotPrompt.blockId && blockRefs.current[copilotPrompt.blockId]
              ? blockRefs.current[copilotPrompt.blockId]!.getBoundingClientRect().top
              : '50%',
            transform: (copilotPrompt.blockId && blockRefs.current[copilotPrompt.blockId]) ? undefined : 'translate(-50%, -50%)',
          }}
          onMouseDown={e => e.stopPropagation()}
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-gray-800'}`}>
              AI Copilot
            </span>
            {copilotLoading && (
              <Loader2 className="w-3.5 h-3.5 text-violet-400 animate-spin ml-auto" />
            )}
          </div>
          <div className={`flex gap-2 items-center rounded-lg border px-3 py-2 ${
            isDark ? 'bg-slate-900/50 border-slate-600' : 'bg-gray-50 border-gray-200'
          }`}>
            <input
              ref={copilotInputRef}
              type="text"
              value={copilotInput}
              onChange={e => setCopilotInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleCopilotSubmit(); }
                if (e.key === 'Escape') handleCopilotCancel();
              }}
              placeholder="Ask AI to generate content…"
              className={`flex-1 bg-transparent text-sm outline-none ${
                isDark ? 'text-slate-200 placeholder-slate-500' : 'text-gray-800 placeholder-gray-400'
              }`}
              disabled={copilotLoading}
            />
            <button
              onClick={handleCopilotSubmit}
              disabled={!copilotInput.trim() || copilotLoading}
              className="flex-shrink-0 w-7 h-7 rounded-lg bg-violet-600 hover:bg-violet-500 text-white flex items-center justify-center transition-colors disabled:opacity-40"
            >
              {copilotLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            </button>
          </div>
          <div className="flex items-center justify-between mt-2">
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: 'Summarize today', prompt: 'Summarize my tasks and activity for today as a brief daily note recap' },
                { label: 'Meeting notes', prompt: 'Create a meeting notes template with date, attendees, agenda, notes, and action items sections' },
                { label: 'Brainstorm', prompt: 'Help me brainstorm ideas — create a structured brainstorming section' },
              ].map(chip => (
                <button
                  key={chip.label}
                  onClick={() => setCopilotInput(chip.prompt)}
                  disabled={copilotLoading}
                  className={`text-[10px] px-2 py-1 rounded-md transition-colors ${
                    isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-400' : 'bg-gray-100 hover:bg-gray-200 text-gray-500'
                  } disabled:opacity-40`}
                >
                  {chip.label}
                </button>
              ))}
            </div>
            <button
              onClick={handleCopilotCancel}
              className={`text-[10px] px-2 py-1 rounded-md transition-colors ${
                isDark ? 'text-slate-500 hover:text-slate-300' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const NotesLayout: React.FC<NotesLayoutProps> = ({
  notes,
  tasks,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
  onTogglePin,
  onAddTask,
  onUpdateTask
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'daily_planner' | 'regular' | 'weekly_planner_archive'>('all');

  // Sort notes: pinned first, then by updated_at (exclude archived from main view unless filtered)
  const sortedNotes = [...notes]
    .filter(n => filterType === 'weekly_planner_archive' || n.note_type !== 'weekly_planner_archive')
    .sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });

  // Auto-select first note when notes change
  useEffect(() => {
    if (sortedNotes.length > 0 && !selectedNote) {
      setSelectedNote(sortedNotes[0]);
    } else if (selectedNote) {
      // Re-sync selected note with latest data
      const updatedNote = notes.find(n => n.id === selectedNote.id);
      if (updatedNote) {
        setSelectedNote(updatedNote);
      } else {
        setSelectedNote(sortedNotes[0] || null);
      }
    }
  }, [notes]);

  // Filter notes
  const filteredNotes = sortedNotes.filter(note => {
    const matchesSearch = !searchQuery || 
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (note.content && note.content.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesType = filterType === 'all' || note.note_type === filterType;
    
    return matchesSearch && matchesType;
  });

  // Generate a summary of completed tasks for the previous week
  const generateWeeklySummary = useCallback((previousWeekNote: Note | null): string => {
    if (!previousWeekNote || !previousWeekNote.content) {
      return '';
    }
    
    // Parse content to find completed checkboxes
    const lines = previousWeekNote.content.split('\n');
    const completedTasks: string[] = [];
    let currentDate = '';
    
    for (const line of lines) {
      // Track date headers
      if (line.startsWith('## ')) {
        currentDate = line.slice(3).trim();
      }
      // Find completed checkboxes
      const checkMatch = line.match(/^\[x\]\s*(.+?)(?:\s*<!--.*-->)?$/i);
      if (checkMatch) {
        completedTasks.push(`• ${checkMatch[1].trim()}`);
      }
    }
    
    if (completedTasks.length === 0) {
      return '### 📊 Last Week Review\n_No completed tasks from last week._\n';
    }
    
    const summary = [
      '### 📊 Last Week Review',
      `_${completedTasks.length} tasks completed last week:_`,
      '',
      ...completedTasks.slice(0, 10), // Limit to 10 items
      completedTasks.length > 10 ? `_...and ${completedTasks.length - 10} more_` : '',
      '',
    ].filter(Boolean).join('\n');
    
    return summary;
  }, []);

  // Get the week start date (Sunday) for a given date
  const getWeekStartDate = (date: Date): Date => {
    return startOfWeek(date, { weekStartsOn: 0 }); // 0 = Sunday
  };

  // Check if current week's planner exists
  const getCurrentWeekPlanner = useCallback((): Note | null => {
    const now = new Date();
    const currentWeekStart = getWeekStartDate(now);
    
    return notes.find(n => {
      if (n.note_type !== 'daily_planner') return false;
      if (!n.date) return false;
      
      try {
        const noteDate = parseISO(n.date);
        return isSameWeek(noteDate, now, { weekStartsOn: 0 });
      } catch {
        return false;
      }
    }) || null;
  }, [notes]);

  // Get previous week's planner (for archiving)
  const getPreviousWeekPlanner = useCallback((): Note | null => {
    const now = new Date();
    const currentWeekStart = getWeekStartDate(now);
    
    // Find any daily_planner from a previous week
    return notes.find(n => {
      if (n.note_type !== 'daily_planner') return false;
      if (!n.date) return false;
      
      try {
        const noteDate = parseISO(n.date);
        return !isSameWeek(noteDate, now, { weekStartsOn: 0 });
      } catch {
        return false;
      }
    }) || null;
  }, [notes]);

  const handleCreateNote = (type: 'regular' | 'daily_planner') => {
    const now = new Date();
    const weekStart = getWeekStartDate(now);
    const weekStartStr = format(weekStart, 'yyyy-MM-dd');
    const weekEnd = endOfWeek(now, { weekStartsOn: 0 });
    
    // For daily/weekly planner - one per week
    if (type === 'daily_planner') {
      // Check if we have a planner for the current week
      const currentWeekPlanner = getCurrentWeekPlanner();
      
      if (currentWeekPlanner) {
        setSelectedNote(currentWeekPlanner);
        return;
      }
      
      // Check for previous week's planner to archive
      const previousWeekPlanner = getPreviousWeekPlanner();
      
      // Generate weekly summary from previous planner
      const weeklySummary = generateWeeklySummary(previousWeekPlanner);
      
      // Archive the previous week's planner
      if (previousWeekPlanner) {
        const prevWeekStart = previousWeekPlanner.date ? parseISO(previousWeekPlanner.date) : new Date();
        const archiveTitle = `Week of ${format(prevWeekStart, 'MMM d')} - ${format(endOfWeek(prevWeekStart, { weekStartsOn: 0 }), 'MMM d, yyyy')} (Archived)`;
        
        onUpdateNote(previousWeekPlanner.id, {
          title: archiveTitle,
          note_type: 'weekly_planner_archive',
          is_pinned: false
        });
      }
      
      // Create new Weekly Planner
      const weekTitle = `Week of ${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;
      const todayHeader = `## ${format(now, 'EEEE, MMMM d, yyyy')}\n`;
      
      // Build initial content with summary if available
      let initialContent = '';
      if (weeklySummary && getDay(now) === 0) { // Only show summary on Sunday
        initialContent = weeklySummary + '\n---\n\n' + todayHeader;
      } else {
        initialContent = todayHeader;
      }
      
      const newNote: Omit<Note, 'id' | 'created_at' | 'updated_at'> = {
        title: weekTitle,
        content: initialContent,
        tags: null,
        is_pinned: true, // Auto-pin the weekly planner
        color: 'default',
        note_type: 'daily_planner',
        date: weekStartStr,
        checklist_items: []
      };
      onAddNote(newNote);
      return;
    }
    
    const newNote: Omit<Note, 'id' | 'created_at' | 'updated_at'> = {
      title: 'Untitled Note',
      content: '',
      tags: null,
      is_pinned: false,
      color: 'default',
      note_type: type,
      date: null,
      checklist_items: []
    };
    onAddNote(newNote);
  };

  return (
    <div className="flex h-full">
      {/* Sidebar - Notes List */}
      <div className={`w-72 border-r flex flex-col ${isDark ? 'border-slate-800 bg-slate-950' : 'border-gray-200 bg-gray-50'}`}>
        {/* Search & Filter Header */}
        <div className={`p-4 space-y-3 border-b ${isDark ? 'border-slate-800' : 'border-gray-200'}`}>
          {/* Search */}
          <div className="relative">
            <Search size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-500' : 'text-gray-400'}`} />
            <input
              type="text"
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-9 pr-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 ${isDark ? 'bg-slate-900 border border-slate-800 text-white placeholder-slate-500' : 'bg-white border border-gray-200 text-gray-900 placeholder-gray-400'}`}
            />
          </div>

          {/* Filter Tabs */}
          <div className={`flex gap-1 p-1 rounded-lg ${isDark ? 'bg-slate-900' : 'bg-gray-100'}`}>
            <button
              onClick={() => setFilterType('all')}
              className={`flex-1 py-1.5 px-2 rounded-md text-xs font-medium transition-all ${
                filterType === 'all'
                  ? 'bg-violet-600 text-white shadow-sm'
                  : isDark ? 'text-slate-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterType('daily_planner')}
              className={`flex-1 py-1.5 px-2 rounded-md text-xs font-medium transition-all ${
                filterType === 'daily_planner'
                  ? 'bg-violet-600 text-white shadow-sm'
                  : isDark ? 'text-slate-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Weekly
            </button>
            <button
              onClick={() => setFilterType('regular')}
              className={`flex-1 py-1.5 px-2 rounded-md text-xs font-medium transition-all ${
                filterType === 'regular'
                  ? 'bg-violet-600 text-white shadow-sm'
                  : isDark ? 'text-slate-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Notes
            </button>
            <button
              onClick={() => setFilterType('weekly_planner_archive')}
              className={`py-1.5 px-2 rounded-md text-xs font-medium transition-all ${
                filterType === 'weekly_planner_archive'
                  ? 'bg-violet-600 text-white shadow-sm'
                  : isDark ? 'text-slate-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'
              }`}
              title="Archived Weeks"
            >
              <Archive size={12} />
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => handleCreateNote('daily_planner')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium transition-all ${isDark ? 'bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 border border-blue-500/20' : 'bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-100'}`}
              title="Weekly Planner"
            >
              <Calendar size={14} />
              <span>Weekly</span>
            </button>
            <button
              onClick={() => handleCreateNote('regular')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium transition-all ${isDark ? 'bg-violet-500/15 text-violet-400 hover:bg-violet-500/25 border border-violet-500/20' : 'bg-violet-50 text-violet-600 hover:bg-violet-100 border border-violet-100'}`}
              title="New Note"
            >
              <FileText size={14} />
              <span>Note</span>
            </button>
          </div>
        </div>

        {/* Notes List */}
        <div className="flex-1 overflow-y-auto">
          <NotesSidebar
            notes={filteredNotes}
            selectedNote={selectedNote}
            onSelectNote={setSelectedNote}
            onDeleteNote={onDeleteNote}
            onTogglePin={onTogglePin}
          />
        </div>
      </div>

      {/* Main Content Area */}
      <div className={`flex-1 ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
        {selectedNote ? (
          <NoteContentView
            note={selectedNote}
            tasks={tasks}
            onUpdateNote={(updates) => onUpdateNote(selectedNote.id, updates)}
            onAddTask={onAddTask}
            onUpdateTask={onUpdateTask}
            onDeleteNote={() => {
              onDeleteNote(selectedNote.id);
              setSelectedNote(null);
            }}
          />
        ) : (
          <div className={`flex items-center justify-center h-full ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            <div className="text-center">
              <FileText className={`w-16 h-16 mx-auto mb-4 ${isDark ? 'text-slate-700' : 'text-gray-300'}`} />
              <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>No note selected</h3>
              <p className="text-sm mb-6">Select a note from the sidebar or create a new one</p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => handleCreateNote('daily_planner')}
                  className={`flex items-center gap-2 py-2 px-4 rounded-lg text-sm font-medium transition-all ${isDark ? 'bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 border border-blue-500/20' : 'bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-100'}`}
                >
                  <Calendar size={16} />
                  Weekly Planner
                </button>
                <button
                  onClick={() => handleCreateNote('regular')}
                  className={`flex items-center gap-2 py-2 px-4 rounded-lg text-sm font-medium transition-all ${isDark ? 'bg-violet-500/15 text-violet-400 hover:bg-violet-500/25 border border-violet-500/20' : 'bg-violet-50 text-violet-600 hover:bg-violet-100 border border-violet-100'}`}
                >
                  <FileText size={16} />
                  New Note
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotesLayout;
