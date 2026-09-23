import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { fetchAll } from '../utils/dataHelpers'
import { formatDate, formatDateTime, isHiddenAccount } from '../utils/constants'
import { logActivity, ACTIVITY_TYPES } from '../utils/activityLog'
import { ArrowLeft, Copy, Tags, MapPin, FileWarning, History, Check, X, ExternalLink } from 'lucide-react'

// ------------------------------------------------------------
// Révision de la base (direction) : doublons probables, secteurs manquants,
// villes à corriger, fiches incomplètes. Contrôles par règles, sans IA.
// Les décisions (« pas un doublon », « ignorer ») sont historisées et annulables.
// ------------------------------------------------------------

const strip = (s) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
const normName = (s) => strip(s).toUpperCase().replace(/[^A-Z0-9 ]/g, ' ')
  .replace(/\b(SARL|SAS|SASU|SA|EURL|EARL|SCEA|GAEC|SCI|SNC|ETS|ETABLISSEMENTS?|ENTREPRISE|SOCIETE|STE|GROUPE|ET FILS|FILS|FRERES|CIE|COMPAGNIE|DOMAINE|VINS?|MAISON|CAVE)\b/g, ' ')
  .replace(/\s+/g, ' ').trim()
const normCity = (s) => strip(s).toUpperCase().replace(/[-'’]/g, ' ').replace(/\bSTE\b/g, 'SAINTE').replace(/\bST\b/g, 'SAINT').replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()
const digits = (s) => (s || '').replace(/\D/g, '').replace(/^33/, '0')
const pairKey = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`)
function lev(a, b) {
  if (Math.abs(a.length - b.length) > 3) return 99
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i])
  for (let j = 1; j <= b.length; j++) d[0][j] = j
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
  return d[a.length][b.length]
}

export default function RevisionBase() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [ents, setEnts] = useState([])
  const [sectors, setSectors] = useState([])
  const [profiles, setProfiles] = useState([])
  const [actionCount, setActionCount] = useState({})
  const [inters, setInters] = useState([])
  const [decisions, setDecisions] = useState([])
  const [communes, setCommunes] = useState(null) // null = chargement, [] = indisponible
  const [tab, setTab] = useState('doublons')
  const [showHistory, setShowHistory] = useState(false)
  const [msg, setMsg] = useState('')

  async function load() {
    setLoading(true)
    const [e, s, p, a, i, d] = await Promise.all([
      fetchAll('enterprises'), fetchAll('sectors', { order: { column: 'name', ascending: true } }), fetchAll('profiles'),
      fetchAll('actions', { select: 'enterprise_id' }), fetchAll('interlocuteurs', { select: 'enterprise_id,phone,email' }),
      fetchAll('data_quality_decisions', { order: { column: 'decided_at', ascending: false } }),
    ])
    setEnts(e); setSectors(s); setProfiles(p); setInters(i); setDecisions(d)
    const c = {}; a.forEach(x => { c[x.enterprise_id] = (c[x.enterprise_id] || 0) + 1 }); setActionCount(c)
    setLoading(false)
  }
  useEffect(() => { load() }, [])
  // Liste officielle des communes du 67 et du 68 (service public geo.api.gouv.fr)
  useEffect(() => {
    Promise.all(['67', '68'].map(dep => fetch(`https://geo.api.gouv.fr/departements/${dep}/communes?fields=nom&format=json`).then(r => r.ok ? r.json() : []).then(l => l.map(x => ({ nom: x.nom, dep })))))
      .then(([a, b]) => setCommunes([...a, ...b])).catch(() => setCommunes([]))
  }, [])

  const sectorName = (id) => sectors.find(s => s.id === id)?.name || ''
  const profName = (id) => profiles.find(p => p.id === id)?.full_name || '—'
  const active = decisions.filter(d => !d.revoked_at)
  const ignored = (kind, id) => active.some(d => d.kind === kind && d.decision === 'ignore' && d.entity_a === id)
  const flash = (t) => { setMsg(t); setTimeout(() => setMsg(''), 3500) }

  // ---------- doublons probables ----------
  const doublons = useMemo(() => {
    const notDup = new Set(active.filter(d => d.kind === 'doublon' && d.decision === 'pas_doublon').map(d => pairKey(d.entity_a, d.entity_b)))
    const pairs = {}
    const add = (a, b, why) => { if (a.id === b.id) return; const k = pairKey(a.id, b.id); if (notDup.has(k)) return; (pairs[k] = pairs[k] || { a: a.created_at <= b.created_at ? a : b, b: a.created_at <= b.created_at ? b : a, why: new Set() }).why.add(why) }
    const group = (keyFn, why) => { const m = {}; ents.forEach(e => { const k = keyFn(e); if (k) (m[k] = m[k] || []).push(e) }); Object.values(m).forEach(l => { for (let i = 0; i < l.length; i++) for (let j = i + 1; j < l.length; j++) add(l[i], l[j], why) }) }
    group(e => { const n = normName(e.name); return n.length >= 3 ? n : '' }, 'même nom')
    group(e => { const d = digits(e.phone); return d.length >= 9 ? d.slice(-9) : '' }, 'même téléphone')
    group(e => (e.email || '').trim().toLowerCase() || '', 'même e-mail')
    // nom contenu dans l'autre, dans la même ville
    const byCity = {}; ents.forEach(e => { const c = normCity(e.city); if (c) (byCity[c] = byCity[c] || []).push(e) })
    Object.values(byCity).forEach(l => { for (let i = 0; i < l.length; i++) for (let j = i + 1; j < l.length; j++) { const x = normName(l[i].name), y = normName(l[j].name); if (x && y && x !== y && ((x.length >= 6 && y.includes(x)) || (y.length >= 6 && x.includes(y)))) add(l[i], l[j], 'nom proche, même ville') } })
    return Object.values(pairs).map(p => ({ ...p, why: [...p.why] }))
  }, [ents, decisions])

  // ---------- secteurs manquants ----------
  const sansSecteur = useMemo(() => ents.filter(e => !e.sector_id || /d[ée]finir/i.test(sectorName(e.sector_id))), [ents, sectors])

  // ---------- villes ----------
  const villes = useMemo(() => {
    if (!communes?.length) return []
    const idx = {}; communes.forEach(c => { (idx[normCity(c.nom)] = idx[normCity(c.nom)] || []).push(c) })
    const groups = {}
    ents.forEach(e => {
      if (!e.city || ignored('ville', e.id)) return
      const n = normCity(e.city); const m = idx[n]
      let issue = null, sugg = null
      if (m?.length) {
        const c = m.length === 1 ? m[0] : (m.find(x => x.dep === e.department) || m[0])
        if (e.city !== c.nom) { issue = 'orthographe'; sugg = c }
        else if (m.length === 1 && e.department !== c.dep) { issue = 'département'; sugg = c }
      } else {
        issue = 'inconnue'
        let best = null, bd = 3
        for (const c of communes) { const d = lev(n, normCity(c.nom)); if (d < bd) { bd = d; best = c } }
        sugg = best
      }
      if (!issue) return
      const k = `${e.city}|${e.department || ''}|${issue}`
      ;(groups[k] = groups[k] || { city: e.city, dep: e.department, issue, sugg, ents: [] }).ents.push(e)
    })
    const order = { orthographe: 0, 'département': 1, inconnue: 2 }
    return Object.values(groups).sort((a, b) => order[a.issue] - order[b.issue] || b.ents.length - a.ents.length)
  }, [ents, communes, decisions])

  // ---------- fiches incomplètes ----------
  const incompletes = useMemo(() => {
    const contact = new Set(inters.filter(i => (i.phone || '').trim() || (i.email || '').trim()).map(i => i.enterprise_id))
    return ents.filter(e => !ignored('fiche', e.id)).map(e => {
      const miss = []
      if (!e.assigned_to) miss.push('commercial')
      if (!(e.phone || '').trim() && !(e.email || '').trim() && !contact.has(e.id)) miss.push('contact')
      if (!e.department) miss.push('département')
      return { e, miss }
    }).filter(x => x.miss.length)
  }, [ents, inters, decisions])

  // ---------- écritures ----------
  async function updateEnt(e, fields, label) {
    const { error } = await supabase.from('enterprises').update(fields).eq('id', e.id)
    if (error) { flash(`Échec : ${error.message}`); return false }
    await logActivity({ type: ACTIVITY_TYPES.ENTERPRISE_UPDATED, userId: profile.id, targetType: 'enterprise', targetId: e.id, targetName: e.name, details: `Révision de la base : ${label}` })
    setEnts(list => list.map(x => x.id === e.id ? { ...x, ...fields } : x))
    return true
  }
  async function decide(row) {
    const { data, error } = await supabase.from('data_quality_decisions').insert({ ...row, decided_by: profile.id }).select().single()
    if (error) { flash(`Échec : ${error.message}`); return false }
    setDecisions(d => [data, ...d]); return true
  }
  async function revoke(d) {
    const { error } = await supabase.from('data_quality_decisions').update({ revoked_at: new Date().toISOString(), revoked_by: profile.id }).eq('id', d.id)
    if (error) { flash(`Échec : ${error.message}`); return }
    setDecisions(list => list.map(x => x.id === d.id ? { ...x, revoked_at: new Date().toISOString(), revoked_by: profile.id } : x))
  }

  const counters = [
    { key: 'doublons', label: 'Doublons probables', n: doublons.length, icon: Copy },
    { key: 'secteurs', label: 'Secteurs manquants', n: sansSecteur.length, icon: Tags },
    { key: 'villes', label: 'Villes à corriger', n: communes === null ? '…' : villes.reduce((s, g) => s + g.ents.length, 0), icon: MapPin },
    { key: 'fiches', label: 'Fiches incomplètes', n: incompletes.length, icon: FileWarning },
  ]

  if (loading) return <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-germa-700 border-t-transparent rounded-full animate-spin" /></div>
  return (
    <div className="space-y-5 animate-fade-in max-w-5xl">
      <button onClick={() => navigate('/')} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-germa-700"><ArrowLeft size={16} /> Retour au tableau de bord</button>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div><h1 className="font-display font-bold text-2xl text-gray-900">Révision de la base</h1><p className="text-gray-500 text-sm mt-1">Contrôles automatiques de la qualité des fiches. Chaque correction est journalisée sur la fiche.</p></div>
        <button onClick={() => setShowHistory(true)} className="btn-secondary flex items-center gap-2 text-sm self-start"><History size={16} /> Historique des décisions</button>
      </div>
      {msg && <div className="text-sm bg-gray-900 text-white rounded-xl px-4 py-2">{msg}</div>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {counters.map(c => (
          <button key={c.key} onClick={() => setTab(c.key)} className={`card p-4 text-left transition-shadow hover:shadow-md ${tab === c.key ? 'ring-2 ring-germa-600' : ''}`}>
            <c.icon size={18} className="text-germa-700" />
            <p className="font-display font-semibold text-2xl text-gray-900 mt-2">{c.n}</p>
            <p className="text-xs text-gray-500">{c.label}</p>
          </button>
        ))}
      </div>

      {tab === 'doublons' && <Doublons pairs={doublons} sectorName={sectorName} profName={profName} actionCount={actionCount}
        onYes={async (p) => { if (await decide({ kind: 'doublon', entity_a: p.a.id, entity_b: p.b.id, name_a: p.a.name, name_b: p.b.name, decision: 'doublon' })) navigate(`/entreprises/${p.a.id}?fusion=${p.b.id}`) }}
        onNo={async (p) => { if (await decide({ kind: 'doublon', entity_a: p.a.id, entity_b: p.b.id, name_a: p.a.name, name_b: p.b.name, decision: 'pas_doublon' })) flash(`« ${p.a.name} » / « ${p.b.name} » : marqué comme différent (annulable dans l'historique)`) }} />}

      {tab === 'secteurs' && <Secteurs list={sansSecteur} sectors={sectors} profName={profName}
        onSet={async (e, sid) => { if (await updateEnt(e, { sector_id: sid }, `secteur → ${sectorName(sid)}`)) flash(`${e.name} : secteur « ${sectorName(sid)} »`) }} />}

      {tab === 'villes' && (communes === null ? <div className="card p-8 text-center text-sm text-gray-400">Chargement de la liste officielle des communes…</div>
        : communes.length === 0 ? <div className="card p-8 text-center text-sm text-red-600">Liste officielle des communes indisponible (geo.api.gouv.fr). Réessayez plus tard.</div>
        : <Villes groups={villes} communes={communes}
          onApply={async (g, nom, dep) => { let ok = 0; for (const e of g.ents) { const f = { city: nom }; if (dep && e.department !== dep) f.department = dep; if (await updateEnt(e, f, `ville « ${e.city} » → « ${nom} »${f.department ? ` (${dep})` : ''}`)) ok++ } flash(`${ok} fiche${ok > 1 ? 's' : ''} corrigée${ok > 1 ? 's' : ''} : ${nom}`) }}
          onIgnore={async (g) => { for (const e of g.ents) await decide({ kind: 'ville', entity_a: e.id, name_a: e.name, decision: 'ignore', note: `ville « ${e.city} » conservée` }); flash(`« ${g.city} » conservée telle quelle (annulable dans l'historique)`) }}
          onApplyAllSpelling={async () => { const safe = villes.filter(g => g.issue === 'orthographe'); let n = 0; for (const g of safe) for (const e of g.ents) { const f = { city: g.sugg.nom }; if (!e.department) f.department = g.sugg.dep; if (await updateEnt(e, f, `ville « ${e.city} » → « ${g.sugg.nom} »`)) n++ } flash(`${n} fiches harmonisées`) }} />)}

      {tab === 'fiches' && <Fiches list={incompletes} profiles={profiles.filter(p => p.is_active && !isHiddenAccount(p))} navigate={navigate}
        onSave={async (e, f) => { const label = Object.entries(f).map(([k, v]) => `${{ phone: 'téléphone', email: 'e-mail', department: 'département', assigned_to: 'commercial' }[k]} → ${k === 'assigned_to' ? profName(v) : v}`).join(', '); if (await updateEnt(e, f, label)) flash(`${e.name} : complétée`) }}
        onIgnore={async (e) => { if (await decide({ kind: 'fiche', entity_a: e.id, name_a: e.name, decision: 'ignore', note: 'fiche incomplète acceptée' })) flash(`${e.name} : ignorée (annulable dans l'historique)`) }} />}

      {showHistory && <HistoryModal decisions={decisions} profName={profName} onRevoke={revoke} onClose={() => setShowHistory(false)} />}
    </div>
  )
}

function Empty({ text }) { return <div className="card p-10 text-center text-sm text-gray-400">{text}</div> }

function Doublons({ pairs, sectorName, profName, actionCount, onYes, onNo }) {
  const [busy, setBusy] = useState(null)
  if (!pairs.length) return <Empty text="Aucun doublon probable 👍" />
  const Col = ({ e }) => (
    <div className="min-w-0 flex-1 text-sm">
      <a href={`/entreprises/${e.id}`} target="_blank" rel="noopener noreferrer" className="font-medium text-gray-900 hover:underline inline-flex items-center gap-1">{e.name} <ExternalLink size={11} /></a>
      <p className="text-xs text-gray-500">{e.city || '—'} {e.department ? `(${e.department})` : ''} · {sectorName(e.sector_id) || 'sans secteur'} · {e.status === 'client' ? 'client' : 'prospect'}</p>
      <p className="text-xs text-gray-500">{profName(e.assigned_to)} · {actionCount[e.id] || 0} action{(actionCount[e.id] || 0) > 1 ? 's' : ''} · créée le {formatDate(e.created_at)}</p>
      {(e.phone || e.email) && <p className="text-xs text-gray-400 truncate">{e.phone} {e.email}</p>}
    </div>
  )
  return (
    <div className="space-y-2">
      <p className="text-sm text-gray-500">{pairs.length} paire{pairs.length > 1 ? 's' : ''} à examiner. « Oui » ouvre la fusion (la fiche la plus ancienne est conservée) ; « Non » retire la paire de la liste.</p>
      {pairs.map(p => { const k = pairKey(p.a.id, p.b.id); return (
        <div key={k} className="card p-4">
          <div className="flex flex-wrap gap-1 mb-2">{p.why.map(w => <span key={w} className="text-[11px] bg-amber-50 text-amber-800 border border-amber-200 rounded-md px-1.5 py-0.5">{w}</span>)}</div>
          <div className="flex flex-col sm:flex-row gap-4"><Col e={p.a} /><div className="hidden sm:block w-px bg-gray-100" /><Col e={p.b} /></div>
          <div className="flex justify-end gap-2 mt-3">
            <button disabled={busy === k} onClick={async () => { setBusy(k); await onNo(p); setBusy(null) }} className="btn-secondary text-sm flex items-center gap-1"><X size={14} /> Non, ce sont deux entreprises</button>
            <button disabled={busy === k} onClick={async () => { setBusy(k); await onYes(p); setBusy(null) }} className="btn-primary text-sm flex items-center gap-1"><Check size={14} /> Oui, fusionner</button>
          </div>
        </div>
      ) })}
    </div>
  )
}

function Secteurs({ list, sectors, profName, onSet }) {
  if (!list.length) return <Empty text="Toutes les fiches ont un secteur 👍" />
  const choix = sectors.filter(s => !/d[ée]finir/i.test(s.name))
  return (
    <div className="card overflow-hidden">
      <div className="px-4 py-3 text-sm text-gray-500 border-b border-gray-100">{list.length} fiche{list.length > 1 ? 's' : ''} sans secteur. Le choix est enregistré immédiatement.</div>
      <div className="divide-y divide-gray-50">
        {list.map(e => (
          <div key={e.id} className="px-4 py-2.5 flex items-center gap-3">
            <div className="min-w-0 flex-1"><a href={`/entreprises/${e.id}`} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-gray-900 hover:underline">{e.name}</a><p className="text-xs text-gray-500 truncate">{e.city || '—'} · {profName(e.assigned_to)}{e.description_activite ? ` · ${e.description_activite}` : ''}</p></div>
            <select defaultValue="" onChange={ev => ev.target.value && onSet(e, ev.target.value)} className="select-field text-sm w-56"><option value="">Choisir un secteur…</option>{choix.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
          </div>
        ))}
      </div>
    </div>
  )
}

function Villes({ groups, communes, onApply, onIgnore, onApplyAllSpelling }) {
  const [edit, setEdit] = useState({})
  const [busy, setBusy] = useState(false)
  if (!groups.length) return <Empty text="Toutes les villes sont conformes 👍" />
  const spelling = groups.filter(g => g.issue === 'orthographe')
  const LABEL = { orthographe: 'Orthographe à harmoniser', 'département': 'Département incohérent', inconnue: 'Commune inconnue en 67 / 68' }
  return (
    <div className="space-y-3">
      {spelling.length > 0 && (
        <div className="card p-4 flex items-center justify-between gap-3">
          <p className="text-sm text-gray-600"><b>{spelling.reduce((s, g) => s + g.ents.length, 0)} fiches</b> ont une ville reconnue mais écrite différemment de l'orthographe officielle (majuscules, accents, tirets). Correction sans risque.</p>
          <button disabled={busy} onClick={async () => { setBusy(true); await onApplyAllSpelling(); setBusy(false) }} className="btn-primary text-sm whitespace-nowrap">{busy ? 'Correction…' : 'Tout harmoniser'}</button>
        </div>
      )}
      <datalist id="communes-67-68">{communes.map(c => <option key={c.nom + c.dep} value={c.nom}>{c.dep}</option>)}</datalist>
      <div className="card overflow-hidden divide-y divide-gray-50">
        {groups.map(g => { const k = `${g.city}|${g.dep}|${g.issue}`; const v = edit[k] ?? ''; const chosen = communes.find(c => c.nom === v); return (
          <div key={k} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm"><span className="font-medium text-gray-900">« {g.city} »</span>{g.dep && <span className="text-gray-500"> ({g.dep})</span>} <span className="text-xs text-gray-400">· {g.ents.length} fiche{g.ents.length > 1 ? 's' : ''}</span></p>
              <p className="text-xs text-amber-700">{LABEL[g.issue]}{g.sugg ? <> — suggestion : <b>{g.sugg.nom}</b> ({g.sugg.dep})</> : ' — aucune suggestion'}</p>
              <p className="text-xs text-gray-400 truncate">{g.ents.slice(0, 4).map(e => e.name).join(', ')}{g.ents.length > 4 ? '…' : ''}</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {g.sugg && <button onClick={() => onApply(g, g.sugg.nom, g.sugg.dep)} className="btn-primary text-xs">Appliquer « {g.sugg.nom} »</button>}
              <input list="communes-67-68" value={v} onChange={ev => setEdit(s => ({ ...s, [k]: ev.target.value }))} placeholder="Autre commune…" className="input-field text-xs w-40" />
              {chosen && <button onClick={() => onApply(g, chosen.nom, chosen.dep)} className="btn-secondary text-xs">OK</button>}
              <button onClick={() => onIgnore(g)} className="text-xs text-gray-500 hover:text-gray-800" title="Garder la ville telle quelle (hors 67/68, ou volontaire)">Conserver</button>
            </div>
          </div>
        ) })}
      </div>
    </div>
  )
}

function Fiches({ list, profiles, navigate, onSave, onIgnore }) {
  const [filter, setFilter] = useState('')
  const [draft, setDraft] = useState({})
  if (!list.length) return <Empty text="Aucune fiche incomplète 👍" />
  const count = (m) => list.filter(x => x.miss.includes(m)).length
  const shown = filter ? list.filter(x => x.miss.includes(filter)) : list
  const LABEL = { commercial: 'Sans commercial', contact: 'Sans téléphone ni e-mail', 'département': 'Sans département' }
  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setFilter('')} className={`text-xs px-3 py-1.5 rounded-full border ${!filter ? 'bg-germa-700 text-white border-germa-700' : 'bg-white border-gray-200 text-gray-600'}`}>Toutes ({list.length})</button>
        {['commercial', 'contact', 'département'].map(m => <button key={m} onClick={() => setFilter(m)} className={`text-xs px-3 py-1.5 rounded-full border ${filter === m ? 'bg-germa-700 text-white border-germa-700' : 'bg-white border-gray-200 text-gray-600'}`}>{LABEL[m]} ({count(m)})</button>)}
      </div>
      <div className="card overflow-hidden divide-y divide-gray-50">
        {shown.slice(0, 200).map(({ e, miss }) => { const d = draft[e.id] || {}; const set = (k, v) => setDraft(s => ({ ...s, [e.id]: { ...d, [k]: v } })); const f = Object.fromEntries(Object.entries(d).filter(([, v]) => v)); return (
          <div key={e.id} className="px-4 py-3 flex flex-col lg:flex-row lg:items-center gap-3">
            <div className="min-w-0 lg:w-64"><a href={`/entreprises/${e.id}`} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-gray-900 hover:underline">{e.name}</a><p className="text-xs text-amber-700">{miss.map(m => LABEL[m]).join(' · ')}</p></div>
            <div className="flex items-center gap-2 flex-wrap flex-1">
              {miss.includes('commercial') && <select value={d.assigned_to || ''} onChange={ev => set('assigned_to', ev.target.value)} className="select-field text-xs w-40"><option value="">Commercial…</option>{profiles.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}</select>}
              {miss.includes('contact') && <><input value={d.phone || ''} onChange={ev => set('phone', ev.target.value)} placeholder="Téléphone" className="input-field text-xs w-32" /><input value={d.email || ''} onChange={ev => set('email', ev.target.value)} placeholder="E-mail" className="input-field text-xs w-44" /></>}
              {miss.includes('département') && <select value={d.department || ''} onChange={ev => set('department', ev.target.value)} className="select-field text-xs w-24"><option value="">Dépt…</option><option value="67">67</option><option value="68">68</option></select>}
            </div>
            <div className="flex items-center gap-2">
              <button disabled={!Object.keys(f).length} onClick={async () => { await onSave(e, f); setDraft(s => { const n = { ...s }; delete n[e.id]; return n }) }} className="btn-primary text-xs disabled:opacity-40">Enregistrer</button>
              <button onClick={() => onIgnore(e)} className="text-xs text-gray-500 hover:text-gray-800" title="Accepter la fiche telle quelle">Ignorer</button>
            </div>
          </div>
        ) })}
        {shown.length > 200 && <p className="px-4 py-3 text-xs text-gray-400">200 premières fiches affichées sur {shown.length} — complétez-les ou filtrez pour voir la suite.</p>}
      </div>
    </div>
  )
}

function HistoryModal({ decisions, profName, onRevoke, onClose }) {
  const KIND = { doublon: 'Doublon', ville: 'Ville', fiche: 'Fiche incomplète' }
  const DEC = { doublon: 'Oui, doublon (fusion)', pas_doublon: 'Pas un doublon', ignore: 'Conservé tel quel' }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[88vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100"><div><h2 className="font-display font-semibold text-lg">Historique des décisions</h2><p className="text-xs text-gray-500">Annuler une décision fait réapparaître l'élément dans la liste à traiter. Les corrections de fiches (secteur, ville, champs) sont dans l'historique de chaque fiche.</p></div><button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X size={20} /></button></div>
        <div className="p-6 overflow-y-auto flex-1">
          {!decisions.length ? <p className="text-sm text-gray-400 text-center py-6">Aucune décision pour l'instant.</p> : (
            <div className="divide-y divide-gray-100">
              {decisions.map(d => (
                <div key={d.id} className={`py-2.5 flex items-start gap-3 ${d.revoked_at ? 'opacity-50' : ''}`}>
                  <span className="text-xs text-gray-400 w-28 flex-shrink-0 pt-0.5">{formatDateTime(d.decided_at)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-900"><span className="text-xs bg-gray-100 rounded px-1.5 py-0.5 mr-1.5">{KIND[d.kind] || d.kind}</span>{d.name_a}{d.name_b ? ` / ${d.name_b}` : ''}</p>
                    <p className="text-xs text-gray-500">{DEC[d.decision] || d.decision} — {profName(d.decided_by)}{d.note ? ` · ${d.note}` : ''}{d.revoked_at ? ` · annulée le ${formatDateTime(d.revoked_at)} par ${profName(d.revoked_by)}` : ''}</p>
                  </div>
                  {!d.revoked_at && d.decision !== 'doublon' && <button onClick={() => onRevoke(d)} className="text-xs text-red-600 hover:underline flex-shrink-0">Annuler</button>}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex justify-end"><button onClick={onClose} className="btn-secondary">Fermer</button></div>
      </div>
    </div>
  )
}
