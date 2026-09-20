export const ACTION_TYPES = ['Physique', 'Téléphonique', 'Mail', 'Courrier', 'Non défini']

export const CHANNELS = ['Physique', 'Téléphonique', 'Mail', 'Courrier']

export const MATURITIES = ['Froid', 'Tiède', 'Chaud']

export const RESULTS = ['À relancer', 'RDV pris', 'Refus', 'Sans suite', 'Signé']

// Libellés de prochaine action (liste fermée)
export const NEXT_ACTIONS = ['Relance téléphonique', 'Relance par mail', 'Visite', 'Envoi de candidats', 'Envoi de proposition', 'Autre']

export const DEPARTMENTS = ['67', '68']

export const STATUSES = ['prospect', 'client']

export const MATURITY_COLORS = {
  Froid: { bg: 'bg-sky-50', text: 'text-sky-700', dot: 'bg-sky-500' },
  Tiède: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  Chaud: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
}

export const RESULT_COLORS = {
  'À relancer': { bg: 'bg-blue-50', text: 'text-blue-700' },
  'RDV pris': { bg: 'bg-germa-100', text: 'text-germa-800' },
  'Refus': { bg: 'bg-red-50', text: 'text-red-700' },
  'Sans suite': { bg: 'bg-gray-100', text: 'text-gray-600' },
  'Signé': { bg: 'bg-emerald-50', text: 'text-emerald-700' },
}

export const STATUS_COLORS = {
  prospect: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Prospect' },
  client: { bg: 'bg-germa-100', text: 'text-germa-800', label: 'Client' },
}

export function formatDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function formatDateTime(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function timeAgo(dateStr) {
  if (!dateStr) return ''
  const now = new Date()
  const d = new Date(dateStr)
  const diff = Math.floor((now - d) / (1000 * 60 * 60 * 24))
  if (diff === 0) return "Aujourd'hui"
  if (diff === 1) return 'Hier'
  if (diff < 7) return `Il y a ${diff} jours`
  if (diff < 30) return `Il y a ${Math.floor(diff / 7)} sem.`
  return formatDate(dateStr)
}

// Comptes techniques masqués des listes d'utilisateurs et des statistiques (restent visibles dans la gestion des utilisateurs)
export const HIDDEN_ACCOUNT_EMAILS = ['ymonteiro@hotmail.com', 'solo6782@gmail.com']
export const isHiddenAccount = (p) => !!p && HIDDEN_ACCOUNT_EMAILS.includes((p.email || '').toLowerCase())

// Résultats d'action qui clôturent le suivi (retirent la relance et le drapeau "À relancer")
export const CLOSING_RESULTS = ['Sans suite', 'Refus', 'Signé']

// Date du jour au format AAAA-MM-JJ (heure locale)
export function toLocalDateISO(value) {
  const d = value ? new Date(value) : new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
export function todayISO() { return toLocalDateISO() }
// Construit le timestamp performed_at : si la date est aujourd'hui → maintenant ; sinon → midi ce jour-là (heure locale)
export function performedAtFromDate(dateStr, previous) {
  if (previous && toLocalDateISO(previous) === dateStr) return previous
  if (!dateStr || dateStr === todayISO()) return new Date().toISOString()
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d, 12, 0, 0).toISOString()
}
