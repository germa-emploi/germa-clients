import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { 
  LayoutDashboard, Building2, Shield, LogOut, Menu, X, ChevronRight, UserCheck
} from 'lucide-react'
import { VersionBadge, ChangelogModal } from './ChangelogModal'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Tableau de bord', end: true },
  { to: '/prospects', icon: Building2, label: 'Prospects' },
  { to: '/clients', icon: UserCheck, label: 'Clients' },
]

const adminItems = [
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
  const { profile, signOut, isDirection } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [showChangelog, setShowChangelog] = useState(false)
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login', { replace: true })
  }

  const allNavItems = isDirection ? [...navItems, ...adminItems] : navItems

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Desktop sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white border-r border-gray-100 px-4 py-6">
          {/* Logo */}
          <div className="flex flex-col items-center px-3 mb-8">
            <div className="flex items-center gap-2 mb-3">
              <img src="/logo_etti.jpg" alt="GERMA ETTI" className="w-16 h-auto rounded-lg bg-white shadow-sm p-0.5" />
              <img src="/logo_ai.jpg" alt="GERMA AI" className="w-16 h-auto rounded-lg bg-white shadow-sm p-0.5" />
            </div>
            <h1 className="font-display font-bold text-germa-900 text-lg leading-tight">GermaClients</h1>
            <p className="text-[10px] text-germa-600 uppercase tracking-widest font-medium">Activité Commerciale</p>
          </div>

          {/* Nav */}
          <nav className="flex-1 flex flex-col gap-1">
            {allNavItems.map(item => (
              <NavItem key={item.to} {...item} />
            ))}
          </nav>

          {/* User */}
          <div className="border-t border-gray-100 pt-4 mt-4">
            <div className="flex items-center gap-3 px-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-germa-100 flex items-center justify-center">
                <span className="text-germa-700 font-bold text-xs">
                  {profile?.full_name?.charAt(0)?.toUpperCase() || '?'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{profile?.full_name}</p>
                <p className="text-xs text-gray-500 capitalize">{profile?.role}</p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors w-full"
            >
              <LogOut size={16} />
              <span>Déconnexion</span>
            </button>
            <div className="mt-2 text-center">
              <VersionBadge onClick={() => setShowChangelog(true)} className="text-gray-400 hover:text-germa-700 hover:bg-germa-50" />
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img src="/logo_etti.jpg" alt="GERMA ETTI" className="h-9 rounded-lg bg-white shadow-sm p-0.5" />
          <img src="/logo_ai.jpg" alt="GERMA AI" className="h-9 rounded-lg bg-white shadow-sm p-0.5" />
          <span className="font-display font-bold text-germa-900 text-lg">GermaClients</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile menu overlay */}
      {mobileOpen && (
        <>
          <div className="lg:hidden fixed inset-0 z-40 bg-black/30" onClick={() => setMobileOpen(false)} />
          <div className="lg:hidden fixed top-14 right-0 z-50 w-64 bg-white border-l border-gray-100 shadow-xl rounded-bl-2xl p-4 flex flex-col gap-1 animate-in">
            {allNavItems.map(item => (
              <NavItem key={item.to} {...item} onClick={() => setMobileOpen(false)} />
            ))}
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
      <main className="lg:pl-64 pt-16 lg:pt-0">
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>

      {showChangelog && <ChangelogModal onClose={() => setShowChangelog(false)} />}
    </div>
  )
}
