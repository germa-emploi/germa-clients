import { useState, useMemo, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { calculerMarge, STRUCTURES, EXEMPLES, EPI_DEFAUT, PARAMS_DEFAUT } from '../utils/marge'
import { formatDateTime } from '../utils/constants'
import { Calculator, Plus, Trash2, RotateCcw, Info, Settings, Save } from 'lucide-react'

const eur = (x) => (Number(x) || 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })
const pct = (x) => `${((Number(x) || 0) * 100).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %`
const num = (x, d = 3) => (x === null || x === undefined || !isFinite(x) ? '—' : Number(x).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: d }))
const AUTRE = '__autre'

const VIDE = (structure = 'ETTI') => ({
  structure, tauxHoraire: 12.31, coef: structure === 'AI' ? 1.88 : 1.82, heuresNormales: 35, heuresSup25: 0, heuresSup50: 0, heuresNuit: 0, pctNuit: 25, jours: 5,
  indemnites: [], epis: [], equipementRefacture: false, margeCible: 20,
})

function Field({ label, value, onChange, step = '0.01', suffix, hint, w = 'w-full' }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-gray-600 mb-1">{label}</span>
      <div className="flex items-center gap-1.5">
        <input type="number" step={step} value={value} onChange={e => onChange(e.target.value === '' ? '' : Number(e.target.value))} className={`input-field text-sm ${w}`} />
        {suffix && <span className="text-xs text-gray-500 whitespace-nowrap">{suffix}</span>}
      </div>
      {hint && <span className="block text-[11px] text-gray-400 mt-0.5">{hint}</span>}
    </label>
  )
}

export default function CalculMarge() {
  const { profile, isDirection } = useAuth()
  const [m, setM] = useState(VIDE('ETTI'))
  const [exemple, setExemple] = useState(null)
  // paramètres enregistrés (direction) : taux par structure + catalogue EPI
  const [config, setConfig] = useState({ params: PARAMS_DEFAUT, epi: EPI_DEFAUT, updated_at: null, updated_by: null })
  const [configName, setConfigName] = useState('')
  const [saveMsg, setSaveMsg] = useState('')

  useEffect(() => {
    supabase.from('marge_config').select('*').eq('id', 1).maybeSingle().then(async ({ data }) => {
      if (!data) return
      setConfig({ params: { ...PARAMS_DEFAUT, ...data.params }, epi: Array.isArray(data.epi) ? data.epi : EPI_DEFAUT, updated_at: data.updated_at, updated_by: data.updated_by })
      if (data.updated_by) { const { data: p } = await supabase.from('profiles').select('full_name').eq('id', data.updated_by).maybeSingle(); setConfigName(p?.full_name || '') }
    })
  }, [])

  const set = (k, v) => setM(s => ({ ...s, [k]: v }))
  const params = config.params[m.structure] || PARAMS_DEFAUT[m.structure]

  // EPI : prix du catalogue, ou prix saisi pour « Autre »
  const epiLignes = m.epis.map(l => {
    const cat = config.epi.find(e => e.nom === l.choix)
    const prix = l.choix === AUTRE ? (Number(l.prix) || 0) : (cat ? Number(cat.prix) || 0 : 0)
    return { ...l, prixUnit: prix, total: prix * (Number(l.qte) || 0), nom: l.choix === AUTRE ? (l.label || 'Autre') : l.choix }
  })
  const equipement = epiLignes.reduce((s, l) => s + l.total, 0)
  const r = useMemo(() => calculerMarge({ ...m, primes: [], equipement, ifm: params.ifm, icp: params.icp, charges: params.charges }), [m, equipement, params])

  const charger = (ex) => { setM({ ...VIDE(ex.structure), ...ex, primes: [], epis: [] }); setExemple(ex) }
  const majListe = (k, i, champ, v) => setM(s => ({ ...s, [k]: s[k].map((x, j) => j === i ? { ...x, [champ]: v } : x) }))
  const ajouter = (k, x) => setM(s => ({ ...s, [k]: [...s[k], x] }))
  const retirer = (k, i) => setM(s => ({ ...s, [k]: s[k].filter((_, j) => j !== i) }))

  // ---- édition des paramètres (direction) ----
  const setParam = (st, k, v) => setConfig(c => ({ ...c, params: { ...c.params, [st]: { ...c.params[st], [k]: v } } }))
  const setEpi = (i, k, v) => setConfig(c => ({ ...c, epi: c.epi.map((e, j) => j === i ? { ...e, [k]: v } : e) }))
  async function saveConfig() {
    setSaveMsg('')
    const epi = config.epi.filter(e => (e.nom || '').trim()).map(e => ({ nom: e.nom.trim(), prix: Number(e.prix) || 0 }))
    const { error } = await supabase.from('marge_config').upsert({ id: 1, params: config.params, epi, updated_at: new Date().toISOString(), updated_by: profile.id })
    if (error) { setSaveMsg(`Échec : ${error.message}`); return }
    setConfig(c => ({ ...c, epi, updated_at: new Date().toISOString(), updated_by: profile.id })); setConfigName(profile.full_name); setSaveMsg('Paramètres enregistrés')
    setTimeout(() => setSaveMsg(''), 3000)
  }

  const couleur = r.marge < 0 ? 'text-red-600' : r.margePct < 0.1 ? 'text-amber-600' : 'text-emerald-700'

  return (
    <div className="space-y-5 animate-fade-in max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-display font-bold text-2xl text-gray-900 flex items-center gap-2"><Calculator size={24} className="text-germa-700" /> Calcul de marge</h1>
          <p className="text-gray-500 text-sm mt-1">Marge d'une mise à disposition selon le salaire, les heures, les indemnités, les équipements et le coefficient. Rien n'est enregistré.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {EXEMPLES.map(ex => <button key={ex.nom} onClick={() => charger(ex)} className="btn-secondary text-xs">{ex.structure === 'AI' ? 'Exemple AI' : 'Exemple ETTI'}</button>)}
          <button onClick={() => { setM(VIDE(m.structure)); setExemple(null) }} className="btn-secondary text-xs flex items-center gap-1"><RotateCcw size={13} /> Vider</button>
        </div>
      </div>
      {exemple && <div className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">{exemple.nom}</div>}

      <div className="grid lg:grid-cols-5 gap-5 items-start">
        {/* ---------------- saisie ---------------- */}
        <div className="lg:col-span-3 space-y-4">
          <div className="card p-4 space-y-4">
            <div className="flex gap-2">
              {['ETTI', 'AI'].map(st => <button key={st} onClick={() => set('structure', st)} className={`px-4 py-2 rounded-xl text-sm font-medium ${m.structure === st ? 'bg-germa-700 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>{st}</button>)}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Field label="Taux horaire brut" value={m.tauxHoraire} onChange={v => set('tauxHoraire', v)} suffix="€/h" />
              <Field label="Coefficient" value={m.coef} onChange={v => set('coef', v)} step="0.01" />
              <Field label="Heures normales" value={m.heuresNormales} onChange={v => set('heuresNormales', v)} step="0.25" suffix="h" />
              <Field label="Jours travaillés" value={m.jours} onChange={v => set('jours', v)} step="1" suffix="j" hint="pour les montants par jour" />
              <Field label="Heures sup 125 %" value={m.heuresSup25} onChange={v => set('heuresSup25', v)} step="0.25" suffix="h" />
              <Field label="Heures sup 150 %" value={m.heuresSup50} onChange={v => set('heuresSup50', v)} step="0.25" suffix="h" />
              <Field label="Heures de nuit" value={m.heuresNuit} onChange={v => set('heuresNuit', v)} step="0.25" suffix="h" />
              <Field label="Majoration de nuit" value={m.pctNuit} onChange={v => set('pctNuit', v)} step="1" suffix="%" />
            </div>
          </div>

          <div className="card p-4 space-y-2">
            <div className="flex items-center justify-between"><h3 className="text-sm font-semibold text-gray-900">Indemnités non soumises <span className="font-normal text-gray-400">— sans charges</span></h3><button onClick={() => ajouter('indemnites', { label: '', montant: 0, unite: 'jour', refact: 'reel' })} className="text-xs text-germa-700 flex items-center gap-1"><Plus size={13} /> Ajouter</button></div>
            {m.indemnites.length === 0 && <p className="text-xs text-gray-400">Aucune (panier, transport, indemnités kilométriques…)</p>}
            {m.indemnites.map((p, i) => (
              <div key={i} className="flex items-center gap-2 flex-wrap">
                <input value={p.label} onChange={e => majListe('indemnites', i, 'label', e.target.value)} placeholder="Libellé" className="input-field text-sm flex-1 min-w-[140px]" />
                <input type="number" step="0.01" value={p.montant} onChange={e => majListe('indemnites', i, 'montant', Number(e.target.value))} className="input-field text-sm w-24" />
                <select value={p.unite} onChange={e => majListe('indemnites', i, 'unite', e.target.value)} className="select-field text-sm w-32"><option value="jour">€ / jour</option><option value="heure">€ / heure</option><option value="forfait">€ forfait</option></select>
                <select value={p.refact} onChange={e => majListe('indemnites', i, 'refact', e.target.value)} className="select-field text-sm w-36"><option value="reel">refacturée au réel</option><option value="coef">au coefficient</option><option value="non">non refacturée</option></select>
                <button onClick={() => retirer('indemnites', i)} className="p-1.5 text-gray-400 hover:text-red-600"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>

          <div className="card p-4 space-y-2">
            <div className="flex items-center justify-between"><h3 className="text-sm font-semibold text-gray-900">Équipements fournis (EPI)</h3><button onClick={() => ajouter('epis', { choix: config.epi[0]?.nom || AUTRE, qte: 1, label: '', prix: 0 })} className="text-xs text-germa-700 flex items-center gap-1"><Plus size={13} /> Ajouter un équipement</button></div>
            {m.epis.length === 0 && <p className="text-xs text-gray-400">Aucun équipement fourni.</p>}
            {epiLignes.map((l, i) => (
              <div key={i} className="flex items-center gap-2 flex-wrap">
                <select value={l.choix} onChange={e => majListe('epis', i, 'choix', e.target.value)} className="select-field text-sm flex-1 min-w-[180px]">
                  {config.epi.map(e => <option key={e.nom} value={e.nom}>{e.nom} — {eur(e.prix)}</option>)}
                  <option value={AUTRE}>Autre…</option>
                </select>
                {l.choix === AUTRE && <>
                  <input value={l.label} onChange={e => majListe('epis', i, 'label', e.target.value)} placeholder="Équipement" className="input-field text-sm w-36" />
                  <input type="number" step="0.01" value={l.prix} onChange={e => majListe('epis', i, 'prix', Number(e.target.value))} placeholder="Prix" className="input-field text-sm w-24" />
                </>}
                <span className="text-xs text-gray-500">×</span>
                <input type="number" step="1" min="0" value={l.qte} onChange={e => majListe('epis', i, 'qte', Number(e.target.value))} className="input-field text-sm w-16" />
                <span className="text-sm text-gray-700 w-20 text-right">{eur(l.total)}</span>
                <button onClick={() => retirer('epis', i)} className="p-1.5 text-gray-400 hover:text-red-600"><Trash2 size={14} /></button>
              </div>
            ))}
            {m.epis.length > 0 && <label className="flex items-center gap-2 text-sm text-gray-700 pt-1"><input type="checkbox" checked={m.equipementRefacture} onChange={e => set('equipementRefacture', e.target.checked)} className="accent-germa-700" /> Refacturés au client (au réel) — total {eur(equipement)}</label>}
          </div>

          {isDirection && (
            <details className="card p-4 border-germa-200">
              <summary className="text-sm font-semibold text-gray-900 cursor-pointer flex items-center gap-2"><Settings size={15} /> Paramètres <span className="font-normal text-gray-400">— réservés à la direction, enregistrés pour tous</span></summary>
              <div className="mt-3 space-y-4">
                {['ETTI', 'AI'].map(st => (
                  <div key={st}>
                    <p className="text-xs font-semibold text-gray-700 mb-1">{st}</p>
                    <p className="text-[11px] text-gray-500 mb-2 flex gap-1.5"><Info size={12} className="flex-shrink-0 mt-0.5" /> {STRUCTURES[st].note}</p>
                    <div className="grid grid-cols-3 gap-3">
                      <Field label="IFM" value={config.params[st].ifm} onChange={v => setParam(st, 'ifm', v)} step="0.1" suffix="%" />
                      <Field label="ICP" value={config.params[st].icp} onChange={v => setParam(st, 'icp', v)} step="0.1" suffix="%" />
                      <Field label="Charges patronales effectives" value={config.params[st].charges} onChange={v => setParam(st, 'charges', v)} step="0.1" suffix="%" />
                    </div>
                  </div>
                ))}
                <div>
                  <div className="flex items-center justify-between mb-2"><p className="text-xs font-semibold text-gray-700">Catalogue des EPI (prix HT)</p><button onClick={() => setConfig(c => ({ ...c, epi: [...c.epi, { nom: '', prix: 0 }] }))} className="text-xs text-germa-700 flex items-center gap-1"><Plus size={13} /> Ajouter</button></div>
                  <div className="space-y-1.5">
                    {config.epi.map((e, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input value={e.nom} onChange={ev => setEpi(i, 'nom', ev.target.value)} placeholder="Équipement" className="input-field text-sm flex-1" />
                        <input type="number" step="0.01" value={e.prix} onChange={ev => setEpi(i, 'prix', Number(ev.target.value))} className="input-field text-sm w-24" /><span className="text-xs text-gray-500">€</span>
                        <button onClick={() => setConfig(c => ({ ...c, epi: c.epi.filter((_, j) => j !== i) }))} className="p-1.5 text-gray-400 hover:text-red-600"><Trash2 size={14} /></button>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 pt-2 border-t border-gray-100">
                  <span className="text-xs text-gray-500">{saveMsg || (config.updated_at ? `Enregistrés le ${formatDateTime(config.updated_at)}${configName ? ` par ${configName}` : ''}` : 'Valeurs par défaut, jamais enregistrées')}</span>
                  <button onClick={saveConfig} className="btn-primary text-sm flex items-center gap-1.5"><Save size={14} /> Enregistrer les paramètres</button>
                </div>
              </div>
            </details>
          )}
        </div>

        {/* ---------------- résultats ---------------- */}
        <div className="lg:col-span-2 space-y-4 lg:sticky lg:top-16">
          <div className="card p-5">
            <p className="text-xs text-gray-500">Marge</p>
            <p className={`font-display font-bold text-3xl ${couleur}`}>{eur(r.marge)}</p>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div><p className="text-xs text-gray-500">en % du CA</p><p className={`font-semibold ${couleur}`}>{pct(r.margePct)}</p></div>
              <div><p className="text-xs text-gray-500">par heure travaillée</p><p className={`font-semibold ${couleur}`}>{eur(r.margeHeure)}</p></div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-gray-100">
              <div><p className="text-xs text-gray-500">Coefficient de seuil</p><p className="font-semibold text-gray-900">{num(r.coefSeuil)}</p><p className="text-[11px] text-gray-400">en dessous, perte</p></div>
              <div><p className="text-xs text-gray-500">Coefficient pour</p><div className="flex items-center gap-1"><input type="number" step="1" value={m.margeCible} onChange={e => set('margeCible', Number(e.target.value))} className="input-field text-xs w-14 py-0.5" /><span className="text-xs text-gray-500">% de marge</span></div><p className="font-semibold text-gray-900">{num(r.coefCible)}</p></div>
            </div>
          </div>

          <div className="card p-4 text-sm">
            <table className="w-full">
              <tbody className="divide-y divide-gray-50">
                <tr><td className="py-1 font-semibold" colSpan={2}>Facturé HT</td><td className="py-1 text-right font-semibold">{eur(r.ca)}</td></tr>
                {[...r.lignesSalaire, ...r.lignesIndemnites].filter(l => l.factureLigne).map((l, i) => <tr key={i} className="text-gray-600"><td className="py-0.5 pl-3">{l.label}</td><td className="py-0.5 text-right text-xs text-gray-400">{num(l.qte, 2)} × {num(l.facture, 2)}</td><td className="py-0.5 text-right">{eur(l.factureLigne)}</td></tr>)}
                {r.equipementFacture > 0 && <tr className="text-gray-600"><td className="py-0.5 pl-3" colSpan={2}>Équipements</td><td className="py-0.5 text-right">{eur(r.equipementFacture)}</td></tr>}
                <tr><td className="pt-3 pb-1 font-semibold" colSpan={2}>Coût complet</td><td className="pt-3 pb-1 text-right font-semibold">{eur(r.cout)}</td></tr>
                {[['Salaire', r.salaire], [`IFM (${num(params.ifm, 1)} %)`, r.ifm], [`ICP (${num(params.icp, 1)} %)`, r.icp], [`Charges patronales (${num(params.charges, 1)} %)`, r.charges], ['Indemnités versées', r.indemnites], ['Équipements', r.equipement]].filter(([, v]) => v).map(([l, v]) => <tr key={l} className="text-gray-600"><td className="py-0.5 pl-3" colSpan={2}>{l}</td><td className="py-0.5 text-right">{eur(v)}</td></tr>)}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-gray-400">Prix facturés arrondis au centime comme sur les factures. Taux de charges fixés par la direction.</p>
        </div>
      </div>
    </div>
  )
}
