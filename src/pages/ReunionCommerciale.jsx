import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { formatDate, formatDateTime, todayISO } from '../utils/constants'
import { mdToHtml, printDocument } from '../utils/docRender'
import { callWorker } from './RapportMensuel'
import { Users, Printer, Sparkles, Paperclip, X } from 'lucide-react'

// Briefing de réunion commerciale : suivi du dernier compte rendu, activité depuis, dossiers à discuter
export default function ReunionCommerciale() {
  const [list, setList] = useState([])
  const [current, setCurrent] = useState(null)
  const [meeting, setMeeting] = useState(todayISO())
  const [previous, setPrevious] = useState('')
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function load(selectId) {
    const { data } = await supabase.from('ia_reunions').select('id, meeting_date, previous_date, cr_filename, content, stats, model, generated_at').order('meeting_date', { ascending: false }).order('generated_at', { ascending: false }).limit(50)
    setList(data || [])
    const sel = selectId ? (data || []).find(r => r.id === selectId) : null
    setCurrent(sel || null)
    // par défaut : la réunion précédente = la dernière réunion préparée
    if (!previous && data?.length) setPrevious(data[0].meeting_date === todayISO() ? (data[1]?.meeting_date || '') : data[0].meeting_date)
  }
  useEffect(() => { load() }, [])

  const readPdf = (f) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = () => rej(new Error('Lecture du fichier impossible')); r.readAsDataURL(f) })
  async function generate() {
    setError('')
    if (!previous) { setError('Indiquez la date de la réunion précédente'); return }
    if (previous >= meeting) { setError('La réunion précédente doit être antérieure à celle du jour'); return }
    if (file && file.size > 10 * 1024 * 1024) { setError('PDF trop lourd (10 Mo maximum)'); return }
    setBusy(true)
    try {
      const pdf_base64 = file ? await readPdf(file) : ''
      const res = await callWorker('/reunion', { meeting_date: meeting, previous_date: previous, pdf_base64, pdf_name: file?.name || '' })
      await load(res.id); setFile(null)
    } catch (e) { setError(e.message) }
    setBusy(false)
  }
  const title = (r) => `Briefing réunion commerciale du ${formatDate(r.meeting_date)}`
  function print() {
    const s = current.stats?.chiffres || {}, p = current.stats?.chiffres_mois_precedent || {}
    printDocument({ title: title(current), generatedAt: current.generated_at, kpiHeader: ['Indicateur', `Depuis le ${formatDate(current.previous_date)}`, 'Période précédente'],
      kpiRows: [['Actions', s.actions, p.actions], ['Entreprises contactées', s.entreprises_contactees, p.entreprises_contactees], ['Nouvelles entreprises', s.nouvelles_entreprises, p.nouvelles_entreprises], ['Conversions', s.conversions, p.conversions], ['RDV pris', s.rdv_pris, p.rdv_pris], ['Propositions envoyées', s.propositions_envoyees, p.propositions_envoyees]],
      markdown: current.content })
  }

  return (
    <div className="space-y-5 animate-fade-in max-w-4xl">
      <div>
        <h1 className="font-display font-bold text-2xl text-gray-900 flex items-center gap-2"><Users size={24} className="text-germa-700" /> Réunion commerciale</h1>
        <p className="text-gray-500 text-sm mt-1">Le jour de la réunion : l'assistant reprend le compte rendu de la précédente, vérifie dans la base ce qui a été fait, et prépare l'activité et les dossiers à discuter.</p>
      </div>

      <div className="card p-5 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Réunion du jour</label><input type="date" value={meeting} max={todayISO()} onChange={e => setMeeting(e.target.value)} className="input-field" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Date de la réunion précédente *</label><input type="date" value={previous} max={meeting} onChange={e => setPrevious(e.target.value)} className="input-field" /></div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Compte rendu de la réunion précédente <span className="font-normal text-gray-400">(PDF, facultatif, 10 Mo max — lu par l'assistant, non conservé)</span></label>
          {file ? <div className="flex items-center gap-2 text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2"><Paperclip size={14} className="text-gray-500" /><span className="flex-1 truncate">{file.name}</span><span className="text-xs text-gray-400">{Math.round(file.size / 1024)} Ko</span><button onClick={() => setFile(null)} className="p-0.5 hover:bg-gray-200 rounded"><X size={14} /></button></div>
            : <input type="file" accept="application/pdf" onChange={e => setFile(e.target.files?.[0] || null)} className="block w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:bg-germa-50 file:text-germa-700 file:font-medium hover:file:bg-germa-100" />}
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-red-600">{error}</span>
          <button onClick={generate} disabled={busy} className="btn-primary flex items-center gap-2 disabled:opacity-50"><Sparkles size={16} /> {busy ? 'Préparation du briefing… (30 s à 1 min 30)' : 'Générer le briefing'}</button>
        </div>
      </div>

      {current && (
        <>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div><h2 className="font-display font-semibold text-lg text-gray-900">{title(current)}</h2><p className="text-xs text-gray-500">Période du {formatDate(current.previous_date)} au {formatDate(current.meeting_date)}{current.cr_filename ? ` · compte rendu : ${current.cr_filename}` : ' · sans compte rendu'}</p></div>
            <button onClick={print} className="btn-secondary flex items-center gap-1.5 text-sm"><Printer size={15} /> Imprimer / PDF</button>
          </div>
          <div className="card p-6 rapport-md" dangerouslySetInnerHTML={{ __html: mdToHtml(current.content) }} />
          <p className="text-xs text-gray-400">Généré le {formatDateTime(current.generated_at)} · {current.model}. Chiffres calculés par le serveur ; le suivi du compte rendu est une lecture de l'assistant, à vérifier en séance.</p>
        </>
      )}

      {list.length > 0 && (
        <div className="card p-4">
          <h3 className="font-display font-semibold text-sm text-gray-900 mb-2">Briefings précédents</h3>
          <div className="divide-y divide-gray-50">
            {list.map(r => (
              <button key={r.id} onClick={() => setCurrent(r)} className={`w-full text-left py-2 px-2 rounded-lg text-sm flex items-center justify-between hover:bg-gray-50 ${current?.id === r.id ? 'bg-germa-50' : ''}`}>
                <span>Réunion du {formatDate(r.meeting_date)} <span className="text-xs text-gray-400">· depuis le {formatDate(r.previous_date)}{r.cr_filename ? ' · avec compte rendu' : ''}</span></span>
                <span className="text-xs text-gray-400">{formatDateTime(r.generated_at)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
