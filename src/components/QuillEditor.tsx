import React, { useEffect, useRef, useState } from 'react';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';

interface QuillEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const quillModules = {
  toolbar: [
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    ['link'],
    ['clean']
  ],
};

export default function QuillEditor({ value, onChange, placeholder, className = "" }: QuillEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const quillInstance = useRef<Quill | null>(null);
  const isInternalChange = useRef(false);

  useEffect(() => {
    if (editorRef.current && !quillInstance.current) {
      quillInstance.current = new Quill(editorRef.current, {
        theme: 'snow',
        modules: quillModules,
        placeholder: placeholder || 'Tulis instruksi...'
      });

      if (value) {
        quillInstance.current.root.innerHTML = value;
      }

      quillInstance.current.on('text-change', () => {
        isInternalChange.current = true;
        onChange(quillInstance.current?.root.innerHTML || '');
      });
    }
  }, []);

  useEffect(() => {
    if (quillInstance.current && value !== quillInstance.current.root.innerHTML && !isInternalChange.current) {
        quillInstance.current.root.innerHTML = value || '';
    }
    isInternalChange.current = false;
  }, [value]);

  return (
    <div className={`quill-wrapper ${className}`}>
      <div ref={editorRef} />
    </div>
  );
}
