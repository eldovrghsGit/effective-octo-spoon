import React, { useState, useEffect } from 'react';
import { Pin, Trash2, Check, Square, Tag as TagIcon, Calendar } from 'lucide-react';
import { Note, ChecklistItem } from '../../types/notes';
import { Task } from '../../App';
import { format } from 'date-fns';

interface NotesEditorProps {
  note: Note;
  onUpdateNote: (id: number, updates: Partial<Note>) => void;
  onDeleteNote: (id: number) => void;
  onSyncChecklistToTask: (noteId: number, checklistItemId: string) => void;
  tasks: Task[];
}

const NotesEditor: React.FC<NotesEditorProps> = ({
  note,
  onUpdateNote,
  onDeleteNote,
  onSyncChecklistToTask,
  tasks
}) => {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content || '');
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>(
    note.checklist_items ? JSON.parse(note.checklist_items as any) : []
  );

  // Auto-save title
  useEffect(() => {
    if (title !== note.title) {
      const timer = setTimeout(() => {
        onUpdateNote(note.id, { title });
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [title, note.title, note.id, onUpdateNote]);

  // Auto-save content
  useEffect(() => {
    if (content !== note.content) {
      const timer = setTimeout(() => {
        onUpdateNote(note.id, { content });
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [content, note.content, note.id, onUpdateNote]);

  // Auto-save checklist
  useEffect(() => {
    const currentChecklistStr = JSON.stringify(note.checklist_items);
    const newChecklistStr = JSON.stringify(checklistItems);
    
    if (newChecklistStr !== currentChecklistStr) {
      const timer = setTimeout(() => {
        onUpdateNote(note.id, { 
          checklist_items: checklistItems as any
        });
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [checklistItems, note.checklist_items, note.id, onUpdateNote]);

  const handleAddChecklistItem = () => {
    const newItem: ChecklistItem = {
      id: `checklist-${Date.now()}`,
      text: '',
      completed: false,
      taskId: null
    };
    setChecklistItems([...checklistItems, newItem]);
  };

  const handleToggleChecklistItem = (id: string) => {
    setChecklistItems(items =>
      items.map(item =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
    
    // If has taskId, update the task status
    const item = checklistItems.find(i => i.id === id);
    if (item?.taskId) {
      const task = tasks.find(t => t.id === item.taskId);
      if (task) {
        // This would need to call onUpdateTask from parent
        // For now, just mark as done/todo
      }
    }
  };

  const handleUpdateChecklistText = (id: string, text: string) => {
    setChecklistItems(items =>
      items.map(item =>
        item.id === id ? { ...item, text } : item
      )
    );
  };

  const handleDeleteChecklistItem = (id: string) => {
    setChecklistItems(items => items.filter(item => item.id !== id));
  };

  const handleSyncToTask = (checklistItemId: string) => {
    onSyncChecklistToTask(note.id, checklistItemId);
  };

  return (
    <div className="flex-1 flex flex-col bg-[#16213e]">
      {/* Header */}
      <div className="h-16 px-6 border-b border-[#2a2a3e] flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {note.note_type === 'daily_planner' && note.date && (
            <div className="flex items-center gap-2 px-3 py-1 bg-blue-500/20 text-blue-400 rounded-lg text-sm">
              <Calendar size={14} />
              <span>{format(new Date(note.date), 'MMM d, yyyy')}</span>
            </div>
          )}
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="flex-1 bg-transparent text-xl font-bold text-white focus:outline-none"
            placeholder="Untitled Note"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onUpdateNote(note.id, { is_pinned: !note.is_pinned })}
            className={`p-2 rounded-lg transition-colors ${
              note.is_pinned
                ? 'text-purple-400 bg-purple-500/20'
                : 'text-gray-400 hover:text-white hover:bg-[#2a2a3e]'
            }`}
            title={note.is_pinned ? 'Unpin' : 'Pin'}
          >
            <Pin size={18} />
          </button>
          <button
            onClick={() => onDeleteNote(note.id)}
            className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
            title="Delete"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-6 space-y-6">
          {/* Checklist Section */}
          {checklistItems.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
                Checklist
              </h3>
              {checklistItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 p-3 bg-[#1a1a2e] rounded-lg group hover:bg-[#2a2a3e] transition-colors"
                >
                  <button
                    onClick={() => handleToggleChecklistItem(item.id)}
                    className="mt-0.5 flex-shrink-0"
                  >
                    {item.completed ? (
                      <Check size={18} className="text-green-400" />
                    ) : (
                      <Square size={18} className="text-gray-500" />
                    )}
                  </button>
                  <input
                    type="text"
                    value={item.text}
                    onChange={(e) => handleUpdateChecklistText(item.id, e.target.value)}
                    className={`flex-1 bg-transparent text-white focus:outline-none ${
                      item.completed ? 'line-through text-gray-500' : ''
                    }`}
                    placeholder="Checklist item..."
                  />
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!item.taskId && (
                      <button
                        onClick={() => handleSyncToTask(item.id)}
                        className="p-1 text-blue-400 hover:bg-blue-500/20 rounded text-xs"
                        title="Sync to Tasks"
                      >
                        Sync
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteChecklistItem(item.id)}
                      className="p-1 text-red-400 hover:bg-red-500/20 rounded"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={handleAddChecklistItem}
            className="text-sm text-purple-400 hover:text-purple-300 flex items-center gap-2"
          >
            <Square size={16} />
            Add Checklist Item
          </button>

          {/* Main Content - Infinite Long Textarea */}
          <div>
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Notes
            </h3>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full min-h-[500px] bg-transparent text-white resize-none focus:outline-none leading-relaxed"
              placeholder="Start writing..."
              style={{ height: 'auto', minHeight: '500px' }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = target.scrollHeight + 'px';
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotesEditor;
