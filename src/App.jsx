import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Enterprises from './pages/Enterprises'
import EnterpriseDetail from './pages/EnterpriseDetail'
import Admin from './pages/Admin'
import ChangePassword from './pages/ChangePassword'
import ResetPassword from './pages/ResetPassword'

function ProtectedRoute({ children, adminOnly = false }) {
  const { user, profile, loading } = useAuth()
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-germa-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-germa-700 border-t-transparent rounded-full animate-spin" />
          <span className="text-germa-700 font-medium">Chargement…</span>
        </div>
      </div>
    )
  }
  
  if (!user || !profile) return <Navigate to="/login" replace />
  if (profile.must_change_password) return <Navigate to="/changer-mot-de-passe" replace />
  if (adminOnly && profile.role !== 'direction') return <Navigate to="/" replace />
  
  return children
}

function ForcePasswordRoute() {
  const { user, profile } = useAuth()
  if (!user || !profile) return <Navigate to="/login" replace />
  if (!profile.must_change_password) return <Navigate to="/" replace />
  return <ChangePassword />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/changer-mot-de-passe" element={<ForcePasswordRoute />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<Dashboard />} />
        <Route path="prospects" element={<Enterprises filterStatus="prospect" />} />
        <Route path="clients" element={<Enterprises filterStatus="client" />} />
        <Route path="entreprises/:id" element={<EnterpriseDetail />} />
        <Route path="admin" element={
          <ProtectedRoute adminOnly>
            <Admin />
          </ProtectedRoute>
        } />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
