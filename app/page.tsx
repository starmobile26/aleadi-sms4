"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  MessageSquare,
  Clock,
  CheckCircle2,
  Search,
  RefreshCw,
  LogOut,
  Key,
  Copy,
  Check,
  Send,
  ShieldCheck,
  Zap,
  TrendingUp,
  Phone,
  Lock,
  Sparkles,
  X,
  ArrowUpRight,
  Trash2,
} from "lucide-react";

/* ================================================================
   TYPES
================================================================ */

type Message = {
  id: string;
  phone: string;
  message: string;
  createdAt: number;
  status: "pending" | "delivered" | "failed";
  deliveredAt?: number;
};

type ChartDay = {
  date: string;
  total: number;
  delivered: number;
  pending: number;
  failed: number;
  failedBalance: number;
};

type HistoryResponse = {
  success: boolean;
  stats: {
    total: number;
    pending: number;
    delivered: number;
    failed: number;
    failedBalance: number;
    successRate: number;
  };
  readerLastSeen: number | null;
  serverLastUpdated?: number;
  chartData: ChartDay[];
  messages: Message[];
};

/* ================================================================
   CONSTANTS
================================================================ */

const LOGIN_PHONE = "771176611";
const LOGIN_PASSWORD = "Aa771176611";
const API_KEY = "ALWADI-OTP-771176611";

/* Helper: Extract OTP from message if present */
function extractOtp(text: string): string | null {
  const match = text.match(/\b\d{4,6}\b/);
  return match ? match[0] : null;
}

/* ================================================================
   LOGIN SCREEN
================================================================ */

function LoginPage({ onLogin }: { onLogin: () => void }) {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    setTimeout(() => {
      if (phone.trim() === LOGIN_PHONE && password === LOGIN_PASSWORD) {
        localStorage.setItem("alwadi_logged_in", "true");
        onLogin();
      } else {
        setError("بيانات الدخول غير صحيحة، يرجى التأكد من الرقم وكلمة المرور");
      }
      setLoading(false);
    }, 450);
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "radial-gradient(circle at top, #f5edfa 0%, #f8fafc 100%)",
        padding: "20px",
      }}
    >
      <div
        className="app-card"
        style={{
          width: "100%",
          maxWidth: "440px",
          padding: "40px 32px",
          borderRadius: "var(--radius-xl)",
          boxShadow: "0 20px 40px -15px rgba(41, 4, 64, 0.12), 0 0 1px 1px rgba(0,0,0,0.04)",
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div
            style={{
              width: "80px",
              height: "80px",
              borderRadius: "24px",
              overflow: "hidden",
              margin: "0 auto 16px",
              boxShadow: "0 12px 25px -5px rgba(41, 4, 64, 0.35)",
              border: "2px solid #290440",
              background: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "4px",
            }}
          >
            <img
              src="/icon.png"
              alt="منظومة الوادي"
              style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: "18px" }}
            />
          </div>
          <h1 style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--text-main)", letterSpacing: "-0.03em" }}>
            منظومة الوادي SMS
          </h1>
          <p style={{ color: "var(--text-sub)", fontSize: "0.9rem", marginTop: "6px", fontWeight: 500 }}>
            بوابة استقبال وإدارة رسائل التحقق (OTP)
          </p>
        </div>

        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div>
            <label style={{ display: "block", marginBottom: "8px", fontSize: "0.88rem", fontWeight: 600, color: "var(--text-main)" }}>
              رقم الهاتف
            </label>
            <div style={{ position: "relative" }}>
              <Phone
                size={18}
                style={{ position: "absolute", right: "16px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }}
              />
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="ادخل رقم الهاتف"
                className="input-fintech num-latin"
               style={{ paddingRight: "46px", fontSize: "1rem" }}
                required
              />
            </div>
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "8px", fontSize: "0.88rem", fontWeight: 600, color: "var(--text-main)" }}>
              كلمة المرور
            </label>
            <div style={{ position: "relative" }}>
              <Lock
                size={18}
                style={{ position: "absolute", right: "16px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }}
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="ادخل كلمة السر"
                className="input-fintech num-latin"
                style={{ paddingRight: "46px", fontSize: "1rem" }}
                required
              />
            </div>
          </div>

          {error && (
            <div
              style={{
                padding: "12px 16px",
                background: "var(--danger-light)",
                color: "var(--danger-text)",
                borderRadius: "var(--radius-md)",
                fontSize: "0.85rem",
                fontWeight: 600,
                border: "1px solid rgba(239, 68, 68, 0.2)",
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn-fintech-primary"
            disabled={loading}
            style={{ width: "100%", height: "52px", fontSize: "1.05rem", marginTop: "8px" }}
          >
            {loading ? (
              <>
                <RefreshCw size={20} className="spin-anim" />
                جاري التحقق...
              </>
            ) : (
              <>
                دخول لوحة التحكم
                <ArrowUpRight size={20} />
              </>
            )}
          </button>
        </form>

        <div
          style={{
            marginTop: "28px",
            paddingTop: "20px",
            borderTop: "1px solid var(--border)",
            textAlign: "center",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            color: "var(--text-muted)",
            fontSize: "0.82rem",
            fontWeight: 500,
          }}
        >
          <ShieldCheck size={16} color="var(--success)" />
          اتصال آمن ومحمي بأعلى معايير الأمان
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   MAIN DASHBOARD
================================================================ */

export default function Home() {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "delivered" | "failed">("all");
  const [copiedApi, setCopiedApi] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testPhone, setTestPhone] = useState("771176611");
  const [testMsg, setTestMsg] = useState("رمز التحقق الخاص بك هو: 8492 — صالح لـ 5 دقائق");
  const [testSending, setTestSending] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [togglingMaintenance, setTogglingMaintenance] = useState(false);
  const [clearingMessages, setClearingMessages] = useState(false);

  /* Auth check */
  useEffect(() => {
    const session = localStorage.getItem("alwadi_logged_in");
    setLoggedIn(session === "true");
  }, []);

  /* Data Loader */
  const loadMessages = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await fetch(`/api/messages/history`, { cache: "no-store" });
      if (res.ok) {
        const result = await res.json();
        
        if (result.success) {
          setData(result);
        }
      }
      const maintRes = await fetch(`/api/maintenance`, { cache: "no-store" });
      if (maintRes.ok) {
        const maintResult = await maintRes.json();
        setMaintenanceMode(maintResult.maintenanceMode);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  /* SSE Connection for Real-Time Updates */
  useEffect(() => {
    if (!loggedIn) return;
    loadMessages(); // Initial load
    
    // Connect to dashboard SSE stream
    const eventSource = new EventSource("/api/stream/dashboard");
    
    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === "READER_STATUS") {
          setData((prev) => {
            if (!prev) return prev;
            return { ...prev, readerLastSeen: payload.connected ? Date.now() : null };
          });
        } else if (payload.type === "NEW_MESSAGE" && payload.message) {
          setData((prev) => {
            if (!prev) return prev;
            const message = payload.message as Message;
            if (prev.messages.some((item) => item.id === message.id)) return prev;
            return {
              ...prev,
              messages: [message, ...prev.messages].slice(0, 100),
            };
          });
        } else if (payload.type === "MESSAGE_UPDATED" && payload.message) {
          setData((prev) => {
            if (!prev) return prev;
            const msgs = prev.messages.map((m) =>
              m.id === payload.message.id ? { ...m, status: payload.message.status, deliveredAt: payload.message.deliveredAt } : m
            );
            return { ...prev, messages: msgs };
          });
        } else if (payload.type === "MAINTENANCE_STATUS") {
          setMaintenanceMode(payload.maintenanceMode);
        }
      } catch (e) {
        console.error("SSE parse error", e);
      }
    };

    eventSource.onerror = (e) => {
      console.error("SSE Connection Error", e);
    };
    
    return () => {
      eventSource.close();
    };
  }, [loggedIn, loadMessages]);

  /* Filter messages */
  const filteredMessages = useMemo(() => {
    let msgs = data?.messages ?? [];
    if (statusFilter !== "all") msgs = msgs.filter((m) => m.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      msgs = msgs.filter(
        (m) => m.phone.toLowerCase().includes(q) || m.message.toLowerCase().includes(q)
      );
    }
    return msgs;
  }, [data, search, statusFilter]);

  /* Counts for tabs */
  const counts = useMemo(() => {
    const all = data?.messages?.length ?? 0;
    const pending = data?.messages?.filter((m) => m.status === "pending").length ?? 0;
    const delivered = data?.messages?.filter((m) => m.status === "delivered").length ?? 0;
    const failed = data?.messages?.filter((m) => m.status === "failed").length ?? 0;
    return { all, pending, delivered, failed };
  }, [data]);

  /* Copy API Key */
  async function copyApiKey() {
    try {
      await navigator.clipboard.writeText(API_KEY);
      setCopiedApi(true);
      setTimeout(() => setCopiedApi(false), 2000);
    } catch {}
  }

  /* Copy message text */
  async function copyMessageText(id: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMsgId(id);
      setTimeout(() => setCopiedMsgId(null), 2000);
    } catch {}
  }

  /* Test Send Message */
  async function handleSendTest(e: React.FormEvent) {
    e.preventDefault();
    setTestSending(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": API_KEY,
        },
        body: JSON.stringify({ phone: testPhone, message: testMsg }),
      });
      if (res.ok) {
        setTestModalOpen(false);
        loadMessages(true);
      } else {
        const errorData = await res.json();
        if (errorData.error) {
          alert("خطأ: " + errorData.error);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setTestSending(false);
    }
  }

  /* Toggle Maintenance */
  async function toggleMaintenance() {
    setTogglingMaintenance(true);
    try {
      const newMode = !maintenanceMode;
      const res = await fetch("/api/maintenance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ mode: newMode }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setMaintenanceMode(data.maintenanceMode);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setTogglingMaintenance(false);
    }
  }

  async function clearMessages() {
    if (!window.confirm("سيتم حذف جميع الرسائل من قاعدة بيانات Firebase نهائيًا. هل تريد المتابعة؟")) {
      return;
    }

    setClearingMessages(true);
    try {
      const res = await fetch("/api/messages/clear", {
        method: "DELETE",
        headers: { "x-api-key": API_KEY },
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "تعذر تنظيف الرسائل");
      }

      await loadMessages(true);
      alert(`تم حذف ${data.deleted} رسالة بنجاح`);
    } catch (error) {
      alert(error instanceof Error ? error.message : "تعذر تنظيف الرسائل");
    } finally {
      setClearingMessages(false);
    }
  }

  /* Logout */
  function logout() {
    localStorage.removeItem("alwadi_logged_in");
    setLoggedIn(false);
  }

  /* Format relative time */
  function formatRelative(ts: number) {
    const diffSec = Math.floor((Date.now() - ts) / 1000);
    if (diffSec < 60) return "الآن";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `منذ ${diffMin} دقيقة`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
    const days = Math.floor(diffHours / 24);
    return `منذ ${days} يوم`;
  }

  /* Format full timestamp */
  function formatFullTime(ts: number) {
    return new Date(ts).toLocaleTimeString("ar-SA", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  }

  if (loggedIn === null) return <div style={{ minHeight: "100vh", background: "var(--bg-app)" }} />;
  if (!loggedIn) return <LoginPage onLogin={() => setLoggedIn(true)} />;

  // ─── FULL SCREEN LOADER FOR INITIAL DATA LOAD ───
  if (loading && !data) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "radial-gradient(circle at center, #f5edfa 0%, #f8fafc 100%)",
        }}
      >
        <div
          className="live-pulse"
          style={{
            width: "90px",
            height: "90px",
            borderRadius: "28px",
            overflow: "hidden",
            border: "2px solid #290440",
            boxShadow: "0 15px 35px -5px rgba(41, 4, 64, 0.3)",
            background: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "4px",
            marginBottom: "24px",
          }}
        >
          <img
            src="/icon.png"
            alt="منظومة الوادي"
            style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: "20px" }}
          />
        </div>
        <h2 style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--text-main)", marginBottom: "8px" }}>
          جاري تحميل البيانات
        </h2>
        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", fontWeight: 500, display: "flex", alignItems: "center", gap: "8px" }}>
          <RefreshCw size={16} className="spin-anim" />
          يرجى الانتظار...
        </p>
      </div>
    );
  }

  const chartData = (data?.chartData ?? []).map((d) => ({
    ...d,
    dateLabel: new Date(d.date).toLocaleDateString("ar-SA", { weekday: "short", day: "numeric" }),
  }));

  const stats = data?.stats ?? { total: 0, pending: 0, delivered: 0, failed: 0, failedBalance: 0, successRate: 0 };

  return (
    <div className="app-container" style={{ maxWidth: "1240px", margin: "0 auto", padding: "28px 20px 80px" }}>
      
      {/* ─── APP HEADER ─── */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "28px",
          gap: "16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div
            style={{
              width: "52px",
              height: "52px",
              borderRadius: "18px",
              overflow: "hidden",
              border: "2px solid #290440",
              boxShadow: "0 8px 18px -4px rgba(41, 4, 64, 0.35)",
              background: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "2px",
            }}
          >
            <img
              src="/icon.png"
              alt="منظومة الوادي"
              style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: "14px" }}
            />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <h1 style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--text-main)", letterSpacing: "-0.02em" }}>
                 ALWADI SMS
              </h1>
            </div>
            <p style={{ color: "var(--text-sub)", fontSize: "0.82rem", fontWeight: 500, marginTop: "2px" }}>
              نظام رسائل التحقق (OTP) المباشر
            </p>
          </div>
        </div>

        {/* Quick action buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            onClick={toggleMaintenance}
            disabled={togglingMaintenance}
            className="btn-fintech-primary"
            style={{ 
              padding: "10px 16px", 
              fontSize: "0.88rem", 
              background: maintenanceMode ? "var(--danger)" : undefined,
              borderColor: maintenanceMode ? "var(--danger)" : undefined,
              color: maintenanceMode ? "#ffffff" : undefined,
            }}
          >
            {togglingMaintenance ? (
              <RefreshCw size={16} className="spin-anim" />
            ) : (
              <ShieldCheck size={16} />
            )}
            <span className="hide-on-mobile">{maintenanceMode ? "مفعل الصيانة" : "تفعيل الصيانة"}</span>
          </button>

          <button
            onClick={() => setTestModalOpen(true)}
            className="btn-fintech-primary"
            style={{ padding: "10px 16px", fontSize: "0.88rem" }}
          >
            <Send size={16} />
            <span className="hide-on-mobile">إرسال تجريبي</span>
          </button>

          <button
            onClick={clearMessages}
            disabled={clearingMessages}
            className="btn-fintech-primary"
            title="حذف جميع الرسائل من Firebase"
            style={{
              padding: "10px 16px",
              fontSize: "0.88rem",
              color: "var(--danger-text)",
              borderColor: "var(--danger)",
            }}
          >
            {clearingMessages ? <RefreshCw size={16} className="spin-anim" /> : <Trash2 size={16} />}
            <span className="hide-on-mobile">تنظيف الرسائل</span>
          </button>

          <button
            onClick={() => loadMessages()}
            className="btn-icon"
            title="تحديث البيانات"
            style={{ width: "42px", height: "42px" }}
          >
            <RefreshCw size={18} className={refreshing ? "spin-anim" : ""} />
          </button>

          <button
            onClick={logout}
            className="btn-icon"
            title="تسجيل الخروج"
            style={{ width: "42px", height: "42px", color: "var(--danger-text)" }}
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* ─── FINTECH HERO BANNER (API & System Overview) ─── */}
      <div
        className="fintech-hero"
        style={{
          padding: "24px",
          marginBottom: "28px",
          display: "flex",
          alignItems: "center",
        }}
      >
        {/* API Key Chip (Full Width) */}
        <div
          style={{
            position: "relative",
            zIndex: 2,
            background: "rgba(255, 255, 255, 0.1)",
            backdropFilter: "blur(16px)",
            borderRadius: "20px",
            padding: "20px 24px",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <Key size={20} color="#e9d5ff" />
            <span style={{ fontSize: "1.05rem", color: "#ffffff", fontWeight: 700 }}>
              مفتاح الربط البرمجي (API Key)
            </span>
          </div>
          
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: "260px", justifyContent: "flex-end" }}>
            <div
              className="num-latin"
              style={{
                background: "rgba(0, 0, 0, 0.25)",
                padding: "10px 18px",
                borderRadius: "12px",
                fontSize: "1.05rem",
                fontWeight: 700,
                color: "#ffffff",
                letterSpacing: "0.5px",
                flex: "0 1 auto",
              }}
            >
              {API_KEY}
            </div>
            <button
              onClick={copyApiKey}
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                border: "none",
                background: copiedApi ? "var(--success)" : "rgba(255, 255, 255, 0.2)",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "all 0.2s ease",
                flexShrink: 0,
              }}
              title="نسخ مفتاح API"
            >
              {copiedApi ? <Check size={20} /> : <Copy size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* ─── STATS GRID ─── */}
      <div
        className="stats-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(6, 1fr)",
          gap: "18px",
          marginBottom: "28px",
        }}
      >
        {/* Card 1: Total */}
        <div className="app-card app-card-interactive stat-card-inner" style={{ padding: "22px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
            <span style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--text-sub)" }}>إجمالي الرسائل</span>
            <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: "var(--primary-light)", color: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <MessageSquare size={20} />
            </div>
          </div>
          <div className="num-latin stat-val" style={{ fontSize: "1.9rem", fontWeight: 800, color: "var(--text-main)", lineHeight: 1 }}>
            {loading ? "—" : stats.total}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "var(--text-muted)", fontSize: "0.78rem", marginTop: "8px", fontWeight: 500 }}>
            <span>خلال آخر 30 يوم</span>
          </div>
        </div>

        {/* Card 2: Pending */}
        <div className="app-card app-card-interactive stat-card-inner" style={{ padding: "22px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
            <span style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--text-sub)" }}>قيد الانتظار</span>
            <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: "var(--warning-light)", color: "var(--warning-text)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Clock size={20} />
            </div>
          </div>
          <div className="num-latin stat-val" style={{ fontSize: "1.9rem", fontWeight: 800, color: "var(--warning-text)", lineHeight: 1 }}>
            {loading ? "—" : stats.pending}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "var(--text-muted)", fontSize: "0.78rem", marginTop: "8px", fontWeight: 500 }}>
            <span>بانتظار سحب التطبيق</span>
          </div>
        </div>

        {/* Card 3: Delivered */}
        <div className="app-card app-card-interactive stat-card-inner" style={{ padding: "22px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
            <span style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--text-sub)" }}>تم التسليم بنجاح</span>
            <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: "var(--success-light)", color: "var(--success-text)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div className="num-latin stat-val" style={{ fontSize: "1.9rem", fontWeight: 800, color: "var(--success-text)", lineHeight: 1 }}>
            {loading ? "—" : stats.delivered}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "var(--text-muted)", fontSize: "0.78rem", marginTop: "8px", fontWeight: 500 }}>
            <span>تم تسليمها للمشتركين</span>
          </div>
        </div>

        {/* Card 4: Success Rate */}
        <div className="app-card app-card-interactive stat-card-inner" style={{ padding: "22px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
            <span style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--text-sub)" }}>معدل النجاح</span>
            <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: "#f5edfa", color: "#290440", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Zap size={20} />
            </div>
          </div>
          <div className="num-latin stat-val" style={{ fontSize: "1.9rem", fontWeight: 800, color: "var(--text-main)", lineHeight: 1 }}>
            {loading ? "—" : `${stats.successRate}%`}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "var(--success-text)", fontSize: "0.78rem", marginTop: "8px", fontWeight: 600 }}>
            <TrendingUp size={14} />
            <span>كفاءة تسليم ممتازة</span>
          </div>
        </div>

        {/* Card 5: Failed Balance */}
        <div className="app-card app-card-interactive stat-card-inner" style={{ padding: "22px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
            <span style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--text-sub)" }}>فشلت للرصيد</span>
            <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: "rgba(239, 68, 68, 0.15)", color: "var(--danger-text)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <X size={20} />
            </div>
          </div>
          <div className="num-latin stat-val" style={{ fontSize: "1.9rem", fontWeight: 800, color: "var(--danger-text)", lineHeight: 1 }}>
            {loading ? "?" : stats.failedBalance}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "var(--text-muted)", fontSize: "0.78rem", marginTop: "8px", fontWeight: 500 }}>
            <span>فشلت بسبب الرصيد</span>
          </div>
        </div>

        {/* Card 6: Failed */}
        <div className="app-card app-card-interactive stat-card-inner" style={{ padding: "22px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
            <span style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--text-sub)" }}>فاشلة (عام)</span>
            <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: "var(--danger-light)", color: "var(--danger-text)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <X size={20} />
            </div>
          </div>
          <div className="num-latin stat-val" style={{ fontSize: "1.9rem", fontWeight: 800, color: "var(--danger-text)", lineHeight: 1 }}>
            {loading ? "—" : stats.failed}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "var(--text-muted)", fontSize: "0.78rem", marginTop: "8px", fontWeight: 500 }}>
            <span>تجاوزت وقت الانتظار</span>
          </div>
        </div>
      </div>

      {/* ─── ACTIVITY CHART ─── */}
      <div className="app-card" style={{ padding: "28px 24px", marginBottom: "28px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--text-main)" }}>
              نشاط التراسل اليومي
            </h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.82rem", marginTop: "2px", fontWeight: 500 }}>
              متابعة تدفق الرسائل الصادرة والمُسلّمة خلال الـ 7 أيام الماضية
            </p>
          </div>
          <div style={{ display: "flex", gap: "16px", fontSize: "0.82rem", fontWeight: 600 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#290440" }} />
              <span>مُسلّمة</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "var(--warning)" }} />
              <span>قيد الانتظار</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "var(--danger)" }} />
              <span>فاشلة</span>
            </div>
          </div>
        </div>

        <div style={{ height: 260, width: "100%" }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="primaryGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#290440" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#290440" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="warningGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="dangerGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="dateLabel"
                tick={{ fill: "#94a3b8", fontSize: 12, fontWeight: 500, fontFamily: "Tajawal" }}
                axisLine={false}
                tickLine={false}
                dy={10}
              />
              <YAxis
                tick={{ fill: "#94a3b8", fontSize: 12, fontWeight: 500, fontFamily: "Plus Jakarta Sans" }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
                dx={-10}
              />
              <Tooltip
                contentStyle={{
                  background: "#ffffff",
                  borderRadius: "16px",
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)",
                  padding: "12px 16px",
                  fontSize: "0.85rem",
                  fontFamily: "Tajawal",
                }}
              />
              <Area
                type="monotone"
                dataKey="delivered"
                name="مُسلّمة"
                stroke="#290440"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#primaryGrad)"
                activeDot={{ r: 6, stroke: "#ffffff", strokeWidth: 2, fill: "#290440" }}
              />
              <Area
                type="monotone"
                dataKey="pending"
                name="انتظار"
                stroke="#f59e0b"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#warningGrad)"
                activeDot={{ r: 6, stroke: "#ffffff", strokeWidth: 2, fill: "#f59e0b" }}
              />
              <Area
                type="monotone"
                dataKey="failed"
                name="فاشلة"
                stroke="#ef4444"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#dangerGrad)"
                activeDot={{ r: 6, stroke: "#ffffff", strokeWidth: 2, fill: "#ef4444" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ─── MESSAGES FEED ─── */}
      <div className="app-card" style={{ padding: "24px", overflow: "hidden" }}>
        
        {/* Toolbar Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "16px",
            marginBottom: "20px",
          }}
        >
          <div>
            <h3 style={{ fontSize: "1.15rem", fontWeight: 800, color: "var(--text-main)" }}>
              سجل الرسائل والعمليات
            </h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.82rem", marginTop: "2px", fontWeight: 500 }}>
              عرض حي لجميع رسائل OTP والتنبيهات الممررة عبر المنظومة
            </p>
          </div>

          {/* Segmented Filter Tabs */}
          <div
            style={{
              display: "flex",
              background: "var(--surface-alt)",
              padding: "4px",
              borderRadius: "var(--radius-md)",
              gap: "4px",
            }}
          >
            {(["all", "pending", "delivered", "failed"] as const).map((f) => {
              const active = statusFilter === f;
              const count = f === "all" ? counts.all : f === "pending" ? counts.pending : f === "delivered" ? counts.delivered : counts.failed;
              return (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "8px 16px",
                    borderRadius: "12px",
                    border: "none",
                    background: active ? "var(--surface)" : "transparent",
                    color: active ? (f === "failed" ? "var(--danger)" : "var(--primary)") : "var(--text-sub)",
                    fontSize: "0.85rem",
                    fontWeight: active ? 700 : 500,
                    fontFamily: "inherit",
                    cursor: "pointer",
                    boxShadow: active ? "var(--shadow-sm)" : "none",
                    transition: "all 0.2s ease",
                  }}
                >
                  <span>{f === "all" ? "الكل" : f === "pending" ? "في الانتظار" : f === "delivered" ? "المُسلّمة" : "فاشلة"}</span>
                  <span
                    className="num-latin"
                    style={{
                      background: active ? (f === "failed" ? "var(--danger-light)" : "var(--primary-light)") : "rgba(0,0,0,0.06)",
                      color: active ? (f === "failed" ? "var(--danger)" : "var(--primary)") : "var(--text-muted)",
                      padding: "2px 7px",
                      borderRadius: "var(--radius-full)",
                      fontSize: "0.72rem",
                      fontWeight: 700,
                    }}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Search Bar */}
        <div style={{ position: "relative", marginBottom: "20px" }}>
          <Search
            size={18}
            style={{ position: "absolute", right: "16px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث برقم الهاتف، رمز التحقق، أو محتوى الرسالة..."
            className="input-fintech"
            style={{ paddingRight: "46px", paddingLeft: search ? "40px" : "16px" }}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              style={{
                position: "absolute",
                left: "14px",
                top: "50%",
                transform: "translateY(-50%)",
                background: "transparent",
                border: "none",
                color: "var(--text-muted)",
                cursor: "pointer",
              }}
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Message Cards List */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {loading ? (
            <div style={{ padding: "60px 0", textAlign: "center" }}>
              <RefreshCw size={28} className="spin-anim" style={{ margin: "0 auto 12px", color: "var(--primary)" }} />
              <p style={{ color: "var(--text-sub)", fontSize: "0.9rem", fontWeight: 600 }}>جاري استرجاع الرسائل...</p>
            </div>
          ) : filteredMessages.length === 0 ? (
            <div
              style={{
                padding: "60px 20px",
                textAlign: "center",
                background: "var(--surface-alt)",
                borderRadius: "var(--radius-md)",
              }}
            >
              <MessageSquare size={36} style={{ margin: "0 auto 12px", color: "var(--text-muted)" }} />
              <h4 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-main)", marginBottom: "4px" }}>
                لا توجد رسائل مطابقة
              </h4>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 500 }}>
                {search ? "جرب البحث برقم آخر أو مسح حقل البحث" : "ستظهر الرسائل فور إرسالها عبر الويب هوك"}
              </p>
            </div>
          ) : (
            filteredMessages.map((msg) => {
              const otp = extractOtp(msg.message);
              const isCopied = copiedMsgId === msg.id;

              return (
                <div
                  key={msg.id}
                  className="app-card-interactive"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "18px 20px",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border)",
                    background: "var(--surface)",
                    gap: "16px",
                    flexWrap: "wrap",
                  }}
                >
                  {/* Right Side: Phone + Content */}
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "14px", flex: 1, minWidth: "260px" }}>
                    <div
                      style={{
                        width: "44px",
                        height: "44px",
                        borderRadius: "14px",
                        background: msg.status === "delivered" ? "var(--success-light)" : msg.status === "failed" ? "var(--danger-light)" : "var(--warning-light)",
                        color: msg.status === "delivered" ? "var(--success-text)" : msg.status === "failed" ? "var(--danger-text)" : "var(--warning-text)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        marginTop: "2px",
                      }}
                    >
                      {msg.status === "delivered" ? <CheckCircle2 size={22} /> : msg.status === "failed" ? <X size={22} /> : <Clock size={22} />}
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
                        <span className="num-latin" style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--text-main)" }}>
                          {msg.phone}
                        </span>

                        {otp && (
                          <span
                            className="num-latin"
                            style={{
                              background: "var(--primary-light)",
                              color: "var(--primary)",
                              padding: "2px 8px",
                              borderRadius: "8px",
                              fontSize: "0.75rem",
                              fontWeight: 800,
                              letterSpacing: "1px",
                            }}
                          >
                            OTP: {otp}
                          </span>
                        )}
                      </div>

                      <p style={{ color: "var(--text-sub)", fontSize: "0.9rem", lineHeight: 1.5, fontWeight: 400 }}>
                        {msg.message}
                      </p>
                    </div>
                  </div>

                  {/* Left Side: Status + Time + Copy Action */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-end",
                      gap: "12px",
                      minWidth: "160px",
                    }}
                  >
                    <div style={{ textAlign: "left", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px" }}>
                      {msg.status === "delivered" ? (
                        <span className="badge-fintech badge-delivered">
                          <CheckCircle2 size={12} />
                          مُسلّمة
                        </span>
                      ) : msg.status === "failed" ? (
                        <span className="badge-fintech badge-failed">
                          <X size={12} />
                          فاشلة
                        </span>
                      ) : (
                        <span className="badge-fintech badge-pending">
                          <Clock size={12} />
                          انتظار
                        </span>
                      )}
                      {msg.status === "delivered" ? (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "2px", marginTop: "2px" }}>
                          <div className="num-latin" style={{ fontSize: "0.75rem", color: "var(--success-text)", fontWeight: 600 }}>
                            استلام: {formatFullTime(msg.createdAt)} • {formatRelative(msg.createdAt)}
                          </div>
                          {msg.deliveredAt && (
                            <div className="num-latin" style={{ fontSize: "0.75rem", color: "#3b82f6", fontWeight: 600 }}>
                              إرسال: {formatFullTime(msg.deliveredAt)} • {formatRelative(msg.deliveredAt)}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="num-latin" style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>
                          {formatFullTime(msg.createdAt)} • {formatRelative(msg.createdAt)}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => copyMessageText(msg.id, msg.message)}
                      className="btn-fintech-secondary"
                      style={{
                        padding: "8px 16px",
                        fontSize: "0.85rem",
                        width: "100%",
                        justifyContent: "center",
                        background: isCopied ? "var(--success-light)" : "var(--surface)",
                        color: isCopied ? "var(--success-text)" : "var(--primary)",
                        borderColor: isCopied ? "rgba(16, 185, 129, 0.3)" : "var(--border)",
                        boxShadow: isCopied ? "none" : "var(--shadow-sm)",
                        transition: "all 0.3s ease",
                      }}
                      title="نسخ نص الرسالة"
                    >
                      {isCopied ? (
                        <>
                          <Check size={16} />
                          تم نسخ الرسالة
                        </>
                      ) : (
                        <>
                          <Copy size={16} />
                          نسخ الرسالة
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ─── TEST SEND MODAL ─── */}
      {testModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            zIndex: 100,
          }}
        >
          <div
            className="app-card"
            style={{
              width: "100%",
              maxWidth: "460px",
              padding: "32px 28px",
              borderRadius: "var(--radius-xl)",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: "var(--primary-light)", color: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Send size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: "1.15rem", fontWeight: 800, color: "var(--text-main)" }}>
                    إرسال رسالة تجريبية
                  </h3>
                  <p style={{ color: "var(--text-muted)", fontSize: "0.78rem", fontWeight: 500 }}>
                    اختبار استقبال وتخزين الرسائل فوراً
                  </p>
                </div>
              </div>
              <button
                onClick={() => setTestModalOpen(false)}
                className="btn-icon"
                style={{ width: "36px", height: "36px" }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSendTest} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "0.85rem", fontWeight: 600 }}>
                  رقم الهاتف المستقبل
                </label>
                <input
                  type="text"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  className="input-fintech num-latin"
                  required
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "0.85rem", fontWeight: 600 }}>
                  محتوى الرسالة (نص أو رمز OTP)
                </label>
                <textarea
                  value={testMsg}
                  onChange={(e) => setTestMsg(e.target.value)}
                  rows={3}
                  className="input-fintech"
                  style={{ resize: "vertical", fontFamily: "inherit" }}
                  required
                />
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
                <button
                  type="submit"
                  disabled={testSending}
                  className="btn-fintech-primary"
                  style={{ flex: 1, height: "48px" }}
                >
                  {testSending ? (
                    <>
                      <RefreshCw size={18} className="spin-anim" />
                      جاري الإرسال...
                    </>
                  ) : (
                    <>
                      <Send size={18} />
                      إرسال وحفظ فوراً
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setTestModalOpen(false)}
                  className="btn-fintech-secondary"
                  style={{ height: "48px" }}
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── FOOTER ─── */}
      <footer style={{ marginTop: "40px", textAlign: "center", color: "var(--text-muted)", fontSize: "0.82rem", fontWeight: 500 }}>
        منظومة الوادي SMS — نظام إدارة واستقبال الرسائل والتحقق © {new Date().getFullYear()}
      </footer>

    </div>
  );
}