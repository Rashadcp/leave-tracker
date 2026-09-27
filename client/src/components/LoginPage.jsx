import React, { useState } from 'react';
import { api } from '../services/api';
import { Eye, EyeOff } from 'lucide-react';

export const LoginPage = ({ onLoginSuccess }) => {
  const [tab, setTab] = useState('login'); // 'login' | 'register'
  const [isForgot, setIsForgot] = useState(false);

  // Login state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  // Register state
  const [regName, setRegName] = useState('');
  const [regDepartment, setRegDepartment] = useState('Developer');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');

  // Forgot password state
  const [forgotEmail, setForgotEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetToken] = useState(() => new URLSearchParams(window.location.search).get('resetToken'));

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);
    try {
      const res = await api.login({ email, password });
      onLoginSuccess(res.user, rememberMe);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);
    try {
      const res = await api.register({
        name: regName,
        department: regDepartment,
        email: regEmail,
        password: regPassword
      });
      setSuccessMsg(res.message || 'Account created successfully!');
      // Switch back to login after short delay and auto-fill password
      setTimeout(() => {
        setTab('login');
        setEmail(regEmail);
        setPassword(regPassword);
        setSuccessMsg('Account created successfully! You can now sign in.');
      }, 1000);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);
    try {
      const res = await api.forgotPassword({ email: forgotEmail });
      setSuccessMsg(res.message);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (newPassword.length < 8) return setErrorMsg('Password must be at least 8 characters.');
    if (newPassword !== confirmPassword) return setErrorMsg('Passwords do not match.');
    setLoading(true);
    try {
      const res = await api.resetPassword({ token: resetToken, newPassword });
      setSuccessMsg(res.message);
      window.history.replaceState({}, '', window.location.pathname);
      setTimeout(() => window.location.reload(), 1200);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      background: 'var(--bg-page)'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '380px',
        background: '#FFFFFF',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        padding: '24px'
      }}>
        {/* Winshine Logo */}
        <div style={{ textAlign: 'center', marginBottom: '18px', background: '#FFFFFF', padding: '4px 0' }}>
          <img 
            src="/logo.png" 
            alt="Winshine" 
            style={{ maxHeight: '48px', maxWidth: '100%', objectFit: 'contain', display: 'inline-block' }} 
          />
        </div>

        {/* Portal Title */}
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '4px' }}>
          Staff Leave &amp; Attendance
        </h1>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
          {isForgot 
            ? 'Reset your account password'
            : tab === 'login' 
              ? 'Sign in to your account' 
              : 'Create your account'}
        </p>

        {/* Tab switcher: Sign In vs Register (if not in forgot mode) */}
        {!isForgot && (
          <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-subtle)', padding: '3px', borderRadius: '6px', marginBottom: '16px' }}>
            <button
              type="button"
              className="tab-btn"
              style={{
                flex: 1,
                border: 'none',
                borderRadius: '4px',
                padding: '6px 0',
                background: tab === 'login' ? '#FFFFFF' : 'transparent',
                fontWeight: tab === 'login' ? 600 : 400,
                color: tab === 'login' ? 'var(--text-primary)' : 'var(--text-muted)',
                boxShadow: tab === 'login' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
              }}
              onClick={() => { setTab('login'); setErrorMsg(''); setSuccessMsg(''); }}
            >
              Sign In
            </button>
            <button
              type="button"
              className="tab-btn"
              style={{
                flex: 1,
                border: 'none',
                borderRadius: '4px',
                padding: '6px 0',
                background: tab === 'register' ? '#FFFFFF' : 'transparent',
                fontWeight: tab === 'register' ? 600 : 400,
                color: tab === 'register' ? 'var(--text-primary)' : 'var(--text-muted)',
                boxShadow: tab === 'register' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
              }}
              onClick={() => { setTab('register'); setErrorMsg(''); setSuccessMsg(''); }}
            >
              Create Account
            </button>
          </div>
        )}

        {errorMsg && (
          <div className="alert-banner alert-error" style={{ marginBottom: '14px', padding: '8px 12px' }}>
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="alert-banner alert-success" style={{ marginBottom: '14px', padding: '8px 12px' }}>
            <span>{successMsg}</span>
          </div>
        )}

        {resetToken ? (
          <form onSubmit={handleResetPassword}>
            <div className="form-field">
              <label className="form-label">New Password</label>
              <input type="password" className="input" placeholder="At least 8 characters" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required autoFocus />
            </div>
            <div className="form-field">
              <label className="form-label">Confirm Password</label>
              <input type="password" className="input" placeholder="Re-enter new password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', height: '38px', marginTop: '6px' }} disabled={loading}>
              {loading ? 'Updating...' : 'Set New Password'}
            </button>
          </form>
        ) : isForgot ? (
          /* FORGOT PASSWORD FORM */
          <form onSubmit={handleForgot}>
            <div className="form-field">
              <label className="form-label">Email</label>
              <input 
                type="email" 
                className="input" 
                placeholder="name@winshine.com"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                required
                autoFocus
              />
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ width: '100%', height: '38px', marginTop: '6px' }}
              disabled={loading}
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>

            <div style={{ textAlign: 'center', marginTop: '14px' }}>
              <button 
                type="button" 
                onClick={() => { setIsForgot(false); setErrorMsg(''); }}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.8rem', cursor: 'pointer' }}
              >
                Back to Sign In
              </button>
            </div>
          </form>
        ) : tab === 'login' ? (
          /* SIGN IN FORM */
          <form onSubmit={handleLogin}>
            <div className="form-field">
              <label className="form-label">Email</label>
              <input 
                type="email" 
                className="input" 
                placeholder="name@winshine.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="form-field">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label" style={{ margin: 0 }}>Password</label>
                <button 
                  type="button"
                  onClick={() => { setIsForgot(true); setErrorMsg(''); setForgotEmail(email); }}
                  style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.78rem', cursor: 'pointer' }}
                >
                  Forgot?
                </button>
              </div>
              <div style={{ position: 'relative', marginTop: '6px' }}>
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  className="input" 
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '12px 0 16px 0' }}>
              <input 
                type="checkbox" 
                id="remember" 
                checked={rememberMe} 
                onChange={(e) => setRememberMe(e.target.checked)} 
                style={{ cursor: 'pointer' }}
              />
              <label htmlFor="remember" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                Remember me
              </label>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ width: '100%', height: '38px' }}
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        ) : (
          /* REGISTRATION FORM (NAME, DEPARTMENT, EMAIL, PASSWORD) */
          <form onSubmit={handleRegister}>
            <div className="form-field">
              <label className="form-label">Full Name</label>
              <input 
                type="text" 
                className="input" 
                placeholder="e.g. John Doe"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="form-field">
              <label className="form-label">Department</label>
              <select 
                className="select"
                value={regDepartment}
                onChange={(e) => setRegDepartment(e.target.value)}
              >
                <option value="Developer">Developer</option>
                <option value="Sales">Sales</option>
                <option value="Designers">Designers</option>
                <option value="Digital Marketing Executive">Digital Marketing Executive</option>
                <option value="Finance">Finance</option>
              </select>
            </div>

            <div className="form-field">
              <label className="form-label">Email Address</label>
              <input 
                type="email" 
                className="input" 
                placeholder="name@winshine.com"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-field">
              <label className="form-label">Password</label>
              <input 
                type="password" 
                className="input" 
                placeholder="Create a password"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                required
              />
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ width: '100%', height: '38px', marginTop: '8px' }}
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Account'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
