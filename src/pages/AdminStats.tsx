import { useState, useEffect } from "react";
import { getAllAdminData } from "../lib/api";
import { Loader2, Users, Target, Trophy } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import toast from "react-hot-toast";

export default function AdminStats() {
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await getAllAdminData();
      if (res.status === "success") {
        setData(res.data);
      }
    } catch (error) {
      toast.error("Gagal mengambil data statistik");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-primary">
        <Loader2 className="animate-spin mb-4" size={40} />
        <p className="font-bold">Menghitung statistik...</p>
      </div>
    );
  }

  // Calculate Stats
  const totalTim = data.length;
  
  let totalMisiSelesai = 0;
  const misiCounts = [0, 0, 0, 0, 0, 0, 0];
  
  data.forEach(tim => {
    for (let i = 1; i <= 7; i++) {
      if (tim[`Misi ${i} Status`] === "Selesai") {
        totalMisiSelesai++;
        misiCounts[i - 1]++;
      }
    }
  });

  const totalPossibleMisi = totalTim * 7;
  const completionRate = totalPossibleMisi === 0 ? 0 : Math.round((totalMisiSelesai / totalPossibleMisi) * 100);

  // Chart Data
  const chartData = [
    { name: "Misi 1", count: misiCounts[0] },
    { name: "Misi 2", count: misiCounts[1] },
    { name: "Misi 3", count: misiCounts[2] },
    { name: "Misi 4", count: misiCounts[3] },
    { name: "Misi 5", count: misiCounts[4] },
    { name: "Misi 6", count: misiCounts[5] },
    { name: "Misi 7", count: misiCounts[6] },
  ];

  return (
    <div className="pb-10">
      <div className="mb-8">
        <h2 className="text-3xl font-extrabold text-text tracking-tight mb-2">Statistik Global QJI</h2>
        <p className="text-muted-foreground font-medium">Metrik performa dan partisipasi seluruh tim secara real-time.</p>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-surface border border-border p-6 rounded-3xl shadow-soft flex items-center gap-5">
          <div className="w-14 h-14 bg-primary/10 text-primary rounded-2xl flex items-center justify-center shrink-0">
            <Users size={28} />
          </div>
          <div>
            <p className="text-muted-foreground text-sm font-bold mb-1">Total Tim Terdaftar</p>
            <p className="text-4xl font-black text-primary-dark">{totalTim}</p>
          </div>
        </div>
        
        <div className="bg-surface border border-border p-6 rounded-3xl shadow-soft flex items-center gap-5">
          <div className="w-14 h-14 bg-success/10 text-success rounded-2xl flex items-center justify-center shrink-0">
            <Target size={28} />
          </div>
          <div>
            <p className="text-muted-foreground text-sm font-bold mb-1">Total Misi Selesai (Global)</p>
            <p className="text-4xl font-black text-primary-dark">{totalMisiSelesai}</p>
          </div>
        </div>

        <div className="bg-surface border border-border p-6 rounded-3xl shadow-soft flex items-center gap-5">
          <div className="w-14 h-14 bg-secondary/20 text-secondary rounded-2xl flex items-center justify-center shrink-0">
            <Trophy size={28} />
          </div>
          <div>
            <p className="text-muted-foreground text-sm font-bold mb-1">Tingkat Penyelesaian</p>
            <p className="text-4xl font-black text-primary-dark">{completionRate}%</p>
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="bg-surface border border-border rounded-3xl p-6 sm:p-8 shadow-soft">
        <h3 className="text-xl font-extrabold text-primary-dark mb-6">Distribusi Penyelesaian Misi</h3>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 14, fontWeight: 600 }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontWeight: 600 }} />
              <Tooltip 
                cursor={{ fill: 'transparent' }}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px -2px rgba(0, 59, 115, 0.1)', fontWeight: 'bold' }}
              />
              <Bar dataKey="count" radius={[8, 8, 0, 0]} animationDuration={1500}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.count > 0 ? '#003B73' : '#E5E7EB'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
