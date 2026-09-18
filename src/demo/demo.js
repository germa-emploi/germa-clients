// ============================================================
// MODE DÉMO — branche demo-ia
// Lecture seule sur la vraie base + fonctions "assistant IA" simulées
// (gabarits construits à partir des données réelles, sans appel API).
// ============================================================

export const DEMO_MODE = true

const BLOCKED = ['insert', 'update', 'upsert', 'delete']

function toast(msg) {
  try {
    let el = document.getElementById('demo-toast')
    if (!el) {
      el = document.createElement('div'); el.id = 'demo-toast'
      el.style.cssText = 'position:fixed;left:50%;bottom:28px;transform:translateX(-50%);background:#7c2d12;color:#fff;padding:11px 18px;border-radius:12px;font:500 13px "DM Sans",system-ui,sans-serif;z-index:9999;box-shadow:0 8px 24px rgba(0,0,0,.25);transition:opacity .2s'
      document.body.appendChild(el)
    }
    el.textContent = msg; el.style.opacity = '1'
    clearTimeout(el._t); el._t = setTimeout(() => { el.style.opacity = '0' }, 2600)
  } catch { /* ignore */ }
}

// Enveloppe le client Supabase : toute écriture renvoie une erreur et affiche un message.
export function makeReadOnly(client) {
  const denied = (what) => {
    toast(`Mode démo : lecture seule — ${what} non enregistré`)
    const res = { data: null, error: { message: 'Mode démo : lecture seule' }, count: null, status: 403 }
    // objet chaînable (.eq().select()…) qui finit toujours par la même réponse
    const chain = new Proxy(() => {}, {
      get: (_, key) => key === 'then' ? (ok) => Promise.resolve(res).then(ok) : () => chain,
      apply: () => chain,
    })
    return chain
  }
  const from = client.from.bind(client)
  client.from = (table) => {
    const q = from(table)
    BLOCKED.forEach(m => { q[m] = () => denied(`${m} sur ${table}`) })
    return q
  }
  client.rpc = () => denied('appel de fonction')
  const auth = client.auth
  ;['updateUser', 'resetPasswordForEmail', 'signUp'].forEach(m => {
    auth[m] = async () => { toast('Mode démo : lecture seule — opération sur le compte non effectuée'); return { data: null, error: { message: 'Mode démo : lecture seule' } } }
  })
  if (auth.admin) auth.admin = new Proxy({}, { get: () => async () => ({ data: null, error: { message: 'Mode démo : lecture seule' } }) })
  return client
}

// ---------- helpers ----------
const fmt = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' }) : ''
const fmtShort = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) : ''
const civ = (name) => {
  if (!name) return ''
  if (/^a d[ée]finir$/i.test(name.trim())) return ''
  const n = name.split(/[,(]/)[0].replace(/^(m\.|mr|mme|monsieur|madame)\s+/i, '').trim()
  if (!n) return ''
  const isF = /^(mme|madame)/i.test(name.trim())
  const words = n.split(/\s+/)
  const last = words.filter(w => w === w.toUpperCase() && w.length > 2)[0] || words[words.length - 1]
  return `${isF ? 'Madame' : 'Monsieur'} ${last.charAt(0).toUpperCase() + last.slice(1).toLowerCase()}`
}
const firstName = (p) => (p?.full_name || '').split(' ')[0]

// ---------- Rédiger un e-mail ----------
export function draftEmail({ enterprise, actions = [], interlocuteurs = [], profile, sector }) {
  const sorted = [...actions].sort((a, b) => new Date(b.performed_at) - new Date(a.performed_at))
  const last = sorted[0]
  const contact = civ(interlocuteurs[0]?.name || enterprise.contact_name)
  const greeting = contact ? `Bonjour ${contact},` : 'Bonjour,'
  const who = profile?.full_name || 'L\'équipe GERMA Emploi'
  const need = enterprise.description_activite ? ` en ${enterprise.description_activite.toLowerCase()}` : ''
  let subject, body
  if (!last) {
    subject = `Renfort de personnel${need} — GERMA Emploi`
    body = `${greeting}

Je me permets de vous contacter au nom de GERMA Emploi, structure d'insertion par l'activité économique basée en Alsace. Nous mettons à disposition des entreprises${sector ? ` du secteur ${sector.toLowerCase()}` : ''} des personnes motivées, accompagnées et suivies par nos équipes, pour des missions ponctuelles ou de plus longue durée.
${enterprise.description_activite ? `
Vos besoins${need} correspondent à des profils que nous plaçons régulièrement dans le ${enterprise.department === '68' ? 'Haut' : 'Bas'}-Rhin.
` : ''}
Auriez-vous un créneau dans les prochains jours pour un échange de quinze minutes, par téléphone ou sur site, afin de vous présenter notre fonctionnement ?

Je reste à votre disposition.

Bien cordialement,

${who}
GERMA Emploi`
  } else {
    const isClient = enterprise.status === 'client'
    const hint = (last.comments || '').split(/[.;\n]/)[0].trim()
    subject = isClient ? `Votre prochain besoin de renfort — GERMA Emploi` : `Suite à notre échange du ${fmtShort(last.performed_at)} — GERMA Emploi`
    body = `${greeting}

Lors de notre ${last.action_type === 'Physique' ? 'rencontre' : 'échange'} du ${fmt(last.performed_at)}${hint ? `, vous m'indiquiez : « ${hint.charAt(0).toLowerCase() + hint.slice(1)} »` : ''}.

Je reviens vers vous pour faire le point : avez-vous une date de démarrage en vue, et quel profil vous serait le plus utile${enterprise.description_activite ? ` (${enterprise.description_activite.toLowerCase()})` : ''} ?

${isClient ? 'Comme lors de notre dernière mission, nous' : 'Nous'} pouvons positionner une ou deux personnes rapidement, même pour quelques jours. Un simple retour par mail ou un appel suffit pour que je bloque les disponibilités.

Je reste joignable pour en discuter.

Bien cordialement,

${who}
GERMA Emploi`
  }
  return { subject, body }
}

// ---------- Brief avant l'appel ----------
export function briefBeforeCall({ enterprise, actions = [], interlocuteurs = [], profiles = [] }) {
  const sorted = [...actions].sort((a, b) => new Date(a.performed_at) - new Date(b.performed_at))
  const last = sorted[sorted.length - 1]
  const named = interlocuteurs.filter(i => i.name && !/^a d[ée]finir$/i.test(i.name.trim()))
  const who = named.length
    ? named.map(i => `${i.name}${i.fonction && !/^a d[ée]finir$/i.test(i.fonction) ? ` (${i.fonction})` : ''}`).join(', ')
    : (enterprise.contact_name || 'Aucun interlocuteur nommé')
  const types = sorted.reduce((m, a) => { m[a.action_type] = (m[a.action_type] || 0) + 1; return m }, {})
  const canal = Object.entries(types).sort((a, b) => b[1] - a[1]).map(([t, n]) => `${n} ${t.toLowerCase()}`).join(', ')
  const relances = sorted.filter(a => a.result === 'À relancer').length
  const sansSuite = sorted.filter(a => a.result === 'Sans suite').length
  const comments = sorted.filter(a => a.comments).slice(-3).map(a => `${fmtShort(a.performed_at)} : ${a.comments.split('\n')[0]}`)
  const needs = sorted.filter(a => a.need_identified).length
  const prop = enterprise.proposition_envoyee_at ? `Proposition commerciale envoyée le ${fmtShort(enterprise.proposition_envoyee_at)}${enterprise.proposition_signee_at ? `, signée le ${fmtShort(enterprise.proposition_signee_at)}` : ', sans retour formalisé'}.` : 'Aucune proposition commerciale envoyée.'
  const angle = !last ? 'Premier contact : présenter GERMA et qualifier le besoin.'
    : last.result === 'Sans suite' ? 'Le dernier contact s\'est terminé sans suite : vérifier d\'abord si la situation a changé avant de proposer.'
    : last.next_action ? `Reprendre là où on s'est arrêté : « ${last.next_action} ».`
    : 'Partir du dernier échange et proposer une date concrète.'
  return {
    qui: who,
    ou: `${enterprise.status === 'client' ? `Client${enterprise.converted_at ? ` depuis le ${fmtShort(enterprise.converted_at)}` : ''}` : 'Prospect'}. ${sorted.length} action${sorted.length > 1 ? 's' : ''}${canal ? ` (${canal})` : ''}, ${relances} « à relancer », ${sansSuite} « sans suite ». ${prop}`,
    savoir: comments.length ? comments : ['Aucun commentaire enregistré.'],
    angle,
    demander: [
      'Date de démarrage et durée du besoin',
      enterprise.description_activite ? `Profil : ${enterprise.description_activite}` : 'Profil recherché',
      needs ? 'Confirmer le besoin identifié précédemment' : 'Reste-t-il des heures d\'insertion à couvrir cette année ?',
    ],
  }
}

// ---------- Saisie en langage libre ----------
const MONTHS = { janvier: 1, février: 2, fevrier: 2, mars: 3, avril: 4, mai: 5, juin: 6, juillet: 7, août: 8, aout: 8, septembre: 9, octobre: 10, novembre: 11, décembre: 12, decembre: 12 }
const DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']
function iso(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
function parseDate(seg) {
  const now = new Date()
  let m = seg.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/)
  if (m) return iso(new Date(m[3] ? (m[3].length === 2 ? 2000 + +m[3] : +m[3]) : now.getFullYear(), +m[2] - 1, +m[1]))
  m = seg.match(/(\d{1,2})(?:er)?\s+(janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre)/)
  if (m) { const d = new Date(now.getFullYear(), MONTHS[m[2]] - 1, +m[1]); if (d < now) d.setFullYear(d.getFullYear() + 1); return iso(d) }
  m = seg.match(/(début|fin)\s+(janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre)/)
  if (m) { const mo = MONTHS[m[2]]; const d = new Date(now.getFullYear(), mo - 1, m[1] === 'début' ? 1 : 0); if (m[1] === 'fin') d.setMonth(mo); if (d < now) d.setFullYear(d.getFullYear() + 1); return iso(d) }
  m = seg.match(/\b(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\b/)
  if (m) { const target = DAYS.indexOf(m[1]); const d = new Date(now); d.setDate(d.getDate() + ((target - d.getDay() + 7) % 7 || 7)); return iso(d) }
  m = seg.match(/dans\s+(\d+)\s*(jour|semaine|mois)/)
  if (m) { const d = new Date(now); const n = +m[1]; if (m[2] === 'jour') d.setDate(d.getDate() + n); else if (m[2] === 'semaine') d.setDate(d.getDate() + 7 * n); else d.setMonth(d.getMonth() + n); return iso(d) }
  if (/demain/.test(seg)) { const d = new Date(now); d.setDate(d.getDate() + 1); return iso(d) }
  if (/semaine prochaine/.test(seg)) { const d = new Date(now); d.setDate(d.getDate() + 7); return iso(d) }
  return ''
}
export function parseFreeText(text) {
  const t = (text || '').toLowerCase()
  const out = { action_type: 'Téléphonique', result: 'À relancer', next_action: '', next_action_date: '', need_identified: false, need_type: '', comments: text.trim() }
  if (/\b(visite|passé|passage|rencontr|sur place|vu\b)/.test(t)) out.action_type = 'Physique'
  else if (/\b(mail|courriel|e-mail|envoyé un mail)/.test(t) && !/\bappel|téléphon|appelé\b/.test(t)) out.action_type = 'Mail'
  else if (/\bcourrier\b/.test(t)) out.action_type = 'Courrier'
  if (/refus|ne veut pas|pas intéress|ne souhaite pas/.test(t)) out.result = 'Refus'
  else if (/sans suite|au complet|pas de besoin|ne décroche|mauvais num|plus d'activité|retraite|n'a plus/.test(t)) out.result = 'Sans suite'
  else if (/rdv|rendez-vous|rendez vous/.test(t)) out.result = 'RDV pris'
  else if (/sign[ée]|contrat|commande|accord/.test(t) && !/pas (encore )?sign/.test(t)) out.result = 'Signé'
  const rel = t.match(/(rappel\w*|relanc\w*|recontact\w*|reprise de contact|revoir|refaire le point)([^.;]*)/)
  if (rel) {
    out.next_action = rel[1].charAt(0).toUpperCase() + rel[1].slice(1)
    out.next_action_date = parseDate(rel[2]) || parseDate(t)
    if (out.result === 'Sans suite') out.result = 'À relancer'
  }
  const need = /pas de besoin|aucun besoin|sans besoin/.test(t) ? null : t.match(/besoin\s+(?:de\s+|d')?([^.;,]+)/)
  if (need) { out.need_identified = true; out.need_type = need[1].trim().replace(/^un\s|^une\s|^d'/, '').slice(0, 80) }
  if (/heures? d'insertion|clause d'insertion/.test(t) && !out.need_identified) { out.need_identified = true; out.need_type = 'Heures d\'insertion' }
  return out
}

// ---------- Priorités de la semaine ----------
const HOT = ['intéress', 'besoin', "heures d'insertion", "h d'ins", 'clause', 'envoyer prop', 'proposition', 'à confirmer', 'recrut', 'recherch', 'profil', 'démarrage', 'chantier', 'revient vers', 'compléter', 'renfort', 'contactera', 'ok pour']
const COLD = ['pas de besoin', 'pas intéress', 'au complet', 'ne décroche', 'injoignable', 'prestataire', 'agence', 'retraite', 'arrêt', 'indispo', 'absent', 'répondeur', 'message vocal', 'perdu', 'autre association', 'pourvu']
export function weeklyPriorities({ enterprises = [], actions = [], profiles = [], limit = 10 }) {
  const byEnt = {}
  actions.forEach(a => { (byEnt[a.enterprise_id] = byEnt[a.enterprise_id] || []).push(a) })
  const prof = Object.fromEntries(profiles.map(p => [p.id, p.full_name]))
  const rows = []
  const cutoff = new Date(); cutoff.setMonth(cutoff.getMonth() - 5)
  enterprises.forEach(e => {
    if (e.status !== 'prospect') return
    const acts = (byEnt[e.id] || []).sort((a, b) => new Date(a.performed_at) - new Date(b.performed_at))
    const last = acts[acts.length - 1]
    if (!last || last.result !== 'À relancer') return
    const txt = acts.slice(-3).map(a => a.comments || '').join(' ').toLowerCase()
    const lt = (last.comments || '').toLowerCase()
    const hot = HOT.filter(k => txt.includes(k)).length
    const cold = COLD.filter(k => lt.includes(k)).length
    let score = hot * 2 - cold * 1.5 + Math.min(acts.length, 5) * 0.5 + (last.next_action_date ? 1 : 0)
    if (new Date(last.performed_at) < cutoff) score -= 2
    if (cold >= 2) return
    const stars = score >= 12 ? 5 : score >= 10 ? 4 : score >= 7.5 ? 3 : score >= 5 ? 2 : 1
    const why = (last.comments || '').split('\n')[0].slice(0, 140) || 'Relance prévue sans commentaire'
    rows.push({ id: e.id, name: e.name, city: e.city, commercial: prof[e.assigned_to] || '—', stars, score, lastDate: last.performed_at, nextDate: last.next_action_date, why, nbActions: acts.length })
  })
  rows.sort((a, b) => b.score - a.score)
  return { top: rows.slice(0, limit), total: rows.length }
}
