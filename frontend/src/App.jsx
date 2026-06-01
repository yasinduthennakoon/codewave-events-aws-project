import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Events from './pages/Events.jsx';
import EventDetail from './pages/EventDetail.jsx';
import CreateEvent from './pages/CreateEvent.jsx';
import MyRegistrations from './pages/MyRegistrations.jsx';

// All routes nest under <Layout> so the nav bar shows everywhere.
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Events />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="events/:id" element={<EventDetail />} />

        {/* Auth-gated routes */}
        <Route
          path="events/new"
          element={<ProtectedRoute><CreateEvent /></ProtectedRoute>}
        />
        <Route
          path="my-registrations"
          element={<ProtectedRoute><MyRegistrations /></ProtectedRoute>}
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
