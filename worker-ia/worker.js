// ============================================================
// GermaClients — Worker "assistant IA"
// Reçoit le contexte d'une fiche depuis le site, interroge l'API Claude
// avec la clé stockée en secret (ANTHROPIC_API_KEY), renvoie le résultat.
// Variables : ANTHROPIC_API_KEY (secret), MODEL (optionnel), ALLOWED_ORIGINS (optionnel)
// ============================================================

const DEFAULT_MODEL = 'claude-sonnet-4-6'
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

export default {
  async fetch(request, env) {
    const allowed = (env.ALLOWED_ORIGINS ? env.ALLOWED_ORIGINS.split(',').map(s => s.trim()) : DEFAULT_ORIGINS)
    const origin = request.headers.get('Origin') || ''
    const headers = cors(origin, allowed)
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers })
    if (request.method !== 'POST') return new Response(JSON.stringify({ error: 'POST attendu' }), { status: 405, headers })
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
