import { useNavigate, useLocation, Outlet } from "react-router-dom";
import { LogOut, BarChart3, Users, Settings, Megaphone } from "lucide-react";
import { useEffect } from "react";

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const auth = sessionStorage.getItem("admin_auth");
    if (!auth) {
      navigate("/admin");
    }
  }, [navigate]);

  const handleLogout = () => {
    sessionStorage.removeItem("admin_auth");
    navigate("/admin");
  };

  return (
    <div className="min-h-screen bg-background text-text font-sans flex flex-col">
      {/* Top Header */}
      <header className="bg-primary-dark text-white p-6 shadow-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">QJI Commander</h1>
            <p className="text-muted-foreground text-sm font-medium">Administrator Workspace</p>
          </div>
          
          <div className="flex items-center gap-4">
            <nav className="flex items-center bg-white/10 rounded-xl p-1 border border-white/10">
              <button 
                onClick={() => navigate('/admin/dashboard')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${location.pathname === '/admin/dashboard' || location.pathname.includes('/tim') ? 'bg-white text-primary-dark shadow-sm' : 'text-white/70 hover:text-white'}`}
              >
                <Users size={16} /> Data Tim
              </button>
              <button 
                onClick={() => navigate('/admin/stats')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${location.pathname === '/admin/stats' ? 'bg-white text-primary-dark shadow-sm' : 'text-white/70 hover:text-white'}`}
              >
                <BarChart3 size={16} /> Statistik
              </button>
              <button 
                onClick={() => navigate('/admin/misi')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${location.pathname === '/admin/misi' ? 'bg-white text-primary-dark shadow-sm' : 'text-white/70 hover:text-white'}`}
              >
                <Settings size={16} /> Pengaturan Misi
              </button>
            </nav>

            <div className="w-px h-8 bg-white/20 mx-2 hidden sm:block"></div>

            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 bg-danger/10 text-danger-foreground px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-danger hover:text-white transition-colors border border-danger/20"
            >
              <LogOut size={16} /> Keluar
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 w-full max-w-7xl mx-auto px-6 py-8 relative">
        <Outlet />
      </div>
    </div>
  );
}
