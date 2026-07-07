import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, CheckCircle2, Clock, Image as ImageIcon, Video, ExternalLink, Loader2, Maximize2, X, FileText, UserCircle, AlertTriangle, FileVideo } from "lucide-react";
import toast from "react-hot-toast";
import { getParticipantData, getMissionFiles, getMissionSettingsAPI, getPekaStatsAPI, getPekaResponsesAPI } from "../lib/api";

const parseRawContent = (rawText: string) => {
  if (!rawText) return [];
  const submissions = rawText.split('====================').map(s => s.trim()).filter(s => s);
  
  return submissions.map(sub => {
    const pengumpulMatch = sub.match(/\[Pengumpul:\s*(.*?)(?:\s*\(.*?\))?\]/);
    const pengumpul = pengumpulMatch ? pengumpulMatch[1].trim() : "Unknown";
    
    const waktuMatch = sub.match(/Waktu:\s*(.*)/);
    const waktu = waktuMatch ? waktuMatch[1].trim() : "-";
    
    const formIndex = sub.indexOf("--- JAWABAN FORM ---");
    let deskripsi = "";
    let formData = "";
    
    if (formIndex !== -1) {
       const beforeForm = sub.substring(0, formIndex);
       const deskripsiMatch = beforeForm.match(/Deskripsi:\n([\s\S]*?)$/);
       if (deskripsiMatch) deskripsi = deskripsiMatch[1].trim();
       
       formData = sub.substring(formIndex + "--- JAWABAN FORM ---".length).trim();
    } else {
       const deskripsiMatch = sub.match(/Deskripsi:\n([\s\S]*?)$/);
       if (deskripsiMatch) deskripsi = deskripsiMatch[1].trim();
    }
    
    const qaPairs: {q: string, a: string}[] = [];
    if (formData) {
       const blocks = formData.split('\n\n');
       blocks.forEach(block => {
         const lines = block.split('\n');
         const qLine = lines.find(l => l.startsWith('Q: '));
         const aLine = lines.find(l => l.startsWith('A: '));
         if (qLine) {
           qaPairs.push({
             q: qLine.replace('Q: ', '').trim(),
             a: aLine ? aLine.replace('A: ', '').trim() : ""
           });
         }
       });
    }

    return { pengumpul, waktu, deskripsi, qaPairs };
  }).reverse(); // Most recent first
};

export default function AdminTimDetail() {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  
  const [participantData, setParticipantData] = useState<any>(null);
  const [missionSettings, setMissionSettings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [selectedMissionId, setSelectedMissionId] = useState<string | null>(null);
  const [missionFiles, setMissionFiles] = useState<any[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [missionFilesCache, setMissionFilesCache] = useState<Record<string, any[]>>({});
  
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("QRIS");

  // PeKA States
  const [pekaStats, setPekaStats] = useState({ formCount: 0, docCount: 0 });
  const [pekaResponses, setPekaResponses] = useState<any[]>([]);
  const [selectedRespondent, setSelectedRespondent] = useState<any>(null);

  const getDriveDirectUrl = (url: string) => {
    if (!url) return "";
    let id = "";
    const matchD = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (matchD) id = matchD[1];
    else {
      const matchId = url.match(/id=([a-zA-Z0-9_-]+)/);
      if (matchId) id = matchId[1];
    }
    return id ? `https://drive.google.com/uc?export=view&id=${id}` : url;
  };

  useEffect(() => {
    if (name) {
      fetchData(name);
    }
  }, [name]);

  const fetchData = async (participantName: string) => {
    setIsLoading(true);
    try {
      const [resData, resSettings, resStats, resResponses] = await Promise.all([
        getParticipantData(participantName),
        getMissionSettingsAPI(),
        getPekaStatsAPI(""),
        getPekaResponsesAPI(participantName)
      ]);
      
      if (resSettings.status === "success" && Array.isArray(resSettings.data)) {
        setMissionSettings(resSettings.data);
      }
      
      if (resData.status === "success") {
        setParticipantData(resData.data);
      } else {
        toast.error("Data tim tidak ditemukan");
        navigate("/admin/dashboard");
      }

      if (resStats.status === "success" && Array.isArray(resStats.data)) {
        const myStats = resStats.data.find(s => s.teamName === participantName);
        if (myStats) {
          setPekaStats({ formCount: myStats.formCount, docCount: myStats.docCount });
        }
      }

      if (resResponses.status === "success" && Array.isArray(resResponses.data)) {
        setPekaResponses(resResponses.data);
      }

    } catch (err) {
      toast.error("Gagal mengambil data");
    } finally {
      setIsLoading(false);
    }
  };

  const loadMissionFiles = async (missionId: string, folderUrl?: string) => {
    setSelectedMissionId(missionId);
    
    if (!folderUrl || folderUrl.trim() === "") {
      setMissionFiles([]);
      return;
    }

    if (missionFilesCache[missionId]) {
      setMissionFiles(missionFilesCache[missionId]);
      return;
    }

    setIsLoadingFiles(true);
    try {
      const res = await getMissionFiles(folderUrl);
      if (res.status === "success" && Array.isArray(res.data)) {
        setMissionFiles(res.data);
        setMissionFilesCache(prev => ({ ...prev, [missionId]: res.data }));
      } else {
        toast.error("Error dari server: " + res.message);
        setMissionFiles([]);
      }
    } catch (err) {
      toast.error("Gagal memuat file dari Google Drive");
      setMissionFiles([]);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-primary">
        <Loader2 className="animate-spin mb-4" size={40} />
        <p className="font-bold">Memuat data tim...</p>
      </div>
    );
  }

  const filteredMissions = missionSettings.filter(m => m.kategori === activeCategory);
  let completedCount = 0;
  if(participantData && participantData.missions) {
    filteredMissions.forEach(m => {
      if(participantData.missions[m.id]?.status === "Selesai") completedCount++;
    });
  }

  return (
    <div className="pb-10">
      <button 
        onClick={() => navigate('/admin/dashboard')}
        className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-6 font-semibold"
      >
        <ArrowLeft size={18} /> Kembali ke Tabel
      </button>

      {/* Participant Header */}
      <div className="bg-surface rounded-3xl p-8 border border-border shadow-soft mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <h2 className="text-3xl font-extrabold text-primary-dark tracking-tight">{participantData["Nama Tim"]}</h2>
          <p className="text-muted-foreground font-medium mt-1">
            Mendaftar pada: {new Date(participantData["Timestamp"]).toLocaleDateString('id-ID', { dateStyle: 'long' })}
          </p>
        </div>
        <div className="flex gap-4">
          <div className="bg-primary/5 px-6 py-4 rounded-2xl border border-primary/10 text-center">
            <p className="text-sm font-bold text-primary mb-1">Total Misi</p>
            <p className="text-3xl font-extrabold text-primary-dark">
              {completedCount} <span className="text-lg text-muted-foreground">/ {filteredMissions.length}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Tabs Kategori */}
      <div className="flex gap-2 p-1 bg-slate-100 rounded-xl overflow-hidden max-w-sm mb-6 shadow-inner">
        {["QRIS", "PeKA"].map((cat) => (
          <button
            key={cat}
            onClick={() => {
              setActiveCategory(cat);
              setSelectedMissionId(null);
            }}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
              activeCategory === cat
                ? "bg-white text-primary shadow-soft"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {activeCategory === "QRIS" && (
          <>
            {/* Sidebar Missions */}
            <div className="w-full lg:w-1/3 flex flex-col gap-3">
              <h3 className="font-extrabold text-lg mb-2">Daftar Misi {activeCategory}</h3>
              {filteredMissions.length === 0 && (
                 <p className="text-muted-foreground text-sm">Belum ada misi.</p>
              )}
              {filteredMissions.map((mission, idx) => {
                const isCompleted = participantData.missions && participantData.missions[mission.id]?.status === "Selesai";
                const isSelected = selectedMissionId === mission.id;
                const folderUrl = participantData.missions?.[mission.id]?.folderUrl;
                const visualIndex = idx + 1;
                
                return (
                  <button
                    key={mission.id}
                    onClick={() => loadMissionFiles(mission.id, folderUrl)}
                    className={`text-left p-4 rounded-2xl border transition-all duration-300 flex items-center justify-between ${
                      isSelected 
                        ? 'bg-primary-dark text-white border-primary-dark shadow-lg scale-[1.02]' 
                        : 'bg-surface border-border hover:border-primary/30 hover:shadow-soft'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold ${
                        isSelected ? 'bg-white/20' : (isCompleted ? 'bg-success/20 text-success' : 'bg-muted text-muted-foreground')
                      }`}>
                        {visualIndex}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm">Misi {visualIndex}</h4>
                        <p className={`text-xs ${isSelected ? 'text-white/70' : (isCompleted ? 'text-success' : 'text-muted-foreground')}`}>
                          {isCompleted ? "Selesai" : "Belum"}
                        </p>
                      </div>
                    </div>
                    {isCompleted && <CheckCircle2 size={18} className={isSelected ? 'text-white' : 'text-success'} />}
                  </button>
                );
              })}
            </div>

            {/* Content Area */}
            <div className="w-full lg:w-2/3">
              {selectedMissionId ? (
                <div className="bg-surface border border-border shadow-soft rounded-3xl p-6 min-h-[400px]">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-extrabold text-primary-dark">
                      Bukti Misi {filteredMissions.findIndex(m => m.id === selectedMissionId) + 1}
                    </h3>
                    {participantData.missions && participantData.missions[selectedMissionId]?.folderUrl && (
                      <a 
                        href={participantData.missions[selectedMissionId].folderUrl} 
                        target="_blank" rel="noreferrer"
                        className="flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary-dark transition-colors bg-primary/5 px-4 py-2 rounded-full hover:bg-primary/10"
                      >
                        Buka Folder Drive <ExternalLink size={14} />
                      </a>
                    )}
                  </div>

                  {isLoadingFiles ? (
                    <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                      <Loader2 className="animate-spin mb-4 text-primary" size={32} />
                      <p className="font-medium">Mencari file di Google Drive...</p>
                    </div>
                  ) : missionFiles.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 bg-slate-50 border border-dashed border-border rounded-2xl">
                      <Clock size={40} className="text-slate-300 mb-3" />
                      <p className="font-medium text-slate-500">Belum ada bukti yang diunggah.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {missionFiles.map((file, idx) => {
                        const isImage = file.mimeType.includes("image");
                        const isVideo = file.mimeType.includes("video");

                        return (
                          <div key={idx} className="group relative bg-white border border-border rounded-2xl overflow-hidden hover:border-primary/30 transition-all hover:shadow-md">
                            {isImage ? (
                              <div className="h-40 w-full overflow-hidden bg-slate-100 relative">
                                <img src={file.downloadUrl} alt={file.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <button onClick={() => setLightboxImg(file.downloadUrl)} className="bg-white/20 backdrop-blur-md p-2 rounded-full text-white hover:bg-primary transition-colors">
                                    <Maximize2 size={20} />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="h-40 w-full bg-slate-100 flex flex-col items-center justify-center text-slate-400 group-hover:text-primary transition-colors">
                                {isVideo ? <Video size={40} className="mb-2" /> : <ImageIcon size={40} className="mb-2" />}
                                <span className="text-xs font-medium uppercase tracking-wider">{isVideo ? 'Video' : 'File'}</span>
                              </div>
                            )}
                            <div className="p-4 flex flex-col gap-2">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-semibold truncate text-slate-700" title={file.name}>{file.name}</p>
                                <a href={file.downloadUrl} target="_blank" rel="noreferrer" className="text-primary hover:text-primary-dark p-1 rounded-md hover:bg-primary/5 transition-colors">
                                  <ExternalLink size={16} />
                                </a>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Individual Form Reports */}
                  {participantData.missions && participantData.missions[selectedMissionId]?.rawContent && (
                    <div className="mt-8 pt-8 border-t border-slate-100">
                      <h3 className="text-lg font-extrabold text-slate-800 mb-4 flex items-center gap-2">
                        <FileText size={20} className="text-primary" /> Riwayat & Formulir Individu
                      </h3>
                      
                      <div className="space-y-4">
                        {parseRawContent(participantData.missions[selectedMissionId].rawContent).map((sub, i) => (
                          <div key={i} className="bg-slate-50 rounded-2xl p-5 border border-slate-200">
                            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-4 border-b border-slate-200 pb-3">
                              <div className="flex items-center gap-3">
                                <div className="bg-primary/10 w-10 h-10 rounded-full flex items-center justify-center text-primary">
                                  <UserCircle size={24} />
                                </div>
                                <div>
                                  <p className="font-bold text-slate-800">{sub.pengumpul}</p>
                                  <p className="text-xs font-medium text-slate-500 flex items-center gap-1"><Clock size={12}/> {sub.waktu}</p>
                                </div>
                              </div>
                              {sub.deskripsi && sub.deskripsi !== "-" && (
                                 <span className="text-xs font-bold bg-white px-3 py-1 rounded-lg border border-slate-200 text-slate-600 self-start sm:self-auto">
                                   Melampirkan File
                                 </span>
                              )}
                            </div>
                            
                            {sub.deskripsi && sub.deskripsi !== "-" && (
                              <div className="mb-4">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Deskripsi Tambahan</p>
                                <p className="text-sm text-slate-700 font-medium bg-white p-3 rounded-xl border border-slate-100 italic">"{sub.deskripsi}"</p>
                              </div>
                            )}

                            {sub.qaPairs.length > 0 ? (
                              <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Jawaban Form</p>
                                <div className="grid grid-cols-1 gap-3">
                                   {sub.qaPairs.map((qa, idx) => (
                                     <div key={idx} className="bg-white p-3 rounded-xl border border-slate-100">
                                       <p className="text-xs font-bold text-primary-dark mb-1">Q: {qa.q}</p>
                                       <p className="text-sm font-medium text-slate-700">A: {qa.a || "-"}</p>
                                     </div>
                                   ))}
                                </div>
                              </div>
                            ) : (
                              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">(Hanya Mengunggah File)</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-surface border border-border shadow-soft rounded-3xl p-6 min-h-[400px] flex items-center justify-center">
                  <p className="text-muted-foreground font-medium">Pilih misi di sebelah kiri untuk melihat detailnya.</p>
                </div>
              )}
            </div>
          </>
        )}

        {activeCategory === "PeKA" && (
          <div className="w-full">
            <div className="bg-surface rounded-3xl p-6 shadow-sm border border-border mb-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-6 rounded-2xl border border-slate-100 flex flex-col items-center justify-center text-center">
                  <div className="text-4xl font-black text-primary mb-2">{pekaStats.formCount}</div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Kuesioner Diisi</div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-100 flex flex-col items-center justify-center text-center">
                  <div className="text-4xl font-black text-secondary mb-2">{pekaStats.docCount}</div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Dokumentasi Diupload</div>
                </div>
              </div>
            </div>

            <div className="bg-surface rounded-3xl p-6 shadow-sm border border-border">
              <h3 className="font-extrabold text-lg mb-6">Detail Responden Edukasi PeKA</h3>
              
              {pekaResponses.filter(r => r.responsesJSON && r.responsesJSON.length > 0).length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 bg-slate-50 border border-dashed border-border rounded-2xl text-slate-400">
                  <Clock size={40} className="mb-3" />
                  <p className="font-medium">Belum ada data responden edukasi.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pekaResponses.filter(r => r.responsesJSON && r.responsesJSON.length > 0).map((res, i, arr) => {
                    const namaWarga = res.namaWarga || `Responden #${arr.length - i}`;
                    
                    return (
                      <div key={res.responseId} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col h-full">
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div>
                            <p className="font-bold text-slate-800">{namaWarga}</p>
                            <p className="text-xs text-slate-500">{res.timestamp}</p>
                          </div>
                          {res.skor && (
                            <div className="shrink-0 bg-green-100 text-green-700 text-[10px] font-black px-2 py-1 rounded-md border border-green-200">
                              Skor: {res.skor}
                            </div>
                          )}
                        </div>
                        
                        <div className="mt-3 pt-3 border-t border-slate-100 space-y-2 grow">
                          {Array.isArray(res.responsesJSON) && res.responsesJSON.slice(0, 2).map((ans: any, j: number) => (
                            <div key={j}>
                              <p className="text-[10px] font-bold text-slate-400 uppercase leading-tight truncate">{ans.question}</p>
                              <p className="text-xs font-medium text-slate-700 truncate">{ans.answer}</p>
                            </div>
                          ))}
                          
                          {Array.isArray(res.responsesJSON) && res.responsesJSON.length > 2 && (
                            <button 
                              onClick={() => setSelectedRespondent(res)}
                              className="w-full mt-2 py-1.5 text-xs font-bold text-slate-500 hover:text-primary bg-slate-50 hover:bg-primary/5 rounded-lg transition-colors border border-slate-100"
                            >
                              Lihat Semua Jawaban ({res.responsesJSON.length})
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Galeri Dokumentasi Admin */}
            <div className="bg-surface rounded-3xl p-6 shadow-sm border border-border mt-8">
              <h3 className="font-extrabold text-lg mb-6 flex items-center gap-2">
                <ImageIcon size={20} className="text-secondary" /> Dokumentasi Terkumpul
              </h3>
              
              {pekaResponses.filter(r => r.photoUrl).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-slate-400">
                  <ImageIcon size={40} className="mb-3 opacity-50" />
                  <p className="font-medium">Tim ini belum mengunggah dokumen/foto apapun.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
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
                            setLightboxImg(getDriveDirectUrl(res.photoUrl));
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
        )}
      </div>

      {/* Modal Detail Jawaban */}
      <AnimatePresence>
        {selectedRespondent && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedRespondent(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl relative z-10 flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-100 flex items-start justify-between shrink-0">
                <div>
                  <h3 className="text-xl font-black text-slate-800">Detail Jawaban Kuesioner</h3>
                  <p className="text-sm text-slate-500 font-medium mt-1">Disubmit pada: {selectedRespondent.timestamp}</p>
                </div>
                {selectedRespondent.skor && (
                  <div className="bg-green-100 text-green-700 text-sm font-black px-3 py-1.5 rounded-lg border border-green-200">
                    Skor: {selectedRespondent.skor}
                  </div>
                )}
              </div>
              
              <div className="p-6 overflow-y-auto space-y-4 grow">
                {Array.isArray(selectedRespondent.responsesJSON) && selectedRespondent.responsesJSON.map((ans: any, idx: number) => (
                  <div key={idx} className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">{ans.question}</p>
                    <p className="text-sm font-semibold text-slate-800 break-words">{ans.answer || "-"}</p>
                  </div>
                ))}
              </div>
              
              <div className="p-4 border-t border-slate-100 shrink-0 flex justify-end">
                <button 
                  onClick={() => setSelectedRespondent(null)}
                  className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Lightbox for Images */}
      <AnimatePresence>
        {lightboxImg && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-10">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/90 backdrop-blur-sm cursor-pointer"
              onClick={() => setLightboxImg(null)}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="relative z-10 max-w-5xl w-full max-h-full flex items-center justify-center"
            >
              <button 
                onClick={() => setLightboxImg(null)}
                className="absolute -top-12 right-0 p-2 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-all"
              >
                <X size={24} />
              </button>
              <img src={lightboxImg} alt="Preview" className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl" />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
