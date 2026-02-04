'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Button } from '@/components/ui/button';

interface TipTapEditorProps {
  content?: Record<string, unknown>;
  onChange: (json: Record<string, unknown>, text: string) => void;
  placeholder?: string;
}

export function TipTapEditor({
  content,
  onChange,
  placeholder = 'Write your scouting report...',
}: TipTapEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit, Placeholder.configure({ placeholder })],
    content: content ?? '',
    onUpdate: ({ editor: e }) => {
      onChange(e.getJSON() as Record<string, unknown>, e.getText());
    },
    editorProps: {
      attributes: {
        class:
          'prose prose-sm prose-invert max-w-none min-h-[120px] px-3 py-2 focus:outline-none',
      },
    },
  });

  if (!editor) return null;

  return (
    <div className="rounded-md border bg-background">
      <div className="flex flex-wrap gap-1 border-b px-2 py-1.5">
        <Button
          type="button"
          variant="ghost"
          size="xs"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={editor.isActive('bold') ? 'bg-muted' : ''}
        >
          B
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive('italic') ? 'bg-muted' : ''}
        >
          I
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
          className={editor.isActive('heading', { level: 3 }) ? 'bg-muted' : ''}
        >
          H3
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={editor.isActive('bulletList') ? 'bg-muted' : ''}
        >
          List
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={editor.isActive('blockquote') ? 'bg-muted' : ''}
        >
          Quote
        </Button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
