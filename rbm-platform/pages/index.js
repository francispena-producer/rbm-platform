import { useState, useEffect } from 'react'
import Head from 'next/head'
import { supabase } from '../lib/supabase'

const ROLES = {
  productor:       { label:'Productor',       color:'#c8f135' },
  agencia:         { label:'Agencia',         color:'#60a5fa' },
  marca:           { label:'Marca',           color:'#e879f9' },
  casa_productora: { label:'Casa Productora', color:'#4ade80' },
}
const AREAS = [
  { key:'edit',   label:'Edición',           color:'#a78bfa', placeholder:'Ajustes de corte, ritmo, narrativa...' },
  { key:'color',  label:'Color',             color:'#f472b6', placeholder:'Exposición, contraste, grading...' },
  { key:'audio',  label:'Audio',             color:'#34d399', placeholder:'Música, efectos, mezcla...' },
  { key:'online', label:'Online / Gráficos', color:'#fbbf24', placeholder:'UI bubbles, end cards, logos...' },
]
const APPROVAL_ROLES = [
  { key:'meta',  label:'Meta',  color:'#e879f9', states:['idle','review','adjust','approved'], icons:{idle:'MT',review:'…',adjust:'!',approved:'✓'}, labels:{idle:'Sin revisar',review:'En revisión',adjust:'Ajustes',approved:'Aprobado'} },
  { key:'gut',   label:'Gut',   color:'#60a5fa', states:['idle','review','adjust','approved'], icons:{idle:'GT',review:'…',adjust:'!',approved:'✓'}, labels:{idle:'Sin revisar',review:'En revisión',adjust:'Ajustes',approved:'Aprobado'} },
  { key:'primo', label:'Primo', color:'#4ade80', states:['idle','received','wip','delivered'],  icons:{idle:'PR',received:'↓',wip:'⚙',delivered:'✓'}, labels:{idle:'Sin recibir',received:'Recibido',wip:'En proceso',delivered:'Entregados'} },
]
const SOURCES     = [{key:'meta',label:'Meta',color:'#e879f9'},{key:'gut',label:'Gut',color:'#60a5fa'},{key:'primo',label:'Primo',color:'#4ade80'}]
const SC          = {pendiente:'#60a5fa',cambios:'#fb923c',aprobado:'#4ade80'}
const SL          = {pendiente:'En revisión',cambios:'Con ajustes',aprobado:'Aprobado'}
const SCYCLE      = {pendiente:'cambios',cambios:'aprobado',aprobado:'pendiente'}
const ACOL        = {edit:'#a78bfa',color:'#f472b6',audio:'#34d399',online:'#fbbf24',vfx:'#f97316',general:'#60a5fa'}
const ALBL        = {edit:'Edición',color:'Color',audio:'Audio',online:'Online',vfx:'VFX',general:'General'}

const css = `
@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:wght@300;400;500;600;700&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--bg:#0a0a0a;--sf:#141414;--s2:#1a1a1a;--bd:#252525;--b2:#303030;--ac:#c8f135;--ad:rgba(200,241,53,0.1);--tx:#eaeaea;--mu:#4a4a4a;--mi:#777}
body{font-family:'DM Sans',sans-serif;background:var(--bg);color:var(--tx);min-height:100vh}
input,textarea,select,button{font-family:inherit}
textarea{resize:vertical}
button{cursor:pointer}
.aw{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}
.ab{background:var(--sf);border:1px solid var(--bd);border-radius:16px;padding:44px 40px;width:380px}
.alo{font-size:10px;font-family:'DM Mono',monospace;color:var(--ac);letter-spacing:.18em;text-transform:uppercase;margin-bottom:8px}
.ati{font-size:22px;font-weight:700;letter-spacing:-.03em;margin-bottom:6px}
.asu{font-size:13px;color:var(--mi);margin-bottom:28px}
.al{font-size:10px;font-family:'DM Mono',monospace;color:var(--mu);text-transform:uppercase;letter-spacing:.1em;display:block;margin-bottom:6px}
.ai{width:100%;background:var(--s2);border:1px solid var(--b2);border-radius:8px;padding:11px 14px;color:var(--tx);font-size:14px;margin-bottom:14px}
.ai:focus{outline:none;border-color:var(--ac)}
.abtn{width:100%;background:var(--ac);color:#000;border:none;padding:12px;border-radius:8px;font-size:14px;font-weight:700;margin-top:4px}
.abtn:hover{opacity:.9}
.aerr{font-size:12px;color:#f87171;margin-top:10px;text-align:center}
.aok{font-size:12px;color:#4ade80;margin-top:10px;text-align:center}
.afg{font-size:11px;text-align:right;margin-top:-8px;margin-bottom:12px}
.afg button,.atg button{background:none;border:none;color:var(--ac);font-size:11px;text-decoration:underline;padding:0}
.atg{font-size:12px;color:var(--mi);text-align:center;margin-top:16px}

.shell{display:flex;min-height:100vh}
.sb{width:220px;background:var(--sf);border-right:1px solid var(--bd);display:flex;flex-direction:column;flex-shrink:0;position:fixed;top:0;left:0;height:100vh;z-index:10}
.sb-logo{padding:20px 18px;border-bottom:1px solid var(--bd)}
.sb-tag{font-size:9px;font-family:'DM Mono',monospace;color:var(--ac);letter-spacing:.15em;text-transform:uppercase}
.sb-nm{font-size:15px;font-weight:700;letter-spacing:-.02em;margin-top:2px}
.sb-nav{flex:1;padding:12px 8px;overflow-y:auto}
.sb-sec{font-size:9px;font-family:'DM Mono',monospace;color:var(--mu);text-transform:uppercase;letter-spacing:.12em;padding:8px 10px 6px}
.ni{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:6px;font-size:13px;color:var(--mi);transition:all .15s;border:none;background:none;width:100%;text-align:left}
.ni:hover{background:var(--s2);color:var(--tx)}
.ni.active{background:var(--ad);color:var(--ac)}
.nd{width:6px;height:6px;border-radius:50%;flex-shrink:0}
.sb-u{padding:14px 18px;border-top:1px solid var(--bd)}
.sb-un{font-size:13px;font-weight:500}
.sb-ur{font-size:10px;font-family:'DM Mono',monospace;margin-top:2px}
.sb-out{background:none;border:none;font-size:11px;color:var(--mu);margin-top:8px;padding:0;display:block}
.sb-out:hover{color:var(--tx)}

.main{margin-left:220px;flex:1;min-height:100vh;display:flex;flex-direction:column}
.topbar{display:flex;align-items:center;justify-content:space-between;padding:16px 28px;border-bottom:1px solid var(--bd);background:var(--sf);position:sticky;top:0;z-index:5}
.tt{font-size:16px;font-weight:600;letter-spacing:-.02em}
.tm{display:flex;align-items:center;gap:10px}
.ca{display:flex;flex:1;min-height:0}
.page{padding:28px;flex:1;overflow-y:auto;max-height:calc(100vh - 57px)}

.dg{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;margin-top:4px}
.pc{background:var(--sf);border:1px solid var(--bd);border-radius:10px;padding:20px;cursor:pointer;transition:all .2s}
.pc:hover{border-color:var(--b2);transform:translateY(-1px)}
.pct{font-size:9px;font-family:'DM Mono',monospace;color:var(--ac);letter-spacing:.12em;text-transform:uppercase;margin-bottom:8px}
.pcn{font-size:16px;font-weight:600;letter-spacing:-.02em;margin-bottom:4px}
.pcc{font-size:12px;color:var(--mi);margin-bottom:8px}
.np{background:transparent;border:1px dashed var(--b2);border-radius:10px;padding:20px;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;min-height:120px;transition:all .2s;color:var(--mu)}
.np:hover{border-color:var(--ac);color:var(--ac)}

.ph{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:20px;gap:16px}
.phl h1{font-size:20px;font-weight:700;letter-spacing:-.03em}
.phl p{font-size:13px;color:var(--mi);margin-top:3px}
.phr{display:flex;align-items:center;gap:8px;flex-shrink:0}

.sr{display:flex;gap:8px;margin-bottom:20px}
.sch{display:flex;flex-direction:column;align-items:center;padding:10px 18px;background:var(--sf);border:1px solid var(--bd);border-radius:8px;gap:3px}
.scn{font-family:'DM Mono',monospace;font-size:18px;font-weight:500}
.scl{font-size:9px;font-family:'DM Mono',monospace;color:var(--mu);text-transform:uppercase;letter-spacing:.08em}

.fr{display:flex;align-items:center;gap:8px;margin-bottom:16px;flex-wrap:wrap}
.fl{font-size:10px;font-family:'DM Mono',monospace;color:var(--mu);text-transform:uppercase;letter-spacing:.1em}
.ft{padding:5px 14px;border-radius:20px;border:1px solid var(--bd);background:transparent;color:var(--mu);font-size:11px;font-family:'DM Mono',monospace}
.ft:hover{border-color:#444;color:var(--mi)}
.ft.active{background:var(--ad);border-color:var(--ac);color:var(--ac)}

.pl{display:flex;flex-direction:column;gap:8px}
.pcard{background:var(--sf);border:1px solid var(--bd);border-radius:8px;overflow:hidden}
.phdr{display:flex;align-items:center;padding:12px 16px;cursor:pointer;gap:10px;user-select:none}
.ptag{font-size:9px;font-family:'DM Mono',monospace;background:var(--ad);color:var(--ac);padding:3px 8px;border-radius:3px;letter-spacing:.06em;white-space:nowrap}
.pnm{font-size:14px;font-weight:500;flex:1}
.vbs{display:flex;gap:4px}
.vb{font-size:9px;font-family:'DM Mono',monospace;padding:2px 7px;border-radius:10px;border:1px solid}
.ads{display:flex;gap:3px;align-items:center}
.ad{width:6px;height:6px;border-radius:50%;opacity:.15}
.ad.lit{opacity:1}
.sp{display:flex;align-items:center;gap:5px;padding:4px 11px;border-radius:20px;font-size:11px;font-weight:500;white-space:nowrap;border:none;background:transparent}
.spd{width:5px;height:5px;border-radius:50%;flex-shrink:0}
.cv{color:var(--mu);font-size:10px;transition:transform .2s}
.cv.open{transform:rotate(180deg)}
.pbody{display:none;border-top:1px solid var(--bd)}
.pbody.open{display:block}

.shbar{display:flex;align-items:center;gap:10px;padding:10px 16px;background:var(--s2);border-bottom:1px solid var(--bd)}
.shlbl{font-size:9px;font-family:'DM Mono',monospace;color:var(--mu);text-transform:uppercase;letter-spacing:.1em}
.shbtn{padding:4px 12px;border-radius:20px;border:1px solid var(--b2);background:transparent;color:var(--mu);font-size:10px;font-family:'DM Mono',monospace}
.shbtn.m{border-color:#e879f9;color:#e879f9;background:rgba(232,121,249,.1)}
.shbtn.c{border-color:#4ade80;color:#4ade80;background:rgba(74,222,128,.1)}

.twrap{padding:16px;border-bottom:1px solid var(--bd)}
.tlbl{font-size:9px;font-family:'DM Mono',monospace;color:var(--mu);text-transform:uppercase;letter-spacing:.12em;margin-bottom:14px;display:block}
.thermo{display:flex;align-items:flex-start}
.tc{flex:1;height:2px;margin-top:15px;background:var(--bd)}
.tc.lit{background:#4ade80}
.tn{display:flex;flex-direction:column;align-items:center;gap:6px;min-width:90px}
.tci{width:30px;height:30px;border-radius:50%;border:2px solid var(--bd);background:var(--s2);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;cursor:pointer;font-family:'DM Mono',monospace;flex-shrink:0;color:var(--mu)}
.trl{font-size:10px;font-weight:600}
.tbg{font-size:9px;font-family:'DM Mono',monospace;padding:2px 8px;border-radius:20px;border:1px solid var(--bd);color:var(--mu);background:transparent;cursor:pointer;white-space:nowrap}

.pw{padding:12px 16px 0}
.slbl{font-size:9px;font-family:'DM Mono',monospace;color:var(--mu);text-transform:uppercase;letter-spacing:.12em;margin-bottom:7px;display:block}
.pr{display:flex;gap:6px}
.pb{padding:4px 12px;border-radius:4px;border:1px solid var(--bd);background:transparent;color:var(--mu);font-size:11px}

.ag{display:grid;grid-template-columns:1fr 1fr;gap:1px;background:var(--bd);margin-top:12px;border-top:1px solid var(--bd)}
.as{background:var(--sf);padding:12px 14px}
.ah{display:flex;align-items:center;gap:7px;margin-bottom:7px}
.ads2{width:7px;height:7px;border-radius:50%;flex-shrink:0}
.an{font-size:10px;font-family:'DM Mono',monospace;font-weight:500;text-transform:uppercase;letter-spacing:.1em;flex:1}
.asel{background:var(--s2);border:1px solid var(--bd);border-radius:4px;color:var(--mi);font-size:9px;font-family:'DM Mono',monospace;padding:2px 5px}
.asel option{background:#1a1a1a}
.srcr{display:flex;gap:4px;margin-bottom:7px;align-items:center}
.srclbl{font-size:9px;font-family:'DM Mono',monospace;color:var(--mu);text-transform:uppercase;letter-spacing:.1em}
.srcbtn{padding:2px 9px;border-radius:20px;border:1px solid var(--bd);background:transparent;color:var(--mu);font-size:9px;font-family:'DM Mono',monospace}

.cl{display:flex;flex-direction:column;gap:4px;margin-bottom:8px}
.ci{display:flex;align-items:flex-start;gap:6px;background:#111;border:1px solid var(--bd);border-radius:4px;padding:6px 8px}
.cb{font-size:11px;color:var(--mu);flex-shrink:0;margin-top:1px;user-select:none}
.cin{flex:1;background:transparent;border:none;color:var(--tx);font-family:'DM Sans',sans-serif;font-size:12px;line-height:1.5;outline:none;resize:none;min-height:20px}
.cin::placeholder{color:#333}
.cdl{background:none;border:none;color:var(--mu);font-size:12px;padding:0 2px;flex-shrink:0;opacity:0;line-height:1}
.ci:hover .cdl{opacity:1}
.cdl:hover{color:#f87171}
.acb{display:flex;align-items:center;gap:5px;background:none;border:1px dashed var(--bd);border-radius:4px;color:var(--mu);font-size:10px;font-family:'DM Mono',monospace;padding:5px 10px;width:100%;letter-spacing:.05em}
.acb:hover{border-color:var(--b2);color:var(--mi)}

.vw{padding:12px 14px;border-top:1px solid var(--bd)}
.vh{display:flex;align-items:center;gap:8px;margin-bottom:8px}

.hw{padding:12px 16px;border-top:1px solid var(--bd)}
.htg{background:none;border:none;color:var(--mu);font-size:10px;font-family:'DM Mono',monospace;padding:0;letter-spacing:.08em;text-transform:uppercase}
.hl{margin-top:8px;display:none}
.hl.open{display:block}
.hr{display:flex;gap:8px;padding:6px 0;border-bottom:1px solid var(--bd)}
.hr:last-child{border-bottom:none}
.hrn{font-size:9px;font-family:'DM Mono',monospace;color:var(--mu);white-space:nowrap;min-width:38px}
.hrt{font-size:11px;color:var(--mi);line-height:1.5;flex:1}

.mw{margin-top:24px}
.mt{font-size:10px;font-family:'DM Mono',monospace;color:var(--mu);text-transform:uppercase;letter-spacing:.12em;margin-bottom:12px;display:block}
.mr{display:flex;align-items:center;gap:10px;padding:8px 12px;background:var(--sf);border:1px solid var(--bd);border-radius:6px;margin-bottom:6px}
.mav{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0}
.mn{font-size:13px;font-weight:500;flex:1}
.me{font-size:11px;color:var(--mi)}
.mrl{font-size:9px;font-family:'DM Mono',monospace;padding:3px 8px;border-radius:10px;border:1px solid}

.sw{margin-top:28px;padding-top:20px;border-top:1px solid var(--bd)}
.sc2{background:var(--sf);border:1px solid var(--bd);border-radius:6px;margin-bottom:8px;overflow:hidden}
.sh2{display:flex;align-items:center;padding:10px 14px;cursor:pointer;gap:10px}
.sr2{font-size:11px;font-family:'DM Mono',monospace;color:var(--ac)}
.sf2{font-size:11px;color:var(--mu);flex:1}
.sb2{display:none;padding:12px 14px;border-top:1px solid var(--bd)}
.sb2.open{display:block}

.pf{margin-top:24px;padding-top:20px;border-top:1px solid var(--bd)}
.nta{width:100%;background:#111;border:1px solid var(--bd);border-radius:6px;padding:10px 12px;color:var(--tx);font-family:'DM Sans',sans-serif;font-size:13px;min-height:56px;margin-top:6px;margin-bottom:14px}
.nta:focus{outline:none;border-color:var(--ac)}
.nta::placeholder{color:#333;font-size:12px}
.br{display:flex;gap:8px;flex-wrap:wrap}
.bp{background:var(--ac);color:#000;border:none;padding:9px 20px;border-radius:6px;font-size:13px;font-weight:700}
.bp:hover{opacity:.9}
.ba{background:transparent;color:var(--ac);border:1px solid rgba(200,241,53,.3);padding:9px 20px;border-radius:6px;font-size:13px}
.ba:hover{background:rgba(200,241,53,.08)}
.si{font-size:10px;font-family:'DM Mono',monospace;color:var(--mu)}

.tp{width:290px;flex-shrink:0;background:var(--sf);border-left:1px solid var(--bd);display:flex;flex-direction:column;position:sticky;top:57px;height:calc(100vh - 57px);overflow:hidden}
.tph{padding:14px 14px 10px;border-bottom:1px solid var(--bd);flex-shrink:0}
.tpt{font-size:10px;font-family:'DM Mono',monospace;color:var(--ac);text-transform:uppercase;letter-spacing:.15em;display:block;margin-bottom:6px}
.tpcs{display:flex;gap:6px}
.tpch{font-size:10px;font-family:'DM Mono',monospace;padding:2px 8px;border-radius:10px}
.tpl{flex:1;overflow-y:auto;padding:10px 12px}
.tpg{margin-bottom:14px}
.tpgl{font-size:9px;font-family:'DM Mono',monospace;color:var(--mu);text-transform:uppercase;letter-spacing:.1em;margin-bottom:6px;display:flex;align-items:center;gap:6px}
.tpgd{width:5px;height:5px;border-radius:50%;flex-shrink:0}
.tpi{display:flex;align-items:flex-start;gap:8px;padding:6px 8px;border-radius:5px;margin-bottom:3px}
.tpi:hover{background:var(--s2)}
.tpck{width:16px;height:16px;border-radius:4px;border:1px solid var(--b2);background:transparent;flex-shrink:0;margin-top:1px;display:flex;align-items:center;justify-content:center;font-size:9px;color:transparent}
.tpck.done{background:var(--ac);border-color:var(--ac);color:#000}
.tptx{font-size:11px;color:var(--tx);line-height:1.5;flex:1}
.tptx.done{color:var(--mu);text-decoration:line-through}
.tpat{font-size:9px;font-family:'DM Mono',monospace;padding:1px 6px;border-radius:3px;flex-shrink:0;margin-top:2px}
.tpem{text-align:center;padding:24px 14px;color:var(--mu);font-size:11px;line-height:1.6}
.tpad{padding:10px 12px;border-top:1px solid var(--bd);flex-shrink:0}
.tpin{width:100%;background:var(--s2);border:1px solid var(--bd);border-radius:5px;padding:7px 10px;color:var(--tx);font-size:12px;margin-bottom:6px}
.tpin:focus{outline:none;border-color:var(--ac)}
.tpab{width:100%;background:var(--ad);color:var(--ac);border:1px solid rgba(200,241,53,.2);border-radius:5px;padding:7px;font-size:11px;font-family:'DM Mono',monospace;letter-spacing:.05em}
.tpab:hover{background:rgba(200,241,53,.15)}

.mo{position:fixed;inset:0;background:rgba(0,0,0,.7);display:flex;align-items:center;justify-content:center;z-index:100;padding:20px}
.md{background:var(--sf);border:1px solid var(--b2);border-radius:12px;padding:28px;width:100%;max-width:480px;max-height:90vh;overflow-y:auto}
.mdt{font-size:16px;font-weight:600;letter-spacing:-.02em;margin-bottom:20px}
.mdl{font-size:10px;font-family:'DM Mono',monospace;color:var(--mu);text-transform:uppercase;letter-spacing:.1em;display:block;margin-bottom:6px;margin-top:14px}
.mdi{width:100%;background:var(--s2);border:1px solid var(--b2);border-radius:6px;padding:9px 12px;color:var(--tx);font-size:13px}
.mdi:focus{outline:none;border-color:var(--ac)}
.mds{width:100%;background:var(--s2);border:1px solid var(--b2);border-radius:6px;padding:9px 12px;color:var(--tx);font-size:13px}
.mds option{background:var(--s2)}
.mdb{display:flex;gap:8px;margin-top:20px}
.mbok{flex:1;background:var(--ac);color:#000;border:none;padding:10px;border-radius:6px;font-size:13px;font-weight:700}
.mbok:hover{opacity:.9}
.mbca{flex:1;background:transparent;color:var(--mi);border:1px solid var(--b2);padding:10px;border-radius:6px;font-size:13px}
.mbca:hover{border-color:#555;color:var(--tx)}

.es{text-align:center;padding:60px 20px;color:var(--mu)}
.es h3{font-size:16px;color:var(--tx);margin-bottom:8px}
.es p{font-size:13px;line-height:1.6}
@media(max-width:700px){.sb{display:none}.main{margin-left:0}.ag{grid-template-columns:1fr}.tp{display:none}}
`

function initials(n) { return (n||'?').split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2) }
function fbToItems(fb) {
  if (fb === null || fb === undefined || fb === '') return []
  return fb.split('\n').map((l, i) => ({id: i, text: l.replace(/^[·•\-]\s*/, '')}))
}
function itemsToFb(items) { return items.map(i=>i.text).join('\n') }

export default function Platform() {
  const [user,setUser]               = useState(null)
  const [prof,setProf]               = useState(null)
  const [aMode,setAMode]             = useState('login')
  const [email,setEmail]             = useState('')
  const [pw,setPw]                   = useState('')
  const [nm,setNm]                   = useState('')
  const [rl,setRl]                   = useState('agencia')
  const [aErr,setAErr]               = useState('')
  const [aOk,setAOk]                 = useState('')
  const [aLd,setALd]                 = useState(false)
  const [view,setView]               = useState('dashboard')
  const [ap,setAp]                   = useState(null)
  const [projs,setProjs]             = useState([])
  const [snwp,setSnwp]               = useState(false)
  const [npn,setNpn]                 = useState('')
  const [npc,setNpc]                 = useState('')
  const [pieces,setPieces]           = useState([])
  const [fb,setFb]                   = useState({})
  const [approvs,setApprovs]         = useState({})
  const [vis,setVis]                 = useState({})
  const [mbrs,setMbrs]               = useState([])
  const [snaps,setSnaps]             = useState([])
  const [pn,setPn]                   = useState({notas:'',fecha:'',ronda:''})
  const [todos,setTodos]             = useState([])
  const [ntxt,setNtxt]               = useState('')
  const [oc,setOc]                   = useState({})
  const [oh,setOh]                   = useState({})
  const [os,setOs]                   = useState({})
  const [flt,setFlt]                 = useState('all')
  const [sv,setSv]                   = useState('idle')
  const [snwm,setSnwm]               = useState(false)
  const [nme,setNme]                 = useState('')
  const [nmn,setNmn]                 = useState('')
  const [nmr,setNmr]                 = useState('agencia')
  const [snwpc,setSnwpc]             = useState(false)
  const [nptag,setNptag]             = useState('')
  const [npnm,setNpnm]               = useState('')
  const [npgr,setNpgr]               = useState('')

  const canEdit   = true
  const canShare  = prof?.role==='productor'||prof?.role==='agencia'
  const canManage = prof?.role==='productor'

  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>{ if(session) loadUser(session.user) })
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_,session)=>{
      if(session) loadUser(session.user)
      else { setUser(null); setProf(null) }
    })
    return ()=>subscription.unsubscribe()
  },[])

  async function loadUser(u) {
    setUser(u)
    const {data}=await supabase.from('users').select('*').eq('id',u.id).single()
    if(data) setProf(data)
    const {data:pm}=await supabase.from('project_members').select('project_id, projects(*)').eq('user_id',u.id)
    if(pm) setProjs(pm.map(d=>d.projects).filter(Boolean))
  }

  async function doAuth() {
    setALd(true); setAErr(''); setAOk('')
    if(aMode==='forgot') {
      const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:window.location.origin})
      if(error) setAErr('No pudimos enviar el correo.')
      else setAOk('Revisa tu correo para restablecer tu contraseña.')
      setALd(false); return
    }
    if(aMode==='register') {
      const {data,error}=await supabase.auth.signUp({email,password:pw})
      if(error) { setAErr(error.message); setALd(false); return }
      if(data.user) await supabase.from('users').insert({id:data.user.id,email,name:nm,role:rl})
    } else {
      const {error}=await supabase.auth.signInWithPassword({email,password:pw})
      if(error) { setAErr('Email o contraseña incorrectos'); setALd(false); return }
    }
    setALd(false)
  }

  async function logout() {
    await supabase.auth.signOut(); setView('dashboard'); setAp(null)
  }

  async function createProj() {
    if(!npn.trim()) return
    const {data:p}=await supabase.from('projects').insert({name:npn,client:npc,productor_id:user.id}).select().single()
    if(p) {
      await supabase.from('project_members').insert({project_id:p.id,user_id:user.id,role:'productor'})
      setProjs(x=>[...x,p]); setSnwp(false); setNpn(''); setNpc('')
    }
  }

  async function openProj(p) {
    setPieces([]); setFb({}); setApprovs({}); setVis({}); setMbrs([]); setSnaps([]); setTodos([])
    setAp(p); setView('project'); setFlt('all'); setOc({})
    setPn({notas:'',fecha:'',ronda:''})
    const [pcs,mbs,sps,notes,tds]=await Promise.all([
      supabase.from('pieces').select('*').eq('project_id',p.id).order('position'),
      supabase.from('project_members').select('*, users(*)').eq('project_id',p.id),
      supabase.from('snapshots').select('*').eq('project_id',p.id).order('created_at',{ascending:false}),
      supabase.from('project_notes').select('*').eq('project_id',p.id).single(),
      supabase.from('todos').select('*').eq('project_id',p.id).order('created_at'),
    ])
    const pl=pcs.data||[]
    setPieces(pl)
    if(mbs.data) setMbrs(mbs.data.map(d=>({...d.users,memberRole:d.role})))
    if(sps.data) setSnaps(sps.data)
    if(notes.data) setPn({notas:notes.data.notas||'',fecha:notes.data.fecha||'',ronda:notes.data.ronda||''})
    if(tds.data) setTodos(tds.data)
    if(!pl.length) return
    const ids=pl.map(x=>x.id)
    const [fbs,apps,vs]=await Promise.all([
      supabase.from('piece_feedback').select('*').in('piece_id',ids),
      supabase.from('piece_approvals').select('*').in('piece_id',ids),
      supabase.from('piece_visibility').select('*').in('piece_id',ids),
    ])
    const fm={}; fbs.data?.forEach(f=>{ if(!fm[f.piece_id]) fm[f.piece_id]={}; fm[f.piece_id][f.area]={feedback:f.feedback,status:f.status,sources:f.sources||[]} }); setFb(fm)
    const am={}; apps.data?.forEach(a=>{ if(!am[a.piece_id]) am[a.piece_id]={}; am[a.piece_id][a.role]=a.state }); setApprovs(am)
    const vm={}; vs.data?.forEach(v=>{ vm[v.piece_id]={marca:v.visible_to_marca,casa:v.visible_to_casa} }); setVis(vm)
  }

  async function upStatus(pid,status) {
    if(!canEdit) return
    await supabase.from('pieces').update({status}).eq('id',pid)
    setPieces(p=>p.map(x=>x.id===pid?{...x,status}:x))
  }
  async function upPriority(pid,priority) {
    if(!canEdit) return
    const np=pieces.find(p=>p.id===pid)?.priority===priority?null:priority
    await supabase.from('pieces').update({priority:np}).eq('id',pid)
    setPieces(p=>p.map(x=>x.id===pid?{...x,priority:np}:x))
  }
  async function upApproval(pid,rk) {
    if(!canEdit) return
    const r=APPROVAL_ROLES.find(x=>x.key===rk)
    const cur=approvs[pid]?.[rk]||'idle'
    const nxt=r.states[(r.states.indexOf(cur)+1)%r.states.length]
    setApprovs(a=>({...a,[pid]:{...a[pid],[rk]:nxt}}))
    await supabase.from('piece_approvals').upsert({piece_id:pid,role:rk,state:nxt},{onConflict:'piece_id,role'})
  }
  async function upFb(pid,area,field,value) {
    if(!canEdit) return
    const cur=fb[pid]?.[area]||{feedback:'',status:'pendiente',sources:[]}
    const upd={...cur,[field]:value}
    setFb(f=>({...f,[pid]:{...f[pid],[area]:upd}}))
    setSv('saving')
    clearTimeout(window._st)
    window._st=setTimeout(async()=>{
      // Check if record exists
      const {data:existing}=await supabase.from('piece_feedback').select('id').eq('piece_id',pid).eq('area',area).single()
      if(existing?.id) {
        await supabase.from('piece_feedback').update({feedback:upd.feedback,status:upd.status,sources:upd.sources,updated_at:new Date().toISOString()}).eq('id',existing.id)
      } else {
        await supabase.from('piece_feedback').insert({piece_id:pid,area,feedback:upd.feedback,status:upd.status,sources:upd.sources})
      }
      setSv('saved'); setTimeout(()=>setSv('idle'),2000)
    },1000)
  }
  async function togSrc(pid,area,src) {
    if(!canEdit) return
    const cur=fb[pid]?.[area]?.sources||[]
    upFb(pid,area,'sources',cur.includes(src)?cur.filter(s=>s!==src):[...cur,src])
  }
  async function togVis(pid,target) {
    if(!canShare) return
    const cur=vis[pid]||{marca:false,casa:false}
    const nxt={...cur,[target]:!cur[target]}
    setVis(v=>({...v,[pid]:nxt}))
    await supabase.from('piece_visibility').upsert({piece_id:pid,visible_to_marca:nxt.marca,visible_to_casa:nxt.casa},{onConflict:'piece_id'})
  }
  async function upNotes(field,value) {
    const nxt={...pn,[field]:value}; setPn(nxt)
    clearTimeout(window._nt)
    window._nt=setTimeout(async()=>{ await supabase.from('project_notes').upsert({project_id:ap.id,...nxt},{onConflict:'project_id'}) },1000)
  }

  function addCmt(pieceId, area) {
    const cur = fbToItems(fb[pieceId]?.[area]?.feedback || '')
    const next = [...cur, { id: Date.now(), text: '' }]
    setFb(f => ({ ...f, [pieceId]: { ...f[pieceId], [area]: { ...(f[pieceId]?.[area] || { status: 'pendiente', sources: [] }), feedback: itemsToFb(next) } } }))
  }

  function upCmt(pieceId, area, idx, value) {
    const cur = fbToItems(fb[pieceId]?.[area]?.feedback || '')
    const updated = cur.map((c, i) => i === idx ? { ...c, text: value } : c)
    const newFeedback = itemsToFb(updated)
    const curStatus = fb[pieceId]?.[area]?.status || 'pendiente'
    const curSources = fb[pieceId]?.[area]?.sources || []
    setFb(f => ({ ...f, [pieceId]: { ...f[pieceId], [area]: { status: curStatus, sources: curSources, feedback: newFeedback } } }))
    setSv('saving')
    clearTimeout(window._st)
    window._st = setTimeout(async () => {
      const { data: ex } = await supabase.from('piece_feedback').select('id').eq('piece_id', pieceId).eq('area', area).single()
      if (ex?.id) await supabase.from('piece_feedback').update({ feedback: newFeedback, status: curStatus, sources: curSources }).eq('id', ex.id)
      else await supabase.from('piece_feedback').insert({ piece_id: pieceId, area, feedback: newFeedback, status: curStatus, sources: curSources })
      setSv('saved'); setTimeout(() => setSv('idle'), 2000)
      const piece = pieces.find(p => p.id === pieceId)
      if (piece && ap) syncTodos(pieceId, piece.name, area, updated)
    }, 1000)
  }

  function delCmt(pieceId, area, idx) {
    const cur = fbToItems(fb[pieceId]?.[area]?.feedback || '')
    cur.splice(idx, 1)
    setFb(f => ({ ...f, [pieceId]: { ...f[pieceId], [area]: { ...(f[pieceId]?.[area] || { status: 'pendiente', sources: [] }), feedback: itemsToFb(cur) } } }))
  }

  async function syncTodos(pid,pname,area,items) {
    const ex=todos.filter(t=>t.piece_id===pid&&t.area===area).map(t=>t.text)
    const ni=items.filter(i=>i.text.trim()&&!ex.includes(i.text.trim()))
    if(!ni.length) return
    const {data}=await supabase.from('todos').insert(ni.map(i=>({project_id:ap.id,piece_id:pid,piece_name:pname,area,text:i.text.trim()}))).select()
    if(data) setTodos(t=>[...t,...data])
  }
  async function togTodo(id) {
    if(!canManage) return
    const td=todos.find(t=>t.id===id); const nxt=!td.completed
    setTodos(t=>t.map(x=>x.id===id?{...x,completed:nxt,completed_at:nxt?new Date().toISOString():null}:x))
    await supabase.from('todos').update({completed:nxt,completed_at:nxt?new Date().toISOString():null}).eq('id',id)
  }
  async function addTodo() {
    if(!ntxt.trim()||!canManage) return
    const {data}=await supabase.from('todos').insert({project_id:ap.id,text:ntxt.trim(),piece_name:'General',area:'general'}).select().single()
    if(data) setTodos(t=>[...t,data]); setNtxt('')
  }

  async function addMbr() {
    if(!nme.trim()) return
    let {data:eu}=await supabase.from('users').select('*').eq('email',nme).single()
    if(!eu) { const {data:nu}=await supabase.from('users').insert({email:nme,name:nmn,role:nmr}).select().single(); eu=nu }
    if(eu) {
      await supabase.from('project_members').upsert({project_id:ap.id,user_id:eu.id,role:nmr},{onConflict:'project_id,user_id'})
      setMbrs(m=>[...m.filter(x=>x.id!==eu.id),{...eu,memberRole:nmr}])
    }
    setSnwm(false); setNme(''); setNmn(''); setNmr('agencia')
  }
  async function addPiece() {
    if(!npnm.trim()||!nptag.trim()) return
    const {data}=await supabase.from('pieces').insert({project_id:ap.id,tag:nptag.toUpperCase(),name:npnm,group_name:npgr.toLowerCase()||nptag.toLowerCase(),position:pieces.length+1,status:'pendiente'}).select().single()
    if(data) setPieces(p=>[...p,data])
    setSnwpc(false); setNptag(''); setNpnm(''); setNpgr('')
  }
  async function closeRound() {
    if(!confirm(`¿Cerrar la ronda "${pn.ronda||'actual'}"?`)) return
    const snap={project_id:ap.id,ronda:pn.ronda||'Sin nombre',fecha:pn.fecha||new Date().toLocaleDateString('es-MX'),notas:pn.notas,data:{pieces,feedback:fb,approvals:approvs,visibility:vis}}
    const {data}=await supabase.from('snapshots').insert(snap).select().single()
    if(data) setSnaps(s=>[data,...s])
    alert(`Ronda "${snap.ronda}" guardada.`)
  }

  const vp=pieces.filter(p=>{
    if(!prof) return false
    if(prof.role==='marca') return vis[p.id]?.marca
    if(prof.role==='casa_productora') return vis[p.id]?.casa
    return true
  }).filter(p=>flt==='all'||p.group_name===flt)

  const grps=[...new Set(pieces.map(p=>p.group_name).filter(Boolean))]
  const cnts={pendiente:0,cambios:0,aprobado:0}
  vp.forEach(p=>{ cnts[p.status]++ })

  if(!user) return (
    <>
      <Head><title>Roundtable</title><style>{css}</style></Head>
      <div className="aw">
        <div className="ab">
          <p className="alo">Roundtable</p>
          <h1 className="ati">{aMode==='login'?'Bienvenida':aMode==='register'?'Crear cuenta':'Recuperar contraseña'}</h1>
          <p className="asu">{aMode==='login'?'Entra con tus credenciales':aMode==='register'?'Completa tu perfil':'Te enviaremos un link a tu correo'}</p>
          {aMode==='register'&&(<>
            <label className="al">Nombre completo</label>
            <input className="ai" type="text" placeholder="Tu nombre" value={nm} onChange={e=>setNm(e.target.value)}/>
            <label className="al">Rol</label>
            <select className="ai" value={rl} onChange={e=>setRl(e.target.value)} style={{cursor:'pointer'}}>
              <option value="productor">Productor</option>
              <option value="agencia">Agencia</option>
              <option value="marca">Marca</option>
              <option value="casa_productora">Casa Productora</option>
            </select>
          </>)}
          <label className="al">Email</label>
          <input className="ai" type="email" placeholder="tu@email.com" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==='Enter'&&doAuth()}/>
          {aMode!=='forgot'&&(<>
            <label className="al">Contraseña</label>
            <input className="ai" type="password" placeholder="••••••••" value={pw} onChange={e=>setPw(e.target.value)} onKeyDown={e=>e.key==='Enter'&&doAuth()}/>
          </>)}
          {aMode==='login'&&<p className="afg"><button onClick={()=>{setAMode('forgot');setAErr('');setAOk('')}}>¿Olvidaste tu contraseña?</button></p>}
          <button className="abtn" onClick={doAuth} disabled={aLd}>{aLd?'Cargando...':aMode==='login'?'Entrar':aMode==='register'?'Crear cuenta':'Enviar link'}</button>
          {aErr&&<p className="aerr">{aErr}</p>}
          {aOk&&<p className="aok">{aOk}</p>}
          <p className="atg">
            {aMode==='forgot'?(
              <button onClick={()=>{setAMode('login');setAErr('');setAOk('')}}>← Volver al login</button>
            ):aMode==='login'?(
              <>¿No tienes cuenta? <button onClick={()=>{setAMode('register');setAErr('');setAOk('')}}>Regístrate</button></>
            ):(
              <>¿Ya tienes cuenta? <button onClick={()=>{setAMode('login');setAErr('');setAOk('')}}>Inicia sesión</button></>
            )}
          </p>
        </div>
      </div>
    </>
  )

  const pending=todos.filter(t=>!t.completed)
  const done=todos.filter(t=>t.completed)
  const tgroups={}
  pending.forEach(t=>{ const k=t.piece_name||'General'; if(!tgroups[k]) tgroups[k]=[]; tgroups[k].push(t) })

  return (
    <>
      <Head><title>Roundtable</title><style>{css}</style></Head>
      <div className="shell">
        <div className="sb">
          <div className="sb-logo">
            <p className="sb-tag">Roundtable</p>
            <p className="sb-nm">Dashboard</p>
          </div>
          <nav className="sb-nav">
            <p className="sb-sec">Proyectos</p>
            <button className={`ni ${view==='dashboard'?'active':''}`} onClick={()=>{setView('dashboard');setAp(null)}}>
              <span className="nd" style={{background:'var(--ac)'}}/>Todos los proyectos
            </button>
            {projs.map(p=>(
              <button key={p.id} className={`ni ${ap?.id===p.id?'active':''}`} onClick={()=>openProj(p)}>
                <span className="nd" style={{background:'#60a5fa'}}/>{p.name}
              </button>
            ))}
            {canManage&&<button className="ni" onClick={()=>setSnwp(true)} style={{color:'var(--ac)',opacity:.7}}><span style={{fontSize:'14px'}}>+</span> Nuevo proyecto</button>}
          </nav>
          <div className="sb-u">
            <p className="sb-un">{prof?.name||user.email}</p>
            <p className="sb-ur" style={{color:ROLES[prof?.role]?.color||'var(--mu)'}}>{ROLES[prof?.role]?.label||''}</p>
            <button className="sb-out" onClick={logout}>Cerrar sesión</button>
          </div>
        </div>

        <div className="main">
          <div className="topbar">
            <span className="tt">{view==='dashboard'?'Mis proyectos':ap?.name}</span>
            <div className="tm">
              {sv==='saving'&&<span className="si" style={{color:'var(--ac)'}}>● Guardando…</span>}
              {sv==='saved'&&<span className="si" style={{color:'#4ade80'}}>✓ Guardado</span>}
            </div>
          </div>

          <div className="ca">
            <div className="page">

              {view==='dashboard'&&(
                <div className="dg">
                  {projs.map(p=>(
                    <div key={p.id} className="pc" onClick={()=>openProj(p)}>
                      <p className="pct">Proyecto activo</p>
                      <h2 className="pcn">{p.name}</h2>
                      <p className="pcc">{p.client}</p>
                    </div>
                  ))}
                  {canManage&&(
                    <button className="np" onClick={()=>setSnwp(true)}>
                      <span style={{fontSize:'24px'}}>+</span>
                      <span style={{fontSize:'12px',fontFamily:'DM Mono,monospace',textTransform:'uppercase',letterSpacing:'.08em'}}>Nuevo proyecto</span>
                    </button>
                  )}
                  {!projs.length&&!canManage&&<div className="es"><h3>Sin proyectos asignados</h3><p>El productor te agregará pronto.</p></div>}
                </div>
              )}

              {view==='project'&&ap&&(
                <>
                  <div className="ph">
                    <div className="phl"><h1>{ap.name}</h1><p>{ap.client}</p></div>
                    <div className="phr">
                      {canEdit&&(<>
                        <input className="mdi" style={{width:'110px'}} placeholder="Fecha" value={pn.fecha} onChange={e=>upNotes('fecha',e.target.value)}/>
                        <input className="mdi" style={{width:'90px'}} placeholder="Ronda" value={pn.ronda} onChange={e=>upNotes('ronda',e.target.value)}/>
                      </>)}
                    </div>
                  </div>

                  <div className="sr">
                    {Object.entries(SL).map(([s,l])=>(
                      <div key={s} className="sch">
                        <span className="scn" style={{color:SC[s]}}>{cnts[s]||0}</span>
                        <span className="scl">{l}</span>
                      </div>
                    ))}
                  </div>

                  <div className="fr">
                    <span className="fl">Filtrar</span>
                    <button className={`ft ${flt==='all'?'active':''}`} onClick={()=>setFlt('all')}>Todas</button>
                    {grps.map(g=><button key={g} className={`ft ${flt===g?'active':''}`} onClick={()=>setFlt(g)}>{g}</button>)}
                  </div>

                  <div className="pl">
                    {vp.length===0&&(
                      <div className="es">
                        <h3>Sin piezas</h3>
                        <p>{canManage?'Agrega las piezas de este proyecto.':'No hay piezas compartidas contigo aún.'}</p>
                        {canManage&&<button className="bp" style={{marginTop:'16px'}} onClick={()=>setSnwpc(true)}>+ Agregar pieza</button>}
                      </div>
                    )}
                    {vp.map(piece=>{
                      const isO=!!oc[piece.id]
                      const isH=!!oh[piece.id]
                      const pf2=fb[piece.id]||{}
                      const pv2=vis[piece.id]||{marca:false,casa:false}
                      const sc2=SC[piece.status]||'#60a5fa'
                      return (
                        <div key={piece.id} className="pcard">
                          <div className="phdr" onClick={()=>setOc(o=>({...o,[piece.id]:!o[piece.id]}))}>
                            <span className="ptag">{piece.tag}</span>
                            <span className="pnm">{piece.name}</span>
                            {canShare&&(
                              <div className="vbs">
                                {pv2.marca&&<span className="vb" style={{borderColor:'#e879f940',color:'#e879f9',background:'rgba(232,121,249,.08)'}}>Marca</span>}
                                {pv2.casa&&<span className="vb" style={{borderColor:'#4ade8040',color:'#4ade80',background:'rgba(74,222,128,.08)'}}>Casa</span>}
                              </div>
                            )}
                            <div className="ads">
                              {AREAS.map(a=><div key={a.key} className={`ad ${pf2[a.key]?.feedback?.trim().length>0?'lit':''}`} style={{background:a.color}}/>)}
                              <div className={`ad ${pf2.vfx?.feedback?.trim().length>0?'lit':''}`} style={{background:'#f97316'}}/>
                            </div>
                            <button className="sp" onClick={e=>{e.stopPropagation();if(canEdit)upStatus(piece.id,SCYCLE[piece.status])}} style={{background:`${sc2}12`,color:sc2}}>
                              <span className="spd" style={{background:sc2}}/>{SL[piece.status]}
                            </button>
                            <span className={`cv ${isO?'open':''}`}>▼</span>
                          </div>

                          <div className={`pbody ${isO?'open':''}`}>
                            {canShare&&(
                              <div className="shbar">
                                <span className="shlbl">Compartir con</span>
                                <button className={`shbtn ${pv2.marca?'m':''}`} onClick={()=>togVis(piece.id,'marca')}>{pv2.marca?'✓ ':''}Marca</button>
                                <button className={`shbtn ${pv2.casa?'c':''}`} onClick={()=>togVis(piece.id,'casa')}>{pv2.casa?'✓ ':''}Casa Prod.</button>
                              </div>
                            )}

                            <div className="twrap">
                              <span className="tlbl">Flujo de aprobación</span>
                              <div className="thermo">
                                {APPROVAL_ROLES.map((r,i)=>{
                                  const sk=approvs[piece.id]?.[r.key]||'idle'
                                  const rc={idle:'#2e2e2e',review:'#60a5fa',adjust:'#fb923c',approved:'#4ade80',received:'#a78bfa',wip:'#fbbf24',delivered:'#4ade80'}[sk]||'#2e2e2e'
                                  const lit=sk==='approved'||sk==='delivered'
                                  return (
                                    <div key={r.key} style={{display:'flex',alignItems:'flex-start'}}>
                                      <div className="tn">
                                        <div className="tci" onClick={()=>upApproval(piece.id,r.key)} style={{borderColor:sk==='idle'?'#2e2e2e':rc,color:rc,background:sk==='idle'?'var(--s2)':`${rc}18`}}>
                                          {r.icons[sk]||r.icons.idle}
                                        </div>
                                        <span className="trl" style={{color:r.color}}>{r.label}</span>
                                        <span className="tbg" onClick={()=>upApproval(piece.id,r.key)} style={{borderColor:sk==='idle'?'var(--bd)':rc,color:sk==='idle'?'var(--mu)':rc,background:sk==='idle'?'transparent':`${rc}15`}}>
                                          {r.labels[sk]}
                                        </span>
                                      </div>
                                      {i<APPROVAL_ROLES.length-1&&<div className={`tc ${lit?'lit':''}`}/>}
                                    </div>
                                  )
                                })}
                              </div>
                            </div>

                            {canEdit&&(
                              <div className="pw">
                                <span className="slbl">Prioridad</span>
                                <div className="pr">
                                  {[['alta','🔴','#f87171'],['media','🟡','#fb923c'],['baja','🔵','#60a5fa']].map(([p,e,c])=>(
                                    <button key={p} className="pb" onClick={()=>upPriority(piece.id,p)} style={piece.priority===p?{background:`${c}18`,borderColor:c,color:c}:{}}>
                                      {e} {p.charAt(0).toUpperCase()+p.slice(1)}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}

                            <div className="ag">
                              {AREAS.map(a=>{
                                const af=pf2[a.key]||{feedback:'',status:'pendiente',sources:[]}
                                const items=fbToItems(af.feedback)
                                return (
                                  <div key={a.key} className="as">
                                    <div className="ah">
                                      <div className="ads2" style={{background:a.color}}/>
                                      <span className="an" style={{color:a.color}}>{a.label}</span>
                                      {canEdit&&(
                                        <select className="asel" value={af.status} onChange={e=>upFb(piece.id,a.key,'status',e.target.value)}>
                                          <option value="pendiente">Pendiente</option>
                                          <option value="cambios">Cambios</option>
                                          <option value="aprobado">Aprobado</option>
                                          <option value="na">N/A</option>
                                        </select>
                                      )}
                                    </div>
                                    {canEdit&&(
                                      <div className="srcr">
                                        <span className="srclbl">Fuente</span>
                                        {SOURCES.map(s=>(
                                          <button key={s.key} className="srcbtn" onClick={()=>togSrc(piece.id,a.key,s.key)} style={af.sources?.includes(s.key)?{borderColor:s.color,color:s.color,background:`${s.color}15`}:{}}>
                                            {s.label}
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                    <div style={{display:'flex',flexDirection:'column',gap:'4px',marginBottom:'8px'}}>
                                      {fbToItems(af.feedback).map((item, idx) => (
                                        <div key={`${piece.id}-${a.key}-${idx}`} style={{display:'flex',alignItems:'flex-start',gap:'6px',background:'#111',border:'1px solid var(--bd)',borderRadius:'4px',padding:'6px 8px'}}>
                                          <span style={{color:'var(--mu)',flexShrink:0,marginTop:'1px',userSelect:'none'}}>·</span>
                                          <textarea
                                            style={{flex:1,background:'transparent',border:'none',color:'var(--tx)',fontFamily:'DM Sans,sans-serif',fontSize:'12px',lineHeight:'1.5',outline:'none',resize:'none',minHeight:'20px'}}
                                            placeholder="Escribe el comentario..."
                                            defaultValue={item.text}
                                            rows={1}
                                            onBlur={e => upCmt(piece.id, a.key, idx, e.target.value)}
                                            onKeyDown={e => { if(e.key==='Enter'){ e.preventDefault(); const val=e.target.value; upCmt(piece.id, a.key, idx, val); setTimeout(()=>addCmt(piece.id, a.key), 50) } }}
                                          />
                                          <button style={{background:'none',border:'none',color:'var(--mu)',fontSize:'12px',padding:'0 2px',flexShrink:0,cursor:'pointer',lineHeight:1}}
                                            onClick={() => delCmt(piece.id, a.key, idx)}>✕</button>
                                        </div>
                                      ))}
                                    </div>
                                    <button style={{display:'flex',alignItems:'center',gap:'5px',background:'none',border:'1px dashed var(--bd)',borderRadius:'4px',color:'var(--mu)',fontSize:'10px',fontFamily:'DM Mono,monospace',padding:'5px 10px',width:'100%',cursor:'pointer',letterSpacing:'.05em'}}
                                      onClick={() => addCmt(piece.id, a.key)}>+ Agregar comentario</button>
                                  </div>
                                )
                              })}
                            </div>

                            <div className="vw">
                              <div className="vh">
                                <div className="ads2" style={{background:'#f97316'}}/>
                                <span className="an" style={{color:'#f97316',flex:1}}>VFX</span>
                                {canEdit&&(<>
                                  <select className="asel" value={pf2.vfx?.status||'pendiente'} onChange={e=>upFb(piece.id,'vfx','status',e.target.value)}>
                                    <option value="pendiente">Pendiente</option>
                                    <option value="cambios">Cambios</option>
                                    <option value="aprobado">Aprobado</option>
                                    <option value="na">N/A</option>
                                  </select>
                                  <div className="srcr" style={{margin:'0 0 0 8px'}}>
                                    {SOURCES.map(s=>(
                                      <button key={s.key} className="srcbtn" onClick={()=>togSrc(piece.id,'vfx',s.key)} style={pf2.vfx?.sources?.includes(s.key)?{borderColor:s.color,color:s.color,background:`${s.color}15`}:{}}>
                                        {s.label}
                                      </button>
                                    ))}
                                  </div>
                                </>)}
                              </div>
                              <div style={{display:'flex',flexDirection:'column',gap:'4px',marginBottom:'8px'}}>
                                {fbToItems(pf2.vfx?.feedback||'').map((item, idx) => (
                                  <div key={`${piece.id}-vfx-${idx}`} style={{display:'flex',alignItems:'flex-start',gap:'6px',background:'#111',border:'1px solid var(--bd)',borderRadius:'4px',padding:'6px 8px'}}>
                                    <span style={{color:'var(--mu)',flexShrink:0,marginTop:'1px',userSelect:'none'}}>·</span>
                                    <textarea
                                      style={{flex:1,background:'transparent',border:'none',color:'var(--tx)',fontFamily:'DM Sans,sans-serif',fontSize:'12px',lineHeight:'1.5',outline:'none',resize:'none',minHeight:'20px'}}
                                      placeholder="Escribe el comentario..."
                                      defaultValue={item.text}
                                      rows={1}
                                      onBlur={e => upCmt(piece.id, 'vfx', idx, e.target.value)}
                                      onKeyDown={e => { if(e.key==='Enter'){ e.preventDefault(); const val=e.target.value; upCmt(piece.id, 'vfx', idx, val); setTimeout(()=>addCmt(piece.id, 'vfx'), 50) } }}
                                    />
                                    <button style={{background:'none',border:'none',color:'var(--mu)',fontSize:'12px',padding:'0 2px',flexShrink:0,cursor:'pointer',lineHeight:1}}
                                      onClick={() => delCmt(piece.id, 'vfx', idx)}>✕</button>
                                  </div>
                                ))}
                              </div>
                              <button style={{display:'flex',alignItems:'center',gap:'5px',background:'none',border:'1px dashed var(--bd)',borderRadius:'4px',color:'var(--mu)',fontSize:'10px',fontFamily:'DM Mono,monospace',padding:'5px 10px',width:'100%',cursor:'pointer',letterSpacing:'.05em'}}
                                onClick={() => addCmt(piece.id, 'vfx')}>+ Agregar comentario</button>
                            </div>

                            <div className="hw">
                              <button className="htg" onClick={()=>setOh(o=>({...o,[piece.id]:!o[piece.id]}))}>
                                {isH?'▾ Ocultar historial':'▸ Ver historial de rondas'}
                              </button>
                              <div className={`hl ${isH?'open':''}`}>
                                {snaps.length===0&&<p style={{fontSize:'11px',color:'var(--mu)',paddingTop:'6px'}}>Sin historial aún.</p>}
                                {snaps.map(s2=>{
                                  const snapFb = s2.data?.feedback?.[piece.id] || {}
                                  const hasContent = Object.values(snapFb).some(a=>a?.feedback?.trim().length>0)
                                  return (
                                    <div key={s2.id} style={{padding:'8px 0',borderBottom:'1px solid var(--bd)'}}>
                                      <div style={{display:'flex',gap:'8px',marginBottom:'4px'}}>
                                        <span style={{fontSize:'9px',fontFamily:'DM Mono,monospace',color:'var(--mu)',minWidth:'38px'}}>{s2.ronda}</span>
                                        <span style={{fontSize:'11px',color:'var(--mi)'}}>{s2.fecha}</span>
                                      </div>
                                      {hasContent ? Object.entries(snapFb).map(([area,aData])=>{
                                        if(!aData?.feedback?.trim()) return null
                                        return (
                                          <div key={area} style={{marginLeft:'46px',marginBottom:'3px'}}>
                                            <span style={{fontSize:'9px',fontFamily:'DM Mono,monospace',color:ACOL[area]||'var(--mu)',textTransform:'uppercase',letterSpacing:'.08em'}}>{ALBL[area]||area}: </span>
                                            <span style={{fontSize:'11px',color:'var(--mi)'}}>{aData.feedback}</span>
                                          </div>
                                        )
                                      }) : <p style={{marginLeft:'46px',fontSize:'11px',color:'var(--mu)'}}>Sin comentarios en esta ronda.</p>}
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                    {canManage&&vp.length>0&&(
                      <button className="ni" style={{color:'var(--ac)',opacity:.8,marginTop:'8px'}} onClick={()=>setSnwpc(true)}>
                        <span>+</span> Agregar pieza
                      </button>
                    )}
                  </div>

                  {canEdit&&(
                    <div className="pf">
                      <span className="slbl">Notas generales de la ronda</span>
                      <textarea className="nta" placeholder="Observaciones generales..." value={pn.notas} onChange={e=>upNotes('notas',e.target.value)}/>
                      <div className="br">
                        <button className="bp" onClick={closeRound}>Cerrar ronda y guardar historial</button>
                        <button className="ba">Exportar resumen</button>
                      </div>
                    </div>
                  )}

                  {canManage&&(
                    <div className="mw">
                      <span className="mt">Equipo del proyecto</span>
                      {mbrs.map(m=>(
                        <div key={m.id} className="mr">
                          <div className="mav" style={{background:`${ROLES[m.memberRole]?.color||'#555'}20`,color:ROLES[m.memberRole]?.color||'#555'}}>
                            {initials(m.name||m.email)}
                          </div>
                          <div style={{flex:1}}>
                            <p className="mn">{m.name||'—'}</p>
                            <p className="me">{m.email}</p>
                          </div>
                          <span className="mrl" style={{borderColor:`${ROLES[m.memberRole]?.color||'#555'}40`,color:ROLES[m.memberRole]?.color||'#555'}}>
                            {ROLES[m.memberRole]?.label||m.memberRole}
                          </span>
                        </div>
                      ))}
                      <button className="ni" style={{marginTop:'8px',color:'var(--ac)',opacity:.8}} onClick={()=>setSnwm(true)}>
                        <span>+</span> Agregar persona
                      </button>
                    </div>
                  )}

                  {snaps.length>0&&(
                    <div className="sw">
                      <span className="mt">Historial de rondas</span>
                      {snaps.map(s2=>(
                        <div key={s2.id} className="sc2">
                          <div className="sh2" onClick={()=>setOs(o=>({...o,[s2.id]:!o[s2.id]}))}>
                            <span className="sr2">{s2.ronda}</span>
                            <span className="sf2">{s2.fecha}</span>
                            <span style={{color:'var(--mu)',fontSize:'10px'}}>{os[s2.id]?'▲':'▼'}</span>
                          </div>
                          <div className={`sb2 ${os[s2.id]?'open':''}`}>
                            {s2.notas&&<p style={{fontSize:'12px',color:'var(--mi)',fontStyle:'italic',marginBottom:'10px'}}>{s2.notas}</p>}
                            {s2.data?.pieces?.map(p=>{
                              const snapFb = s2.data?.feedback?.[p.id] || {}
                              const hasContent = Object.values(snapFb).some(a=>a?.feedback?.trim().length>0)
                              if(!hasContent) return null
                              return (
                                <div key={p.id} style={{marginBottom:'12px',paddingBottom:'12px',borderBottom:'1px solid var(--bd)'}}>
                                  <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'6px'}}>
                                    <span style={{fontSize:'9px',fontFamily:'DM Mono,monospace',background:'var(--ad)',color:'var(--ac)',padding:'2px 6px',borderRadius:'3px'}}>{p.tag}</span>
                                    <span style={{fontSize:'12px',fontWeight:500}}>{p.name}</span>
                                    <span style={{fontSize:'10px',fontFamily:'DM Mono,monospace',color:SC[p.status]||'var(--mu)',marginLeft:'auto'}}>{SL[p.status]||p.status}</span>
                                  </div>
                                  {Object.entries(snapFb).map(([area, aData])=>{
                                    if(!aData?.feedback?.trim()) return null
                                    return (
                                      <div key={area} style={{marginBottom:'4px'}}>
                                        <span style={{fontSize:'9px',fontFamily:'DM Mono,monospace',color:ACOL[area]||'var(--mu)',textTransform:'uppercase',letterSpacing:'.1em'}}>{ALBL[area]||area}</span>
                                        <p style={{fontSize:'11px',color:'var(--mi)',lineHeight:1.5,marginTop:'2px'}}>{aData.feedback}</p>
                                      </div>
                                    )
                                  })}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {view==='project'&&ap&&(
              <div className="tp">
                <div className="tph">
                  <span className="tpt">Pendientes</span>
                  <div className="tpcs">
                    <span className="tpch" style={{background:'rgba(251,146,60,.1)',color:'#fb923c'}}>{pending.length} pendientes</span>
                    <span className="tpch" style={{background:'rgba(74,222,128,.1)',color:'#4ade80'}}>{done.length} listos</span>
                  </div>
                </div>
                <div className="tpl">
                  {pending.length===0&&done.length===0&&(
                    <div className="tpem">
                      <p>Sin pendientes aún.</p>
                      <p>Los comentarios aparecerán aquí automáticamente.</p>
                    </div>
                  )}
                  {Object.entries(tgroups).map(([pname,items])=>(
                    <div key={pname} className="tpg">
                      <span className="tpgl"><span className="tpgd" style={{background:'var(--ac)'}}/>{pname}</span>
                      {items.map(todo=>(
                        <div key={todo.id} className="tpi">
                          <div className={`tpck ${todo.completed?'done':''}`} onClick={()=>togTodo(todo.id)} style={{cursor:canManage?'pointer':'default'}}>
                            {todo.completed&&'✓'}
                          </div>
                          <span className={`tptx ${todo.completed?'done':''}`}>{todo.text}</span>
                          {todo.area&&todo.area!=='general'&&(
                            <span className="tpat" style={{background:`${ACOL[todo.area]||'#555'}15`,color:ACOL[todo.area]||'#555'}}>
                              {ALBL[todo.area]||todo.area}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                  {done.length>0&&(
                    <div className="tpg">
                      <span className="tpgl" style={{color:'#333'}}><span className="tpgd" style={{background:'#4ade80'}}/>Completados</span>
                      {done.map(todo=>(
                        <div key={todo.id} className="tpi">
                          <div className="tpck done" onClick={()=>togTodo(todo.id)} style={{cursor:canManage?'pointer':'default'}}>✓</div>
                          <span className="tptx done">{todo.text}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {canManage&&(
                  <div className="tpad">
                    <input className="tpin" placeholder="Agregar pendiente manual..." value={ntxt} onChange={e=>setNtxt(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addTodo()}/>
                    <button className="tpab" onClick={addTodo}>+ Agregar pendiente</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {snwp&&(
        <div className="mo" onClick={()=>setSnwp(false)}>
          <div className="md" onClick={e=>e.stopPropagation()}>
            <h2 className="mdt">Nuevo proyecto</h2>
            <label className="mdl">Nombre del proyecto</label>
            <input className="mdi" placeholder="Ej. RBM DGEN Global Campaign" value={npn} onChange={e=>setNpn(e.target.value)}/>
            <label className="mdl">Cliente / Marca</label>
            <input className="mdi" placeholder="Ej. Meta / Ray-Ban" value={npc} onChange={e=>setNpc(e.target.value)}/>
            <div className="mdb">
              <button className="mbca" onClick={()=>setSnwp(false)}>Cancelar</button>
              <button className="mbok" onClick={createProj}>Crear proyecto</button>
            </div>
          </div>
        </div>
      )}

      {snwpc&&(
        <div className="mo" onClick={()=>setSnwpc(false)}>
          <div className="md" onClick={e=>e.stopPropagation()}>
            <h2 className="mdt">Agregar pieza</h2>
            <label className="mdl">Tag / Categoría</label>
            <input className="mdi" placeholder="Ej. CONCERT, FLOWERS..." value={nptag} onChange={e=>setNptag(e.target.value)}/>
            <label className="mdl">Nombre de la pieza</label>
            <input className="mdi" placeholder='Ej. Concert 15"' value={npnm} onChange={e=>setNpnm(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addPiece()}/>
            <label className="mdl">Grupo (para filtrar)</label>
            <input className="mdi" placeholder="Ej. concert, flowers..." value={npgr} onChange={e=>setNpgr(e.target.value)}/>
            <div className="mdb">
              <button className="mbca" onClick={()=>setSnwpc(false)}>Cancelar</button>
              <button className="mbok" onClick={addPiece}>Agregar</button>
            </div>
          </div>
        </div>
      )}

      {snwm&&(
        <div className="mo" onClick={()=>setSnwm(false)}>
          <div className="md" onClick={e=>e.stopPropagation()}>
            <h2 className="mdt">Agregar persona al proyecto</h2>
            <label className="mdl">Nombre</label>
            <input className="mdi" placeholder="Nombre completo" value={nmn} onChange={e=>setNmn(e.target.value)}/>
            <label className="mdl">Email</label>
            <input className="mdi" type="email" placeholder="email@ejemplo.com" value={nme} onChange={e=>setNme(e.target.value)}/>
            <label className="mdl">Rol en este proyecto</label>
            <select className="mds" value={nmr} onChange={e=>setNmr(e.target.value)}>
              <option value="agencia">Agencia</option>
              <option value="marca">Marca</option>
              <option value="casa_productora">Casa Productora</option>
              <option value="productor">Productor</option>
            </select>
            <div className="mdb">
              <button className="mbca" onClick={()=>setSnwm(false)}>Cancelar</button>
              <button className="mbok" onClick={addMbr}>Agregar</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
