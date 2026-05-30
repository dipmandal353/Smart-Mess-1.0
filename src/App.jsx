import { useState, createContext, useContext, useEffect } from "react";

const API = "http://localhost:5000/api";

// ── SEED ──────────────────────────────────────────────────────────────────────
const SEED_STUDENTS = [
  { id:"s1", name:"Priya Nair",   phone:"9876543211", password:"pass123", email:"priya@student.edu", address:"Room 203, Block B" },
  { id:"s2", name:"Rahul Mehta",  phone:"9876543212", password:"pass123", email:"rahul@student.edu", address:"Room 315, Block C" },
];
const SEED_WALLETS = [
  { id:"w1", studentId:"s1", balance:450  },
  { id:"w2", studentId:"s2", balance:80   },
];
const SEED_EXPENSES = [
  { id:"e1", studentId:"s1", amount:295, description:"May Week 1 Mess Bill", date:"2025-05-07", isPaid:true  },
  { id:"e2", studentId:"s1", amount:310, description:"May Week 2 Mess Bill", date:"2025-05-14", isPaid:false },
  { id:"e3", studentId:"s1", amount:290, description:"May Week 3 Mess Bill", date:"2025-05-21", isPaid:false },
  { id:"e4", studentId:"s2", amount:300, description:"May Week 1 Mess Bill", date:"2025-05-07", isPaid:false },
  { id:"e5", studentId:"s2", amount:315, description:"May Week 2 Mess Bill", date:"2025-05-14", isPaid:false },
];
const SEED_TXN = [
  { id:"t1", studentId:"s1", type:"Credit", amount:1000, description:"Wallet Top-Up by Admin",        date:"2025-05-01" },
  { id:"t2", studentId:"s1", type:"Debit",  amount:295,  description:"Payment: May Week 1 Mess Bill", date:"2025-05-07" },
  { id:"t3", studentId:"s2", type:"Credit", amount:500,  description:"Wallet Top-Up by Admin",        date:"2025-05-01" },
  { id:"t4", studentId:"s2", type:"Debit",  amount:300,  description:"Payment: May Week 1 Mess Bill", date:"2025-05-08" },
];

// ── CONTEXT ───────────────────────────────────────────────────────────────────
const Ctx = createContext(null);
const useApp = () => useContext(Ctx);

function AppProvider({ children }) {
  // Application State
  const [loading,  setLoading]  = useState(true);
  const [user,     setUser]     = useState(() => { try { const s = localStorage.getItem("mp_user"); return s ? JSON.parse(s) : null; } catch(e){ return null; } });
  const [students, setStudents] = useState([]);
  const [wallets,  setWallets]  = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [txns,     setTxns]     = useState([]);
  const [notices,  setNotices]  = useState([]);
  
  // Keep dismissed notices specific to the device
  const [dismissedNotices, setDismissedNotices] = useState(() => { try { const s = localStorage.getItem("mp_dismissedNotices"); return s ? JSON.parse(s) : []; } catch(e){ return []; } });
  const [toast, setToast] = useState(null);

  // Sync user state locally so they stay logged in
  useEffect(() => { localStorage.setItem("mp_user", JSON.stringify(user)); }, [user]);
  useEffect(() => { localStorage.setItem("mp_dismissedNotices", JSON.stringify(dismissedNotices)); }, [dismissedNotices]);

  const showToast = (text, ok=true) => {
    setToast({ text, ok });
    setTimeout(() => setToast(null), 3000);
  };

  // ── DATABASE SYNC ─────────────────────────────────────────────────────────
  async function fetchDatabase() {
    try {
      const res = await fetch(`${API}/data`);
      const db = await res.json();
      setStudents(db.students || []);
      setWallets(db.wallets || []);
      setExpenses(db.expenses || []);
      setTxns(db.txns || []);
      setNotices(db.notices || []);
    } catch (error) {
      console.error("Failed to connect to MongoDB Backend:", error);
    } finally {
      setLoading(false);
    }
  }

  // Load database on initial open
  useEffect(() => { fetchDatabase(); }, []);

  // ── AUTH ──────────────────────────────────────────────────────────────────
  function doLogin(phone, password, latestStudents) {
    const p  = (phone || "").trim();
    const pw = (password || "").trim();
    if (p === "admin" && pw === "admin") {
      setUser({ role: "admin" });
      showToast("Welcome Admin! Logged in successfully.", true);
      return null;
    }
    const found = (latestStudents || students).find(s => s.phone === p && s.password === pw);
    if (found) {
      setUser({ role: "student", id: found.id });
      showToast(`Welcome back, ${found.name}!`, true);
      return null;
    }
    return "Invalid phone number or password.";
  }

  function logout() { 
    setUser(null); 
    showToast("Logged out successfully.", true);
  }

  // ── MUTATIONS (TALK TO BACKEND) ─────────────────────────────────────────
  async function registerStudent(data) {
    try {
      const res = await fetch(`${API}/students`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data) });
      if (!res.ok) { const err = await res.json(); return err.error || "Registration failed"; }
      await fetchDatabase();
      return null;
    } catch(e) { return "Server communication error"; }
  }

  async function editStudent(id, patch) {
    try {
      const res = await fetch(`${API}/students/${id}`, { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(patch) });
      if (!res.ok) { const err = await res.json(); return err.error || "Update failed"; }
      await fetchDatabase();
      return null;
    } catch(e) { return "Server communication error"; }
  }

  async function deleteStudent(id) {
    await fetch(`${API}/students/${id}`, { method: 'DELETE' });
    await fetchDatabase();
  }

  async function loadWallet(studentId, amount, note) {
    await fetch(`${API}/wallets/load`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({studentId, amount: Number(amount), note}) });
    await fetchDatabase();
  }

  async function addExpense(studentId, amount, description) {
    const studentIds = Array.isArray(studentId) ? studentId : [studentId];
    await fetch(`${API}/expenses`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({studentIds, amount: Number(amount), description}) });
    await fetchDatabase();
  }

  async function editExpense(expenseId, patch, applyToAllIdentical) {
    await fetch(`${API}/expenses/${expenseId}`, { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ ...patch, applyToAllIdentical }) });
    await fetchDatabase();
  }

  async function deleteExpense(expenseId, applyToAllIdentical) {
    await fetch(`${API}/expenses/${expenseId}`, { method: 'DELETE', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ applyToAllIdentical }) });
    await fetchDatabase();
  }

  async function payExpense(expenseId) {
    const res = await fetch(`${API}/pay`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({expenseId}) });
    if (!res.ok) { const err = await res.json(); return err.error || "Payment failed"; }
    await fetchDatabase();
    return null;
  }

  async function addNotice(text) {
    await fetch(`${API}/notices`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({text}) });
    await fetchDatabase();
  }

  async function removeNotice(id) {
    await fetch(`${API}/notices/${id}`, { method: 'DELETE' });
    await fetchDatabase();
  }

  function dismissNotice(id) { setDismissedNotices(prev => [...prev, id]); }

  // ── SELECTORS ─────────────────────────────────────────────────────────────
  const getStudent  = id => students.find(s => s.id === id);
  const getWallet   = id => wallets.find(w => w.studentId === id);
  const getExpenses = id => expenses.filter(e => e.studentId === id);
  const getTxns     = id => txns.filter(t => t.studentId === id);
  const totalDues   = expenses.filter(e => !e.isPaid).reduce((s,e) => s + e.amount, 0);
  const walletPool  = wallets.reduce((s,w) => s + w.balance, 0);

  // Computes a sequential S1, S2, S3 display ID based on registration index
  const getDisplayId = (studentId) => {
    const index = students.findIndex(s => s.id === studentId);
    return index >= 0 ? `S${index + 1}` : "S?";
  };

  return (
    <Ctx.Provider value={{
      loading, user, students, wallets, expenses, txns, notices, dismissedNotices,
      doLogin, logout, showToast, addNotice, removeNotice, dismissNotice,
      registerStudent, editStudent, deleteStudent, loadWallet, addExpense, editExpense, deleteExpense,
      payExpense, updateProfile: editStudent, getDisplayId,
      getStudent, getWallet, getExpenses, getTxns,
      totalDues, walletPool,
    }}>
      {children}
      <ToastPopup toast={toast} />
    </Ctx.Provider>
  );
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
const rupee = n  => "₹" + Number(n).toLocaleString("en-IN");
const fdate = d  => new Date(d).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" });
const avi   = name => ((name||"?").split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase() || "??");
const COLORS = ["#1e3a8a","#1d4ed8","#4338ca","#0f766e","#0369a1","#7c3aed"];
const aviColor = name => COLORS[(name||"?").charCodeAt(0) % COLORS.length];

// ── PRIMITIVES ────────────────────────────────────────────────────────────────
const Card = ({children, style={}, className=""}) => (
  <div className={className} style={{ background:"#fff", borderRadius:20, border:"1px solid #e2e8f0", boxShadow:"0 12px 32px rgba(0,0,0,.05)", ...style }}>{children}</div>
);

function Checkbox({ label, checked, onChange }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 14, color: "#1e293b", fontWeight: 600 }}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} style={{ width: 18, height: 18, cursor: "pointer", accentColor: "#1e3a8a" }} />
      {label}
    </label>
  );
}

function ToastPopup({ toast }) {
  if (!toast) return null;
  return (
    <div style={{
      position:"fixed", top: 24, left: "50%", transform: "translateX(-50%)", zIndex:9999,
      background: toast.ok ? "#10b981" : "#ef4444", color:"#fff",
      padding:"14px 24px", borderRadius:12, fontWeight:700, fontSize:15,
      boxShadow:"0 10px 25px -5px rgba(0,0,0,0.3)", animation:"toastSlideFade 3s forwards",
      display:"flex", alignItems:"center", gap:10, pointerEvents: "none", whiteSpace:"nowrap"
    }}>
      <span style={{ fontSize:18 }}>{toast.ok ? "✅" : "⚠️"}</span>{toast.text}
    </div>
  );
}

const ShadedRow = ({children, style={}, className=""}) => {
  const [hov, setHov] = useState(false);
  return (
    <div className={className} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background:"#fff", borderRadius:16, border:"1px solid #e2e8f0", 
        boxShadow: hov ? "0 8px 24px rgba(0,0,0,0.06)" : "0 4px 12px rgba(0,0,0,0.02)", 
        transition: "all 0.2s ease", transform: hov ? "translateY(-2px)" : "none", ...style 
      }}>{children}</div>
  );
};

function Av({ name, size=40 }) {
  return (
    <div style={{
      width:size, height:size, borderRadius:12, flexShrink:0, background: aviColor(name), color:"#fff",
      display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize: size*0.32, 
      userSelect:"none", boxShadow: "inset 0 -2px 0 rgba(0,0,0,0.1)"
    }}>{avi(name)}</div>
  );
}

function Btn({ children, onClick, type="button", color="primary", sm=false, full=false, disabled=false, className="" }) {
  const palettes = {
    primary: { bg:"linear-gradient(135deg, #1e3a8a, #1d4ed8)", hover:"linear-gradient(135deg, #1e40af, #1e3a8a)", text:"#fff", border: "none" },
    danger:  { bg:"linear-gradient(135deg, #dc2626, #b91c1c)", hover:"linear-gradient(135deg, #b91c1c, #991b1b)", text:"#fff", border: "none" },
    success: { bg:"linear-gradient(135deg, #059669, #047857)", hover:"linear-gradient(135deg, #047857, #065f46)", text:"#fff", border: "none" },
    ghost:   { bg:"#f8fafc", hover:"#f1f5f9", text:"#475569", border: "1px solid #e2e8f0" },
  };
  const p = palettes[color] || palettes.primary;
  const [hov, setHov] = useState(false);
  return (
    <button className={className} type={type} onClick={onClick} disabled={disabled} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background: disabled ? "#cbd5e1" : (hov ? p.hover : p.bg), color: disabled ? "#f8fafc" : p.text, border: p.border, 
        borderRadius: 12, cursor: disabled ? "not-allowed" : "pointer", padding: sm ? "8px 14px" : "12px 20px",
        fontSize: sm ? 13 : 14, fontWeight: 700, width: full ? "100%" : "auto", transition: "all .2s ease", 
        transform: hov && !disabled ? "translateY(-1px)" : "none", boxShadow: hov && !disabled ? "0 4px 12px rgba(0,0,0,0.15)" : "none",
        userSelect:"none", display:"inline-flex", alignItems:"center", justifyContent:"center", gap:6,
      }}>{children}</button>
  );
}

function Field({ label, value, onChange, type="text", readOnly=false, placeholder="", hint="" }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:6, width:"100%" }}>
      {label && <label style={{ fontSize:11, fontWeight:800, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.08em" }}>{label}</label>}
      <input type={type} value={value} placeholder={placeholder} readOnly={readOnly} onChange={readOnly ? undefined : onChange}
        style={{
          border: `1px solid ${readOnly ? "#e2e8f0" : "#cbd5e1"}`, borderRadius:12, padding:"12px 16px", fontSize:15,
          background: readOnly ? "#f8fafc" : "#fff", color: readOnly ? "#94a3b8" : "#1e293b", cursor: readOnly ? "not-allowed" : "text",
          outline:"none", width:"100%", boxSizing:"border-box", fontFamily:"inherit", transition: "border-color 0.2s"
        }}
        onFocus={e => { if(!readOnly) e.target.style.borderColor="#1d4ed8"; }} onBlur={e  => { e.target.style.borderColor = readOnly?"#e2e8f0":"#cbd5e1"; }} />
      {hint && <span style={{ fontSize:11, color:"#ef4444", fontWeight:600 }}>{hint}</span>}
    </div>
  );
}

function Select({ label, value, onChange, children }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:6, width:"100%" }}>
      {label && <label style={{ fontSize:11, fontWeight:800, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.08em" }}>{label}</label>}
      <select value={value} onChange={onChange} style={{ border:"1px solid #cbd5e1", borderRadius:12, padding:"12px 16px", fontSize:15, background:"#fff", color:"#1e293b", outline:"none", width:"100%", boxSizing:"border-box", fontFamily:"inherit" }}>
        {children}
      </select>
    </div>
  );
}

function Badge({ text, color }) {
  const map = {
    green:  { bg:"#f0fdf4", text:"#166534", border:"#bbf7d0" }, red: { bg:"#fef2f2", text:"#991b1b", border:"#fecaca" },
    blue:   { bg:"#eff6ff", text:"#1e40af", border:"#bfdbfe" }, amber: { bg:"#fffbeb", text:"#92400e", border:"#fde68a" },
    slate:  { bg:"#f8fafc", text:"#475569", border:"#e2e8f0" },
  };
  const c = map[color] || map.slate;
  return (
    <span style={{ background:c.bg, color:c.text, border:`1px solid ${c.border}`, borderRadius:99, fontSize:11, fontWeight:700, padding:"4px 12px", display:"inline-block", whiteSpace:"nowrap", letterSpacing:"0.02em" }}>{text}</span>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div onClick={e => e.target===e.currentTarget && onClose()} style={{ position:"fixed", inset:0, zIndex:100, background:"rgba(15, 23, 42, 0.6)", backdropFilter:"blur(8px)", display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ background:"#fff", borderRadius:24, boxShadow:"0 25px 50px -12px rgba(0,0,0,0.25)", width:"100%", maxWidth:460, maxHeight:"90vh", display:"flex", flexDirection:"column" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"20px 24px", borderBottom:"1px solid #f1f5f9", flexShrink: 0 }}>
          <span style={{ fontWeight:800, fontSize:18, color:"#0f172a" }}>{title}</span>
          <button onClick={onClose} style={{ background:"#f1f5f9", border:"none", borderRadius:10, width:36, height:36, cursor:"pointer", fontSize:16, color:"#64748b", display:"flex", alignItems:"center", justifyContent:"center", transition:"background 0.2s" }} onMouseEnter={e => e.currentTarget.style.background="#e2e8f0"} onMouseLeave={e => e.currentTarget.style.background="#f1f5f9"}>✕</button>
        </div>
        <div style={{ padding:"20px 24px", overflowY:"auto" }}>{children}</div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, sub, valueColor="#0f172a" }) {
  return (
    <Card style={{ padding:24, display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
      <div style={{ minWidth:0, paddingRight:12 }}>
        <div style={{ fontSize:11, fontWeight:800, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8 }}>{label}</div>
        <div style={{ fontSize:32, fontWeight:800, color:valueColor, lineHeight:1, wordWrap:"break-word" }}>{value}</div>
        {sub && <div style={{ fontSize:13, color:"#94a3b8", marginTop:8, fontWeight: 600 }}>{sub}</div>}
      </div>
      <div style={{ fontSize:28, flexShrink:0, background: "#f8fafc", width: 52, height: 52, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 16 }}>{icon}</div>
    </Card>
  );
}

function Alert({ msg, ok }) {
  if (!msg) return null;
  return (
    <div style={{ background: ok ? "#f0fdf4" : "#fef2f2", border: `1px solid ${ok ? "#bbf7d0" : "#fecaca"}`, color: ok ? "#166534" : "#991b1b", borderRadius:12, padding:"12px 16px", fontSize:14, fontWeight:700, display:"flex", alignItems:"center", gap: 8 }}>
      <span style={{flexShrink:0}}>{ok ? "✅" : "⚠️"}</span> <span style={{lineHeight: 1.4}}>{msg}</span>
    </div>
  );
}

// ── LOGIN PAGE ────────────────────────────────────────────────────────────────
function LoginPage() {
  const { doLogin, students } = useApp();
  const [phone,    setPhone]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");

  function handleLogin() {
    setError("");
    const err = doLogin(phone, password, students);
    if (err) setError(err);
  }

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg, #020617 0%, #0f172a 40%, #1e3a8a 100%)", display:"flex", flexDirection: "column", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div style={{ width:"100%", maxWidth:380 }}>
        <div style={{ textAlign:"center", marginBottom:40 }}>
          <div style={{ width:72, height:72, borderRadius:20, background:"rgba(255,255,255,.05)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:36, margin:"0 auto 16px", border:"1px solid rgba(255,255,255,.1)", boxShadow: "0 8px 32px rgba(0,0,0,0.2)", backdropFilter: "blur(10px)" }}>🍽️</div>
          <div style={{ color:"#fff", fontSize:32, fontWeight:800, letterSpacing:"-1px" }}>MessPro</div>
          <div style={{ color:"#93c5fd", fontSize:14, marginTop:6, fontWeight:500 }}>Hostel Mess Management System</div>
        </div>

        <Card style={{ padding:"32px 24px", boxShadow:"0 25px 50px -12px rgba(0,0,0,0.5)", border:"none" }}>
          <div style={{ fontSize:18, fontWeight:800, color:"#0f172a", marginBottom:24 }}>Sign in to your account</div>
          <div style={{ display:"flex", flexDirection:"column", gap:18 }}>
            <Field label="Phone / Username" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Enter phone or 'admin'" />
            <Field label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" />
            {error && <Alert msg={error} ok={false} />}
            <div style={{ marginTop: 8 }}><Btn full onClick={handleLogin}>Sign In →</Btn></div>
          </div>
        </Card>

        <div style={{ textAlign: "center", marginTop: 24, color: "rgba(255, 255, 255, 0.4)", fontSize: 13, fontWeight: 600, letterSpacing: "0.05em" }}>
          © 2026 MessPro. Developed by Dip.
        </div>
      </div>
    </div>
  );
}

// ── SHELL / LAYOUT ────────────────────────────────────────────────────────────
function Shell({ children, tabs, activeTab, onTab }) {
  const { user, logout, getStudent } = useApp();
  const isAdmin = user?.role === "admin";
  const me      = !isAdmin ? getStudent(user?.id) : null;
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  return (
    <div style={{ minHeight:"100vh", background:"#f1f5f9", fontFamily:"inherit", display:"flex", flexDirection:"column" }}>
      <div style={{ background:"linear-gradient(90deg, #0f172a 0%, #1e3a8a 100%)", color:"#fff", padding:"0 20px", height:64, display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:50, boxShadow:"0 4px 20px rgba(0,0,0,.15)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, minWidth:0 }}>
          <span style={{ fontSize:24, flexShrink:0 }}>🍽️</span>
          <span style={{ fontWeight:800, fontSize:20, letterSpacing:"-0.5px" }} className="text-truncate">MessPro</span>
          <div className="st-hide-mobile" style={{ marginLeft: 8, flexShrink:0 }}><Badge text={isAdmin ? "Administrator" : "Student"} color={isAdmin ? "amber" : "blue"} /></div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:16, flexShrink:0 }}>
          {me && <span className="st-hide-mobile" style={{ color:"#e0e7ff", fontSize:14, fontWeight:700 }}>{me.name}</span>}
          <button onClick={() => setShowLogoutModal(true)} style={{ background:"rgba(255,255,255,.1)", border:"1px solid rgba(255,255,255,.15)", color:"#fff", borderRadius:10, padding:"8px 16px", fontSize:13, fontWeight:700, cursor:"pointer", transition: "all 0.2s" }} onMouseEnter={e => e.currentTarget.style.background="rgba(255,255,255,.2)"} onMouseLeave={e => e.currentTarget.style.background="rgba(255,255,255,.1)"}>Logout</button>
        </div>
      </div>

      <div style={{ background:"#fff", borderBottom:"1px solid #e2e8f0", position:"sticky", top:64, zIndex:40, boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}>
        <div className="st-tabs-scroll" style={{ display:"flex", padding:"0 20px", overflowX:"auto", WebkitOverflowScrolling:"touch" }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => onTab(t.id)} style={{ background:"none", border:"none", cursor:"pointer", padding:"16px 16px", fontSize:14, fontWeight:700, whiteSpace:"nowrap", color: activeTab===t.id ? "#1d4ed8" : "#64748b", borderBottom: activeTab===t.id ? "3px solid #1d4ed8" : "3px solid transparent", transition:"color .2s" }}>{t.label}</button>
          ))}
        </div>
      </div>

      <div className="st-shell-pad" style={{ flex: 1, maxWidth:1000, margin:"0 auto", padding:"32px 24px", width: "100%", boxSizing:"border-box" }}>{children}</div>
      <div style={{ textAlign: "center", padding: "24px", color: "#94a3b8", fontSize: 13, fontWeight: 700, marginTop: "auto" }}>© 2026 MessPro. Developed by Dip.</div>

      {showLogoutModal && (
        <Modal title="Confirm Logout" onClose={() => setShowLogoutModal(false)}>
          <div style={{ fontSize:15, color:"#475569", marginBottom:24, lineHeight:1.6, fontWeight:500 }}>Are you sure you want to log out of your account?</div>
          <div className="st-form-row" style={{ display:"flex", gap:12 }}>
            <Btn full color="danger" onClick={() => { setShowLogoutModal(false); logout(); }}>Yes, Logout</Btn>
            <Btn full color="ghost" onClick={() => setShowLogoutModal(false)}>Cancel</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── ADMIN TABS ─────────────────────────────────────────────────────────────────
const ADMIN_TABS = [
  { id:"dash",     label:"📊 Dashboard"    },
  { id:"register", label:"📝 Registration" },
  { id:"students", label:"👥 Students"     },
  { id:"billing",  label:"💳 Billing"      },
  { id:"ledger",   label:"📒 Ledger"       },
  { id:"notice",   label:"📢 Notice"       },
];

function AdminDash() {
  const { students, expenses, totalDues, walletPool, getWallet, getExpenses } = useApp();

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:24 }}>
      <div>
        <div className="st-title" style={{ fontSize:28, fontWeight:800, color:"#0f172a", letterSpacing:"-0.5px" }}>System Overview</div>
        <div style={{ fontSize:14, color:"#64748b", marginTop:4 }}>Live analytics across all students</div>
      </div>
      <div className="st-stats" style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(250px,1fr))", gap:20 }}>
        <StatCard icon="👥" label="Total Students"    value={students.length}          sub="Registered accounts" />
        <StatCard icon="⚠️" label="Outstanding Dues"  value={rupee(totalDues)}         sub={`${expenses.filter(e=>!e.isPaid).length} unpaid bills`} valueColor="#dc2626" />
        <StatCard icon="💰" label="Total Wallet Pool" value={rupee(walletPool)}        sub="Combined balances"   valueColor="#059669" />
      </div>
      
      <div>
        <div style={{ paddingBottom:16, fontWeight:800, color:"#0f172a", fontSize:18, display:"flex", alignItems:"center", gap:8 }}>Student Summary</div>
        {students.length === 0 && <Card style={{ padding:"60px 20px", textAlign:"center", color:"#94a3b8", fontSize:14 }}>No students yet.</Card>}
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {students.map((s) => {
            const w    = getWallet(s.id);
            const dues = getExpenses(s.id).filter(e=>!e.isPaid).reduce((t,e)=>t+e.amount,0);
            return (
              <ShadedRow key={s.id} className="st-row" style={{ display:"flex", alignItems:"center", gap:16, padding:"16px 24px" }}>
                <div className="st-row-header" style={{ flex:1, minWidth:0, display:"flex", alignItems:"center", gap:16 }}>
                  <Av name={s.name} size={48} />
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:800, fontSize:17, color:"#1e293b", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{s.name}</div>
                    <div style={{ fontSize:13, color:"#64748b", marginTop: 4, fontWeight:600 }}>{s.phone}</div>
                  </div>
                </div>
                <div className="st-row-actions-left" style={{ display:"flex", alignItems:"center", gap:24, flexShrink:0 }}>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize:11, fontWeight:800, textTransform:"uppercase", color:"#94a3b8", letterSpacing:"0.05em", marginBottom:4 }}>Balance</div>
                    <div style={{ fontWeight:800, fontSize:16, color:"#059669" }}>{rupee(w?.balance??0)}</div>
                  </div>
                  <div style={{ textAlign:"right", minWidth: 60 }}>
                    <div style={{ fontSize:11, fontWeight:800, textTransform:"uppercase", color:"#94a3b8", letterSpacing:"0.05em", marginBottom:4 }}>Dues</div>
                    <div style={{ fontWeight:800, fontSize:16, color: dues>0?"#dc2626":"#94a3b8" }}>{rupee(dues)}</div>
                  </div>
                </div>
              </ShadedRow>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function AdminRegister() {
  const { registerStudent } = useApp();
  const blank = { name:"", phone:"", password:"", confirm:"", email:"", address:"" };
  const [f, setF]   = useState(blank);
  const [err, setErr]     = useState("");
  const [done, setDone]   = useState(null);

  function set(k) { return e => setF(prev => ({ ...prev, [k]: e.target.value })); }

  async function submit() {
    setErr("");
    if (!f.name.trim())  return setErr("Full name is required.");
    if (!/^\d{10}$/.test(f.phone.trim())) return setErr("Phone must be exactly 10 digits.");
    if (f.password.length < 4) return setErr("Password must be at least 4 characters.");
    if (f.password !== f.confirm) return setErr("Passwords do not match.");
    const e = await registerStudent({ name:f.name.trim(), phone:f.phone.trim(), password:f.password, email:f.email.trim(), address:f.address.trim() });
    if (e) return setErr(e);
    setDone({ name:f.name.trim(), phone:f.phone.trim() });
    setF(blank);
  }

  if (done) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
      <div style={{ width:"100%", maxWidth:480 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
           <div className="st-title" style={{ fontSize:28, fontWeight:800, color:"#0f172a", letterSpacing:"-0.5px" }}>Register New Student</div>
        </div>
        <Card className="st-pd" style={{ padding:32 }}>
          <div style={{ background:"#f0fdf4", border:"1px solid #bbf7d0", borderRadius:16, padding:20, marginBottom:24 }}>
            <div style={{ fontWeight:800, fontSize:18, color:"#166534", marginBottom:8, display:"flex", alignItems:"center", gap:8 }}>✅ Registration Complete</div>
            <div style={{ fontSize:14, color:"#15803d", lineHeight:1.6, fontWeight: 500 }}><strong>{done.name}</strong> was added to the database.</div>
          </div>
          <Btn full onClick={() => setDone(null)}>Register Another Student</Btn>
        </Card>
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
      <div style={{ width: "100%", maxWidth:480 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
           <div className="st-title" style={{ fontSize:28, fontWeight:800, color:"#0f172a", letterSpacing:"-0.5px" }}>Register New Student</div>
        </div>
        <Card className="st-pd" style={{ padding:32 }}>
          <div style={{ display:"flex", flexDirection:"column", gap:20, width: "100%" }}>
            <Field label="Full Name *"    value={f.name}    onChange={set("name")}    placeholder="e.g. Anika Patel" />
            <Field label="Phone Number *" value={f.phone}   onChange={set("phone")}   placeholder="10-digit number" />
            <Field label="Password *"         type="password" value={f.password} onChange={set("password")} placeholder="Min 4 chars" />
            <Field label="Confirm Password *" type="password" value={f.confirm}  onChange={set("confirm")}  placeholder="Re-enter password" />
            <Field label="Email Address" type="email" value={f.email}   onChange={set("email")}   placeholder="student@email.com" />
            <Field label="Room / Address" value={f.address} onChange={set("address")} placeholder="Room no., Block" />
            
            {err && <Alert msg={err} ok={false} />}
            
            <div className="st-form-row" style={{ display:"flex", gap:12, marginTop:12 }}>
              <div style={{ flex:2 }}><Btn full onClick={submit}>Create Account</Btn></div>
              <div style={{ flex:1 }}><Btn full color="ghost" onClick={() => { setF(blank); setErr(""); }}>Clear</Btn></div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function AdminStudents() {
  const { students, editStudent, deleteStudent, showToast, getDisplayId } = useApp();
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [ef, setEf] = useState({});

  function openEdit(s) { setEf({ name:s.name, phone:s.phone, password:"", email:s.email||"", address:s.address||"" }); setEditing(s); }
  
  async function saveEdit() {
    if (!ef.name.trim() || !ef.phone.trim()) return showToast("Name and Phone are required.", false);
    const patch = { name:ef.name, phone:ef.phone, email:ef.email, address:ef.address };
    if (ef.password) patch.password = ef.password;
    
    const err = await editStudent(editing.id, patch);
    if (err) return showToast(err, false);
    
    showToast("Student updated successfully.", true);
    setEditing(null);
  }
  
  async function confirmDel() {
    await deleteStudent(deleting.id);
    showToast("Student deleted permanently.", true);
    setDeleting(null);
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      <div className="st-title" style={{ fontSize:28, fontWeight:800, color:"#0f172a", letterSpacing:"-0.5px" }}>Manage Students</div>
      
      {students.length === 0 ? (
        <Card style={{ padding:"60px 20px", textAlign:"center", color:"#94a3b8", fontSize:14 }}>No students registered.</Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {students.map((s) => (
            <ShadedRow key={s.id} className="st-row" style={{ display:"flex", alignItems:"center", gap:16, padding:"20px 24px" }}>
              <div className="st-row-header" style={{ flex:1, minWidth:0, display:"flex", alignItems:"center", gap:16 }}>
                <Av name={s.name} size={52} />
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:800, fontSize:17, color:"#1e293b", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{s.name}</div>
                  <div style={{ fontSize:13, color:"#64748b", marginTop: 6, fontWeight:600 }} className="text-truncate">ID: {getDisplayId(s.id)} &nbsp;•&nbsp; {s.phone}</div>
                  {s.address && <div style={{ fontSize:13, color:"#64748b", marginTop: 4, fontWeight:600 }} className="text-truncate">📍 {s.address}</div>}
                </div>
              </div>
              <div className="st-row-actions" style={{ display:"flex", gap:10, flexShrink:0 }}>
                <Btn sm color="ghost" className="st-btn-full-mobile" onClick={() => openEdit(s)}>✏️ Edit</Btn>
                <Btn sm color="danger" className="st-btn-full-mobile" onClick={() => setDeleting(s)}>🗑️ Delete</Btn>
              </div>
            </ShadedRow>
          ))}
        </div>
      )}

      {editing && (
        <Modal title={`Edit — ${editing.name}`} onClose={() => setEditing(null)}>
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <Field label="Full Name *" value={ef.name} onChange={e => setEf(f=>({...f,name:e.target.value}))} />
            <Field label="Phone Number" value={ef.phone} onChange={e => setEf(f=>({...f,phone:e.target.value}))} />
            <Field label="New Password" type="password" value={ef.password} onChange={e => setEf(f=>({...f,password:e.target.value}))} />
            <Field label="Email Address" value={ef.email} onChange={e => setEf(f=>({...f,email:e.target.value}))} />
            <Field label="Room / Address" value={ef.address} onChange={e => setEf(f=>({...f,address:e.target.value}))} />
            <div className="st-form-row" style={{ display:"flex", gap:12, marginTop:12 }}>
              <div style={{ flex: 2 }}><Btn full onClick={saveEdit}>Save Changes</Btn></div>
              <div style={{ flex: 1 }}><Btn full color="ghost" onClick={() => setEditing(null)}>Cancel</Btn></div>
            </div>
          </div>
        </Modal>
      )}

      {deleting && (
        <Modal title="Confirm Deletion" onClose={() => setDeleting(null)}>
          <div style={{ fontSize:15, color:"#475569", marginBottom:24, lineHeight:1.6, fontWeight: 500 }}>Are you sure you want to delete <strong>{deleting.name}</strong>?</div>
          <div className="st-form-row" style={{ display:"flex", gap:12 }}>
            <Btn full color="danger" onClick={confirmDel}>Yes, Delete</Btn>
            <Btn full color="ghost" onClick={() => setDeleting(null)}>Cancel</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

function AdminBilling() {
  const { students, getWallet, getExpenses, loadWallet, addExpense, editExpense, deleteExpense, showToast } = useApp();
  const [wModal, setWModal] = useState(null);
  const [eModal, setEModal] = useState(false);
  
  const [edExp, setEdExp] = useState(null);
  const [edBulk, setEdBulk] = useState(false);
  const [delExp, setDelExp] = useState(null);
  const [delBulk, setDelBulk] = useState(false);

  const [wAmt, setWAmt]   = useState(""); const [wNote, setWNote] = useState("");
  const [eStd, setEStd]   = useState(""); const [eAmt, setEAmt]   = useState(""); const [eDesc, setEDesc] = useState("");

  const expenses = students.flatMap(s => getExpenses(s.id));
  const unpaidExpenses = expenses.filter(e => !e.isPaid).sort((a,b) => new Date(b.date) - new Date(a.date));

  async function doLoad() {
    if (!wAmt || Number(wAmt) <= 0) return;
    await loadWallet(wModal.id, wAmt, wNote||undefined);
    showToast(`Successfully loaded ${rupee(wAmt)} into ${wModal.name}'s wallet.`, true);
    setWModal(null); setWAmt(""); setWNote("");
  }
  
  async function doExpense() {
    if (!eStd || !eAmt || !eDesc.trim()) return;
    if (eStd === "all") {
      const allIds = students.map(s => s.id);
      await addExpense(allIds, eAmt, eDesc.trim());
    } else {
      await addExpense(eStd, eAmt, eDesc.trim());
    }
    showToast(eStd === "all" ? "Expense added for all students." : "Expense added successfully.", true);
    setEModal(false); setEStd(""); setEAmt(""); setEDesc("");
  }

  async function doEditExp() {
    if (!edExp.amount || !edExp.description.trim()) return showToast("Fields cannot be empty.", false);
    await editExpense(edExp.id, { amount: Number(edExp.amount), description: edExp.description }, edBulk);
    showToast(edBulk ? "Bulk expenses updated successfully." : "Expense updated successfully.", true);
    setEdExp(null);
  }

  async function doDelExp() {
    await deleteExpense(delExp.id, delBulk);
    showToast(delBulk ? "Bulk expenses deleted successfully." : "Expense deleted successfully.", true);
    setDelExp(null);
  }

  const getIdenticalCount = (exp) => {
    if (!exp) return 0;
    return expenses.filter(x => x.description === exp.description && x.amount === exp.amount && new Date(x.date).getTime() === new Date(exp.date).getTime() && x.id !== exp.id && !x.isPaid).length;
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:24 }}>
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:16, paddingBottom: 12 }}>
        <div className="st-title" style={{ fontSize:28, fontWeight:800, color:"#0f172a", letterSpacing:"-0.5px", textAlign:"center" }}>Wallet & Billing</div>
        <Btn color="success" onClick={() => setEModal(true)}>+ Add New Expense</Btn>
      </div>
      
      {students.length === 0 ? (
        <Card style={{ padding:"60px 20px", textAlign:"center", color:"#94a3b8", fontSize:14 }}>No students yet.</Card>
      ) : (
        <div>
          <div style={{ paddingBottom:16, textAlign: "center", fontSize:14, fontWeight:800, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.08em" }}>Student Wallets List</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {students.map((s) => {
              const w    = getWallet(s.id);
              const dues = getExpenses(s.id).filter(e=>!e.isPaid).reduce((t,e)=>t+e.amount,0);
              return (
                <ShadedRow key={s.id} className="st-row" style={{ display:"flex", alignItems:"center", gap:16, padding:"20px 24px" }}>
                  <div className="st-row-header" style={{ flex:1, minWidth:0, display:"flex", alignItems:"center", gap:16 }}>
                    <Av name={s.name} size={48} />
                    <div style={{ flex:1, minWidth:0, display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <div style={{ fontWeight:800, fontSize:17, color:"#1e293b", textAlign:"center", width:"100%", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{s.name}</div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, marginTop: 8, flexWrap: "wrap", width:"100%" }}>
                        <span style={{ fontSize: 13, color: "#64748b", fontWeight: 700 }}>Balance: <span style={{ color: "#059669", fontWeight: 800, fontSize: 14, marginLeft:4 }}>{rupee(w?.balance??0)}</span></span>
                        <span className="st-hide-mobile" style={{ color: "#e2e8f0" }}>|</span>
                        <span style={{ fontSize: 13, color: "#64748b", fontWeight: 700 }}>Dues: <span style={{ color: dues>0?"#dc2626":"#94a3b8", fontWeight: 800, fontSize: 14, marginLeft:4 }}>{rupee(dues)}</span></span>
                      </div>
                    </div>
                  </div>
                  <div className="st-row-actions" style={{ flexShrink:0 }}>
                    <Btn className="st-btn-full-mobile" onClick={() => setWModal(s)}>+ Load Funds</Btn>
                  </div>
                </ShadedRow>
              );
            })}
          </div>
        </div>
      )}

      {students.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <div style={{ paddingBottom:16, textAlign: "center", fontSize:14, fontWeight:800, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.08em" }}>Active (Unpaid) Bills</div>
          <Card style={{ padding: 0 }}>
            <div className="st-table-wrap" style={{ width: "100%", overflowX: "auto", WebkitOverflowScrolling: "touch", borderRadius: 20 }}>
              <table style={{ width:"100%", borderCollapse:"collapse", minWidth:680 }}>
                <thead>
                  <tr style={{ background:"#f8fafc", borderBottom:"2px solid #e2e8f0" }}>
                    <th style={{ padding:"16px 20px", textAlign:"left", fontSize:12, fontWeight:800, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.08em", whiteSpace:"nowrap" }}>Date</th>
                    <th style={{ padding:"16px 20px", textAlign:"left", fontSize:12, fontWeight:800, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.08em", whiteSpace:"nowrap" }}>Student</th>
                    <th style={{ padding:"16px 20px", textAlign:"left", fontSize:12, fontWeight:800, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.08em", whiteSpace:"nowrap" }}>Description</th>
                    <th style={{ padding:"16px 20px", textAlign:"right", fontSize:12, fontWeight:800, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.08em", whiteSpace:"nowrap" }}>Amount</th>
                    <th style={{ padding:"16px 20px", textAlign:"center", fontSize:12, fontWeight:800, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.08em", whiteSpace:"nowrap" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {unpaidExpenses.map((e,i) => {
                    const s = students.find(x => x.id===e.studentId);
                    return (
                      <tr key={e.id} style={{ borderBottom: i<unpaidExpenses.length-1?"1px solid #f1f5f9":"none", transition: "background 0.2s" }} onMouseEnter={ev=>ev.currentTarget.style.background="#f8fafc"} onMouseLeave={ev=>ev.currentTarget.style.background="transparent"}>
                        <td style={{ padding:"16px 20px", fontSize:13, color:"#64748b", whiteSpace:"nowrap", fontWeight:600, textAlign:"left" }}>{fdate(e.date)}</td>
                        <td style={{ padding:"16px 20px", textAlign:"left" }}>
                          <div style={{ display:"flex", alignItems:"center", gap:12 }}>{s && <Av name={s.name} size={32} />}<span style={{ fontSize:14, fontWeight:700, color:"#1e293b", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:"150px" }}>{s?.name||"Unknown"}</span></div>
                        </td>
                        <td style={{ padding:"16px 20px", fontSize:13, color:"#64748b", fontWeight:600, textAlign:"left" }}>{e.description}</td>
                        <td style={{ padding:"16px 20px", fontWeight:800, fontSize:15, color:"#dc2626", whiteSpace:"nowrap", textAlign:"right" }}>{rupee(e.amount)}</td>
                        <td style={{ padding:"16px 20px", textAlign:"center" }}>
                           <div style={{ display:"flex", gap:8, justifyContent:"center" }}>
                              <Btn sm color="ghost" onClick={() => { setEdExp({...e}); setEdBulk(false); }}>✏️</Btn>
                              <Btn sm color="danger" onClick={() => { setDelExp(e); setDelBulk(false); }}>🗑️</Btn>
                           </div>
                        </td>
                      </tr>
                    );
                  })}
                  {unpaidExpenses.length===0 && <tr><td colSpan={5} style={{ padding:"60px 20px", textAlign:"center", color:"#94a3b8", fontSize:14 }}>No unpaid bills remaining.</td></tr>}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {wModal && (
        <Modal title={`Load Wallet — ${wModal.name}`} onClose={() => setWModal(null)}>
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <Field label="Amount (₹)" type="number" value={wAmt} onChange={e => setWAmt(e.target.value)} placeholder="e.g. 500" />
            <Field label="Note (optional)" value={wNote} onChange={e => setWNote(e.target.value)} placeholder="e.g. May recharge" />
            <div className="st-form-row" style={{ display:"flex", gap:12, marginTop:12 }}>
              <div style={{ flex:2 }}><Btn full onClick={doLoad}>Confirm Load</Btn></div>
              <div style={{ flex:1 }}><Btn full color="ghost" onClick={() => setWModal(null)}>Cancel</Btn></div>
            </div>
          </div>
        </Modal>
      )}

      {eModal && (
        <Modal title="Add Mess Expense" onClose={() => setEModal(false)}>
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <Select label="Select Student *" value={eStd} onChange={e => setEStd(e.target.value)}>
              <option value="">Choose a student…</option>
              <option value="all">All Students</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
            <Field label="Amount (₹) *" type="number" value={eAmt} onChange={e => setEAmt(e.target.value)} placeholder="e.g. 320" />
            <Field label="Expense Description *" value={eDesc} onChange={e => setEDesc(e.target.value)} placeholder="e.g. June Week 1 Mess Bill" />
            <div className="st-form-row" style={{ display:"flex", gap:12, marginTop:12 }}>
              <div style={{ flex:2 }}><Btn full onClick={doExpense}>Create Expense</Btn></div>
              <div style={{ flex:1 }}><Btn full color="ghost" onClick={() => setEModal(false)}>Cancel</Btn></div>
            </div>
          </div>
        </Modal>
      )}

      {edExp && (() => {
         const count = getIdenticalCount(expenses.find(e => e.id === edExp.id));
         return (
           <Modal title="Edit Unpaid Expense" onClose={() => setEdExp(null)}>
             <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
               <Field label="Amount (₹) *" type="number" value={edExp.amount} onChange={e => setEdExp({...edExp, amount: e.target.value})} />
               <Field label="Expense Description *" value={edExp.description} onChange={e => setEdExp({...edExp, description: e.target.value})} />
               {count > 0 && (
                 <div style={{ padding: "14px 16px", background: "#eff6ff", borderRadius: 12, border: "1px solid #bfdbfe", marginTop: 8 }}>
                    <Checkbox label={`Apply changes to ${count} other identical bills for other students`} checked={edBulk} onChange={setEdBulk} />
                 </div>
               )}
               <div className="st-form-row" style={{ display:"flex", gap:12, marginTop:12 }}>
                 <div style={{ flex:2 }}><Btn full onClick={doEditExp}>Save Changes</Btn></div>
                 <div style={{ flex:1 }}><Btn full color="ghost" onClick={() => setEdExp(null)}>Cancel</Btn></div>
               </div>
             </div>
           </Modal>
         );
      })()}

      {delExp && (() => {
         const count = getIdenticalCount(delExp);
         return (
           <Modal title="Confirm Deletion" onClose={() => setDelExp(null)}>
             <div style={{ fontSize:15, color:"#475569", marginBottom:16, lineHeight:1.6, fontWeight: 500 }}>
               Are you sure you want to delete the bill <strong>"{delExp.description}"</strong> ({rupee(delExp.amount)}) for this student?
             </div>
             {count > 0 && (
               <div style={{ padding: "14px 16px", background: "#fef2f2", borderRadius: 12, border: "1px solid #fecaca", marginBottom: 20 }}>
                  <Checkbox label={`Also delete ${count} other identical bills for other students`} checked={delBulk} onChange={setDelBulk} />
               </div>
             )}
             <div className="st-form-row" style={{ display:"flex", gap:12 }}>
               <Btn full color="danger" onClick={doDelExp}>Yes, Delete</Btn>
               <Btn full color="ghost" onClick={() => setDelExp(null)}>Cancel</Btn>
             </div>
           </Modal>
         );
      })()}
    </div>
  );
}

function AdminLedger() {
  const { txns, students } = useApp();
  const sorted = [...txns].sort((a,b) => new Date(b.date)-new Date(a.date));
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      <div className="st-title" style={{ fontSize:28, fontWeight:800, color:"#0f172a", letterSpacing:"-0.5px" }}>Global Transaction Ledger</div>
      <Card style={{ padding: 0 }}>
        <div className="st-table-wrap" style={{ width: "100%", overflowX: "auto", WebkitOverflowScrolling: "touch", borderRadius: 20 }}>
          <table style={{ width:"100%", borderCollapse:"collapse", minWidth:600 }}>
            <thead>
              <tr style={{ background:"#f8fafc", borderBottom:"2px solid #e2e8f0" }}>
                <th style={{ padding:"16px 20px", textAlign:"left", fontSize:12, fontWeight:800, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.08em", whiteSpace:"nowrap" }}>Date</th>
                <th style={{ padding:"16px 20px", textAlign:"left", fontSize:12, fontWeight:800, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.08em", whiteSpace:"nowrap" }}>Student</th>
                <th style={{ padding:"16px 20px", textAlign:"center", fontSize:12, fontWeight:800, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.08em", whiteSpace:"nowrap" }}>Type</th>
                <th style={{ padding:"16px 20px", textAlign:"right", fontSize:12, fontWeight:800, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.08em", whiteSpace:"nowrap" }}>Amount</th>
                <th style={{ padding:"16px 20px", textAlign:"left", fontSize:12, fontWeight:800, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.08em", whiteSpace:"nowrap" }}>Description</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((t,i) => {
                const s = students.find(x => x.id===t.studentId);
                return (
                  <tr key={t.id} style={{ borderBottom: i<sorted.length-1?"1px solid #f1f5f9":"none", transition: "background 0.2s" }} onMouseEnter={e=>e.currentTarget.style.background="#f8fafc"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    <td style={{ padding:"16px 20px", fontSize:13, color:"#64748b", whiteSpace:"nowrap", fontWeight:600, textAlign:"left" }}>{fdate(t.date)}</td>
                    <td style={{ padding:"16px 20px", textAlign:"left" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                        {s && <Av name={s.name} size={32} />}
                        <span style={{ fontSize:14, fontWeight:700, color:"#1e293b", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:"150px" }}>{s?.name||"Unknown"}</span>
                      </div>
                    </td>
                    <td style={{ padding:"16px 20px", textAlign:"center" }}><Badge text={t.type} color={t.type==="Credit"?"green":"red"} /></td>
                    <td style={{ padding:"16px 20px", fontWeight:800, fontSize:15, color:t.type==="Credit"?"#059669":"#dc2626", whiteSpace:"nowrap", textAlign:"right" }}>{t.type==="Credit"?"+":"−"}{rupee(t.amount)}</td>
                    <td style={{ padding:"16px 20px", fontSize:13, color:"#64748b", fontWeight:600, textAlign:"left" }}>{t.description}</td>
                  </tr>
                );
              })}
              {sorted.length===0 && <tr><td colSpan={5} style={{ padding:"60px 20px", textAlign:"center", color:"#94a3b8", fontSize:14 }}>No transactions yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function AdminNotice() {
  const { notices, addNotice, removeNotice, showToast } = useApp();
  const [noticeText, setNoticeText] = useState("");

  async function handlePublish() {
    if (!noticeText.trim()) return showToast("Notice cannot be empty.", false);
    await addNotice(noticeText.trim());
    setNoticeText("");
    showToast("Notice broadcasted successfully!", true);
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:24 }}>
      <div className="st-title" style={{ fontSize:28, fontWeight:800, color:"#0f172a", letterSpacing:"-0.5px" }}>Broadcast Notice</div>
      <Card className="st-pd" style={{ padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <span style={{ fontSize: 24 }}>📢</span>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a" }}>Publish an Announcement</div>
            <div style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>This message will be visible to all students immediately upon logging in.</div>
          </div>
        </div>
        <textarea value={noticeText} onChange={e => setNoticeText(e.target.value)} placeholder="Type an announcement here..." style={{ width: "100%", padding: "14px 16px", borderRadius: "12px", border: "1px solid #cbd5e1", outline: "none", minHeight: "100px", fontFamily: "inherit", fontSize: "15px", marginBottom: "16px", resize: "vertical", transition: "border-color 0.2s", boxSizing: "border-box" }} onFocus={e => e.target.style.borderColor = "#1e3a8a"} onBlur={e => e.target.style.borderColor = "#cbd5e1"} />
        <div className="st-form-row" style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}><Btn full className="st-btn-full-mobile" onClick={handlePublish}>Publish Notice</Btn></div>
      </Card>

      <div>
        <div style={{ fontSize:18, fontWeight:800, color:"#0f172a", marginBottom: 16 }}>Active Announcements</div>
        {notices.length === 0 ? (
          <Card style={{ padding: "40px 20px", textAlign: "center", color: "#94a3b8", fontSize: 14 }}>No active notices.</Card>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {notices.map((n) => (
              <ShadedRow key={n.id} className="st-row" style={{ padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, color: "#1e293b", fontWeight: 700, lineHeight: 1.5, wordWrap: "break-word" }}>{n.text}</div>
                  <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 6, fontWeight: 600 }}>Published on {new Date(n.date).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</div>
                </div>
                <div className="st-row-actions" style={{ flexShrink: 0 }}>
                  <Btn color="danger" sm className="st-btn-full-mobile" onClick={() => removeNotice(n.id)}>🗑️ Delete</Btn>
                </div>
              </ShadedRow>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── STUDENT TABS ───────────────────────────────────────────────────────────────
const STU_TABS = [
  { id:"wallet",  label:"💰 Wallet"  },
  { id:"bills",   label:"🧾 Bills"   },
  { id:"history", label:"📒 History" },
  { id:"profile", label:"👤 Profile" },
];

function StuWallet({ id }) {
  const { getWallet, getExpenses, notices, dismissedNotices, dismissNotice } = useApp();
  const w    = getWallet(id);
  const exps = getExpenses(id);
  const dues = exps.filter(e=>!e.isPaid).reduce((s,e)=>s+e.amount,0);
  const paid = exps.filter(e=>e.isPaid).reduce((s,e)=>s+e.amount,0);
  const bal  = w?.balance ?? 0;
  const total= bal+dues;
  const pct  = total>0 ? Math.round(bal/total*100) : 0;
  
  const activeNotices = notices.filter(n => !dismissedNotices.includes(n.id));

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:24 }}>
      {activeNotices.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {activeNotices.map((n) => (
            <div key={n.id} className="st-notice-box" style={{ background: "linear-gradient(to right, #eff6ff, #f8fafc)", border: "1px solid #bfdbfe", borderLeft: "4px solid #3b82f6", padding: "16px 40px 16px 20px", borderRadius: "12px", display: "flex", alignItems: "center", gap: "16px", boxShadow: "0 4px 12px rgba(59, 130, 246, 0.05)", position: "relative" }}>
              <span style={{fontSize:"24px", flexShrink:0}}>📢</span>
              <div style={{ minWidth: 0, width: "100%" }}>
                <div style={{fontSize:"11px", fontWeight:"800", color:"#3b82f6", textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:"4px"}}>Important Announcement</div>
                <div style={{fontSize:"15px", color:"#1e3a8a", fontWeight:"600", lineHeight:"1.5", wordWrap:"break-word"}}>{n.text}</div>
              </div>
              <button onClick={() => dismissNotice(n.id)} style={{ position:"absolute", right:16, top:16, background:"transparent", border:"none", fontSize:20, color:"#94a3b8", cursor:"pointer", padding:4, lineHeight:1, transition: "color 0.2s" }} onMouseEnter={e => e.currentTarget.style.color = "#475569"} onMouseLeave={e => e.currentTarget.style.color = "#94a3b8"}>✕</button>
            </div>
          ))}
        </div>
      )}

      <div className="st-title" style={{ fontSize:28, fontWeight:800, color:"#0f172a", letterSpacing:"-0.5px" }}>My Wallet</div>
      <div className="st-stats" style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:20 }}>
        <StatCard icon="💰" label="Balance"    value={rupee(bal)}  sub="Available funds" valueColor="#059669" />
        <StatCard icon="⚠️" label="Open Dues"  value={rupee(dues)} sub={`${exps.filter(e=>!e.isPaid).length} unpaid bills`} valueColor="#dc2626" />
        <StatCard icon="✅" label="Total Paid" value={rupee(paid)} sub={`${exps.filter(e=>e.isPaid).length} settled bills`} />
      </div>
      <Card className="st-pd" style={{ padding:32 }}>
        <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, fontWeight:800, color:"#64748b", marginBottom:16, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          <span>Wallet Coverage</span><span>{pct}% funded</span>
        </div>
        <div style={{ height:16, borderRadius:99, background:"#f1f5f9", overflow:"hidden", boxShadow: "inset 0 2px 4px rgba(0,0,0,0.05)" }}>
          <div style={{ height:"100%", width:`${pct}%`, background:"linear-gradient(90deg, #1d4ed8, #10b981)", borderRadius:99, transition:"width .8s cubic-bezier(0.4, 0, 0.2, 1)" }} />
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", marginTop:20 }}>
          <span style={{ fontSize:15, color:"#059669", fontWeight:800 }}>{rupee(bal)} balance</span>
          <span style={{ fontSize:15, color:"#dc2626", fontWeight:800 }}>{rupee(dues)} dues</span>
        </div>
      </Card>
    </div>
  );
}

function StuBills({ id }) {
  const { getExpenses, getWallet, payExpense, showToast } = useApp();
  const exps = [...getExpenses(id)].sort((a,b)=>new Date(b.date)-new Date(a.date));
  const w    = getWallet(id);

  async function pay(e) {
    const err = await payExpense(e.id);
    if(err) showToast(err, false);
    else showToast(`Successfully paid ${rupee(e.amount)} for "${e.description}"`, true);
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      <div className="st-title" style={{ fontSize:28, fontWeight:800, color:"#0f172a", letterSpacing:"-0.5px" }}>My Mess Bills</div>
      
      {exps.length===0 ? (
        <Card style={{ padding:"60px 20px", textAlign:"center", color:"#94a3b8", fontSize:14 }}>No bills assigned yet.</Card>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {exps.map((e) => (
            <ShadedRow key={e.id} className="st-row" style={{ display:"flex", alignItems:"center", gap:16, padding:"20px 24px" }}>
              <div className="st-row-header" style={{ flex:1, minWidth:0, display:"flex", alignItems:"center", gap:16 }}>
                <div style={{ width:12, height:12, borderRadius:"50%", background:e.isPaid?"#10b981":"#ef4444", flexShrink:0, boxShadow: e.isPaid?"0 0 0 4px #d1fae5":"0 0 0 4px #fee2e2" }} />
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:800, fontSize:17, color:"#1e293b", wordWrap: "break-word" }}>{e.description}</div>
                  <div style={{ fontSize:13, color:"#64748b", marginTop: 6, fontWeight:600 }}>{fdate(e.date)}</div>
                  {!e.isPaid && w?.balance < e.amount && <div style={{ fontSize:12, color:"#ef4444", fontWeight:700, marginTop:6 }}>⚠️ Insufficient balance to pay</div>}
                </div>
              </div>
              <div className="st-row-actions-left" style={{ display:"flex", alignItems:"center", gap:24, flexShrink:0 }}>
                <span style={{ fontWeight:800, fontSize:18, color:"#0f172a" }}>{rupee(e.amount)}</span>
                {e.isPaid ? <Badge text="Paid in Full" color="green" /> : <Btn className="st-btn-full-mobile" onClick={() => pay(e)} disabled={!w||w.balance<e.amount}>Pay Now</Btn>}
              </div>
            </ShadedRow>
          ))}
        </div>
      )}
    </div>
  );
}

function StuHistory({ id }) {
  const { getTxns } = useApp();
  const txns = [...getTxns(id)].sort((a,b)=>new Date(b.date)-new Date(a.date));
  const totalIn  = txns.filter(t=>t.type==="Credit").reduce((s,t)=>s+t.amount,0);
  const totalOut = txns.filter(t=>t.type==="Debit").reduce((s,t)=>s+t.amount,0);
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      <div className="st-title" style={{ fontSize:28, fontWeight:800, color:"#0f172a", letterSpacing:"-0.5px" }}>Transaction History</div>
      <div className="st-stats" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
        <StatCard icon="⬆️" label="Total Credits" value={rupee(totalIn)}  valueColor="#059669" />
        <StatCard icon="⬇️" label="Total Debits"  value={rupee(totalOut)} valueColor="#dc2626" />
      </div>
      
      {txns.length===0 ? (
        <Card style={{ padding:"60px 20px", textAlign:"center", color:"#94a3b8", fontSize:14 }}>No transactions yet.</Card>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {txns.map((t) => (
            <ShadedRow key={t.id} className="st-row" style={{ display:"flex", alignItems:"center", gap:16, padding:"20px 24px" }}>
              <div className="st-row-header" style={{ flex:1, minWidth:0, display:"flex", alignItems:"center", gap:16 }}>
                <div style={{ width:48, height:48, borderRadius:14, flexShrink:0, background:t.type==="Credit"?"#f0fdf4":"#fef2f2", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, boxShadow: t.type==="Credit"?"inset 0 -2px 0 #bbf7d0":"inset 0 -2px 0 #fecaca" }}>{t.type==="Credit"?"⬆️":"⬇️"}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:800, fontSize:16, color:"#1e293b", wordWrap: "break-word" }}>{t.description}</div>
                  <div style={{ fontSize:13, color:"#64748b", marginTop: 6, fontWeight: 600 }}>{fdate(t.date)}</div>
                </div>
              </div>
              <div className="st-row-actions-left" style={{ textAlign:"right", flexShrink:0 }}>
                <div style={{ fontWeight:800, fontSize:17, color:t.type==="Credit"?"#059669":"#dc2626", marginBottom: 6 }}>{t.type==="Credit"?"+":"−"}{rupee(t.amount)}</div>
                <Badge text={t.type} color={t.type==="Credit"?"green":"red"} />
              </div>
            </ShadedRow>
          ))}
        </div>
      )}
    </div>
  );
}

function StuProfile({ id }) {
  const { getStudent, updateProfile, showToast, getDisplayId } = useApp();
  const me = getStudent(id);
  const [f, setF] = useState({ phone:me?.phone||"", email:me?.email||"", password:"" });

  async function save() {
    if (!f.phone.trim()) return showToast("Phone number is required.", false);
    const patch = { phone: f.phone, email: f.email };
    if (f.password) patch.password = f.password;
    const err = await updateProfile(id, patch);
    if (err) return showToast(err, false);
    showToast("Profile updated successfully.", true);
    setF(p => ({...p, password:""}));
  }

  if (!me) return null;
  return (
    <div style={{ maxWidth:540, margin:"0 auto" }}>
      <div className="st-title" style={{ fontSize:28, fontWeight:800, color:"#0f172a", marginBottom:24, letterSpacing:"-0.5px", textAlign:"center" }}>My Profile</div>
      <Card className="st-pd" style={{ padding:32 }}>
        <div className="st-row-header" style={{ display:"flex", alignItems:"center", gap:20, paddingBottom:24, marginBottom:24, borderBottom:"1px solid #f1f5f9" }}>
          <Av name={me.name} size={72} />
          <div style={{minWidth:0}}>
            <div style={{ fontWeight:800, fontSize:22, color:"#0f172a", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{me.name}</div>
            <div style={{ fontSize:13, fontWeight:700, color:"#64748b", marginTop:6, textTransform: "uppercase", letterSpacing: "0.08em" }}>Student ID: {getDisplayId(me.id)}</div>
          </div>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:20, width: "100%" }}>
          <Field label="Full Name" value={me.name} readOnly hint="⚠️ Name modification is restricted." />
          <Field label="Room / Address" value={me.address || "Not Provided"} readOnly hint="⚠️ Contact Admin to change your address." />
          <div style={{ borderTop: "1px solid #f1f5f9", margin: "8px 0" }}></div>
          <Field label="Phone Number (Login ID)" value={f.phone} onChange={e => setF(p=>({...p,phone:e.target.value}))} />
          <Field label="Email Address" value={f.email} onChange={e => setF(p=>({...p,email:e.target.value}))} placeholder="your@email.com" />
          <Field label="New Password" type="password" value={f.password} onChange={e => setF(p=>({...p,password:e.target.value}))} placeholder="Leave blank to keep current password" />
          <div style={{ marginTop: 12 }}><Btn full onClick={save}>Save Changes</Btn></div>
        </div>
      </Card>
    </div>
  );
}

// ── APP ROOTS ─────────────────────────────────────────────────────────────────
function AdminApp() {
  const [tab, setTab] = useState("dash");
  return (
    <Shell tabs={ADMIN_TABS} activeTab={tab} onTab={setTab}>
      {tab==="dash"     && <AdminDash />}
      {tab==="register" && <AdminRegister />}
      {tab==="students" && <AdminStudents />}
      {tab==="billing"  && <AdminBilling />}
      {tab==="ledger"   && <AdminLedger />}
      {tab==="notice"   && <AdminNotice />}
    </Shell>
  );
}

function StudentApp() {
  const { user } = useApp();
  const [tab, setTab] = useState("wallet");
  return (
    <Shell tabs={STU_TABS} activeTab={tab} onTab={setTab}>
      {tab==="wallet"  && <StuWallet  id={user.id} />}
      {tab==="bills"   && <StuBills   id={user.id} />}
      {tab==="history" && <StuHistory id={user.id} />}
      {tab==="profile" && <StuProfile id={user.id} />}
    </Shell>
  );
}

function App() {
  const { user, loading } = useApp();
  
  if (loading) {
    return (
      <div style={{ minHeight:"100vh", background:"linear-gradient(135deg, #020617 0%, #0f172a 40%, #1e3a8a 100%)", display:"flex", flexDirection: "column", alignItems:"center", justifyContent:"center" }}>
        <div style={{ width: 50, height: 50, border: "4px solid rgba(255,255,255,0.1)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
        <div style={{ color: "#fff", marginTop: 24, fontSize: 16, fontWeight: 600 }}>Connecting to Database...</div>
      </div>
    );
  }
  
  if (!user) return <LoginPage />;
  return user.role==="admin" ? <AdminApp /> : <StudentApp />;
}

export default function Root() {
  return (
    <AppProvider>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        
        * { box-sizing:border-box; font-family:'DM Sans',sans-serif; }
        
        html, body { margin:0; padding:0; background:#f8fafc; width:100%; min-height:100vh; }
        
        #root { width: 100% !important; max-width: none !important; margin: 0 !important; padding: 0 !important; }
        
        ::-webkit-scrollbar { width:6px; height:6px; }
        ::-webkit-scrollbar-thumb { background:#cbd5e1; border-radius:99px; }
        
        input:focus, select:focus { outline:none; }
        input[type=number]::-webkit-inner-spin-button { opacity:.3; }

        .text-truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

        .st-table-wrap::-webkit-scrollbar { height: 8px; }
        .st-table-wrap::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        .st-table-wrap::-webkit-scrollbar-thumb:hover { background: #94a3b8; }

        @keyframes toastSlideFade {
          0% { opacity: 0; transform: translate(-50%, -20px) scale(0.9); }
          12% { opacity: 1; transform: translate(-50%, 0) scale(1); }
          88% { opacity: 1; transform: translate(-50%, 0) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -20px) scale(0.9); }
        }

        @media (max-width: 640px) {
          .st-shell-pad { padding: 20px 16px !important; }
          .st-hide-mobile { display: none !important; }
          .st-title { font-size: 24px !important; letter-spacing: -0.5px !important; }
          .st-pd { padding: 20px 16px !important; }
          .st-stats { grid-template-columns: 1fr !important; }
          
          .st-row { flex-direction: column !important; align-items: flex-start !important; gap: 16px !important; padding: 20px 16px !important; }
          .st-row-header { width: 100% !important; display: flex !important; align-items: flex-start !important; gap: 14px !important; }
          .st-row-actions { width: 100% !important; display: flex !important; justify-content: flex-end !important; margin-top: 4px !important; flex-wrap: wrap; gap: 8px; }
          .st-row-actions-left { width: 100% !important; display: flex !important; justify-content: space-between !important; align-items: center !important; margin-top: 4px !important; }
          
          .st-btn-full-mobile { width: 100% !important; justify-content: center !important; flex: 1; }
          .st-form-row { flex-direction: column !important; gap: 12px !important; }
          .st-wrap { flex-wrap: wrap !important; }
          
          .st-notice-box { flex-direction: column; align-items: flex-start !important; padding: 20px 16px 20px 16px !important; }
          .st-notice-box button { right: 8px !important; top: 8px !important; }
          .st-tabs-scroll::-webkit-scrollbar { display: none; }
        }
      `}</style>
      <App />
    </AppProvider>
  );
}