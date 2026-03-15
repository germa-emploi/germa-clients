import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { LogIn, Eye, EyeOff, AlertCircle, ArrowLeft, Mail, CheckCircle2 } from 'lucide-react'
import { VersionBadge, ChangelogModal } from '../components/ChangelogModal'

export default function Login() {
  const { user, signIn, loading } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showChangelog, setShowChangelog] = useState(false)
  const [forgotMode, setForgotMode] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-germa-800 via-germa-700 to-germa-600 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (user && !submitting) return <Navigate to="/" replace />

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await signIn(email, password)
      navigate('/')
    } catch (err) {
      setError(err.message === 'Invalid login credentials' 
        ? 'Email ou mot de passe incorrect.' 
        : err.message
      )
    } finally {
      setSubmitting(false)
    }
  }

  async function handleForgotPassword(e) {
    e.preventDefault()
    if (!email.trim()) { setError('Veuillez saisir votre adresse email.'); return }
    setError('')
    setSubmitting(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) {
      setError(error.message)
    } else {
      setResetSent(true)
    }
    setSubmitting(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-germa-800 via-germa-700 to-germa-600 flex items-center justify-center p-4">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }} />
      </div>

      <div className="w-full max-w-md relative">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-4 mb-5">
            <img src="/logo_etti.jpg" alt="GERMA ETTI" className="h-24 sm:h-32 rounded-2xl shadow-xl bg-white p-2" />
            <img src="/logo_ai.jpg" alt="GERMA AI" className="h-24 sm:h-32 rounded-2xl shadow-xl bg-white p-2" />
          </div>
          <h1 className="font-display font-bold text-3xl text-white">GermaClients</h1>
          <p className="text-germa-200 text-sm mt-1">Suivi Activité Commerciale Germa Etti - Ai</p>
        </div>

        {/* Login card */}
        <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8">
          {forgotMode ? (
            resetSent ? (
              <>
                <div className="text-center py-4">
                  <CheckCircle2 size={48} className="mx-auto text-emerald-500 mb-4" />
                  <h2 className="font-display font-semibold text-lg text-gray-900 mb-2">Email envoyé</h2>
                  <p className="text-sm text-gray-500 mb-6">
                    Si un compte existe avec l'adresse <strong>{email}</strong>, vous recevrez un lien de réinitialisation.
                  </p>
                  <button onClick={() => { setForgotMode(false); setResetSent(false); setError('') }} className="btn-secondary w-full flex items-center justify-center gap-2">
                    <ArrowLeft size={16} /> Retour à la connexion
                  </button>
                </div>
              </>
            ) : (
              <>
                <button onClick={() => { setForgotMode(false); setError('') }} className="flex items-center gap-1 text-sm text-gray-500 hover:text-germa-700 mb-4">
                  <ArrowLeft size={14} /> Retour
                </button>
                <h2 className="font-display font-semibold text-lg text-gray-900 mb-2">Mot de passe oublié</h2>
                <p className="text-sm text-gray-500 mb-6">Saisissez votre email et vous recevrez un lien pour réinitialiser votre mot de passe.</p>

                {error && (
                  <div className="flex items-center gap-2 bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl mb-4">
                    <AlertCircle size={16} className="flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="input-field"
                      placeholder="nom@germa-emploi.fr"
                      required
                      autoFocus
                    />
                  </div>
                  <button type="submit" disabled={submitting}
                    className="btn-primary w-full flex items-center justify-center gap-2 !py-3 !text-base disabled:opacity-60">
                    {submitting ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <><Mail size={18} /><span>Envoyer le lien</span></>
                    )}
                  </button>
                </form>
              </>
            )
          ) : (
            <>
              <h2 className="font-display font-semibold text-lg text-gray-900 mb-6">Connexion</h2>
              
              {error && (
                <div className="flex items-center gap-2 bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl mb-4">
                  <AlertCircle size={16} className="flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="input-field"
                    placeholder="nom@germa-emploi.fr"
                    required
                    autoComplete="email"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Mot de passe</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="input-field pr-10"
                      placeholder="••••••••"
                      required
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary w-full flex items-center justify-center gap-2 !py-3 !text-base disabled:opacity-60"
                >
                  {submitting ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <LogIn size={18} />
                      <span>Se connecter</span>
                    </>
                  )}
                </button>
              </form>

              <button
                onClick={() => { setForgotMode(true); setError('') }}
                className="w-full text-center text-sm text-gray-500 hover:text-germa-700 mt-4 transition-colors"
              >
                Mot de passe oublié ?
              </button>
            </>
          )}
        </div>

        <p className="text-center text-germa-200 text-xs mt-6">
          © {new Date().getFullYear()} GERMA Emploi ETTI - AI — Application interne
          <br />
          <VersionBadge onClick={() => setShowChangelog(true)} className="text-germa-300 hover:text-white hover:bg-germa-600 mt-1 inline-block" />
        </p>
      </div>

      {showChangelog && <ChangelogModal onClose={() => setShowChangelog(false)} />}
    </div>
  )
}
