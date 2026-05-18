import { useState, useEffect, useCallback } from 'react'
import Head from 'next/head'
import { supabase } from '../lib/supabase'

// ── CONSTANTS ─────────────────────────────────────────────────
const ROLES = {
  productor:       { label:'Productor',       color:'#c8f135', canEdit:true,  canShare:true,  canManage:true  },
  agencia:         { label:'Agencia',         color:'#60a5fa', canEdit:true,  canShare:true,  canManage:false },
  marca:           { label:'Marca',           color:'#e879f9', canEdit:false, canShare:false, canManage:false },
  casa_productora: { label:'Casa Productora', color:'#4ade80', canEdit:false, canShare:false, canManage:false },
}

const AREAS = [
  { key:'edit',   label:'Edición',            color:'#a78bfa', placeholder:'Ajustes de corte, ritmo, narrativa...' },
  { key:'color',  label:'Color',              color:'#f472b6', placeholder:'Exposición, contraste, grading...' },
  { key:'audio',  label:'Audio',              color:'#34d399', placeholder:'Música, efectos, mezcla...' },
  { key:'online', label:'Online / Gráficos',  color:'#fbbf24', placeholder:'UI bubbles, end cards, logos...' },
  { key:'vfx',    label:'VFX',               color:'#f97316', placeholder:'Efectos visuales, compositing...' },
]

const APPROVAL_ROLES = [
  { key:'meta',  label:'Meta',  color:'#e879f9', states:['idle','review','adjust','approved'], icons:{idle:'MT',review:'…',adjust:'!',approved:'✓'}, labels:{idle:'Sin revisar',review:'En revisión',adjust:'Ajustes',approved:'Aprobado'} },
  { key:'gut',   label:'Gut',   color:'#60a5fa', states:['idle','review','adjust','approved'], icons:{idle:'GT',review:'…',adjust:'!',approved:'✓'}, labels:{idle:'Sin revisar',review:'En revisión',adjust:'Ajustes',approved:'Aprobado'} },
  { key:'primo', label:'Primo', color:'#4ade80', states:['idle','received','wip','delivered'],  icons:{idle:'PR',received:'↓',wip:'⚙',delivered:'✓'}, labels:{idle:'Sin recibir',received:'Recibido',wip:'En proceso',delivered:'Entregados'} },
]

const SOURCE_OPTIONS = [
  { key:'meta',  label:'Meta',  color:'#e879f9' },
  { key:'gut',   label:'Gut',   color:'#60a5fa' },
  { key:'primo', label:'Primo', color:'#4ade80' },
]

const STATUS_COLORS = { pendiente:'#60a5fa', cambios:'#fb923c', aprobado:'#4ade80' }
const STATUS_LABELS = { pendiente:'En revisión', cambios:'Con ajustes', aprobado:'Aprobado' }

// ── CSS ───────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:wght@300;400;500;600;700&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  :root{
    --bg:#0a0a0a;--surface:#141414;--surface2:#1a1a1a;--surface3:#202020;
    --border:#252525;--border2:#303030;
    --accent:#c8f135;--accent-dim:rgba(200,241,53,0.1);
    --text:#eaeaea;--muted:#4a4a4a;--mid:#777;
  }
  body{font-family:'DM Sans',sans-serif;background:var(--bg);color:var(--text);min-height:100vh}
  input,textarea,select,button{font-family:inherit}
  textarea{resize:vertical}
  button{cursor:pointer}

  /* ── AUTH ── */
  .auth-wrap{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}
  .auth-box{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:44px 40px;width:380px}
  .auth-logo{font-size:10px;font-family:'DM Mono',monospace;color:var(--accent);letter-spacing:.18em;text-transform:uppercase;margin-bottom:8px}
  .auth-title{font-size:22px;font-weight:700;letter-spacing:-.03em;margin-bottom:6px}
  .auth-sub{font-size:13px;color:var(--mid);margin-bottom:28px}
  .auth-label{font-size:10px;font-family:'DM Mono',monospace;color:var(--muted);text-transform:uppercase;letter-spacing:.1em;display:block;margin-bottom:6px}
  .auth-input{width:100%;background:var(--surface2);border:1px solid var(--border2);border-radius:8px;padding:11px 14px;color:var(--text);font-size:14px;margin-bottom:14px;transition:border-color .15s}
  .auth-input:focus{outline:none;border-color:var(--accent)}
  .auth-btn{width:100%;background:var(--accent);color:#000;border:none;padding:12px;border-radius:8px;font-size:14px;font-weight:700;margin-top:4px}
  .auth-btn:hover{opacity:.9}
  .auth-error{font-size:12px;color:#f87171;margin-top:10px;text-align:center}
  .auth-toggle{font-size:12px;color:var(--mid);text-align:center;margin-top:16px}
  .auth-toggle button{background:none;border:none;color:var(--accent);font-size:12px;text-decoration:underline;padding:0}

  /* ── APP SHELL ── */
  .shell{display:flex;min-height:100vh}
  .sidebar{width:220px;background:var(--surface);border-right:1px solid var(--border);display:flex;flex-direction:column;flex-shrink:0;position:fixed;top:0;left:0;height:100vh;z-index:10}
  .sidebar-logo{padding:20px 18px;border-bottom:1px solid var(--border)}
  .sidebar-logo-tag{font-size:9px;font-family:'DM Mono',monospace;color:var(--accent);letter-spacing:.15em;text-transform:uppercase}
  .sidebar-logo-name{font-size:15px;font-weight:700;letter-spacing:-.02em;margin-top:2px}
  .sidebar-nav{flex:1;padding:12px 8px;overflow-y:auto}
  .sidebar-section{font-size:9px;font-family:'DM Mono',monospace;color:var(--muted);text-transform:uppercase;letter-spacing:.12em;padding:8px 10px 6px}
  .nav-item{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:6px;font-size:13px;color:var(--mid);cursor:pointer;transition:all .15s;border:none;background:none;width:100%;text-align:left}
  .nav-item:hover{background:var(--surface2);color:var(--text)}
  .nav-item.active{background:var(--accent-dim);color:var(--accent)}
  .nav-item-dot{width:6px;height:6px;border-radius:50%;flex-shrink:0}
  .sidebar-user{padding:14px 18px;border-top:1px solid var(--border)}
  .sidebar-user-name{font-size:13px;font-weight:500}
  .sidebar-user-role{font-size:10px;font-family:'DM Mono',monospace;margin-top:2px}
  .sidebar-user-out{background:none;border:none;font-size:11px;color:var(--muted);margin-top:8px;padding:0;display:block}
  .sidebar-user-out:hover{color:var(--text)}

  .main{margin-left:220px;flex:1;min-height:100vh}
  .topbar{display:flex;align-items:center;justify-content:space-between;padding:16px 28px;border-bottom:1px solid var(--border);background:var(--surface);position:sticky;top:0;z-index:5}
  .topbar-title{font-size:16px;font-weight:600;letter-spacing:-.02em}
  .topbar-meta{display:flex;align-items:center;gap:10px}
  .page{padding:28px}

  /* ── DASHBOARD ── */
  .dash-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;margin-top:4px}
  .proj-card{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:20px;cursor:pointer;transition:all .2s}
  .proj-card:hover{border-color:var(--border2);transform:translateY(-1px)}
  .proj-card-tag{font-size:9px;font-family:'DM Mono',monospace;color:var(--accent);letter-spacing:.12em;text-transform:uppercase;margin-bottom:8px}
  .proj-card-name{font-size:16px;font-weight:600;letter-spacing:-.02em;margin-bottom:4px}
  .proj-card-client{font-size:12px;color:var(--mid);margin-bottom:16px}
  .proj-card-stats{display:flex;gap:8px}
  .proj-stat{font-size:10px;font-family:'DM Mono',monospace;padding:3px 8px;border-radius:10px;border:1px solid}
  .new-proj-card{background:transparent;border:1px dashed var(--border2);border-radius:10px;padding:20px;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;min-height:140px;transition:all .2s;color:var(--muted)}
  .new-proj-card:hover{border-color:var(--accent);color:var(--accent)}
  .new-proj-icon{font-size:24px}
  .new-proj-label{font-size:12px;font-family:'DM Mono',monospace;letter-spacing:.08em;text-transform:uppercase}

  /* ── MODALS ── */
  .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.7);display:flex;align-items:center;justify-content:center;z-index:100;padding:20px}
  .modal{background:var(--surface);border:1px solid var(--border2);border-radius:12px;padding:28px;width:100%;max-width:480px;max-height:90vh;overflow-y:auto}
  .modal-title{font-size:16px;font-weight:600;letter-spacing:-.02em;margin-bottom:20px}
  .modal-label{font-size:10px;font-family:'DM Mono',monospace;color:var(--muted);text-transform:uppercase;letter-spacing:.1em;display:block;margin-bottom:6px;margin-top:14px}
  .modal-input{width:100%;background:var(--surface2);border:1px solid var(--border2);border-radius:6px;padding:9px 12px;color:var(--text);font-size:13px}
  .modal-input:focus{outline:none;border-color:var(--accent)}
  .modal-select{width:100%;background:var(--surface2);border:1px solid var(--border2);border-radius:6px;padding:9px 12px;color:var(--text);font-size:13px}
  .modal-select option{background:var(--surface2)}
  .modal-btns{display:flex;gap:8px;margin-top:20px}
  .modal-btn-primary{flex:1;background:var(--accent);color:#000;border:none;padding:10px;border-radius:6px;font-size:13px;font-weight:700}
  .modal-btn-primary:hover{opacity:.9}
  .modal-btn-cancel{flex:1;background:transparent;color:var(--mid);border:1px solid var(--border2);padding:10px;border-radius:6px;font-size:13px}
  .modal-btn-cancel:hover{border-color:#555;color:var(--text)}

  /* ── PROJECT VIEW ── */
  .proj-header{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:20px;gap:16px}
  .proj-header-left h1{font-size:20px;font-weight:700;letter-spacing:-.03em}
  .proj-header-left p{font-size:13px;color:var(--mid);margin-top:3px}
  .proj-header-right{display:flex;align-items:center;gap:8px;flex-shrink:0}

  .summary-row{display:flex;gap:8px;margin-bottom:20px}
  .sum-chip{display:flex;flex-direction:column;align-items:center;padding:10px 18px;background:var(--surface);border:1px solid var(--border);border-radius:8px;gap:2px}
  .sum-count{font-family:'DM Mono',monospace;font-size:18px;font-weight:500}
  .sum-lbl{font-size:9px;font-family:'DM Mono',monospace;color:var(--muted);text-transform:uppercase;letter-spacing:.08em}

  .filter-row{display:flex;align-items:center;gap:8px;margin-bottom:16px;flex-wrap:wrap}
  .filter-lbl{font-size:10px;font-family:'DM Mono',monospace;color:var(--muted);text-transform:uppercase;letter-spacing:.1em}
  .ftab{padding:5px 14px;border-radius:20px;border:1px solid var(--border);background:transparent;color:var(--muted);font-size:11px;font-family:'DM Mono',monospace;transition:all .15s}
  .ftab:hover{border-color:#444;color:var(--mid)}
  .ftab.active{background:var(--accent-dim);border-color:var(--accent);color:var(--accent)}

  /* ── PIECE CARDS ── */
  .pieces-list{display:flex;flex-direction:column;gap:8px}
  .piece-card{background:var(--surface);border:1px solid var(--border);border-radius:8px;overflow:hidden;transition:border-color .2s}
  .piece-card:hover{border-color:var(--border2)}
  .piece-hdr{display:flex;align-items:center;padding:12px 16px;cursor:pointer;gap:10px;user-select:none}
  .piece-tag{font-size:9px;font-family:'DM Mono',monospace;background:var(--accent-dim);color:var(--accent);padding:3px 8px;border-radius:3px;letter-spacing:.06em;white-space:nowrap}
  .piece-name{font-size:14px;font-weight:500;flex:1}
  .vis-badges{display:flex;gap:4px}
  .vis-badge{font-size:9px;font-family:'DM Mono',monospace;padding:2px 7px;border-radius:10px;border:1px solid}
  .area-dots{display:flex;gap:3px;align-items:center}
  .adot{width:6px;height:6px;border-radius:50%;opacity:.15;transition:opacity .2s}
  .adot.lit{opacity:1}
  .spill{display:flex;align-items:center;gap:5px;padding:4px 11px;border-radius:20px;font-size:11px;font-weight:500;white-space:nowrap;border:none;background:transparent}
  .sdot{width:5px;height:5px;border-radius:50%;flex-shrink:0}
  .chev{color:var(--muted);font-size:10px;transition:transform .2s}
  .chev.open{transform:rotate(180deg)}

  .piece-body{display:none;border-top:1px solid var(--border)}
  .piece-body.open{display:block}

  /* SHARE CONTROLS */
  .share-bar{display:flex;align-items:center;gap:10px;padding:10px 16px;background:var(--surface2);border-bottom:1px solid var(--border)}
  .share-lbl{font-size:9px;font-family:'DM Mono',monospace;color:var(--muted);text-transform:uppercase;letter-spacing:.1em}
  .share-btn{padding:4px 12px;border-radius:20px;border:1px solid var(--border2);background:transparent;color:var(--muted);font-size:10px;font-family:'DM Mono',monospace;transition:all .15s}
  .share-btn.active-marca{border-color:#e879f9;color:#e879f9;background:rgba(232,121,249,.1)}
  .share-btn.active-casa{border-color:#4ade80;color:#4ade80;background:rgba(74,222,128,.1)}

  /* THERMOMETER */
  .thermo-wrap{padding:16px;border-bottom:1px solid var(--border)}
  .thermo-lbl{font-size:9px;font-family:'DM Mono',monospace;color:var(--muted);text-transform:uppercase;letter-spacing:.12em;margin-bottom:14px;display:block}
  .thermo{display:flex;align-items:flex-start}
  .tconn{flex:1;height:2px;margin-top:15px;background:var(--border);transition:background .3s}
  .tconn.lit{background:#4ade80}
  .tnode{display:flex;flex-direction:column;align-items:center;gap:6px;min-width:90px}
  .tcircle{width:30px;height:30px;border-radius:50%;border:2px solid var(--border);background:var(--surface2);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;cursor:pointer;font-family:'DM Mono',monospace;flex-shrink:0;color:var(--muted);transition:all .2s}
  .trole{font-size:10px;font-weight:600}
  .tbadge{font-size:9px;font-family:'DM Mono',monospace;padding:2px 8px;border-radius:20px;border:1px solid var(--border);color:var(--muted);background:transparent;cursor:pointer;white-space:nowrap}

  /* PRIORITY */
  .prio-wrap{padding:12px 16px 0}
  .sec-lbl{font-size:9px;font-family:'DM Mono',monospace;color:var(--muted);text-transform:uppercase;letter-spacing:.12em;margin-bottom:7px;display:block}
  .prio-row{display:flex;gap:6px}
  .prio-btn{padding:4px 12px;border-radius:4px;border:1px solid var(--border);background:transparent;color:var(--muted);font-size:11px;transition:all .15s}

  /* AREAS */
  .areas-grid{display:grid;grid-template-columns:1fr 1fr;gap:1px;background:var(--border);margin-top:12px;border-top:1px solid var(--border)}
  .area-sec{background:var(--surface);padding:12px 14px}
  .area-hdr{display:flex;align-items:center;gap:7px;margin-bottom:7px}
  .area-dot-sm{width:7px;height:7px;border-radius:50%;flex-shrink:0}
  .area-name{font-size:10px;font-family:'DM Mono',monospace;font-weight:500;text-transform:uppercase;letter-spacing:.1em;flex:1}
  .area-sel{background:var(--surface2);border:1px solid var(--border);border-radius:4px;color:var(--mid);font-size:9px;font-family:'DM Mono',monospace;padding:2px 5px}
  .area-sel option{background:#1a1a1a}
  .src-row{display:flex;gap:4px;margin-bottom:7px;align-items:center}
  .src-lbl{font-size:9px;font-family:'DM Mono',monospace;color:var(--muted);text-transform:uppercase;letter-spacing:.1em}
  .src-btn{padding:2px 9px;border-radius:20px;border:1px solid var(--border);background:transparent;color:var(--muted);font-size:9px;font-family:'DM Mono',monospace;transition:all .15s}
  .area-ta{width:100%;background:#111;border:1px solid var(--border);border-radius:4px;padding:8px 10px;color:var(--text);font-family:'DM Sans',sans-serif;font-size:11px;line-height:1.6;min-height:64px}
  .area-ta:focus{outline:none}
  .area-ta::placeholder{color:#333;font-size:10px}

  /* VFX */
  .vfx-wrap{padding:12px 14px;border-top:1px solid var(--border)}
  .vfx-hdr{display:flex;align-items:center;gap:8px;margin-bottom:8px}
  .vfx-ta{width:100%;background:#111;border:1px solid var(--border);border-radius:4px;padding:8px 10px;color:var(--text);font-family:'DM Sans',sans-serif;font-size:11px;line-height:1.6;min-height:60px}
  .vfx-ta:focus{outline:none;border-color:#f97316}
  .vfx-ta::placeholder{color:#333;font-size:10px}

  /* HISTORY */
  .hist-wrap{padding:12px 16px;border-top:1px solid var(--border)}
  .hist-toggle{background:none;border:none;color:var(--muted);font-size:10px;font-family:'DM Mono',monospace;padding:0;letter-spacing:.08em;text-transform:uppercase}
  .hist-list{margin-top:8px;display:none}
  .hist-list.open{display:block}
  .hist-row{display:flex;gap:8px;padding:6px 0;border-bottom:1px solid var(--border)}
  .hist-row:last-child{border-bottom:none}
  .hist-rnd{font-size:9px;font-family:'DM Mono',monospace;color:var(--muted);white-space:nowrap;min-width:38px}
  .hist-txt{font-size:11px;color:var(--mid);line-height:1.5;flex:1}

  /* MEMBERS */
  .members-wrap{margin-top:24px}
  .members-title{font-size:10px;font-family:'DM Mono',monospace;color:var(--muted);text-transform:uppercase;letter-spacing:.12em;margin-bottom:12px;display:block}
  .member-row{display:flex;align-items:center;gap:10px;padding:8px 12px;background:var(--surface);border:1px solid var(--border);border-radius:6px;margin-bottom:6px}
  .member-avatar{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0}
  .member-name{font-size:13px;font-weight:500;flex:1}
  .member-email{font-size:11px;color:var(--mid)}
  .member-role-badge{font-size:9px;font-family:'DM Mono',monospace;padding:3px 8px;border-radius:10px;border:1px solid}

  /* SNAPSHOTS */
  .snaps-wrap{margin-top:28px;padding-top:20px;border-top:1px solid var(--border)}
  .snap-card{background:var(--surface);border:1px solid var(--border);border-radius:6px;margin-bottom:8px;overflow:hidden}
  .snap-hdr{display:flex;align-items:center;padding:10px 14px;cursor:pointer;gap:10px}
  .snap-ronda{font-size:11px;font-family:'DM Mono',monospace;color:var(--accent)}
  .snap-fecha{font-size:11px;color:var(--muted);flex:1}
  .snap-body{display:none;padding:12px 14px;border-top:1px solid var(--border)}
  .snap-body.open{display:block}
  .snap-piece{margin-bottom:10px;padding-bottom:10px;border-bottom:1px solid var(--border)}
  .snap-piece:last-child{border-bottom:none;margin-bottom:0}
  .snap-piece-name{font-size:12px;font-weight:500;margin-bottom:4px}
  .snap-area{font-size:11px;color:var(--mid);margin-bottom:2px;line-height:1.5}

  /* FOOTER ACTIONS */
  .proj-footer{margin-top:24px;padding-top:20px;border-top:1px solid var(--border)}
  .notes-ta{width:100%;background:#111;border:1px solid var(--border);border-radius:6px;padding:10px 12px;color:var(--text);font-family:'DM Sans',sans-serif;font-size:13px;min-height:56px;margin-top:6px;margin-bottom:14px}
  .notes-ta:focus{outline:none;border-color:var(--accent)}
  .notes-ta::placeholder{color:#333;font-size:12px}
  .btn-row{display:flex;gap:8px;flex-wrap:wrap}
  .btn-primary{background:var(--accent);color:#000;border:none;padding:9px 20px;border-radius:6px;font-size:13px;font-weight:700}
  .btn-primary:hover{opacity:.9}
  .btn-accent{background:transparent;color:var(--accent);border:1px solid rgba(200,241,53,.3);padding:9px 20px;border-radius:6px;font-size:13px}
  .btn-accent:hover{background:rgba(200,241,53,.08)}
  .btn-danger{background:transparent;color:#f87171;border:1px solid rgba(248,113,113,.3);padding:9px 20px;border-radius:6px;font-size:13px}
  .btn-danger:hover{background:rgba(248,113,113,.08)}
  .save-ind{font-size:10px;font-family:'DM Mono',monospace;color:var(--muted)}

  /* MISC */
  .tag-pill{font-size:9px;font-family:'DM Mono',monospace;padding:3px 9px;border-radius:10px;border:1px solid}
  .empty-state{text-align:center;padding:60px 20px;color:var(--muted)}
  .empty-state h3{font-size:16px;color:var(--text);margin-bottom:8px}
  .empty-state p{font-size:13px;line-height:1.6}
  .spinner{display:inline-block;width:16px;height:16px;border:2px solid var(--border);border-top-color:var(--accent);border-radius:50%;animation:spin .6s linear infinite}
  @keyframes spin{to{transform:rotate(360deg)}}

  @media(max-width:700px){
    .sidebar{display:none}
    .main{margin-left:0}
    .areas-grid{grid-template-columns:1fr}
  }
`

// ── HELPERS ───────────────────────────────────────────────────
function initials(name) {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

// ── MAIN COMPONENT ────────────────────────────────────────────
export default function Platform() {
  // AUTH
  const [user, setUser]           = useState(null)
  const [authMode, setAuthMode]   = useState('login') // login | register
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [name, setName]           = useState('')
  const [role, setRole]           = useState('agencia')
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [userProfile, setUserProfile] = useState(null)

  // NAV
  const [view, setView]           = useState('dashboard') // dashboard | project
  const [activeProject, setActiveProject] = useState(null)

  // PROJECTS
  const [projects, setProjects]   = useState([])
  const [showNewProj, setShowNewProj] = useState(false)
  const [newProjName, setNewProjName] = useState('')
  const [newProjClient, setNewProjClient] = useState('')

  // PROJECT DATA
  const [pieces, setPieces]       = useState([])
  const [feedback, setFeedback]   = useState({}) // pieceId → {area → {feedback,status,sources}}
  const [approvals, setApprovals] = useState({}) // pieceId → {role → state}
  const [visibility, setVisibility] = useState({}) // pieceId → {marca, casa}
  const [members, setMembers]     = useState([])
  const [snapshots, setSnapshots] = useState([])
  const [projNotes, setProjNotes] = useState({ notas:'', fecha:'', ronda:'' })
  const [openCards, setOpenCards] = useState({})
  const [openHist, setOpenHist]   = useState({})
  const [openSnaps, setOpenSnaps] = useState({})
  const [filter, setFilter]       = useState('all')
  const [saveStatus, setSaveStatus] = useState('idle')
  const [showAddMember, setShowAddMember] = useState(false)
  const [newMemberEmail, setNewMemberEmail] = useState('')
  const [newMemberName, setNewMemberName]   = useState('')
  const [newMemberRole, setNewMemberRole]   = useState('agencia')

  // ── AUTH ────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) loadUser(session.user)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) loadUser(session.user)
      else { setUser(null); setUserProfile(null) }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function loadUser(authUser) {
    setUser(authUser)
    const { data } = await supabase.from('users').select('*').eq('id', authUser.id).single()
    if (data) setUserProfile(data)
    loadProjects(authUser.id)
  }

  async function handleAuth() {
    setAuthLoading(true); setAuthError('')
    if (authMode === 'register') {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) { setAuthError(error.message); setAuthLoading(false); return }
      if (data.user) {
        await supabase.from('users').insert({ id: data.user.id, email, name, role })
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { setAuthError('Email o contraseña incorrectos'); setAuthLoading(false); return }
    }
    setAuthLoading(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    setView('dashboard'); setActiveProject(null)
  }

  const canEdit = userProfile && (userProfile.role === 'productor' || userProfile.role === 'agencia')
  const canShare = userProfile && (userProfile.role === 'productor' || userProfile.role === 'agencia')
  const canManage = userProfile && userProfile.role === 'productor'

  // ── PROJECTS ────────────────────────────────────────────────
  async function loadProjects(uid) {
    const { data } = await supabase
      .from('project_members')
      .select('project_id, projects(*)')
      .eq('user_id', uid)
    if (data) setProjects(data.map(d => d.projects).filter(Boolean))
  }

  async function createProject() {
    if (!newProjName.trim()) return
    const { data: proj } = await supabase.from('projects').insert({
      name: newProjName, client: newProjClient, productor_id: user.id
    }).select().single()
    if (proj) {
      await supabase.from('project_members').insert({ project_id: proj.id, user_id: user.id, role: 'productor' })
      setProjects(p => [...p, proj])
      setShowNewProj(false); setNewProjName(''); setNewProjClient('')
    }
  }

  // ── PROJECT LOAD ─────────────────────────────────────────────
  async function openProject(proj) {
    setActiveProject(proj)
    setView('project')
    setFilter('all')
    setOpenCards({})
    await Promise.all([
      loadPieces(proj.id),
      loadMembers(proj.id),
      loadSnapshots(proj.id),
      loadProjNotes(proj.id),
    ])
  }

  async function loadPieces(projectId) {
    const { data: pcs } = await supabase.from('pieces').select('*').eq('project_id', projectId).order('position')
    if (!pcs) return
    setPieces(pcs)

    const pieceIds = pcs.map(p => p.id)
    if (!pieceIds.length) return

    const [{ data: fbs }, { data: apps }, { data: vis }] = await Promise.all([
      supabase.from('piece_feedback').select('*').in('piece_id', pieceIds),
      supabase.from('piece_approvals').select('*').in('piece_id', pieceIds),
      supabase.from('piece_visibility').select('*').in('piece_id', pieceIds),
    ])

    const fbMap = {}
    fbs?.forEach(f => {
      if (!fbMap[f.piece_id]) fbMap[f.piece_id] = {}
      fbMap[f.piece_id][f.area] = { feedback: f.feedback, status: f.status, sources: f.sources || [] }
    })
    setFeedback(fbMap)

    const appMap = {}
    apps?.forEach(a => {
      if (!appMap[a.piece_id]) appMap[a.piece_id] = {}
      appMap[a.piece_id][a.role] = a.state
    })
    setApprovals(appMap)

    const visMap = {}
    vis?.forEach(v => { visMap[v.piece_id] = { marca: v.visible_to_marca, casa: v.visible_to_casa } })
    setVisibility(visMap)
  }

  async function loadMembers(projectId) {
    const { data } = await supabase.from('project_members').select('*, users(*)').eq('project_id', projectId)
    if (data) setMembers(data.map(d => ({ ...d.users, memberRole: d.role })))
  }

  async function loadSnapshots(projectId) {
    const { data } = await supabase.from('snapshots').select('*').eq('project_id', projectId).order('created_at', { ascending: false })
    if (data) setSnapshots(data)
  }

  async function loadProjNotes(projectId) {
    const { data } = await supabase.from('project_notes').select('*').eq('project_id', projectId).single()
    if (data) setProjNotes({ notas: data.notas || '', fecha: data.fecha || '', ronda: data.ronda || '' })
  }

  // ── PIECE OPERATIONS ─────────────────────────────────────────
  async function updatePieceStatus(pieceId, status) {
    if (!canEdit) return
    await supabase.from('pieces').update({ status }).eq('id', pieceId)
    setPieces(p => p.map(pc => pc.id === pieceId ? { ...pc, status } : pc))
  }

  async function updatePiecePriority(pieceId, priority) {
    if (!canEdit) return
    const newPrio = pieces.find(p => p.id === pieceId)?.priority === priority ? null : priority
    await supabase.from('pieces').update({ priority: newPrio }).eq('id', pieceId)
    setPieces(p => p.map(pc => pc.id === pieceId ? { ...pc, priority: newPrio } : pc))
  }

  async function updateApproval(pieceId, roleKey) {
    if (!canEdit) return
    const role = APPROVAL_ROLES.find(r => r.key === roleKey)
    const cur = approvals[pieceId]?.[roleKey] || 'idle'
    const idx = role.states.indexOf(cur)
    const next = role.states[(idx + 1) % role.states.length]
    setApprovals(a => ({ ...a, [pieceId]: { ...a[pieceId], [roleKey]: next } }))
    await supabase.from('piece_approvals').upsert({ piece_id: pieceId, role: roleKey, state: next }, { onConflict: 'piece_id,role' })
  }

  async function updateFeedback(pieceId, area, field, value) {
    if (!canEdit) return
    const current = feedback[pieceId]?.[area] || { feedback: '', status: 'pendiente', sources: [] }
    const updated = { ...current, [field]: value }
    setFeedback(f => ({ ...f, [pieceId]: { ...f[pieceId], [area]: updated } }))
    setSaveStatus('saving')
    clearTimeout(window._saveTimer)
    window._saveTimer = setTimeout(async () => {
      await supabase.from('piece_feedback').upsert({
        piece_id: pieceId, area,
        feedback: updated.feedback, status: updated.status, sources: updated.sources
      }, { onConflict: 'piece_id,area' })
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    }, 1000)
  }

  async function toggleSource(pieceId, area, src) {
    if (!canEdit) return
    const current = feedback[pieceId]?.[area]?.sources || []
    const next = current.includes(src) ? current.filter(s => s !== src) : [...current, src]
    await updateFeedback(pieceId, area, 'sources', next)
  }

  async function toggleVisibility(pieceId, target) {
    if (!canShare) return
    const cur = visibility[pieceId] || { marca: false, casa: false }
    const next = { ...cur, [target]: !cur[target] }
    setVisibility(v => ({ ...v, [pieceId]: next }))
    await supabase.from('piece_visibility').upsert({
      piece_id: pieceId, visible_to_marca: next.marca, visible_to_casa: next.casa
    }, { onConflict: 'piece_id' })
  }

  async function updateProjNotes(field, value) {
    const next = { ...projNotes, [field]: value }
    setProjNotes(next)
    clearTimeout(window._notesTimer)
    window._notesTimer = setTimeout(async () => {
      await supabase.from('project_notes').upsert({ project_id: activeProject.id, ...next }, { onConflict: 'project_id' })
    }, 1000)
  }

  // ── MEMBERS ─────────────────────────────────────────────────
  async function addMember() {
    if (!newMemberEmail.trim()) return
    let { data: existingUser } = await supabase.from('users').select('*').eq('email', newMemberEmail).single()
    if (!existingUser) {
      const { data: newUser } = await supabase.from('users').insert({ email: newMemberEmail, name: newMemberName, role: newMemberRole }).select().single()
      existingUser = newUser
    }
    if (existingUser) {
      await supabase.from('project_members').upsert({ project_id: activeProject.id, user_id: existingUser.id, role: newMemberRole }, { onConflict: 'project_id,user_id' })
      setMembers(m => [...m.filter(mb => mb.id !== existingUser.id), { ...existingUser, memberRole: newMemberRole }])
    }
    setShowAddMember(false); setNewMemberEmail(''); setNewMemberName(''); setNewMemberRole('agencia')
  }

  // ── CLOSE ROUND ─────────────────────────────────────────────
  async function closeRound() {
    if (!confirm(`¿Cerrar la ronda "${projNotes.ronda || 'actual'}"? Se guardará en el historial.`)) return
    const snapshot = {
      project_id: activeProject.id,
      ronda: projNotes.ronda || 'Sin nombre',
      fecha: projNotes.fecha || new Date().toLocaleDateString('es-MX'),
      notas: projNotes.notas,
      data: { pieces, feedback, approvals, visibility }
    }
    const { data } = await supabase.from('snapshots').insert(snapshot).select().single()
    if (data) setSnapshots(s => [data, ...s])
    alert(`Ronda "${snapshot.ronda}" guardada en el historial.`)
  }

  // ── VISIBLE PIECES (filtered by role) ───────────────────────
  const visiblePieces = pieces.filter(p => {
    if (!userProfile) return false
    if (userProfile.role === 'marca') return visibility[p.id]?.marca
    if (userProfile.role === 'casa_productora') return visibility[p.id]?.casa
    return true
  }).filter(p => filter === 'all' || p.group_name === filter)

  const groups = [...new Set(pieces.map(p => p.group_name).filter(Boolean))]
  const counts = { pendiente: 0, cambios: 0, aprobado: 0 }
  visiblePieces.forEach(p => { counts[p.status]++ })

  // ── THERMOMETER ──────────────────────────────────────────────
  function Thermometer({ pieceId }) {
    const stateColors = { idle:'#2e2e2e', review:'#60a5fa', adjust:'#fb923c', approved:'#4ade80', received:'#a78bfa', wip:'#fbbf24', delivered:'#4ade80' }
    return (
      <div className="thermo-wrap">
        <span className="thermo-lbl">Flujo de aprobación</span>
        <div className="thermo">
          {APPROVAL_ROLES.map((role, i) => {
            const stKey = approvals[pieceId]?.[role.key] || 'idle'
            const col = stateColors[stKey] || '#2e2e2e'
            const isLit = stKey === 'approved' || stKey === 'delivered'
            return (
              <div key={role.key} style={{display:'flex',alignItems:'flex-start'}}>
                <div className="tnode">
                  <div className="tcircle" onClick={() => updateApproval(pieceId, role.key)}
                    style={{borderColor:stKey==='idle'?'#2e2e2e':col, color:col, background:stKey==='idle'?'var(--surface2)':`${col}18`}}>
                    {role.icons[stKey] || role.icons.idle}
                  </div>
                  <span className="trole" style={{color:role.color}}>{role.label}</span>
                  <span className="tbadge" onClick={() => updateApproval(pieceId, role.key)}
                    style={{borderColor:stKey==='idle'?'var(--border)':col, color:stKey==='idle'?'var(--muted)':col, background:stKey==='idle'?'transparent':`${col}15`}}>
                    {role.labels[stKey]}
                  </span>
                </div>
                {i < APPROVAL_ROLES.length - 1 && <div className={`tconn ${isLit?'lit':''}`}/>}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ── PIECE CARD ───────────────────────────────────────────────
  function PieceCard({ piece }) {
    const isOpen = !!openCards[piece.id]
    const isHistOpen = !!openHist[piece.id]
    const pieceFb = feedback[piece.id] || {}
    const pieceVis = visibility[piece.id] || { marca: false, casa: false }
    const sc = STATUS_COLORS[piece.status] || '#60a5fa'

    return (
      <div className="piece-card">
        <div className="piece-hdr" onClick={() => setOpenCards(o => ({ ...o, [piece.id]: !o[piece.id] }))}>
          <span className="piece-tag">{piece.tag}</span>
          <span className="piece-name">{piece.name}</span>
          {canShare && (
            <div className="vis-badges">
              {pieceVis.marca && <span className="vis-badge" style={{borderColor:'#e879f940',color:'#e879f9',background:'rgba(232,121,249,.08)'}}>Marca</span>}
              {pieceVis.casa  && <span className="vis-badge" style={{borderColor:'#4ade8040',color:'#4ade80',background:'rgba(74,222,128,.08)'}}>Casa</span>}
            </div>
          )}
          <div className="area-dots">
            {AREAS.map(a => <div key={a.key} className={`adot ${pieceFb[a.key]?.feedback?.trim().length>0?'lit':''}`} style={{background:a.color}}/>)}
          </div>
          <button className="spill" onClick={e=>{e.stopPropagation(); if(canEdit) updatePieceStatus(piece.id, STATUS_OPTIONS[piece.status])}}
            style={{background:`${sc}12`,color:sc}}>
            <span className="sdot" style={{background:sc}}/>{STATUS_LABELS[piece.status]}
          </button>
          <span className={`chev ${isOpen?'open':''}`}>▼</span>
        </div>

        <div className={`piece-body ${isOpen?'open':''}`}>
          {/* SHARE BAR */}
          {canShare && (
            <div className="share-bar">
              <span className="share-lbl">Compartir con</span>
              <button className={`share-btn ${pieceVis.marca?'active-marca':''}`} onClick={() => toggleVisibility(piece.id,'marca')}>
                {pieceVis.marca?'✓ ':''} Marca
              </button>
              <button className={`share-btn ${pieceVis.casa?'active-casa':''}`} onClick={() => toggleVisibility(piece.id,'casa')}>
                {pieceVis.casa?'✓ ':''} Casa Prod.
              </button>
            </div>
          )}

          <Thermometer pieceId={piece.id}/>

          {/* PRIORITY */}
          {canEdit && (
            <div className="prio-wrap">
              <span className="sec-lbl">Prioridad</span>
              <div className="prio-row">
                {[['alta','🔴','#f87171'],['media','🟡','#fb923c'],['baja','🔵','#60a5fa']].map(([p,e,c]) => (
                  <button key={p} className="prio-btn" onClick={() => updatePiecePriority(piece.id, p)}
                    style={piece.priority===p?{background:`${c}18`,borderColor:c,color:c}:{}}>
                    {e} {p.charAt(0).toUpperCase()+p.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* AREAS */}
          <div className="areas-grid">
            {AREAS.filter(a => a.key !== 'vfx').map(a => {
              const af = pieceFb[a.key] || { feedback:'', status:'pendiente', sources:[] }
              return (
                <div key={a.key} className="area-sec">
                  <div className="area-hdr">
                    <div className="area-dot-sm" style={{background:a.color}}/>
                    <span className="area-name" style={{color:a.color}}>{a.label}</span>
                    {canEdit && (
                      <select className="area-sel" value={af.status} onChange={e=>updateFeedback(piece.id,a.key,'status',e.target.value)}>
                        <option value="pendiente">Pendiente</option>
                        <option value="cambios">Cambios</option>
                        <option value="aprobado">Aprobado</option>
                        <option value="na">N/A</option>
                      </select>
                    )}
                  </div>
                  {canEdit && (
                    <div className="src-row">
                      <span className="src-lbl">Fuente</span>
                      {SOURCE_OPTIONS.map(s => (
                        <button key={s.key} className="src-btn" onClick={() => toggleSource(piece.id,a.key,s.key)}
                          style={af.sources?.includes(s.key)?{borderColor:s.color,color:s.color,background:`${s.color}15`}:{}}>
                          {s.label}
                        </button>
                      ))}
                    </div>
                  )}
                  <textarea className="area-ta" placeholder={canEdit?a.placeholder:'Sin comentarios'}
                    value={af.feedback} readOnly={!canEdit}
                    onChange={e=>updateFeedback(piece.id,a.key,'feedback',e.target.value)}
                    style={{borderColor:af.feedback?.trim().length>0?`${a.color}50`:'var(--border)'}}
                    onFocus={e=>{ if(canEdit) e.target.style.borderColor=a.color }}
                    onBlur={e=>{ e.target.style.borderColor=af.feedback?.trim().length>0?`${a.color}50`:'var(--border)' }}
                  />
                </div>
              )
            })}
          </div>

          {/* VFX */}
          <div className="vfx-wrap">
            <div className="vfx-hdr">
              <div className="area-dot-sm" style={{background:'#f97316'}}/>
              <span className="area-name" style={{color:'#f97316',flex:1}}>VFX</span>
              {canEdit && (
                <>
                  <select className="area-sel" value={pieceFb.vfx?.status||'pendiente'} onChange={e=>updateFeedback(piece.id,'vfx','status',e.target.value)}>
                    <option value="pendiente">Pendiente</option>
                    <option value="cambios">Cambios</option>
                    <option value="aprobado">Aprobado</option>
                    <option value="na">N/A</option>
                  </select>
                  <div className="src-row" style={{margin:'0 0 0 8px'}}>
                    {SOURCE_OPTIONS.map(s => (
                      <button key={s.key} className="src-btn" onClick={() => toggleSource(piece.id,'vfx',s.key)}
                        style={pieceFb.vfx?.sources?.includes(s.key)?{borderColor:s.color,color:s.color,background:`${s.color}15`}:{}}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <textarea className="vfx-ta" placeholder={canEdit?'Efectos visuales, compositing, motion graphics...':'Sin comentarios'}
              value={pieceFb.vfx?.feedback||''} readOnly={!canEdit}
              onChange={e=>updateFeedback(piece.id,'vfx','feedback',e.target.value)}
              style={{borderColor:pieceFb.vfx?.feedback?.trim().length>0?'#f9731650':'var(--border)'}}
              onFocus={e=>{ if(canEdit) e.target.style.borderColor='#f97316' }}
              onBlur={e=>{ e.target.style.borderColor=pieceFb.vfx?.feedback?.trim().length>0?'#f9731650':'var(--border)' }}
            />
          </div>

          {/* HISTORY toggle */}
          <div className="hist-wrap">
            <button className="hist-toggle" onClick={() => setOpenHist(o => ({ ...o, [piece.id]: !o[piece.id] }))}>
              {isHistOpen ? '▾ Ocultar historial' : '▸ Ver historial de rondas'}
            </button>
            <div className={`hist-list ${isHistOpen ? 'open' : ''}`}>
              {snapshots.map(snap => {
                const snapPiece = snap.data?.pieces?.find(p => p.name === piece.name)
                const snapFb = snap.data?.feedback?.[snapPiece?.id]
                if (!snapPiece && !snapFb) return null
                return (
                  <div key={snap.id} className="hist-row">
                    <span className="hist-rnd">{snap.ronda}</span>
                    <span className="hist-txt">{snap.fecha} — {STATUS_LABELS[snapPiece?.status] || '—'}</span>
                  </div>
                )
              })}
              {!snapshots.length && <p style={{fontSize:'11px',color:'var(--muted)',paddingTop:'6px'}}>Sin historial aún.</p>}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const STATUS_OPTIONS = { pendiente:'cambios', cambios:'aprobado', aprobado:'pendiente' }

  // ── AUTH SCREEN ──────────────────────────────────────────────
  if (!user) return (
    <>
      <Head><title>Production Platform</title><style>{css}</style></Head>
      <div className="auth-wrap">
        <div className="auth-box">
          <p className="auth-logo">Production Platform</p>
          <h1 className="auth-title">{authMode === 'login' ? 'Bienvenida' : 'Crear cuenta'}</h1>
          <p className="auth-sub">{authMode === 'login' ? 'Entra con tus credenciales' : 'Completa tu perfil para continuar'}</p>
          {authMode === 'register' && (
            <>
              <label className="auth-label">Nombre completo</label>
              <input className="auth-input" type="text" placeholder="Tu nombre" value={name} onChange={e=>setName(e.target.value)}/>
              <label className="auth-label">Rol</label>
              <select className="auth-input" value={role} onChange={e=>setRole(e.target.value)} style={{cursor:'pointer'}}>
                <option value="productor">Productor</option>
                <option value="agencia">Agencia</option>
                <option value="marca">Marca</option>
                <option value="casa_productora">Casa Productora</option>
              </select>
            </>
          )}
          <label className="auth-label">Email</label>
          <input className="auth-input" type="email" placeholder="tu@email.com" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleAuth()}/>
          <label className="auth-label">Contraseña</label>
          <input className="auth-input" type="password" placeholder="••••••••" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleAuth()}/>
          <button className="auth-btn" onClick={handleAuth} disabled={authLoading}>
            {authLoading ? 'Cargando...' : authMode === 'login' ? 'Entrar' : 'Crear cuenta'}
          </button>
          {authError && <p className="auth-error">{authError}</p>}
          <p className="auth-toggle">
            {authMode === 'login' ? '¿No tienes cuenta? ' : '¿Ya tienes cuenta? '}
            <button onClick={() => { setAuthMode(authMode==='login'?'register':'login'); setAuthError('') }}>
              {authMode === 'login' ? 'Regístrate' : 'Inicia sesión'}
            </button>
          </p>
        </div>
      </div>
    </>
  )

  // ── APP ──────────────────────────────────────────────────────
  return (
    <>
      <Head><title>Production Platform</title><style>{css}</style></Head>
      <div className="shell">

        {/* SIDEBAR */}
        <div className="sidebar">
          <div className="sidebar-logo">
            <p className="sidebar-logo-tag">Production Platform</p>
            <p className="sidebar-logo-name">Dashboard</p>
          </div>
          <nav className="sidebar-nav">
            <p className="sidebar-section">Proyectos</p>
            <button className={`nav-item ${view==='dashboard'?'active':''}`} onClick={()=>{setView('dashboard');setActiveProject(null)}}>
              <span className="nav-item-dot" style={{background:'var(--accent)'}}/>Todos los proyectos
            </button>
            {projects.map(p => (
              <button key={p.id} className={`nav-item ${activeProject?.id===p.id?'active':''}`} onClick={()=>openProject(p)}>
                <span className="nav-item-dot" style={{background:'#60a5fa'}}/>{p.name}
              </button>
            ))}
            {canManage && (
              <button className="nav-item" onClick={()=>setShowNewProj(true)} style={{color:'var(--accent)',opacity:.7}}>
                <span style={{fontSize:'14px'}}>+</span> Nuevo proyecto
              </button>
            )}
          </nav>
          <div className="sidebar-user">
            <p className="sidebar-user-name">{userProfile?.name || user.email}</p>
            <p className="sidebar-user-role" style={{color:ROLES[userProfile?.role]?.color||'var(--muted)'}}>{ROLES[userProfile?.role]?.label||''}</p>
            <button className="sidebar-user-out" onClick={handleLogout}>Cerrar sesión</button>
          </div>
        </div>

        {/* MAIN */}
        <div className="main">
          <div className="topbar">
            <span className="topbar-title">
              {view === 'dashboard' ? 'Mis proyectos' : activeProject?.name}
            </span>
            <div className="topbar-meta">
              {saveStatus==='saving' && <span className="save-ind" style={{color:'var(--accent)'}}>● Guardando…</span>}
              {saveStatus==='saved'  && <span className="save-ind" style={{color:'#4ade80'}}>✓ Guardado</span>}
            </div>
          </div>

          <div className="page">

            {/* DASHBOARD */}
            {view === 'dashboard' && (
              <>
                <div className="dash-grid">
                  {projects.map(p => {
                    return (
                      <div key={p.id} className="proj-card" onClick={()=>openProject(p)}>
                        <p className="proj-card-tag">Proyecto activo</p>
                        <h2 className="proj-card-name">{p.name}</h2>
                        <p className="proj-card-client">{p.client}</p>
                      </div>
                    )
                  })}
                  {canManage && (
                    <button className="new-proj-card" onClick={()=>setShowNewProj(true)}>
                      <span className="new-proj-icon">+</span>
                      <span className="new-proj-label">Nuevo proyecto</span>
                    </button>
                  )}
                  {!projects.length && !canManage && (
                    <div className="empty-state">
                      <h3>Sin proyectos asignados</h3>
                      <p>El productor te agregará a un proyecto pronto.</p>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* PROJECT VIEW */}
            {view === 'project' && activeProject && (
              <>
                <div className="proj-header">
                  <div className="proj-header-left">
                    <h1>{activeProject.name}</h1>
                    <p>{activeProject.client}</p>
                  </div>
                  <div className="proj-header-right">
                    {canEdit && (
                      <>
                        <input className="modal-input" style={{width:'110px'}} placeholder="Fecha" value={projNotes.fecha} onChange={e=>updateProjNotes('fecha',e.target.value)}/>
                        <input className="modal-input" style={{width:'90px'}} placeholder="Ronda" value={projNotes.ronda} onChange={e=>updateProjNotes('ronda',e.target.value)}/>
                      </>
                    )}
                  </div>
                </div>

                {/* SUMMARY */}
                <div className="summary-row">
                  {Object.entries(STATUS_LABELS).map(([s,l]) => (
                    <div key={s} className="sum-chip">
                      <span className="sum-count" style={{color:STATUS_COLORS[s]}}>{counts[s]||0}</span>
                      <span className="sum-lbl">{l}</span>
                    </div>
                  ))}
                </div>

                {/* FILTERS */}
                <div className="filter-row">
                  <span className="filter-lbl">Filtrar</span>
                  <button className={`ftab ${filter==='all'?'active':''}`} onClick={()=>setFilter('all')}>Todas</button>
                  {groups.map(g => <button key={g} className={`ftab ${filter===g?'active':''}`} onClick={()=>setFilter(g)}>{g}</button>)}
                </div>

                {/* PIECES */}
                <div className="pieces-list">
                  {visiblePieces.length === 0 && (
                    <div className="empty-state">
                      <h3>Sin piezas</h3>
                      <p>{canManage ? 'Agrega piezas a este proyecto desde el panel de administración.' : 'No hay piezas compartidas contigo aún.'}</p>
                    </div>
                  )}
                  {visiblePieces.map(p => <PieceCard key={p.id} piece={p}/>)}
                </div>

                {/* FOOTER */}
                {canEdit && (
                  <div className="proj-footer">
                    <span className="sec-lbl">Notas generales de la ronda</span>
                    <textarea className="notes-ta" placeholder="Observaciones generales..." value={projNotes.notas} onChange={e=>updateProjNotes('notas',e.target.value)}/>
                    <div className="btn-row">
                      <button className="btn-primary" onClick={closeRound}>Cerrar ronda y guardar historial</button>
                      <button className="btn-accent" onClick={()=>alert('Export próximamente')}>Exportar resumen</button>
                    </div>
                  </div>
                )}

                {/* MEMBERS */}
                {canManage && (
                  <div className="members-wrap">
                    <span className="members-title">Equipo del proyecto</span>
                    {members.map(m => (
                      <div key={m.id} className="member-row">
                        <div className="member-avatar" style={{background:`${ROLES[m.memberRole]?.color||'#555'}20`,color:ROLES[m.memberRole]?.color||'#555'}}>
                          {initials(m.name||m.email)}
                        </div>
                        <div style={{flex:1}}>
                          <p className="member-name">{m.name||'—'}</p>
                          <p className="member-email">{m.email}</p>
                        </div>
                        <span className="member-role-badge" style={{borderColor:`${ROLES[m.memberRole]?.color||'#555'}40`,color:ROLES[m.memberRole]?.color||'#555'}}>
                          {ROLES[m.memberRole]?.label||m.memberRole}
                        </span>
                      </div>
                    ))}
                    <button className="nav-item" style={{marginTop:'8px',color:'var(--accent)',opacity:.8}} onClick={()=>setShowAddMember(true)}>
                      <span>+</span> Agregar persona
                    </button>
                  </div>
                )}

                {/* SNAPSHOTS */}
                {snapshots.length > 0 && (
                  <div className="snaps-wrap">
                    <span className="members-title">Historial de rondas</span>
                    {snapshots.map(snap => (
                      <div key={snap.id} className="snap-card">
                        <div className="snap-hdr" onClick={()=>setOpenSnaps(o=>({...o,[snap.id]:!o[snap.id]}))}>
                          <span className="snap-ronda">{snap.ronda}</span>
                          <span className="snap-fecha">{snap.fecha}</span>
                          <span style={{color:'var(--muted)',fontSize:'10px'}}>{openSnaps[snap.id]?'▲':'▼'}</span>
                        </div>
                        <div className={`snap-body ${openSnaps[snap.id]?'open':''}`}>
                          {snap.notas && <p style={{fontSize:'12px',color:'var(--mid)',marginBottom:'10px',fontStyle:'italic'}}>{snap.notas}</p>}
                          <p style={{fontSize:'11px',color:'var(--muted)'}}>Snapshot guardado el {snap.fecha}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* NEW PROJECT MODAL */}
      {showNewProj && (
        <div className="modal-overlay" onClick={()=>setShowNewProj(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <h2 className="modal-title">Nuevo proyecto</h2>
            <label className="modal-label">Nombre del proyecto</label>
            <input className="modal-input" placeholder="Ej. RBM DGEN Global Campaign" value={newProjName} onChange={e=>setNewProjName(e.target.value)}/>
            <label className="modal-label">Cliente / Marca</label>
            <input className="modal-input" placeholder="Ej. Meta / Ray-Ban" value={newProjClient} onChange={e=>setNewProjClient(e.target.value)}/>
            <div className="modal-btns">
              <button className="modal-btn-cancel" onClick={()=>setShowNewProj(false)}>Cancelar</button>
              <button className="modal-btn-primary" onClick={createProject}>Crear proyecto</button>
            </div>
          </div>
        </div>
      )}

      {/* ADD MEMBER MODAL */}
      {showAddMember && (
        <div className="modal-overlay" onClick={()=>setShowAddMember(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <h2 className="modal-title">Agregar persona al proyecto</h2>
            <label className="modal-label">Nombre</label>
            <input className="modal-input" placeholder="Nombre completo" value={newMemberName} onChange={e=>setNewMemberName(e.target.value)}/>
            <label className="modal-label">Email</label>
            <input className="modal-input" type="email" placeholder="email@ejemplo.com" value={newMemberEmail} onChange={e=>setNewMemberEmail(e.target.value)}/>
            <label className="modal-label">Rol en este proyecto</label>
            <select className="modal-select" value={newMemberRole} onChange={e=>setNewMemberRole(e.target.value)}>
              <option value="agencia">Agencia</option>
              <option value="marca">Marca</option>
              <option value="casa_productora">Casa Productora</option>
              <option value="productor">Productor</option>
            </select>
            <div className="modal-btns">
              <button className="modal-btn-cancel" onClick={()=>setShowAddMember(false)}>Cancelar</button>
              <button className="modal-btn-primary" onClick={addMember}>Agregar</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
