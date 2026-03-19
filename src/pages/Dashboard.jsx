import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend, AreaChart, Area,
  ComposedChart
} from 'recharts'
import {
  TrendingUp, Building2, Users, Phone, CalendarCheck, UserCheck,
  ArrowRight, Clock, Target, BarChart3, AlertTriangle, Bell, CheckCircle2, XCircle, X, Maximize2
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { formatDate, RESULT_COLORS, STATUS_COLORS } from '../utils/constants'
import { fetchAll } from '../utils/dataHelpers'

const COLORS_MAIN = ['#2D6A4F', '#52B788', '#40916C', '#74C69D', '#95D5B2', '#B7E4C7', '#1B4332', '#D8F3DC', '#8ECAE6', '#FFB703']
const PIE_RESULT = { 'À relancer': '#3b82f6', 'RDV pris': '#22c55e', 'Refus': '#ef4444', 'Sans suite': '#9ca3af', 'Signé': '#10b981' }
const PIE_TYPE = { 'Physique': '#2D6A4F', 'Téléphonique': '#0ea5e9', 'Mail': '#f59e0b', 'Courrier': '#8b5cf6', 'Non défini': '#9ca3af' }
const MONTHS_FR = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
const MONTHS_SHORT = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']

export default function Dashboard() {
  const { profile, isDirection } = useAuth()
  const navigate = useNavigate()
  const [enterprises, setEnterprises] = useState([])
  const [actions, setActions] = useState([])
  const [profiles, setProfiles] = useState([])
  const [sectors, setSectors] = useState([])
  const [loading, setLoading] = useState(true)
  const [chartModal, setChartModal] = useState(null) // 'activity' | 'results' | 'types'
  const [kpiModal, setKpiModal] = useState(null) // 'enterprises' | 'conversions' | 'rdv'
  const now = new Date()
  // KPI card filter for Actions
  const [kpiActYear, setKpiActYear] = useState(now.getFullYear())
  const [kpiActMonth, setKpiActMonth] = useState(now.getMonth())

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const [entData, actData, profData, secData] = await Promise.all([
      fetchAll('enterprises'),
      fetchAll('actions', { order: { column: 'performed_at', ascending: false } }),
      fetchAll('profiles'),
      fetchAll('sectors'),
    ])
    setEnterprises(entData); setActions(actData); setProfiles(profData); setSectors(secData)
    setLoading(false)
  }

  // Available years
  const availableYears = useMemo(() => {
    const allDates = [...enterprises.map(e => new Date(e.created_at).getFullYear()), ...actions.map(a => new Date(a.performed_at).getFullYear())]
    const years = [...new Set(allDates)].sort((a, b) => b - a)
    if (!years.includes(now.getFullYear())) years.unshift(now.getFullYear())
    return years
  }, [enterprises, actions])

  // KPI Actions count (scoped to user if not direction)
  const kpiActActions = isDirection ? actions : actions.filter(a => a.performed_by === profile?.id)
  const kpiActCount = kpiActActions.filter(a => { const d = new Date(a.performed_at); return d.getFullYear() === kpiActYear && d.getMonth() === kpiActMonth }).length

  const stats = useMemo(() => {
    const thisYear = now.getFullYear()
    const thisMonth = now.getMonth()
    const totalEnterprises = enterprises.length
    const prospects = enterprises.filter(e => e.status === 'prospect').length
    const clients = enterprises.filter(e => e.status === 'client').length
    const aRelancer = enterprises.filter(e => e.a_relancer).length
    const conversionsAnnee = enterprises.filter(e => e.converted_at && new Date(e.converted_at).getFullYear() === thisYear).length
    const conversionsMois = enterprises.filter(e => e.converted_at && new Date(e.converted_at).getFullYear() === thisYear && new Date(e.converted_at).getMonth() === thisMonth).length
    const rdvAnnee = actions.filter(a => a.result === 'RDV pris' && new Date(a.performed_at).getFullYear() === thisYear).length
    const rdvMois = actions.filter(a => { const d = new Date(a.performed_at); return a.result === 'RDV pris' && d.getFullYear() === thisYear && d.getMonth() === thisMonth }).length

    // Pie data filtered to current year
    const thisYearActions = actions.filter(a => new Date(a.performed_at).getFullYear() === thisYear)
    const resultCounts = {}
    thisYearActions.forEach(a => { if (a.result) resultCounts[a.result] = (resultCounts[a.result] || 0) + 1 })
    const resultData = Object.entries(resultCounts).map(([name, value]) => ({ name, value, color: PIE_RESULT[name] || '#9ca3af' })).sort((a, b) => b.value - a.value)
    const typeCounts = {}
    thisYearActions.forEach(a => { if (a.action_type) typeCounts[a.action_type] = (typeCounts[a.action_type] || 0) + 1 })
    const typeData = Object.entries(typeCounts).map(([name, value]) => ({ name, value, color: PIE_TYPE[name] || '#9ca3af' })).sort((a, b) => b.value - a.value)

    // By sector / dept
    const bySector = sectors.map(s => {
      const sEnts = enterprises.filter(e => e.sector_id === s.id)
      return { name: s.name.length > 15 ? s.name.substring(0, 14) + '…' : s.name, total: sEnts.length, clients: sEnts.filter(e => e.status === 'client').length, prospects: sEnts.filter(e => e.status === 'prospect').length }
    }).filter(s => s.total > 0).sort((a, b) => b.total - a.total)

    const dept67 = enterprises.filter(e => e.department === '67')
    const dept68 = enterprises.filter(e => e.department === '68')
    const deptNone = enterprises.filter(e => !e.department)
    const byDept = [
      { name: 'Dép. 67', prospects: dept67.filter(e => e.status === 'prospect').length, clients: dept67.filter(e => e.status === 'client').length },
      { name: 'Dép. 68', prospects: dept68.filter(e => e.status === 'prospect').length, clients: dept68.filter(e => e.status === 'client').length },
      ...(deptNone.length > 0 ? [{ name: 'Non défini', prospects: deptNone.filter(e => e.status === 'prospect').length, clients: deptNone.filter(e => e.status === 'client').length }] : []),
    ]

    // Relances & top
    const upcomingRelancesAll = actions.filter(a => a.next_action_date && a.result === 'À relancer')
    // Keep only the latest relance per enterprise
    const latestRelanceByEnt = {}
    upcomingRelancesAll.forEach(a => {
      if (!latestRelanceByEnt[a.enterprise_id] || new Date(a.performed_at) > new Date(latestRelanceByEnt[a.enterprise_id].performed_at)) {
        latestRelanceByEnt[a.enterprise_id] = a
      }
    })
    const upcomingRelances = Object.values(latestRelanceByEnt).sort((a, b) => new Date(a.next_action_date) - new Date(b.next_action_date)).slice(0, 15)
    const entreprisesARelancer = enterprises.filter(e => e.a_relancer).slice(0, 8)
    return { totalEnterprises, prospects, clients, aRelancer, conversionsAnnee, conversionsMois, rdvAnnee, rdvMois, resultData, typeData, bySector, byDept, upcomingRelances, entreprisesARelancer }
  }, [enterprises, actions, profiles, sectors])

  // Activity chart data builder
  function buildMonthlyData(startYear, startMonth, endYear, endMonth) {
    const data = []
    let y = startYear, m = startMonth
    while (y < endYear || (y === endYear && m <= endMonth)) {
      const label = `${MONTHS_SHORT[m]} ${String(y).slice(2)}`
      const mActions = actions.filter(a => { const d = new Date(a.performed_at); return d.getFullYear() === y && d.getMonth() === m })
      const mConv = enterprises.filter(e => { if (!e.converted_at) return false; const d = new Date(e.converted_at); return d.getFullYear() === y && d.getMonth() === m }).length
      const taux = mActions.length > 0 ? parseFloat(((mConv / mActions.length) * 100).toFixed(1)) : 0
      data.push({ month: label, actions: mActions.length, conversions: mConv, taux })
      m++; if (m > 11) { m = 0; y++ }
    }
    return data
  }

  function buildAnnualData(startYear, endYear) {
    const data = []
    for (let y = startYear; y <= endYear; y++) {
      const yActions = actions.filter(a => new Date(a.performed_at).getFullYear() === y)
      const yConv = enterprises.filter(e => { if (!e.converted_at) return false; return new Date(e.converted_at).getFullYear() === y }).length
      const taux = yActions.length > 0 ? parseFloat(((yConv / yActions.length) * 100).toFixed(1)) : 0
      data.push({ month: String(y), actions: yActions.length, conversions: yConv, taux })
    }
    return data
  }

  // Default activity chart: Jan 2026 to now (or 12 months sliding if > 12 months)
  const defaultActivityData = useMemo(() => {
    const thisYear = now.getFullYear()
    const thisMonth = now.getMonth()
    const jan2026 = new Date(2026, 0, 1)
    const monthsSinceJan2026 = (thisYear - 2026) * 12 + thisMonth
    if (monthsSinceJan2026 > 11) {
      // 12 months sliding
      const start = new Date(thisYear, thisMonth - 11, 1)
      return buildMonthlyData(start.getFullYear(), start.getMonth(), thisYear, thisMonth)
    }
    return buildMonthlyData(2026, 0, thisYear, thisMonth)
  }, [enterprises, actions])

  // Pie data builders for modals
  function buildPieData(type, year, month, isAnnual) {
    const filtered = actions.filter(a => {
      const d = new Date(a.performed_at)
      if (isAnnual) return d.getFullYear() === year
      return d.getFullYear() === year && d.getMonth() === month
    })
    const counts = {}
    if (type === 'results') {
      filtered.forEach(a => { if (a.result) counts[a.result] = (counts[a.result] || 0) + 1 })
      return Object.entries(counts).map(([name, value]) => ({ name, value, color: PIE_RESULT[name] || '#9ca3af' })).sort((a, b) => b.value - a.value)
    } else {
      filtered.forEach(a => { if (a.action_type) counts[a.action_type] = (counts[a.action_type] || 0) + 1 })
      return Object.entries(counts).map(([name, value]) => ({ name, value, color: PIE_TYPE[name] || '#9ca3af' })).sort((a, b) => b.value - a.value)
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-3 border-germa-700 border-t-transparent rounded-full animate-spin" /></div>

  function YearMonthSelect({ year, month, onYear, onMonth, className = '' }) {
    return (
      <div className={`flex gap-1 ${className}`} onClick={e => e.stopPropagation()}>
        <select value={year} onChange={e => onYear(Number(e.target.value))} className="text-[10px] border border-gray-200 rounded px-1 py-0.5 bg-white text-gray-600 w-16">
          {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select value={month} onChange={e => onMonth(Number(e.target.value))} className="text-[10px] border border-gray-200 rounded px-1 py-0.5 bg-white text-gray-600 w-14">
          {MONTHS_FR.map((m, i) => <option key={i} value={i}>{m.substring(0, 4)}</option>)}
        </select>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-bold text-2xl text-gray-900">Bonjour {profile?.full_name?.split(' ')[0]} 👋</h1>
        <p className="text-gray-500 text-sm mt-1">Vue d'ensemble de la prospection</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div onClick={() => setKpiModal('enterprises')} className="card p-3 sm:p-4 cursor-pointer hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-germa-50 text-germa-700"><Building2 size={16} /></div>
            <span className="text-[10px] text-gray-400 italic">→ Historique</span>
          </div>
          <p className="text-xl sm:text-2xl font-display font-bold text-gray-900 mt-2">{stats.totalEnterprises}</p>
          <p className="text-xs text-gray-500">Entreprises</p>
          <p className="text-xs text-germa-600 font-medium mt-0.5">{stats.prospects} prospects · {stats.clients} clients</p>
        </div>
        <div onClick={() => setKpiModal('conversions')} className="card p-3 sm:p-4 cursor-pointer hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-emerald-50 text-emerald-700"><UserCheck size={16} /></div>
            <span className="text-[10px] text-gray-400 italic">→ Historique</span>
          </div>
          <p className="text-xl sm:text-2xl font-display font-bold text-gray-900 mt-2">{stats.conversionsAnnee}</p>
          <p className="text-xs text-gray-500">Conversions en {now.getFullYear()}</p>
          <p className="text-xs text-germa-600 font-medium mt-0.5">{stats.conversionsMois} ce mois</p>
        </div>
        <div className="card p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-purple-50 text-purple-700"><Phone size={16} /></div>
            <YearMonthSelect year={kpiActYear} month={kpiActMonth} onYear={setKpiActYear} onMonth={setKpiActMonth} />
          </div>
          <p className="text-xl sm:text-2xl font-display font-bold text-gray-900 mt-2">{kpiActCount}</p>
          <p className="text-xs text-gray-500">{isDirection ? 'Actions' : 'Mes actions'}</p>
        </div>
        <div onClick={() => setKpiModal('rdv')} className="card p-3 sm:p-4 cursor-pointer hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-rose-50 text-rose-700"><CalendarCheck size={16} /></div>
            <span className="text-[10px] text-gray-400 italic">→ Historique</span>
          </div>
          <p className="text-xl sm:text-2xl font-display font-bold text-gray-900 mt-2">{stats.rdvAnnee}</p>
          <p className="text-xs text-gray-500">RDV pris en {now.getFullYear()}</p>
          <p className="text-xs text-germa-600 font-medium mt-0.5">{stats.rdvMois} ce mois</p>
        </div>
      </div>

      {/* KPI Detail Modal */}
      {kpiModal && <KPIDetailModal type={kpiModal} enterprises={enterprises} actions={actions} profiles={profiles} onClose={() => setKpiModal(null)} navigate={navigate} availableYears={availableYears} />}

      {/* Activity & Conversions chart */}
      <div className="card p-4 sm:p-5 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setChartModal('activity')}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold text-gray-900 text-sm">📈 Activité & Conversions</h3>
          <Maximize2 size={16} className="text-gray-400" />
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={defaultActivityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="month" fontSize={10} />
              <YAxis yAxisId="left" fontSize={10} />
              <YAxis yAxisId="right" orientation="right" fontSize={10} unit="%" />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area yAxisId="left" type="monotone" dataKey="actions" stroke="#2D6A4F" fill="#2D6A4F" fillOpacity={0.1} strokeWidth={2} name="Actions" />
              <Bar yAxisId="left" dataKey="conversions" fill="#22c55e" radius={[4, 4, 0, 0]} barSize={20} name="Conversions" />
              <Line yAxisId="right" type="monotone" dataKey="taux" stroke="#ef4444" strokeWidth={2} dot={{ r: 3, fill: '#ef4444' }} name="Taux conv./action %" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Pie charts — current year */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="card p-4 sm:p-5 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setChartModal('results')}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-semibold text-gray-900 text-sm">🎯 Résultats des actions ({now.getFullYear()})</h3>
            <Maximize2 size={16} className="text-gray-400" />
          </div>
          {stats.resultData.length > 0 ? (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart><Pie data={stats.resultData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false} style={{ fontSize: 10 }}>{stats.resultData.map((e, i) => <Cell key={i} fill={e.color} />)}</Pie><Tooltip /></PieChart>
              </ResponsiveContainer>
            </div>
          ) : <div className="h-48 flex items-center justify-center text-gray-400 text-sm">Pas de données</div>}
        </div>
        <div className="card p-4 sm:p-5 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setChartModal('types')}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-semibold text-gray-900 text-sm">📞 Types d'échange ({now.getFullYear()})</h3>
            <Maximize2 size={16} className="text-gray-400" />
          </div>
          {stats.typeData.length > 0 ? (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart><Pie data={stats.typeData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={4} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false} style={{ fontSize: 11 }}>{stats.typeData.map((e, i) => <Cell key={i} fill={e.color} />)}</Pie><Tooltip /></PieChart>
              </ResponsiveContainer>
            </div>
          ) : <div className="h-48 flex items-center justify-center text-gray-400 text-sm">Pas de données</div>}
        </div>
      </div>

      {/* Bar charts */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card p-4 sm:p-5">
          <h3 className="font-display font-semibold text-gray-900 mb-4 text-sm">📂 Entreprises par secteur</h3>
          {stats.bySector.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.bySector} layout="vertical" margin={{ left: 10 }}>
                  <XAxis type="number" fontSize={10} /><YAxis type="category" dataKey="name" fontSize={10} width={100} /><Tooltip /><Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="prospects" fill="#3b82f6" stackId="a" name="Prospects" /><Bar dataKey="clients" fill="#22c55e" stackId="a" radius={[0, 4, 4, 0]} name="Clients" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <div className="h-64 flex items-center justify-center text-gray-400 text-sm">Aucune donnée</div>}
        </div>
        <div className="card p-4 sm:p-5">
          <h3 className="font-display font-semibold text-gray-900 mb-4 text-sm">📍 Répartition par département</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.byDept}><XAxis dataKey="name" fontSize={11} /><YAxis fontSize={10} /><Tooltip /><Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="prospects" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Prospects" /><Bar dataKey="clients" fill="#22c55e" radius={[4, 4, 0, 0]} name="Clients" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Entreprises à relancer */}
      {stats.entreprisesARelancer.length > 0 && (
        <div className="card p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-semibold text-gray-900 text-sm">🔔 Entreprises à relancer</h3>
            <span className="text-xs text-amber-600 font-medium bg-amber-50 px-2 py-1 rounded-lg">{stats.aRelancer} total</span>
          </div>
          <div className="space-y-1.5">
            {stats.entreprisesARelancer.map(ent => {
              const sector = sectors.find(s => s.id === ent.sector_id)
              return (
                <div key={ent.id} onClick={() => navigate(`/entreprises/${ent.id}`)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-amber-50/50 hover:bg-amber-50 cursor-pointer transition-colors">
                  <Bell size={14} className="text-amber-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{ent.name}</p><p className="text-xs text-gray-500">{sector?.name || '—'} · {ent.department || '—'}</p></div>
                  <span className={`text-xs px-2 py-0.5 rounded-lg ${ent.status === 'client' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>{ent.status === 'client' ? 'Client' : 'Prospect'}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Relances */}
      {stats.upcomingRelances.length > 0 && (
        <div className="card p-4 sm:p-5">
          <h3 className="font-display font-semibold text-gray-900 mb-3 text-sm">⏰ Prochaines relances planifiées</h3>
          <div className="space-y-1.5">
            {stats.upcomingRelances.map(action => {
              const ent = enterprises.find(e => e.id === action.enterprise_id)
              const performer = profiles.find(p => p.id === action.performed_by)
              const isOverdue = new Date(action.next_action_date) < new Date()
              return (
                <div key={action.id} onClick={() => ent && navigate(`/entreprises/${ent.id}`)} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${isOverdue ? 'bg-red-50 hover:bg-red-100' : 'bg-gray-50 hover:bg-gray-100'}`}>
                  <Clock size={14} className={isOverdue ? 'text-red-500' : 'text-gray-400'} />
                  <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{ent?.name || '?'}</p><p className="text-xs text-gray-500">{action.next_action} — {performer?.full_name}</p></div>
                  <span className={`text-xs font-medium ${isOverdue ? 'text-red-600' : 'text-gray-600'}`}>{isOverdue ? '⚠️ ' : ''}{formatDate(action.next_action_date)}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Chart modals */}
      {chartModal === 'activity' && <ActivityChartModal actions={actions} enterprises={enterprises} buildMonthlyData={buildMonthlyData} buildAnnualData={buildAnnualData} availableYears={availableYears} onClose={() => setChartModal(null)} />}
      {(chartModal === 'results' || chartModal === 'types') && <PieChartModal type={chartModal} actions={actions} buildPieData={buildPieData} availableYears={availableYears} onClose={() => setChartModal(null)} />}
    </div>
  )
}

// ======================== ACTIVITY CHART MODAL ========================
function ActivityChartModal({ actions, enterprises, buildMonthlyData, buildAnnualData, availableYears, onClose }) {
  const now = new Date()
  const [mode, setMode] = useState('mensuel') // 'mensuel' | 'annuel'
  const [startYear, setStartYear] = useState(2026)
  const [startMonth, setStartMonth] = useState(0)

  const data = useMemo(() => {
    if (mode === 'annuel') return buildAnnualData(availableYears[availableYears.length - 1] || 2024, now.getFullYear())
    return buildMonthlyData(startYear, startMonth, now.getFullYear(), now.getMonth())
  }, [mode, startYear, startMonth, actions, enterprises])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-display font-semibold text-lg">📈 Activité & Conversions</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
        </div>
        <div className="px-6 py-3 border-b border-gray-50 flex flex-wrap gap-3 items-center">
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            <button onClick={() => setMode('mensuel')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${mode === 'mensuel' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>Mensuel</button>
            <button onClick={() => setMode('annuel')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${mode === 'annuel' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>Annuel</button>
          </div>
          {mode === 'mensuel' && (
            <div className="flex gap-2 items-center text-sm">
              <span className="text-gray-500">Depuis :</span>
              <select value={startYear} onChange={e => setStartYear(Number(e.target.value))} className="select-field text-sm !w-auto !py-1">
                {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <select value={startMonth} onChange={e => setStartMonth(Number(e.target.value))} className="select-field text-sm !w-auto !py-1">
                {MONTHS_FR.map((m, i) => <option key={i} value={i}>{m}</option>)}
              </select>
            </div>
          )}
        </div>
        <div className="p-6 flex-1" style={{ minHeight: 500 }}>
          <ResponsiveContainer width="100%" height={480}>
            <ComposedChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="month" fontSize={10} />
              <YAxis yAxisId="left" fontSize={10} />
              <YAxis yAxisId="right" orientation="right" fontSize={10} unit="%" />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area yAxisId="left" type="monotone" dataKey="actions" stroke="#2D6A4F" fill="#2D6A4F" fillOpacity={0.1} strokeWidth={2} name="Actions" />
              <Bar yAxisId="left" dataKey="conversions" fill="#22c55e" radius={[4, 4, 0, 0]} barSize={20} name="Conversions" />
              <Line yAxisId="right" type="monotone" dataKey="taux" stroke="#ef4444" strokeWidth={2} dot={{ r: 3, fill: '#ef4444' }} name="Taux conv./action %" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

// ======================== PIE CHART MODAL ========================
function PieChartModal({ type, actions, buildPieData, availableYears, onClose }) {
  const now = new Date()
  const [mode, setMode] = useState('annuel')
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const title = type === 'results' ? '🎯 Résultats des actions' : '📞 Types d\'échange'

  const data = useMemo(() => buildPieData(type, year, month, mode === 'annuel'), [type, year, month, mode, actions])
  const total = data.reduce((s, d) => s + d.value, 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-display font-semibold text-lg">{title}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
        </div>
        <div className="px-6 py-3 border-b border-gray-50 flex flex-wrap gap-3 items-center">
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            <button onClick={() => setMode('annuel')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${mode === 'annuel' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>Annuel</button>
            <button onClick={() => setMode('mensuel')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${mode === 'mensuel' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>Mensuel</button>
          </div>
          <select value={year} onChange={e => setYear(Number(e.target.value))} className="select-field text-sm !w-auto !py-1">
            {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          {mode === 'mensuel' && (
            <select value={month} onChange={e => setMonth(Number(e.target.value))} className="select-field text-sm !w-auto !py-1">
              {MONTHS_FR.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
          )}
          <span className="text-sm font-semibold text-germa-700 bg-germa-50 px-3 py-1 rounded-lg">{total} actions</span>
        </div>
        <div className="p-6 flex-1">
          {data.length > 0 ? (
            <div className="flex items-center gap-6">
              <div style={{ width: 280, height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart><Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={110} paddingAngle={3} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false} style={{ fontSize: 11 }}>{data.map((e, i) => <Cell key={i} fill={e.color} />)}</Pie><Tooltip /></PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-2">
                {data.map((d, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                    <span className="text-sm text-gray-700 flex-1">{d.name}</span>
                    <span className="text-sm font-semibold text-gray-900">{d.value}</span>
                    <span className="text-xs text-gray-400 w-10 text-right">{total > 0 ? Math.round(d.value / total * 100) : 0}%</span>
                  </div>
                ))}
              </div>
            </div>
          ) : <p className="text-gray-400 text-sm text-center py-12">Pas de données pour cette période</p>}
        </div>
      </div>
    </div>
  )
}

// ======================== KPI DETAIL MODAL ========================
function KPIDetailModal({ type, enterprises, actions, profiles, onClose, navigate, availableYears }) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())

  const titles = { enterprises: 'Entreprises ajoutées', conversions: 'Conversions (prospect → client)', rdv: 'RDV pris' }

  let items = []
  if (type === 'enterprises') {
    items = enterprises.filter(e => { const d = new Date(e.created_at); return d.getFullYear() === year && d.getMonth() === month })
      .map(e => ({ id: e.id, name: e.name, sub: e.city || e.department || '', badge: e.status === 'client' ? 'Client' : 'Prospect', badgeColor: e.status === 'client' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700', by: profiles.find(p => p.id === e.created_by)?.full_name, date: e.created_at }))
  } else if (type === 'conversions') {
    items = enterprises.filter(e => { if (!e.converted_at) return false; const d = new Date(e.converted_at); return d.getFullYear() === year && d.getMonth() === month })
      .map(e => ({ id: e.id, name: e.name, sub: e.city || e.department || '', badge: 'Converti', badgeColor: 'bg-emerald-50 text-emerald-700', by: profiles.find(p => p.id === e.converted_by)?.full_name, date: e.converted_at }))
  } else if (type === 'rdv') {
    items = actions.filter(a => { if (a.result !== 'RDV pris') return false; const d = new Date(a.performed_at); return d.getFullYear() === year && d.getMonth() === month })
      .map(a => { const ent = enterprises.find(e => e.id === a.enterprise_id); return { id: ent?.id, name: ent?.name || '?', sub: a.comments ? a.comments.substring(0, 60) : '', badge: 'RDV pris', badgeColor: 'bg-rose-50 text-rose-700', by: profiles.find(p => p.id === a.performed_by)?.full_name, date: a.performed_at } })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-display font-semibold text-lg">{titles[type]}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
        </div>
        <div className="px-6 py-3 border-b border-gray-50 flex gap-3">
          <select value={year} onChange={e => setYear(Number(e.target.value))} className="select-field text-sm !w-auto">
            {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={month} onChange={e => setMonth(Number(e.target.value))} className="select-field text-sm flex-1">
            {MONTHS_FR.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select>
          <span className="flex items-center text-sm font-semibold text-germa-700 bg-germa-50 px-3 rounded-lg">{items.length}</span>
        </div>
        <div className="overflow-y-auto flex-1 p-4">
          {items.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">Aucun résultat pour {MONTHS_FR[month]} {year}</p>
          ) : (
            <div className="space-y-1.5">
              {items.map((item, i) => (
                <div key={i} onClick={() => { if (item.id) { onClose(); navigate(`/entreprises/${item.id}`) } }}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{item.name}</p>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${item.badgeColor}`}>{item.badge}</span>
                    </div>
                    {item.sub && <p className="text-xs text-gray-500 truncate mt-0.5">{item.sub}</p>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-gray-400">{formatDate(item.date)}</p>
                    {item.by && <p className="text-xs text-gray-400">{item.by}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
