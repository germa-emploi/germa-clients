import { Sparkles, Mail, ClipboardList, Flame, CalendarClock, Trophy, Send } from 'lucide-react'

// Page de présentation, pensée pour une démo en direct : quoi, où, pour quoi faire.
const ITEMS = [
  { icon: Flame, title: 'Score de chaleur', where: 'Fiche prospect · liste des prospects · relances',
    what: 'Chaque prospect est noté de 1 à 5 flammes, avec la raison en une phrase. Le score est recalculé chaque nuit sur les fiches qui ont bougé.',
    why: 'Voir d\'un coup d\'œil où concentrer l\'effort commercial.' },
  { icon: Trophy, title: 'Priorités de la semaine', where: 'Tableau de bord',
    what: 'Les 15 prospects les plus chauds, avec la raison et un bouton pour ouvrir la fiche — y compris ceux qui n\'ont aucune relance planifiée.',
    why: 'Ne plus oublier un dossier tiède faute de date dans l\'agenda.' },
  { icon: Mail, title: 'Rédiger un e-mail', where: 'Fiche entreprise',
    what: 'Un brouillon de relance ou de premier contact, écrit à partir de l\'historique de la fiche. Modifiable, puis copié ou ouvert dans Outlook.',
    why: 'Un mail personnalisé en 10 secondes au lieu de 5 minutes.' },
  { icon: ClipboardList, title: 'Brief avant l\'appel', where: 'Fiche entreprise',
    what: 'Résumé en cinq points : qui est l\'interlocuteur, où en est la relation, ce qu\'il faut savoir, l\'angle conseillé, les questions à poser.',
    why: 'Reprendre un dossier de dix actions en 30 secondes.' },
  { icon: CalendarClock, title: 'Date de relance suggérée', where: 'Nouvelle action « À relancer »',
    what: 'D\'après le commentaire saisi (« rappeler jeudi », « pas de besoin avant novembre »), l\'assistant propose la date et le type de relance. Le commercial garde la main.',
    why: 'Des relances planifiées systématiquement, sans calcul de date.' },
  { icon: Send, title: 'Copier les e-mails', where: 'Listes prospects et clients — déjà en prod',
    what: 'Sélection des adresses de la liste filtrée (fiche et interlocuteurs), copiées d\'un clic pour un mailing en Cci.',
    why: 'Fini les tableaux Excel pour les campagnes de mails.' },
]

export default function NouveautesDemo() {
  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div>
        <h1 className="font-display font-bold text-2xl text-gray-900 flex items-center gap-2"><Sparkles className="text-violet-600" size={24} /> Nouveautés de la démo</h1>
        <p className="text-gray-500 text-sm mt-1">Ce que l'assistant IA apporte à GermaClients. Tout le reste est identique à la prod.</p>
      </div>
      <div className="grid gap-4">
        {ITEMS.map(it => (
          <div key={it.title} className="card p-5 flex gap-4">
            <div className="w-11 h-11 rounded-xl bg-violet-50 text-violet-700 flex items-center justify-center flex-shrink-0"><it.icon size={22} /></div>
            <div className="min-w-0">
              <h2 className="font-display font-semibold text-gray-900 text-lg">{it.title}</h2>
              <p className="text-xs text-violet-700 font-medium mt-0.5">{it.where}</p>
              <p className="text-sm text-gray-700 mt-2">{it.what}</p>
              <p className="text-sm text-gray-500 mt-1 italic">→ {it.why}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="card p-5 bg-violet-50 border-violet-200 text-sm text-violet-900">
        Coût de l'assistant : quelques euros par mois pour toute l'équipe. Les données restent dans la base GERMA ; seul le contexte de la fiche consultée est envoyé à l'IA, au moment de la demande.
      </div>
    </div>
  )
}
