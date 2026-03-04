import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  ChevronLeft, ChevronRight, Type, CheckSquare,
  Heading1, Heading2, List, ListOrdered, Hash, Quote, Minus,
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
} from 'lucide-react';
import { format, addDays, subDays, isToday } from 'date-fns';
import { Task } from '../../App';
import { Note } from '../../types/notes';

/* ───── Props (unchanged interface) ───── */
interface DailyCanvasProps {
  tasks: Task[];
  notes: Note[];
  selectedDate: Date;
  onAddTask: (data: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => Promise<number | null>;
  onUpdateTask: (id: number, updates: Partial<Task>) => void;
  onAddNote: (note: Omit<Note, 'id' | 'created_at' | 'updated_at'>) => void;
  onUpdateNote: (id: number, updates: Partial<Note>) => void;
  isDark: boolean;
  s: Record<string, string>;
}

/* ───── Slash menu items ───── */
const slashItems = [
  { id: 'p',          label: 'Text',       icon: Type,        desc: 'Plain text',       tag: 'p' },
  { id: 'h1',         label: 'Heading 1',  icon: Heading1,    desc: 'Large heading',    tag: 'h1' },
  { id: 'h2',         label: 'Heading 2',  icon: Heading2,    desc: 'Medium heading',   tag: 'h2' },
  { id: 'h3',         label: 'Heading 3',  icon: Hash,        desc: 'Small heading',    tag: 'h3' },
  { id: 'todo',       label: 'To-do list', icon: CheckSquare, desc: 'Task checkbox',    tag: 'todo' },
  { id: 'ul',         label: 'Bullet list',icon: List,        desc: 'Unordered list',   tag: 'ul' },
  { id: 'ol',         label: 'Numbered',   icon: ListOrdered, desc: 'Ordered list',     tag: 'ol' },
  { id: 'blockquote', label: 'Quote',      icon: Quote,       desc: 'Block quote',      tag: 'blockquote' },
  { id: 'hr',         label: 'Divider',    icon: Minus,       desc: 'Horizontal line',  tag: 'hr' },
];

/* ═══════════════════════════════════════════════
   DAILY CANVAS  —  Microsoft Loop-style editor
   Single contentEditable div with native HTML.
   Fluid, document-like editing — no visible blocks.
   ═══════════════════════════════════════════════ */
const DailyCanvas: React.FC<DailyCanvasProps> = ({
  tasks, notes, selectedDate, onAddTask, onUpdateTask, onAddNote, onUpdateNote, isDark, s,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);

  /* ── internal date nav (arrows in header) ── */
  const [viewDate, setViewDate] = useState(selectedDate);
  useEffect(() => setViewDate(selectedDate), [selectedDate]);
  const dateStr = format(viewDate, 'yyyy-MM-dd');

  /* ── keep callbacks in refs so DOM handlers can access them ── */
  const addTaskRef = useRef(onAddTask);
  const updateTaskRef = useRef(onUpdateTask);
  const saveRef = useRef<() => void>(() => {});
  useEffect(() => { addTaskRef.current = onAddTask; }, [onAddTask]);
  useEffect(() => { updateTaskRef.current = onUpdateTask; }, [onUpdateTask]);

  /* ── note lookup ── */
  const currentNote = useMemo(() => notes.find(n => n.date === dateStr), [notes, dateStr]);

  /* ── auto-save (debounced 800ms) ── */
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const save = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      if (!editorRef.current) return;

      try {
        // Safety net: sync any todos that have text but no linked task
        const unlinked = editorRef.current.querySelectorAll('.loop-todo:not([data-task-id])');
        for (const w of unlinked) {
          const text = (w.querySelector('.loop-todo-text') as HTMLElement)?.textContent?.trim();
          const cb = w.querySelector('.loop-todo-cb') as HTMLInputElement;
          if (text) {
            try {
              const id = await addTaskRef.current({
                title: text,
                description: '',
                status: cb?.checked ? 'done' : 'todo',
                priority: 'medium',
                moscow: 'should',
                due_date: dateStr,
                start_time: null,
                end_time: null,
                tags: null,
              });
              if (id) (w as HTMLElement).setAttribute('data-task-id', String(id));
            } catch (err) {
              console.error('Failed to create task from unlinked todo:', err);
            }
          }
        }

        const html = editorRef.current.innerHTML;
        if (currentNote) {
          await onUpdateNote(currentNote.id, { content: html });
        } else {
          await onAddNote({
            title: `Daily – ${format(viewDate, 'MMM d, yyyy')}`,
            content: html,
            date: dateStr,
            note_type: 'daily_planner',
            is_pinned: false,
            color: 'default',
            tags: null,
            checklist_items: null,
          } as any);
        }
      } catch (err) {
        console.error('Failed to save daily canvas:', err);
      }
    }, 800);
  }, [currentNote, dateStr, viewDate, onAddNote, onUpdateNote]);

  // Keep saveRef in sync
  useEffect(() => { saveRef.current = save; }, [save]);

  /* ── sync: create a task from a todo, return task id ── */
  const createTaskFromTodo = useCallback(async (text: string, checked: boolean): Promise<number | null> => {
    if (!text.trim()) return null;
    const taskId = await addTaskRef.current({
      title: text.trim(),
      description: '',
      status: checked ? 'done' : 'todo',
      priority: 'medium',
      moscow: 'should',
      due_date: dateStr,
      start_time: null,
      end_time: null,
      tags: null,
    });
    return taskId;
  }, [dateStr]);

  /* ── wire a single todo element with task sync ── */
  const wireTodo = useCallback((wrapper: HTMLElement) => {
    const cb = wrapper.querySelector('.loop-todo-cb') as HTMLInputElement;
    const span = wrapper.querySelector('.loop-todo-text') as HTMLElement;
    if (!cb || !span) return;

    // Checkbox toggle → sync status to task
    cb.addEventListener('change', () => {
      wrapper.classList.toggle('is-checked', cb.checked);
      const taskId = wrapper.getAttribute('data-task-id');
      if (taskId) {
        updateTaskRef.current(Number(taskId), { status: cb.checked ? 'done' : 'todo' });
      }
      saveRef.current();
    });

    // Blur on text → create task if text exists but no task linked yet
    span.addEventListener('blur', async () => {
      const text = span.textContent?.trim() || '';
      const existingId = wrapper.getAttribute('data-task-id');
      if (text && !existingId) {
        const taskId = await createTaskFromTodo(text, cb.checked);
        if (taskId) wrapper.setAttribute('data-task-id', String(taskId));
        saveRef.current();
      }
    });
  }, [createTaskFromTodo]);

  /* ── load content when date changes ── */
  const loadedDateRef = useRef<string>('');

  useEffect(() => {
    if (!editorRef.current || loadedDateRef.current === dateStr) return;
    loadedDateRef.current = dateStr;

    if (currentNote?.content) {
      if (currentNote.content.trimStart().startsWith('[')) {
        // Old JSON block format → convert to HTML
        try {
          const parsed = JSON.parse(currentNote.content);
          if (Array.isArray(parsed)) {
            editorRef.current.innerHTML = blocksToHtml(parsed);
            wireAllTodos(editorRef.current, wireTodo);
            ensureTrailingP(editorRef.current);
            return;
          }
        } catch { /* not JSON */ }
      }
      if (currentNote.content.trimStart().startsWith('<')) {
        editorRef.current.innerHTML = currentNote.content;
      } else {
        editorRef.current.innerHTML = `<p>${escHtml(currentNote.content)}</p>`;
      }
      wireAllTodos(editorRef.current, wireTodo);
    } else {
      editorRef.current.innerHTML = [
        `<h2>${format(viewDate, 'EEEE, MMMM d')}</h2>`,
        `<p><br></p>`,
      ].join('');
    }
    ensureTrailingP(editorRef.current);
  }, [dateStr, currentNote, wireTodo]);

  /* ── slash command state ── */
  const [slash, setSlash] = useState<{ x: number; y: number; filter: string } | null>(null);
  const [slashIdx, setSlashIdx] = useState(0);
  const filteredSlash = slash
    ? slashItems.filter(c => c.label.toLowerCase().includes(slash.filter.toLowerCase()))
    : [];

  /* ── floating toolbar on text selection ── */
  const [toolbar, setToolbar] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const onSel = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !editorRef.current?.contains(sel.anchorNode)) {
        setToolbar(null);
        return;
      }
      const rect = sel.getRangeAt(0).getBoundingClientRect();
      setToolbar({ x: rect.left + rect.width / 2, y: rect.top - 8 });
    };
    document.addEventListener('selectionchange', onSel);
    return () => document.removeEventListener('selectionchange', onSel);
  }, []);

  /* ────── onInput: markdown shortcuts + slash detection ────── */
  const handleInput = () => {
    if (!editorRef.current) return;
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) { save(); return; }

    // Find the block-level element the caret is in
    const blockEl = getBlockEl(sel.anchorNode, editorRef.current);
    if (!blockEl) { save(); return; }
    const text = blockEl.textContent || '';

    // Only apply markdown shortcuts inside plain <p>
    if (blockEl.tagName === 'P') {
      // ### Heading 3
      if (/^###\s/.test(text))       { replaceBlock(blockEl, 'h3', text.slice(4)); save(); return; }
      // ## Heading 2
      else if (/^##\s/.test(text))   { replaceBlock(blockEl, 'h2', text.slice(3)); save(); return; }
      // # Heading 1
      else if (/^#\s/.test(text))    { replaceBlock(blockEl, 'h1', text.slice(2)); save(); return; }
      // - or * → bullet
      else if (/^[-*]\s/.test(text)) { wrapInList(blockEl, 'ul', text.slice(2)); save(); return; }
      // 1. → numbered
      else if (/^\d+\.\s/.test(text)){ wrapInList(blockEl, 'ol', text.replace(/^\d+\.\s/, '')); save(); return; }
      // [] or [ ] or [x] → todo
      else if (/^\[[\sx]?\]\s/.test(text)) {
        const checked = /^\[x\]/i.test(text);
        const content = text.replace(/^\[[\sx]?\]\s?/, '');
        const todo = makeTodo(content, checked);
        blockEl.replaceWith(todo);
        wireTodo(todo);
        // Auto-create task if text is non-empty
        if (content.trim()) {
          createTaskFromTodo(content, checked).then(id => {
            if (id) { todo.setAttribute('data-task-id', String(id)); saveRef.current(); }
          }).catch(err => console.error('Failed to create task from todo:', err));
        }
        focusEnd(todo.querySelector('.loop-todo-text') as HTMLElement);
        ensureTrailingP(editorRef.current); save(); return;
      }
      // > → blockquote
      else if (/^>\s/.test(text)) { replaceBlock(blockEl, 'blockquote', text.slice(2)); save(); return; }
      // --- or *** → hr
      else if (/^(---|\*\*\*|___)\s*$/.test(text.trim())) {
        const hr = document.createElement('hr');
        const p = mkP();
        blockEl.replaceWith(hr); hr.after(p);
        focusEnd(p); ensureTrailingP(editorRef.current); save(); return;
      }
    }

    // Slash command trigger
    if (text === '/' || (text.startsWith('/') && text.indexOf(' ') === -1 && text.length < 20)) {
      const rect = sel.getRangeAt(0).getBoundingClientRect();
      setSlash({ x: rect.left, y: rect.bottom + 6, filter: text.slice(1) });
      setSlashIdx(0);
    } else if (slash) {
      setSlash(null);
    }

    save();
  };

  /* ────── onKeyDown: structural editing ────── */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    /* ── slash menu nav ── */
    if (slash && filteredSlash.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSlashIdx(i => Math.min(i + 1, filteredSlash.length - 1)); return; }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setSlashIdx(i => Math.max(i - 1, 0)); return; }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); applySlash(filteredSlash[slashIdx]); return; }
      if (e.key === 'Escape') { setSlash(null); return; }
    }

    const sel = window.getSelection();
    const anchor: Node | null = sel?.anchorNode ?? null;

    /* ── Enter ── */
    if (e.key === 'Enter' && !e.shiftKey) {
      // Inside todo
      const todoW = findUp(anchor, 'data-todo');
      if (todoW) {
        const span = todoW.querySelector('.loop-todo-text') as HTMLElement;
        if (span && !span.textContent?.trim()) {
          e.preventDefault();
          const p = mkP(); todoW.replaceWith(p); focusEnd(p); save(); return;
        }
        e.preventDefault();
        // Sync current todo → task before creating the next one
        const curText = span?.textContent?.trim() || '';
        if (curText && !todoW.getAttribute('data-task-id')) {
          const curCb = todoW.querySelector('.loop-todo-cb') as HTMLInputElement;
          createTaskFromTodo(curText, curCb?.checked ?? false).then(id => {
            if (id) { todoW.setAttribute('data-task-id', String(id)); saveRef.current(); }
          }).catch(err => console.error('Failed to create task from todo:', err));
        }
        const nt = makeTodo('', false); todoW.after(nt); wireTodo(nt);
        focusEnd(nt.querySelector('.loop-todo-text') as HTMLElement); save(); return;
      }

      // Inside LI — if empty, exit list
      const li = tagUp(anchor, 'LI');
      if (li && !li.textContent?.trim()) {
        const list = li.parentElement;
        if (list) {
          e.preventDefault();
          const p = mkP(); li.remove();
          if (!list.children.length) list.replaceWith(p); else list.after(p);
          focusEnd(p); save(); return;
        }
      }

      // Inside heading → new paragraph after
      for (const t of ['H1', 'H2', 'H3']) {
        const h = tagUp(anchor, t);
        if (h) { e.preventDefault(); const p = mkP(); h.after(p); focusEnd(p); save(); return; }
      }

      // Inside blockquote — if empty, exit to p
      const bq = tagUp(anchor, 'BLOCKQUOTE');
      if (bq && !bq.textContent?.trim()) {
        e.preventDefault();
        const p = mkP(); bq.replaceWith(p); focusEnd(p); save(); return;
      }
    }

    /* ── Backspace at start → downgrade to <p> ── */
    if (e.key === 'Backspace' && sel?.isCollapsed && sel.anchorOffset === 0) {
      // Todo
      const todoW = findUp(anchor, 'data-todo');
      if (todoW) {
        const span = todoW.querySelector('.loop-todo-text') as HTMLElement;
        if (span && curOff(span) === 0) {
          e.preventDefault();
          const p = document.createElement('p');
          p.textContent = span.textContent || ''; if (!p.textContent) p.innerHTML = '<br>';
          todoW.replaceWith(p); focusStart(p); save(); return;
        }
      }
      // Heading / blockquote
      for (const t of ['H1', 'H2', 'H3', 'BLOCKQUOTE']) {
        const el = tagUp(anchor, t);
        if (el && curOff(el) === 0) {
          e.preventDefault();
          const p = document.createElement('p');
          p.innerHTML = el.innerHTML; el.replaceWith(p); focusStart(p); save(); return;
        }
      }
      // LI
      const li = tagUp(anchor, 'LI');
      if (li && curOff(li) === 0) {
        const list = li.parentElement;
        if (list) {
          e.preventDefault();
          const p = document.createElement('p');
          p.innerHTML = li.innerHTML || '<br>'; li.remove();
          if (!list.children.length) list.replaceWith(p); else list.before(p);
          focusStart(p); save(); return;
        }
      }
    }

    /* ── Inline formatting shortcuts ── */
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
      if (e.key === 'b') { e.preventDefault(); document.execCommand('bold'); save(); }
      if (e.key === 'i') { e.preventDefault(); document.execCommand('italic'); save(); }
      if (e.key === 'u') { e.preventDefault(); document.execCommand('underline'); save(); }
      if (e.key === 's') { e.preventDefault(); save(); } // prevent browser save dialog
    }
  };

  /* ── apply slash command ── */
  const applySlash = (cmd: typeof slashItems[0]) => {
    setSlash(null);
    if (!editorRef.current) return;
    const sel = window.getSelection();
    const blockEl = getBlockEl(sel?.anchorNode || null, editorRef.current);
    if (!blockEl) return;
    const text = (blockEl.textContent || '').replace(/^\/\S*\s?/, '');

    if (cmd.tag === 'hr') {
      const hr = document.createElement('hr'); const p = mkP();
      blockEl.replaceWith(hr); hr.after(p); focusEnd(p);
    } else if (cmd.tag === 'todo') {
      const todo = makeTodo(text, false);
      blockEl.replaceWith(todo); wireTodo(todo);
      if (text.trim()) {
        createTaskFromTodo(text, false).then(id => {
          if (id) { todo.setAttribute('data-task-id', String(id)); saveRef.current(); }
        }).catch(err => console.error('Failed to create task from todo:', err));
      }
      focusEnd(todo.querySelector('.loop-todo-text') as HTMLElement);
    } else if (cmd.tag === 'ul' || cmd.tag === 'ol') {
      wrapInList(blockEl, cmd.tag, text);
    } else {
      replaceBlock(blockEl, cmd.tag, text);
    }
    ensureTrailingP(editorRef.current); save();
  };

  /* ── date navigation ── */
  /* ════════════ RENDER ════════════ */
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className={`flex items-center justify-between px-6 py-3 border-b ${s.border}`}>
        <div className="flex items-center gap-3">
          <button onClick={() => setViewDate(d => subDays(d, 1))} className={`p-1.5 rounded-lg ${s.hover} ${s.textMuted}`}>
            <ChevronLeft size={14} />
          </button>
          <div>
            <h2 className={`text-base font-semibold ${s.text}`}>
              {isToday(viewDate) ? 'Today' : format(viewDate, 'EEEE')}
            </h2>
            <p className={`text-[11px] ${s.textDim}`}>{format(viewDate, 'MMMM d, yyyy')}</p>
          </div>
          <button onClick={() => setViewDate(d => addDays(d, 1))} className={`p-1.5 rounded-lg ${s.hover} ${s.textMuted}`}>
            <ChevronRight size={14} />
          </button>
        </div>
        {!isToday(viewDate) && (
          <button onClick={() => setViewDate(new Date())} className="text-[11px] font-medium text-violet-400 hover:text-violet-300 px-2 py-1 rounded-md hover:bg-violet-500/10 transition-colors">
            Go to Today
          </button>
        )}
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 py-6">
          <div
            ref={editorRef}
            className={`loop-editor outline-none min-h-[60vh] ${isDark ? 'dark' : 'light'}`}
            contentEditable
            suppressContentEditableWarning
            spellCheck
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            data-placeholder="Start typing, or press '/' for commands…"
          />
        </div>
      </div>

      {/* Floating format toolbar */}
      {toolbar && (
        <div
          className={`fixed z-50 flex items-center gap-0.5 px-1.5 py-1 rounded-lg border shadow-xl ${
            isDark ? 'bg-[#1e1e34] border-white/10 shadow-black/40' : 'bg-white border-gray-200 shadow-gray-300/40'
          }`}
          style={{ left: toolbar.x, top: toolbar.y, transform: 'translate(-50%, -100%)' }}
          onMouseDown={e => e.preventDefault()}
        >
          {[
            { cmd: 'bold',          icon: Bold,          label: 'Bold' },
            { cmd: 'italic',        icon: Italic,        label: 'Italic' },
            { cmd: 'underline',     icon: UnderlineIcon, label: 'Underline' },
            { cmd: 'strikeThrough', icon: Strikethrough, label: 'Strike' },
          ].map(({ cmd, icon: Icon, label }) => (
            <button
              key={cmd}
              onClick={() => { document.execCommand(cmd); save(); }}
              className={`p-1.5 rounded-md transition-colors ${isDark ? 'hover:bg-white/10 text-slate-300' : 'hover:bg-gray-100 text-gray-600'}`}
              title={label}
            >
              <Icon size={14} />
            </button>
          ))}
        </div>
      )}

      {/* Slash command menu */}
      {slash && filteredSlash.length > 0 && (
        <div
          className={`fixed z-50 rounded-xl border shadow-2xl py-1.5 w-56 ${
            isDark ? 'bg-[#1a1a30] border-white/10 shadow-black/50' : 'bg-white border-gray-200 shadow-gray-200/50'
          }`}
          style={{ left: Math.min(slash.x, window.innerWidth - 240), top: Math.min(slash.y, window.innerHeight - 300) }}
          onMouseDown={e => e.preventDefault()}
        >
          <div className={`px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
            Insert
          </div>
          {filteredSlash.map((cmd, i) => {
            const Icon = cmd.icon;
            return (
              <button
                key={cmd.id}
                onClick={() => applySlash(cmd)}
                onMouseEnter={() => setSlashIdx(i)}
                className={`w-full flex items-center gap-3 px-3 py-2 text-left text-sm transition-colors ${
                  i === slashIdx
                    ? isDark ? 'bg-violet-500/15 text-violet-300' : 'bg-violet-50 text-violet-700'
                    : isDark ? 'text-slate-300 hover:bg-white/5' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon size={16} className={i === slashIdx ? 'text-violet-400' : isDark ? 'text-slate-500' : 'text-gray-400'} />
                <div>
                  <div className="font-medium">{cmd.label}</div>
                  <div className={`text-[11px] ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>{cmd.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════
   DOM helpers
   ═══════════════════════════════════ */

/** Get the direct-child block element from any node inside the editor */
function getBlockEl(node: Node | null, root: HTMLElement): HTMLElement | null {
  let cur: HTMLElement | null = node?.nodeType === 3 ? node.parentElement : (node as HTMLElement);
  while (cur && cur !== root && cur.parentElement !== root) cur = cur.parentElement;
  return cur === root ? null : cur;
}

/** Create a todo checkbox wrapper */
function makeTodo(text: string, checked: boolean): HTMLDivElement {
  const w = document.createElement('div');
  w.setAttribute('data-todo', 'true');
  w.className = `loop-todo${checked ? ' is-checked' : ''}`;
  const cb = document.createElement('input');
  cb.type = 'checkbox'; cb.checked = checked; cb.className = 'loop-todo-cb';
  cb.addEventListener('change', () => w.classList.toggle('is-checked', cb.checked));
  const span = document.createElement('span');
  span.setAttribute('contenteditable', 'true');
  span.className = 'loop-todo-text';
  span.textContent = text || '';
  w.append(cb, span);
  return w;
}

/** Wire all existing todo elements with task sync after loading HTML */
function wireAllTodos(root: HTMLElement, wireFn: (el: HTMLElement) => void) {
  root.querySelectorAll('.loop-todo').forEach(w => wireFn(w as HTMLElement));
}

/** Replace a block with a new tag */
function replaceBlock(el: HTMLElement, tag: string, text: string) {
  const n = document.createElement(tag);
  n.textContent = text; if (!text) n.innerHTML = '<br>';
  el.replaceWith(n); focusEnd(n);
}

/** Wrap content in a UL or OL */
function wrapInList(el: HTMLElement, tag: string, text: string) {
  const li = document.createElement('li');
  li.textContent = text || ''; if (!li.textContent) li.innerHTML = '<br>';
  const list = document.createElement(tag);
  list.appendChild(li); el.replaceWith(list); focusEnd(li);
}

/** Create empty paragraph */
function mkP(): HTMLParagraphElement {
  const p = document.createElement('p'); p.innerHTML = '<br>'; return p;
}

/** Ensure the editor ends with an empty <p> */
function ensureTrailingP(root: HTMLElement | null) {
  if (!root) return;
  const last = root.lastElementChild;
  if (!last || last.tagName !== 'P' || (last.textContent?.trim() && last.innerHTML !== '<br>')) {
    root.appendChild(mkP());
  }
}

function focusEnd(el: HTMLElement | null) {
  if (!el) return;
  requestAnimationFrame(() => {
    el.focus();
    const r = document.createRange(); r.selectNodeContents(el); r.collapse(false);
    const s = window.getSelection(); s?.removeAllRanges(); s?.addRange(r);
  });
}

function focusStart(el: HTMLElement | null) {
  if (!el) return;
  requestAnimationFrame(() => {
    el.focus();
    const r = document.createRange(); r.selectNodeContents(el); r.collapse(true);
    const s = window.getSelection(); s?.removeAllRanges(); s?.addRange(r);
  });
}

function curOff(el: HTMLElement): number {
  const s = window.getSelection();
  if (!s?.rangeCount) return -1;
  const r = s.getRangeAt(0).cloneRange(); r.setStart(el, 0);
  return r.toString().length;
}

function findUp(node: Node | null, attr: string): HTMLElement | null {
  let c: HTMLElement | null = node?.nodeType === 3 ? node.parentElement : (node as HTMLElement);
  while (c) { if (c.hasAttribute?.(attr)) return c; c = c.parentElement; }
  return null;
}

function tagUp(node: Node | null, tag: string): HTMLElement | null {
  let c: HTMLElement | null = node?.nodeType === 3 ? node.parentElement : (node as HTMLElement);
  while (c) { if (c.tagName === tag) return c; c = c.parentElement; }
  return null;
}

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Convert old JSON block format → HTML */
function blocksToHtml(blocks: any[]): string {
  return blocks.map(b => {
    const c = escHtml(b.content || '');
    switch (b.type) {
      case 'h1': return `<h1>${c || '<br>'}</h1>`;
      case 'h2': return `<h2>${c || '<br>'}</h2>`;
      case 'h3': return `<h3>${c || '<br>'}</h3>`;
      case 'checkbox': {
        const ck = b.checked ? ' checked' : '';
        const cl = b.checked ? ' is-checked' : '';
        return `<div data-todo="true" class="loop-todo${cl}"><input type="checkbox" class="loop-todo-cb"${ck}><span contenteditable="true" class="loop-todo-text">${c}</span></div>`;
      }
      case 'bullet':   return `<ul><li>${c || '<br>'}</li></ul>`;
      case 'numbered':  return `<ol><li>${c || '<br>'}</li></ol>`;
      case 'quote':     return `<blockquote>${c || '<br>'}</blockquote>`;
      case 'divider':   return '<hr>';
      default:          return `<p>${c || '<br>'}</p>`;
    }
  }).join('');
}

export default DailyCanvas;
