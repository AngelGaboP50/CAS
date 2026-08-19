import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './LoginPage.css'

function RegisterPage() {
  const navigate = useNavigate()
  // Step 1: Registro
  const [step, setStep] = useState<1 | 2>(1)
  const [nombre, setNombre] = useState('')
  const [correo, setCorreo] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  
  // Step 2: Verificación OTP
  const [otp, setOtp] = useState('')

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }
    
    // Validar seguridad de la contraseña: min 8 chars, 1 mayúscula, 1 número, 1 símbolo especial
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
    if (!passwordRegex.test(password)) {
      setError('La contraseña debe tener al menos 8 caracteres, una mayúscula, un número y un símbolo especial (@$!%*?&)')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, correo, password })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al crear la cuenta')
      
      setSuccess('¡Cuenta creada! Revisa tu correo y escribe el código de 6 dígitos que te enviamos.')
      setStep(2)
    } catch (err: any) {
      setError(err.message || 'Error al crear la cuenta')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!otp || otp.length !== 6) {
      setError('El código debe ser de 6 dígitos')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/auth/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo, code: otp })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Código incorrecto o expirado')
      
      setSuccess('¡Correo verificado! Redirigiendo al inicio de sesión...')
      setTimeout(() => navigate('/login'), 2000)
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
              <span className="material-symbols-outlined" style={{ color: 'var(--color-secondary)', fontSize: '32px' }}>
                {step === 1 ? 'person_add' : 'mark_email_read'}
              </span>
              <h2 className="card-title" style={{ fontSize: '26px', margin: 0 }}>
                {step === 1 ? 'Registrarse' : 'Verificar Correo'}
              </h2>
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

            {success && (
              <div style={{
                background: 'rgba(25, 200, 100, 0.15)',
                border: '1px solid rgba(25, 200, 100, 0.5)',
                borderRadius: '8px',
                padding: '10px 14px',
                color: '#5ddf9a',
                fontSize: '14px',
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>check_circle</span>
                {success}
              </div>
            )}

            {step === 1 ? (
              <form className="login-form" onSubmit={handleRegister}>
                <div className="field-group">
                  <label className="field-label" htmlFor="nombre">
                    Nombre Completo
                    <span className="field-required">Requerido</span>
                  </label>
                  <div className="input-wrapper">
                    <input
                      id="nombre"
                      type="text"
                      className="field-input"
                      placeholder="Ingresa tu nombre completo"
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      required
                      disabled={loading}
                    />
                    <span className="material-symbols-outlined input-icon">badge</span>
                  </div>
                </div>

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

                <div className="field-group">
                  <label className="field-label" htmlFor="confirm-key">
                    Confirmar Contraseña
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
                      disabled={loading}
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

                {/* Indicador de seguridad de contraseña */}
                <div style={{ marginTop: '-10px', marginBottom: '20px', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ color: password.length >= 8 ? '#5ddf9a' : 'var(--color-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>{password.length >= 8 ? 'check_circle' : 'radio_button_unchecked'}</span>
                    Mínimo 8 caracteres
                  </div>
                  <div style={{ color: /[A-Z]/.test(password) ? '#5ddf9a' : 'var(--color-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>{/[A-Z]/.test(password) ? 'check_circle' : 'radio_button_unchecked'}</span>
                    Al menos una mayúscula
                  </div>
                  <div style={{ color: /\d/.test(password) ? '#5ddf9a' : 'var(--color-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>{/\d/.test(password) ? 'check_circle' : 'radio_button_unchecked'}</span>
                    Al menos un número
                  </div>
                  <div style={{ color: /[@$!%*?&]/.test(password) ? '#5ddf9a' : 'var(--color-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>{/[@$!%*?&]/.test(password) ? 'check_circle' : 'radio_button_unchecked'}</span>
                    Al menos un símbolo especial (@$!%*?&)
                  </div>
                </div>

                <button type="submit" className="btn-submit" id="btn-registrarse" disabled={loading}>
                  {loading ? 'Procesando...' : 'Crear Cuenta'}
                  {!loading && <span className="material-symbols-outlined icon-sm">person_add</span>}
                </button>
              </form>
            ) : (
              <form className="login-form" onSubmit={handleVerifyOTP}>
                <p style={{ color: 'var(--color-muted)', fontSize: '14px', marginBottom: '20px' }}>
                  Hemos enviado un código de 6 dígitos a <strong>{correo}</strong>. Por favor, introdúcelo a continuación para activar tu cuenta.
                </p>
                <div className="field-group">
                  <label className="field-label" htmlFor="otp">
                    Código de Verificación
                  </label>
                  <div className="input-wrapper">
                    <input
                      id="otp"
                      type="text"
                      className="field-input"
                      placeholder="Ej. 123456"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      maxLength={6}
                      required
                      disabled={loading}
                      style={{ fontSize: '24px', letterSpacing: '4px', textAlign: 'center' }}
                    />
                    <span className="material-symbols-outlined input-icon">password</span>
                  </div>
                </div>
                <button type="submit" className="btn-submit" disabled={loading}>
                  {loading ? 'Verificando...' : 'Verificar Correo'}
                  {!loading && <span className="material-symbols-outlined icon-sm">check_circle</span>}
                </button>
              </form>
            )}

            <div className="help-links" style={{ justifyContent: 'center' }}>
              <Link to="/login" className="help-link">¿Ya tienes una cuenta? Inicia sesión aquí</Link>
            </div>
          </div>
          <div className="card-bottom-accent" />
        </div>
      </main>

      <footer className="login-footer">
        <div className="footer-links"></div>
        <p className="footer-copy">© 2026 IDGS15 EQUIPO 6. TODOS LOS DERECHOS RESERVADOS.</p>
      </footer>
    </div>
  )
}

export default RegisterPage
