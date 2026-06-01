// Events list page (the homepage). Public — no auth needed to browse.

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { eventsApi } from '../api/client.js';

export default function Events() {
  const [events, setEvents] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    eventsApi.list()
      .then(data => setEvents(data.events))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading…</p>;
  if (error)   return <div className="error">{error}</div>;

  return (
    <>
      <h1>Upcoming events</h1>
      {events.length === 0 && <p className="muted">No events yet. Create the first one!</p>}
      {events.map(evt => (
        <div className="card" key={evt._id}>
          {evt.bannerUrl && (
            <img className="event-banner" src={evt.bannerUrl} alt={evt.title} />
          )}
          <h2><Link to={`/events/${evt._id}`}>{evt.title}</Link></h2>
          <p className="muted">{new Date(evt.date).toLocaleString()}</p>
          <p>{evt.description}</p>
        </div>
      ))}
    </>
  );
}
