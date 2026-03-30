import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './LoginPage.css'

import { supabase } from '../supabaseClient'
function LoginPage() {
  const navigate = useNavigate()
  const [correo, setCorreo] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // 1. Iniciar sesión usando Supabase Auth (verifica la contraseña)
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: correo,
        password: password,
      })

      if (authError) throw authError

      // 2. Traemos la información adicional del usuario (rol, nombre) desde la tabla pública
      if (authData.user) {
        const { data: userData, error: dbError } = await supabase
          .from('usuarios')
          .select('*')
          .eq('correo', correo)
          .single()

        if (dbError) {
          // Si no encontramos el usuario en nuestra tabla, igual lo dejamos pasar pero con datos por defecto o tiramos error
          console.warn('Usuario no encontrado en la tabla pública usuarios')
        }

        sessionStorage.setItem('usuario', JSON.stringify({
          id: userData?.id || authData.user.id,
          nombre: userData?.nombre || 'Usuario',
          correo: authData.user.email,
          tipo: userData?.tipo || 'indefinido',
        }))
        
        if (userData?.tipo === 'admin') {
          navigate('/admin')
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

  const handleGoogleLogin = () => {
    console.log('Inicio de sesión con Google iniciado')
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
                alignItems: 'center',
                gap: '8px'
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>error</span>
                {error}
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

              <div className="divider">
                <div className="divider-line" />
                <span className="divider-text">O</span>
                <div className="divider-line" />
              </div>

              <button type="button" className="btn-google" id="btn-google-login" onClick={handleGoogleLogin} disabled={loading}>
                <svg className="google-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                  <path fill="none" d="M0 0h48v48H0z"/>
                </svg>
                Acceder con Google
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
