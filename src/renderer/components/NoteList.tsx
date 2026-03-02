import React from 'react';
import NoteCard from './NoteCard';
import { Note } from '../types/notes';
import { Pin, FileText } from 'lucide-react';

interface NoteListProps {
  notes: Note[];
  onEdit: (note: Note) => void;
  onDelete: (id: number) => void;
  onTogglePin: (id: number, isPinned: boolean) => void;
}

const NoteList: React.FC<NoteListProps> = ({ notes, onEdit, onDelete, onTogglePin }) => {
  if (notes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
        <FileText className="w-16 h-16 mb-4 opacity-50" />
        <h3 className="text-xl font-semibold mb-2">No notes yet</h3>
        <p className="text-sm">Click "Add Note" to create your first note</p>
      </div>
    );
  }

  // Separate pinned and unpinned notes
  const pinnedNotes = notes.filter(note => note.is_pinned);
  const unpinnedNotes = notes.filter(note => !note.is_pinned);

  return (
    <div className="space-y-6">
      {/* Pinned Notes Section */}
      {pinnedNotes.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
            <Pin className="w-4 h-4 text-yellow-400" />
            <span className="text-sm font-semibold text-yellow-400">Pinned</span>
            <span className="text-xs text-gray-500 ml-auto">
              {pinnedNotes.length} note{pinnedNotes.length !== 1 ? 's' : ''}
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pl-2">
            {pinnedNotes.map((note, index) => (
              <div 
                key={note.id} 
                className="animate-fade-in"
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <NoteCard
                  note={note}
                  onEdit={() => onEdit(note)}
                  onDelete={() => onDelete(note.id)}
                  onTogglePin={() => onTogglePin(note.id, !note.is_pinned)}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Other Notes Section */}
      {unpinnedNotes.length > 0 && (
        <div className="space-y-3">
          {pinnedNotes.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-500/10 border border-gray-500/30">
              <FileText className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-semibold text-gray-400">Other Notes</span>
              <span className="text-xs text-gray-500 ml-auto">
                {unpinnedNotes.length} note{unpinnedNotes.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}
          
          <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 ${pinnedNotes.length > 0 ? 'pl-2' : ''}`}>
            {unpinnedNotes.map((note, index) => (
              <div 
                key={note.id} 
                className="animate-fade-in"
                style={{ animationDelay: `${(pinnedNotes.length + index) * 30}ms` }}
              >
                <NoteCard
                  note={note}
                  onEdit={() => onEdit(note)}
                  onDelete={() => onDelete(note.id)}
                  onTogglePin={() => onTogglePin(note.id, !note.is_pinned)}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default NoteList;
