import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { fetchAll } from '../utils/dataHelpers'
import { formatDate, todayISO, RESULT_COLORS } from '../utils/constants'
import { Clock, ArrowLeft, Phone, Mail } from 'lucide-react'

// Vue « à la place de » : ce qu'un commercial aurait à faire aujourd'hui (pour la direction, en cas d'absence)
export default function ActionsDuJour() {
  const { profileId } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const [enterprises, setEnterprises] = useState([])
  const [actions, setActions] = useState([])
  const [interlocuteurs, setInterlocuteurs] = useState([])
  const today = todayISO()

  useEffect(() => { (async () => {
    setLoading(true)
    const [p, e, a, i] = await Promise.all([
      fetchAll('profiles', { filters: { id: profileId } }),
      fetchAll('enterprises', { filters: { assigned_to: profileId } }),
      fetchAll('actions', { order: { column: 'performed_at', ascending: false } }),
      fetchAll('interlocuteurs'),
    ])
    setProfile(p[0] || null); setEnterprises(e); setActions(a); setInterlocuteurs(i)
    setLoading(false)
  })() }, [profileId])

  const entById = useMemo(() => Object.fromEntries(enterprises.map(e => [e.id, e])), [enterprises])
  // Dernière action de chaque entreprise du commercial
  const lastByEnt = useMemo(() => {
    const m = {}
    actions.forEach(a => { if (entById[a.enterprise_id] && !m[a.enterprise_id]) m[a.enterprise_id] = a })
    return m
  }, [actions, entById])
  const relances = useMemo(() => Object.values(lastByEnt).filter(a => a.result === 'À relancer' && a.next_action_date).sort((a, b) => a.next_action_date.localeCompare(b.next_action_date)), [lastByEnt])
  const late = relances.filter(a => a.next_action_date < today)
  const dueToday = relances.filter(a => a.next_action_date === today)
  const contactOf = (e) => {
    const i = interlocuteurs.find(x => x.enterprise_id === e.id && x.name && !/^a d[ée]finir$/i.test(x.name))
    return i ? `${i.name}${i.phone ? ` · ${i.phone}` : ''}` : (e.contact_name || '')
  }

  const Row = ({ a, tone }) => {
    const e = entById[a.enterprise_id]; if (!e) return null
    const prev = actions.find(x => x.enterprise_id === e.id && x.comments)
    return (
      <div onClick={() => navigate(`/entreprises/${e.id}`)} className={`px-4 py-3 rounded-xl cursor-pointer transition-colors ${tone === 'late' ? 'bg-red-50 hover:bg-red-100' : 'bg-amber-50 hover:bg-amber-100'}`}>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{e.name} <span className="text-xs font-normal text-gray-500">{e.city}</span></p>
            <p className="text-xs text-gray-600">{a.next_action || 'Relance'} · {tone === 'late' ? `en retard depuis le ${formatDate(a.next_action_date)}` : "prévue aujourd'hui"}</p>
          </div>
          <div className="text-right text-xs text-gray-600 flex-shrink-0">
            {(e.phone || contactOf(e)) && <p className="flex items-center gap-1 justify-end"><Phone size={12} /> {e.phone || ''} {contactOf(e) && <span className="text-gray-400">{contactOf(e)}</span>}</p>}
            {e.email && <p className="flex items-center gap-1 justify-end text-gray-400"><Mail size={12} /> {e.email}</p>}
          </div>
        </div>
        {prev?.comments && <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">Dernier commentaire ({formatDate(prev.performed_at)}) : {prev.comments}</p>}
      </div>
    )
  }

  if (loading) return <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-germa-700 border-t-transparent rounded-full animate-spin" /></div>
  if (!profile) return <div className="card p-12 text-center text-gray-400">Commercial introuvable.</div>

  return (
    <div className="space-y-5 animate-fade-in max-w-4xl">
      <button onClick={() => navigate('/')} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-germa-700 transition-colors"><ArrowLeft size={16} /> Retour au tableau de bord</button>
      <div>
        <h1 className="font-display font-bold text-2xl text-gray-900">Actions du jour — {profile.full_name}</h1>
        <p className="text-gray-500 text-sm mt-1">{formatDate(today)} · {enterprises.length} entreprises suivies · pour assurer le suivi en son absence</p>
      </div>

      <div className="card p-5">
        <h2 className="font-display font-semibold text-amber-700 text-sm mb-3">⏰ Relances prévues aujourd'hui <span className="text-xs font-normal text-gray-400">({dueToday.length})</span></h2>
        <div className="space-y-2">
          {dueToday.length === 0 && <p className="text-sm text-gray-400 py-3 text-center">Aucune relance datée d'aujourd'hui.</p>}
          {dueToday.map(a => <Row key={a.id} a={a} tone="today" />)}
        </div>
      </div>
      <div className="card p-5 border-red-100">
        <h2 className="font-display font-semibold text-red-700 text-sm mb-3">⚠️ Relances en retard <span className="text-xs font-normal text-gray-400">({late.length})</span></h2>
        <div className="space-y-2">
          {late.length === 0 && <p className="text-sm text-gray-400 py-3 text-center">Aucune relance en retard 👍</p>}
          {late.map(a => <Row key={a.id} a={a} tone="late" />)}
        </div>
      </div>
    </div>
  )
}
