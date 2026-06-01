// ============================================================================
// api/client.js
// ----------------------------------------------------------------------------
// Each microservice has its OWN HTTP API endpoint (true microservice isolation),
// so we keep one base URL per service. The functions here pick the right base
// per call and inject the JWT for authenticated requests.
// ============================================================================

const BASES = {
  auth:          import.meta.env.VITE_API_AUTH,
  events:        import.meta.env.VITE_API_EVENTS,
  registrations: import.meta.env.VITE_API_REGISTRATIONS,
  files:         import.meta.env.VITE_API_FILES,
};

function getToken() {
  try {
    const stored = JSON.parse(localStorage.getItem('cloudwave_auth') || 'null');
    return stored?.idToken || null;
  } catch {
    return null;
  }
}

async function request(service, path, { method = 'GET', body, auth = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (!token) throw new Error('Not logged in');
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${BASES[service]}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `${res.status} ${res.statusText}`);
  return data;
}

// ---- Events ----------------------------------------------------------------
export const eventsApi = {
  list:   ()           => request('events', '/events'),
  get:    (id)         => request('events', `/events/${id}`),
  create: (body)       => request('events', '/events',         { method: 'POST',   body, auth: true }),
  update: (id, body)   => request('events', `/events/${id}`,   { method: 'PUT',    body, auth: true }),
  remove: (id)         => request('events', `/events/${id}`,   { method: 'DELETE',       auth: true }),
};

// ---- Registrations ---------------------------------------------------------
export const registrationsApi = {
  registerFor: (eventId) => request('registrations', `/events/${eventId}/register`, { method: 'POST', auth: true }),
  mine:        ()        => request('registrations', '/my-registrations',                              { auth: true }),
};

// ---- Files -----------------------------------------------------------------
export const filesApi = {
  presignedUrl: (filename, contentType) =>
    request('files', '/files/presigned-url', {
      method: 'POST',
      body: { filename, contentType },
      auth: true,
    }),
};
