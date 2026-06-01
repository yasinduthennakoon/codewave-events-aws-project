import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { login } = useAuth();
  const nav = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      await login(email, password);
      nav('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card">
      <h1>Log in</h1>
      {error && <div className="error">{error}</div>}
      <form onSubmit={submit}>
        <label><span>Email</span>
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)} />
        </label>
        <label><span>Password</span>
          <input type="password" required value={password} onChange={e => setPassword(e.target.value)} />
        </label>
        <button disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button>
      </form>
    </div>
  );
}
