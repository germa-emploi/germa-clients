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
- Si le contexte contient une rubrique « Dans la presse » et qu'elle est pertinente (marché gagné, chantier, extension, recrutement), ouvre le mail par une phrase de félicitations ou de référence à cette actualité, sobre et sans flatterie, et relie-la au besoin de personnel. Si elle n'est pas pertinente (sujet sans lien, information négative), ignore-la.
- N'invente AUCUNE information absente du contexte (pas de chiffres, pas de noms, pas de dates). Si le numéro de téléphone du commercial n'est pas fourni, n'en mets pas.
- Vouvoiement. Signature : prénom et nom du commercial, puis « GERMA Emploi ».
Réponds UNIQUEMENT avec un JSON : {"subject": "...", "body": "..."} — sans commentaire, sans balise de code.

Présentation de GERMA à utiliser : ${PRESENTATION}`,

  brief: `Tu es l'assistant commercial de GERMA Emploi. À partir de la fiche d'une entreprise et de son historique d'actions, prépare un brief de lecture rapide (30 secondes) pour le commercial qui va l'appeler. Français, phrases courtes, aucune information inventée. Si le contexte contient une rubrique « Dans la presse », intègre l'actualité pertinente dans « savoir » et, si elle ouvre une accroche (marché gagné, chantier, recrutement), dans « angle ».
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
Réponds UNIQUEMENT avec un JSON : {"date": "AAAA-MM-JJ" ou "", "label": "un libellé parmi exactement : Relance téléphonique | Relance par mail | Visite | Envoi de candidature | Envoi de proposition | Autre", "why": "justification en 10 mots maximum"}`,

  daily: `Tu es l'assistant commercial de GERMA Emploi. Date du jour : {{TODAY}}. On te donne la liste des prospects suivis par un commercial, avec pour chacun le score de chaleur (1-5) et sa raison, la relance planifiée s'il y en a une, la date du dernier contact et le dernier commentaire. Classe les prospects qu'il devrait traiter AUJOURD'HUI, du plus important au moins important, jusqu'à 15 au maximum, en privilégiant : relance due aujourd'hui ou en retard, dossier chaud où c'est à nous d'agir (mail promis, candidats à envoyer, proposition à faire), besoin daté qui approche, puis dossiers tièdes sans contact depuis longtemps. Écarte ce qui est manifestement clos.
Pour chacun : l'action conseillée parmi exactement : Appeler | Envoyer un mail | Passer sur site | Envoyer des candidatures | Envoyer une proposition ; et une raison en 20 mots maximum, factuelle.
Dans les textes, n'utilise jamais de guillemets droits " (utilise « » ou rien). Réponds UNIQUEMENT avec un JSON compact sur une ligne, au plus 15 éléments, sans aucun texte avant ou après : {"picks": [{"id": "...", "action": "...", "why": "..."}]}`,

  veille_mention: `Tu es l'assistant commercial de GERMA Emploi (insertion par l'activité économique, Alsace). On te donne un article de presse et le nom d'une entreprise de notre base qui semble y être citée. Dis si l'article parle bien de CETTE entreprise (et pas d'une homonyme), et résume en deux phrases ce que ça change pour un commercial : chantier ou marché gagné, extension, recrutement, difficulté, clause d'insertion…
Réponds UNIQUEMENT avec un JSON : {"match": true|false, "summary": "deux phrases maximum", "department": "67"|"68"|""}`,

  veille_pistes: `Tu es l'assistant commercial de GERMA Emploi (insertion par l'activité économique en Alsace : mise à disposition de personnel, intérim d'insertion, heures d'insertion sur marchés clausés). On te donne des titres et extraits d'articles régionaux. Repère les ENTREPRISES ou collectivités qui pourraient avoir besoin de main-d'œuvre en Alsace prochainement : marché public attribué (surtout avec clause sociale), chantier annoncé, ouverture ou extension de site, recrutement de volume, activité saisonnière. Ignore les particuliers, les associations sans activité économique, les entreprises hors Alsace, et les articles sans piste concrète. Pour chaque piste : le nom exact de l'entreprise, la ville si connue, le département (67, 68 ou vide), l'article (numéro) et une raison en 25 mots maximum.
Réponds UNIQUEMENT avec un JSON : {"pistes": [{"article": 1, "company": "...", "city": "...", "department": "67", "why": "..."}]}`,

  reopen: `Tu es l'assistant commercial de GERMA Emploi (insertion par l'activité économique, Alsace). Date du jour : {{TODAY}}. On te donne des prospects dont le dernier contact s'est terminé par « {{KIND}} », avec le commentaire de ce contact, l'ancienneté, et le cas échéant une actualité récente (presse ou marché public). Choisis ceux qu'il serait pertinent de RELANCER MAINTENANT, jusqu'à 5, du plus prometteur au moins, en t'appuyant sur : un refus daté ou conditionnel dont l'échéance est passée (« pas pour l'instant », « après les vendanges », « quand le chantier démarrera ») ; un fait nouveau (marché gagné, chantier, extension, recrutement) ; une raison de refus qui a pu changer (autre agence en place, chantier reporté, RH absente, changement de direction) ; la saisonnalité (relancer 3 semaines avant la saison) ; un simple contact raté (répondeur, injoignable) vieux de plus de 2 mois. Écarte : « ne plus recontacter », cessation, retraite, main-d'œuvre structurellement interne ou étrangère, refus de principe répétés.
Pour chacun : l'action conseillée parmi exactement : Appeler | Envoyer un mail | Passer sur site ; une raison en 25 mots maximum qui cite le fait précis qui justifie la relance.
Dans les textes, n'utilise jamais de guillemets droits " (utilise « » ou rien). Réponds UNIQUEMENT avec un JSON compact sur une ligne, au plus 5 éléments, sans texte autour : {"picks": [{"id": "...", "action": "...", "why": "..."}]}`,

  urgence: `Tu es l'assistant commercial de GERMA Emploi (insertion par l'activité économique, Alsace). Date du jour : {{TODAY}}. On te donne des relances planifiées (en retard ou à venir) : pour chacune, l'entreprise, sa chaleur (1-5) et la raison, la date prévue et le retard éventuel, le dernier commentaire, la proposition en cours et l'actualité éventuelle.
Pour chacune, donne :
- level, l'urgence : 3 = urgent (besoin concret ou daté, interlocuteur engagé, proposition en cours, actualité favorable, retard qui met une affaire en péril) ; 2 = à faire (intérêt réel, dossier tiède à ne pas laisser refroidir) ; 1 = peut attendre (porte entrouverte sans besoin, saison lointaine, simple contact raté) ; 0 = à solder (la relance n'a plus de sens : besoin passé, pas de besoin, refus implicite, contact obsolète — à clôturer).
- action, le meilleur moyen de relancer d'après le commentaire, parmi exactement : Appeler | Envoyer un mail | Passer sur site | Envoyer des candidatures | Envoyer une proposition. Exemples : « préfère être contacté par mail » → Envoyer un mail ; « repasser voir le chef de chantier » → Passer sur site ; « attend des CV » → Envoyer des candidatures ; « demande un devis » → Envoyer une proposition ; sinon Appeler.
- why, en 15 mots maximum, qui justifie à la fois l'urgence et le moyen choisi.
Dans les textes, jamais de guillemets droits ". Traite TOUTES les lignes reçues, sans commentaire ni explication.
Réponds UNIQUEMENT avec un JSON compact sur une ligne, sans texte autour : {"items": [{"id": "...", "level": 0-3, "action": "...", "why": "..."}]}`,

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
// JSON tolérant : parse normal, sinon récupération des éléments {id, action, why} un par un
function parsePicks(raw) {
  if (!raw || !raw.trim() || /^\s*(aucun|rien|none)/i.test(raw)) return { picks: [] }
  const a = raw.indexOf('{'), b = raw.lastIndexOf('}')
  if (a >= 0 && b > a) { try { return JSON.parse(raw.slice(a, b + 1)) } catch { /* on tente la récupération */ } }
  const picks = []
  const re = /"id"\s*:\s*"([^"]+)"[\s\S]*?"action"\s*:\s*"([^"]+)"[\s\S]*?"why"\s*:\s*"([\s\S]*?)"\s*\}/g
  let m; while ((m = re.exec(raw))) picks.push({ id: m[1], action: m[2], why: m[3].replace(/\\"/g, '"') })
  if (!picks.length) throw new Error(`JSON invalide : ${raw.slice(0, 120)}`)
  return { picks, recovered: true }
}
// Lecture complète d'une table par pages de 1000 (Supabase limite chaque réponse à 1000 lignes)
async function sbAll(env, path) {
  const out = []
  for (let from = 0; ; from += 1000) {
    const r = await fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, { headers: { apikey: env.SUPABASE_SERVICE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`, Range: `${from}-${from + 999}`, 'Range-Unit': 'items' } })
    if (!r.ok && r.status !== 416) throw new Error(`Supabase ${path}: ${r.status} ${await r.text()}`)
    const page = r.status === 416 ? [] : await r.json()
    out.push(...page)
    if (page.length < 1000) break
  }
  return out
}
async function askClaude(env, task, context, maxTokens = 4000) {
  const today = new Date().toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' })
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: env.MODEL || DEFAULT_MODEL, max_tokens: maxTokens, system: SYSTEM[task].replace(/\{\{TODAY\}\}/g, today), messages: [{ role: 'user', content: context }] }),
  })
  const body = await r.text()
  let data = {}
  try { data = JSON.parse(body) } catch { throw new Error(`API ${r.status} : réponse illisible : ${body.slice(0, 160)}`) }
  if (!r.ok) throw new Error(data?.error?.message || `API ${r.status}`)
  const raw = (data.content || []).filter(c => c.type === 'text').map(c => c.text).join('').trim()
  const a = raw.indexOf('{'), b = raw.lastIndexOf('}')
  if (a < 0 || b < a) throw new Error(`réponse sans JSON (${data.stop_reason || '?'}, blocs: ${(data.content || []).map(c => c.type).join(',') || 'aucun'}, sortie ${data.usage?.output_tokens ?? '?'} tokens) : ${raw.slice(0, 120)}`)
  try { return { result: JSON.parse(raw.slice(a, b + 1)), model: data.model, usage: data.usage } }
  catch (e) {
    if (/"picks"/.test(raw)) { try { return { result: parsePicks(raw), model: data.model, usage: data.usage } } catch { /* tombe dans l'erreur */ } }
    if (/"items"/.test(raw)) { const items = []; const re = /"id"\s*:\s*"([^"]+)"[\s\S]*?"level"\s*:\s*(\d)(?:[\s\S]*?"action"\s*:\s*"([^"]+)")?[\s\S]*?"why"\s*:\s*"([\s\S]*?)"\s*\}/g; let m; while ((m = re.exec(raw))) items.push({ id: m[1], level: +m[2], action: m[3], why: m[4] }); if (items.length) return { result: { items }, model: data.model, usage: data.usage } }
    throw new Error(`JSON invalide (${data.stop_reason || '?'}) : ${raw.slice(0, 120)}`)
  }
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
    sbAll(env, `profiles?select=id,full_name`),
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

// ---------- Veille presse ----------
// Sources : flux RSS/Atom gratuits. Ajuster la liste selon ce que /veille-test rapporte.
const FEEDS = [
  { name: 'DNA – Économie', url: 'https://www.dna.fr/economie/rss' },
  { name: "L'Alsace – Économie", url: 'https://www.lalsace.fr/economie/rss' },
  { name: 'Rue89 Strasbourg', url: 'https://www.rue89strasbourg.com/feed' },
  // BOAMP : API open data (opendatasoft, sans clé) — avis et attributions du 67 et du 68 (marchés clausés = insertion)
  { name: 'BOAMP – 67', type: 'boamp', url: 'https://boamp-datadila.opendatasoft.com/api/explore/v2.1/catalog/datasets/boamp/records?refine=code_departement%3A%2267%22&order_by=dateparution%20desc&limit=60' },
  { name: 'BOAMP – 68', type: 'boamp', url: 'https://boamp-datadila.opendatasoft.com/api/explore/v2.1/catalog/datasets/boamp/records?refine=code_departement%3A%2268%22&order_by=dateparution%20desc&limit=60' },
]
const strip = (s) => (s || '').replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
function parseFeed(xml) {
  const items = []
  const blocks = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) || xml.match(/<entry[\s>][\s\S]*?<\/entry>/gi) || []
  for (const b of blocks) {
    const tag = (n) => { const m = b.match(new RegExp(`<${n}[^>]*>([\\s\\S]*?)<\\/${n}>`, 'i')); return m ? strip(m[1]) : '' }
    let link = tag('link'); if (!link) { const m = b.match(/<link[^>]*href="([^"]+)"/i); link = m ? m[1] : '' }
    const title = tag('title'); const desc = tag('description') || tag('summary') || tag('content')
    const date = tag('pubDate') || tag('published') || tag('updated') || tag('dc:date')
    if (title && link) items.push({ title, link: link.trim(), desc: desc.slice(0, 600), date })
  }
  return items
}
// BOAMP (opendatasoft) : un "article" par avis, texte = acheteur + objet + titulaires, lien vers l'avis
function parseBoamp(json) {
  let data; try { data = JSON.parse(json) } catch { return [] }
  const rows = data.results || data.records || []
  return rows.map(raw => {
    const r = raw.record?.fields || raw.fields || raw
    const get = (...keys) => { for (const k of keys) { const v = r[k]; if (v != null && v !== '') return Array.isArray(v) ? v.join(', ') : String(v) } return '' }
    const objet = get('objet', 'intitule', 'titre', 'nomobjet'); const acheteur = get('nomacheteur', 'acheteur', 'nom_acheteur'); const titulaires = get('titulaire', 'titulaires', 'attributaire')
    const nature = get('nature_categorise_libelle', 'nature', 'typeavis', 'famille'); const id = get('idweb', 'id', 'recordid')
    const url = get('url_avis', 'urlavis', 'lien') || (id ? `https://www.boamp.fr/pages/avis/?q=idweb:${id}` : '')
    const title = `${nature ? nature + ' — ' : ''}${acheteur ? acheteur + ' : ' : ''}${objet}`.slice(0, 250)
    const desc = `${objet}${titulaires ? ` — Titulaire(s) : ${titulaires}` : ''}${get('descripteur_libelle', 'descripteurs') ? ` — ${get('descripteur_libelle', 'descripteurs')}` : ''}`.slice(0, 600)
    return { title, link: url, desc, date: get('dateparution', 'date_parution', 'datefindiffusion') }
  }).filter(i => i.title && i.link)
}
async function fetchFeeds(only, days = 0) {
  const out = []; const report = []
  const H = { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; GermaClientsVeille/1.0)', Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, application/json, */*' }, cf: { cacheTtl: 0 } }
  for (const f of FEEDS.filter(f => !only || only.includes(f.name))) {
    try {
      if (f.type === 'boamp' && days > 0) {
        // rattrapage : tous les avis depuis N jours, par pages de 100
        const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10)
        const dep = f.name.includes('68') ? '68' : '67'
        let items = []
        for (let offset = 0; offset < 1000; offset += 100) {
          const url = `https://boamp-datadila.opendatasoft.com/api/explore/v2.1/catalog/datasets/boamp/records?refine=code_departement%3A%22${dep}%22&where=dateparution%3E%3D%22${since}%22&order_by=dateparution%20desc&limit=100&offset=${offset}`
          const r = await fetch(url, H); if (!r.ok) { report.push({ source: f.name, status: r.status, items: items.length }); break }
          const page = parseBoamp(await r.text()); items = items.concat(page)
          if (page.length < 100) { report.push({ source: f.name, status: 200, items: items.length }); break }
        }
        items.forEach(i => out.push({ ...i, source: f.name }))
        continue
      }
      const r = await fetch(f.url, H)
      const txt = r.ok ? await r.text() : ''
      const items = !r.ok ? [] : f.type === 'boamp' ? parseBoamp(txt) : parseFeed(txt)
      report.push({ source: f.name, status: r.status, items: items.length })
      items.forEach(i => out.push({ ...i, source: f.name }))
    } catch (e) { report.push({ source: f.name, error: e.message }) }
  }
  return { items: out, report }
}
const normName = (s) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9 ]/g, ' ').replace(/\b(SARL|SAS|SA|EURL|EARL|SCEA|GAEC|SCI|ETS|ETABLISSEMENTS|ENTREPRISE|SOCIETE|GROUPE|ET FILS|FRERES|CIE|COMPAGNIE)\b/g, ' ').replace(/\s+/g, ' ').trim()
async function veille(env, { dryRun = false, maxPistesArticles = 40, days = 0 } = {}) {
  const { items, report } = await fetchFeeds(null, days)
  const out = { report, articles: items.length, mentions: 0, pistes: 0, errors: [], tokens: 0 }
  if (!items.length) return out
  const since = new Date(Date.now() - Math.max(3, days) * 86400000)
  const recent = items.filter(i => { const d = i.date ? new Date(i.date) : null; return !d || isNaN(d) || d >= since })
  const existing = await sbAll(env, 'ia_veille?select=url,kind,enterprise_id,company_name')
  const seen = new Set(existing.map(v => `${v.kind}|${v.url}|${v.enterprise_id || v.company_name || ''}`))
  const ents = await sbAll(env, 'enterprises?select=id,name,city,department,status')
  // index : nom normalisé (≥ 6 caractères, ≥ 2 mots ou 1 mot rare) → entreprise
  const index = ents.map(e => ({ e, key: normName(e.name) })).filter(x => x.key.length >= 6 && !/^(MAIRIE|COMMUNE|VILLE|SCI)\b/.test(x.key))
  // ---- mentions ----
  for (const it of recent) {
    const text = normName(`${it.title} ${it.desc}`)
    for (const { e, key } of index) {
      if (!text.includes(` ${key} `) && !text.startsWith(key + ' ') && !text.endsWith(' ' + key) && text !== key) continue
      const k = `mention|${it.link}|${e.id}`; if (seen.has(k)) continue
      seen.add(k)
      if (dryRun) { out.mentions++; continue }
      try {
        const { result, model, usage } = await askClaude(env, 'veille_mention', `Entreprise de notre base : ${e.name} (${e.city || '?'}, ${e.department || '?'})\nArticle (${it.source}) : ${it.title}\n${it.desc}\nURL : ${it.link}`)
        out.tokens += (usage?.input_tokens || 0) + (usage?.output_tokens || 0)
        if (!result.match) continue
        await sb(env, 'ia_veille', { method: 'POST', headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' }, body: JSON.stringify({ kind: 'mention', enterprise_id: e.id, company_name: e.name, city: e.city, department: e.department || result.department || null, title: it.title, url: it.link, source: it.source, published_at: it.date && !isNaN(new Date(it.date)) ? new Date(it.date).toISOString().slice(0, 10) : null, summary: String(result.summary || '').slice(0, 500), model }) })
        out.mentions++
      } catch (err) { out.errors.push(`${e.name}: ${err.message}`) }
    }
  }
  // ---- pistes : articles récents non traités, par lots de 15 ----
  // articles déjà analysés pour les pistes (qu'ils aient donné quelque chose ou non)
  const vu = new Set((await sbAll(env, 'ia_veille_vu?select=url')).map(v => v.url))
  const isBoampAppel = (i) => /BOAMP/i.test(i.source) && !/attribution|r[ée]sultat/i.test(i.title)
  const cands = recent.filter(i => !vu.has(i.link) && (days === 0 || !isBoampAppel(i))).slice(0, days > 0 ? 400 : maxPistesArticles)
  if (dryRun) { out.pistesCandidats = cands.length; return out }
  const nameKeys = new Set(index.map(x => x.key))
  for (let i = 0; i < cands.length; i += 15) {
    const lot = cands.slice(i, i + 15)
    const ctx = lot.map((a, n) => `[${n + 1}] (${a.source}) ${a.title} — ${a.desc.slice(0, 300)}`).join('\n')
    try {
      const { result, model, usage } = await askClaude(env, 'veille_pistes', ctx)
      out.tokens += (usage?.input_tokens || 0) + (usage?.output_tokens || 0)
      for (const p of (result.pistes || [])) {
        const a = lot[(+p.article || 0) - 1]; if (!a || !p.company) continue
        if (nameKeys.has(normName(p.company))) continue // déjà en base
        const k = `piste|${a.link}|${p.company}`; if (seen.has(k)) continue; seen.add(k)
        await sb(env, 'ia_veille', { method: 'POST', headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' }, body: JSON.stringify({ kind: 'piste', company_name: String(p.company).slice(0, 120), city: p.city || null, department: ['67', '68'].includes(String(p.department)) ? String(p.department) : null, title: a.title, url: a.link, source: a.source, published_at: a.date && !isNaN(new Date(a.date)) ? new Date(a.date).toISOString().slice(0, 10) : null, why: String(p.why || '').slice(0, 300), model }) })
        out.pistes++
      }
      // marquer le lot comme analysé
      await sb(env, 'ia_veille_vu', { method: 'POST', headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' }, body: JSON.stringify(lot.map(a => ({ url: a.link }))) })
    } catch (err) { out.errors.push(`pistes lot ${i / 15 + 1}: ${err.message}`) }
  }
  return out
}

// ---------- Suggestions du jour (par commercial) ----------
const HIDDEN_EMAILS = ['ymonteiro@hotmail.com', 'solo6782@gmail.com']
async function dailySuggestions(env, { date, force = [] } = {}) {
  const today = date || new Date().toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' })
  const [profiles, ents, scores, acts] = await Promise.all([
    sbAll(env, `profiles?select=id,full_name,email,role,is_active&is_active=eq.true`),
    sbAll(env, `enterprises?select=id,name,city,assigned_to,description_activite,a_relancer&status=eq.prospect`),
    sbAll(env, `ia_scores?select=enterprise_id,score,reason`),
    sbAll(env, `actions?select=enterprise_id,performed_at,result,next_action,next_action_date,comments&order=performed_at.desc`),
  ])
  const scoreBy = Object.fromEntries(scores.map(s => [s.enterprise_id, s]))
  const last = {}
  acts.forEach(a => { if (!last[a.enterprise_id]) last[a.enterprise_id] = a })
  const out = { date: today, commercials: 0, suggestions: 0, errors: [], tokens: 0 }
  const targets = profiles.filter(p => !HIDDEN_EMAILS.includes((p.email || '').toLowerCase()) && (!force.length || force.includes(p.id)))
  for (const p of targets) {
    const mine = ents.filter(e => e.assigned_to === p.id)
    if (!mine.length) continue
    const ids = mine.map(e => e.id)
    const cands = mine.map(e => ({ e, sc: scoreBy[e.id], la: last[e.id] }))
      .filter(c => c.la && c.la.result !== 'Refus' && c.sc && c.sc.score >= 3)
      .sort((a, b) => (b.sc?.score || 0) - (a.sc?.score || 0) || (a.la.next_action_date || '9') .localeCompare(b.la.next_action_date || '9'))
      .slice(0, 40)
    if (!cands.length) continue
    out.commercials++
    const ctx = cands.map(c => `id=${c.e.id} | ${c.e.name} (${c.e.city || '?'})${c.e.description_activite ? ` — ${c.e.description_activite}` : ''} | chaleur ${c.sc?.score ?? '?'}/5 : ${c.sc?.reason || '—'} | dernier contact ${fmtFR(c.la.performed_at)} (${c.la.result || '?'})${c.la.next_action_date ? ` | relance prévue ${fmtFR(c.la.next_action_date)}${c.la.next_action ? ` (${c.la.next_action})` : ''}` : ''}${c.e.a_relancer ? ' | drapeau à relancer' : ''} | commentaire : ${(c.la.comments || '').replace(/\n+/g, ' / ').slice(0, 220)}`).join('\n')
    try {
      const { result, model, usage } = await askClaude(env, 'daily', `Commercial : ${p.full_name}\nProspects suivis :\n${ctx}`, 12000)
      const picks = (result.picks || []).filter(x => ids.includes(x.id)).slice(0, 15)
      await sb(env, `ia_suggestions?date=eq.${today}&profile_id=eq.${p.id}&kind=eq.jour`, { method: 'DELETE' })
      if (picks.length) await sb(env, 'ia_suggestions', { method: 'POST', body: JSON.stringify(picks.map((x, i) => ({ date: today, kind: 'jour', profile_id: p.id, enterprise_id: x.id, rank: i + 1, suggested_action: String(x.action || '').slice(0, 60), reason: String(x.why || '').slice(0, 300), model }))) })
      out.suggestions += picks.length; out.tokens += (usage?.input_tokens || 0) + (usage?.output_tokens || 0)
    } catch (err) { out.errors.push(`${p.full_name}: ${err.message}`) }
  }
  return out
}

// ---------- Relances suggérées des « Sans suite » et « Refus » ----------
async function reopenSuggestions(env, { date } = {}) {
  const today = date || new Date().toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' })
  const [ents, acts, presse, prior] = await Promise.all([
    sbAll(env, `enterprises?select=id,name,city,department,assigned_to,description_activite&status=eq.prospect`),
    sbAll(env, `actions?select=enterprise_id,performed_at,result,comments&order=performed_at.desc`),
    sbAll(env, `ia_veille?select=enterprise_id,title,summary,published_at,created_at&kind=eq.mention`),
    sbAll(env, `ia_suggestions?select=enterprise_id,date&kind=in.(sans_suite,refus)`),
  ])
  const last = {}; acts.forEach(a => { if (!last[a.enterprise_id]) last[a.enterprise_id] = a })
  const pressBy = {}; presse.forEach(p => { (pressBy[p.enterprise_id] = pressBy[p.enterprise_id] || []).push(p) })
  const cutoff30 = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
  const recentlySuggested = new Set(prior.filter(s => s.date >= cutoff30).map(s => s.enterprise_id))
  const cutoff60 = new Date(Date.now() - 60 * 86400000).toISOString()
  const cutoffPress = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
  const NEVER = /ne plus (re)?contacter|ne pas (re)?contacter|cessation|retraite|ferm[ée]e?|liquidation|hébergée sur place/i
  const out = { date: today, sans_suite: 0, refus: 0, errors: [], tokens: 0 }
  for (const [kind, label] of [['sans_suite', 'Sans suite'], ['refus', 'Refus']]) {
    const cands = ents.map(e => ({ e, la: last[e.id], press: (pressBy[e.id] || []).filter(p => (p.published_at || p.created_at.slice(0, 10)) >= cutoffPress) }))
      .filter(c => c.la && c.la.result === label && !recentlySuggested.has(c.e.id) && !NEVER.test(c.la.comments || '') && (c.la.comments || '').trim().length > 10 && (c.la.performed_at < cutoff60 || c.press.length))
      // priorité : actu récente, puis mots-clés de condition/temporalité, puis ancienneté
      .map(c => { const t = (c.la.comments || '').toLowerCase(); const cond = /(pour l'instant|pour le moment|actuellement|jusqu'|après |avant |rappeler|recontacter|reprendre|en 202|saison|vendange|chantier|report|agence|arrêt|absent|changement|direction|vente|complet)/.test(t) ? 1 : 0; return { ...c, score: (c.press.length ? 3 : 0) + cond } })
      .sort((a, b) => b.score - a.score || a.la.performed_at.localeCompare(b.la.performed_at)).slice(0, 60)
    if (!cands.length) continue
    const ctx = cands.map(c => `id=${c.e.id} | ${c.e.name} (${c.e.city || '?'})${c.e.description_activite ? ` — ${c.e.description_activite}` : ''} | dernier contact ${fmtFR(c.la.performed_at)} (${label}) : ${(c.la.comments || '').replace(/\n+/g, ' / ').slice(0, 260)}${c.press.length ? ` | ACTU : ${c.press.map(p => `${fmtFR(p.published_at || p.created_at)} ${p.title}${p.summary ? ' — ' + p.summary : ''}`).join(' ; ').slice(0, 300)}` : ''}`).join('\n')
    try {
      const system = SYSTEM.reopen.replace('{{KIND}}', label)
      const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' }, body: JSON.stringify({ model: env.MODEL || DEFAULT_MODEL, max_tokens: 2000, system: system.replace(/\{\{TODAY\}\}/g, today), messages: [{ role: 'user', content: ctx }] }) })
      const body = await r.text(); let data = {}; try { data = JSON.parse(body) } catch { throw new Error(`API ${r.status} : ${body.slice(0, 120)}`) }
      if (!r.ok) throw new Error(data?.error?.message || `API ${r.status}`)
      const raw = (data.content || []).filter(c => c.type === 'text').map(c => c.text).join('').trim()
      const result = parsePicks(raw)
      const byId = Object.fromEntries(cands.map(c => [c.e.id, c]))
      const picks = (result.picks || []).filter(x => byId[x.id]).slice(0, 5)
      if (picks.length) await sb(env, `ia_suggestions?date=eq.${today}&kind=eq.${kind}`, { method: 'DELETE' })
      if (picks.length) await sb(env, 'ia_suggestions', { method: 'POST', body: JSON.stringify(picks.map((x, i) => ({ date: today, kind, profile_id: byId[x.id].e.assigned_to, enterprise_id: x.id, rank: i + 1, suggested_action: String(x.action || '').slice(0, 60), reason: String(x.why || '').slice(0, 300), model: data.model }))) })
      out[kind] = picks.length; out.tokens += (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0)
    } catch (err) { out.errors.push(`${label}: ${err.message}`) }
  }
  return out
}

// ---------- Urgence des relances en retard ----------
async function urgenceRelances(env, { force = false } = {}) {
  const today = new Date().toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' })
  const [ents, acts, scores, presse, prev, logs] = await Promise.all([
    sbAll(env, `enterprises?select=id,name,city,assigned_to,description_activite,proposition_envoyee_at`),
    sbAll(env, `actions?select=enterprise_id,performed_at,result,next_action,next_action_date,comments&order=performed_at.desc`),
    sbAll(env, `ia_scores?select=enterprise_id,score,reason`),
    sbAll(env, `ia_veille?select=enterprise_id,title,summary,published_at,created_at&kind=eq.mention`),
    sbAll(env, `ia_urgences?select=enterprise_id,computed_at`),
    sbAll(env, `activity_log?select=target_id,created_at&target_type=eq.enterprise&created_at=gte.${new Date(Date.now() - 8 * 86400000).toISOString()}`),
  ])
  const last = {}; acts.forEach(a => { if (!last[a.enterprise_id]) last[a.enterprise_id] = a })
  const scoreBy = Object.fromEntries(scores.map(s => [s.enterprise_id, s]))
  const pressBy = {}; presse.forEach(p => { (pressBy[p.enterprise_id] = pressBy[p.enterprise_id] || []).push(p) })
  const prevBy = Object.fromEntries(prev.map(p => [p.enterprise_id, p.computed_at]))
  const touched = new Set(logs.map(l => l.target_id))
  const week = new Date(Date.now() - 7 * 86400000).toISOString()
  const late = ents.map(e => ({ e, la: last[e.id] })).filter(c => c.la && c.la.result === 'À relancer' && c.la.next_action_date)
  const todo = late.filter(c => force || !prevBy[c.e.id] || prevBy[c.e.id] < week || touched.has(c.e.id) || (c.la.performed_at > prevBy[c.e.id]))
  const out = { total_relances: late.length, analysed: 0, errors: [], tokens: 0 }
  const days = (d) => Math.round((new Date(today) - new Date(d)) / 86400000)
  for (let i = 0; i < todo.length; i += 20) {
    const lot = todo.slice(i, i + 20)
    const ctx = lot.map(c => { const sc = scoreBy[c.e.id]; const pr = (pressBy[c.e.id] || []).slice(0, 2); return `id=${c.e.id} | ${c.e.name} (${c.e.city || '?'})${c.e.description_activite ? ` — ${c.e.description_activite}` : ''} | chaleur ${sc?.score ?? '?'}/5${sc ? ` : ${sc.reason}` : ''} | relance prévue le ${fmtFR(c.la.next_action_date)} (${c.la.next_action || 'relance'})${days(c.la.next_action_date) > 0 ? ` — EN RETARD de ${days(c.la.next_action_date)} j` : days(c.la.next_action_date) === 0 ? " — AUJOURD'HUI" : ` — dans ${-days(c.la.next_action_date)} j`}${c.e.proposition_envoyee_at ? ` | proposition envoyée le ${fmtFR(c.e.proposition_envoyee_at)}` : ''} | dernier contact ${fmtFR(c.la.performed_at)} : ${(c.la.comments || '').replace(/\n+/g, ' / ').slice(0, 220)}${pr.length ? ` | ACTU : ${pr.map(p => p.title + (p.summary ? ' — ' + p.summary : '')).join(' ; ').slice(0, 250)}` : ''}` }).join('\n')
    try {
      const { result, model, usage } = await askClaude(env, 'urgence', ctx, 6000)
      out.tokens += (usage?.input_tokens || 0) + (usage?.output_tokens || 0)
      const byId = new Set(lot.map(c => c.e.id))
      const ACTIONS = ['Appeler', 'Envoyer un mail', 'Passer sur site', 'Envoyer des candidatures', 'Envoyer une proposition']
      const rows = (result.items || []).filter(x => byId.has(x.id)).map(x => ({ enterprise_id: x.id, level: Math.max(0, Math.min(3, Math.round(Number(x.level)))), suggested_action: ACTIONS.includes(x.action) ? x.action : 'Appeler', reason: String(x.why || '').slice(0, 200), model, computed_at: new Date().toISOString() }))
      if (rows.length) await sb(env, 'ia_urgences', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(rows) })
      out.analysed += rows.length
    } catch (err) { out.errors.push(`lot ${i / 20 + 1}: ${err.message}`) }
  }
  // purge : entreprises qui ne sont plus en retard
  const lateIds = new Set(late.map(c => c.e.id))
  const stale = prev.filter(p => !lateIds.has(p.enterprise_id)).map(p => p.enterprise_id)
  for (let i = 0; i < stale.length; i += 100) await sb(env, `ia_urgences?enterprise_id=in.(${stale.slice(i, i + 100).join(',')})`, { method: 'DELETE' })
  out.purged = stale.length
  return out
}

export default {
  // Déclencheur planifié (Cloudflare → Settings → Triggers → Cron) : notation des fiches modifiées dans la journée
  async scheduled(event, env, ctx) {
    ctx.waitUntil((async () => {
      const r1 = await nightlyScoring(env); console.log('Notation nocturne :', JSON.stringify(r1))
      const r2 = await dailySuggestions(env); console.log('Suggestions du jour :', JSON.stringify(r2))
      const r3 = await veille(env); console.log('Veille presse :', JSON.stringify(r3))
      const r4 = await reopenSuggestions(env); console.log('Relances sans suite / refus :', JSON.stringify(r4))
      const r5 = await urgenceRelances(env); console.log('Urgence des relances :', JSON.stringify(r5))
    })())
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
    if (['/veille', '/veille-test'].includes(new URL(request.url).pathname)) {
      let b = {}; try { b = await request.json() } catch { /* vide */ }
      if (!env.CRON_SECRET || b.secret !== env.CRON_SECRET) return new Response(JSON.stringify({ error: 'Non autorisé' }), { status: 401, headers })
      try { return new Response(JSON.stringify(await veille(env, { dryRun: new URL(request.url).pathname === '/veille-test', days: Number(b.days) || 0 })), { status: 200, headers }) }
      catch (err) { return new Response(JSON.stringify({ error: err.message }), { status: 500, headers }) }
    }
    if (new URL(request.url).pathname === '/urgence') {
      let b = {}; try { b = await request.json() } catch { /* vide */ }
      if (!env.CRON_SECRET || b.secret !== env.CRON_SECRET) return new Response(JSON.stringify({ error: 'Non autorisé' }), { status: 401, headers })
      try { return new Response(JSON.stringify(await urgenceRelances(env, { force: !!b.force })), { status: 200, headers }) }
      catch (err) { return new Response(JSON.stringify({ error: err.message }), { status: 500, headers }) }
    }
    if (new URL(request.url).pathname === '/reopen') {
      let b = {}; try { b = await request.json() } catch { /* vide */ }
      if (!env.CRON_SECRET || b.secret !== env.CRON_SECRET) return new Response(JSON.stringify({ error: 'Non autorisé' }), { status: 401, headers })
      try { return new Response(JSON.stringify(await reopenSuggestions(env, { date: b.date })), { status: 200, headers }) }
      catch (err) { return new Response(JSON.stringify({ error: err.message }), { status: 500, headers }) }
    }
    if (new URL(request.url).pathname === '/daily') {
      let b = {}; try { b = await request.json() } catch { /* vide */ }
      if (!env.CRON_SECRET || b.secret !== env.CRON_SECRET) return new Response(JSON.stringify({ error: 'Non autorisé' }), { status: 401, headers })
      try { return new Response(JSON.stringify(await dailySuggestions(env, { date: b.date, force: b.force || [] })), { status: 200, headers }) }
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
