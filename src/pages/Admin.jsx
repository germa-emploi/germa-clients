import { useState, useEffect, useRef, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { fetchAll, insertBatch, deleteAll } from '../utils/dataHelpers'
import { logActivity, ACTIVITY_TYPES, ACTIVITY_LABELS } from '../utils/activityLog'
import {
  Users, Tags, Upload, Download, Database, Plus, X, Trash2,
  UserCheck, UserX, AlertCircle, CheckCircle2, FileSpreadsheet,
  BarChart3, ArrowUpDown, ArrowUp, ArrowDown, Search, Filter, Maximize2
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import * as XLSX from 'xlsx'

export default function Admin() {
  const [tab, setTab] = useState('users')
  const tabs = [
    { id: 'users', label: 'Utilisateurs', icon: Users },
    { id: 'sectors', label: 'Secteurs', icon: Tags },
    { id: 'journal', label: 'Journal', icon: FileSpreadsheet },
    { id: 'stats', label: 'Statistiques', icon: BarChart3 },
    { id: 'export', label: 'Export', icon: Download },
    { id: 'backup', label: 'Backup / Restore', icon: Database },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-bold text-2xl text-gray-900">Administration</h1>
        <p className="text-gray-500 text-sm mt-1">Gestion des utilisateurs, secteurs et données.</p>
      </div>
      <div className="flex gap-1 overflow-x-auto pb-1">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${tab === t.id ? 'bg-germa-700 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-100'}`}>
            <t.icon size={16} />{t.label}
          </button>
        ))}
      </div>
      {tab === 'users' && <UsersTab />}
      {tab === 'sectors' && <SectorsTab />}
      {tab === 'journal' && <JournalTab />}
      {tab === 'stats' && <StatsTab />}
      {tab === 'export' && <ExportTab />}
      {tab === 'backup' && <BackupTab />}
    </div>
  )
}

// ===================== USERS TAB =====================
function UsersTab() {
  const { profile: myProfile } = useAuth()
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => { loadProfiles() }, [])
  async function loadProfiles() { setLoading(true); const data = await fetchAll('profiles', { order: { column: 'created_at', ascending: true } }); setProfiles(data); setLoading(false) }
  async function toggleActive(p) {
    await supabase.from('profiles').update({ is_active: !p.is_active }).eq('id', p.id)
    await logActivity({ type: p.is_active ? ACTIVITY_TYPES.USER_DEACTIVATED : ACTIVITY_TYPES.USER_REACTIVATED, userId: myProfile?.id, targetType: 'user', targetId: p.id, targetName: p.full_name })
    loadProfiles()
  }
  async function changeRole(profile, newRole) { await supabase.from('profiles').update({ role: newRole }).eq('id', profile.id); loadProfiles() }

  if (loading) return <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-germa-700 border-t-transparent rounded-full animate-spin" /></div>
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="font-display font-semibold text-gray-900">Comptes utilisateurs ({profiles.length})</h2>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2 text-sm"><Plus size={16} /> Créer un compte</button>
      </div>
      <div className="space-y-2">
        {profiles.map(p => (
          <div key={p.id} className={`card px-4 py-3 flex items-center gap-3 ${!p.is_active ? 'opacity-50' : ''}`}>
            <div className={`w-9 h-9 rounded-full flex items-center justify-center ${p.is_active ? 'bg-germa-100' : 'bg-gray-100'}`}>
              <span className={`font-bold text-xs ${p.is_active ? 'text-germa-700' : 'text-gray-400'}`}>{p.full_name?.charAt(0)?.toUpperCase() || '?'}</span>
            </div>
            <div className="flex-1 min-w-0"><p className="font-medium text-sm truncate">{p.full_name}</p><p className="text-xs text-gray-500">{p.email}</p></div>
            <select value={p.role} onChange={e => changeRole(p, e.target.value)} className="select-field !w-auto text-xs !py-1.5 !px-2">
              <option value="commercial">Commercial</option><option value="direction">Direction</option><option value="autre">Autre</option>
            </select>
            <button onClick={() => toggleActive(p)} className={`p-1.5 rounded-lg transition-colors ${p.is_active ? 'text-germa-600 hover:bg-red-50 hover:text-red-600' : 'text-gray-400 hover:bg-germa-50 hover:text-germa-600'}`} title={p.is_active ? 'Désactiver' : 'Réactiver'}>
              {p.is_active ? <UserX size={16} /> : <UserCheck size={16} />}
            </button>
          </div>
        ))}
      </div>
      {showCreate && <CreateUserModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); loadProfiles() }} />}
    </div>
  )
}

function CreateUserModal({ onClose, onCreated }) {
  const [email, setEmail] = useState(''); const [fullName, setFullName] = useState(''); const [password, setPassword] = useState(''); const [role, setRole] = useState('commercial')
  const [saving, setSaving] = useState(false); const [error, setError] = useState('')
  async function handleSubmit(e) {
    e.preventDefault(); setSaving(true); setError('')
    const { error: err } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName, role } } })
    if (err) { setError(err.message); setSaving(false); return }
    onCreated()
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100"><h2 className="font-display font-semibold text-lg">Créer un compte</h2><button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X size={20} /></button></div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-xl">{error}</div>}
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Nom complet</label><input value={fullName} onChange={e => setFullName(e.target.value)} className="input-field" required /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} className="input-field" required /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label><input type="text" value={password} onChange={e => setPassword(e.target.value)} className="input-field" required minLength={6} /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Rôle</label><select value={role} onChange={e => setRole(e.target.value)} className="select-field"><option value="commercial">Commercial</option><option value="direction">Direction</option><option value="autre">Autre</option></select></div>
          <div className="flex gap-3 pt-2"><button type="button" onClick={onClose} className="btn-secondary flex-1">Annuler</button><button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Création…' : 'Créer le compte'}</button></div>
        </form>
      </div>
    </div>
  )
}

// ===================== SECTORS TAB =====================
function SectorsTab() {
  const { profile } = useAuth()
  const [sectors, setSectors] = useState([]); const [loading, setLoading] = useState(true); const [newSector, setNewSector] = useState('')
  useEffect(() => { loadSectors() }, [])
  async function loadSectors() { setLoading(true); const data = await fetchAll('sectors', { order: { column: 'name', ascending: true } }); setSectors(data); setLoading(false) }
  async function addSector(e) {
    e.preventDefault(); if (!newSector.trim()) return
    const { data: s } = await supabase.from('sectors').insert({ name: newSector.trim() }).select().single()
    await logActivity({ type: ACTIVITY_TYPES.SECTOR_CREATED, userId: profile?.id, targetType: 'sector', targetId: s?.id, targetName: newSector.trim() })
    setNewSector(''); loadSectors()
  }
  async function deleteSector(id) {
    if (!window.confirm('Supprimer ce secteur ?')) return
    const sector = sectors.find(s => s.id === id)
    await logActivity({ type: ACTIVITY_TYPES.SECTOR_DELETED, userId: profile?.id, targetType: 'sector', targetId: id, targetName: sector?.name })
    await supabase.from('sectors').delete().eq('id', id); loadSectors()
  }
  return (
    <div className="space-y-4">
      <h2 className="font-display font-semibold text-gray-900">Secteurs d'activité</h2>
      <form onSubmit={addSector} className="flex gap-2"><input value={newSector} onChange={e => setNewSector(e.target.value)} className="input-field flex-1" placeholder="Nouveau secteur…" /><button type="submit" className="btn-primary flex items-center gap-2"><Plus size={16} /> Ajouter</button></form>
      <div className="space-y-1">{sectors.map(s => (<div key={s.id} className="card px-4 py-2.5 flex items-center justify-between"><span className="text-sm font-medium">{s.name}</span><button onClick={() => deleteSector(s.id)} className="p-1 text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={14} /></button></div>))}</div>
    </div>
  )
}

// ===================== JOURNAL TAB (table view) =====================
function JournalTab() {
  const [logs, setLogs] = useState([]); const [profiles, setProfiles] = useState([]); const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState(''); const [filterType, setFilterType] = useState(''); const [filterUser, setFilterUser] = useState('')
  const [sortCol, setSortCol] = useState('date'); const [sortDir, setSortDir] = useState('desc')

  useEffect(() => { loadLogs() }, [])
  async function loadLogs() {
    setLoading(true)
    const [logData, profData] = await Promise.all([fetchAll('activity_log', { order: { column: 'created_at', ascending: false } }), fetchAll('profiles')])
    setLogs(logData); setProfiles(profData); setLoading(false)
  }

  const activityTypes = useMemo(() => [...new Set(logs.map(l => l.activity_type))].sort(), [logs])

  const filtered = useMemo(() => {
    return logs.filter(l => {
      if (filterType && l.activity_type !== filterType) return false
      if (filterUser && l.performed_by !== filterUser) return false
      if (search) {
        const s = search.toLowerCase()
        const performer = profiles.find(p => p.id === l.performed_by)
        const text = `${l.target_name || ''} ${ACTIVITY_LABELS[l.activity_type] || ''} ${performer?.full_name || ''} ${l.details || ''}`.toLowerCase()
        if (!text.includes(s)) return false
      }
      return true
    })
  }, [logs, search, filterType, filterUser, profiles])

  const sorted = useMemo(() => {
    const arr = [...filtered]
    arr.sort((a, b) => {
      let va, vb
      switch (sortCol) {
        case 'date': va = a.created_at; vb = b.created_at; break
        case 'type': va = a.activity_type; vb = b.activity_type; break
        case 'target': va = (a.target_name || '').toLowerCase(); vb = (b.target_name || '').toLowerCase(); break
        case 'user': va = (profiles.find(p => p.id === a.performed_by)?.full_name || '').toLowerCase(); vb = (profiles.find(p => p.id === b.performed_by)?.full_name || '').toLowerCase(); break
        default: va = a.created_at; vb = b.created_at
      }
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return arr
  }, [filtered, sortCol, sortDir, profiles])

  function toggleSort(col) { if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortCol(col); setSortDir('desc') } }
  function ThSort({ label, col, className = '' }) {
    const active = sortCol === col
    return (<th className={`px-3 py-2.5 text-left text-xs font-semibold text-gray-500 cursor-pointer select-none hover:text-gray-700 ${className}`} onClick={() => toggleSort(col)}>
      <div className="flex items-center gap-1">{label}{active ? (sortDir === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />) : <ArrowUpDown size={11} className="text-gray-300" />}</div>
    </th>)
  }

  if (loading) return <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-germa-700 border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-semibold text-gray-900">Journal d'activité ({sorted.length})</h2>
        <button onClick={loadLogs} className="btn-secondary text-sm">Actualiser</button>
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input value={search} onChange={e => setSearch(e.target.value)} className="input-field pl-9 text-sm" placeholder="Rechercher…" /></div>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="select-field text-sm !w-auto">
          <option value="">Tous les types</option>{activityTypes.map(t => <option key={t} value={t}>{ACTIVITY_LABELS[t] || t}</option>)}
        </select>
        <select value={filterUser} onChange={e => setFilterUser(e.target.value)} className="select-field text-sm !w-auto">
          <option value="">Tous les utilisateurs</option>{profiles.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
        </select>
      </div>
      <div className="card overflow-hidden">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100 sticky top-0">
              <tr><ThSort label="Date" col="date" /><ThSort label="Événement" col="type" /><ThSort label="Cible" col="target" /><ThSort label="Utilisateur" col="user" /><th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500">Détails</th></tr>
            </thead>
            <tbody>
              {sorted.map(log => {
                const performer = profiles.find(p => p.id === log.performed_by)
                const d = new Date(log.created_at)
                const tc = { enterprise_created:'bg-emerald-50 text-emerald-700', enterprise_converted:'bg-germa-50 text-germa-700', enterprise_deleted:'bg-red-50 text-red-700', enterprise_updated:'bg-blue-50 text-blue-700', action_created:'bg-gray-100 text-gray-600', action_deleted:'bg-red-50 text-red-600', action_updated:'bg-amber-50 text-amber-700' }
                return (
                  <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">{d.toLocaleDateString('fr-FR')} {d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="px-3 py-2"><span className={`text-xs px-1.5 py-0.5 rounded ${tc[log.activity_type] || 'bg-gray-100 text-gray-600'}`}>{ACTIVITY_LABELS[log.activity_type] || log.activity_type}</span></td>
                    <td className="px-3 py-2 text-sm font-medium text-gray-900 truncate max-w-[200px]">{log.target_name || '—'}</td>
                    <td className="px-3 py-2 text-xs text-gray-600">{performer?.full_name || '—'}</td>
                    <td className="px-3 py-2 text-xs text-gray-400 truncate max-w-[250px]">{log.details || '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ===================== STATS TAB =====================
const MONTHS_SHORT = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']
const MONTHS_FULL = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']

function StatsTab() {
  const [enterprises, setEnterprises] = useState([]); const [actions, setActions] = useState([]); const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedChart, setExpandedChart] = useState(null) // 'entCreated' | 'actions' | 'rdv' | 'conv'
  const [detailMonth, setDetailMonth] = useState(null) // { label, y, m }

  useEffect(() => { loadData() }, [])
  async function loadData() {
    setLoading(true)
    const [entData, actData, profData] = await Promise.all([fetchAll('enterprises'), fetchAll('actions'), fetchAll('profiles')])
    setEnterprises(entData); setActions(actData); setProfiles(profData.filter(p => p.is_active)); setLoading(false)
  }

  const months = useMemo(() => {
    const now = new Date(); const arr = []
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      arr.push({ y: d.getFullYear(), m: d.getMonth(), label: `${MONTHS_SHORT[d.getMonth()]} ${String(d.getFullYear()).slice(2)}` })
    }
    return arr
  }, [])

  const chartData = useMemo(() => {
    const activeProfiles = profiles.filter(p => actions.some(a => a.performed_by === p.id) || enterprises.some(e => e.created_by === p.id))
    const colors = ['#2D6A4F', '#0ea5e9', '#f59e0b', '#ef4444', '#8b5cf6', '#22c55e', '#ec4899']

    function buildData(filterFn) {
      return months.map(mo => {
        const row = { month: mo.label, _y: mo.y, _m: mo.m }
        activeProfiles.forEach(p => { row[p.full_name?.split(' ')[0] || p.email] = filterFn(p.id, mo.y, mo.m) })
        return row
      })
    }

    const entCreated = buildData((uid, y, m) => enterprises.filter(e => { const d = new Date(e.created_at); return e.created_by === uid && d.getFullYear() === y && d.getMonth() === m }).length)
    const actionsData = buildData((uid, y, m) => actions.filter(a => { const d = new Date(a.performed_at); return a.performed_by === uid && d.getFullYear() === y && d.getMonth() === m }).length)
    const rdvData = buildData((uid, y, m) => actions.filter(a => { const d = new Date(a.performed_at); return a.performed_by === uid && a.result === 'RDV pris' && d.getFullYear() === y && d.getMonth() === m }).length)
    const convData = buildData((uid, y, m) => enterprises.filter(e => { if (!e.converted_at) return false; const d = new Date(e.converted_at); return e.converted_by === uid && d.getFullYear() === y && d.getMonth() === m }).length)

    const userKeys = activeProfiles.map(p => p.full_name?.split(' ')[0] || p.email)
    return { entCreated, actionsData, rdvData, convData, userKeys, colors, activeProfiles }
  }, [enterprises, actions, profiles, months])

  function getDetailItems(chartType, y, m) {
    const profMap = Object.fromEntries(profiles.map(p => [p.id, p.full_name || p.email]))
    if (chartType === 'entCreated') {
      return enterprises.filter(e => { const d = new Date(e.created_at); return d.getFullYear() === y && d.getMonth() === m })
        .map(e => ({ name: e.name, by: profMap[e.created_by], detail: e.city || e.department || '' }))
    }
    if (chartType === 'actions') {
      return actions.filter(a => { const d = new Date(a.performed_at); return d.getFullYear() === y && d.getMonth() === m })
        .map(a => { const ent = enterprises.find(e => e.id === a.enterprise_id); return { name: ent?.name || '?', by: profMap[a.performed_by], detail: `${a.action_type} — ${a.result}` } })
    }
    if (chartType === 'rdv') {
      return actions.filter(a => { const d = new Date(a.performed_at); return a.result === 'RDV pris' && d.getFullYear() === y && d.getMonth() === m })
        .map(a => { const ent = enterprises.find(e => e.id === a.enterprise_id); return { name: ent?.name || '?', by: profMap[a.performed_by], detail: a.comments?.substring(0, 50) || '' } })
    }
    if (chartType === 'conv') {
      return enterprises.filter(e => { if (!e.converted_at) return false; const d = new Date(e.converted_at); return d.getFullYear() === y && d.getMonth() === m })
        .map(e => ({ name: e.name, by: profMap[e.converted_by], detail: e.city || '' }))
    }
    return []
  }

  if (loading) return <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-germa-700 border-t-transparent rounded-full animate-spin" /></div>

  const charts = [
    { id: 'entCreated', title: 'Entreprises créées', emoji: '🏢', data: chartData.entCreated },
    { id: 'actions', title: 'Actions réalisées', emoji: '📞', data: chartData.actionsData },
    { id: 'rdv', title: 'RDV pris', emoji: '📅', data: chartData.rdvData },
    { id: 'conv', title: 'Conversions effectuées', emoji: '✅', data: chartData.convData },
  ]

  function renderChart(data, height, onBarClick) {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} onClick={onBarClick ? (e) => { if (e && e.activePayload && e.activePayload[0]) { const d = e.activePayload[0].payload; onBarClick(d) } } : undefined}
          style={onBarClick ? { cursor: 'pointer' } : undefined}>
          <XAxis dataKey="month" fontSize={10} /><YAxis fontSize={10} /><Tooltip /><Legend wrapperStyle={{ fontSize: 11 }} />
          {chartData.userKeys.map((key, i) => (
            <Bar key={key} dataKey={key} fill={chartData.colors[i % chartData.colors.length]} radius={[3, 3, 0, 0]} name={key} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    )
  }

  return (
    <div className="space-y-6">
      <h2 className="font-display font-semibold text-gray-900">Statistiques par utilisateur (12 mois)</h2>
      <div className="grid lg:grid-cols-2 gap-4">
        {charts.map(ch => (
          <div key={ch.id} className="card p-4 sm:p-5 cursor-pointer hover:shadow-md transition-shadow" onClick={() => { setExpandedChart(ch.id); setDetailMonth(null) }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold text-gray-900 text-sm">{ch.emoji} {ch.title}</h3>
              <Maximize2 size={16} className="text-gray-400" />
            </div>
            <div className="h-56">{renderChart(ch.data, '100%')}</div>
          </div>
        ))}
      </div>

      {/* Expanded chart modal */}
      {expandedChart && (() => {
        const ch = charts.find(c => c.id === expandedChart)
        if (!ch) return null
        const detailItems = detailMonth ? getDetailItems(expandedChart, detailMonth._y, detailMonth._m) : []
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => { setExpandedChart(null); setDetailMonth(null) }}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <div>
                  <h2 className="font-display font-semibold text-lg">{ch.emoji} {ch.title}</h2>
                  <p className="text-xs text-gray-500">Cliquez sur un mois pour voir le détail</p>
                </div>
                <button onClick={() => { setExpandedChart(null); setDetailMonth(null) }} className="p-1 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
              </div>
              <div className="p-6" style={{ minHeight: 400 }}>
                {renderChart(ch.data, 380, (payload) => {
                  if (payload._y !== undefined && payload._m !== undefined) {
                    setDetailMonth({ label: payload.month, _y: payload._y, _m: payload._m })
                  }
                })}
              </div>
              {detailMonth && (
                <div className="border-t border-gray-100 px-6 py-4 max-h-[300px] overflow-y-auto">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-display font-semibold text-sm text-gray-900">Détail — {MONTHS_FULL[detailMonth._m]} {detailMonth._y} ({detailItems.length})</h3>
                    <button onClick={() => setDetailMonth(null)} className="text-xs text-gray-400 hover:text-gray-600">Fermer le détail</button>
                  </div>
                  {detailItems.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-4">Aucun résultat</p>
                  ) : (
                    <div className="space-y-1">
                      {detailItems.map((item, i) => (
                        <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-50 text-sm">
                          <span className="font-medium text-gray-900 flex-1 truncate">{item.name}</span>
                          {item.detail && <span className="text-xs text-gray-500 truncate max-w-[200px]">{item.detail}</span>}
                          <span className="text-xs text-gray-400 whitespace-nowrap">{item.by}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )
      })()}
    </div>
  )
}

// ===================== EXPORT TAB (XLSX) =====================
function ExportTab() {
  const [exporting, setExporting] = useState(false)

  async function exportXLSX(type) {
    setExporting(true)
    const [enterprises, actions, interlocuteurs, profiles, sectors] = await Promise.all([
      fetchAll('enterprises'), fetchAll('actions'), fetchAll('interlocuteurs'), fetchAll('profiles'), fetchAll('sectors'),
    ])
    const profMap = Object.fromEntries(profiles.map(p => [p.id, p.full_name || p.email]))
    const secMap = Object.fromEntries(sectors.map(s => [s.id, s.name]))
    const entMap = Object.fromEntries(enterprises.map(e => [e.id, e.name]))

    let data = []; let filename = ''

    if (type === 'enterprises') {
      filename = 'Entreprises'
      data = enterprises.map(e => ({
        'Nom': e.name, 'Statut': e.status === 'client' ? 'Client' : 'Prospect', 'Secteur': secMap[e.sector_id] || '', 'Ville': e.city || '', 'Département': e.department || '',
        'Activité / Besoin': e.description_activite || '', 'Commercial': profMap[e.assigned_to] || '', 'À relancer': e.a_relancer ? 'Oui' : 'Non',
        'Créé par': profMap[e.created_by] || '', 'Date création': fmtDate(e.created_at),
        'Converti par': profMap[e.converted_by] || '', 'Date conversion': fmtDate(e.converted_at),
        'Proposition envoyée': fmtDate(e.proposition_envoyee_at), 'Proposition signée': fmtDate(e.proposition_signee_at),
        'Notes': e.notes || '',
      }))
    } else if (type === 'actions') {
      filename = 'Actions'
      data = actions.map(a => ({
        'Entreprise': entMap[a.enterprise_id] || '', 'Type échange': a.action_type, 'Résultat': a.result || '',
        'Commentaires': a.comments || '', 'Suivi': a.contact || '',
        'Besoin identifié': a.need_identified ? 'Oui' : 'Non', 'Type besoin': a.need_type || '',
        'Prochaine action': a.next_action || '', 'Date prochaine': fmtDate(a.next_action_date),
        'Réalisé par': profMap[a.performed_by] || '', 'Date': fmtDate(a.performed_at),
      }))
    } else if (type === 'interlocuteurs') {
      filename = 'Interlocuteurs'
      data = interlocuteurs.map(i => ({
        'Entreprise': entMap[i.enterprise_id] || '', 'Nom': i.name, 'Fonction': i.fonction || '', 'Téléphone': i.phone || '', 'Email': i.email || '',
      }))
    } else if (type === 'profiles') {
      filename = 'Utilisateurs'
      data = profiles.map(p => ({
        'Nom': p.full_name, 'Email': p.email, 'Rôle': p.role, 'Actif': p.is_active ? 'Oui' : 'Non',
      }))
    }

    // Create XLSX
    const ws = XLSX.utils.json_to_sheet(data)
    // Auto-size columns
    const colWidths = Object.keys(data[0] || {}).map(key => {
      const maxLen = Math.max(key.length, ...data.map(row => String(row[key] || '').length))
      return { wch: Math.min(maxLen + 2, 50) }
    })
    ws['!cols'] = colWidths
    // Style header
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, filename)
    XLSX.writeFile(wb, `germaclients_${filename.toLowerCase()}_${new Date().toISOString().split('T')[0]}.xlsx`)

    setExporting(false)
  }

  function fmtDate(d) { if (!d) return ''; return new Date(d).toLocaleDateString('fr-FR') }

  const exports = [
    { type: 'enterprises', label: 'Entreprises', desc: 'Toutes les entreprises avec secteurs, commerciaux et statuts' },
    { type: 'actions', label: 'Actions', desc: 'Historique complet des actions commerciales' },
    { type: 'interlocuteurs', label: 'Interlocuteurs', desc: 'Contacts par entreprise' },
    { type: 'profiles', label: 'Utilisateurs', desc: 'Liste des comptes' },
  ]

  return (
    <div className="space-y-4">
      <h2 className="font-display font-semibold text-gray-900">Export Excel</h2>
      <p className="text-sm text-gray-500">Exportez les données au format Excel (.xlsx) avec des noms lisibles.</p>
      <div className="grid sm:grid-cols-2 gap-3">
        {exports.map(exp => (
          <button key={exp.type} onClick={() => exportXLSX(exp.type)} disabled={exporting}
            className="card p-4 text-left hover:shadow-md transition-shadow flex items-start gap-3">
            <Download size={18} className="text-germa-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-sm text-gray-900">{exp.label}</p>
              <p className="text-xs text-gray-500">{exp.desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ===================== BACKUP TAB =====================
function BackupTab() {
  const { profile } = useAuth()
  const fileRef = useRef(); const [status, setStatus] = useState(null); const [restoring, setRestoring] = useState(false)

  async function doBackup() {
    setStatus(null)
    const [enterprises, actions, sectors, profiles, activityLogs, interlocuteurs] = await Promise.all([fetchAll('enterprises'), fetchAll('actions'), fetchAll('sectors'), fetchAll('profiles'), fetchAll('activity_log'), fetchAll('interlocuteurs')])
    const backup = { version: 2, date: new Date().toISOString(), app: 'GermaClients', data: { enterprises, actions, sectors, profiles, activity_log: activityLogs, interlocuteurs } }
    downloadFile(JSON.stringify(backup, null, 2), `germaclients_backup_${new Date().toISOString().split('T')[0]}.json`, 'application/json')
    setStatus({ type: 'success', message: 'Backup téléchargé avec succès.' })
    await logActivity({ type: ACTIVITY_TYPES.BACKUP_CREATED, userId: profile?.id, details: `${enterprises.length} entreprises, ${actions.length} actions` })
  }

  async function handleRestore(e) {
    const file = e.target.files[0]; if (!file) return
    if (!window.confirm('ATTENTION : la restauration va REMPLACER toutes les données actuelles. Continuer ?')) return
    setRestoring(true); setStatus(null)
    try {
      const text = await file.text(); const backup = JSON.parse(text)
      if (backup.app !== 'GermaClients' || !backup.data) { setStatus({ type: 'error', message: 'Fichier de backup invalide.' }); setRestoring(false); return }
      await deleteAll('interlocuteurs'); await deleteAll('actions'); await deleteAll('enterprises'); await deleteAll('sectors')
      if (backup.data.sectors?.length) await insertBatch('sectors', backup.data.sectors)
      if (backup.data.enterprises?.length) await insertBatch('enterprises', backup.data.enterprises)
      if (backup.data.actions?.length) await insertBatch('actions', backup.data.actions)
      if (backup.data.interlocuteurs?.length) await insertBatch('interlocuteurs', backup.data.interlocuteurs)
      setStatus({ type: 'success', message: `Restauration terminée : ${backup.data.enterprises?.length || 0} entreprises, ${backup.data.actions?.length || 0} actions.` })
      await logActivity({ type: ACTIVITY_TYPES.RESTORE_COMPLETED, userId: profile?.id, details: `${backup.data.enterprises?.length || 0} entreprises restaurées` })
    } catch (err) { setStatus({ type: 'error', message: 'Erreur restauration: ' + err.message }) }
    finally { setRestoring(false) }
  }

  return (
    <div className="space-y-4">
      <h2 className="font-display font-semibold text-gray-900">Backup & Restauration</h2>
      <p className="text-sm text-gray-500">Sauvegardez ou restaurez l'intégralité de la base de données au format JSON.</p>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="card p-5"><Database size={24} className="text-germa-600 mb-3" /><h3 className="font-semibold text-gray-900 mb-1">Sauvegarder</h3><p className="text-xs text-gray-500 mb-4">Télécharge un fichier JSON contenant toutes les données.</p><button onClick={doBackup} className="btn-primary w-full flex items-center justify-center gap-2"><Download size={16} /> Télécharger le backup</button></div>
        <div className="card p-5"><Upload size={24} className="text-amber-600 mb-3" /><h3 className="font-semibold text-gray-900 mb-1">Restaurer</h3><p className="text-xs text-gray-500 mb-4">Remplace TOUTES les données par celles du fichier.</p><button onClick={() => fileRef.current?.click()} disabled={restoring} className="btn-secondary w-full flex items-center justify-center gap-2 !border-amber-300 !text-amber-700 hover:!bg-amber-50">{restoring ? <div className="w-4 h-4 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" /> : <Upload size={16} />}<span>{restoring ? 'Restauration…' : 'Charger un backup'}</span></button><input ref={fileRef} type="file" accept=".json" onChange={handleRestore} className="hidden" /></div>
      </div>
      {status && (<div className={`flex items-center gap-2 p-3 rounded-xl text-sm ${status.type === 'success' ? 'bg-germa-50 text-germa-800' : 'bg-red-50 text-red-700'}`}>{status.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}{status.message}</div>)}
    </div>
  )
}

function downloadFile(content, filename, type) { const blob = new Blob([content], { type }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url) }
