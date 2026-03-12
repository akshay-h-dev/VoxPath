import { Link } from 'react-router-dom';

function Navbar() {
  return (
    <nav className="navbar" role="navigation" aria-label="Main navigation">
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand" aria-label="VoxPath Home">
          <span className="navbar-logo" aria-hidden="true" style={{color: 'var(--color-accent-primary)'}}>🛡️</span>
          <span>VoxPath</span>
        </Link>

        {/* Landing Page Navigation */}
        <div className="navbar-links" style={{ display: 'none' }}>
        </div>
        <div className="navbar-links" style={{ '@media (min-width: 768px)': { display: 'flex'} }}>
          <a href="#about" className="nav-link">About</a>
          <a href="#features" className="nav-link">Features</a>
          <a href="#pricing" className="nav-link">Pricing</a>
          <div style={{ width: '1px', height: '24px', background: 'var(--color-border)' }}></div>
          <Link to="/login" className="nav-link">Log in</Link>
          <Link to="/login" className="btn btn-primary" style={{ padding: '0.625rem 1.25rem' }}>Get VoxPath</Link>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
