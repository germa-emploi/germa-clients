// ============================================================
// GermaClients — Worker "assistant IA"
// Reçoit le contexte d'une fiche depuis le site, interroge l'API Claude
// avec la clé stockée en secret (ANTHROPIC_API_KEY), renvoie le résultat.
// Variables : ANTHROPIC_API_KEY (secret), MODEL (optionnel), ALLOWED_ORIGINS (optionnel)
// Notation nocturne (cron) : SUPABASE_URL, SUPABASE_SERVICE_KEY (secret), CRON_SECRET (secret, pour lancer à la main)
// ============================================================

const DEFAULT_MODEL = 'claude-sonnet-5'
const DEFAULT_ORIGINS = ['https://demo-ia.germa-clients.pages.dev', 'https://germa-clients.pages.dev', 'http://localhost:5173']

const PRESENTATION = `GERMA Emploi est une structure d'insertion par l'activité économique basée en Alsace (Bas-Rhin et Haut-Rhin). Elle met à disposition des entreprises des personnes en parcours d'insertion, motivées, accompagnées et suivies par ses équipes, pour des missions ponctuelles ou de plus longue durée (intérim d'insertion via l'ETTI, mise à disposition via l'association intermédiaire). Elle permet aussi aux entreprises de réaliser leurs heures d'insertion (clauses sociales des marchés).`

const SYSTEM = {
  mail: `Tu es l'assistant commercial de GERMA Emploi. Tu rédiges en français un e-mail professionnel, chaleureux et court (120 mots maximum, hors formule de politesse et signature), à envoyer par un commercial à une entreprise.
Règles :
- Si un historique existe : rappelle le dernier échange avec sa date, pose UNE question précise (date de démarrage, profil, durée) plutôt qu'un « avez-vous des besoins ? » générique, et appuie-toi sur ce qui a déjà fonctionné (mission réalisée, proposition envoyée). Ne reviens pas sur les reports ou les échecs passés.
- Si aucun historique : présente GERMA en deux phrases à partir du texte de présentation fourni, relie l'offre aux profils recherchés par l'entreprise si connus, et propose un échange de quinze minutes.
- N'invente AUCUNE information absente du contexte (pas de chiffres, pas de noms, pas de dates). Si le numéro de téléphone du commercial n'est pas fourni, n'en mets pas.
- Vouvoiement. Signature : prénom et nom du commercial, puis « GERMA Emploi ».
Réponds UNIQUEMENT avec un JSON : {"subject": "...", "body": "..."} — sans commentaire, sans balise de code.

Présentation de GERMA à utiliser : ${PRESENTATION}`,

  brief: `Tu es l'assistant commercial de GERMA Emploi. À partir de la fiche d'une entreprise et de son historique d'actions, prépare un brief de lecture rapide (30 secondes) pour le commercial qui va l'appeler. Français, phrases courtes, aucune information inventée.
Réponds UNIQUEMENT avec un JSON :
{"qui": "l'interlocuteur et ce qu'on sait de lui", "ou": "où en est la relation en 2 phrases", "savoir": ["3 faits utiles maximum, tirés des commentaires"], "angle": "l'angle conseillé pour cet appel en 1 phrase", "demander": ["2 à 3 questions à poser"]}`,

  parse: `Tu transformes une note dictée par un commercial de GERMA Emploi en action structurée. Date du jour : {{TODAY}} (heure de Paris). Réponds UNIQUEMENT avec un JSON :
{"action_type": "Physique|Téléphonique|Mail|Courrier", "result": "À relancer|RDV pris|Refus|Sans suite|Signé", "next_action": "libellé court ou vide", "next_action_date": "AAAA-MM-JJ ou vide", "need_identified": true|false, "need_type": "besoin en quelques mots ou vide", "comments": "commentaire propre et complet en une ou deux phrases"}
Règles : « rappeler jeudi » = le prochain jeudi ; « dans 15 jours » = aujourd'hui + 15 ; si un besoin concret est exprimé (profil, nombre, période) → need_identified true ; « pas de besoin » → false ; si une relance est demandée, result = À relancer même si le contact était négatif.`,

  score: `Tu es l'assistant commercial de GERMA Emploi. À partir de la fiche d'un prospect et de son historique, attribue un score de chaleur de 1 à 5 :
5 = affaire quasi conclue ou besoin concret et daté avec interlocuteur engagé (offre signée, RDV fixé, besoin exprimé pour les prochains jours) ;
4 = besoin concret exprimé, proposition envoyée ou heures d'insertion à pourvoir, interlocuteur identifié, mais pas de date ferme ;
3 = intérêt réel (heures d'insertion, profils recherchés, RDV passé) mais sans besoin immédiat, ou action de notre côté attendue ;
2 = contact établi, porte entrouverte (« peut-être plus tard », « reviendra vers nous », relance demandée à une date), rien de concret ;
1 = pas de besoin, refus, au complet, injoignable, mail sans réponse, ou information trop ancienne.
Tiens compte de la date du jour ({{TODAY}}) : un besoin passé (vendanges terminées, chantier de l'an dernier) ne compte plus. Un dossier où c'est à nous d'agir (mail promis, candidats à envoyer) mérite au moins 3.
Rédige la raison en une phrase de 25 mots maximum, factuelle, tirée des commentaires, qui dit ce qui justifie le score et ce qu'il reste à faire.
Réponds UNIQUEMENT avec un JSON : {"score": 1-5, "reason": "..."}`,

  relance_date: `Tu aides un commercial de GERMA Emploi à fixer la date de sa prochaine relance à partir du commentaire qu'il vient d'écrire sur un échange. Le message indique la date du jour.
Règles : si le commentaire contient une date ou une échéance explicite (« rappeler jeudi », « reprise de contact début octobre », « dans 15 jours », « après les vendanges », « quand le chantier démarre fin novembre »), propose la date correspondante (un jour ouvré, le lundi suivant si l'échéance tombe un week-end). Sinon, déduis un délai raisonnable de la situation : message vocal ou mail sans réponse → 5 jours ouvrés ; « pas de besoin pour l'instant » → 2 mois ; besoin annoncé pour une saison → 3 semaines avant cette saison ; refus net → aucune date. Ne propose jamais une date passée.
Réponds UNIQUEMENT avec un JSON : {"date": "AAAA-MM-JJ" ou "", "label": "prochaine action en 2-4 mots (Rappeler, Relancer par mail, Visite…)", "why": "justification en 10 mots maximum"}`,

  priorities: `Tu es l'assistant commercial de GERMA Emploi. On te donne une liste de prospects « à relancer » avec, pour chacun, ses derniers commentaires. Classe les 10 plus prometteurs pour la semaine, note chacun de 1 à 5 étoiles selon la chaleur du prospect (besoin concret exprimé, interlocuteur identifié, relance due), et explique en une phrase pourquoi. Écarte ceux qui sont manifestement perdus ou sans besoin. Français, aucune information inventée.
Réponds UNIQUEMENT avec un JSON : {"top": [{"id": "...", "stars": 1-5, "why": "..."}], "excluded": [{"id": "...", "why": "..."}]}`,
}

function cors(origin, allowed) {
  const ok = allowed.includes(origin)
  return {
    'Access-Control-Allow-Origin': ok ? origin : allowed[0],
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json; charset=utf-8',
  }
}

// ---------- Notation nocturne ----------
const fmtFR = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Paris' }) : ''
function buildContext(e, actions, inters, profiles) {
  const prof = Object.fromEntries(profiles.map(p => [p.id, p.full_name]))
  const sorted = [...actions].sort((a, b) => new Date(a.performed_at) - new Date(b.performed_at))
  const L = [`Entreprise : ${e.name} — ${e.city || '?'} (${e.department || '?'})${e.description_activite ? ` — ${e.description_activite}` : ''}`,
    `Statut : ${e.status} — commercial : ${prof[e.assigned_to] || '?'}`]
  const named = inters.filter(i => i.name && !/^a d[ée]finir$/i.test(i.name.trim()))
  if (named.length) L.push(`Interlocuteur(s) : ${named.map(i => `${i.name}${i.fonction ? ` (${i.fonction})` : ''}`).join(', ')}`)
  else if (e.contact_name) L.push(`Interlocuteur : ${e.contact_name}`)
  if (e.proposition_envoyee_at) L.push(`Proposition commerciale envoyée le ${fmtFR(e.proposition_envoyee_at)}${e.proposition_signee_at ? `, signée le ${fmtFR(e.proposition_signee_at)}` : ''}`)
  if (e.a_relancer) L.push('Drapeau "À relancer" actif sur la fiche')
  if (e.notes) L.push(`Notes : ${e.notes}`)
  L.push(sorted.length ? 'Historique (du plus ancien au plus récent) :' : 'Historique : aucune action')
  sorted.forEach(a => L.push(`${fmtFR(a.performed_at)} ${(a.action_type || '').toLowerCase()} — ${a.result || ''}${a.need_identified ? ` — besoin identifié${a.need_type ? ` : ${a.need_type}` : ''}` : ''}${a.next_action ? ` — prochaine étape : ${a.next_action}${a.next_action_date ? ` le ${fmtFR(a.next_action_date)}` : ''}` : ''}${a.comments ? ` — ${a.comments.replace(/\n+/g, ' / ')}` : ''}`))
  return L.join('\n')
}
async function sb(env, path, init = {}) {
  const r = await fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, { ...init, headers: { apikey: env.SUPABASE_SERVICE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal', ...(init.headers || {}) } })
  const txt = await r.text()
  if (!r.ok) throw new Error(`Supabase ${path}: ${r.status} ${txt}`)
  return txt ? JSON.parse(txt) : null
}
async function askClaude(env, task, context) {
  const today = new Date().toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' })
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: env.MODEL || DEFAULT_MODEL, max_tokens: 400, system: SYSTEM[task].replace(/\{\{TODAY\}\}/g, today), messages: [{ role: 'user', content: context }] }),
  })
  const data = await r.json()
  if (!r.ok) throw new Error(data?.error?.message || `API ${r.status}`)
  const text = (data.content || []).filter(c => c.type === 'text').map(c => c.text).join('').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  return { result: JSON.parse(text), model: data.model, usage: data.usage }
}
async function nightlyScoring(env, { hours = 26, limit = 150, force = [] } = {}) {
  if (hours <= 0 && !force.length) return { scanned: 0, scored: 0, skipped: 0, errors: [] }
  const since = new Date(Date.now() - Math.max(0, hours) * 3600 * 1000).toISOString()
  const ids = new Set(force)
  // fiches créées ou modifiées (journal), actions créées/modifiées ou datées dans la fenêtre
  const [logs, acts, created] = await Promise.all([
    sb(env, `activity_log?select=target_id&target_type=eq.enterprise&created_at=gte.${since}`, { headers: { Prefer: '' } }),
    sb(env, `actions?select=enterprise_id&performed_at=gte.${since}`, { headers: { Prefer: '' } }),
    sb(env, `enterprises?select=id&created_at=gte.${since}`, { headers: { Prefer: '' } }),
  ])
  logs.forEach(l => l.target_id && ids.add(l.target_id)); acts.forEach(a => ids.add(a.enterprise_id)); created.forEach(e => ids.add(e.id))
  if (!ids.size) return { scanned: 0, scored: 0, skipped: 0, errors: [] }
  const idList = [...ids].slice(0, limit)
  const inFilter = `in.(${idList.join(',')})`
  const [ents, allActs, inters, profiles] = await Promise.all([
    sb(env, `enterprises?select=*&id=${inFilter}&status=eq.prospect`, { headers: { Prefer: '' } }),
    sb(env, `actions?select=*&enterprise_id=${inFilter}`, { headers: { Prefer: '' } }),
    sb(env, `interlocuteurs?select=*&enterprise_id=${inFilter}`, { headers: { Prefer: '' } }),
    sb(env, `profiles?select=id,full_name`, { headers: { Prefer: '' } }),
  ])
  const out = { scanned: ids.size, scored: 0, skipped: ids.size - ents.length, errors: [], tokens: 0 }
  for (const e of ents) {
    try {
      const ctx = buildContext(e, allActs.filter(a => a.enterprise_id === e.id), inters.filter(i => i.enterprise_id === e.id), profiles)
      const { result, model, usage } = await askClaude(env, 'score', ctx)
      const score = Math.max(1, Math.min(5, Math.round(Number(result.score) || 1)))
      await sb(env, 'ia_scores', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ enterprise_id: e.id, score, reason: String(result.reason || '').slice(0, 400), model, source: 'nightly', computed_at: new Date().toISOString() }) })
      out.scored++; out.tokens += (usage?.input_tokens || 0) + (usage?.output_tokens || 0)
    } catch (err) { out.errors.push(`${e.name}: ${err.message}`) }
  }
  return out
}

export default {
  // Déclencheur planifié (Cloudflare → Settings → Triggers → Cron) : notation des fiches modifiées dans la journée
  async scheduled(event, env, ctx) {
    ctx.waitUntil(nightlyScoring(env).then(r => console.log('Notation nocturne :', JSON.stringify(r))))
  },

  async fetch(request, env) {
    const allowed = (env.ALLOWED_ORIGINS ? env.ALLOWED_ORIGINS.split(',').map(s => s.trim()) : DEFAULT_ORIGINS)
    const origin = request.headers.get('Origin') || ''
    const headers = cors(origin, allowed)
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers })
    if (request.method !== 'POST') return new Response(JSON.stringify({ error: 'POST attendu' }), { status: 405, headers })
    // Lancement manuel de la notation (test) : POST {"task":"nightly","secret":"…","hours":26,"force":["uuid",…]}
    if (new URL(request.url).pathname === '/nightly') {
      let b = {}; try { b = await request.json() } catch { /* vide */ }
      if (!env.CRON_SECRET || b.secret !== env.CRON_SECRET) return new Response(JSON.stringify({ error: 'Non autorisé' }), { status: 401, headers })
      try { return new Response(JSON.stringify(await nightlyScoring(env, { hours: b.hours ?? 26, limit: b.limit || 150, force: b.force || [] })), { status: 200, headers }) }
      catch (err) { return new Response(JSON.stringify({ error: err.message }), { status: 500, headers }) }
    }
    if (!allowed.includes(origin)) return new Response(JSON.stringify({ error: 'Origine non autorisée' }), { status: 403, headers })
    if (!env.ANTHROPIC_API_KEY) return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY manquante' }), { status: 500, headers })

    let body
    try { body = await request.json() } catch { return new Response(JSON.stringify({ error: 'JSON invalide' }), { status: 400, headers }) }
    const { task, context } = body || {}
    if (!SYSTEM[task]) return new Response(JSON.stringify({ error: 'Tâche inconnue' }), { status: 400, headers })

    const today = new Date().toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' })
    const system = SYSTEM[task].replace('{{TODAY}}', today)
    const user = typeof context === 'string' ? context : JSON.stringify(context, null, 1)

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: env.MODEL || DEFAULT_MODEL, max_tokens: 1200, system, messages: [{ role: 'user', content: user }] }),
    })
    const data = await r.json()
    if (!r.ok) return new Response(JSON.stringify({ error: data?.error?.message || `Erreur API (${r.status})` }), { status: 502, headers })

    const text = (data.content || []).filter(c => c.type === 'text').map(c => c.text).join('\n').trim()
    const clean = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
    let result
    try { result = JSON.parse(clean) } catch { result = { raw: text } }
    return new Response(JSON.stringify({ result, usage: data.usage, model: data.model }), { status: 200, headers })
  },
}
