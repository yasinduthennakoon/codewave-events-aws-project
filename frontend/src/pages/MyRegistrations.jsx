// The current user's list of events they registered for.

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { registrationsApi } from '../api/client.js';

export default function MyRegistrations() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    registrationsApi.mine()
      .then(data => setItems(data.registrations))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading…</p>;
  if (error)   return <div className="error">{error}</div>;

  return (
    <>
      <h1>My registrations</h1>
      {items.length === 0 && <p className="muted">You haven't registered for any events yet.</p>}
      {items.map(reg => (
        <div className="card" key={reg._id}>
          <h2><Link to={`/events/${reg.eventId}`}>{reg.eventTitle}</Link></h2>
          <p className="muted">{new Date(reg.eventDate).toLocaleString()}</p>
          <p className="muted">Registered on {new Date(reg.createdAt).toLocaleDateString()}</p>
        </div>
      ))}
    </>
  );
}
