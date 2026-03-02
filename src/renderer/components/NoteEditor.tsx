import React, { useState, useEffect } from 'react';
import { X, Pin, Palette, Tag as TagIcon } from 'lucide-react';
import { Note, NoteColor, noteColorClasses } from '../types/notes';
import RichTextEditor from './RichTextEditor';
import TagInput from './TagInput';

interface NoteEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (note: Omit<Note, 'id' | 'created_at' | 'updated_at'>) => void;
  editingNote?: Note | null;
}

const colorOptions: { value: NoteColor; label: string; class: string }[] = [
  { value: 'default', label: 'Default', class: 'bg-[#2a2a3e]' },
  { value: 'red', label: 'Red', class: 'bg-red-600' },
  { value: 'orange', label: 'Orange', class: 'bg-orange-600' },
  { value: 'yellow', label: 'Yellow', class: 'bg-yellow-600' },
  { value: 'green', label: 'Green', class: 'bg-green-600' },
  { value: 'blue', label: 'Blue', class: 'bg-blue-600' },
  { value: 'purple', label: 'Purple', class: 'bg-purple-600' },
  { value: 'pink', label: 'Pink', class: 'bg-pink-600' },
];

const NoteEditor: React.FC<NoteEditorProps> = ({ isOpen, onClose, onSubmit, editingNote }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [isPinned, setIsPinned] = useState(false);
  const [color, setColor] = useState<NoteColor>('default');
  const [showColorPicker, setShowColorPicker] = useState(false);

  useEffect(() => {
    if (editingNote) {
      setTitle(editingNote.title);
      setContent(editingNote.content || '');
      setTags(editingNote.tags ? editingNote.tags.split(',').map(t => t.trim()) : []);
      setIsPinned(editingNote.is_pinned);
      setColor(editingNote.color);
    } else {
      resetForm();
    }
  }, [editingNote, isOpen]);

  const resetForm = () => {
    setTitle('');
    setContent('');
    setTags([]);
    setIsPinned(false);
    setColor('default');
    setShowColorPicker(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() && !content.trim()) {
      onClose();
      return;
    }

    onSubmit({
      title: title.trim() || 'Untitled',
      content: content.trim() || null,
      tags: tags.length > 0 ? tags.join(',') : null,
      is_pinned: isPinned,
      color,
    });
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  const colorClasses = noteColorClasses[color] || noteColorClasses.default;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm p-4">
      <div className={`${colorClasses.bg} ${colorClasses.border} border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col`}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#3a3a4e]">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-white">
              {editingNote ? 'Edit Note' : 'New Note'}
            </h2>
            
            {/* Pin button */}
            <button
              type="button"
              onClick={() => setIsPinned(!isPinned)}
              className={`p-2 rounded-lg transition-colors ${
                isPinned 
                  ? 'text-yellow-400 bg-yellow-400/20' 
                  : 'text-gray-400 hover:text-yellow-400 hover:bg-[#3a3a4e]'
              }`}
              title={isPinned ? 'Unpin' : 'Pin'}
            >
              <Pin size={18} className={isPinned ? 'fill-current' : ''} />
            </button>

            {/* Color picker */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowColorPicker(!showColorPicker)}
                className="p-2 text-gray-400 hover:text-white hover:bg-[#3a3a4e] rounded-lg transition-colors"
                title="Change color"
              >
                <Palette size={18} />
              </button>
              
              {showColorPicker && (
                <div className="absolute top-full left-0 mt-2 p-2 bg-[#1e1e2e] border border-[#3a3a4e] rounded-lg shadow-xl z-10 grid grid-cols-4 gap-2">
                  {colorOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setColor(option.value);
                        setShowColorPicker(false);
                      }}
                      className={`w-8 h-8 rounded-full ${option.class} border-2 ${
                        color === option.value ? 'border-white' : 'border-transparent'
                      } hover:scale-110 transition-transform`}
                      title={option.label}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={22} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {/* Title */}
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Note title..."
              className="w-full px-0 py-2 bg-transparent border-none text-xl font-semibold text-white placeholder-gray-500 focus:outline-none"
              autoFocus
            />

            {/* Content */}
            <div className="min-h-[200px]">
              <RichTextEditor
                content={content}
                onChange={setContent}
                placeholder="Write your note..."
              />
            </div>

            {/* Tags */}
            <div className="pt-4 border-t border-[#3a3a4e]">
              <label className="flex items-center gap-2 text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">
                <TagIcon size={14} />
                Tags
              </label>
              <TagInput tags={tags} onChange={setTags} />
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-[#3a3a4e] flex justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 bg-[#2a2a3e] hover:bg-[#3a3a4e] text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              {editingNote ? 'Save' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NoteEditor;
