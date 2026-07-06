import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { loginWithEmail } from "../lib/api";
import { GoogleLogin } from "@react-oauth/google";
import { jwtDecode } from "jwt-decode";

export default function LandingPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const navigate = useNavigate();

  const handleGoogleSuccess = async (credentialResponse: any) => {
    setIsLoading(true);
    setErrorMsg("");
    try {
      const decoded: any = jwtDecode(credentialResponse.credential);
      const email = decoded.email;
      
      const res = await loginWithEmail(email);
      if (res.status === "success") {
        localStorage.setItem("tim_name", res.data.namaTim);
        localStorage.setItem("tim_member", res.data.memberName || "Anggota");
        navigate("/pilihkategori");
      } else {
        setErrorMsg(res.message || "Email tidak terdaftar.");
      }
    } catch (err) {
      setErrorMsg("Koneksi error. Pastikan internet stabil.");
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background relative overflow-hidden">
      {/* Soft Background Accents */}
      <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[50%] h-[50%] bg-secondary/10 rounded-full blur-[120px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-md p-10 rounded-3xl bg-surface border border-border shadow-2xl relative z-10"
      >
        <div className="flex flex-col items-center text-center mb-8">
          <div className="flex items-center justify-center gap-6 mb-6">
            <img src="/logoqirs.webp" alt="QRIS Logo" className="h-14 md:h-16 object-contain" />
            <img src="/logoqji.webp" alt="QJI Logo" className="h-14 md:h-16 object-contain" />
          </div>
          <h1 className="text-3xl font-extrabold text-primary-dark tracking-tight mb-2">Portal Misi QJI</h1>
          <p className="text-muted-foreground text-sm font-medium">Masuk untuk mencatat progres misi tim Anda.</p>
        </div>
        
        <div className="space-y-6">
          <div className="flex flex-col items-center justify-center space-y-4">
            <p className="text-sm font-semibold text-text text-center mb-2">Gunakan Akun Google yang didaftarkan</p>
            
            {isLoading ? (
               <div className="flex justify-center p-4">
                 <Loader2 className="animate-spin text-primary" size={32} />
               </div>
            ) : (
              <div className="w-full flex justify-center">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => setErrorMsg("Gagal login dengan Google")}
                  useOneTap
                  shape="pill"
                  theme="outline"
                  text="continue_with"
                  size="large"
                />
              </div>
            )}

            {errorMsg && (
              <motion.p 
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                className="text-danger text-sm font-semibold bg-danger/10 px-4 py-3 rounded-xl text-center w-full"
              >
                {errorMsg}
              </motion.p>
            )}
          </div>

          <div className="mt-8 text-center pt-4">
            <button 
              onClick={() => navigate('/admin')} 
              className="text-xs font-semibold text-muted-foreground hover:text-primary transition-colors underline-offset-4 hover:underline"
            >
              Admin Login
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
