import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Navbar() {

  const { token, logout } = useAuth();

  const handleLogout = () => {
    logout();
    window.location.href = "/login";
  };

  return (
    <nav className="navbar" role="navigation" aria-label="Main navigation">
      <div className="navbar-inner">

        <Link to="/" className="navbar-brand">
          <span style={{ color: "var(--color-accent-primary)" }}>🛡️</span>
          <span>VoxPath</span>
        </Link>

        <div className="navbar-links">

          {!token && (
            <>
              <a href="#about" className="nav-link">About</a>
              <a href="#features" className="nav-link">Features</a>
              <a href="#pricing" className="nav-link">Pricing</a>

              <Link to="/login" className="nav-link">Log in</Link>

              <Link
                to="/signup"
                className="btn btn-primary"
                style={{ padding: "0.625rem 1.25rem" }}
              >
                Get VoxPath
              </Link>
            </>
          )}

          {token && (
            <>
              <Link to="/dashboard" className="nav-link"></Link>
              <Link to="/settings" className="nav-link"></Link>

              <button
                onClick={handleLogout}
                className="btn btn-primary"
                style={{ padding: "0.625rem 1.25rem" }}
              >
                Sign Out
              </button>
            </>
          )}

        </div>
      </div>
    </nav>
  );
}

export default Navbar;