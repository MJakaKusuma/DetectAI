"use client";
import { useState, useEffect, useCallback } from "react";
import { apiRequest } from "../lib/api";
import { useToast } from "../components/toast";
import { useRouter } from "next/navigation";
import { Tool, BarChart2, AlertTriangle, Folder, Target } from "react-feather";

// Imports
import { AdminStats, DatasetItem, ModelVersionItem, FeedbackItem } from "./types";
import DashboardTab from "./components/DashboardTab";
import TrainingTab from "./components/TrainingTab";
import ModelsTab from "./components/ModelsTab";
import FeedbackTab from "./components/FeedbackTab";

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "training" | "models" | "feedback">("dashboard");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [datasets, setDatasets] = useState<DatasetItem[]>([]);
  const [models, setModels] = useState<ModelVersionItem[]>([]);
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  
  const { showToast } = useToast();
  const router = useRouter();

  // ==============================================================================
  // PEMBUNGKUS CALLBACK: FETCH DATA (Memperbaiki Hoisting & Dependencies)
  // ==============================================================================
  const fetchAdminData = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      if (activeTab === "dashboard") {
        const statsData = await apiRequest<AdminStats>("/admin/stats", "GET", null, token);
        setStats(statsData);
      } else if (activeTab === "training") {
        const datasetsData = await apiRequest<DatasetItem[]>("/admin/datasets", "GET", null, token);
        setDatasets(datasetsData);
      } else if (activeTab === "models") {
        const modelsData = await apiRequest<ModelVersionItem[]>("/admin/models", "GET", null, token);
        setModels(modelsData);
      } else if (activeTab === "feedback") {
        const feedbackData = await apiRequest<FeedbackItem[]>("/admin/feedback", "GET", null, token);
        setFeedbacks(feedbackData);
      }
    } catch (err: unknown) {
      showToast((err as Error).message || "Gagal memuat data.", "error");
    }
  }, [activeTab, showToast]);

  // ==============================================================================
  // EVENT HANDLER: TRANSISI TAB (Solusi Menghilangkan set-state-in-effect)
  // ==============================================================================
  const handleTabChange = (tab: "dashboard" | "training" | "models" | "feedback") => {
    setActiveTab(tab);
  };

  useEffect(() => {
    const role = localStorage.getItem("role");
    if (role !== "admin") {
      showToast("Akses ditolak! Menu khusus Administrator.", "error");
      router.push("/dashboard");
      return;
    }

    // Menggunakan fungsi asinkron internal untuk memecah render loop kaskade
    const loadData = async () => {
      await fetchAdminData();
    };
    loadData();
  }, [fetchAdminData, router, showToast]);


  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 space-y-10 min-h-[75vh]">
      {/* Header */}
     <div className="mb-8 animate-fade-in">
      <div className="flex items-center gap-2.5">
        <span className="text-2xl"><Tool /></span>
        <h1 className="text-3xl font-black text-slate-800 tracking-tight">Administrator Panel</h1>
      </div>
      <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
        Pusat kendali MLOps: Lakukan retraining model, kelola repositori data latih, dan lakukan audit umpan balik dari pengguna.
      </p>
    </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-slate-200 gap-6 overflow-x-auto whitespace-nowrap pb-1">
        <button onClick={() => handleTabChange("dashboard")} className={`pb-3 text-sm font-bold border-b-2 transition-all ${activeTab === "dashboard" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-400"}`}><BarChart2 className="inline-block w-4 h-4 mr-2" /> Ringkasan Dashboard</button>
        <button onClick={() => handleTabChange("training")} className={`pb-3 text-sm font-bold border-b-2 transition-all ${activeTab === "training" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-400"}`}><Folder className="inline-block w-4 h-4 mr-2" /> Dataset & Training</button>
        <button onClick={() => handleTabChange("models")} className={`pb-3 text-sm font-bold border-b-2 transition-all ${activeTab === "models" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-400"}`}><Target className="inline-block w-4 h-4 mr-2" /> Model Registry</button>
        <button onClick={() => handleTabChange("feedback")} className={`pb-3 text-sm font-bold border-b-2 transition-all ${activeTab === "feedback" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-400"}`}><AlertTriangle className="inline-block w-4 h-4 mr-2" /> Audit Umpan Balik</button>
      </div>

      {activeTab === "dashboard" && <DashboardTab stats={stats} />}
      {activeTab === "training" && <TrainingTab datasets={datasets} fetchAdminData={fetchAdminData} setDatasets={setDatasets} handleTabChange={handleTabChange} />}
      {activeTab === "models" && <ModelsTab models={models} fetchAdminData={fetchAdminData} />}
      {activeTab === "feedback" && <FeedbackTab feedbacks={feedbacks} />}

    </div>
  );
}
