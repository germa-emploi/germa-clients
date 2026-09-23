import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { formatDateTime, API_WORKER_URL } from '../utils/constants'
import { mdToHtml, printDocument } from '../utils/docRender'
import { FileText, Printer, RefreshCw, Settings, X } from 'lucide-react'

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
const label = (m) => { const [y, mo] = m.split('-').map(Number); return `${MOIS[mo - 1]} ${y}` }
export async function callWorker(path, body) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('Session expirée, reconnectez-vous')
  const r = await fetch(`${API_WORKER_URL}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify(body) })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(j.error || `Erreur ${r.status}`)
  return j
}

export default function RapportMensuel() {
  const now = new Date()
  const months = Array.from({ length: 12 }, (_, i) => { const d = new Date(now.getFullYear(), now.getMonth() - 1 - i, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` })
  const current = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const [month, setMonth] = useState(months[0])
  const [rapport, setRapport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [remarques, setRemarques] = useState('')
  const [showConfig, setShowConfig] = useState(false)

  async function load(m) {
    setLoading(true); setError('')
    const { data } = await supabase.from('ia_rapports').select('*').eq('month', m).maybeSingle()
    setRapport(data || null); setRemarques(data?.remarques || ''); setLoading(false)
  }
  useEffect(() => { load(month) }, [month])

  async function generate() {
    setBusy(true); setError('')
    try { await callWorker('/rapport', { month, remarques }); await load(month) } catch (e) { setError(e.message) }
    setBusy(false)
  }
  function print() {
    const st = rapport.stats?.chiffres || {}, pv = rapport.stats?.chiffres_mois_precedent || {}
    printDocument({ title: `Rapport d'activité commerciale — ${label(month)}`, generatedAt: rapport.generated_at, kpiHeader: ['Indicateur', label(month), 'Mois précédent'],
      kpiRows: [['Actions', st.actions, pv.actions], ['Entreprises contactées', st.entreprises_contactees, pv.entreprises_contactees], ['Nouvelles entreprises', st.nouvelles_entreprises, pv.nouvelles_entreprises], ['Conversions', st.conversions, pv.conversions], ['RDV pris', st.rdv_pris, pv.rdv_pris], ['Propositions envoyées', st.propositions_envoyees, pv.propositions_envoyees], ['Relances en retard (fin de mois)', rapport.stats?.relances_en_retard_fin_de_mois, '—']],
      markdown: rapport.content })
  }

  const s = rapport?.stats?.chiffres, p = rapport?.stats?.chiffres_mois_precedent
  const Kpi = ({ label: l, v, pv }) => (
    <div className="card p-3">
      <p className="text-xs text-gray-500">{l}</p>
      <p className="font-display font-semibold text-xl text-gray-900">{v ?? '—'}</p>
      {pv !== undefined && <p className={`text-xs ${v > pv ? 'text-emerald-600' : v < pv ? 'text-red-600' : 'text-gray-400'}`}>{v > pv ? '▲' : v < pv ? '▼' : '='} {pv} le mois précédent</p>}
    </div>
  )
  return (
    <div className="space-y-5 animate-fade-in max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-display font-bold text-2xl text-gray-900 flex items-center gap-2"><FileText size={24} className="text-germa-700" /> Rapport mensuel</h1>
          <p className="text-gray-500 text-sm mt-1">Rédigé par l'assistant à partir des chiffres de la base. Généré automatiquement le 1er de chaque mois.</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={month} onChange={e => setMonth(e.target.value)} className="select-field text-sm">
            <option value={current}>{label(current)} (en cours)</option>
            {months.map(m => <option key={m} value={m}>{label(m)}</option>)}
          </select>
          <button onClick={() => setShowConfig(true)} className="btn-secondary flex items-center gap-1.5 text-sm"><Settings size={15} /> Personnaliser</button>
        </div>
      </div>

      <div className="card p-4 space-y-2">
        <label className="block text-sm font-medium text-gray-700">Remarques pour ce mois <span className="font-normal text-gray-400">(facultatif — contexte que la base ignore : salon, arrivée d'un commercial, événement…)</span></label>
        <textarea value={remarques} onChange={e => setRemarques(e.target.value)} rows={2} className="input-field" />
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-red-600">{error}</span>
          <div className="flex gap-2">
            {rapport && <button onClick={print} className="btn-secondary flex items-center gap-1.5 text-sm"><Printer size={15} /> Imprimer / PDF</button>}
            <button onClick={generate} disabled={busy} className="btn-primary flex items-center gap-1.5 text-sm disabled:opacity-50"><RefreshCw size={15} className={busy ? 'animate-spin' : ''} /> {busy ? 'Rédaction en cours… (30 s à 1 min)' : rapport ? 'Régénérer' : 'Générer le rapport'}</button>
          </div>
        </div>
      </div>

      {loading ? <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-germa-700 border-t-transparent rounded-full animate-spin" /></div>
        : !rapport ? <div className="card p-12 text-center text-gray-400 text-sm">Pas encore de rapport pour {label(month)}. Cliquez sur « Générer le rapport ».</div>
        : <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <Kpi label="Actions" v={s?.actions} pv={p?.actions} />
            <Kpi label="Entreprises contactées" v={s?.entreprises_contactees} pv={p?.entreprises_contactees} />
            <Kpi label="Nouvelles entreprises" v={s?.nouvelles_entreprises} pv={p?.nouvelles_entreprises} />
            <Kpi label="Conversions" v={s?.conversions} pv={p?.conversions} />
            <Kpi label="RDV pris" v={s?.rdv_pris} pv={p?.rdv_pris} />
            <Kpi label="Relances en retard" v={rapport.stats?.relances_en_retard_fin_de_mois} />
          </div>
          <div className="card p-6 rapport-md" dangerouslySetInnerHTML={{ __html: mdToHtml(rapport.content) }} />
          <p className="text-xs text-gray-400">Généré le {formatDateTime(rapport.generated_at)} · {rapport.model}. Les chiffres sont calculés par le serveur ; le texte est rédigé par l'assistant.</p>
        </>}

      {showConfig && <ConfigModal onClose={() => setShowConfig(false)} />}
    </div>
  )
}

function ConfigModal({ onClose }) {
  const [text, setText] = useState(null)
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => { callWorker('/rapport/config', {}).then(j => setText(j.instructions)).catch(e => setMsg(e.message)) }, [])
  const save = async () => { setBusy(true); setMsg(''); try { await callWorker('/rapport/config', { instructions: text }); setMsg('Consignes enregistrées — régénérez le rapport pour les appliquer.') } catch (e) { setMsg(e.message) } setBusy(false) }
  const reset = async () => { if (!window.confirm('Revenir aux consignes d\'origine ?')) return; setBusy(true); try { const j = await callWorker('/rapport/config', { reset: true }); setText(j.instructions); setMsg('Consignes d\'origine rétablies.') } catch (e) { setMsg(e.message) } setBusy(false) }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div><h2 className="font-display font-semibold text-lg">Personnaliser le rapport</h2><p className="text-xs text-gray-500">Consignes données à l'assistant, en français : rubriques, ordre, ton, longueur, ce qu'il faut mettre en avant. Les chiffres, eux, restent calculés par le serveur.</p></div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
        </div>
        <div className="p-6 flex-1 overflow-y-auto">
          {text === null ? <p className="text-sm text-gray-400">Chargement…</p> : <textarea value={text} onChange={e => setText(e.target.value)} rows={18} className="input-field font-mono text-xs" />}
        </div>
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex items-center justify-between gap-3">
          <button onClick={reset} disabled={busy} className="text-xs text-gray-500 hover:text-red-600">Revenir aux consignes d'origine</button>
          <div className="flex items-center gap-3"><span className="text-xs text-gray-600">{msg}</span><button onClick={onClose} className="btn-secondary">Fermer</button><button onClick={save} disabled={busy || text === null} className="btn-primary disabled:opacity-50">Enregistrer</button></div>
        </div>
      </div>
    </div>
  )
}
