import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import './LoginPage.css'

function ResetPasswordPage() {
  const navigate = useNavigate()
  const location = useLocation()
  
  const [token, setToken] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const t = params.get('token')
    if (t) {
      setToken(t)
    } else {
      setError('Enlace inválido o sin token de seguridad.')
    }
  }, [location])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!token) {
      setError('No hay un token de recuperación válido.')
      return
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }

    setLoading(true)
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'
      const res = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'No se pudo restablecer la contraseña')
      
      setSuccess('¡Contraseña actualizada exitosamente!')
      setTimeout(() => navigate('/login'), 3000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-root">
      <div className="bg-glow bg-glow-primary" />
      <div className="bg-glow bg-glow-secondary" />

      <header className="login-header">
        <div className="header-brand">
          <div className="brand-bar" />
          <div>
            <h1 className="brand-title">CAS</h1>
            <p className="brand-subtitle">Control de Acceso a Salones</p>
          </div>
        </div>
      </header>

      <main className="login-main">
        <div className="data-stream data-stream-right">
          <div className="ds-line ds-line-short" />
          <div className="ds-line ds-line-medium ds-align-right" />
          <div className="ds-line ds-line-long" />
          <span className="ds-code">0x8842-RESET</span>
        </div>
        <div className="data-stream data-stream-left">
          <div className="ds-line ds-line-long" />
          <div className="ds-line ds-line-medium" />
          <div className="ds-line ds-line-short" />
          <span className="ds-code ds-code-left">PROTOCOL-LEVEL-5</span>
        </div>

        <div className="auth-card">
          <div className="auth-card-inner">
            <div className="card-header" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '12px', paddingBottom: '8px' }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--color-secondary)', fontSize: '32px' }}>lock_reset</span>
              <h2 className="card-title" style={{ fontSize: '26px', margin: 0 }}>Restablecer Contraseña</h2>
            </div>
            
            <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem', marginBottom: '24px', lineHeight: '1.5' }}>
              Por favor ingresa tu nueva contraseña a continuación.
            </p>

            {error && (
              <div style={{
                background: 'rgba(220, 53, 69, 0.15)',
                border: '1px solid rgba(220, 53, 69, 0.5)',
                borderRadius: '8px',
                padding: '10px 14px',
                color: '#ff6b7a',
                fontSize: '14px',
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>error</span>
                {error}
              </div>
            )}

            {success ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--color-secondary)', marginBottom: '16px' }}>check_circle</span>
                <h3 style={{ color: 'var(--color-text)', fontSize: '18px', margin: '0 0 8px 0' }}>¡Éxito!</h3>
                <p style={{ color: 'var(--color-muted)', fontSize: '14px', margin: '0' }}>{success}</p>
                <p style={{ color: 'var(--color-muted)', fontSize: '12px', marginTop: '8px' }}>Redirigiendo al inicio de sesión...</p>
              </div>
            ) : (
              <form className="login-form" onSubmit={handleSubmit}>
                <div className="field-group">
                  <label className="field-label" htmlFor="key">
                    Nueva Contraseña
                    <span className="field-required">Requerido</span>
                  </label>
                  <div className="input-wrapper">
                    <input
                      id="key"
                      type={showPassword ? 'text' : 'password'}
                      className="field-input"
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={loading || !token}
                    />
                    <button
                      type="button"
                      className="input-icon-btn"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label="Mostrar u ocultar contraseña"
                    >
                      <span className="material-symbols-outlined input-icon">
                        {showPassword ? 'visibility_off' : 'key'}
                      </span>
                    </button>
                  </div>
                </div>

                <div className="field-group">
                  <label className="field-label" htmlFor="confirm-key">
                    Confirmar Nueva Contraseña
                    <span className="field-required">Requerido</span>
                  </label>
                  <div className="input-wrapper">
                    <input
                      id="confirm-key"
                      type={showConfirmPassword ? 'text' : 'password'}
                      className="field-input"
                      placeholder="••••••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      disabled={loading || !token}
                    />
                    <button
                      type="button"
                      className="input-icon-btn"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label="Mostrar u ocultar confirmación de contraseña"
                    >
                      <span className="material-symbols-outlined input-icon">
                        {showConfirmPassword ? 'visibility_off' : 'key'}
                      </span>
                    </button>
                  </div>
                </div>

                <button type="submit" className="btn-submit" disabled={loading || !token}>
                  {loading ? 'Guardando...' : 'Guardar Nueva Contraseña'}
                  {!loading && <span className="material-symbols-outlined icon-sm">save</span>}
                </button>
              </form>
            )}

            <div className="help-links" style={{ justifyContent: 'center', marginTop: '20px' }}>
              <Link to="/login" className="help-link" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_back</span>
                Volver al inicio de sesión
              </Link>
            </div>
          </div>
          <div className="card-bottom-accent" />
        </div>
      </main>

      <footer className="login-footer">
        <div className="footer-links"></div>
        <p className="footer-copy">© 2026 IDGS15 Equipo 6. TODOS LOS DERECHOS RESERVADOS.</p>
      </footer>
    </div>
  )
}

export default ResetPasswordPage
