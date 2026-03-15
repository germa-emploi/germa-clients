import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react'

export default function ChangePassword() {
  const { profile, signOut } = useAuth()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.')
      return
    }
    if (!/[A-Z]/.test(password)) {
      setError('Le mot de passe doit contenir au moins une majuscule.')
      return
    }
    if (!/[a-z]/.test(password)) {
      setError('Le mot de passe doit contenir au moins une minuscule.')
      return
    }
    if (!/[0-9]/.test(password)) {
      setError('Le mot de passe doit contenir au moins un chiffre.')
      return
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
      setError('Le mot de passe doit contenir au moins un caractère spécial (!@#$%...).')
      return
    }
    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }

    setSaving(true)

    // Changer le mot de passe via Supabase Auth
    const { error: authError } = await supabase.auth.updateUser({ password })
    if (authError) {
      setError(authError.message)
      setSaving(false)
      return
    }

    // Mettre à jour le flag dans le profil
    const { error: profError } = await supabase
      .from('profiles')
      .update({ must_change_password: false })
      .eq('id', profile.id)

    if (profError) {
      setError('Mot de passe changé mais erreur profil : ' + profError.message)
      setSaving(false)
      return
    }

    // Déconnecter pour que le nouveau mot de passe prenne effet
    // (nécessaire car persistSession est désactivé)
    await signOut()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-germa-800 via-germa-700 to-germa-600 flex items-center justify-center p-4">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }} />
      </div>

      <div className="w-full max-w-md relative">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-4">
            <Lock size={32} className="text-white" />
          </div>
          <h1 className="font-display font-bold text-2xl text-white">Changement de mot de passe</h1>
          <p className="text-germa-200 text-sm mt-2">
            Bonjour {profile?.full_name?.split(' ')[0]}, veuillez choisir votre mot de passe personnel.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8">
          {error && (
            <div className="flex items-center gap-2 bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl mb-4">
              <AlertCircle size={16} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Nouveau mot de passe</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="input-field pr-10"
                  placeholder="Min. 8 car., majuscule, minuscule, chiffre, spécial"
                  required
                  minLength={8}
                  autoFocus
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirmer le mot de passe</label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                className="input-field"
                placeholder="Répétez le mot de passe"
                required
              />
              {confirm && password && confirm === password && (
                <div className="flex items-center gap-1 text-emerald-600 text-xs mt-1">
                  <CheckCircle2 size={12} /> Les mots de passe correspondent
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={saving}
              className="btn-primary w-full flex items-center justify-center gap-2 !py-3 !text-base disabled:opacity-60"
            >
              {saving ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Lock size={18} />
                  <span>Valider mon mot de passe</span>
                </>
              )}
            </button>
          </form>

          <p className="text-xs text-gray-400 text-center mt-4">
            Vous serez déconnecté après le changement et pourrez vous reconnecter avec votre nouveau mot de passe.
          </p>
        </div>
      </div>
    </div>
  )
}
