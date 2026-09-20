import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { fetchAll } from '../utils/dataHelpers'
import { ACTION_TYPES, RESULTS, DEPARTMENTS, RESULT_COLORS, STATUS_COLORS, formatDate, isHiddenAccount } from '../utils/constants'
import { Building2, UserCheck, Phone, CalendarCheck, Download, Search, ArrowLeft } from 'lucide-react'
import * as XLSX from 'xlsx'

const VIEWS = [
  { key: 'entreprises', label: 'Entreprises créées', icon: Building2 },
  { key: 'conversions', label: 'Conversions', icon: UserCheck },
  { key: 'actions', label: 'Actions', icon: Phone },
  { key: 'rdv', label: 'RDV pris', icon: CalendarCheck },
]
const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
const monthKey = (d) => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}` }
const monthLabel = (k) => `${MONTHS[+k.slice(5) - 1].slice(0, 4)}. ${k.slice(0, 4)}`

export default function Historique() {
  const navigate = useNavigate()
  const { profile, isDirection } = useAuth()
  const [params, setParams] = useSearchParams()
  const view = VIEWS.some(v => v.key === params.get('vue')) ? params.get('vue') : 'actions'
  const setView = (v) => setParams({ vue: v })

  const [loading, setLoading] = useState(true)
  const [enterprises, setEnterprises] = useState([])
  const [actions, setActions] = useState([])
  const [profiles, setProfiles] = useState([])
  const [sectors, setSectors] = useState([])

  const now = new Date()
  const [year, setYear] = useState(String(now.getFullYear()))
  const [month, setMonth] = useState('')
  const [commercial, setCommercial] = useState('')
  const [sector, setSector] = useState('')
  const [dept, setDept] = useState('')
  const [actionType, setActionType] = useState('')
  const [result, setResult] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => { (async () => {
    setLoading(true)
    const [e, a, p, s] = await Promise.all([fetchAll('enterprises'), fetchAll('actions', { order: { column: 'performed_at', ascending: false } }), fetchAll('profiles'), fetchAll('sectors', { order: { column: 'name', ascending: true } })])
    setEnterprises(e); setActions(a); setProfiles(p); setSectors(s); setLoading(false)
  })() }, [])

  const entById = useMemo(() => Object.fromEntries(enterprises.map(e => [e.id, e])), [enterprises])
  const profName = (id) => profiles.find(p => p.id === id)?.full_name || '—'
  const sectorName = (id) => sectors.find(s => s.id === id)?.name || '—'
  const me = profile?.id

  // Lignes brutes selon la vue : { id, date, ent, action?, who }
  const rows = useMemo(() => {
    let list
    if (view === 'entreprises') list = enterprises.map(e => ({ id: e.id, date: e.created_at, ent: e, who: e.created_by || e.assigned_to }))
    else if (view === 'conversions') list = enterprises.filter(e => e.status === 'client' && e.converted_at).map(e => ({ id: e.id, date: e.converted_at, ent: e, who: e.converted_by || e.assigned_to }))
    else list = actions.filter(a => view === 'actions' || a.result === 'RDV pris').map(a => ({ id: a.id, date: a.performed_at, ent: entById[a.enterprise_id], action: a, who: a.performed_by }))
    list = list.filter(r => r.ent)
    // Un commercial ne voit que ce qui le concerne
    if (!isDirection) list = list.filter(r => r.who === me || r.ent.assigned_to === me)
    return list
  }, [view, enterprises, actions, entById, isDirection, me])

  const years = useMemo(() => [...new Set(rows.map(r => String(new Date(r.date).getFullYear())))].sort().reverse(), [rows])
  const commercials = useMemo(() => profiles.filter(p => !isHiddenAccount(p) && rows.some(r => r.who === p.id)), [profiles, rows])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter(r => {
      const d = new Date(r.date)
      if (year && String(d.getFullYear()) !== year) return false
      if (month && String(d.getMonth() + 1) !== month) return false
      if (commercial && r.who !== commercial) return false
      if (sector && r.ent.sector_id !== sector) return false
      if (dept && r.ent.department !== dept) return false
      if (actionType && r.action?.action_type !== actionType) return false
      if (result && r.action?.result !== result) return false
      if (q && !(r.ent.name || '').toLowerCase().includes(q) && !(r.ent.city || '').toLowerCase().includes(q) && !(r.action?.comments || '').toLowerCase().includes(q)) return false
      return true
    }).sort((a, b) => new Date(b.date) - new Date(a.date))
  }, [rows, year, month, commercial, sector, dept, actionType, result, search])

  const byMonth = useMemo(() => {
    const m = {}
    filtered.forEach(r => { const k = monthKey(r.date); m[k] = (m[k] || 0) + 1 })
    return Object.entries(m).sort()
  }, [filtered])

  function exportXLSX() {
    const data = filtered.map(r => view === 'actions' || view === 'rdv'
      ? { 'Date': formatDate(r.date), 'Entreprise': r.ent.name, 'Ville': r.ent.city || '', 'Secteur': sectorName(r.ent.sector_id), 'Dépt': r.ent.department || '', 'Type': r.action.action_type, 'Résultat': r.action.result || '', 'Commercial': profName(r.who), 'Prochaine action': r.action.next_action || '', 'Date relance': r.action.next_action_date ? formatDate(r.action.next_action_date) : '', 'Commentaires': r.action.comments || '' }
      : { 'Date': formatDate(r.date), 'Entreprise': r.ent.name, 'Ville': r.ent.city || '', 'Secteur': sectorName(r.ent.sector_id), 'Dépt': r.ent.department || '', 'Statut': r.ent.status, 'Commercial': profName(r.who) })
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Historique')
    XLSX.writeFile(wb, `historique_${view}_${year || 'tout'}${month ? '-' + month.padStart(2, '0') : ''}.xlsx`)
  }

  const isActionView = view === 'actions' || view === 'rdv'
  const current = VIEWS.find(v => v.key === view)

  return (
    <div className="space-y-4 animate-fade-in">
      <button onClick={() => navigate('/')} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-germa-700 transition-colors"><ArrowLeft size={16} /> Retour au tableau de bord</button>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-display font-bold text-2xl text-gray-900">Historique</h1>
          <p className="text-gray-500 text-sm mt-1">{isDirection ? 'Toute l\'activité, filtrable' : 'Votre activité, filtrable'}</p>
        </div>
        <button onClick={exportXLSX} disabled={!filtered.length} className="btn-secondary flex items-center gap-2 text-sm self-start disabled:opacity-50"><Download size={16} /> Exporter ({filtered.length})</button>
      </div>

      {/* Vues */}
      <div className="flex gap-2 flex-wrap">
        {VIEWS.map(v => (
          <button key={v.key} onClick={() => setView(v.key)} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${view === v.key ? 'bg-germa-700 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            <v.icon size={15} /> {v.label}
          </button>
        ))}
      </div>

      {/* Filtres */}
      <div className="card p-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="col-span-2 flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2"><Search size={15} className="text-gray-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Entreprise, ville, commentaire…" className="bg-transparent text-sm outline-none flex-1" /></div>
        <select value={year} onChange={e => setYear(e.target.value)} className="select-field"><option value="">Toutes années</option>{years.map(y => <option key={y} value={y}>{y}</option>)}</select>
        <select value={month} onChange={e => setMonth(e.target.value)} className="select-field"><option value="">Tous mois</option>{MONTHS.map((m, i) => <option key={m} value={String(i + 1)}>{m}</option>)}</select>
        {isDirection && <select value={commercial} onChange={e => setCommercial(e.target.value)} className="select-field"><option value="">Tous commerciaux</option>{commercials.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}</select>}
        <select value={sector} onChange={e => setSector(e.target.value)} className="select-field"><option value="">Tous secteurs</option>{sectors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
        <select value={dept} onChange={e => setDept(e.target.value)} className="select-field"><option value="">Tous dépts</option>{DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}</select>
        {isActionView && <select value={actionType} onChange={e => setActionType(e.target.value)} className="select-field"><option value="">Tous types</option>{ACTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select>}
        {view === 'actions' && <select value={result} onChange={e => setResult(e.target.value)} className="select-field"><option value="">Tous résultats</option>{RESULTS.map(r => <option key={r} value={r}>{r}</option>)}</select>}
      </div>

      {/* Totaux par mois */}
      {byMonth.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm font-semibold text-gray-900">{filtered.length} {current.label.toLowerCase()}</span>
          {byMonth.length > 1 && byMonth.map(([k, n]) => <span key={k} className="text-xs bg-white border border-gray-200 rounded-lg px-2 py-1 text-gray-600">{monthLabel(k)} : <b>{n}</b></span>)}
        </div>
      )}

      {/* Tableau */}
      {loading ? <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-germa-700 border-t-transparent rounded-full animate-spin" /></div>
        : filtered.length === 0 ? <div className="card p-12 text-center text-gray-400">Aucun résultat avec ces filtres.</div>
        : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Date</th>
                    <th className="px-4 py-3 text-left font-semibold">Entreprise</th>
                    <th className="px-4 py-3 text-left font-semibold hidden md:table-cell">Secteur</th>
                    <th className="px-4 py-3 text-left font-semibold hidden sm:table-cell">Dépt</th>
                    {isActionView ? <><th className="px-4 py-3 text-left font-semibold">Type</th><th className="px-4 py-3 text-left font-semibold">Résultat</th></> : <th className="px-4 py-3 text-left font-semibold">Statut</th>}
                    <th className="px-4 py-3 text-left font-semibold hidden sm:table-cell">Commercial</th>
                    {isActionView && <th className="px-4 py-3 text-left font-semibold hidden lg:table-cell">Commentaire</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(r => (
                    <tr key={r.id} onClick={() => navigate(`/entreprises/${r.ent.id}`)} className="hover:bg-gray-50 cursor-pointer">
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatDate(r.date)}</td>
                      <td className="px-4 py-3"><span className="font-medium text-gray-900">{r.ent.name}</span>{r.ent.city && <span className="text-xs text-gray-400 block">{r.ent.city}</span>}</td>
                      <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{sectorName(r.ent.sector_id)}</td>
                      <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{r.ent.department || '—'}</td>
                      {isActionView ? <>
                        <td className="px-4 py-3 text-gray-600">{r.action.action_type}</td>
                        <td className="px-4 py-3">{r.action.result ? <span className={`badge ${RESULT_COLORS[r.action.result] || 'bg-gray-100 text-gray-600'}`}>{r.action.result}</span> : '—'}</td>
                      </> : <td className="px-4 py-3"><span className={`badge ${STATUS_COLORS[r.ent.status] || ''}`}>{r.ent.status === 'client' ? 'Client' : 'Prospect'}</span></td>}
                      <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{profName(r.who)}</td>
                      {isActionView && <td className="px-4 py-3 text-gray-500 hidden lg:table-cell max-w-md truncate" title={r.action.comments || ''}>{r.action.comments || ''}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
    </div>
  )
}
