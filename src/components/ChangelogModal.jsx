import { X } from 'lucide-react'
import { APP_DISPLAY_VERSION, CHANGELOG } from '../utils/changelog'

export function VersionBadge({ onClick, className = '' }) {
  return (
    <button
      onClick={onClick}
      className={`text-xs font-mono px-2 py-0.5 rounded-lg transition-colors cursor-pointer ${className}`}
      title="Voir le changelog"
    >
      v{APP_DISPLAY_VERSION}
    </button>
  )
}

export function ChangelogModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-display font-semibold text-lg">Changelog</h2>
            <p className="text-xs text-gray-500">Historique des mises à jour</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
        </div>
        <div className="overflow-y-auto p-6 space-y-6">
          {CHANGELOG.map((release, i) => (
            <div key={release.version}>
              <div className="flex items-center gap-3 mb-3">
                <span className="font-mono font-bold text-germa-700 bg-germa-50 px-2.5 py-1 rounded-lg text-sm">
                  v{release.version}
                </span>
                <span className="text-xs text-gray-400">{new Date(release.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                {i === 0 && <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg">Actuelle</span>}
              </div>
              <ul className="space-y-1.5">
                {release.changes.map((change, j) => (
                  <li key={j} className="flex gap-2 text-sm text-gray-700">
                    <span className="text-germa-500 mt-0.5 flex-shrink-0">•</span>
                    <span>{change}</span>
                  </li>
                ))}
              </ul>
              {i < CHANGELOG.length - 1 && <div className="border-b border-gray-100 mt-5" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
