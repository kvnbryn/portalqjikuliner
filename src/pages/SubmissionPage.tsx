import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Upload, X, FileVideo, Image as ImageIcon, Loader2, ChevronLeft, CheckCircle2, Info, FileText } from "lucide-react";
import toast from "react-hot-toast";
import { getMissionSettingsAPI, getParticipantData, uploadMissionData, getMissionFiles } from "../lib/api";

export default function SubmissionPage() {
  const { missionId } = useParams();
  const [searchParams] = useSearchParams();
  const kategori = searchParams.get("kategori") || "";
  const navigate = useNavigate();

  const [userName, setUserName] = useState("");
  const [memberIdentity, setMemberIdentity] = useState("");
  
  const [missionSetting, setMissionSetting] = useState<any>(null);
  const [formSchema, setFormSchema] = useState<any[]>([]);
  const [requireAll, setRequireAll] = useState(false);
  
  const [existingFiles, setExistingFiles] = useState<any[]>([]);
  const [isFetchingFiles, setIsFetchingFiles] = useState(false);
  const [hasSubmittedForm, setHasSubmittedForm] = useState(false);
  const [teamSubmittedMembers, setTeamSubmittedMembers] = useState<string[]>([]);
  
  // Form & Upload States
  const [uploadFiles, setUploadFiles] = useState<{file: File, description: string}[]>([]);
  const [formResponses, setFormResponses] = useState<Record<string, string>>({});
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });

  useEffect(() => {
    const teamName = localStorage.getItem("tim_name");
    const member = localStorage.getItem("tim_member");
    
    if (!teamName || !member) {
      navigate("/");
      return;
    }
    
    setUserName(teamName);
    setMemberIdentity(member);
    fetchInitialData(teamName, member);
  }, [navigate, missionId]);

  const fetchInitialData = async (teamName: string, member: string) => {
    try {
      // 1. Fetch Mission Settings
      const settingsRes = await getMissionSettingsAPI();
      if (settingsRes.status === "success" && Array.isArray(settingsRes.data)) {
        const currentMission = settingsRes.data.find(m => m.id == missionId);
        if (currentMission) {
          setMissionSetting(currentMission);
          try {
            const parsed = currentMission.formSchema ? JSON.parse(currentMission.formSchema) : null;
            if (Array.isArray(parsed)) {
               setFormSchema(parsed);
               setRequireAll(false);
            } else if (parsed && parsed.fields) {
               setFormSchema(parsed.fields);
               setRequireAll(parsed.requireAll || false);
            }
          } catch (e) {}
        }
      }

      // 2. Fetch Participant Data for this specific mission
      const participantRes = await getParticipantData(teamName);
      if (participantRes.status === "success" && participantRes.data && participantRes.data.missions) {
        const missionData = participantRes.data.missions[missionId || ""];
        
        if (missionData) {
          const submittedMembers = missionData.submittedMembers || [];
          setTeamSubmittedMembers(submittedMembers);
          if (submittedMembers.includes(member)) {
            setHasSubmittedForm(true);
          }
          
          if (missionData.folderUrl) {
            fetchFiles(missionData.folderUrl);
          }
        }
      }
    } catch (e) {
      console.error(e);
      toast.error("Gagal memuat data misi.");
    }
  };

  const fetchFiles = async (folderUrl: string) => {
    setIsFetchingFiles(true);
    try {
      const res = await getMissionFiles(folderUrl);
      if (res.status === "success" && Array.isArray(res.data)) {
        setExistingFiles(res.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsFetchingFiles(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files).map(f => ({ file: f, description: "" }));
      setUploadFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setUploadFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleDescriptionChange = (index: number, desc: string) => {
    setUploadFiles(prev => prev.map((item, i) => i === index ? { ...item, description: desc } : item));
  };

  const toBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleSubmit = async () => {
    // Determine what we are submitting
    const hasFiles = uploadFiles.length > 0;
    
    // Check form validity only if hasn't submitted
    let formResponsesArr: any[] = [];
    if (!hasSubmittedForm && missionSetting?.requiresForm !== false && formSchema.length > 0) {
      for (const field of formSchema) {
        if (field.required && (!formResponses[field.id] || formResponses[field.id].trim() === "")) {
          toast.error(`Wajib mengisi pertanyaan form: ${field.question}`);
          return;
        }
      }
      formResponsesArr = formSchema.map((field: any) => ({
        question: field.question,
        answer: formResponses[field.id] || ""
      }));
    }

    const hasFormAnswers = formResponsesArr.some(r => r.answer !== "");

    if (!hasFiles && !hasFormAnswers) {
      toast.error("Tidak ada file atau form yang diisi untuk dikirim!");
      return;
    }

    if (hasFiles && uploadFiles.some(f => !f.description.trim())) {
      toast.error("Wajib mengisi deskripsi untuk setiap foto/file baru!");
      return;
    }

    setIsUploading(true);
    
    try {
      if (hasFiles) {
        setUploadProgress({ current: 0, total: uploadFiles.length });
        
        for (let i = 0; i < uploadFiles.length; i++) {
          const item = uploadFiles[i];
          setUploadProgress({ current: i + 1, total: uploadFiles.length });
          const base64 = await toBase64(item.file);
          
          // Attach form only on the FIRST file upload to avoid duplicates in cell
          const formPayload = i === 0 ? formResponsesArr : [];
          
          const res = await uploadMissionData(
            userName, 
            missionId as string, 
            base64, 
            item.file.name, 
            item.file.type,
            item.description,
            memberIdentity,
            formPayload
          );
          
          if (res.status !== "success") throw new Error(res.message);
        }
      } else {
        // Form Only Submission
        setUploadProgress({ current: 1, total: 1 });
        const res = await uploadMissionData(
          userName, 
          missionId as string, 
          "", 
          "", 
          "",
          "",
          memberIdentity,
          formResponsesArr
        );
        if (res.status !== "success") throw new Error(res.message);
      }
      
      toast.success("Berhasil dikirim!");
      
      // Cleanup
      setUploadFiles([]);
      setFormResponses({});
      fetchInitialData(userName, memberIdentity); // Refresh
      
    } catch (err: any) {
      toast.error(err.message || "Terjadi kesalahan saat submit.");
    } finally {
      setIsUploading(false);
    }
  };

  if (!missionSetting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="animate-spin text-primary" size={48} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 text-text font-sans">
      {/* Header */}
      <header className="bg-primary text-white pt-8 pb-10 px-6 rounded-b-[40px] shadow-soft relative overflow-hidden">
         <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white via-transparent to-transparent pointer-events-none" />
         
         <div className="max-w-6xl mx-auto relative z-10">
           <button onClick={() => navigate(`/dashboard?kategori=${kategori}`)} className="flex items-center gap-2 text-white/80 hover:text-white transition-colors mb-6 text-sm font-semibold">
             <ChevronLeft size={16} /> Kembali ke Dashboard
           </button>
           
           <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
             <div>
               <div className="flex items-center gap-3 mb-2">
                 <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold tracking-wider backdrop-blur-md">
                   {missionSetting.kategori}
                 </span>
                 {requireAll && (
                   <span className="bg-warning text-warning-foreground px-3 py-1 rounded-full text-xs font-bold tracking-wider flex items-center gap-1 shadow-sm">
                     <Info size={12} /> Wajib Seluruh Anggota
                   </span>
                 )}
               </div>
               <h1 className="text-3xl font-extrabold tracking-tight mb-2">Penyerahan Tugas</h1>
               <p className="text-white/80 font-medium">Tim: {userName} • Akses: {memberIdentity}</p>
             </div>
           </div>
         </div>
      </header>      <main className="max-w-4xl mx-auto px-4 sm:px-6 -mt-8 relative z-20">
        
        {/* Info Misi */}
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-8 shadow-xl shadow-slate-200/50 border border-white mb-8 prose prose-sm max-w-none text-slate-700">
           <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
             <Info size={14} className="text-primary" /> Info Misi
           </h3>
           <div className="text-base leading-relaxed" dangerouslySetInnerHTML={{ __html: missionSetting.deskripsi }} />
        </div>

        <div className="space-y-8">
          
          {/* BAGIAN 1: KUESIONER (Ditampilkan hanya jika ada form dan requiresForm aktif) */}
          {missionSetting?.requiresForm !== false && formSchema.length > 0 && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-100">
              <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="text-xl font-black text-secondary flex items-center gap-3">
                  <div className="p-2 bg-secondary/10 text-secondary rounded-xl"><FileText size={20} /></div>
                  Kuesioner
                </h2>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-500">User:</span>
                  <span className="text-xs font-black uppercase tracking-wider bg-slate-800 text-white px-3 py-1 rounded-full shadow-sm">{memberIdentity}</span>
                </div>
              </div>

              {hasSubmittedForm ? (
                 <div className="bg-success/10 border border-success/20 rounded-2xl p-5 flex items-start gap-4 mb-6">
                   <div className="bg-success text-white p-1.5 rounded-full shrink-0 mt-0.5">
                     <CheckCircle2 size={16} />
                   </div>
                   <div>
                     <h3 className="font-bold text-success-dark text-sm mb-1">Formulir Selesai</h3>
                     <p className="text-xs text-success-dark/80 font-medium leading-relaxed">Jawaban kuesioner Anda telah disimpan. Silakan lanjut ke bagian dokumentasi di bawah.</p>
                   </div>
                 </div>
              ) : null}

              <div className="space-y-6">
                {formSchema.map((field: any) => (
                  <div key={field.id} className="space-y-3">
                    <label className="text-sm font-bold text-slate-800 block">
                      {field.question} {field.required && <span className="text-danger">*</span>}
                    </label>
                    
                    {field.type === 'text' && (
                      <input type="text" placeholder="Ketik jawaban..." value={formResponses[field.id] || ""} onChange={(e) => setFormResponses({...formResponses, [field.id]: e.target.value})} className={`w-full p-4 rounded-xl border border-slate-200 bg-slate-50/50 transition-all text-sm font-medium text-slate-700 shadow-inner ${hasSubmittedForm ? 'opacity-50 cursor-not-allowed' : 'focus:bg-white outline-none focus:border-secondary focus:ring-4 focus:ring-secondary/10'}`} disabled={isUploading || hasSubmittedForm} />
                    )}
                    {field.type === 'textarea' && (
                      <textarea placeholder="Ketik penjelasan detail..." value={formResponses[field.id] || ""} onChange={(e) => setFormResponses({...formResponses, [field.id]: e.target.value})} className={`w-full p-4 rounded-xl border border-slate-200 bg-slate-50/50 transition-all text-sm font-medium text-slate-700 shadow-inner ${hasSubmittedForm ? 'opacity-50 cursor-not-allowed' : 'focus:bg-white outline-none focus:border-secondary focus:ring-4 focus:ring-secondary/10'}`} disabled={isUploading || hasSubmittedForm} rows={4}></textarea>
                    )}
                    {field.type === 'radio' && field.options && (
                      <div className="space-y-3 pt-1">
                        {field.options.map((opt: string, i: number) => (
                          <label key={i} className={`flex items-center gap-3 text-sm font-medium text-slate-700 p-3 rounded-xl border border-slate-100 transition-colors cursor-pointer ${hasSubmittedForm ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-50 hover:border-secondary/30'}`}>
                            <input type="radio" name={field.id} value={opt} checked={formResponses[field.id] === opt} onChange={(e) => setFormResponses({...formResponses, [field.id]: e.target.value})} className="accent-secondary w-4 h-4 cursor-pointer" disabled={isUploading || hasSubmittedForm} />
                            {opt}
                          </label>
                        ))}
                      </div>
                    )}
                    {field.type === 'checkbox' && field.options && (
                       <div className="space-y-3 pt-1">
                       {field.options.map((opt: string, i: number) => {
                         const currentVals = formResponses[field.id] ? formResponses[field.id].split(', ') : [];
                         return (
                         <label key={i} className={`flex items-center gap-3 text-sm font-medium text-slate-700 p-3 rounded-xl border border-slate-100 transition-colors cursor-pointer ${hasSubmittedForm ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-50 hover:border-secondary/30'}`}>
                           <input type="checkbox" checked={currentVals.includes(opt)} onChange={(e) => {
                             if (e.target.checked) {
                               setFormResponses({...formResponses, [field.id]: [...currentVals, opt].join(', ')});
                             } else {
                               setFormResponses({...formResponses, [field.id]: currentVals.filter(v => v !== opt).join(', ')});
                             }
                           }} className="accent-secondary w-4 h-4 cursor-pointer" disabled={isUploading || hasSubmittedForm} />
                           {opt}
                         </label>
                         );
                       })}
                     </div>
                    )}
                  </div>
                ))}
              </div>

              {teamSubmittedMembers.length > 0 && (
                 <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <CheckCircle2 size={12} className="text-success" /> Progres Tim
                   </p>
                   <div className="flex flex-wrap gap-2">
                      {teamSubmittedMembers.map(m => (
                        <span key={m} className={`text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full ${m === memberIdentity ? 'bg-secondary text-white' : 'bg-slate-100 text-slate-500'}`}>
                          {m}
                        </span>
                      ))}
                   </div>
                 </div>
              )}
            </div>
          )}
          
          {/* BAGIAN 2: DOKUMENTASI */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-100">
            <div className="mb-6">
              <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-3 mb-1">
                <div className="p-2 bg-primary/10 text-primary rounded-xl"><ImageIcon size={20} /></div>
                Dokumentasi
              </h2>
              <p className="text-sm text-slate-500 font-medium">Unggah foto atau video bukti pelaksanaan misi.</p>
            </div>

            {/* Existing Files */}
            {isFetchingFiles ? (
              <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" size={24} /></div>
            ) : existingFiles.length > 0 && (
              <div className="mb-6 bg-slate-50 rounded-2xl p-4 border border-slate-200">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Dokumen Tersimpan</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[250px] overflow-y-auto custom-scrollbar pr-2">
                  {existingFiles.map((f, i) => {
                      const isImage = f.mimeType.includes("image");
                      const isVideo = f.mimeType.includes("video");
                      return (
                        <div key={i} className="group relative bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-primary/40 transition-all hover:shadow-sm cursor-pointer flex flex-col">
                          {isImage ? (
                            <a href={f.downloadUrl} target="_blank" rel="noreferrer" className="block h-24 w-full overflow-hidden bg-slate-200 relative shrink-0">
                              <img src={f.downloadUrl} alt="thumb" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                            </a>
                          ) : (
                            <a href={f.downloadUrl} target="_blank" rel="noreferrer" className="h-24 w-full bg-slate-100 flex flex-col items-center justify-center text-slate-400 group-hover:text-primary transition-colors shrink-0">
                              {isVideo ? <FileVideo size={24} className="mb-2" /> : <ImageIcon size={24} className="mb-2" />}
                              <span className="text-[9px] font-bold uppercase tracking-wider">{isVideo ? 'Video' : 'File'}</span>
                            </a>
                          )}
                          <div className="p-2 bg-white flex-1 flex flex-col justify-between">
                            <p className="text-[10px] font-bold truncate text-slate-700" title={f.name}>{f.name}</p>
                          </div>
                        </div>
                      );
                  })}
                </div>
              </div>
            )}

            {/* Upload Area */}
            <div className="relative overflow-hidden group bg-primary/5 hover:bg-primary/10 border-2 border-dashed border-primary/20 hover:border-primary/50 rounded-2xl p-8 flex flex-col items-center justify-center transition-all duration-300 shadow-sm cursor-pointer mb-4">
              <input type="file" multiple onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer z-10" disabled={isUploading} />
              <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-primary mb-3 group-hover:scale-110 transition-transform">
                <Upload size={20} />
              </div>
              <p className="font-bold text-primary-dark text-sm">Pilih File</p>
            </div>

            {uploadFiles.length > 0 && (
              <div className="grid grid-cols-1 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Daftar Unggahan Baru</p>
                {uploadFiles.map((item, index) => (
                   <div key={index} className="flex flex-col bg-white border border-slate-200 rounded-xl p-3 gap-2">
                     <div className="flex justify-between items-center">
                       <span className="text-xs font-bold truncate text-slate-700 flex items-center gap-2">
                         <FileVideo size={14} className="text-slate-400" /> {item.file.name}
                       </span>
                       <button onClick={() => removeFile(index)} className="text-danger hover:bg-danger/10 p-1 rounded-md transition-colors"><X size={14} /></button>
                     </div>
                     <input type="text" placeholder="Keterangan file (wajib)..." value={item.description} onChange={(e) => handleDescriptionChange(index, e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-medium outline-none focus:border-primary transition-colors" />
                   </div>
                ))}
              </div>
            )}
          </div>

          {/* SUBMIT BUTTON AREA */}
          <div className="pt-2 sticky bottom-6 z-30">
             {isUploading && (
                <div className="mb-4 bg-white p-4 rounded-2xl shadow-lg border border-slate-100">
                  <div className="flex justify-between text-xs font-black uppercase tracking-wider text-secondary mb-2">
                    <span className="flex items-center gap-2"><Loader2 size={14} className="animate-spin"/> Mengunggah Data...</span>
                    {uploadFiles.length > 0 && <span>{uploadProgress.current} / {uploadProgress.total}</span>}
                  </div>
                  <div className="w-full bg-secondary/10 rounded-full h-2.5 overflow-hidden">
                    <motion.div className="bg-secondary h-2.5 rounded-full" initial={{ width: 0 }} animate={{ width: uploadFiles.length > 0 ? `${(uploadProgress.current / uploadProgress.total) * 100}%` : '100%' }} transition={{ duration: 0.3 }} />
                  </div>
                </div>
             )}
             
             <button 
               onClick={handleSubmit}
               disabled={isUploading || (uploadFiles.length === 0 && (hasSubmittedForm || Object.keys(formResponses).length === 0))}
               className="w-full py-5 rounded-2xl bg-slate-900 hover:bg-black text-white font-black tracking-wide shadow-xl hover:shadow-2xl hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-3 text-sm"
             >
               {isUploading ? "Memproses..." : "Kirim Jawaban & Dokumen"}
             </button>
          </div>
        </div>
      </main>
    </div>
  );
}
