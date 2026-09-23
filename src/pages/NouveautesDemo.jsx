import { Sparkles, Mail, ClipboardList, Flame, CalendarClock, Trophy, Newspaper } from 'lucide-react'

// Page de présentation, pensée pour une démo en direct : quoi, où, pour quoi faire.
const ITEMS = [
  { icon: Flame, title: 'Score de chaleur', where: 'Fiche prospect · liste des prospects · relances',
    what: 'Chaque prospect est noté de 1 à 5 flammes, avec la raison en une phrase. Le score est recalculé chaque nuit sur les fiches qui ont bougé.',
    why: 'Voir d\'un coup d\'œil où concentrer l\'effort commercial.', mois: '0,50 €', an: '6 €', base: '~170 fiches renotées par mois' },
  { icon: ClipboardList, title: 'Rapport mensuel', where: 'Menu direction',
    what: 'Le 1er de chaque mois, un rapport d\'activité commerciale prêt pour le comité de direction : synthèse, chiffres comparés au mois précédent, activité par commercial, secteurs et territoires, faits marquants, points d\'alerte et pistes. Les chiffres sont calculés par le serveur ; la direction peut ajouter des remarques et modifier elle-même les consignes de rédaction. Imprimable en PDF.',
    why: 'Une heure de préparation de comité économisée chaque mois.', mois: '0,05 €', an: '0,60 €', base: 'un rapport par mois, plus les régénérations' },
  { icon: Sparkles, title: 'Suggestions du jour', where: 'Tableau de bord, à droite des relances',
    what: 'Chaque nuit, l\'assistant choisit pour chaque commercial les 5 prospects à traiter le lendemain, avec l\'action conseillée et la raison.',
    why: 'Commencer la journée avec une liste courte plutôt qu\'une longue liste de relances.', mois: '1,70 €', an: '20 €', base: '2 commerciaux, un calcul par nuit' },
  { icon: CalendarClock, title: 'Conseil sur chaque relance', where: 'Tableau de bord (relances en retard et planifiées) · fiche prospect',
    what: 'Chaque nuit, l\'assistant classe les relances en Urgent / À faire / Peut attendre / À solder et conseille le moyen de relance (appeler, mail, passer sur site, envoyer des candidatures ou une proposition) d\'après le dernier commentaire, la chaleur, la proposition en cours et l\'actualité. Sur la fiche, un encart rappelle le conseil et le pourquoi.',
    why: 'Savoir par quoi commencer, comment relancer, et quoi clôturer.', mois: '1,50 €', an: '18 €', base: 'recalcul seulement si la fiche a bougé ou après 7 jours' },
  { icon: Trophy, title: 'Sans suite et refus à rouvrir', where: 'Tableau de bord, sous les suggestions du jour',
    what: 'Chaque nuit, l\'assistant repère parmi les « sans suite » et les « refus » ceux dont la raison ne tient plus : refus daté dont l\'échéance est passée, marché ou chantier annoncé dans la presse, agence concurrente en place depuis longtemps, saison qui approche, contact raté vieux de plus de deux mois. Jusqu\'à 5 par catégorie, avec le fait précis qui justifie la relance.',
    why: 'Récupérer des dossiers qu\'on croyait perdus, au bon moment.', mois: '0,90 €', an: '11 €', base: '2 analyses par nuit' },
  { icon: Newspaper, title: 'Presse & actus', where: 'Menu · fiche entreprise · tableau de bord',
    what: 'Chaque nuit, lecture de la presse régionale et des marchés publics : les articles qui citent une entreprise de la base sont rattachés à sa fiche avec un résumé et le lien ; les entreprises absentes de la base deviennent des pistes à valider (Créer le prospect / Ignorer).',
    why: 'Savoir avant l\'appel, et détecter les chantiers et marchés clausés avant les autres.', mois: '0,80 €', an: '10 €', base: 'flux gratuits, IA seulement sur les correspondances' },
  { icon: Mail, title: 'Rédiger un e-mail', where: 'Fiche entreprise',
    what: 'Un brouillon de relance ou de premier contact, écrit à partir de l\'historique de la fiche. Modifiable, puis copié ou ouvert dans Outlook.',
    why: 'Un mail personnalisé en 10 secondes au lieu de 5 minutes.', mois: '0,30 €', an: '3,50 €', base: '~60 mails par mois' },
  { icon: ClipboardList, title: 'Brief avant l\'appel', where: 'Fiche entreprise',
    what: 'Résumé en cinq points : qui est l\'interlocuteur, où en est la relation, ce qu\'il faut savoir, l\'angle conseillé, les questions à poser.',
    why: 'Reprendre un dossier de dix actions en 30 secondes.', mois: '0,30 €', an: '4 €', base: '~60 briefs par mois' },
  { icon: CalendarClock, title: 'Prochaine action suggérée', where: 'Nouvelle action « À relancer »',
    what: 'D\'après tout le contexte de la fiche et le commentaire saisi (« rappeler jeudi », « préfère un mail », « attend des CV »), l\'assistant propose le type de prochaine action et sa date. Le commercial garde la main.',
    why: 'Des relances planifiées systématiquement, sans calcul de date.', mois: '0,10 €', an: '1,20 €', base: '~80 relances par mois' },
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
            <div className="flex-shrink-0 text-right pl-2 border-l border-gray-100 min-w-[96px]">
              <p className="text-[11px] uppercase tracking-wide text-gray-400">Coût estimé</p>
              <p className="font-display font-semibold text-gray-900">{it.mois} <span className="text-xs font-normal text-gray-500">/ mois</span></p>
              <p className="text-sm text-gray-700">{it.an} <span className="text-xs text-gray-500">/ an</span></p>
              <p className="text-[11px] text-gray-400 mt-1">{it.base}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="card p-5 bg-violet-50 border-violet-200 text-sm text-violet-900 space-y-1">
        <p><span className="font-semibold">Total estimé : environ 6,50 € par mois, 75 € par an</span>, pour toute l'équipe — calculé sur l'activité réelle (150 actions par mois) et les consommations mesurées pendant la démo. Le budget peut être plafonné sur le compte API.</p>
        <p>Les données restent dans la base GERMA ; seul le contexte de la fiche concernée est envoyé à l'IA au moment du calcul, sans conservation de son côté.</p>
      </div>
    </div>
  )
}
