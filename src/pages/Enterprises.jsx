import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import {
  Search, Plus, Filter, Building2, X, MapPin, ArrowUpDown, ArrowUp, ArrowDown, ArrowLeft
} from 'lucide-react'
import { DEPARTMENTS, STATUS_COLORS, RESULTS, formatDate, isHiddenAccount } from '../utils/constants'
import { fetchAll } from '../utils/dataHelpers'
import { logActivity, ACTIVITY_TYPES } from '../utils/activityLog'

const MONTHS_FR = ['Janv.', 'Févr.', 'Mars', 'Avr.', 'Mai', 'Juin', 'Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.']

// Mémorise recherche, filtres et tri de la liste (par onglet prospects/clients) le temps de la session,
// pour les retrouver intacts en revenant d'une fiche entreprise.
const LIST_STATE_KEYS = ['search', 'filterSector', 'filterDept', 'filterCommercial', 'showFilters', 'filterProposition', 'filterResult', 'filterDateYear', 'filterDateMonth', 'filterAncienClient', 'sortColumn', 'sortDir']
function readListState(status) {
  try { return JSON.parse(sessionStorage.getItem(`gc_list_${status}`) || '{}') } catch { return {} }
}
function writeListState(status, state) {
  try { sessionStorage.setItem(`gc_list_${status}`, JSON.stringify(state)) } catch { /* stockage indisponible : on ignore */ }
}

export default function Enterprises({ filterStatus }) {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const saved = readListState(filterStatus)
  const [enterprises, setEnterprises] = useState([])
  const [sectors, setSectors] = useState([])
  const [profiles, setProfiles] = useState([])
  const [actions, setActions] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState(saved.search ?? '')
  const [filterSector, setFilterSector] = useState(saved.filterSector ?? '')
  const [filterDept, setFilterDept] = useState(saved.filterDept ?? '')
  const [filterCommercial, setFilterCommercial] = useState(saved.filterCommercial ?? '')
  const [showFilters, setShowFilters] = useState(saved.showFilters ?? false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showMailing, setShowMailing] = useState(false)
  const [interlocuteurs, setInterlocuteurs] = useState([])
  const [filterProposition, setFilterProposition] = useState(saved.filterProposition ?? '')
  const [filterResult, setFilterResult] = useState(saved.filterResult ?? '')
  const [filterDateYear, setFilterDateYear] = useState(saved.filterDateYear ?? '')
  const [filterDateMonth, setFilterDateMonth] = useState(saved.filterDateMonth ?? '')
  const [filterAncienClient, setFilterAncienClient] = useState(saved.filterAncienClient ?? '')
  const [sortColumn, setSortColumn] = useState(saved.sortColumn ?? 'name')
  const [sortDir, setSortDir] = useState(saved.sortDir ?? 'asc')

  const listState = { search, filterSector, filterDept, filterCommercial, showFilters, filterProposition, filterResult, filterDateYear, filterDateMonth, filterAncienClient, sortColumn, sortDir }
  const setters = { search: setSearch, filterSector: setFilterSector, filterDept: setFilterDept, filterCommercial: setFilterCommercial, showFilters: setShowFilters, filterProposition: setFilterProposition, filterResult: setFilterResult, filterDateYear: setFilterDateYear, filterDateMonth: setFilterDateMonth, filterAncienClient: setFilterAncienClient, sortColumn: setSortColumn, sortDir: setSortDir }
  const defaults = { search: '', filterSector: '', filterDept: '', filterCommercial: '', showFilters: false, filterProposition: '', filterResult: '', filterDateYear: '', filterDateMonth: '', filterAncienClient: '', sortColumn: 'name', sortDir: 'asc' }
  // Sauvegarde à chaque changement
  useEffect(() => { writeListState(filterStatus, listState) }, [filterStatus, ...LIST_STATE_KEYS.map(k => listState[k])])
  // Changement d'onglet prospects ↔ clients : recharge l'état propre à cet onglet
  useEffect(() => {
    const s = readListState(filterStatus)
    LIST_STATE_KEYS.forEach(k => setters[k](s[k] ?? defaults[k]))
  }, [filterStatus])

  const isProspects = filterStatus === 'prospect'
  const isClients = filterStatus === 'client'
  const title = isClients ? 'Clients' : 'Prospects'

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const [entData, secData, profData, actData, interData] = await Promise.all([
      fetchAll('enterprises', { order: { column: 'created_at', ascending: false } }),
      fetchAll('sectors', { order: { column: 'name', ascending: true } }),
      fetchAll('profiles', { filters: { is_active: true } }),
      fetchAll('actions', { order: { column: 'performed_at', ascending: false } }),
      fetchAll('interlocuteurs'),
    ])
    setEnterprises(entData)
    setSectors(secData)
    setProfiles(profData)
    setActions(actData)
    setInterlocuteurs(interData)
    setLoading(false)
  }

  // Action count per enterprise
  const actionCounts = useMemo(() => {
    const map = {}
    actions.forEach(a => { map[a.enterprise_id] = (map[a.enterprise_id] || 0) + 1 })
    return map
  }, [actions])

  // Last action date per enterprise
  const lastActionDate = useMemo(() => {
    const map = {}
    actions.forEach(a => {
      if (!map[a.enterprise_id] || new Date(a.performed_at) > new Date(map[a.enterprise_id])) {
        map[a.enterprise_id] = a.performed_at
      }
    })
    return map
  }, [actions])

  // Résultat de la dernière action par entreprise
  const lastActionResult = useMemo(() => {
    const last = {}
    actions.forEach(a => { if (!last[a.enterprise_id] || new Date(a.performed_at) > new Date(last[a.enterprise_id].performed_at)) last[a.enterprise_id] = a })
    return Object.fromEntries(Object.entries(last).map(([id, a]) => [id, a.result || '']))
  }, [actions])

  // Filter
  const filtered = useMemo(() => {
    return enterprises.filter(e => {
      if (filterStatus && e.status !== filterStatus) return false
      if (search && !e.name.toLowerCase().includes(search.toLowerCase())) return false
      if (filterSector && e.sector_id !== filterSector) return false
      if (filterDept && e.department !== filterDept) return false
      if (filterCommercial === '__none__' && e.assigned_to) return false
      if (filterCommercial && filterCommercial !== '__none__' && e.assigned_to !== filterCommercial) return false
      if (filterProposition === 'envoyee' && !e.proposition_envoyee_at) return false
      if (filterProposition === 'signee' && !e.proposition_signee_at) return false
      if (filterProposition === 'aucune' && (e.proposition_envoyee_at || e.proposition_signee_at)) return false
      if (filterResult === 'aucune' && lastActionResult[e.id] !== undefined) return false
      if (filterResult && filterResult !== 'aucune' && lastActionResult[e.id] !== filterResult) return false
      if (filterAncienClient === 'oui' && !e.dernier_contrat_at) return false
      if (filterAncienClient === 'non' && e.dernier_contrat_at) return false
      if (filterDateYear) {
        const dateField = isClients ? e.converted_at : e.created_at
        if (!dateField) return false
        const d = new Date(dateField)
        if (d.getFullYear() !== Number(filterDateYear)) return false
        if (filterDateMonth !== '' && d.getMonth() !== Number(filterDateMonth)) return false
      }
      return true
    })
  }, [enterprises, search, filterStatus, filterSector, filterDept, filterCommercial, filterProposition, filterResult, lastActionResult, filterAncienClient, filterDateYear, filterDateMonth])

  // Sort
  const sorted = useMemo(() => {
    const arr = [...filtered]
    arr.sort((a, b) => {
      let va, vb
      switch (sortColumn) {
        case 'name':
          va = a.name.toLowerCase(); vb = b.name.toLowerCase()
          break
        case 'sector':
          va = sectors.find(s => s.id === a.sector_id)?.name?.toLowerCase() || ''
          vb = sectors.find(s => s.id === b.sector_id)?.name?.toLowerCase() || ''
          break
        case 'department':
          va = a.department || ''; vb = b.department || ''
          break
        case 'actions':
          va = actionCounts[a.id] || 0; vb = actionCounts[b.id] || 0
          break
        case 'lastAction':
          va = lastActionDate[a.id] || ''; vb = lastActionDate[b.id] || ''
          break
        case 'commercial':
          va = profiles.find(p => p.id === a.assigned_to)?.full_name?.toLowerCase() || ''
          vb = profiles.find(p => p.id === b.assigned_to)?.full_name?.toLowerCase() || ''
          break
        case 'proposition':
          const propOrder = (e) => e.proposition_signee_at ? 3 : e.proposition_envoyee_at ? 2 : 0
          va = propOrder(a); vb = propOrder(b)
          break
        case 'dateCol':
          va = (isClients ? a.converted_at : a.created_at) || ''; vb = (isClients ? b.converted_at : b.created_at) || ''
          break
        case 'ancienClient':
          va = a.dernier_contrat_at || ''; vb = b.dernier_contrat_at || ''
          break
        case 'created_at':
          va = a.created_at; vb = b.created_at
          break
        default:
          va = a.name.toLowerCase(); vb = b.name.toLowerCase()
      }
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return arr
  }, [filtered, sortColumn, sortDir, sectors, actionCounts, lastActionDate, profiles])

  function toggleSort(col) {
    if (sortColumn === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(col)
      setSortDir('asc')
    }
  }

  function SortIcon({ col }) {
    if (sortColumn !== col) return <ArrowUpDown size={12} className="text-gray-300" />
    return sortDir === 'asc' ? <ArrowUp size={12} className="text-germa-600" /> : <ArrowDown size={12} className="text-germa-600" />
  }

  const activeFilters = [filterSector, filterDept, filterCommercial, filterProposition, filterResult, filterDateYear, filterAncienClient].filter(Boolean).length

  function clearFilters() {
    setFilterSector(''); setFilterDept(''); setFilterCommercial(''); setFilterProposition(''); setFilterDateYear(''); setFilterDateMonth(''); setFilterAncienClient('')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-3 border-germa-700 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <button onClick={() => navigate('/')}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-germa-700 transition-colors">
        <ArrowLeft size={16} /> Retour au tableau de bord
      </button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-display font-bold text-2xl text-gray-900">{title}</h1>
          <p className="text-gray-500 text-sm">{sorted.length} {title.toLowerCase()}</p>
        </div>
        <div className="flex gap-2 self-start">
          <button onClick={() => setShowMailing(true)} className="btn-secondary flex items-center gap-2 text-sm" title="Choisir les adresses de la liste affichée et les copier pour un mailing">📋 Copier les e-mails</button>
          <button onClick={() => setShowAddModal(true)} className="btn-primary flex items-center gap-2">
            <Plus size={18} />
            <span>{isProspects ? 'Nouveau prospect' : 'Nouveau client'}</span>
          </button>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-field pl-9"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`btn-secondary flex items-center gap-2 ${activeFilters > 0 ? '!border-germa-500 !text-germa-700' : ''}`}
        >
          <Filter size={16} />
          <span>Filtres</span>
          {activeFilters > 0 && (
            <span className="w-5 h-5 rounded-full bg-germa-700 text-white text-xs flex items-center justify-center">
              {activeFilters}
            </span>
          )}
        </button>
      </div>

      {/* Filter bar */}
      {showFilters && (
        <div className="card p-4 flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[140px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">Secteur</label>
            <select value={filterSector} onChange={e => setFilterSector(e.target.value)} className="select-field text-sm">
              <option value="">Tous</option>
              {sectors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[100px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">Département</label>
            <select value={filterDept} onChange={e => setFilterDept(e.target.value)} className="select-field text-sm">
              <option value="">Tous</option>
              {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">Commercial</label>
            <select value={filterCommercial} onChange={e => setFilterCommercial(e.target.value)} className="select-field text-sm">
              <option value="">Tous</option>
              <option value="__none__">Aucun</option>
              {profiles.filter(p => !isHiddenAccount(p)).map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">Proposition</label>
            <select value={filterProposition} onChange={e => setFilterProposition(e.target.value)} className="select-field text-sm">
              <option value="">Toutes</option>
              <option value="envoyee">Envoyée</option>
              <option value="signee">Signée</option>
              <option value="aucune">Aucune</option>
            </select>
          </div>
          <div className="flex-1 min-w-[150px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">Dernier résultat</label>
            <select value={filterResult} onChange={e => setFilterResult(e.target.value)} className="select-field text-sm">
              <option value="">Tous</option>
              {RESULTS.map(r => <option key={r} value={r}>{r}</option>)}
              <option value="aucune">Aucune action</option>
            </select>
          </div>
          <div className="flex-1 min-w-[100px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">{isClients ? 'Conversion' : 'Création'}</label>
            <div className="flex gap-1">
              <select value={filterDateYear} onChange={e => { setFilterDateYear(e.target.value); if (!e.target.value) setFilterDateMonth('') }} className="select-field text-sm flex-1">
                <option value="">Année</option>
                {[...new Set(enterprises.map(e => { const d = new Date(isClients ? e.converted_at || e.created_at : e.created_at); return d.getFullYear() }))].sort((a,b) => b-a).map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              {filterDateYear && (
                <select value={filterDateMonth} onChange={e => setFilterDateMonth(e.target.value)} className="select-field text-sm flex-1">
                  <option value="">Mois</option>
                  {MONTHS_FR.map((m, i) => <option key={i} value={i}>{m}</option>)}
                </select>
              )}
            </div>
          </div>
          {isProspects && (
            <div className="flex-1 min-w-[120px]">
              <label className="block text-xs font-medium text-gray-500 mb-1">Ancien client</label>
              <select value={filterAncienClient} onChange={e => setFilterAncienClient(e.target.value)} className="select-field text-sm">
                <option value="">Tous</option>
                <option value="oui">Oui</option>
                <option value="non">Non</option>
              </select>
            </div>
          )}
          {activeFilters > 0 && (
            <button onClick={clearFilters} className="text-sm text-gray-500 hover:text-red-600 flex items-center gap-1 pb-2.5">
              <X size={14} /> Effacer
            </button>
          )}
        </div>
      )}

      {/* Table */}
      {sorted.length === 0 ? (
        <div className="card p-12 text-center">
          <Building2 size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">Aucun {title.toLowerCase()} trouvé</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <Th label="Entreprise" col="name" sortColumn={sortColumn} sortDir={sortDir} onSort={toggleSort} />
                  <Th label="Secteur" col="sector" sortColumn={sortColumn} sortDir={sortDir} onSort={toggleSort} />
                  <Th label="Dpt" col="department" sortColumn={sortColumn} sortDir={sortDir} onSort={toggleSort} className="hidden sm:table-cell" />
                  <Th label="Prop." col="proposition" sortColumn={sortColumn} sortDir={sortDir} onSort={toggleSort} className="hidden sm:table-cell" />
                  <Th label="Actions" col="actions" sortColumn={sortColumn} sortDir={sortDir} onSort={toggleSort} className="hidden md:table-cell" />
                  <Th label="Dernière action" col="lastAction" sortColumn={sortColumn} sortDir={sortDir} onSort={toggleSort} className="hidden lg:table-cell" />
                  <Th label="Commercial" col="commercial" sortColumn={sortColumn} sortDir={sortDir} onSort={toggleSort} className="hidden md:table-cell" />
                  <Th label={isClients ? 'Conversion' : 'Création'} col="dateCol" sortColumn={sortColumn} sortDir={sortDir} onSort={toggleSort} className="hidden lg:table-cell" />
                  {isProspects && <Th label="Ancien client" col="ancienClient" sortColumn={sortColumn} sortDir={sortDir} onSort={toggleSort} className="hidden lg:table-cell" />}
                </tr>
              </thead>
              <tbody>
                {sorted.map(ent => {
                  const sector = sectors.find(s => s.id === ent.sector_id)
                  const assignedTo = profiles.find(p => p.id === ent.assigned_to)

                  return (
                    <tr
                      key={ent.id}
                      onClick={() => navigate(`/entreprises/${ent.id}`)}
                      className="border-b border-gray-50 hover:bg-germa-50/50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">
                        <div className="flex items-center gap-2">
                          {ent.name}
                        </div>
                        {ent.city && <span className="text-xs text-gray-400 block">{ent.city}</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{sector?.name || '—'}</td>
                      <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{ent.department || '—'}</td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        {ent.proposition_signee_at ? <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" title="Signée" />
                          : ent.proposition_envoyee_at ? <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" title="Envoyée" />
                          : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{actionCounts[ent.id] || 0}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs hidden lg:table-cell">{formatDate(lastActionDate[ent.id])}</td>
                      <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{assignedTo?.full_name?.split(' ')[0] || '—'}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs hidden lg:table-cell">{formatDate(isClients ? ent.converted_at : ent.created_at)}</td>
                      {isProspects && (
                        <td className="px-4 py-3 hidden lg:table-cell">
                          {ent.dernier_contrat_at ? (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-amber-50 text-amber-700">{formatDate(ent.dernier_contrat_at)}</span>
                          ) : <span className="text-gray-300 text-xs">—</span>}
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Enterprise Modal */}
      {showMailing && <MailingModal enterprises={sorted} interlocuteurs={interlocuteurs} title={title} onClose={() => setShowMailing(false)} />}
      {showAddModal && (
        <AddEnterpriseModal
          sectors={sectors}
          defaultStatus={filterStatus || 'prospect'}
          onClose={() => setShowAddModal(false)}
          onCreated={() => { setShowAddModal(false); loadData() }}
        />
      )}
    </div>
  )
}

function Th({ label, col, sortColumn, sortDir, onSort, className = '' }) {
  const isActive = sortColumn === col
  return (
    <th
      onClick={() => onSort(col)}
      className={`px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-germa-700 select-none ${className}`}
    >
      <div className="flex items-center gap-1.5">
        {label}
        {isActive ? (
          sortDir === 'asc' ? <ArrowUp size={12} className="text-germa-600" /> : <ArrowDown size={12} className="text-germa-600" />
        ) : (
          <ArrowUpDown size={12} className="text-gray-300" />
        )}
      </div>
    </th>
  )
}

function AddEnterpriseModal({ sectors, defaultStatus, onClose, onCreated }) {
  const { profile } = useAuth()
  const [form, setForm] = useState({
    name: '', sector_id: '', city: '', department: '', notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function update(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Le nom est obligatoire'); return }
    setSaving(true)
    setError('')
    const { data: newEnt, error: err } = await supabase.from('enterprises').insert({
      name: form.name.trim(),
      sector_id: form.sector_id || null,
      city: form.city.trim() || null,
      department: form.department || null,
      notes: form.notes.trim() || null,
      status: defaultStatus || 'prospect',
      created_by: profile.id,
      assigned_to: profile.id,
    }).select().single()
    if (err) {
      setError(err.message)
      setSaving(false)
    } else {
      await logActivity({
        type: ACTIVITY_TYPES.ENTERPRISE_CREATED,
        userId: profile.id,
        targetType: 'enterprise',
        targetId: newEnt?.id,
        targetName: form.name.trim(),
      })
      onCreated()
    }
  }

  const titleLabel = defaultStatus === 'client' ? 'Nouveau client' : 'Nouveau prospect'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-display font-semibold text-lg">{titleLabel}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-xl">{error}</div>}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom de l'entreprise *</label>
            <input value={form.name} onChange={e => update('name', e.target.value)} className="input-field" required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Secteur</label>
              <select value={form.sector_id} onChange={e => update('sector_id', e.target.value)} className="select-field">
                <option value="">— Choisir —</option>
                {sectors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Département</label>
              <select value={form.department} onChange={e => update('department', e.target.value)} className="select-field">
                <option value="">— Choisir —</option>
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ville</label>
            <input value={form.city} onChange={e => update('city', e.target.value)} className="input-field" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea value={form.notes} onChange={e => update('notes', e.target.value)} className="input-field" rows={2} />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Annuler</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Plus size={16} />}
              <span>Créer</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ============================================================
// Mailing : choisir les entreprises de la liste filtrée et copier leurs e-mails
// ============================================================
function MailingModal({ enterprises, interlocuteurs = [], title, onClose }) {
  // Une ligne par adresse connue : e-mail de la fiche + e-mails des interlocuteurs (sans doublon)
  const rows = useMemo(() => {
    const out = []
    const byEnt = {}
    interlocuteurs.forEach(i => { (byEnt[i.enterprise_id] = byEnt[i.enterprise_id] || []).push(i) })
    enterprises.forEach(e => {
      const seen = new Set()
      const add = (email, who) => { const m = (email || '').trim().toLowerCase(); if (!m.includes('@') || seen.has(m)) return; seen.add(m); out.push({ id: `${e.id}|${m}`, entId: e.id, name: e.name, city: e.city, email: m, who }) }
      add(e.email, e.contact_name && !/^a d[ée]finir$/i.test(e.contact_name) ? e.contact_name : '')
      ;(byEnt[e.id] || []).forEach(i => add(i.email, i.name && !/^[-–]?$/.test(i.name.trim()) && !/^a d[ée]finir$/i.test(i.name) ? i.name : ''))
    })
    return out
  }, [enterprises, interlocuteurs])
  const withoutMail = enterprises.filter(e => !rows.some(r => r.entId === e.id)).length
  const [checked, setChecked] = useState(() => new Set(rows.map(r => r.id)))
  const [q, setQ] = useState('')
  const [done, setDone] = useState('')
  const visible = rows.filter(r => !q || r.name.toLowerCase().includes(q.toLowerCase()) || (r.city || '').toLowerCase().includes(q.toLowerCase()) || (r.who || '').toLowerCase().includes(q.toLowerCase()))
  const toggle = (id) => setChecked(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const allVisible = visible.length > 0 && visible.every(r => checked.has(r.id))
  const toggleAll = () => setChecked(s => { const n = new Set(s); visible.forEach(r => allVisible ? n.delete(r.id) : n.add(r.id)); return n })
  const selected = rows.filter(r => checked.has(r.id))
  const copy = () => {
    const mails = [...new Set(selected.map(r => r.email))]
    navigator.clipboard?.writeText(mails.join('; ')).then(() => setDone(`${mails.length} adresse${mails.length > 1 ? 's' : ''} copiée${mails.length > 1 ? 's' : ''} — collez dans le champ Cci d'Outlook`))
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div><h2 className="font-display font-semibold text-lg">Copier les e-mails</h2><p className="text-xs text-gray-500">{title} · filtre en cours : {enterprises.length} entreprise{enterprises.length > 1 ? 's' : ''}{withoutMail ? `, dont ${withoutMail} sans e-mail` : ''}</p></div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
        </div>
        <div className="px-6 pt-4 flex items-center gap-3">
          <div className="flex-1 flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2"><Search size={15} className="text-gray-400" /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Filtrer par nom ou ville…" className="bg-transparent text-sm outline-none flex-1" /></div>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer whitespace-nowrap"><input type="checkbox" checked={allVisible} onChange={toggleAll} className="w-4 h-4 accent-germa-700" /> Tout {allVisible ? 'décocher' : 'cocher'}</label>
        </div>
        <div className="px-6 py-3 overflow-y-auto flex-1 divide-y divide-gray-100">
          {visible.map(r => (
            <label key={r.id} className="flex items-center gap-3 py-2 cursor-pointer hover:bg-gray-50 -mx-2 px-2 rounded-lg">
              <input type="checkbox" checked={checked.has(r.id)} onChange={() => toggle(r.id)} className="w-4 h-4 accent-germa-700 flex-shrink-0" />
              <div className="min-w-0 flex-1"><div className="text-sm font-medium text-gray-900 truncate">{r.name}{r.who ? <span className="font-normal text-gray-500"> — {r.who}</span> : ''}</div><div className="text-xs text-gray-500 truncate">{r.city || '—'} · {r.email}</div></div>
            </label>
          ))}
          {visible.length === 0 && <div className="py-8 text-center text-sm text-gray-400">Aucune adresse e-mail{q ? ' pour cette recherche' : ' (ni sur les fiches, ni sur les interlocuteurs) dans la liste filtrée'}.</div>}
        </div>
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex items-center justify-between gap-3">
          <span className="text-sm text-gray-600">{done || `${selected.length} sélectionnée${selected.length > 1 ? 's' : ''} sur ${rows.length}`}</span>
          <div className="flex gap-2"><button onClick={onClose} className="btn-secondary">Fermer</button><button onClick={copy} disabled={!selected.length} className="btn-primary disabled:opacity-50">Copier {selected.length} adresse{selected.length > 1 ? 's' : ''}</button></div>
        </div>
      </div>
    </div>
  )
}
