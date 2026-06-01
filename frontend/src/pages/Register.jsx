// Sign-up page. Two-step flow: collect email+password → Cognito sends a code
// → user enters the code → account is confirmed.

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as cognito from '../auth/cognito.js';

export default function Register() {
  const [step, setStep] = useState('signup');     // 'signup' | 'confirm'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();

  const submitSignup = async (e) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      await cognito.signUp(email, password);
      setStep('confirm');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const submitConfirm = async (e) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      await cognito.confirmSignUp(email, code);
      nav('/login');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card">
      <h1>{step === 'signup' ? 'Create an account' : 'Confirm your email'}</h1>
      {error && <div className="error">{error}</div>}

      {step === 'signup' ? (
        <form onSubmit={submitSignup}>
          <label><span>Email</span>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} />
          </label>
          <label><span>Password (min 8 chars, 1 number, 1 lowercase)</span>
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)} />
          </label>
          <button disabled={busy}>{busy ? 'Signing up…' : 'Sign up'}</button>
        </form>
      ) : (
        <form onSubmit={submitConfirm}>
          <p className="muted">We emailed a 6-digit code to <b>{email}</b>.</p>
          <label><span>Code</span>
            <input required value={code} onChange={e => setCode(e.target.value)} />
          </label>
          <button disabled={busy}>{busy ? 'Confirming…' : 'Confirm'}</button>
        </form>
      )}
    </div>
  );
}
