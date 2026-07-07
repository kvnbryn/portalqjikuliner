import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Save, Clock, Lock, CheckCircle2, Loader2, Target, Plus, Trash2, X, ChevronDown } from "lucide-react";
import toast from "react-hot-toast";
import { getMissionSettingsAPI, updateMissionSettingAPI, createMissionAPI, deleteMissionAPI } from "../lib/api";
import QuillEditor from "../components/QuillEditor";
import FormBuilder, { FormField } from "../components/FormBuilder";

interface MissionSetting {
  id: string;
  kategori: string;
  deskripsi: string;
  deadline: string;
  statusManual: string;
  formSchema?: string;
  visibility?: boolean;
  requiresForm?: boolean;
}

export default function AdminMisi() {
  const [settings, setSettings] = useState<MissionSetting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("QRIS");
  const [isCreating, setIsCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false);
  const [isSavingBulk, setIsSavingBulk] = useState(false);
  const [saveProgress, setSaveProgress] = useState({ current: 0, total: 0 });

  const isChecked = (val: any) => val !== false && val !== "FALSE" && val !== "false" && val !== 0 && val !== "0";

  // New Mission Form State
  const [newDesc, setNewDesc] = useState("");
  const [newDeadline, setNewDeadline] = useState("");
  const [newFormFields, setNewFormFields] = useState<FormField[]>([]);
  const [newRequireAll, setNewRequireAll] = useState(false);
  const [newVisibility, setNewVisibility] = useState(true);
  const [newRequiresForm, setNewRequiresForm] = useState(true);
  const [newFormSchema, setNewFormSchema] = useState("");

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const res = await getMissionSettingsAPI();
      if (res.status === "success" && Array.isArray(res.data)) {
        setSettings(res.data);
      } else {
        toast.error("Gagal memuat pengaturan misi.");
      }
    } catch (error) {
      toast.error("Terjadi kesalahan saat memuat pengaturan.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkSave = async () => {
    const targetSettings = settings.filter(s => s.kategori === activeCategory);
    if (targetSettings.length === 0) {
      toast.error("Tidak ada misi untuk disimpan di kategori ini.");
      return;
    }
    
    setIsSavingBulk(true);
    setSaveProgress({ current: 0, total: targetSettings.length });
    
    let successCount = 0;
    
    try {
      for (let i = 0; i < targetSettings.length; i++) {
        const setting = targetSettings[i];
        setSaveProgress({ current: i + 1, total: targetSettings.length });
        
        const res = await updateMissionSettingAPI(
          setting.id, 
          setting.deskripsi, 
          setting.deadline, 
          setting.statusManual, 
          setting.kategori, 
          setting.formSchema, 
          isChecked(setting.visibility), 
          isChecked(setting.requiresForm)
        );
        
        if (res.status === "success") {
          successCount++;
        }
        
        // Add 1 second delay between requests to avoid Google Apps Script rate limiting
        if (i < targetSettings.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      if (successCount === targetSettings.length) {
        toast.success(`Berhasil menyimpan ${successCount} misi sekaligus!`);
      } else {
        toast.error(`Berhasil menyimpan ${successCount} dari ${targetSettings.length} misi. Coba lagi.`);
      }
      
      fetchSettings();
    } catch (error) {
      toast.error("Terjadi kesalahan jaringan saat menyimpan massal.");
    } finally {
      setIsSavingBulk(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus misi ini? Tim yang sudah mengirim bukti tidak akan terhapus file Drive-nya, tapi misinya hilang dari halaman ini.")) return;
    setDeletingId(id);
    try {
      const res = await deleteMissionAPI(id);
      if (res.status === "success") {
        toast.success("Misi berhasil dihapus");
        setSettings(prev => prev.filter(s => s.id !== id));
      } else {
        toast.error(res.message);
      }
    } catch (e) {
      toast.error("Terjadi kesalahan");
    } finally {
      setDeletingId(null);
    }
  };

  const handleCreate = async () => {
    if (!newDesc.trim()) {
      toast.error("Tugas peserta harus diisi");
      return;
    }
    setIsCreating(true);
    try {
      const isoDeadline = newDeadline ? formatFromInput(newDeadline) : new Date(Date.now() + 24*3600*1000).toISOString();
      const formSchemaJson = JSON.stringify({ requireAll: newRequireAll, fields: newFormFields });
      const res = await createMissionAPI(activeCategory, newDesc, isoDeadline, formSchemaJson, newVisibility, newRequiresForm);
      if(res.status === "success") {
        toast.success("Misi baru berhasil dibuat");
        setNewDesc("");
        setNewDeadline("");
        setNewFormFields([]);
        setNewRequireAll(false);
        setNewVisibility(true);
        setNewRequiresForm(true);
        setNewFormSchema("");
        setIsCreateFormOpen(false);
        fetchSettings();
      } else {
        toast.error(res.message);
      }
    } catch (e) {
      toast.error("Gagal membuat misi");
    } finally {
      setIsCreating(false);
    }
  };

  const handleChange = (id: string, field: keyof MissionSetting, value: string) => {
    setSettings(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const formatForInput = (isoString: string) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().slice(0, 16);
  };

  const formatFromInput = (localString: string) => {
    if (!localString) return "";
    return new Date(localString).toISOString();
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-primary">
        <Loader2 className="animate-spin mb-4" size={40} />
        <p className="font-bold">Memuat Pengaturan Misi...</p>
      </div>
    );
  }

  const filteredSettings = settings.filter(s => s.kategori === activeCategory);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      
      {/* Header Premium */}
      <div className="bg-primary text-white rounded-3xl p-8 shadow-soft relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-extrabold flex items-center gap-3">
              <Target size={32} /> Pengaturan Misi
            </h1>
          </div>
          <div className="flex gap-2 bg-white/10 p-1.5 rounded-xl backdrop-blur-md shrink-0">
            {["QRIS", "PeKA"].map((cat) => (
              <button
                key={cat}
                onClick={() => { setActiveCategory(cat); setIsCreateFormOpen(false); }}
                className={`px-6 py-2.5 text-sm font-bold rounded-lg transition-all ${
                  activeCategory === cat
                    ? "bg-white text-primary shadow-sm"
                    : "text-white/70 hover:text-white"
                }`}
              >
                Misi {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Action Bar & Create Form */}
      <div>
        <div className="flex flex-col-reverse sm:flex-row justify-end mb-4 gap-3">
          <button
            onClick={handleBulkSave}
            disabled={isSavingBulk || filteredSettings.length === 0}
            className="flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSavingBulk ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            {isSavingBulk ? `Menyimpan (${saveProgress.current}/${saveProgress.total})...` : 'Simpan Semua Perubahan'}
          </button>
          <button
            onClick={() => setIsCreateFormOpen(!isCreateFormOpen)}
            className="flex items-center gap-2 bg-secondary hover:bg-[#F2A93B] text-primary-dark px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-sm hover:shadow-md"
          >
            {isCreateFormOpen ? <X size={18} /> : <Plus size={18} />}
            {isCreateFormOpen ? 'Batal' : `Tambah Misi ${activeCategory}`}
          </button>
        </div>

        <AnimatePresence>
          {isCreateFormOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-soft border border-slate-100 mb-6">
                <h3 className="text-xl font-bold text-primary-dark mb-6">Buat Misi Baru</h3>
                <div className="space-y-6">
                  <div>
                    <label className="text-sm font-bold text-slate-700 block mb-2">Instruksi Misi</label>
                    <div className="bg-slate-50 border-0 border-b-2 border-slate-200 focus-within:border-primary focus-within:bg-white rounded-t-xl transition-all">
                      <QuillEditor 
                        value={newDesc}
                        onChange={setNewDesc}
                        placeholder="Tulis instruksi lengkap di sini..."
                        className="text-sm font-medium text-slate-700"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-bold text-slate-700 block mb-2 flex items-center gap-2">
                      <Clock size={16} className="text-primary" /> Deadline (Opsional)
                    </label>
                    <input 
                      type="datetime-local"
                      value={newDeadline}
                      onChange={(e) => setNewDeadline(e.target.value)}
                      className="w-full bg-slate-50 border-0 border-b-2 border-slate-200 focus:border-primary focus:bg-white rounded-t-xl p-3 transition-all text-sm font-medium text-slate-700 outline-none"
                    />
                  </div>
                  
                  {/* Form & Visibility Toggles for New Mission */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <label className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
                      <input 
                        type="checkbox" 
                        checked={newVisibility} 
                        onChange={e => setNewVisibility(e.target.checked)} 
                        className="accent-primary w-5 h-5"
                      />
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-700">Tampilkan ke Peserta</span>
                        <span className="text-xs text-slate-500">Misi terlihat di dashboard peserta</span>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
                      <input 
                        type="checkbox" 
                        checked={newRequiresForm} 
                        onChange={e => setNewRequiresForm(e.target.checked)} 
                        className="accent-primary w-5 h-5"
                      />
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-700">Gunakan Formulir</span>
                        <span className="text-xs text-slate-500">Peserta wajib mengisi form laporan</span>
                      </div>
                    </label>
                  </div>

                  {/* Dynamic Form Builder for New Mission */}
                  {newRequiresForm && activeCategory !== "PeKA" && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-bold text-slate-700">Custom Form Individu</label>
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg cursor-pointer hover:bg-slate-200 transition-colors">
                          <input type="checkbox" checked={newRequireAll} onChange={e => setNewRequireAll(e.target.checked)} className="accent-primary w-3.5 h-3.5" />
                          Wajib Untuk Semua Anggota
                        </label>
                      </div>
                      <FormBuilder fields={newFormFields} onChange={setNewFormFields} />
                    </div>
                  )}

                  {activeCategory === "PeKA" && (
                    <div className="bg-slate-50 p-4 border border-slate-200 rounded-xl mt-4">
                      <label className="text-sm font-bold text-slate-700 block mb-2">Link Pre-filled Google Form</label>
                      <input 
                        type="text" 
                        value={newFormSchema}
                        onChange={(e) => setNewFormSchema(e.target.value)}
                        placeholder="https://docs.google.com/forms/d/e/.../viewform?entry.12345="
                        className="w-full bg-white border border-slate-200 focus:border-primary rounded-xl p-3 text-sm font-medium text-slate-700 outline-none"
                      />
                      <p className="text-xs text-slate-500 mt-2">
                        Paste link pre-filled Google Form di sini. Pastikan link diakhiri dengan tanda sama dengan (=) agar sistem bisa otomatis mengisi Nama Tim.
                      </p>
                    </div>
                  )}

                  <div className="pt-2 flex justify-end">
                    <button 
                      onClick={handleCreate}
                      disabled={isCreating}
                      className="flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white px-8 py-3 rounded-xl font-bold text-sm transition-all shadow-md hover:shadow-lg"
                    >
                      {isCreating ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                      Simpan Misi Baru
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mission Cards List */}
      <div className="space-y-6 relative">
        <AnimatePresence>
          {filteredSettings.map((setting, index) => {
            const visualIndex = index + 1;
            const isClosed = setting.statusManual === 'Closed';
            
            return (
              <motion.div
                key={setting.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`bg-white rounded-3xl p-6 sm:p-8 shadow-sm hover:shadow-soft border transition-all duration-300 relative overflow-hidden group ${isClosed ? 'border-danger/20' : 'border-slate-100'}`}
              >
                {/* Premium Watermark Number */}
                <div className="absolute -right-6 -bottom-10 text-[180px] font-black pointer-events-none select-none transition-all duration-500 group-hover:scale-110 group-hover:-translate-y-4 group-hover:-translate-x-4 text-slate-50 opacity-60">
                  {visualIndex}
                </div>

                {/* Status Indicator Bar */}
                <div className={`absolute top-0 left-0 w-1.5 h-full transition-colors ${isClosed ? 'bg-danger' : 'bg-success'}`} />

                <div className="relative z-10 space-y-6">
                  
                  {/* Header: Title and Status Badge */}
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-2xl font-extrabold text-primary-dark tracking-tight mb-1">Misi {visualIndex}</h3>
                    </div>
                    <div className={`px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 shadow-sm border ${
                      isClosed ? 'bg-danger/5 text-danger border-danger/10' : 'bg-success/5 text-success border-success/10'
                    }`}>
                      {isClosed ? <Lock size={14} /> : <CheckCircle2 size={14} />}
                      {isClosed ? 'Akses Ditutup' : 'Akses Terbuka'}
                    </div>
                  </div>

                  {/* Form Grid */}
                  <div className="space-y-5">
                    <div>
                      <label className="text-xs tracking-wider uppercase font-bold text-slate-400 block mb-2">Instruksi Misi</label>
                      <div className="bg-slate-50/50 border border-slate-200 focus-within:border-primary/50 focus-within:bg-white rounded-xl overflow-hidden transition-all shadow-inner">
                        <QuillEditor 
                          value={setting.deskripsi}
                          onChange={(content) => handleChange(setting.id, 'deskripsi', content)}
                          className="text-sm font-medium text-slate-700"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label className="text-xs tracking-wider uppercase font-bold text-slate-400 block mb-2">Deadline</label>
                        <input
                          type="datetime-local"
                          value={formatForInput(setting.deadline)}
                          onChange={(e) => handleChange(setting.id, 'deadline', formatFromInput(e.target.value))}
                          className="w-full bg-slate-50/50 border border-slate-200 focus:border-primary/50 focus:bg-white rounded-xl p-3.5 transition-all text-sm font-medium text-slate-700 outline-none shadow-inner"
                        />
                      </div>
                      <div>
                        <label className="text-xs tracking-wider uppercase font-bold text-slate-400 block mb-2">Akses Misi</label>
                        <div className="relative">
                          <select
                            value={setting.statusManual}
                            onChange={(e) => handleChange(setting.id, 'statusManual', e.target.value)}
                            className={`w-full appearance-none border rounded-xl p-3.5 outline-none transition-all text-sm font-bold shadow-inner ${
                              isClosed 
                                ? 'bg-danger/5 border-danger/20 text-danger focus:border-danger' 
                                : 'bg-white border-slate-200 text-slate-700 focus:border-primary'
                            }`}
                          >
                            <option value="Open" className="text-slate-700">Buka (Terima Jawaban)</option>
                            <option value="Closed" className="text-danger">Tutup Paksa (Blokir)</option>
                          </select>
                          <ChevronDown size={16} className={`absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none ${isClosed ? 'text-danger' : 'text-slate-400'}`} />
                        </div>
                      </div>
                    </div>
                    
                    {/* Visibilitas & Requires Form */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <label className="flex items-center gap-3 p-4 bg-slate-50/50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors shadow-inner">
                        <input 
                          type="checkbox" 
                          checked={isChecked(setting.visibility)} 
                          onChange={(e) => handleChange(setting.id, 'visibility', e.target.checked as any)} 
                          className="accent-primary w-5 h-5"
                        />
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-700">Tampilkan ke Peserta</span>
                          <span className="text-xs text-slate-500">Misi terlihat di dashboard peserta</span>
                        </div>
                      </label>
                      <label className="flex items-center gap-3 p-4 bg-slate-50/50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors shadow-inner">
                        <input 
                          type="checkbox" 
                          checked={isChecked(setting.requiresForm)} 
                          onChange={(e) => handleChange(setting.id, 'requiresForm', e.target.checked as any)} 
                          className="accent-primary w-5 h-5"
                        />
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-700">Gunakan Formulir</span>
                          <span className="text-xs text-slate-500">Peserta wajib mengisi form laporan</span>
                        </div>
                      </label>
                    </div>

                    {/* Dynamic Form Builder for Existing Mission */}
                    {isChecked(setting.requiresForm) && setting.kategori !== "PeKA" && (
                      <div className="pt-2">
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-xs tracking-wider uppercase font-bold text-slate-400">Custom Form Individu</label>
                          <label className="flex items-center gap-2 text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
                            <input 
                              type="checkbox" 
                              checked={(() => {
                                try { 
                                  const p = setting.formSchema ? JSON.parse(setting.formSchema) : null; 
                                  return p && !Array.isArray(p) ? p.requireAll : false;
                                } catch(e) { return false; }
                              })()} 
                              onChange={(e) => {
                                try {
                                  const p = setting.formSchema ? JSON.parse(setting.formSchema) : null;
                                  const fields = Array.isArray(p) ? p : (p?.fields || []);
                                  handleChange(setting.id, 'formSchema', JSON.stringify({ requireAll: e.target.checked, fields }));
                                } catch(err) {}
                              }} 
                              className="accent-primary w-3.5 h-3.5" 
                            />
                            Wajib Untuk Semua Anggota
                          </label>
                        </div>
                        <FormBuilder 
                          fields={(() => {
                            try { 
                              const p = setting.formSchema ? JSON.parse(setting.formSchema) : null; 
                              return Array.isArray(p) ? p : (p?.fields || []);
                            } catch(e) { return []; }
                          })()} 
                          onChange={(newFields) => {
                             try {
                               const p = setting.formSchema ? JSON.parse(setting.formSchema) : null;
                               const requireAll = p && !Array.isArray(p) ? p.requireAll : false;
                               handleChange(setting.id, 'formSchema', JSON.stringify({ requireAll, fields: newFields }));
                             } catch(err) {}
                          }} 
                        />
                      </div>
                    )}

                    {setting.kategori === "PeKA" && (
                      <div className="bg-slate-50 p-4 border border-slate-200 rounded-xl mt-4">
                        <label className="text-sm font-bold text-slate-700 block mb-2">Link Pre-filled Google Form</label>
                        <input 
                          type="text" 
                          value={setting.formSchema || ""}
                          onChange={(e) => handleChange(setting.id, 'formSchema', e.target.value)}
                          placeholder="https://docs.google.com/forms/d/e/.../viewform?entry.12345="
                          className="w-full bg-white border border-slate-200 focus:border-primary rounded-xl p-3 text-sm font-medium text-slate-700 outline-none"
                        />
                        <p className="text-xs text-slate-500 mt-2">
                          Paste link pre-filled Google Form di sini. Pastikan link diakhiri dengan tanda sama dengan (=) agar sistem bisa otomatis mengisi Nama Tim.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-5 mt-2 flex items-center justify-between border-t border-slate-100">
                    <button
                      onClick={() => handleDelete(setting.id)}
                      disabled={deletingId === setting.id}
                      className="text-slate-400 hover:text-danger hover:bg-danger/5 px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2"
                      title="Hapus Misi"
                    >
                      {deletingId === setting.id ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
                      <span className="hidden sm:inline">Hapus</span>
                    </button>
                    {/* Tombol Simpan Perubahan individu dihapus karena sekarang menggunakan Simpan Semua (Bulk Save) */}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        
        {filteredSettings.length === 0 && (
          <div className="text-center py-16 text-slate-400 font-medium bg-white rounded-3xl border border-dashed border-slate-200">
            <Target size={48} className="mx-auto mb-4 opacity-20" />
            <p>Belum ada misi yang terdaftar.</p>
            <p className="text-sm mt-1">Klik tombol 'Tambah Misi' di atas untuk memulai.</p>
          </div>
        )}
      </div>
    </div>
  );
}
