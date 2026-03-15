import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import {
  ArrowLeft, Building2, Phone, Mail, MapPin, User, Calendar,
  Plus, X, CheckCircle2, Clock, MessageSquare, Edit3, Trash2, Repeat,
  FileText, UserPlus, Send, PenTool, UserCog, Merge, Search
} from 'lucide-react'
import {
  ACTION_TYPES, CHANNELS, RESULTS,
  STATUS_COLORS, RESULT_COLORS,
  formatDate, formatDateTime, DEPARTMENTS
} from '../utils/constants'
import { fetchAll } from '../utils/dataHelpers'
import { logActivity, ACTIVITY_TYPES as LOG_TYPES } from '../utils/activityLog'

export default function EnterpriseDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile, isDirection } = useAuth()
  const [enterprise, setEnterprise] = useState(null)
  const [actions, setActions] = useState([])
  const [sectors, setSectors] = useState([])
  const [profiles, setProfiles] = useState([])
  const [interlocuteurs, setInterlocuteurs] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddAction, setShowAddAction] = useState(false)
  const [editingAction, setEditingAction] = useState(null)
  const [showEditEnterprise, setShowEditEnterprise] = useState(false)
  const [converting, setConverting] = useState(false)
  const [showReclasser, setShowReclasser] = useState(false)
  const [showAddInterlocuteur, setShowAddInterlocuteur] = useState(false)
  const [editingInterlocuteur, setEditingInterlocuteur] = useState(null)
  const [showProposition, setShowProposition] = useState(false)
  const [showFusion, setShowFusion] = useState(false)

  useEffect(() => { loadData() }, [id])

  async function loadData() {
    setLoading(true)
    const [entRes, actData, secData, profData, interData] = await Promise.all([
      supabase.from('enterprises').select('*').eq('id', id).single(),
      fetchAll('actions', { eq: { column: 'enterprise_id', value: id }, order: { column: 'performed_at', ascending: false } }),
      fetchAll('sectors'),
      fetchAll('profiles'),
      fetchAll('interlocuteurs', { eq: { column: 'enterprise_id', value: id }, order: { column: 'created_at', ascending: true } }),
    ])
    setEnterprise(entRes.data)
    setActions(actData)
    setSectors(secData)
    setProfiles(profData)
    setInterlocuteurs(interData)
    setLoading(false)
  }

  async function handleConvert() {
    if (!window.confirm('Confirmer la conversion de ce prospect en client ?')) return
    setConverting(true)
    await supabase.from('enterprises').update({
      status: 'client', converted_at: new Date().toISOString(), converted_by: profile.id,
      proposition_envoyee_at: null, proposition_signee_at: null,
    }).eq('id', id)
    await logActivity({ type: LOG_TYPES.ENTERPRISE_CONVERTED, userId: profile.id, targetType: 'enterprise', targetId: id, targetName: enterprise.name })
    await loadData()
    setConverting(false)
  }

  async function handleDelete() {
    if (!window.confirm('Supprimer cette entreprise et tout son historique ?')) return
    await logActivity({ type: LOG_TYPES.ENTERPRISE_DELETED, userId: profile.id, targetType: 'enterprise', targetId: id, targetName: enterprise.name })
    await supabase.from('enterprises').delete().eq('id', id)
    navigate('/prospects')
  }

  async function deleteInterlocuteur(interId) {
    if (!window.confirm('Supprimer cet interlocuteur ?')) return
    await supabase.from('interlocuteurs').delete().eq('id', interId)
    loadData()
  }

  async function deleteProposition() {
    if (!window.confirm('Supprimer la proposition commerciale ?')) return
    await supabase.from('enterprises').update({ proposition_envoyee_at: null, proposition_signee_at: null }).eq('id', id)
    await logActivity({ type: LOG_TYPES.ENTERPRISE_UPDATED, userId: profile.id, targetType: 'enterprise', targetId: id, targetName: enterprise.name, details: 'Proposition commerciale supprimée' })
    loadData()
  }

  async function changeAssignment(newUserId) {
    await supabase.from('enterprises').update({ assigned_to: newUserId || null }).eq('id', id)
    await logActivity({ type: LOG_TYPES.ENTERPRISE_UPDATED, userId: profile.id, targetType: 'enterprise', targetId: id, targetName: enterprise.name, details: `Réaffecté à ${profiles.find(p => p.id === newUserId)?.full_name || 'non assigné'}` })
    loadData()
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-3 border-germa-700 border-t-transparent rounded-full animate-spin" /></div>
  if (!enterprise) return <div className="text-center py-12"><p className="text-gray-500">Entreprise introuvable</p><button onClick={() => navigate('/prospects')} className="btn-primary mt-4">Retour</button></div>

  const sector = sectors.find(s => s.id === enterprise.sector_id)
  const creator = profiles.find(p => p.id === enterprise.created_by)
  const converter = enterprise.converted_by ? profiles.find(p => p.id === enterprise.converted_by) : null
  const assignedTo = enterprise.assigned_to ? profiles.find(p => p.id === enterprise.assigned_to) : null
  const statusColor = STATUS_COLORS[enterprise.status] || STATUS_COLORS.prospect
  const hasProposition = enterprise.proposition_envoyee_at || enterprise.proposition_signee_at

  return (
    <div className="space-y-4 sm:space-y-6">
      <button onClick={() => navigate(enterprise?.status === 'client' ? '/clients' : '/prospects')}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-germa-700 transition-colors">
        <ArrowLeft size={16} /> Retour
      </button>

      {/* Header card */}
      <div className="card p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-germa-50 flex items-center justify-center flex-shrink-0">
              <Building2 size={22} className="text-germa-600" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-display font-bold text-xl sm:text-2xl text-gray-900">{enterprise.name}</h1>
                <span className={`badge ${statusColor.bg} ${statusColor.text}`}>{statusColor.label}</span>
                {enterprise.a_relancer && <span className="badge bg-amber-50 text-amber-700">🔔 À relancer</span>}
              </div>

              {/* Proposition badges — graphiques */}
              {enterprise.status === 'prospect' && hasProposition && (
                <div className="flex items-center gap-2 mt-2">
                  {enterprise.proposition_signee_at && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-50 to-emerald-100 border border-emerald-200">
                      <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center"><PenTool size={12} className="text-white" /></div>
                      <div>
                        <p className="text-xs font-semibold text-emerald-800">Proposition signée</p>
                        <p className="text-[10px] text-emerald-600">{formatDate(enterprise.proposition_signee_at)}</p>
                      </div>
                      {isDirection && <button onClick={deleteProposition} className="ml-1 p-0.5 text-emerald-400 hover:text-red-500"><X size={12} /></button>}
                    </div>
                  )}
                  {enterprise.proposition_envoyee_at && !enterprise.proposition_signee_at && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-100 border border-blue-200">
                      <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center"><Send size={12} className="text-white" /></div>
                      <div>
                        <p className="text-xs font-semibold text-blue-800">Proposition envoyée</p>
                        <p className="text-[10px] text-blue-600">{formatDate(enterprise.proposition_envoyee_at)}</p>
                      </div>
                      {isDirection && <button onClick={deleteProposition} className="ml-1 p-0.5 text-blue-400 hover:text-red-500"><X size={12} /></button>}
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-gray-500">
                {sector && <span className="flex items-center gap-1"><Building2 size={13} />{sector.name}</span>}
                {enterprise.department && <span className="flex items-center gap-1"><MapPin size={13} />{enterprise.department}{enterprise.city ? ` — ${enterprise.city}` : ''}</span>}
              </div>

              {/* Assigned to */}
              <div className="flex items-center gap-2 mt-2 text-sm">
                <UserCog size={13} className="text-gray-400" />
                {isDirection ? (
                  <select value={enterprise.assigned_to || ''} onChange={e => changeAssignment(e.target.value)}
                    className="text-xs border border-gray-200 rounded-lg px-2 py-1 text-gray-700 bg-white">
                    <option value="">Non assigné</option>
                    {profiles.filter(p => p.is_active).map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                  </select>
                ) : (
                  <span className="text-gray-500">{assignedTo?.full_name || 'Non assigné'}</span>
                )}
              </div>

              {enterprise.description_activite && <p className="text-sm text-gray-600 mt-2 bg-gray-50 px-3 py-2 rounded-lg">{enterprise.description_activite}</p>}
              {enterprise.communaute_communes && <p className="text-xs text-gray-400 mt-1">Communauté de communes : {enterprise.communaute_communes}</p>}
              {enterprise.notes && <p className="text-sm text-gray-500 mt-1 italic">{enterprise.notes}</p>}
              <div className="text-xs text-gray-400 mt-2">
                Créé le {formatDate(enterprise.created_at)} par {creator?.full_name || '—'}
                {converter && <span> • Converti le {formatDate(enterprise.converted_at)} par {converter.full_name}</span>}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 sm:flex-col">
            {enterprise.status === 'prospect' && (
              <>
                <button onClick={handleConvert} disabled={converting} className="btn-primary flex items-center gap-2 text-sm">
                  <CheckCircle2 size={16} /><span>{converting ? 'Conversion…' : 'Convertir en client'}</span>
                </button>
                <button onClick={() => setShowProposition(true)} className="btn-secondary flex items-center gap-2 text-sm !border-indigo-300 !text-indigo-700 hover:!bg-indigo-50">
                  <FileText size={14} /> Proposition
                </button>
              </>
            )}
            <button onClick={async () => { await supabase.from('enterprises').update({ a_relancer: !enterprise.a_relancer }).eq('id', id); loadData() }}
              className={`btn-secondary flex items-center gap-2 text-sm ${enterprise.a_relancer ? '!border-amber-300 !text-amber-700' : ''}`}>
              {enterprise.a_relancer ? '🔕 Retirer relance' : '🔔 À relancer'}
            </button>
            <button onClick={() => setShowEditEnterprise(true)} className="btn-secondary flex items-center gap-2 text-sm">
              <Edit3 size={14} /> Modifier
            </button>
            {isDirection && (
              <>
                <div className="relative">
                  <button onClick={() => setShowReclasser(!showReclasser)} className="btn-secondary flex items-center gap-2 text-sm">
                    <Repeat size={14} /> Reclasser
                  </button>
                  {showReclasser && (
                    <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-10 py-1 min-w-[140px]">
                      {['prospect', 'client'].filter(s => s !== enterprise.status).map(s => (
                        <button key={s} onClick={async () => {
                          await supabase.from('enterprises').update({ status: s, converted_at: null, converted_by: null }).eq('id', id)
                          await logActivity({ type: LOG_TYPES.ENTERPRISE_UPDATED, userId: profile.id, targetType: 'enterprise', targetId: id, targetName: enterprise.name, details: `Reclassé en ${s}` })
                          setShowReclasser(false); loadData()
                        }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50">
                          {s === 'prospect' ? 'Prospect' : 'Client'}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button onClick={handleDelete} className="btn-danger flex items-center gap-2 text-sm"><Trash2 size={14} /> Supprimer</button>
                <button onClick={() => setShowFusion(true)} className="btn-secondary flex items-center gap-2 text-sm !border-purple-300 !text-purple-700 hover:!bg-purple-50"><Merge size={14} /> Fusionner</button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Interlocuteurs */}
      <div className="card p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-semibold text-sm text-gray-900">👥 Interlocuteurs ({interlocuteurs.length})</h2>
          <button onClick={() => setShowAddInterlocuteur(true)} className="text-sm text-germa-600 hover:text-germa-800 font-medium flex items-center gap-1"><UserPlus size={14} /> Ajouter</button>
        </div>
        {interlocuteurs.length === 0 ? <p className="text-sm text-gray-400">Aucun interlocuteur enregistré</p> : (
          <div className="space-y-2">
            {interlocuteurs.map(inter => (
              <div key={inter.id} className="flex items-start justify-between gap-3 bg-gray-50 rounded-xl px-3 py-2.5">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{inter.name}</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500 mt-0.5">
                    {inter.fonction && <span>{inter.fonction}</span>}
                    {inter.phone && <span className="flex items-center gap-1"><Phone size={10} />{inter.phone}</span>}
                    {inter.email && <span className="flex items-center gap-1"><Mail size={10} />{inter.email}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => setEditingInterlocuteur(inter)} className="text-gray-300 hover:text-germa-600 p-1"><Edit3 size={12} /></button>
                  <button onClick={() => deleteInterlocuteur(inter.id)} className="text-gray-300 hover:text-red-500 p-1"><Trash2 size={12} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <h2 className="font-display font-semibold text-lg text-gray-900">Historique des actions ({actions.length})</h2>
        <button onClick={() => setShowAddAction(true)} className="btn-primary flex items-center gap-2 text-sm"><Plus size={16} /> Nouvelle action</button>
      </div>
      {actions.length === 0 ? (
        <div className="card p-12 text-center">
          <MessageSquare size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">Aucune action enregistrée</p>
          <button onClick={() => setShowAddAction(true)} className="btn-primary mt-4 text-sm">Ajouter la première action</button>
        </div>
      ) : (
        <div className="space-y-3">
          {actions.map(action => {
            const performer = profiles.find(p => p.id === action.performed_by)
            const resultColor = RESULT_COLORS[action.result] || {}
            return (
              <div key={action.id} className="card px-4 py-3 sm:px-5 sm:py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm text-gray-900">{action.action_type}</span>
                      <span className={`badge ${resultColor.bg} ${resultColor.text}`}>{action.result}</span>
                    </div>
                    {action.comments && <p className="text-sm text-gray-600 mt-1.5">{action.comments}</p>}
                    {action.contact && <p className="text-xs text-blue-600 mt-1 italic">📌 {action.contact}</p>}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400 mt-2">
                      <span className="flex items-center gap-1"><Calendar size={11} />{formatDateTime(action.performed_at)}</span>
                      <span className="flex items-center gap-1"><User size={11} />{performer?.full_name || '—'}</span>
                      {action.need_identified && <span>Besoin : {action.need_type || 'Oui'}</span>}
                      {action.next_action && <span className="flex items-center gap-1"><Clock size={11} />Relance : {action.next_action} le {formatDate(action.next_action_date)}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {(isDirection || action.performed_by === profile.id) && (
                      <button onClick={() => setEditingAction(action)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-300 hover:text-germa-600 transition-colors"><Edit3 size={14} /></button>
                    )}
                    {isDirection && (
                      <button onClick={async () => {
                        if (!window.confirm('Supprimer cette action ?')) return
                        await logActivity({ type: LOG_TYPES.ACTION_DELETED, userId: profile.id, targetType: 'action', targetId: action.id, targetName: enterprise.name, details: action.action_type })
                        await supabase.from('actions').delete().eq('id', action.id); loadData()
                      }} className="p-1.5 hover:bg-red-50 rounded-lg text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modals */}
      {showAddAction && <AddActionModal enterpriseId={id} enterpriseName={enterprise.name} onClose={() => setShowAddAction(false)} onCreated={() => { setShowAddAction(false); loadData() }} />}
      {editingAction && <EditActionModal action={editingAction} enterpriseName={enterprise.name} onClose={() => setEditingAction(null)} onSaved={() => { setEditingAction(null); loadData() }} />}
      {showEditEnterprise && <EditEnterpriseModal enterprise={enterprise} sectors={sectors} profiles={profiles} onClose={() => setShowEditEnterprise(false)} onSaved={() => { setShowEditEnterprise(false); loadData() }} />}
      {showAddInterlocuteur && <AddInterlocuteurModal enterpriseId={id} onClose={() => setShowAddInterlocuteur(false)} onCreated={() => { setShowAddInterlocuteur(false); loadData() }} />}
      {editingInterlocuteur && <EditInterlocuteurModal inter={editingInterlocuteur} onClose={() => setEditingInterlocuteur(null)} onSaved={() => { setEditingInterlocuteur(null); loadData() }} />}
      {showProposition && <PropositionModal enterprise={enterprise} profileId={profile.id} onClose={() => setShowProposition(false)} onSaved={() => { setShowProposition(false); loadData() }} />}
      {showFusion && <FusionModal enterprise={enterprise} profiles={profiles} sectors={sectors} userId={profile.id} onClose={() => setShowFusion(false)} onDone={() => { setShowFusion(false); loadData() }} navigate={navigate} />}
    </div>
  )
}

// ===================== ADD ACTION MODAL =====================
function AddActionModal({ enterpriseId, enterpriseName, onClose, onCreated }) {
  const { profile } = useAuth()
  const [form, setForm] = useState({ action_type: 'Physique', channel: 'Physique', is_new_prospect: false, need_identified: false, need_type: '', result: 'À relancer', next_action: '', next_action_date: '', comments: '', contact: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  function update(f, v) { setForm(o => ({ ...o, [f]: v })); if (f === 'action_type') setForm(o => ({ ...o, [f]: v, channel: v })) }
  async function handleSubmit(e) {
    e.preventDefault(); setSaving(true); setError('')
    const { error: err } = await supabase.from('actions').insert({ enterprise_id: enterpriseId, performed_by: profile.id, action_type: form.action_type, channel: form.channel, is_new_prospect: form.is_new_prospect, need_identified: form.need_identified, need_type: form.need_type || null, result: form.result, next_action: form.next_action || null, next_action_date: form.next_action_date || null, comments: form.comments || null, contact: form.contact || null }).select().single()
    if (err) { setError(err.message); setSaving(false) }
    else { await logActivity({ type: LOG_TYPES.ACTION_CREATED, userId: profile.id, targetType: 'enterprise', targetId: enterpriseId, targetName: enterpriseName, details: `${form.action_type} — ${form.result}` }); onCreated() }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-display font-semibold text-lg">Nouvelle action</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-xl">{error}</div>}
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Type d'échange *</label><select value={form.action_type} onChange={e => update('action_type', e.target.value)} className="select-field">{ACTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Résultat *</label><select value={form.result} onChange={e => update('result', e.target.value)} className="select-field">{RESULTS.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_new_prospect} onChange={e => update('is_new_prospect', e.target.checked)} className="rounded border-gray-300 text-germa-600" />Nouveau prospect</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.need_identified} onChange={e => update('need_identified', e.target.checked)} className="rounded border-gray-300 text-germa-600" />Besoin identifié</label>
          </div>
          {form.need_identified && <div><label className="block text-sm font-medium text-gray-700 mb-1">Type de besoin</label><input value={form.need_type} onChange={e => update('need_type', e.target.value)} className="input-field" placeholder="Ex: Intérim renfort" /></div>}
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Prochaine action</label><input value={form.next_action} onChange={e => update('next_action', e.target.value)} className="input-field" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Date prochaine action</label><input type="date" value={form.next_action_date} onChange={e => update('next_action_date', e.target.value)} className="input-field" /></div>
          </div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Commentaires</label><textarea value={form.comments} onChange={e => update('comments', e.target.value)} className="input-field" rows={3} /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Suivi / Contact</label><input value={form.contact} onChange={e => update('contact', e.target.value)} className="input-field" /></div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Annuler</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">{saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Plus size={16} />}<span>Enregistrer</span></button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ===================== EDIT ACTION MODAL =====================
function EditActionModal({ action, enterpriseName, onClose, onSaved }) {
  const { profile } = useAuth()
  const [form, setForm] = useState({
    action_type: action.action_type || 'Physique', result: action.result || 'À relancer',
    is_new_prospect: action.is_new_prospect || false, need_identified: action.need_identified || false,
    need_type: action.need_type || '', next_action: action.next_action || '',
    next_action_date: action.next_action_date ? action.next_action_date.split('T')[0] : '',
    comments: action.comments || '', contact: action.contact || '',
  })
  const [saving, setSaving] = useState(false)
  function update(f, v) { setForm(o => ({ ...o, [f]: v })) }

  async function handleSubmit(e) {
    e.preventDefault(); setSaving(true)
    await supabase.from('actions').update({
      action_type: form.action_type, channel: form.action_type, result: form.result,
      is_new_prospect: form.is_new_prospect, need_identified: form.need_identified,
      need_type: form.need_type || null, next_action: form.next_action || null,
      next_action_date: form.next_action_date || null,
      comments: form.comments || null, contact: form.contact || null,
    }).eq('id', action.id)
    await logActivity({ type: LOG_TYPES.ACTION_UPDATED, userId: profile.id, targetType: 'enterprise', targetId: action.enterprise_id, targetName: enterpriseName, details: `${form.action_type} — ${form.result}` })
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-display font-semibold text-lg">Modifier l'action</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Type d'échange *</label><select value={form.action_type} onChange={e => update('action_type', e.target.value)} className="select-field">{ACTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Résultat *</label><select value={form.result} onChange={e => update('result', e.target.value)} className="select-field">{RESULTS.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_new_prospect} onChange={e => update('is_new_prospect', e.target.checked)} className="rounded border-gray-300 text-germa-600" />Nouveau prospect</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.need_identified} onChange={e => update('need_identified', e.target.checked)} className="rounded border-gray-300 text-germa-600" />Besoin identifié</label>
          </div>
          {form.need_identified && <div><label className="block text-sm font-medium text-gray-700 mb-1">Type de besoin</label><input value={form.need_type} onChange={e => update('need_type', e.target.value)} className="input-field" /></div>}
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Prochaine action</label><input value={form.next_action} onChange={e => update('next_action', e.target.value)} className="input-field" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Date prochaine action</label><input type="date" value={form.next_action_date} onChange={e => update('next_action_date', e.target.value)} className="input-field" /></div>
          </div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Commentaires</label><textarea value={form.comments} onChange={e => update('comments', e.target.value)} className="input-field" rows={3} /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Suivi / Contact</label><input value={form.contact} onChange={e => update('contact', e.target.value)} className="input-field" /></div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Annuler</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ===================== EDIT ENTERPRISE MODAL =====================
function EditEnterpriseModal({ enterprise, sectors, profiles, onClose, onSaved }) {
  const { profile, isDirection } = useAuth()
  const [form, setForm] = useState({
    name: enterprise.name || '', sector_id: enterprise.sector_id || '', city: enterprise.city || '', department: enterprise.department || '',
    communaute_communes: enterprise.communaute_communes || '', a_relancer: enterprise.a_relancer || false,
    description_activite: enterprise.description_activite || '', notes: enterprise.notes || '',
    assigned_to: enterprise.assigned_to || '',
  })
  const [saving, setSaving] = useState(false)
  function update(f, v) { setForm(o => ({ ...o, [f]: v })) }
  const isMairie = sectors.find(s => s.id === form.sector_id)?.name === 'Mairie'

  async function handleSubmit(e) {
    e.preventDefault(); setSaving(true)
    await supabase.from('enterprises').update({
      name: form.name.trim(), sector_id: form.sector_id || null, city: form.city.trim() || null, department: form.department || null,
      communaute_communes: form.communaute_communes.trim() || null, a_relancer: form.a_relancer,
      description_activite: form.description_activite.trim() || null, notes: form.notes.trim() || null,
      assigned_to: form.assigned_to || null,
    }).eq('id', enterprise.id)
    await logActivity({ type: LOG_TYPES.ENTERPRISE_UPDATED, userId: profile.id, targetType: 'enterprise', targetId: enterprise.id, targetName: form.name.trim() })
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-display font-semibold text-lg">Modifier l'entreprise</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label><input value={form.name} onChange={e => update('name', e.target.value)} className="input-field" required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Secteur</label><select value={form.sector_id} onChange={e => update('sector_id', e.target.value)} className="select-field"><option value="">—</option>{sectors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Département</label><select value={form.department} onChange={e => update('department', e.target.value)} className="select-field"><option value="">—</option>{DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}</select></div>
          </div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Ville</label><input value={form.city} onChange={e => update('city', e.target.value)} className="input-field" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Commercial assigné</label>
            <select value={form.assigned_to} onChange={e => update('assigned_to', e.target.value)} className="select-field" disabled={!isDirection}>
              <option value="">Non assigné</option>{profiles.filter(p => p.is_active).map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
            </select>
          </div>
          {isMairie && <div><label className="block text-sm font-medium text-gray-700 mb-1">Communauté de communes</label><input value={form.communaute_communes} onChange={e => update('communaute_communes', e.target.value)} className="input-field" /></div>}
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Description activité / besoin</label><textarea value={form.description_activite} onChange={e => update('description_activite', e.target.value)} className="input-field" rows={3} placeholder="Activité de l'entreprise, besoins identifiés…" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Notes</label><textarea value={form.notes} onChange={e => update('notes', e.target.value)} className="input-field" rows={2} /></div>
          <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={form.a_relancer} onChange={e => update('a_relancer', e.target.checked)} className="rounded border-gray-300 text-germa-600" />🔔 À relancer</label>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Annuler</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ===================== ADD INTERLOCUTEUR =====================
function AddInterlocuteurModal({ enterpriseId, onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', fonction: '', phone: '', email: '' })
  const [saving, setSaving] = useState(false)
  function update(f, v) { setForm(o => ({ ...o, [f]: v })) }
  async function handleSubmit(e) {
    e.preventDefault(); if (!form.name.trim()) return; setSaving(true)
    await supabase.from('interlocuteurs').insert({ enterprise_id: enterpriseId, name: form.name.trim(), fonction: form.fonction.trim() || null, phone: form.phone.trim() || null, email: form.email.trim() || null })
    onCreated()
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100"><h2 className="font-display font-semibold text-lg">Nouvel interlocuteur</h2><button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X size={20} /></button></div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label><input value={form.name} onChange={e => update('name', e.target.value)} className="input-field" required autoFocus /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Fonction</label><input value={form.fonction} onChange={e => update('fonction', e.target.value)} className="input-field" placeholder="Ex: DRH" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label><input value={form.phone} onChange={e => update('phone', e.target.value)} className="input-field" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label><input value={form.email} onChange={e => update('email', e.target.value)} className="input-field" /></div>
          </div>
          <div className="flex gap-3 pt-2"><button type="button" onClick={onClose} className="btn-secondary flex-1">Annuler</button><button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">{saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <UserPlus size={16} />}<span>Ajouter</span></button></div>
        </form>
      </div>
    </div>
  )
}

// ===================== EDIT INTERLOCUTEUR =====================
function EditInterlocuteurModal({ inter, onClose, onSaved }) {
  const [form, setForm] = useState({ name: inter.name || '', fonction: inter.fonction || '', phone: inter.phone || '', email: inter.email || '' })
  const [saving, setSaving] = useState(false)
  function update(f, v) { setForm(o => ({ ...o, [f]: v })) }
  async function handleSubmit(e) {
    e.preventDefault(); if (!form.name.trim()) return; setSaving(true)
    await supabase.from('interlocuteurs').update({ name: form.name.trim(), fonction: form.fonction.trim() || null, phone: form.phone.trim() || null, email: form.email.trim() || null }).eq('id', inter.id)
    onSaved()
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100"><h2 className="font-display font-semibold text-lg">Modifier l'interlocuteur</h2><button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X size={20} /></button></div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label><input value={form.name} onChange={e => update('name', e.target.value)} className="input-field" required autoFocus /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Fonction</label><input value={form.fonction} onChange={e => update('fonction', e.target.value)} className="input-field" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label><input value={form.phone} onChange={e => update('phone', e.target.value)} className="input-field" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label><input value={form.email} onChange={e => update('email', e.target.value)} className="input-field" /></div>
          </div>
          <div className="flex gap-3 pt-2"><button type="button" onClick={onClose} className="btn-secondary flex-1">Annuler</button><button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Enregistrement…' : 'Enregistrer'}</button></div>
        </form>
      </div>
    </div>
  )
}

// ===================== PROPOSITION MODAL =====================
function PropositionModal({ enterprise, profileId, onClose, onSaved }) {
  const [type, setType] = useState(null)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [saving, setSaving] = useState(false)
  async function handleSubmit() {
    setSaving(true)
    const updates = {}
    if (type === 'envoyee') updates.proposition_envoyee_at = date
    if (type === 'signee') { updates.proposition_signee_at = date; if (!enterprise.proposition_envoyee_at) updates.proposition_envoyee_at = date }
    await supabase.from('enterprises').update(updates).eq('id', enterprise.id)
    await logActivity({ type: LOG_TYPES.ENTERPRISE_UPDATED, userId: profileId, targetType: 'enterprise', targetId: enterprise.id, targetName: enterprise.name, details: type === 'envoyee' ? `Proposition envoyée le ${date}` : `Proposition signée le ${date}` })
    onSaved()
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100"><h2 className="font-display font-semibold text-lg">Proposition commerciale</h2><button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X size={20} /></button></div>
        <div className="p-6 space-y-4">
          {!type ? (
            <div className="flex flex-col gap-3">
              <button onClick={() => setType('envoyee')} className="flex items-center gap-3 p-4 rounded-xl border-2 border-blue-200 hover:bg-blue-50 transition-colors text-left">
                <Send size={20} className="text-blue-600 flex-shrink-0" /><div><p className="font-medium text-gray-900">Envoyée</p><p className="text-xs text-gray-500">La proposition a été envoyée</p></div>
              </button>
              <button onClick={() => setType('signee')} className="flex items-center gap-3 p-4 rounded-xl border-2 border-emerald-200 hover:bg-emerald-50 transition-colors text-left">
                <PenTool size={20} className="text-emerald-600 flex-shrink-0" /><div><p className="font-medium text-gray-900">Signée</p><p className="text-xs text-gray-500">La proposition a été signée</p></div>
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-2">{type === 'envoyee' ? <Send size={18} className="text-blue-600" /> : <PenTool size={18} className="text-emerald-600" />}<span className="font-medium">{type === 'envoyee' ? 'Proposition envoyée' : 'Proposition signée'}</span></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Date</label><input type="date" value={date} onChange={e => setDate(e.target.value)} className="input-field" required /></div>
              <div className="flex gap-3 pt-2"><button onClick={() => setType(null)} className="btn-secondary flex-1">Retour</button><button onClick={handleSubmit} disabled={saving} className="btn-primary flex-1">{saving ? 'Enregistrement…' : 'Valider'}</button></div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ===================== FUSION MODAL =====================
function FusionModal({ enterprise, profiles, sectors, userId, onClose, onDone, navigate }) {
  const [step, setStep] = useState(1) // 1=search, 2=diff, 3=executing
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [selectedEnt, setSelectedEnt] = useState(null)
  const [selectedCommercial, setSelectedCommercial] = useState('')
  const [choices, setChoices] = useState({})
  const [interA, setInterA] = useState([])
  const [interB, setInterB] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSearch(term) {
    setSearchTerm(term)
    if (term.length < 2) { setSearchResults([]); return }
    const { data } = await supabase.from('enterprises').select('id, name, city, department, status')
      .ilike('name', `%${term}%`).neq('id', enterprise.id).limit(10)
    setSearchResults(data || [])
  }

  async function selectEnterprise(ent) {
    setSelectedEnt(ent)
    // Load full data for diff
    const { data: fullEnt } = await supabase.from('enterprises').select('*').eq('id', ent.id).single()
    setSelectedEnt(fullEnt)
    const [iA, iB] = await Promise.all([
      fetchAll('interlocuteurs', { eq: { column: 'enterprise_id', value: enterprise.id } }),
      fetchAll('interlocuteurs', { eq: { column: 'enterprise_id', value: ent.id } }),
    ])
    setInterA(iA)
    setInterB(iB)
    // Initialize choices with the oldest enterprise's values
    const oldest = new Date(enterprise.created_at) <= new Date(fullEnt.created_at) ? enterprise : fullEnt
    const diffFields = ['name', 'city', 'department', 'phone', 'email', 'contact_name', 'description_activite', 'communaute_communes', 'notes', 'sector_id', 'a_relancer']
    const init = {}
    diffFields.forEach(f => { init[f] = oldest[f] ?? '' })
    setChoices(init)
  }

  const diffFields = [
    { key: 'name', label: 'Nom' },
    { key: 'sector_id', label: 'Secteur', format: v => sectors.find(s => s.id === v)?.name || '—' },
    { key: 'city', label: 'Ville' },
    { key: 'department', label: 'Département' },
    { key: 'phone', label: 'Téléphone' },
    { key: 'email', label: 'Email' },
    { key: 'contact_name', label: 'Contact' },
    { key: 'description_activite', label: 'Activité / besoin' },
    { key: 'communaute_communes', label: 'Communauté communes' },
    { key: 'notes', label: 'Notes' },
    { key: 'a_relancer', label: 'À relancer', format: v => v ? 'Oui' : 'Non' },
  ]

  function displayVal(field, val) {
    if (field.format) return field.format(val)
    return val || '—'
  }

  function hasDiff(field) {
    if (!selectedEnt) return false
    const a = enterprise[field.key] ?? ''
    const b = selectedEnt[field.key] ?? ''
    return String(a) !== String(b)
  }

  async function executeFusion() {
    if (!selectedCommercial) { setError('Veuillez sélectionner un commercial.'); return }
    setSaving(true); setError('')

    const keepEnt = new Date(enterprise.created_at) <= new Date(selectedEnt.created_at) ? enterprise : selectedEnt
    const removeEnt = keepEnt.id === enterprise.id ? selectedEnt : enterprise

    // Update the kept enterprise with chosen values
    const updateData = { ...choices, assigned_to: selectedCommercial }
    // Preserve conversion data from whichever had it
    if (enterprise.converted_at || selectedEnt.converted_at) {
      const converted = enterprise.converted_at ? enterprise : selectedEnt
      updateData.converted_at = converted.converted_at
      updateData.converted_by = converted.converted_by
      updateData.status = 'client'
    }
    // Keep proposition data if either has it
    if (!updateData.proposition_envoyee_at) updateData.proposition_envoyee_at = enterprise.proposition_envoyee_at || selectedEnt.proposition_envoyee_at
    if (!updateData.proposition_signee_at) updateData.proposition_signee_at = enterprise.proposition_signee_at || selectedEnt.proposition_signee_at

    await supabase.from('enterprises').update(updateData).eq('id', keepEnt.id)

    // Move actions from removed to kept
    await supabase.from('actions').update({ enterprise_id: keepEnt.id }).eq('enterprise_id', removeEnt.id)

    // Move interlocuteurs from removed to kept
    await supabase.from('interlocuteurs').update({ enterprise_id: keepEnt.id }).eq('enterprise_id', removeEnt.id)

    // Log
    await logActivity({ type: LOG_TYPES.ENTERPRISE_UPDATED, userId, targetType: 'enterprise', targetId: keepEnt.id, targetName: choices.name || keepEnt.name, details: `Fusion avec "${removeEnt.name}" — conservé: ${keepEnt.name}` })

    // Delete removed enterprise
    await supabase.from('enterprises').delete().eq('id', removeEnt.id)

    // Navigate to the kept enterprise
    if (keepEnt.id === enterprise.id) {
      onDone()
    } else {
      navigate(`/entreprises/${keepEnt.id}`)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-display font-semibold text-lg">Fusionner « {enterprise.name} »</h2>
            <p className="text-xs text-gray-500">{step === 1 ? 'Étape 1 : Sélection' : 'Étape 2 : Résolution des différences'}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
        </div>

        <div className="overflow-y-auto p-6 space-y-4 flex-1">
          {error && <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-xl">{error}</div>}

          {step === 1 && (
            <>
              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rechercher l'entreprise à fusionner</label>
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input value={searchTerm} onChange={e => handleSearch(e.target.value)} className="input-field pl-9" placeholder="Tapez le nom…" autoFocus />
                </div>
                {searchResults.length > 0 && (
                  <div className="mt-2 border border-gray-200 rounded-xl overflow-hidden">
                    {searchResults.map(r => (
                      <button key={r.id} onClick={() => selectEnterprise(r)}
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-germa-50 border-b border-gray-50 last:border-0 flex justify-between ${selectedEnt?.id === r.id ? 'bg-germa-50 font-medium' : ''}`}>
                        <span>{r.name} {r.city && <span className="text-gray-400">— {r.city}</span>}</span>
                        <span className={`text-xs ${r.status === 'client' ? 'text-emerald-600' : 'text-blue-600'}`}>{r.status}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedEnt && (
                <div className="bg-purple-50 rounded-xl p-3 text-sm">
                  <p className="font-medium text-purple-800">Sélection : {selectedEnt.name}</p>
                  <p className="text-xs text-purple-600 mt-0.5">
                    L'entreprise la plus ancienne sera conservée. L'autre sera supprimée après fusion.
                  </p>
                </div>
              )}

              {/* Commercial (mandatory) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Commercial assigné *</label>
                <select value={selectedCommercial} onChange={e => setSelectedCommercial(e.target.value)} className="select-field" required>
                  <option value="">— Sélectionner —</option>
                  {profiles.filter(p => p.is_active).map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={onClose} className="btn-secondary flex-1">Annuler</button>
                <button onClick={() => {
                  if (!selectedEnt) { setError('Sélectionnez une entreprise.'); return }
                  if (!selectedCommercial) { setError('Sélectionnez un commercial.'); return }
                  setError(''); setStep(2)
                }} className="btn-primary flex-1">Comparer</button>
              </div>
            </>
          )}

          {step === 2 && selectedEnt && (
            <>
              <div className="text-xs text-gray-500 mb-2">
                <span className="font-medium">A :</span> {enterprise.name} (créé {formatDate(enterprise.created_at)}) —
                <span className="font-medium ml-2">B :</span> {selectedEnt.name} (créé {formatDate(selectedEnt.created_at)}) —
                <span className="ml-2 font-semibold text-germa-700">Conservé : {new Date(enterprise.created_at) <= new Date(selectedEnt.created_at) ? 'A' : 'B'}</span>
              </div>

              {diffFields.map(field => {
                const valA = enterprise[field.key]
                const valB = selectedEnt[field.key]
                const isDiff = hasDiff(field)
                if (!isDiff) return null
                return (
                  <div key={field.key} className="bg-amber-50 rounded-xl p-3">
                    <p className="text-xs font-semibold text-amber-800 mb-2">{field.label}</p>
                    <div className="space-y-1.5">
                      <label className={`flex items-center gap-2 text-sm cursor-pointer p-2 rounded-lg ${String(choices[field.key] ?? '') === String(valA ?? '') ? 'bg-white border-2 border-germa-500' : 'border border-gray-200'}`}>
                        <input type="radio" name={field.key} checked={String(choices[field.key] ?? '') === String(valA ?? '')}
                          onChange={() => setChoices(c => ({ ...c, [field.key]: valA }))} className="text-germa-600" />
                        <span className="font-medium text-gray-500 mr-1">A:</span> {displayVal(field, valA)}
                      </label>
                      <label className={`flex items-center gap-2 text-sm cursor-pointer p-2 rounded-lg ${String(choices[field.key] ?? '') === String(valB ?? '') ? 'bg-white border-2 border-germa-500' : 'border border-gray-200'}`}>
                        <input type="radio" name={field.key} checked={String(choices[field.key] ?? '') === String(valB ?? '')}
                          onChange={() => setChoices(c => ({ ...c, [field.key]: valB }))} className="text-germa-600" />
                        <span className="font-medium text-gray-500 mr-1">B:</span> {displayVal(field, valB)}
                      </label>
                    </div>
                  </div>
                )
              })}

              {!diffFields.some(f => hasDiff(f)) && (
                <p className="text-sm text-gray-500 text-center py-4">Aucune différence dans les informations. Les actions et interlocuteurs seront fusionnés.</p>
              )}

              {/* Interlocuteurs summary */}
              {(interA.length > 0 || interB.length > 0) && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs font-semibold text-gray-700 mb-1">Interlocuteurs (seront tous conservés)</p>
                  <p className="text-xs text-gray-500">A : {interA.length} interlocuteur(s) — B : {interB.length} interlocuteur(s)</p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button onClick={onClose} className="btn-secondary flex-1">Annuler</button>
                <button onClick={() => { setStep(1); setError('') }} className="btn-secondary flex-1">Retour</button>
                <button onClick={executeFusion} disabled={saving} className="btn-primary flex-1 !bg-purple-600 hover:!bg-purple-700">
                  {saving ? 'Fusion en cours…' : 'Confirmer la fusion'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
