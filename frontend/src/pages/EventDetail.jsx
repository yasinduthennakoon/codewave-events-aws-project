// Single-event page with the "Register for this event" button. Logged-in
// users can register; the event owner can delete.

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { eventsApi, registrationsApi } from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';

export default function EventDetail() {
  const { id } = useParams();
  const { auth } = useAuth();
  const nav = useNavigate();
  const [evt, setEvt] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    eventsApi.get(id)
      .then(data => setEvt(data.event))
      .catch(err => setError(err.message));
  }, [id]);

  // Decode JWT-ish to discover ownership. We just check email since that's in
  // the auth context already; owner check on backend uses the Cognito sub.
  const isOwner = auth && evt && auth.email === evt.ownerEmail;

  const register = async () => {
    setError(''); setSuccess(''); setBusy(true);
    try {
      await registrationsApi.registerFor(id);
      setSuccess('Registered! Check your email for confirmation.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!confirm('Delete this event?')) return;
    setBusy(true);
    try {
      await eventsApi.remove(id);
      nav('/');
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  if (error && !evt) return <div className="error">{error}</div>;
  if (!evt) return <p>Loading…</p>;

  return (
    <div className="card">
      {evt.bannerUrl && <img className="event-banner" src={evt.bannerUrl} alt={evt.title} />}
      <h1>{evt.title}</h1>
      <p className="muted">{new Date(evt.date).toLocaleString()}</p>
      <p>{evt.description}</p>
      <p className="muted">Organised by {evt.ownerEmail}</p>

      {error   && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        {auth && !isOwner && (
          <button disabled={busy} onClick={register}>
            {busy ? 'Registering…' : 'Register for this event'}
          </button>
        )}
        {isOwner && (
          <button disabled={busy} onClick={remove} style={{ background: '#dc2626' }}>
            Delete event
          </button>
        )}
        {!auth && <p className="muted">Log in to register for this event.</p>}
      </div>
    </div>
  );
}
