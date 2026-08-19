import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import './LoginPage.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

function LoginPage() {
  const navigate = useNavigate()
  const [correo, setCorreo] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [resendMsg, setResendMsg] = useState('')
  const [resending, setResending] = useState(false)
  const location = useLocation()

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const verified = params.get('verified')
    const urlError = params.get('error')
    
    if (verified === 'success') {
      setSuccessMsg('¡Cuenta verificada exitosamente! Ya puedes iniciar sesión.')
    } else if (verified === 'already') {
      setSuccessMsg('Tu cuenta ya estaba verificada. Inicia sesión.')
    }
    
    if (urlError) {
      setError(urlError)
    }
  }, [location.search])

  const handleResend = async () => {
    if (!correo) return
    setResending(true)
    setResendMsg('')
    try {
      const res = await fetch(`${API_URL}/api/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al reenviar el correo')
      setResendMsg('¡Correo reenviado! Revisa tu bandeja de entrada.')
    } catch (err: any) {
      setResendMsg(err.message || 'Error al reenviar el correo')
    } finally {
      setResending(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setResendMsg('')
    setLoading(true)

    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al iniciar sesión')

      // Guardar token y datos del usuario en sessionStorage
      sessionStorage.setItem('token', data.token)
      sessionStorage.setItem('usuario', JSON.stringify(data.usuario))

      // Redirigir según rol: 1=Profesor, 2=Admin
      if (Number(data.usuario.rol) === 2 || data.usuario.tipo === 'admin') {
        navigate('/admin')
      } else {
        const returnUrl = sessionStorage.getItem('returnUrl')
        if (returnUrl) {
          sessionStorage.removeItem('returnUrl')
          navigate(returnUrl)
        } else {
          navigate('/dashboard')
        }
      }

    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión')
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
          <span className="ds-code">0x8842-ACCESS-GRANTED</span>
        </div>
        <div className="data-stream data-stream-left">
          <div className="ds-line ds-line-long" />
          <div className="ds-line ds-line-medium" />
          <div className="ds-line ds-line-short" />
          <span className="ds-code ds-code-left">PROTOCOL-LEVEL-4</span>
        </div>

        <div className="auth-card">
          <div className="auth-card-inner">
            <div className="card-header" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '12px', paddingBottom: '8px' }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--color-secondary)', fontSize: '32px' }}>lock_open</span>
              <h2 className="card-title" style={{ fontSize: '26px', margin: 0 }}>Inicio de sesión</h2>
            </div>

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
                flexDirection: 'column',
                gap: '8px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>error</span>
                  {error}
                </div>
                {error.includes('no está verificada') && (
                  <button 
                    onClick={handleResend}
                    disabled={resending}
                    type="button"
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      color: 'white',
                      padding: '6px 12px',
                      borderRadius: '4px',
                      cursor: resending ? 'wait' : 'pointer',
                      fontSize: '12px',
                      alignSelf: 'flex-start'
                    }}
                  >
                    {resending ? 'Enviando...' : 'Reenviar correo de verificación'}
                  </button>
                )}
                {resendMsg && (
                  <div style={{ color: resendMsg.includes('Error') ? '#ff6b7a' : '#4ade80', fontSize: '13px' }}>
                    {resendMsg}
                  </div>
                )}
              </div>
            )}

            {successMsg && (
              <div style={{
                background: 'rgba(74, 222, 128, 0.15)',
                border: '1px solid rgba(74, 222, 128, 0.5)',
                borderRadius: '8px',
                padding: '10px 14px',
                color: '#4ade80',
                fontSize: '14px',
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>check_circle</span>
                {successMsg}
              </div>
            )}

            <form className="login-form" onSubmit={handleSubmit}>
              <div className="field-group">
                <label className="field-label" htmlFor="correo">
                  Correo Institucional
                  <span className="field-required">Requerido</span>
                </label>
                <div className="input-wrapper">
                  <input
                    id="correo"
                    type="email"
                    className="field-input"
                    placeholder="usuario@uteq.edu.mx"
                    value={correo}
                    onChange={(e) => setCorreo(e.target.value)}
                    required
                    disabled={loading}
                  />
                  <span className="material-symbols-outlined input-icon">person</span>
                </div>
              </div>

              <div className="field-group">
                <label className="field-label" htmlFor="key">
                  Contraseña de Acceso
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
                    disabled={loading}
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

              <button type="submit" className="btn-submit" id="btn-iniciar-sesion" disabled={loading}>
                {loading ? 'Verificando...' : 'Iniciar Sesión'}
                {!loading && <span className="material-symbols-outlined icon-sm">arrow_forward</span>}
              </button>


            </form>

            <div className="help-links" style={{ justifyContent: 'space-between' }}>
              <Link to="/forgot-password" className="help-link">¿Olvidaste tu contraseña?</Link>
              <Link to="/register" className="help-link">Crear cuenta</Link>
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

export default LoginPage
