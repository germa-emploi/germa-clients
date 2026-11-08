import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { 
  LayoutDashboard, Building2, Shield, LogOut, Menu, X, ChevronRight, UserCheck,
  History, Sparkles, Newspaper, FileText, ListChecks, Users, Calculator, BarChart3, Eye, User
} from 'lucide-react'
import { VersionBadge, ChangelogModal } from './ChangelogModal'
import { supabase } from '../lib/supabase'
import { isHiddenAccount } from '../utils/constants'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Tableau de bord', end: true },
  { to: '/graphiques', icon: BarChart3, label: 'Graphiques' },
  { to: '/prospects', icon: Building2, label: 'Prospects' },
  { to: '/clients', icon: UserCheck, label: 'Clients' },
  { to: '/historique', icon: History, label: 'Historique' },
  { to: '/calcul-marge', icon: Calculator, label: 'Calcul de marge' },
  { to: '/presse', icon: Newspaper, label: 'Presse & actus' },
  { to: '/nouveautes-demo', icon: Sparkles, label: 'Nouveautés démo' },
]

const adminItems = [
  { to: '/rapport-mensuel', icon: FileText, label: 'Rapport mensuel' },
  { to: '/reunion-commerciale', icon: Users, label: 'Réunion commerciale' },
  { to: '/revision-base', icon: ListChecks, label: 'Révision de la base' },
  { to: '/admin', icon: Shield, label: 'Administration' },
]

function NavItem({ to, icon: Icon, label, end, onClick }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
          isActive
            ? 'bg-germa-700 text-white shadow-md shadow-germa-700/20'
            : 'text-germa-800 hover:bg-germa-100'
        }`
      }
    >
      <Icon size={18} />
      <span>{label}</span>
    </NavLink>
  )
}

export default function Layout() {
  const { profile, signOut, isDirection, mirror, realIsDirection, viewAs, setViewAs } = useAuth()
  const [vueCommerciaux, setVueCommerciaux] = useState([])
  const [choixCommercial, setChoixCommercial] = useState(false)
  const [vueOuverte, setVueOuverte] = useState(false)
  useEffect(() => {
    if (!realIsDirection) return
    supabase.from('profiles').select('id, full_name, email, role, is_active').eq('is_active', true).eq('role', 'commercial')
      .then(({ data }) => setVueCommerciaux((data || []).filter(p => !isHiddenAccount(p)).sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''))))
  }, [realIsDirection])
  const choisirVue = (id) => { const p = vueCommerciaux.find(x => x.id === id); if (p) { setViewAs({ id: p.id, full_name: p.full_name }); setChoixCommercial(false); setVueOuverte(false); navigate('/') } }
  const vueDirection = () => { setViewAs(null); setChoixCommercial(false); setVueOuverte(false); navigate('/') }
  const [mobileOpen, setMobileOpen] = useState(false)
  const [showChangelog, setShowChangelog] = useState(false)
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login', { replace: true })
  }

  const allNavItems = isDirection ? [...navItems, ...adminItems] : navItems
  // Encart « Actions du jour » (direction) : un bouton par commercial actif
  const [commercials, setCommercials] = useState([])
  useEffect(() => {
    if (!isDirection) return
    supabase.from('profiles').select('id, full_name, email, role, is_active').eq('is_active', true).eq('role', 'commercial').order('full_name')
      .then(({ data }) => setCommercials((data || []).filter(p => !isHiddenAccount(p))))
  }, [isDirection])
  const DailyBox = ({ onClick }) => isDirection && commercials.length > 0 ? (
    <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-800 mb-2">Actions du jour</p>
      <div className="flex flex-col gap-1">
        {commercials.map(c => (
          <NavLink key={c.id} to={`/actions-du-jour/${c.id}`} onClick={onClick} className={({ isActive }) => `text-sm px-2.5 py-1.5 rounded-lg transition-colors ${isActive ? 'bg-amber-600 text-white' : 'text-amber-900 hover:bg-amber-100'}`}>
            {c.full_name}
          </NavLink>
        ))}
      </div>
    </div>
  ) : null

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Desktop sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow min-h-0 bg-violet-50 border-r-4 border-violet-400 px-4 py-6">
          {/* Logo */}
          <div className="flex flex-col items-center px-3 mb-5 flex-shrink-0">
            <div className="flex items-center gap-2 mb-3">
              <img src="/logo_etti.jpg" alt="GERMA ETTI" className="w-16 h-auto rounded-lg bg-white shadow-sm p-0.5" />
              <img src="/logo_ai.jpg" alt="GERMA AI" className="w-16 h-auto rounded-lg bg-white shadow-sm p-0.5" />
            </div>
            <h1 className="font-display font-bold text-germa-900 text-lg leading-tight">GermaClients</h1>
            <p className="text-[10px] text-germa-600 uppercase tracking-widest font-medium">Activité Commerciale</p>
            <div className="mt-3 w-full rounded-xl bg-violet-50 border border-violet-200 text-violet-800 text-[11px] px-3 py-2 leading-snug">
              <span className="font-semibold">🧪 Environnement de démo</span> — copie en lecture seule de la vraie base : rien de ce que vous saisissez n'est enregistré. Les fonctions ✨ sont réelles (Worker IA).
            </div>
          </div>

          {/* Nav : défile seule si l'écran est trop petit, logo et profil restent visibles */}
          <nav className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-1 -mx-1 px-1">
            {allNavItems.map(item => (
              <NavItem key={item.to} {...item} />
            ))}
            <DailyBox />
          </nav>

        </div>
      </aside>

      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-violet-50 border-b-4 border-violet-400 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img src="/logo_etti.jpg" alt="GERMA ETTI" className="h-9 rounded-lg bg-white shadow-sm p-0.5" />
          <img src="/logo_ai.jpg" alt="GERMA AI" className="h-9 rounded-lg bg-white shadow-sm p-0.5" />
          <span className="font-display font-bold text-germa-900 text-lg">GermaClients</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setChoixCommercial(!!viewAs); setVueOuverte(v => !v) }} className={`flex w-9 h-9 rounded-full items-center justify-center border transition-colors ${viewAs ? 'bg-sky-600 border-sky-600 text-white' : 'bg-white border-gray-200 text-gray-600'}`}><User size={17} /></button>
          <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        </div>
      </div>

      {/* Mobile menu overlay */}
      {mobileOpen && (
        <>
          <div className="lg:hidden fixed inset-0 z-40 bg-black/30" onClick={() => setMobileOpen(false)} />
          <div className="lg:hidden fixed top-14 right-0 z-50 w-64 bg-white border-l border-gray-100 shadow-xl rounded-bl-2xl p-4 flex flex-col gap-1 animate-in">
            {allNavItems.map(item => (
              <NavItem key={item.to} {...item} onClick={() => setMobileOpen(false)} />
            ))}
            <DailyBox onClick={() => setMobileOpen(false)} />
            <hr className="my-2 border-gray-100" />
            <div className="flex items-center gap-3 px-3 py-2">
              <div className="w-7 h-7 rounded-full bg-germa-100 flex items-center justify-center">
                <span className="text-germa-700 font-bold text-xs">
                  {profile?.full_name?.charAt(0)?.toUpperCase() || '?'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{profile?.full_name}</p>
                <p className="text-xs text-gray-500 capitalize">{profile?.role}</p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-colors"
            >
              <LogOut size={16} />
              <span>Déconnexion</span>
            </button>
          </div>
        </>
      )}

      {/* Main content */}
      <button onClick={() => { setChoixCommercial(!!viewAs); setVueOuverte(v => !v) }} title={viewAs ? `Vue Commercial — ${viewAs.full_name}` : profile?.full_name} className={`hidden lg:flex fixed top-12 right-6 z-40 w-10 h-10 rounded-full items-center justify-center border shadow-sm transition-colors ${viewAs ? 'bg-sky-600 border-sky-600 text-white hover:bg-sky-700' : 'bg-white border-gray-200 text-gray-600 hover:text-germa-700 hover:border-germa-300'}`}><User size={18} /></button>
      {vueOuverte && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setVueOuverte(false)} />
          <div className="fixed top-16 lg:top-24 right-4 lg:right-6 z-50 w-72 bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-germa-100 flex items-center justify-center"><span className="text-germa-700 font-bold text-sm">{profile?.full_name?.charAt(0)?.toUpperCase() || '?'}</span></div>
              <div className="min-w-0"><p className="text-sm font-medium text-gray-900 truncate">{profile?.full_name}</p><p className="text-xs text-gray-500 capitalize">{profile?.role}{mirror ? ` · miroir de ${mirror.nom}` : ''}</p></div>
            </div>
            {realIsDirection && (
              <div className="pt-3 border-t border-gray-100">
                <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-1.5">Vue</p>
                <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-medium">
                  <button onClick={vueDirection} className={`flex-1 py-1.5 ${!viewAs && !choixCommercial ? 'bg-germa-700 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>Direction</button>
                  <button onClick={() => setChoixCommercial(true)} className={`flex-1 py-1.5 ${viewAs || choixCommercial ? 'bg-sky-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>Commercial</button>
                </div>
                {(viewAs || choixCommercial) && (
                  <select value={viewAs?.id || ''} onChange={e => choisirVue(e.target.value)} className="select-field text-xs mt-2 w-full">
                    <option value="" disabled>Choisir un commercial…</option>
                    {vueCommerciaux.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                  </select>
                )}
              </div>
            )}
            <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
              <button onClick={handleSignOut} className="flex items-center gap-2 px-2 py-1.5 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><LogOut size={16} /> Déconnexion</button>
              <VersionBadge onClick={() => { setVueOuverte(false); setShowChangelog(true) }} className="text-gray-400 hover:text-germa-700 hover:bg-germa-50" />
            </div>
          </div>
        </>
      )}
      <main className="lg:pl-64 pt-16 lg:pt-0">
        <div className="sticky top-16 lg:top-0 z-30 bg-violet-600 text-white text-xs sm:text-sm font-semibold text-center py-2 px-3 tracking-wide shadow-md">
          🧪 ENVIRONNEMENT DE DÉMO — lecture seule, rien n'est enregistré · prod : germa-clients.pages.dev
        </div>
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
          {viewAs && <div className="mb-4 text-sm bg-sky-50 border border-sky-200 text-sky-900 rounded-xl px-3 py-2 flex items-center justify-between gap-3 flex-wrap"><span>👁️ <b>Vue Commercial — {viewAs.full_name}</b> <span className="text-xs text-sky-700">· vos saisies restent enregistrées à votre nom</span></span><button onClick={vueDirection} className="text-xs font-medium text-sky-800 underline hover:text-sky-950">Revenir à la vue Direction</button></div>}
          {mirror && <div className="mb-4 text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-3 py-2">Compte de test — affichage identique à celui de <b>{mirror.nom}</b>. Ce que vous saisissez reste enregistré à votre nom.</div>}
          <Outlet />
        </div>
      </main>

      {showChangelog && <ChangelogModal onClose={() => setShowChangelog(false)} />}
    </div>
  )
}
