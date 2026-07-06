import React from 'react';
import { Plus, Trash2, GripVertical, Settings2, FileText, AlignLeft, ListSelect, CheckSquare, X } from 'lucide-react';

export type FormFieldType = 'text' | 'textarea' | 'radio' | 'checkbox';

export interface FormField {
  id: string;
  type: FormFieldType;
  question: string;
  options?: string[]; // Used for radio and checkbox
  required?: boolean;
}

interface FormBuilderProps {
  fields: FormField[];
  onChange: (fields: FormField[]) => void;
}

export default function FormBuilder({ fields, onChange }: FormBuilderProps) {
  const addField = (type: FormFieldType) => {
    const newField: FormField = {
      id: `field_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      type,
      question: '',
      required: true,
      options: (type === 'radio' || type === 'checkbox') ? ['Opsi 1'] : undefined
    };
    onChange([...fields, newField]);
  };

  const updateField = (id: string, updates: Partial<FormField>) => {
    onChange(fields.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const removeField = (id: string) => {
    onChange(fields.filter(f => f.id !== id));
  };

  const addOption = (fieldId: string) => {
    onChange(fields.map(f => {
      if (f.id === fieldId) {
        return { ...f, options: [...(f.options || []), `Opsi ${(f.options?.length || 0) + 1}`] };
      }
      return f;
    }));
  };

  const updateOption = (fieldId: string, optIndex: number, newValue: string) => {
    onChange(fields.map(f => {
      if (f.id === fieldId && f.options) {
        const newOpts = [...f.options];
        newOpts[optIndex] = newValue;
        return { ...f, options: newOpts };
      }
      return f;
    }));
  };

  const removeOption = (fieldId: string, optIndex: number) => {
    onChange(fields.map(f => {
      if (f.id === fieldId && f.options) {
        return { ...f, options: f.options.filter((_, i) => i !== optIndex) };
      }
      return f;
    }));
  };

  return (
    <div className="space-y-4">
      {fields.length === 0 ? (
        <div className="text-center py-6 bg-slate-50 border border-dashed border-slate-300 rounded-xl">
          <p className="text-slate-500 font-medium text-sm">Belum ada pertanyaan tambahan (opsional).</p>
        </div>
      ) : (
        <div className="space-y-4">
          {fields.map((field, index) => (
            <div key={field.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl relative group">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-4">
                <div className="flex-1 w-full">
                  <input
                    type="text"
                    value={field.question}
                    onChange={(e) => updateField(field.id, { question: e.target.value })}
                    placeholder="Tulis pertanyaan..."
                    className="w-full bg-white border border-slate-200 focus:border-primary rounded-lg px-3 py-2 text-sm font-bold text-slate-800 outline-none"
                  />
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                  <select 
                    value={field.type}
                    onChange={(e) => {
                      const newType = e.target.value as FormFieldType;
                      updateField(field.id, { 
                        type: newType, 
                        options: (newType === 'radio' || newType === 'checkbox') ? (field.options || ['Opsi 1']) : undefined 
                      });
                    }}
                    className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium outline-none cursor-pointer"
                  >
                    <option value="text">Jawaban Singkat</option>
                    <option value="textarea">Paragraf</option>
                    <option value="radio">Pilihan Ganda</option>
                    <option value="checkbox">Kotak Centang</option>
                  </select>
                  <button 
                    onClick={() => removeField(field.id)}
                    className="p-2 text-slate-400 hover:text-danger hover:bg-danger/10 rounded-lg transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              {/* Options Builder for radio / checkbox */}
              {(field.type === 'radio' || field.type === 'checkbox') && (
                <div className="pl-2 space-y-2 mt-2 border-l-2 border-slate-200">
                  {field.options?.map((opt, oIdx) => (
                    <div key={oIdx} className="flex items-center gap-2">
                      <div className="w-4 h-4 shrink-0 rounded-full border border-slate-300" />
                      <input 
                        type="text"
                        value={opt}
                        onChange={(e) => updateOption(field.id, oIdx, e.target.value)}
                        className="bg-transparent border-b border-dashed border-slate-300 focus:border-primary px-1 py-1 text-sm outline-none w-full max-w-[200px]"
                      />
                      {field.options!.length > 1 && (
                        <button onClick={() => removeOption(field.id, oIdx)} className="text-slate-400 hover:text-danger">
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button 
                    onClick={() => addOption(field.id)}
                    className="text-xs font-bold text-primary hover:underline mt-2 ml-6"
                  >
                    + Tambah Opsi
                  </button>
                </div>
              )}
              
              <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-end">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer">
                  Wajib diisi
                  <input 
                    type="checkbox" 
                    checked={field.required}
                    onChange={(e) => updateField(field.id, { required: e.target.checked })}
                    className="w-4 h-4 accent-primary"
                  />
                </label>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Toolbar Tambah Pertanyaan */}
      <div className="flex flex-wrap gap-2 pt-2">
        <button onClick={() => addField('text')} className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 hover:border-primary hover:text-primary rounded-lg text-xs font-bold transition-all shadow-sm">
          <Plus size={14} /> Jawaban Singkat
        </button>
        <button onClick={() => addField('radio')} className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 hover:border-primary hover:text-primary rounded-lg text-xs font-bold transition-all shadow-sm">
          <Plus size={14} /> Pilihan Ganda
        </button>
      </div>
    </div>
  );
}
