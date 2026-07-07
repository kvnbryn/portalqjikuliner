import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, CheckCircle2, X, FileVideo, Image as ImageIcon, Loader2, LogOut, ChevronRight, ExternalLink, Copy, Camera, QrCode, AlertTriangle, Users } from "lucide-react";
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
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const getDriveDirectUrl = (url: string) => {
    if (!url) return "";
    let id = "";
    const matchD = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (matchD) id = matchD[1];
    else {
      const matchId = url.match(/id=([a-zA-Z0-9_-]+)/);
      if (matchId) id = matchId[1];
    }
    return id ? `https://drive.google.com/thumbnail?id=${id}&sz=w1000` : url;
  };

  const isChecked = (val: any) => val !== false && val !== "FALSE" && val !== "false" && val !== 0 && val !== "0";

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
          const pekaMission = res.data.find(m => m.kategori === "PeKA" && isChecked(m.visibility));
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

  const filteredSettings = missionSettings.filter(m => m.kategori === kategori && isChecked(m.visibility));
  
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
              {/* Clean Professional Header */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm mb-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Misi Aktif</span>
                </div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-3">Hub Edukasi PeKA</h2>
                {filteredSettings[0].deskripsi && (
                  <div 
                    className="text-slate-600 font-medium leading-relaxed max-w-3xl text-sm sm:text-base prose-p:mb-2 prose-strong:text-slate-800"
                    dangerouslySetInnerHTML={{ __html: filteredSettings[0].deskripsi }}
                  />
                )}
              </div>

              {/* Functional Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Card 1: Share Link */}
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col h-full">
                  <div className="mb-4">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-1">
                      <ExternalLink size={18} className="text-primary" /> Bagikan Kuesioner
                    </h3>
                    <p className="text-sm text-slate-500">Salin link ini dan bagikan ke warga untuk diisi.</p>
                  </div>
                  
                  <div className="mt-auto">
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono text-slate-700 truncate flex items-center">
                        {filteredSettings[0].formSchema ? `${filteredSettings[0].formSchema}${encodeURIComponent(userName)}` : "Link belum diset"}
                      </div>
                      <button 
                        onClick={() => {
                          if (filteredSettings[0].formSchema) {
                            navigator.clipboard.writeText(`${filteredSettings[0].formSchema}${encodeURIComponent(userName)}`);
                            toast.success("Link berhasil disalin!");
                          } else {
                            toast.error("Link belum tersedia");
                          }
                        }}
                        className="bg-primary hover:bg-primary-dark text-white px-5 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shrink-0"
                      >
                        <Copy size={16} /> Salin Link
                      </button>
                    </div>
                    <button 
                      onClick={() => {
                        if (filteredSettings[0].formSchema) {
                          setShowQrCode(true);
                        } else {
                          toast.error("Link belum tersedia");
                        }
                      }}
                      className="w-full mt-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
                    >
                      <QrCode size={16} /> Tampilkan QR Code
                    </button>
                  </div>
                </div>

                {/* Card 2: Upload Bukti */}
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col h-full">
                  <div className="mb-4">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-1">
                      <Camera size={18} className="text-primary" /> Upload Bukti Dokumentasi
                    </h3>
                    <p className="text-sm text-slate-500">Pilih dan upload file dokumentasi (Foto/Video/PDF, maks 5MB/file).</p>
                  </div>

                  <div className="mt-auto relative">
                    <input 
                      type="file" 
                      multiple 
                      accept="*/*"
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
                        const loadingToast = toast.loading(`Mengupload ${validFiles.length} file...`);
                        
                        try {
                          let successCount = 0;
                          await Promise.all(validFiles.map(async (file, index) => {
                             const timestamp = new Date().toISOString() + "_" + index;
                             const namaWarga = file.name;
                             const res = await uploadPekaPhotoAPI(timestamp, namaWarga, userName, file);
                             if (res.status === "success") successCount++;
                          }));
                          
                          toast.success(`${successCount} dari ${validFiles.length} file berhasil diupload!`, { id: loadingToast });
                          fetchSettings();
                        } catch (err) {
                          toast.error("Terjadi kesalahan saat upload.", { id: loadingToast });
                        } finally {
                          setIsUploadingPhoto(null);
                          e.target.value = '';
                        }
                      }}
                    />
                    <label 
                      htmlFor="peka-bulk-upload"
                      className={`w-full border-2 border-dashed border-slate-300 hover:border-primary hover:bg-slate-50 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${isUploadingPhoto === 'bulk' ? 'opacity-50 pointer-events-none' : ''}`}
                    >
                      {isUploadingPhoto === 'bulk' ? (
                        <>
                          <Loader2 size={24} className="text-slate-400 animate-spin" />
                          <span className="text-sm font-bold text-slate-600">Sedang Mengupload...</span>
                        </>
                      ) : (
                        <>
                          <div className="bg-slate-100 p-3 rounded-full text-slate-500">
                            <Upload size={20} />
                          </div>
                          <span className="text-sm font-bold text-primary">Klik untuk Pilih File</span>
                          <span className="text-xs text-slate-400">Bisa pilih banyak file sekaligus</span>
                        </>
                      )}
                    </label>
                  </div>
                </div>

                {/* Card 3: Statistik & Responden (Full Width) */}
                <div className="md:col-span-2 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6">
                  <div className="flex-1 flex gap-6 sm:gap-10 items-center justify-center sm:justify-start w-full">
                    <div className="text-center sm:text-left">
                       <p className="text-4xl font-black text-slate-900">{pekaResponses.filter(r => r.responsesJSON && r.responsesJSON.length > 0).length}</p>
                       <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Total Responden</p>
                    </div>
                    <div className="w-px h-12 bg-slate-200 hidden sm:block"></div>
                    <div className="text-center sm:text-left">
                       <p className="text-2xl font-bold text-slate-700">{pekaStats.formCount}</p>
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Kuesioner</p>
                    </div>
                    <div className="w-px h-12 bg-slate-200 hidden sm:block"></div>
                    <div className="text-center sm:text-left">
                       <p className="text-2xl font-bold text-slate-700">{pekaStats.docCount}</p>
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Dokumen Upload</p>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => navigate('/responden')} 
                    className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white px-8 py-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shrink-0"
                  >
                    <Users size={16} /> Lihat Daftar Responden
                  </button>
                </div>

                {/* Card 4: Galeri Dokumentasi */}
                <div className="md:col-span-2 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm mt-4">
                  <h3 className="font-extrabold text-lg mb-6 flex items-center gap-2">
                    <ImageIcon size={20} className="text-secondary" /> Galeri Dokumentasi
                  </h3>
                  
                  {pekaResponses.filter(r => r.photoUrl).length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-slate-400">
                      <ImageIcon size={40} className="mb-3 opacity-50" />
                      <p className="font-medium">Belum ada dokumentasi yang diupload.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {pekaResponses.filter(r => r.photoUrl).map((res) => {
                        const isVideo = res.photoUrl.toLowerCase().includes('.mp4') || res.photoUrl.toLowerCase().includes('video');
                        const isPDF = res.photoUrl.toLowerCase().includes('.pdf');
                        return (
                          <a 
                            key={res.responseId} 
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              if (isVideo || isPDF) {
                                window.open(res.photoUrl, "_blank");
                              } else {
                                setLightboxImage(getDriveDirectUrl(res.photoUrl));
                              }
                            }}
                            className="group block aspect-square rounded-2xl bg-slate-100 overflow-hidden relative border border-slate-200 hover:border-primary hover:shadow-md transition-all cursor-pointer"
                          >
                            {isVideo || isPDF ? (
                              <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 text-slate-400 group-hover:bg-primary/5 group-hover:text-primary transition-colors">
                                {isVideo ? <FileVideo size={40} /> : <FileVideo size={40} />}
                                <span className="text-xs font-bold mt-2 text-slate-500 group-hover:text-primary transition-colors truncate w-3/4 text-center">
                                  {res.namaWarga}
                                </span>
                              </div>
                            ) : (
                              <>
                                <img src={getDriveDirectUrl(res.photoUrl)} alt={res.namaWarga} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
                                  <span className="text-white text-xs font-bold truncate w-full">{res.namaWarga}</span>
                                </div>
                              </>
                            )}
                          </a>
                        );
                      })}
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

      {/* Lightbox Modal */}
      <AnimatePresence>
        {lightboxImage && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setLightboxImage(null)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md cursor-zoom-out"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative z-10 max-w-5xl w-full h-full flex flex-col items-center justify-center pointer-events-none"
            >
              <img 
                src={lightboxImage} 
                className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl pointer-events-auto"
                alt="Enlarged view"
              />
              <button 
                onClick={() => setLightboxImage(null)}
                className="absolute top-4 right-4 sm:top-8 sm:right-8 text-white hover:text-red-400 bg-black/50 hover:bg-black/80 p-3 rounded-full transition-all pointer-events-auto backdrop-blur-sm"
              >
                <X size={24} />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
