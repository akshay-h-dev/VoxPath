import React from 'react';
import { Link } from 'react-router-dom';

function Landing() {
  const features = [
    {
      title: "AI Answer Scoring Engine",
      desc: "Evaluates your spoken answers for Relevance, Completeness, and Clarity. Get a score out of 5 with an actionable tip to improve your next interview.",
      icon: "🎯"
    },
    {
      title: "Full Voice Navigation",
      desc: "Navigate job portals entirely with your voice. Next question, repeat question, and submit answers without ever touching a mouse or finding a button.",
      icon: "🎙️"
    },
    {
      title: "Any Portal Compatibility",
      desc: "Works on standard job portals (Naukri, Internshala, LinkedIn) as a Chrome Extension. We adapt to the employer's infrastructure automatically.",
      icon: "🧩"
    },
    {
      title: "Bias-Free Evaluation Report",
      desc: "Detects visually biased questions and provides an accommodation report, turning inaccessible interviews into fair, equitable scenarios.",
      icon: "⚖️"
    },
    {
      title: "Communication Pattern Detector",
      desc: "Real-time non-verbal feedback: Detects filler words (um, ah, like) and measures your speaking pace (WPM), so you can sound confident.",
      icon: "📈"
    }
  ];

  return (
    <main>
      {/* Hero Section */}
      <section className="hero-section" id="about">
        <div className="container hero-content">
          <div className="hero-badge">
             ⭐ Trusted by visually impaired candidates worldwide
          </div>
          <h1 className="hero-title">
            Accessibility in every interview starts with VoxPath
          </h1>
          <p className="hero-subtitle">
            VoxPath is a Chrome Extension that makes any job portal fully voice-navigable — listening to answers, analyzing communication patterns, scoring AI compatibility, and generating bias-free evaluation reports without a single screen interaction.
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'center' }}>
            <Link to="/login" className="btn btn-primary btn-lg">
              Get VoxPath Now
            </Link>
          </div>
          <p style={{ marginTop: 'var(--space-md)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
            ⏱️ 30-day money-back guarantee
          </p>
          
          
        </div>
      </section>

      {/* Features Section */}
      <section className="section" style={{ background: 'var(--color-bg-card)' }} id="features">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">One Extension. Five Features. Complete Independence.</h2>
            <p className="section-subtitle">
              Every other solution solves one problem. We solve the entire candidate journey.
            </p>
          </div>

          <div className="features-grid">
            {features.map((feature, idx) => (
              <div className="feature-card" key={idx}>
                <div className="feature-icon">{feature.icon}</div>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-desc">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="section" style={{ background: 'var(--color-bg-secondary)' }} id="pricing">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Choose your VoxPath Plan</h2>
            <p className="section-subtitle">
              Simple, transparent pricing to give you the ultimate interview advantage.
            </p>
          </div>

          <div className="pricing-grid">
            <div className="pricing-card">
              <h3 className="pricing-title">Basic</h3>
              <p style={{ color: 'var(--color-text-secondary)' }}>Perfect for occasional practice</p>
              <div className="pricing-price">
                <span className="price-currency">$</span>0<span className="price-period">/mo</span>
              </div>
              <ul className="pricing-features">
                <li><span className="check">✓</span> Voice Navigation</li>
                <li><span className="check">✓</span> Basic compatibility on portals</li>
                <li><span className="check">✓</span> Limited AI answer scoring (5/day)</li>
                <li style={{ color: 'var(--color-text-muted)', textDecoration: 'line-through' }}>Detailed Communication Feedback</li>
                <li style={{ color: 'var(--color-text-muted)', textDecoration: 'line-through' }}>Bias-Free Evaluation Reports</li>
              </ul>
              <Link to="/login" className="btn btn-outline" style={{ width: '100%' }}>Get Started</Link>
            </div>

            <div className="pricing-card popular">
              <div className="pricing-badge">Special Offer -87% Off</div>
              <h3 className="pricing-title">Premium</h3>
              <p style={{ color: 'var(--color-text-secondary)' }}>Everything you need for job hunting</p>
              <div className="pricing-price">
                <span className="price-currency">$</span>1.99<span className="price-period">/mo</span>
              </div>
              <ul className="pricing-features">
                <li><span className="check">✓</span> All Voice Navigation</li>
                <li><span className="check">✓</span> Works on ANY portal</li>
                <li><span className="check">✓</span> Unlimited AI Answer Scoring</li>
                <li><span className="check">✓</span> Advanced Communication Patterns</li>
                <li><span className="check">✓</span> Full Bias-Free PDF Reports</li>
              </ul>
              <Link to="/login" className="btn btn-primary" style={{ width: '100%' }}>Get Premium Now</Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="container">
          <p>© 2024 VoxPath. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}

export default Landing;
