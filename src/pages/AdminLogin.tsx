import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { LogIn, ShieldAlert, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

export default function AdminLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Dummy admin authentication (can be moved to backend if needed)
    setTimeout(() => {
      if (username === "admin" && password === "qris2026") {
        sessionStorage.setItem("admin_auth", "true");
        toast.success("Login Admin Berhasil");
        navigate("/admin/dashboard");
      } else {
        toast.error("Username atau password admin salah!");
      }
      setIsLoading(false);
    }, 800);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background relative overflow-hidden">
      {/* Background Accents */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-danger/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary-dark/10 rounded-full blur-[100px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md p-10 rounded-3xl bg-surface border border-border shadow-2xl relative z-10"
      >
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 bg-primary-dark/10 text-primary-dark rounded-2xl flex items-center justify-center mb-4">
            <ShieldAlert size={36} strokeWidth={1.5} />
          </div>
          <h1 className="text-2xl font-extrabold text-text tracking-tight mb-1">Area Terbatas</h1>
          <p className="text-muted-foreground text-sm font-medium">Masuk sebagai Administrator QJI</p>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-2 text-left">
            <label className="text-sm font-semibold text-text ml-1">Username Admin</label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Masukkan username"
              className="w-full px-4 py-3.5 rounded-xl border-2 border-border bg-background focus:outline-none focus:border-primary-dark focus:ring-4 focus:ring-primary-dark/10 transition-all font-semibold"
              required
            />
          </div>
          <div className="space-y-2 text-left">
            <label className="text-sm font-semibold text-text ml-1">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3.5 rounded-xl border-2 border-border bg-background focus:outline-none focus:border-primary-dark focus:ring-4 focus:ring-primary-dark/10 transition-all font-semibold tracking-widest"
              required
            />
          </div>
          
          <button 
            type="submit" 
            disabled={isLoading || !username || !password}
            className="w-full py-4 mt-2 rounded-xl bg-primary-dark text-white font-bold text-lg flex items-center justify-center gap-2 hover:bg-black transition-colors shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? <Loader2 className="animate-spin" size={22} /> : (
              <>
                Otorisasi Akses <LogIn size={20} />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button 
            onClick={() => navigate('/')} 
            className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors underline-offset-4 hover:underline"
          >
            Kembali ke Portal Tim
          </button>
        </div>
      </motion.div>
    </div>
  );
}
