import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import LandingPage from "./pages/LandingPage";
import DashboardTim from "./pages/DashboardTim";
import SubmissionPage from "./pages/SubmissionPage";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import AdminLayout from "./components/AdminLayout";
import AdminStats from "./pages/AdminStats";
import AdminTimDetail from "./pages/AdminTimDetail";
import AdminMisi from "./pages/AdminMisi";
import PilihKategori from "./pages/PilihKategori";
import RespondenPeka from "./pages/RespondenPeka";

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-slate-50 selection:bg-primary selection:text-primary-foreground">
        <Toaster 
          position="top-center"
          toastOptions={{
            style: {
              background: '#333',
              color: '#fff',
              borderRadius: '12px',
              padding: '16px',
            },
            success: {
              style: {
                background: '#003B73',
              }
            }
          }}
        />
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          
          {/* Tim Routes */}
          <Route path="/pilihkategori" element={<PilihKategori />} />
          <Route path="/dashboard" element={<DashboardTim />} />
          <Route path="/submission/:missionId" element={<SubmissionPage />} />
          <Route path="/responden" element={<RespondenPeka />} />

          {/* Admin Routes */}
          <Route path="/admin" element={<AdminLogin />} />
          
          <Route element={<AdminLayout />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/stats" element={<AdminStats />} />
            <Route path="/admin/misi" element={<AdminMisi />} />
            <Route path="/admin/tim/:name" element={<AdminTimDetail />} />
          </Route>
        </Routes>
      </div>
    </Router>
  );
}

export default App;
