import { CHANGELOG, APP_DISPLAY_VERSION } from '../utils/changelog'
import { Sparkles } from 'lucide-react'

// Liste les évolutions propres à la démo (entrées "-démo" du changelog), hors reprises de la prod
export default function NouveautesDemo() {
  const demoEntries = CHANGELOG.filter(e => e.version.endsWith('-démo'))
  const prodVersion = CHANGELOG.find(e => !e.version.endsWith('-démo'))?.version
  const items = demoEntries.flatMap(e => e.changes.filter(c => !/^Reprend/i.test(c)).map(c => ({ v: e.version, date: e.date, text: c })))
  return (
    <div className="space-y-5 animate-fade-in max-w-3xl">
      <div>
        <h1 className="font-display font-bold text-2xl text-gray-900 flex items-center gap-2"><Sparkles className="text-violet-600" size={24} /> Nouveautés de la démo</h1>
        <p className="text-gray-500 text-sm mt-1">Ce que cette version ({APP_DISPLAY_VERSION}) apporte par rapport à la prod ({prodVersion}). Tout le reste est identique à la prod.</p>
      </div>
      <div className="card p-5 bg-violet-50 border-violet-200 text-sm text-violet-900">
        Les fonctions marquées ✨ appellent l'assistant IA (Claude, via le Worker <code>germaclients-ia</code>). Les autres sont des évolutions classiques proposées d'abord ici. Aucune saisie n'est enregistrée sur la démo.
      </div>
      <div className="card divide-y divide-gray-100">
        {items.map((it, i) => (
          <div key={i} className="px-5 py-3 flex items-start gap-3">
            <span className="flex-shrink-0 text-[11px] font-mono text-violet-700 bg-violet-100 rounded-md px-1.5 py-0.5 mt-0.5">{it.v.replace('-démo', '')}</span>
            <p className="text-sm text-gray-800">{it.text}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
