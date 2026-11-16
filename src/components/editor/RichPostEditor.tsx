'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Bold, Italic, Underline, Strikethrough, Heading1, Heading2, Heading3,
  List, ListOrdered, Quote, Link2, ImagePlus, Minus, Undo2, Redo2,
  AlignLeft, AlignCenter, AlignRight, Type, Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { uploadMedia } from '@/lib/uploadMedia';

export function htmlToPlainText(html: string): string {
  return html
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

export function sanitizePostHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/javascript:/gi, '');
}

type Props = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  disabled?: boolean;
};

function ToolbarBtn({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      className={cn(
        'w-9 h-9 rounded-lg flex items-center justify-center transition-colors',
        active ? 'bg-emerald-600 text-white' : 'text-gray-600 hover:bg-gray-100'
      )}
    >
      {children}
    </button>
  );
}

export default function RichPostEditor({ value, onChange, placeholder, disabled }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const lastEmitted = useRef(value);
  const [uploading, setUploading] = useState(false);
  const [wordCount, setWordCount] = useState(0);

  useEffect(() => {
    if (ref.current && value !== lastEmitted.current) {
      ref.current.innerHTML = value || '';
      lastEmitted.current = value;
    }
  }, [value]);

  const emit = useCallback(() => {
    const html = sanitizePostHtml(ref.current?.innerHTML || '');
    lastEmitted.current = html;
    onChange(html);
    const words = htmlToPlainText(html);
    setWordCount(words ? words.split(/\s+/).length : 0);
  }, [onChange]);

  const run = (command: string, arg?: string) => {
    ref.current?.focus();
    document.execCommand(command, false, arg);
    emit();
  };

  const setHeading = (tag: string) => {
    run('formatBlock', tag);
  };

  const addLink = () => {
    const url = window.prompt('Link URL', 'https://');
    if (!url) return;
    run('createLink', url);
  };

  const insertImage = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please choose an image file.');
      return;
    }
    setUploading(true);
    try {
      const url = await uploadMedia(file, 'community-posts');
      ref.current?.focus();
      document.execCommand(
        'insertHTML',
        false,
        `<img src="${url}" alt="" style="max-width:100%;height:auto;border-radius:16px;margin:16px 0;" />`
      );
      emit();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Image upload failed');
    }
    setUploading(false);
  };

  const onPaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) void insertImage(file);
        return;
      }
    }
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    const file = e.dataTransfer.files?.[0];
    if (file?.type.startsWith('image/')) {
      e.preventDefault();
      void insertImage(file);
    }
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-2 border-b border-gray-100 bg-gray-50">
        <ToolbarBtn title="Paragraph" onClick={() => setHeading('P')}><Type className="w-4 h-4" /></ToolbarBtn>
        <ToolbarBtn title="Heading 1" onClick={() => setHeading('H1')}><Heading1 className="w-4 h-4" /></ToolbarBtn>
        <ToolbarBtn title="Heading 2" onClick={() => setHeading('H2')}><Heading2 className="w-4 h-4" /></ToolbarBtn>
        <ToolbarBtn title="Heading 3" onClick={() => setHeading('H3')}><Heading3 className="w-4 h-4" /></ToolbarBtn>
        <span className="w-px h-6 bg-gray-200 mx-1" />
        <ToolbarBtn title="Bold" onClick={() => run('bold')}><Bold className="w-4 h-4" /></ToolbarBtn>
        <ToolbarBtn title="Italic" onClick={() => run('italic')}><Italic className="w-4 h-4" /></ToolbarBtn>
        <ToolbarBtn title="Underline" onClick={() => run('underline')}><Underline className="w-4 h-4" /></ToolbarBtn>
        <ToolbarBtn title="Strikethrough" onClick={() => run('strikeThrough')}><Strikethrough className="w-4 h-4" /></ToolbarBtn>
        <span className="w-px h-6 bg-gray-200 mx-1" />
        <ToolbarBtn title="Bulleted list" onClick={() => run('insertUnorderedList')}><List className="w-4 h-4" /></ToolbarBtn>
        <ToolbarBtn title="Numbered list" onClick={() => run('insertOrderedList')}><ListOrdered className="w-4 h-4" /></ToolbarBtn>
        <ToolbarBtn title="Quote" onClick={() => setHeading('BLOCKQUOTE')}><Quote className="w-4 h-4" /></ToolbarBtn>
        <ToolbarBtn title="Divider" onClick={() => run('insertHorizontalRule')}><Minus className="w-4 h-4" /></ToolbarBtn>
        <span className="w-px h-6 bg-gray-200 mx-1" />
        <ToolbarBtn title="Align left" onClick={() => run('justifyLeft')}><AlignLeft className="w-4 h-4" /></ToolbarBtn>
        <ToolbarBtn title="Align center" onClick={() => run('justifyCenter')}><AlignCenter className="w-4 h-4" /></ToolbarBtn>
        <ToolbarBtn title="Align right" onClick={() => run('justifyRight')}><AlignRight className="w-4 h-4" /></ToolbarBtn>
        <span className="w-px h-6 bg-gray-200 mx-1" />
        <ToolbarBtn title="Insert link" onClick={addLink}><Link2 className="w-4 h-4" /></ToolbarBtn>
        <ToolbarBtn title="Insert image" onClick={() => fileRef.current?.click()}>
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
        </ToolbarBtn>
        <span className="w-px h-6 bg-gray-200 mx-1" />
        <ToolbarBtn title="Undo" onClick={() => run('undo')}><Undo2 className="w-4 h-4" /></ToolbarBtn>
        <ToolbarBtn title="Redo" onClick={() => run('redo')}><Redo2 className="w-4 h-4" /></ToolbarBtn>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file) void insertImage(file);
          }}
        />
      </div>

      <div className="relative">
        {(!value || value === '<br>' || htmlToPlainText(value).length === 0) && (
          <p className="pointer-events-none absolute top-5 left-5 text-gray-400 m-0">
            {placeholder || 'Write your article… Use the toolbar for headings, images, and links.'}
          </p>
        )}
        <div
          ref={ref}
          contentEditable={!disabled}
          suppressContentEditableWarning
          onInput={emit}
          onPaste={onPaste}
          onDrop={onDrop}
          className="min-h-[360px] max-h-[720px] overflow-y-auto px-5 py-5 text-[17px] leading-8 text-gray-800 outline-none prose prose-lg max-w-none prose-headings:font-headers prose-headings:text-gray-900 prose-img:rounded-2xl prose-a:text-emerald-700"
        />
      </div>

      <div className="flex items-center justify-between px-4 py-2 border-t border-gray-100 bg-gray-50 text-[11px] font-bold uppercase tracking-wider text-gray-400">
        <span>Paste or drop images · {wordCount} words</span>
        {uploading && <span className="text-emerald-600">Uploading image…</span>}
      </div>
    </div>
  );
}
