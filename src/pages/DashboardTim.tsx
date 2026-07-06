import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, CheckCircle2, X, FileVideo, Image as ImageIcon, Loader2, LogOut, ChevronRight, ExternalLink, Copy, Camera, QrCode, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";
import QRCode from "react-qr-code";
import { uploadMissionData, getParticipantData, getMissionSettingsAPI, getPekaStatsAPI, getPekaResponsesAPI, uploadPekaPhotoAPI } from "../lib/api";

export default function DashboardTim() {
  const [userName, setUserName] = useState("");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const kategori = searchParams.get("kategori");
  
  // Dashboard states
  const [completedMissions, setCompletedMissions] = useState<string[]>([]);
  const [selectedMission, setSelectedMission] = useState<string | null>(null);
  const [isFetchingData, setIsFetchingData] = useState(true);
  const [participantFolderId, setParticipantFolderId] = useState<string>("");
  const [participantMissions, setParticipantMissions] = useState<Record<string, any>>({});
  
  const [existingFilesCache, setExistingFilesCache] = useState<Record<string, any[]>>({});
  
  // Mission Settings
  const [missionSettings, setMissionSettings] = useState<any[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  // PeKA Stats
  const [pekaStats, setPekaStats] = useState({ formCount: 0, docCount: 0 });
  const [pekaResponses, setPekaResponses] = useState<any[]>([]);
  const [showQrCode, setShowQrCode] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState<string | null>(null);

  useEffect(() => {
    const name = localStorage.getItem("tim_name");
    if (!name) {
      navigate("/");
    } else if (!kategori) {
      navigate("/pilihkategori");
    } else {
      setUserName(name);
      fetchData(name);
      fetchSettings();
    }
    
    const clockInterval = setInterval(() => setCurrentTime(new Date()), 1000);
    const pollInterval = setInterval(() => fetchSettings(), 5000);
    
    return () => {
      clearInterval(clockInterval);
      clearInterval(pollInterval);
    };
  }, [navigate, kategori]);

  const fetchSettings = async () => {
    try {
      const res = await getMissionSettingsAPI();
      if (res.status === "success" && Array.isArray(res.data)) {
        setMissionSettings(res.data);
        
        // If it's PeKA, also fetch stats
        if (kategori === "PeKA") {
          const pekaMission = res.data.find(m => m.kategori === "PeKA" && m.visibility !== false);
          if (pekaMission) {
             const statsRes = await getPekaStatsAPI(pekaMission.id);
             if (statsRes.status === "success" && Array.isArray(statsRes.data)) {
               const myStats = statsRes.data.find(s => s.teamName === localStorage.getItem("tim_name"));
               if (myStats) {
                 setPekaStats({ formCount: myStats.formCount, docCount: myStats.docCount });
               }
             }
             
             const responsesRes = await getPekaResponsesAPI(localStorage.getItem("tim_name") || "");
             if (responsesRes.status === "success" && Array.isArray(responsesRes.data)) {
               setPekaResponses(responsesRes.data);
             }
          }
        }
      }
    } catch (e) {
      console.error("Gagal polling pengaturan misi", e);
    }
  };

  // Fetching logic continues without local file fetching needed here

  const fetchData = async (name: string) => {
    setIsFetchingData(true);
    try {
      const res = await getParticipantData(name);
      if (res.status === "success" && res.data) {
        const data = res.data;
        if (data["Folder ID Tim"]) {
          setParticipantFolderId(data["Folder ID Tim"]);
        }
        
        if (data.missions) {
          setParticipantMissions(data.missions);
          const completed: string[] = [];
          Object.keys(data.missions).forEach(key => {
            if (data.missions[key].status === "Selesai") {
              completed.push(key);
            }
          });
          setCompletedMissions(completed);
        }
      }
    } catch (err) {
      toast.error("Gagal memuat status misi");
    } finally {
      setIsFetchingData(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("tim_name");
    navigate("/");
  };


  // Upload logic moved to SubmissionPage

  const formatTimeLeft = (deadlineStr: string) => {
    if (!deadlineStr) return "";
    const diff = new Date(deadlineStr).getTime() - currentTime.getTime();
    if (diff <= 0) return "Waktu Habis";
    const d = Math.floor(diff / (1000 * 60 * 60 * 24));
    const h = Math.floor((diff / (1000 * 60 * 60)) % 24).toString().padStart(2, '0');
    const m = Math.floor((diff / 1000 / 60) % 60).toString().padStart(2, '0');
    const s = Math.floor((diff / 1000) % 60).toString().padStart(2, '0');
    return `${d > 0 ? d + ' hari ' : ''}${h}:${m}:${s}`;
  };

  const filteredSettings = missionSettings.filter(m => m.kategori === kategori && m.visibility !== false);
  
  // Perhitungan progres diperbarui: 
  // Jika misi requireAll, maka progres = jumlah member yang submit === 3?
  // Tapi untuk simpelnya, saat ini kita pakai completedMissions (karena status='Selesai' dihitung dari cell).
  const progress = filteredSettings.length > 0 ? Math.round((completedMissions.filter(id => filteredSettings.some(f => f.id === id)).length / filteredSettings.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-background pb-24 text-text font-sans">
      <header className="bg-primary text-white pt-8 pb-16 px-6 rounded-b-[40px] shadow-soft relative overflow-hidden">
        <div className="absolute inset-0 w-full md:w-[60%] pointer-events-none">
          <div 
            className="absolute inset-0 opacity-10" 
            style={{ 
              backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.4) 1px, transparent 1px)', 
              backgroundSize: '40px 40px',
              maskImage: 'radial-gradient(ellipse at 20% 50%, black 10%, transparent 70%)',
              WebkitMaskImage: 'radial-gradient(ellipse at 20% 50%, black 10%, transparent 70%)'
            }} 
          />
          <div className="absolute top-[-20%] left-[-10%] w-[400px] h-[400px] bg-secondary/20 blur-[120px] rounded-full mix-blend-screen" />
          <div className="absolute bottom-[-30%] left-[20%] w-[500px] h-[500px] bg-white/10 blur-[130px] rounded-full mix-blend-overlay" />
        </div>
        
        <div 
          className="absolute top-0 right-0 w-[100%] md:w-[70%] h-full pointer-events-none"
          style={{ 
            maskImage: 'linear-gradient(to right, transparent 0%, black 25%, black 100%)',
            WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 25%, black 100%)'
          }}
        >
          <img 
            src="/banner.webp" 
            alt="Banner" 
            className="absolute inset-0 w-full h-full object-cover opacity-90" 
            style={{ objectPosition: 'center 80%' }}
          />
          <div className="absolute inset-0 bg-primary-dark/40 mix-blend-overlay" />
        </div>
        
        <div className="absolute top-6 right-6 z-30">
          <button 
            onClick={handleLogout} 
            className="flex items-center gap-2 text-sm font-bold text-red-100 hover:text-white transition-all bg-red-500/20 hover:bg-red-500/40 px-4 py-2 rounded-full border border-red-500/30 shadow-sm backdrop-blur-md"
          >
            <LogOut size={16} /> <span className="hidden sm:inline">Keluar</span>
          </button>
        </div>
        
        <div className="max-w-4xl mx-auto relative z-10">
          
          <div>
            <div className="mb-4">
              <button onClick={() => navigate('/pilihkategori')} className="inline-flex bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 text-white items-center gap-1.5 text-sm font-bold transition-all px-4 py-2 rounded-full shadow-sm">
                 <ChevronRight className="rotate-180" size={16} /> Kembali
              </button>
            </div>
            <h1 className="font-extrabold text-4xl sm:text-5xl tracking-tight mb-8 text-white drop-shadow-lg" style={{ textShadow: '0 4px 24px rgba(0,0,0,0.5)' }}>{userName}</h1>
            
            <div className="bg-surface/10 backdrop-blur-md border border-white/20 rounded-2xl p-5 w-full sm:w-[320px]">
              <p className="text-white/80 font-bold mb-3 tracking-widest uppercase text-[10px]">Kategori {kategori}</p>
              <div className="flex justify-between items-end mb-3">
                <p className="text-sm font-semibold">Progres Misi</p>
                <p className="text-2xl font-bold text-secondary">{progress}%</p>
              </div>
              <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                  className="h-full bg-secondary rounded-full"
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 -mt-6 relative z-20">
        {kategori === "PeKA" ? (
          filteredSettings.length > 0 ? (
            <div className="space-y-6 sm:space-y-8">
              {/* Header Card */}
              <div className="bg-white rounded-[2rem] p-6 sm:p-10 border border-slate-200 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 mb-8">
                  <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-4">Hub Edukasi PeKA</h2>
                    {filteredSettings[0].deskripsi && (
                      <div 
                        className="text-slate-600 font-medium leading-relaxed max-w-2xl prose-p:mb-2 prose-strong:font-bold prose-strong:text-slate-800"
                        dangerouslySetInnerHTML={{ __html: filteredSettings[0].deskripsi }}
                      />
                    )}
                  </div>
                  <div className="shrink-0 flex gap-5 sm:gap-8 text-center bg-slate-50 border border-slate-100 p-4 sm:px-6 rounded-2xl self-start">
                    <div>
                      <p className="text-3xl font-black text-slate-900">{pekaStats.formCount}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Kuesioner</p>
                    </div>
                    <div className="w-px bg-slate-200"></div>
                    <div>
                      <p className="text-3xl font-black text-slate-900">{pekaStats.docCount}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Foto Upload</p>
                    </div>
                  </div>
                </div>

                {/* Link & QR Section */}
                <div className="bg-primary/5 border border-primary/10 rounded-3xl p-6 sm:p-8">
                  <p className="text-sm font-extrabold text-primary uppercase tracking-widest mb-4 flex items-center gap-2">
                    <ExternalLink size={18} /> Link Publik Kuesioner
                  </p>
                  
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 bg-white border border-slate-200 rounded-2xl px-5 py-4 text-sm font-mono text-slate-700 break-all flex items-center shadow-sm">
                      {filteredSettings[0].formSchema ? `${filteredSettings[0].formSchema}${encodeURIComponent(userName)}` : "Link belum diset admin"}
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-3 shrink-0">
                      <button 
                        onClick={() => {
                          if (filteredSettings[0].formSchema) {
                            navigator.clipboard.writeText(`${filteredSettings[0].formSchema}${encodeURIComponent(userName)}`);
                            toast.success("Link berhasil disalin!");
                          } else {
                            toast.error("Link belum tersedia");
                          }
                        }}
                        className="bg-primary hover:bg-primary-dark text-white px-6 py-4 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-md"
                      >
                        <Copy size={18} strokeWidth={2.5} /> <span className="sm:hidden lg:inline">Salin Link</span>
                      </button>
                      <button 
                        onClick={() => {
                          if (filteredSettings[0].formSchema) {
                            setShowQrCode(true);
                          } else {
                            toast.error("Link belum tersedia");
                          }
                        }}
                        className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-6 py-4 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-sm"
                      >
                        <QrCode size={18} strokeWidth={2.5} /> <span className="sm:hidden lg:inline">Tampilkan QR</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bulk Upload Section */}
              <div className="bg-slate-900 text-white rounded-[2rem] p-6 sm:p-10 border border-slate-800 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
                
                <h3 className="text-2xl font-black mb-3 relative z-10 tracking-tight">Upload Bukti Dokumentasi</h3>
                <p className="text-slate-400 font-medium mb-6 relative z-10 text-sm max-w-2xl leading-relaxed">
                  Upload foto-foto bukti edukasi PeKA di sini. Anda bisa memilih banyak foto sekaligus (Bulk Upload).
                </p>
                
                <div className="relative z-10 flex flex-col sm:flex-row gap-4 items-center">
                  <input 
                    type="file" 
                    multiple 
                    accept="image/*"
                    id="peka-bulk-upload"
                    className="hidden"
                    onChange={async (e) => {
                      const files = Array.from(e.target.files || []);
                      if (files.length === 0) return;
                      
                      const validFiles = files.filter(f => f.size <= 5 * 1024 * 1024);
                      if (validFiles.length < files.length) {
                        toast.error("Beberapa file diabaikan karena ukurannya melebihi 5MB.");
                      }
                      if (validFiles.length === 0) return;

                      setIsUploadingPhoto("bulk");
                      const loadingToast = toast.loading(`Mengupload ${validFiles.length} foto secara bersamaan...`);
                      
                      try {
                        let successCount = 0;
                        await Promise.all(validFiles.map(async (file) => {
                           const timestamp = new Date().toISOString();
                           const namaWarga = "Bulk Upload";
                           const res = await uploadPekaPhotoAPI(timestamp, namaWarga, userName, file);
                           if (res.status === "success") successCount++;
                        }));
                        
                        toast.success(`${successCount} dari ${validFiles.length} foto berhasil diupload!`, { id: loadingToast });
                        fetchSettings();
                      } catch (err) {
                        toast.error("Terjadi kesalahan saat upload bulk.", { id: loadingToast });
                      } finally {
                        setIsUploadingPhoto(null);
                        e.target.value = '';
                      }
                    }}
                  />
                  <label 
                    htmlFor="peka-bulk-upload"
                    className={`w-full sm:w-auto bg-primary hover:bg-primary-dark text-white px-8 py-4 rounded-2xl font-bold text-sm transition-all shadow-md flex items-center justify-center gap-3 cursor-pointer ${isUploadingPhoto === 'bulk' ? 'opacity-50 pointer-events-none' : ''}`}
                  >
                    {isUploadingPhoto === 'bulk' ? <Loader2 size={20} className="animate-spin" /> : <Camera size={20} strokeWidth={2.5} />}
                    {isUploadingPhoto === 'bulk' ? "Sedang Mengupload..." : "Pilih & Upload Banyak Foto"}
                  </label>
                  <p className="text-xs text-slate-500 font-bold tracking-widest uppercase">Format Foto • Maks 5MB/file</p>
                </div>
              </div>

              {/* Checklist Edukasi */}
              <div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3 mb-6 px-2">
                  <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Daftar Responden ({pekaResponses.length})</h3>
                    <p className="text-sm text-slate-500 font-medium mt-1">Daftar warga yang telah mengisi kuesioner dari link Anda.</p>
                  </div>
                  <button onClick={fetchSettings} className="text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors flex items-center gap-1 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-xl">
                     Segarkan Data
                  </button>
                </div>
                
                <div className="bg-white border border-slate-200 rounded-[2rem] shadow-sm overflow-hidden">
                  {pekaResponses.length === 0 ? (
                    <div className="text-center py-16">
                      <p className="text-slate-500 font-medium">Belum ada masyarakat yang mensubmit kuesioner.</p>
                    </div>
                  ) : (
                    <div className="max-h-[400px] overflow-y-auto custom-scrollbar p-2">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 sticky top-0 z-10 rounded-xl">
                          <tr>
                            <th className="p-4 font-bold text-slate-500 rounded-l-xl uppercase tracking-widest text-xs">Nama Responden</th>
                            <th className="p-4 font-bold text-slate-500 text-right rounded-r-xl uppercase tracking-widest text-xs">Waktu Submit</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {pekaResponses.map((res, idx) => {
                            const namaWarga = res.namaWarga || `Responden #${pekaResponses.length - idx}`;
                            return (
                              <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                <td className="p-4 font-bold text-slate-900">{namaWarga}</td>
                                <td className="p-4 font-medium text-slate-500 text-right whitespace-nowrap">{res.timestamp}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
             <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
               <div className="w-20 h-20 mb-6 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 shadow-sm">
                 <Loader2 size={32} className="text-slate-400 animate-[spin_3s_linear_infinite]" />
               </div>
               <h2 className="text-2xl font-black text-slate-800 mb-3 tracking-tight">Misi Edukasi PeKA Sedang Disiapkan</h2>
               <p className="text-slate-500 font-medium max-w-md mx-auto leading-relaxed">
                 Tim admin sedang meracik misi edukasi PeKA selanjutnya untuk Anda. Pantau terus halaman ini secara berkala ya!
               </p>
             </div>
          )
        ) : filteredSettings.length === 0 && !isFetchingData ? (
          <div className="text-center py-20 bg-white rounded-3xl shadow-soft border border-slate-100">
            <p className="text-muted-foreground font-medium">Belum ada misi di kategori {kategori}.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredSettings.map((mission, index) => {
              const isCompleted = completedMissions.includes(mission.id);
              const isLocked = mission.statusManual === 'Closed' || new Date() > new Date(mission.deadline);
              const delay = index * 0.1;
              const visualIndex = index + 1;
              
              return (
                <motion.div 
                  key={mission.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay, duration: 0.5 }}
                  className={`glass-panel p-5 sm:p-6 rounded-2xl flex flex-col sm:flex-row gap-5 items-start sm:items-center justify-between group transition-all duration-300 relative overflow-hidden ${
                    isLocked ? 'border-danger/30 bg-danger/5 opacity-80' :
                    isCompleted ? 'border-success/30 bg-success/5 shadow-[0_0_15px_rgba(22,163,74,0.05)]' : 'hover:border-primary/30 hover:shadow-soft'
                  }`}
                >
                  {isLocked && (
                    <div className="absolute top-0 right-0 bg-danger text-white text-xs font-bold px-3 py-1 rounded-bl-xl flex items-center gap-1 shadow-md z-10">
                      <X size={12} /> DITUTUP
                    </div>
                  )}
                  
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                      isLocked ? 'bg-danger/20 text-danger' :
                      isCompleted ? 'bg-success text-white' : 'bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'
                    }`}>
                      {isCompleted && !isLocked ? <CheckCircle2 size={24} /> : <span className="font-bold">{visualIndex}</span>}
                    </div>
                    <div className="flex flex-col justify-center">
                      <div className="flex items-center gap-3">
                        <h3 className={`font-bold text-lg mb-1 transition-colors ${
                          isLocked ? 'text-danger' :
                          isCompleted ? 'text-success' : 'text-text group-hover:text-primary-dark'
                        }`}>
                          Misi {visualIndex}
                        </h3>
                        {!isLocked && mission.deadline && (
                          <span className="text-xs font-mono bg-background/50 border border-border px-2 py-0.5 rounded-md text-primary-dark flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
                            {formatTimeLeft(mission.deadline)}
                          </span>
                        )}
                      </div>
                      <div 
                        className={`text-sm font-medium prose prose-sm max-w-none ${isLocked ? 'text-danger/70 prose-p:text-danger/70' : 'text-slate-600 prose-p:text-slate-600'}`}
                        dangerouslySetInnerHTML={{ __html: mission.deskripsi || "" }}
                      />
                    </div>
                  </div>
                  
                  <button
                    onClick={() => navigate(`/submission/${mission.id}?kategori=${kategori}`)}
                    disabled={isLocked}
                    className={`w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                      isLocked ? 'bg-danger/10 text-danger cursor-not-allowed opacity-50' :
                      isCompleted 
                        ? 'bg-white border-2 border-success/20 text-success hover:bg-success/5'
                        : 'bg-primary text-white shadow-soft hover:bg-primary-dark hover:scale-105 hover:shadow-lg'
                    }`}
                  >
                    {isLocked ? (
                      <>Terkunci</>
                    ) : isCompleted ? (
                      <>Lihat & Tambah Bukti <ChevronRight size={16} /></>
                    ) : (
                      <>Mulai Misi <ChevronRight size={16} /></>
                    )}
                  </button>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>
      <AnimatePresence>
        {showQrCode && filteredSettings[0]?.formSchema && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowQrCode(false)}
              className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full relative z-10 flex flex-col items-center text-center"
            >
              <button 
                onClick={() => setShowQrCode(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
              
              <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-6">
                <QrCode size={32} />
              </div>
              
              <h3 className="text-2xl font-black text-slate-800 mb-2">Scan QR Code</h3>
              <p className="text-sm font-medium text-slate-500 mb-8">
                Arahkan kamera HP responden ke QR code ini untuk membuka form edukasi PeKA secara otomatis.
              </p>
              
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-8 w-full max-w-[240px] mx-auto flex items-center justify-center">
                <QRCode 
                  value={`${filteredSettings[0].formSchema}${encodeURIComponent(userName)}`}
                  size={200}
                  style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                />
              </div>
              
              <button 
                onClick={() => setShowQrCode(false)}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-xl text-sm font-bold transition-all shadow-md"
              >
                Tutup QR Code
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
