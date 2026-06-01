// ============================================================================
// api/client.js
// ----------------------------------------------------------------------------
// All microservices share one API Gateway, so there is a single base URL.
// The functions here build the full URL per route and inject the JWT for
// authenticated requests.
// ============================================================================

const BASE = import.meta.env.VITE_API_BASE;

function getToken() {
  try {
    const stored = JSON.parse(localStorage.getItem('cloudwave_auth') || 'null');
    return stored?.idToken || null;
  } catch {
    return null;
  }
}

async function request(path, { method = 'GET', body, auth = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (!token) throw new Error('Not logged in');
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, {
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
  list:   ()           => request('/events'),
  get:    (id)         => request(`/events/${id}`),
  create: (body)       => request('/events',       { method: 'POST',   body, auth: true }),
  update: (id, body)   => request(`/events/${id}`, { method: 'PUT',    body, auth: true }),
  remove: (id)         => request(`/events/${id}`, { method: 'DELETE',       auth: true }),
};

// ---- Registrations ---------------------------------------------------------
export const registrationsApi = {
  registerFor: (eventId) => request(`/events/${eventId}/register`, { method: 'POST', auth: true }),
  mine:        ()        => request('/my-registrations',           { auth: true }),
};

// ---- Files -----------------------------------------------------------------
export const filesApi = {
  presignedUrl: (filename, contentType) =>
    request('/files/presigned-url', {
      method: 'POST',
      body: { filename, contentType },
      auth: true,
    }),
};
