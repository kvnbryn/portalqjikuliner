import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getAllAdminData, deleteParticipantAPI, editParticipantAPI, getMissionSettingsAPI, createTeamAPI } from "../lib/api";
import { LogOut, Search, ExternalLink, RefreshCw, Loader2, Trash2, Edit, X, AlertTriangle, Plus, Minus } from "lucide-react";
import toast from "react-hot-toast";

export default function AdminDashboard() {
  const [data, setData] = useState<any[]>([]);
  const [missionSettings, setMissionSettings] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const auth = sessionStorage.getItem("admin_auth");
    if (!auth) {
      navigate("/admin");
    } else {
      fetchData();
    }
  }, [navigate]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [resData, resSettings] = await Promise.all([
        getAllAdminData(),
        getMissionSettingsAPI()
      ]);
      
      if (resSettings.status === "success" && Array.isArray(resSettings.data)) {
        setMissionSettings(resSettings.data);
      }
      
      if (resData.status === "success") {
        setData(resData.data);
      } else {
        toast.error("Gagal mengambil data dari server");
      }
    } catch (error) {
      toast.error("Koneksi error. Gagal memuat data.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("admin_auth");
    navigate("/admin");
  };

  const filteredData = data.filter((row) =>
    row["Nama Tim"]?.toString().toLowerCase().includes(searchTerm.toLowerCase())
  );

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [participantToDelete, setParticipantToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [participantToEdit, setParticipantToEdit] = useState<string | null>(null);
  const [newParticipantName, setNewParticipantName] = useState("");
  const [editTeamMembers, setEditTeamMembers] = useState([{ name: "", email: "" }]);
  const [isEditing, setIsEditing] = useState(false);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamMembers, setNewTeamMembers] = useState([{ name: "", email: "" }]);
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateTeam = async () => {
    // Validasi
    const validMembers = newTeamMembers.filter(m => m.name.trim() !== "" && m.email.trim() !== "");
    if (!newTeamName.trim() || validMembers.length === 0) {
      toast.error("Nama tim dan minimal 1 anggota beserta email harus diisi");
      return;
    }
    
    // Format: "Nama:email@domain.com, Nama2:email2@domain.com"
    const formattedEmails = validMembers.map(m => `${m.name.trim()}:${m.email.trim()}`).join(", ");
    
    setIsCreating(true);
    try {
      const res = await createTeamAPI(newTeamName.trim(), formattedEmails);
      if (res.status === "success") {
        toast.success(res.message || "Tim berhasil dibuat");
        setCreateModalOpen(false);
        setNewTeamName("");
        setNewTeamMembers([{ name: "", email: "" }]);
        fetchData();
      } else {
        toast.error(res.message || "Gagal membuat tim");
      }
    } catch (err) {
      toast.error("Terjadi kesalahan sistem");
    } finally {
      setIsCreating(false);
    }
  };

  const confirmDelete = (name: string) => {
    setParticipantToDelete(name);
    setDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!participantToDelete) return;
    setIsDeleting(true);
    try {
      const res = await deleteParticipantAPI(participantToDelete);
      if (res.status === "success") {
        toast.success(res.data || "Tim berhasil dihapus");
        fetchData();
      } else {
        toast.error(res.message || "Gagal menghapus tim");
      }
    } catch (err) {
      toast.error("Terjadi kesalahan sistem");
    } finally {
      setIsDeleting(false);
      setDeleteModalOpen(false);
      setParticipantToDelete(null);
    }
  };

  const openEditModal = (row: any) => {
    setParticipantToEdit(row["Nama Tim"]);
    setNewParticipantName(row["Nama Tim"]);
    
    const emailsString = row["Email Akses"] || "";
    if (emailsString) {
      const pairs = emailsString.split(",").map((e: string) => e.trim()).filter(Boolean);
      const members = pairs.map((pair: string) => {
        const parts = pair.split(":");
        if (parts.length === 2) {
          return { name: parts[0].trim(), email: parts[1].trim() };
        }
        return { name: "Anggota", email: pair.trim() };
      });
      setEditTeamMembers(members.length > 0 ? members : [{ name: "", email: "" }]);
    } else {
      setEditTeamMembers([{ name: "", email: "" }]);
    }
    
    setEditModalOpen(true);
  };

  const handleEdit = async () => {
    const validMembers = editTeamMembers.filter(m => m.name.trim() !== "" && m.email.trim() !== "");
    if (!participantToEdit || !newParticipantName.trim() || validMembers.length === 0) {
      toast.error("Nama tim dan minimal 1 anggota beserta email harus diisi");
      return;
    }
    
    const formattedEmails = validMembers.map(m => `${m.name.trim()}:${m.email.trim()}`).join(", ");
    
    setIsEditing(true);
    try {
      const res = await editParticipantAPI(participantToEdit, newParticipantName.trim(), formattedEmails);
      if (res.status === "success") {
        toast.success(res.data || "Nama berhasil diubah");
        fetchData();
      } else {
        toast.error(res.message || "Gagal mengubah nama");
      }
    } catch (err) {
      toast.error("Terjadi kesalahan sistem");
    } finally {
      setIsEditing(false);
      setEditModalOpen(false);
      setParticipantToEdit(null);
    }
  };

  // Hitung jumlah misi tiap kategori
  const qrisMissions = missionSettings.filter(m => m.kategori === 'QRIS');
  const pekaMissions = missionSettings.filter(m => m.kategori === 'PeKA');

  const getCompletedCount = (row: any, categoryMissions: any[]) => {
    if (!row.missions) return 0;
    let count = 0;
    categoryMissions.forEach(m => {
      if (row.missions[m.id]?.status === 'Selesai') count++;
    });
    return count;
  };

  return (
    <div className="text-text font-sans pb-10">
      
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <input 
            type="text" 
            placeholder="Cari nama tim..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-medium shadow-sm"
          />
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <a 
            href="https://drive.google.com/drive/folders/1dZglLSvYvSmrIoPSj5hNFzLlP3n9A4T4" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-secondary/10 border border-secondary/20 px-5 py-3 rounded-xl text-sm font-bold text-secondary-dark hover:bg-secondary hover:text-white transition-all shadow-sm"
            style={{ color: "#b38f1d" }}
          >
            <ExternalLink size={16} /> 
            Folder Utama
          </a>
          <button 
            onClick={() => setCreateModalOpen(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-secondary text-white border border-secondary px-5 py-3 rounded-xl text-sm font-bold hover:bg-secondary-dark transition-all shadow-sm"
          >
            <Plus size={16} /> 
            Tambah Tim
          </button>
          <button 
            onClick={fetchData}
            disabled={isLoading}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white border border-border px-5 py-3 rounded-xl text-sm font-bold text-text hover:bg-muted hover:border-primary/50 transition-all disabled:opacity-50 shadow-sm"
          >
            <RefreshCw size={16} className={isLoading ? "animate-spin text-primary" : "text-primary"} /> 
            {isLoading ? "Memuat..." : "Refresh"}
          </button>
        </div>
      </div>

        {/* Data Table */}
        <div className="bg-surface rounded-2xl border border-border shadow-soft overflow-hidden relative">
          {isLoading && data.length === 0 ? (
            <div className="py-24 flex flex-col items-center justify-center text-primary">
              <Loader2 className="animate-spin mb-4" size={40} />
              <p className="font-bold">Mengambil data dari Google Sheets...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-background border-b border-border text-sm text-muted-foreground">
                    <th className="py-4 px-6 font-bold whitespace-nowrap">Nama Tim</th>
                    <th className="py-4 px-6 font-bold text-center whitespace-nowrap">Aksi</th>
                    <th className="py-4 px-6 font-bold text-center whitespace-nowrap">Progres QRIS</th>
                    <th className="py-4 px-6 font-bold text-center whitespace-nowrap">Progres PeKA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredData.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-muted-foreground font-medium">
                        Tidak ada data tim ditemukan.
                      </td>
                    </tr>
                  ) : (
                    filteredData.map((row, idx) => {
                      const completedQris = getCompletedCount(row, qrisMissions);
                      const completedPeka = getCompletedCount(row, pekaMissions);
                      
                      return (
                        <tr key={idx} className="hover:bg-background/50 transition-colors">
                          <td className="py-4 px-6">
                            <button 
                              onClick={() => navigate(`/admin/tim/${encodeURIComponent(row["Nama Tim"])}`)}
                              className="font-bold text-primary-dark text-base hover:text-primary hover:underline text-left"
                            >
                              {row["Nama Tim"]}
                            </button>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {new Date(row["Timestamp"]).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </td>
                          
                          <td className="py-4 px-6 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => openEditModal(row)}
                                className="p-2 text-primary bg-primary/10 hover:bg-primary hover:text-white rounded-lg transition-colors"
                                title="Edit Tim"
                              >
                                <Edit size={16} />
                              </button>
                              <button
                                onClick={() => confirmDelete(row["Nama Tim"])}
                                className="p-2 text-danger bg-danger/10 hover:bg-danger hover:text-white rounded-lg transition-colors"
                                title="Hapus Tim"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>

                          <td className="py-4 px-6 text-center font-bold text-primary-dark">
                            {completedQris} / {qrisMissions.length}
                          </td>
                          
                          <td className="py-4 px-6 text-center font-bold text-primary-dark">
                            {completedPeka} / {pekaMissions.length}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

      {/* Delete Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !isDeleting && setDeleteModalOpen(false)}></div>
          <div className="relative bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-danger/10 text-danger flex items-center justify-center mx-auto mb-6">
              <AlertTriangle size={32} />
            </div>
            <h3 className="text-xl font-bold text-center mb-2">Hapus Tim?</h3>
            <p className="text-center text-muted-foreground mb-8">
              Apakah Anda yakin ingin menghapus tim <strong className="text-text">{participantToDelete}</strong>? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex gap-4">
              <button 
                onClick={() => setDeleteModalOpen(false)}
                disabled={isDeleting}
                className="flex-1 py-3 px-4 bg-muted hover:bg-border text-text font-bold rounded-xl transition-colors disabled:opacity-50"
              >
                Batal
              </button>
              <button 
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 py-3 px-4 bg-danger hover:bg-red-600 text-white font-bold rounded-xl transition-colors shadow-soft flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isDeleting ? <><Loader2 size={18} className="animate-spin" /> Menghapus...</> : "Ya, Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !isEditing && setEditModalOpen(false)}></div>
          <div className="relative bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Edit size={24} />
              </div>
              <button onClick={() => setEditModalOpen(false)} className="text-slate-400 hover:text-slate-700 bg-slate-100 p-2 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <h3 className="text-xl font-black text-slate-800 mb-2">Edit Tim</h3>
            <p className="text-sm text-slate-500 mb-6">Ubah nama tim atau email akses anggota.</p>
            
            <div className="space-y-4 max-h-[60vh] overflow-y-auto p-1">
              <div>
                <label className="text-sm font-bold text-slate-700 block mb-2">Nama Tim</label>
                <input 
                  type="text" 
                  value={newParticipantName}
                  onChange={(e) => setNewParticipantName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                />
              </div>
              
              <div className="mt-6">
                <label className="text-sm font-bold text-slate-700 block mb-3">Anggota Tim & Email Akses</label>
                {editTeamMembers.map((member, idx) => (
                  <div key={idx} className="flex gap-2 mb-3 items-start p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex-1 space-y-2">
                      <input 
                        type="text"
                        placeholder="Nama Anggota (misal: Arya)"
                        value={member.name}
                        onChange={(e) => {
                          const newM = [...editTeamMembers];
                          newM[idx].name = e.target.value;
                          setEditTeamMembers(newM);
                        }}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                      />
                      <input 
                        type="email"
                        placeholder="Email (misal: arya@gmail.com)"
                        value={member.email}
                        onChange={(e) => {
                          const newM = [...editTeamMembers];
                          newM[idx].email = e.target.value;
                          setEditTeamMembers(newM);
                        }}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                      />
                    </div>
                    {editTeamMembers.length > 1 && (
                      <button 
                        onClick={() => setEditTeamMembers(editTeamMembers.filter((_, i) => i !== idx))}
                        className="p-2 mt-1 text-danger bg-danger/10 hover:bg-danger hover:text-white rounded-lg transition-colors"
                      >
                        <Minus size={16} />
                      </button>
                    )}
                  </div>
                ))}
                
                <button 
                  onClick={() => setEditTeamMembers([...editTeamMembers, { name: "", email: "" }])}
                  className="mt-2 w-full py-2 flex items-center justify-center gap-2 text-sm font-bold text-primary bg-primary/10 hover:bg-primary hover:text-white rounded-lg transition-colors"
                >
                  <Plus size={16} /> Tambah Anggota Lainnya
                </button>
              </div>
            </div>
            
            <div className="flex gap-3 mt-8">
              <button onClick={() => setEditModalOpen(false)} className="flex-1 px-4 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">Batal</button>
              <button 
                onClick={handleEdit}
                disabled={isEditing || !newParticipantName.trim() || editTeamMembers.filter(m => m.name && m.email).length === 0}
                className="flex-1 px-4 py-3 rounded-xl font-bold text-white bg-primary hover:bg-primary-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isEditing ? <><Loader2 size={18} className="animate-spin" /> Menyimpan...</> : "Simpan Perubahan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE MODAL */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !isCreating && setCreateModalOpen(false)}></div>
          <div className="relative bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Plus size={24} />
              </div>
              <button onClick={() => setCreateModalOpen(false)} className="text-slate-400 hover:text-slate-700 bg-slate-100 p-2 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <h3 className="text-xl font-black text-slate-800 mb-2">Tambah Tim Baru</h3>
            <p className="text-sm text-slate-500 mb-6">Tambahkan tim dan tentukan email siapa saja yang boleh mengaksesnya via Google Login.</p>
            
            <div className="space-y-4 max-h-[60vh] overflow-y-auto p-1">
              <div>
                <label className="text-sm font-bold text-slate-700 block mb-2">Nama Tim</label>
                <input 
                  type="text" 
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  placeholder="Contoh: Tim Delta"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                />
              </div>
              
              <div className="mt-6">
                <label className="text-sm font-bold text-slate-700 block mb-3">Anggota Tim & Email Akses</label>
                {newTeamMembers.map((member, idx) => (
                  <div key={idx} className="flex gap-2 mb-3 items-start p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex-1 space-y-2">
                      <input 
                        type="text"
                        placeholder="Nama Anggota (misal: Arya)"
                        value={member.name}
                        onChange={(e) => {
                          const newM = [...newTeamMembers];
                          newM[idx].name = e.target.value;
                          setNewTeamMembers(newM);
                        }}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                      />
                      <input 
                        type="email"
                        placeholder="Email (misal: arya@gmail.com)"
                        value={member.email}
                        onChange={(e) => {
                          const newM = [...newTeamMembers];
                          newM[idx].email = e.target.value;
                          setNewTeamMembers(newM);
                        }}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                      />
                    </div>
                    {newTeamMembers.length > 1 && (
                      <button 
                        onClick={() => setNewTeamMembers(newTeamMembers.filter((_, i) => i !== idx))}
                        className="p-2 mt-1 text-danger bg-danger/10 hover:bg-danger hover:text-white rounded-lg transition-colors"
                      >
                        <Minus size={16} />
                      </button>
                    )}
                  </div>
                ))}
                
                <button 
                  onClick={() => setNewTeamMembers([...newTeamMembers, { name: "", email: "" }])}
                  className="mt-2 w-full py-2 flex items-center justify-center gap-2 text-sm font-bold text-primary bg-primary/10 hover:bg-primary hover:text-white rounded-lg transition-colors"
                >
                  <Plus size={16} /> Tambah Anggota Lainnya
                </button>
              </div>
            </div>
            
            <div className="flex gap-3 mt-8">
              <button onClick={() => setCreateModalOpen(false)} className="flex-1 px-4 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">Batal</button>
              <button 
                onClick={handleCreateTeam}
                disabled={isCreating || !newTeamName.trim() || newTeamMembers.filter(m => m.name && m.email).length === 0}
                className="flex-1 px-4 py-3 rounded-xl font-bold text-white bg-primary hover:bg-primary-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isCreating ? <><Loader2 size={18} className="animate-spin" /> Menyimpan...</> : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
