import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Search, ExternalLink, CheckCircle2, Clock, FileText, UserCircle, Target, Users, ArrowRight } from "lucide-react";
import toast from "react-hot-toast";
import { getAllAdminData, getMissionSettingsAPI } from "../lib/api";

const parseRawContent = (rawText: string) => {
  if (!rawText) return [];
  const submissions = rawText.split('====================').map(s => s.trim()).filter(s => s);
  
  return submissions.map(sub => {
    const pengumpulMatch = sub.match(/\[Pengumpul:\s*(.*?)(?:\s*\(.*?\))?\]/);
    const pengumpul = pengumpulMatch ? pengumpulMatch[1].trim() : "Unknown";
    
    const waktuMatch = sub.match(/Waktu:\s*(.*)/);
    const waktu = waktuMatch ? waktuMatch[1].trim() : "-";
    
    return { pengumpul, waktu };
  }).reverse(); // Most recent first
};

export default function AdminDataMisi() {
  const [teamsData, setTeamsData] = useState<any[]>([]);
  const [missionSettings, setMissionSettings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [selectedMission, setSelectedMission] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"Semua" | "Selesai" | "Belum">("Selesai");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [resData, resSettings] = await Promise.all([
        getAllAdminData(),
        getMissionSettingsAPI()
      ]);
      
      if (resSettings.status === "success" && Array.isArray(resSettings.data)) {
        setMissionSettings(resSettings.data.filter(m => m.visibility !== false)); // Only visible missions
      }
      
      if (resData.status === "success" && Array.isArray(resData.data)) {
        setTeamsData(resData.data);
      }
    } catch (err) {
      toast.error("Gagal mengambil data misi");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-primary">
        <Loader2 className="animate-spin mb-4" size={40} />
        <p className="font-bold tracking-widest uppercase text-sm">Memuat Data Misi...</p>
      </div>
    );
  }

  // Pre-calculate stats for each mission
  const missionStats = missionSettings.map(mission => {
    const completedCount = teamsData.filter(team => team.missions && team.missions[mission.id]?.status === "Selesai").length;
    const progress = teamsData.length > 0 ? Math.round((completedCount / teamsData.length) * 100) : 0;
    return { ...mission, completedCount, progress };
  });

  // Calculate teams for selected mission
  const selectedMissionTeams = selectedMission ? teamsData.map(team => {
    const missionData = team.missions ? team.missions[selectedMission.id] : null;
    const isCompleted = missionData?.status === "Selesai";
    const submissions = parseRawContent(missionData?.rawContent || "");
    const latestSubmission = submissions.length > 0 ? submissions[0] : null;
    
    return {
      teamName: team["Nama Tim"],
      timestamp: team["Timestamp"],
      isCompleted,
      folderUrl: missionData?.folderUrl,
      submitter: latestSubmission?.pengumpul || "-",
      submitTime: latestSubmission?.waktu || "-",
    };
  }).filter(t => {
    const matchesSearch = t.teamName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "Semua" ? true : (filterStatus === "Selesai" ? t.isCompleted : !t.isCompleted);
    return matchesSearch && matchesStatus;
  }) : [];

  return (
    <div className="pb-12">
      <div className="mb-8">
        <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3 mb-2">
          <Target className="text-primary" size={32} /> POV Data Misi
        </h2>
        <p className="text-slate-500 font-medium max-w-2xl">
          Lihat progres pengumpulan dari kacamata misi. Pilih sebuah misi di bawah ini untuk melihat daftar tim mana saja yang sudah atau belum menyelesaikannya.
        </p>
      </div>

      {/* Mission Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-10">
        {missionStats.map((mission, idx) => {
          const isSelected = selectedMission?.id === mission.id;
          
          return (
            <motion.div
              key={mission.id}
              whileHover={{ y: -4, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                setSelectedMission(mission);
                setSearchTerm("");
              }}
              className={`cursor-pointer bg-white rounded-3xl p-6 border transition-all duration-300 shadow-sm relative overflow-hidden ${
                isSelected 
                  ? 'border-primary ring-4 ring-primary/10 shadow-xl' 
                  : 'border-slate-200 hover:border-primary/40 hover:shadow-md'
              }`}
            >
              {isSelected && (
                <div className="absolute top-0 right-0 w-16 h-16 bg-primary/10 rounded-bl-full flex items-start justify-end p-3">
                  <CheckCircle2 size={20} className="text-primary" />
                </div>
              )}
              
              <div className="flex items-center gap-2 mb-4">
                <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md ${
                  mission.kategori === 'PeKA' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  {mission.kategori}
                </span>
                <span className="text-xs font-bold text-slate-400">Misi {idx + 1}</span>
              </div>
              
              <h3 className="font-extrabold text-slate-800 text-lg mb-4 line-clamp-2 leading-tight">
                {mission.deskripsi}
              </h3>
              
              <div className="mt-auto">
                <div className="flex justify-between items-end mb-2">
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-0.5">Selesai</p>
                    <p className="text-2xl font-black text-slate-800 leading-none">
                      {mission.completedCount} <span className="text-sm text-slate-400 font-bold">/ {teamsData.length} Tim</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-primary">{mission.progress}%</p>
                  </div>
                </div>
                
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${mission.progress}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="bg-primary h-full rounded-full"
                  />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Submission Board */}
      <AnimatePresence mode="wait">
        {selectedMission ? (
          <motion.div 
            key={selectedMission.id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="bg-surface rounded-3xl p-6 sm:p-8 border border-border shadow-soft"
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8 border-b border-slate-100 pb-6">
              <div>
                <h3 className="text-2xl font-black text-slate-800 mb-2">Board Pengumpulan Misi</h3>
                <p className="text-sm font-medium text-slate-500 max-w-xl line-clamp-2">
                  {selectedMission.deskripsi}
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 shrink-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text" 
                    placeholder="Cari nama tim..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full sm:w-64 pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  {["Semua", "Selesai", "Belum"].map((status) => (
                    <button
                      key={status}
                      onClick={() => setFilterStatus(status as any)}
                      className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                        filterStatus === status 
                          ? "bg-white text-slate-800 shadow-sm" 
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {selectedMissionTeams.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <Users size={48} className="mb-4 opacity-50" />
                <p className="font-bold text-lg text-slate-500">Tidak ada tim yang cocok dengan filter.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {selectedMissionTeams.map((team, i) => (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    key={i} 
                    className={`bg-white p-5 rounded-2xl border transition-all hover:shadow-md flex flex-col h-full ${
                      team.isCompleted ? 'border-success/20 shadow-sm' : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="flex-1 min-w-0">
                        <p className="font-extrabold text-slate-800 truncate text-lg" title={team.teamName}>
                          {team.teamName}
                        </p>
                        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mt-1">
                          <UserCircle size={14} /> 
                          <span className="truncate">{team.submitter !== "-" ? team.submitter : "Belum submit"}</span>
                        </div>
                      </div>
                      
                      <div className={`shrink-0 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest ${
                        team.isCompleted 
                          ? 'bg-success/10 text-success border border-success/20' 
                          : 'bg-slate-100 text-slate-500'
                      }`}>
                        {team.isCompleted ? 'Selesai' : 'Belum'}
                      </div>
                    </div>

                    <div className="mt-auto space-y-3 pt-4 border-t border-slate-100">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-400 uppercase tracking-widest">Waktu Kumpul</span>
                        <span className="font-semibold text-slate-700 flex items-center gap-1">
                          {team.submitTime !== "-" ? (
                            <><Clock size={12} className="text-slate-400" /> {team.submitTime}</>
                          ) : "-"}
                        </span>
                      </div>
                      
                      {team.isCompleted && team.folderUrl ? (
                        <a 
                          href={team.folderUrl} 
                          target="_blank" 
                          rel="noreferrer"
                          className="w-full bg-primary/10 hover:bg-primary text-primary hover:text-white transition-colors border border-primary/20 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 group mt-2"
                        >
                          Lihat Bukti Drive <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                        </a>
                      ) : (
                        <button disabled className="w-full bg-slate-50 text-slate-400 border border-slate-100 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 mt-2 cursor-not-allowed">
                          Belum Ada Bukti
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        ) : (
          <div className="bg-surface rounded-3xl p-16 border border-border shadow-soft flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 shadow-inner">
              <Target size={32} className="text-slate-300" />
            </div>
            <h3 className="text-2xl font-black text-slate-700 mb-2">Pilih Misi</h3>
            <p className="text-slate-500 font-medium max-w-md mx-auto">
              Klik salah satu kartu misi di atas untuk melihat rincian progres pengumpulan dan daftar tim secara spesifik.
            </p>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
