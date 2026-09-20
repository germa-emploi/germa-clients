import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { fetchAll } from '../utils/dataHelpers'
import { formatDate, isHiddenAccount } from '../utils/constants'
import { logActivity, ACTIVITY_TYPES } from '../utils/activityLog'
import { Newspaper, ExternalLink, Check, X, Plus, ArrowLeft } from 'lucide-react'

// 📰 Presse & actus : mentions d'entreprises de la base et pistes de nouveaux prospects (veille nocturne)
export default function Presse() {
  const navigate = useNavigate()
  const { profile, isDirection } = useAuth()
  const [tab, setTab] = useState('mention')
  const [dept, setDept] = useState('')
  const [showDone, setShowDone] = useState(false)
  const [rows, setRows] = useState([])
  const [enterprises, setEnterprises] = useState([])
  const [sectors, setSectors] = useState([])
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(null) // piste en cours de création

  async function load() {
    setLoading(true)
    const [v, e, s, p] = await Promise.all([fetchAll('ia_veille', { order: { column: 'created_at', ascending: false } }), fetchAll('enterprises'), fetchAll('sectors', { order: { column: 'name', ascending: true } }), fetchAll('profiles', { filters: { is_active: true } })])
    setRows(v || []); setEnterprises(e); setSectors(s); setProfiles(p.filter(x => !isHiddenAccount(x))); setLoading(false)
  }
  useEffect(() => { load() }, [])
  const entById = useMemo(() => Object.fromEntries(enterprises.map(e => [e.id, e])), [enterprises])

  const list = rows.filter(r => r.kind === tab && (!dept || r.department === dept) && (showDone || r.status === 'new' || (tab === 'mention' && r.status === 'read' && false)))
  const counts = { mention: rows.filter(r => r.kind === 'mention' && r.status === 'new' && (!dept || r.department === dept)).length, piste: rows.filter(r => r.kind === 'piste' && r.status === 'new' && (!dept || r.department === dept)).length }

  async function setStatus(r, status) {
    const { error } = await supabase.from('ia_veille').update({ status }).eq('id', r.id)
    if (!error) setRows(rs => rs.map(x => x.id === r.id ? { ...x, status } : x))
  }
  async function createProspect(r, form) {
    const { data, error } = await supabase.from('enterprises').insert({ name: form.name, city: form.city || null, department: form.department || null, sector_id: form.sector_id || null, status: 'prospect', created_by: profile.id, assigned_to: form.assigned_to || profile.id, notes: `Piste presse (${r.source}, ${formatDate(r.published_at || r.created_at)}) : ${r.why || ''}\n${r.url}` }).select('id').single()
    if (error) { alert(error.message); return }
    await supabase.from('ia_veille').update({ status: 'created', created_enterprise_id: data.id }).eq('id', r.id)
    await logActivity({ type: ACTIVITY_TYPES.ENTERPRISE_CREATED, userId: profile.id, targetType: 'enterprise', targetId: data.id, targetName: form.name, details: 'Créé depuis une piste presse' })
    setCreating(null); load()
  }

  return (
    <div className="space-y-4 animate-fade-in max-w-4xl">
      <button onClick={() => navigate('/')} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-germa-700 transition-colors"><ArrowLeft size={16} /> Retour au tableau de bord</button>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-display font-bold text-2xl text-gray-900 flex items-center gap-2"><Newspaper size={24} className="text-germa-700" /> Presse & actus</h1>
          <p className="text-gray-500 text-sm mt-1">Veille automatique chaque nuit sur la presse régionale et les marchés publics. Chaque information renvoie à sa source.</p>
        </div>
        <div className="flex items-center gap-2">
          {['', '67', '68'].map(d => <button key={d} onClick={() => setDept(d)} className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${dept === d ? 'bg-germa-700 text-white border-germa-700' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>{d || 'Tous'}</button>)}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-2">
          <button onClick={() => setTab('mention')} className={`px-3 py-2 rounded-xl text-sm font-medium ${tab === 'mention' ? 'bg-germa-700 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>Nos entreprises dans l'actu {counts.mention > 0 && <span className="ml-1 text-xs bg-white/20 rounded-full px-1.5">{counts.mention}</span>}</button>
          <button onClick={() => setTab('piste')} className={`px-3 py-2 rounded-xl text-sm font-medium ${tab === 'piste' ? 'bg-germa-700 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>Pistes détectées {counts.piste > 0 && <span className="ml-1 text-xs bg-white/20 rounded-full px-1.5">{counts.piste}</span>}</button>
        </div>
        <label className="text-xs text-gray-500 flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={showDone} onChange={e => setShowDone(e.target.checked)} className="accent-germa-700" /> Afficher les éléments traités</label>
      </div>

      {loading ? <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-germa-700 border-t-transparent rounded-full animate-spin" /></div>
        : list.length === 0 ? <div className="card p-12 text-center text-gray-400 text-sm">Rien de nouveau{dept ? ` dans le ${dept}` : ''} — la veille tourne chaque nuit.</div>
        : <div className="space-y-3">
          {list.map(r => {
            const e = r.enterprise_id ? entById[r.enterprise_id] : null
            const done = r.status !== 'new'
            return (
              <div key={r.id} className={`card p-4 ${done ? 'opacity-60' : ''}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap text-xs text-gray-500 mb-1">
                      <span>{formatDate(r.published_at || r.created_at)}</span><span>·</span><span>{r.source}</span>
                      {r.department && <span className="badge bg-gray-100 text-gray-600">{r.department}</span>}
                      {done && <span className="badge bg-gray-100 text-gray-500">{r.status === 'read' ? 'Lu' : r.status === 'created' ? 'Prospect créé' : 'Ignoré'}</span>}
                    </div>
                    {r.kind === 'mention'
                      ? <p className="font-medium text-gray-900">{e ? <button onClick={() => navigate(`/entreprises/${e.id}`)} className="hover:underline text-germa-800">{e.name}</button> : r.company_name}{e?.city && <span className="text-sm font-normal text-gray-500"> · {e.city}</span>}</p>
                      : <p className="font-medium text-gray-900">{r.company_name}{r.city && <span className="text-sm font-normal text-gray-500"> · {r.city}</span>}</p>}
                    <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-700 hover:underline inline-flex items-center gap-1 mt-0.5">{r.title} <ExternalLink size={12} /></a>
                    <p className="text-sm text-gray-700 mt-1.5">{r.kind === 'mention' ? r.summary : r.why}</p>
                  </div>
                  {!done && (
                    <div className="flex flex-col gap-1.5 flex-shrink-0">
                      {r.kind === 'mention' && <button onClick={() => setStatus(r, 'read')} className="btn-secondary text-xs flex items-center gap-1"><Check size={13} /> Lu</button>}
                      {r.kind === 'piste' && <button onClick={() => setCreating(r)} className="btn-primary text-xs flex items-center gap-1"><Plus size={13} /> Créer le prospect</button>}
                      {r.kind === 'piste' && isDirection && <button onClick={() => setStatus(r, 'ignored')} className="btn-secondary text-xs flex items-center gap-1"><X size={13} /> Ignorer</button>}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>}

      {creating && <CreateFromPiste piste={creating} sectors={sectors} profiles={profiles} me={profile} onClose={() => setCreating(null)} onCreate={createProspect} />}
    </div>
  )
}

function CreateFromPiste({ piste, sectors, profiles, me, onClose, onCreate }) {
  const [form, setForm] = useState({ name: piste.company_name || '', city: piste.city || '', department: piste.department || '', sector_id: '', assigned_to: me.id })
  const [busy, setBusy] = useState(false)
  const u = (k, v) => setForm(f => ({ ...f, [k]: v }))
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100"><h2 className="font-display font-semibold text-lg">Créer le prospect</h2><button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X size={20} /></button></div>
        <div className="p-6 space-y-3">
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label><input value={form.name} onChange={e => u('name', e.target.value)} className="input-field" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Ville</label><input value={form.city} onChange={e => u('city', e.target.value)} className="input-field" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Département</label><select value={form.department} onChange={e => u('department', e.target.value)} className="select-field"><option value="">—</option><option value="67">67</option><option value="68">68</option></select></div>
          </div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Secteur</label><select value={form.sector_id} onChange={e => u('sector_id', e.target.value)} className="select-field"><option value="">—</option>{sectors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Commercial</label><select value={form.assigned_to} onChange={e => u('assigned_to', e.target.value)} className="select-field">{profiles.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}</select></div>
          <p className="text-xs text-gray-500">La source de la piste sera copiée dans les notes de la fiche.</p>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex justify-end gap-2"><button onClick={onClose} className="btn-secondary">Annuler</button><button disabled={busy || !form.name.trim()} onClick={() => { setBusy(true); onCreate(piste, form) }} className="btn-primary disabled:opacity-50">{busy ? 'Création…' : 'Créer'}</button></div>
      </div>
    </div>
  )
}
