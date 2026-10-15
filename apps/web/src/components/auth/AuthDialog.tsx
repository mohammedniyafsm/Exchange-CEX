import { useState, type FormEvent } from 'react'
import { apiRequest, setAccessToken } from '../../services/http'

type AuthUser = { id: string; email: string }
type AuthResult = { success: boolean; token: string; user: AuthUser; message?: string }

type Props = {
  initialMode: 'signin' | 'signup'
  onClose: () => void
  onAuthenticated: (result: AuthResult) => void
}

export function AuthDialog({ initialMode, onClose, onAuthenticated }: Props) {
  const [mode, setMode] = useState(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const result = await apiRequest<AuthResult>(`/auth/${mode}`, {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      if (!result.token || !result.user) throw new Error('The server returned an invalid authentication response')
      setAccessToken(result.token)
      onAuthenticated(result)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Authentication failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-dialog-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <section className="auth-dialog" role="dialog" aria-modal="true" aria-labelledby="auth-dialog-title">
        <button className="auth-dialog-close" type="button" aria-label="Close" onClick={onClose}>×</button>
        <h2 id="auth-dialog-title">{mode === 'signin' ? 'Log in to CryptoLattice' : 'Create your account'}</h2>
        <p>{mode === 'signin' ? 'Use your exchange account to continue.' : 'Create an account to access balances and place orders.'}</p>
        <form onSubmit={(event) => void submit(event)}>
          <label>Email<input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
          <label>Password<input type="password" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} minLength={mode === 'signup' ? 8 : undefined} required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
          {error && <div className="auth-dialog-error" role="alert">{error}</div>}
          <button className="auth-dialog-submit" type="submit" disabled={submitting}>{submitting ? 'Please wait…' : mode === 'signin' ? 'Log in' : 'Create account'}</button>
        </form>
        <button className="auth-dialog-switch" type="button" onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError('') }}>
          {mode === 'signin' ? 'New here? Create an account' : 'Already have an account? Log in'}
        </button>
      </section>
    </div>
  )
}
