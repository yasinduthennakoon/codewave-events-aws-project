import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';

export default function Layout() {
  const { auth, logout } = useAuth();
  const nav = useNavigate();

  return (
    <>
      <nav>
        <Link to="/">CloudWave Events</Link>
        <Link to="/events/new">+ New event</Link>
        <Link to="/my-registrations">My registrations</Link>
        <div className="spacer" />
        {auth ? (
          <>
            <span style={{ color: '#9ca3af' }}>{auth.email}</span>
            <button onClick={() => { logout(); nav('/'); }}>Log out</button>
          </>
        ) : (
          <>
            <Link to="/login">Log in</Link>
            <Link to="/register">Sign up</Link>
          </>
        )}
      </nav>
      <main className="container">
        <Outlet />
      </main>
    </>
  );
}
