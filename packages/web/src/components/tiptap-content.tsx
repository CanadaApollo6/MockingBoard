'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

interface TipTapContentProps {
  content: Record<string, unknown>;
}

export function TipTapContent({ content }: TipTapContentProps) {
  const editor = useEditor({
    extensions: [StarterKit],
    content,
    editable: false,
    editorProps: {
      attributes: {
        class: 'prose prose-sm prose-invert max-w-none',
      },
    },
  });

  if (!editor) return null;

  return <EditorContent editor={editor} />;
}
