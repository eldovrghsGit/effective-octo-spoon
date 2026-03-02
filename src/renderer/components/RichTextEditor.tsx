import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Bold, Italic, List, ListOrdered, Heading2 } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ content, onChange, placeholder = 'Add description...' }) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder,
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: `prose ${isLight ? 'prose-gray' : 'prose-invert'} prose-sm max-w-none focus:outline-none min-h-[80px] p-3 ${isLight ? 'text-gray-900' : 'text-white'}`,
      },
    },
  }, [isLight]);

  if (!editor) {
    return null;
  }

  // Clean minimal theme
  const t = {
    bg: isLight ? 'bg-white' : 'bg-slate-900',
    toolbarBg: isLight ? 'bg-gray-50' : 'bg-slate-800',
    border: isLight ? 'border-gray-100' : 'border-slate-700',
    btnHover: isLight ? 'hover:bg-gray-100' : 'hover:bg-slate-700',
    btnActive: isLight ? 'bg-blue-50 text-blue-600' : 'bg-slate-700 text-blue-400',
    btnInactive: isLight ? 'text-gray-400' : 'text-slate-500',
  };

  return (
    <div className={`${t.bg} overflow-hidden`}>
      {/* Toolbar */}
      <div className={`flex items-center gap-0.5 px-2 py-1.5 border-b ${t.border} ${t.toolbarBg}`}>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-1.5 rounded ${t.btnHover} transition-colors ${
            editor.isActive('bold') ? t.btnActive : t.btnInactive
          }`}
          title="Bold"
        >
          <Bold size={15} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-1.5 rounded ${t.btnHover} transition-colors ${
            editor.isActive('italic') ? t.btnActive : t.btnInactive
          }`}
          title="Italic"
        >
          <Italic size={15} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`p-1.5 rounded ${t.btnHover} transition-colors ${
            editor.isActive('heading', { level: 2 }) ? t.btnActive : t.btnInactive
          }`}
          title="Heading"
        >
          <Heading2 size={15} />
        </button>
        <div className={`w-px h-4 ${isLight ? 'bg-gray-200' : 'bg-slate-700'} mx-1`} />
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-1.5 rounded ${t.btnHover} transition-colors ${
            editor.isActive('bulletList') ? t.btnActive : t.btnInactive
          }`}
          title="Bullet List"
        >
          <List size={15} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-1.5 rounded ${t.btnHover} transition-colors ${
            editor.isActive('orderedList') ? t.btnActive : t.btnInactive
          }`}
          title="Numbered List"
        >
          <ListOrdered size={15} />
        </button>
      </div>

      {/* Editor */}
      <EditorContent editor={editor} />
    </div>
  );
};

export default RichTextEditor;
