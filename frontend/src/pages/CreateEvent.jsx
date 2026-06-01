// ============================================================================
// CreateEvent.jsx
// ----------------------------------------------------------------------------
// Demonstrates the FULL pre-signed-URL upload flow:
//   1. Ask files-service for a pre-signed PUT URL.
//   2. PUT the file bytes DIRECTLY to S3 (Lambda never sees them).
//   3. Save the event with the CloudFront public URL stored in `bannerUrl`.
// ============================================================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { eventsApi, filesApi } from '../api/client.js';

export default function CreateEvent() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setBusy(true);

    try {
      let bannerUrl = null;

      // ---- 1. Upload banner if one was picked ---------------------------
      if (file) {
        // Ask backend for a pre-signed PUT URL
        const { uploadUrl, publicUrl } = await filesApi.presignedUrl(file.name, file.type);

        // Send the file bytes straight to S3 with that URL.
        // The Content-Type header MUST match what we asked for, otherwise
        // S3 will reject the signed request.
        const putRes = await fetch(uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.type },
          body: file,
        });
        if (!putRes.ok) throw new Error(`S3 upload failed: ${putRes.status}`);

        bannerUrl = publicUrl;     // CloudFront URL — globally cached
      }

      // ---- 2. Create the event row -------------------------------------
      const { event } = await eventsApi.create({
        title,
        description,
        date: new Date(date).toISOString(),
        bannerUrl,
      });

      nav(`/events/${event._id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card">
      <h1>Create event</h1>
      {error && <div className="error">{error}</div>}
      <form onSubmit={submit}>
        <label><span>Title</span>
          <input required value={title} onChange={e => setTitle(e.target.value)} />
        </label>
        <label><span>Description</span>
          <textarea required value={description} onChange={e => setDescription(e.target.value)} />
        </label>
        <label><span>Date &amp; time</span>
          <input type="datetime-local" required value={date} onChange={e => setDate(e.target.value)} />
        </label>
        <label><span>Banner (optional)</span>
          <input type="file" accept="image/*" onChange={e => setFile(e.target.files?.[0] || null)} />
        </label>
        <button disabled={busy}>{busy ? 'Creating…' : 'Create event'}</button>
      </form>
    </div>
  );
}
