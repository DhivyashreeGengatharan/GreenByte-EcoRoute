import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Card } from './ui/Card';
import {
  LeafIcon,
  RouteIcon,
  WindIcon,
  FlameIcon,
  ZapIcon,
  ShieldCheckIcon,
  CoinsIcon,
  TrendingDownIcon,
  ArrowUpDownIcon,
  ChevronRightIcon,
  ChartIcon,
  ExternalLinkIcon,
  ThermometerIcon
} from './ui/Icons';
import Globe3D from './3d/Globe3D';
import DigitalTwin3D from './3d/DigitalTwin3D';
import './LandingPage.css';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [activeTab, setActiveTab] = useState<'eco' | 'shortest'>('eco');

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 30);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      { threshold: 0.12 }
    );

    document.querySelectorAll('.animate-on-scroll').forEach((el) => observer.observe(el));

    return () => {
      window.removeEventListener('scroll', handleScroll);
      observer.disconnect();
    };
  }, []);

  const handleLaunchCockpit = () => {
    sessionStorage.setItem('ecoroute_explored', 'true');
    navigate('/dashboard');
  };

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleOpenMarketplace = () => {
    navigate('/marketplace');
  };

  return (
    <div className="landing-page-root">
      {/* ── Top Navigation Bar ── */}
      <header className={`landing-nav ${scrolled ? 'nav-scrolled' : ''}`}>
        <div className="landing-nav-inner">
          <div className="landing-brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="brand-badge-icon">
              <LeafIcon size={18} color="#ffffff" strokeWidth={2.4} />
            </div>
            <div className="brand-text-group">
              <span className="brand-name">EcoRoute</span>
              <span className="brand-tagline">GreenByte Intelligence</span>
            </div>
          </div>

          <nav className="nav-links">
            <a href="#why-healthier" className="nav-link">The Difference</a>
            <a href="#intelligence-grid" className="nav-link">Intelligence</a>
            <a href="#carbon-rewards" className="nav-link">Carbon Economy</a>
            <a href="#digital-twin" className="nav-link">Digital Twin</a>
            <button onClick={handleOpenMarketplace} className="nav-link-btn">
              Solutions Market
            </button>
          </nav>

          <div className="nav-actions">
            <Button
              variant="secondary"
              size="sm"
              icon={<ChevronRightIcon size={15} />}
              iconPosition="right"
              onClick={() => scrollToSection('why-healthier')}
            >
              Explore 3D Grid ↓
            </Button>
          </div>
        </div>
      </header>

      {/* ── Hero Section ── */}
      <section className="hero-section">
        <div className="hero-glow-backdrop" />
        <div className="hero-container">
          <div className="hero-content">
            <div className="hero-pill-badge">
              <Badge variant="eco" size="sm" dot>
                Real-Time Environmental Mobility Grid
              </Badge>
            </div>

            <h1 className="hero-title">
              Navigate Smarter.<br />
              <span className="gradient-text-emerald">Inhale Cleaner.</span>
            </h1>

            <p className="hero-subtitle">
              Traditional navigation routes you directly through congestion and particulate plumes. EcoRoute calculates multi-factorial environmental paths that avoid toxic emission hotspots without compromising arrival times.
            </p>

            <div className="hero-cta-group">
              <Button
                variant="primary"
                size="lg"
                onClick={() => scrollToSection('why-healthier')}
                icon={<ChevronRightIcon size={18} />}
              >
                Explore Environmental Grid ↓
              </Button>
              <Button
                variant="secondary"
                size="lg"
                onClick={() => scrollToSection('digital-twin')}
              >
                3D Digital Twin Simulation ↓
              </Button>
            </div>

            {/* Live Telemetry Bar */}
            <div className="hero-telemetry-strip">
              <div className="telemetry-item">
                <WindIcon size={16} color="var(--brand-emerald)" />
                <span>Open-Meteo PM<sub>2.5</sub> Ingestion</span>
              </div>
              <div className="telemetry-divider" />
              <div className="telemetry-item">
                <ZapIcon size={16} color="var(--accent-cyan)" />
                <span>Dynamic OSRM Speeds</span>
              </div>
              <div className="telemetry-divider" />
              <div className="telemetry-item">
                <ShieldCheckIcon size={16} color="var(--brand-mint)" />
                <span>Verified Emission Avoidance</span>
              </div>
            </div>
          </div>

          {/* Interactive 3D Planetary Digital Twin & Corridor Preview */}
          <div className="hero-preview-col" style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div style={{
              borderRadius: "24px",
              border: "1px solid rgba(0, 240, 255, 0.3)",
              background: "radial-gradient(circle at 50% 50%, rgba(15, 23, 42, 0.92) 0%, rgba(3, 7, 18, 0.98) 100%)",
              boxShadow: "0 25px 60px rgba(0, 0, 0, 0.7), 0 0 40px rgba(0, 240, 255, 0.15)",
              overflow: "hidden",
              position: "relative"
            }}>
              <Globe3D />
            </div>

            {/* Quick Corridor Selector Pills */}
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 16px",
              borderRadius: "14px",
              background: "rgba(15, 23, 42, 0.8)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              backdropFilter: "blur(12px)"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span className="pulsing-live-dot" />
                <span style={{ fontSize: "11px", fontWeight: "800", color: "#00f0ff", fontFamily: "var(--font-mono, monospace)" }}>
                  GLOBAL DISPERSION MESH
                </span>
              </div>
              <div className="toggle-pill-group">
                <button
                  type="button"
                  className={`toggle-tab ${activeTab === 'eco' ? 'active-eco' : ''}`}
                  onClick={() => setActiveTab('eco')}
                >
                  🌿 Eco Route
                </button>
                <button
                  type="button"
                  className={`toggle-tab ${activeTab === 'shortest' ? 'active-shortest' : ''}`}
                  onClick={() => setActiveTab('shortest')}
                >
                  🚀 Direct Highway
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 2: Why Shortest != Healthiest ── */}
      <section id="why-healthier" className="section-padding content-section">
        <div className="section-header-centered animate-on-scroll">
          <Badge variant="caution" size="sm">The Mobility Blindspot</Badge>
          <h2 className="section-title">Why the Shortest Path is Often the Most Toxic</h2>
          <p className="section-subtitle">
            Traditional GPS engines optimize for one variable: travel time. When thousands of vehicles funnel onto identical corridors, idling congestion concentrates deadly particulate matter into severe exposure corridors.
          </p>
        </div>

        <div className="dilemma-cards-grid animate-on-scroll">
          <Card variant="solid" padding="lg" className="dilemma-card dilemma-bad">
            <div className="dilemma-icon-badge hazard-bg">
              <FlameIcon size={24} color="#ef4444" />
            </div>
            <h3 className="dilemma-heading">Traditional GPS Navigation</h3>
            <ul className="dilemma-list">
              <li>
                <strong>Tunnel-Vision Routing:</strong> Selects industrial bypasses and bottleneck arteries solely to shave 90 seconds.
              </li>
              <li>
                <strong>Toxic In-Cabin Penetration:</strong> Severe PM2.5 particles seep through vehicle air filters into driver lungs.
              </li>
              <li>
                <strong>Fuel Waste in Idling Congestion:</strong> Low-speed stop-and-go driving spikes tailpipe combustion emissions by up to 35%.
              </li>
              <li>
                <strong>Zero Accountability:</strong> No record of environmental damage or commute exposure is ever provided to the driver.
              </li>
            </ul>
          </Card>

          <Card variant="solid" padding="lg" className="dilemma-card dilemma-good">
            <div className="dilemma-icon-badge eco-bg">
              <LeafIcon size={24} color="#10b981" />
            </div>
            <h3 className="dilemma-heading">EcoRoute Environmental Cockpit</h3>
            <ul className="dilemma-list">
              <li>
                <strong>Four-Factor Spatial Analysis:</strong> Evaluates route candidates across AQI, real-time traffic flow, building density, and ambient heat.
              </li>
              <li>
                <strong>Automated Hotspot Avoidance:</strong> Dynamically calculates perpendicular corridor shifts around heavy particulate clusters.
              </li>
              <li>
                <strong>Health First, Not Time-Blind:</strong> Recommends routes that balance clean air intake with negligible ETA differences.
              </li>
              <li>
                <strong>Tokenized Carbon Rewards:</strong> Earn verified credits for every avoided kilogram of emission, recorded to your persistent ledger.
              </li>
            </ul>
          </Card>
        </div>
      </section>

      {/* ── Section 3: The Environmental Intelligence Grid ── */}
      <section id="intelligence-grid" className="section-padding bg-subtle content-section">
        <div className="section-header-centered animate-on-scroll">
          <Badge variant="info" size="sm">Algorithmic Physics</Badge>
          <h2 className="section-title">The Four-Pillar Scoring Model</h2>
          <p className="section-subtitle">
            Every route generated by EcoRoute is decomposed into continuous geometric segments evaluated against four real-time environmental factors.
          </p>
        </div>

        <div className="features-quad-grid animate-on-scroll">
          <Card variant="glass" padding="md" className="feature-quad-card">
            <div className="feature-quad-icon"><WindIcon size={24} color="var(--brand-emerald)" /></div>
            <div className="feature-quad-weight">40% SCORING WEIGHT</div>
            <h4>Air Quality Index (AQI)</h4>
            <p>Direct atmospheric telemetry measuring micro-particles (PM2.5 and PM10) from Open-Meteo sensors mapped across your route trajectory.</p>
          </Card>

          <Card variant="glass" padding="md" className="feature-quad-card">
            <div className="feature-quad-icon"><ZapIcon size={24} color="var(--accent-cyan)" /></div>
            <div className="feature-quad-weight">30% SCORING WEIGHT</div>
            <h4>Segment Flow Ratio</h4>
            <p>OSRM per-segment speed annotations compared against free-flow highway and urban velocity baselines to penalize idling congestion.</p>
          </Card>

          <Card variant="glass" padding="md" className="feature-quad-card">
            <div className="feature-quad-icon"><ShieldCheckIcon size={24} color="var(--brand-mint)" /></div>
            <div className="feature-quad-weight">20% SCORING WEIGHT</div>
            <h4>Urban Building Density</h4>
            <p>Mapbox tilequery spatial indexing measuring structural canyons that trap combustion particulates and restrict wind dispersal.</p>
          </Card>

          <Card variant="glass" padding="md" className="feature-quad-card">
            <div className="feature-quad-icon"><ThermometerIcon size={24} color="#f59e0b" /></div>
            <div className="feature-quad-weight">10% SCORING WEIGHT</div>
            <h4>Thermal Exposure Index</h4>
            <p>Ambient microclimate temperatures identifying urban heat island effects that exacerbate ozone reactivity and vehicle cooling load.</p>
          </Card>
        </div>
      </section>

      {/* ── Section 4: Verified Carbon Economy ── */}
      <section id="carbon-rewards" className="section-padding content-section">
        <div className="section-container-split animate-on-scroll">
          <div className="split-copy">
            <Badge variant="eco" size="sm">Persistent Impact Ledger</Badge>
            <h2 className="section-title">Turn Cleaner Commutes Into Verified Carbon Capital</h2>
            <p className="section-subtitle-left">
              Every trip saved on EcoRoute isn't just an abstract statistic. Our server-side accounting engine validates avoided emissions against baseline shortest routes and deposits verified carbon credits into your profile.
            </p>

            <div className="value-points-list">
              <div className="value-point-item">
                <div className="point-icon"><CoinsIcon size={20} color="var(--brand-emerald)" /></div>
                <div>
                  <strong>Deterministic Credit Mining:</strong> Credits are awarded based on physical distance multiplied by the cleanliness quotient of your chosen route.
                </div>
              </div>
              <div className="value-point-item">
                <div className="point-icon"><TrendingDownIcon size={20} color="var(--brand-emerald)" /></div>
                <div>
                  <strong>Audit-Ready Activity History:</strong> Track your cumulative kilograms of CO2 avoided, trip timestamps, and eco-efficiency classifications in an executive timeline.
                </div>
              </div>
              <div className="value-point-item">
                <div className="point-icon"><ShieldCheckIcon size={20} color="var(--accent-cyan)" /></div>
                <div>
                  <strong>Duplicate-Proof Persistence:</strong> Built with MongoDB Atlas and local disk resilience ensuring your earned credits are never lost or double-counted.
                </div>
              </div>
            </div>

            <div className="split-action">
              <Button variant="primary" size="md" onClick={() => scrollToSection('digital-twin')}>
                Explore 3D Climate Lab ↓
              </Button>
            </div>
          </div>

          <div className="split-visual">
            <Card variant="obsidian" padding="lg" className="ledger-mock-card">
              <div className="mock-card-header">
                <div className="mock-card-title">
                  <CoinsIcon size={18} color="var(--brand-mint)" />
                  <span>CREDIT ACTIVITY LEDGER</span>
                </div>
                <Badge variant="eco" size="sm">ACTIVE LEDGER</Badge>
              </div>

              <div className="mock-summary-stats">
                <div className="mock-stat">
                  <span className="mock-stat-lbl">TOTAL CREDITS</span>
                  <span className="mock-stat-val tabular-data">1,480</span>
                </div>
                <div className="mock-stat">
                  <span className="mock-stat-lbl">CO₂ AVOIDED</span>
                  <span className="mock-stat-val tabular-data text-eco">64.8 kg</span>
                </div>
                <div className="mock-stat">
                  <span className="mock-stat-lbl">TRIPS RECORDED</span>
                  <span className="mock-stat-val tabular-data">28</span>
                </div>
              </div>

              <div className="mock-trips-list">
                <div className="mock-trip-row">
                  <div className="mock-trip-info">
                    <span className="trip-route">Downtown Corridor → Silicon Ave</span>
                    <span className="trip-meta">14.2 km · Eco Recommended</span>
                  </div>
                  <span className="trip-credits text-eco">+54 pts</span>
                </div>
                <div className="mock-trip-row">
                  <div className="mock-trip-info">
                    <span className="trip-route">Metro Ring Road → Airport Bypass</span>
                    <span className="trip-meta">32.6 km · Hotspot Avoided</span>
                  </div>
                  <span className="trip-credits text-eco">+118 pts</span>
                </div>
                <div className="mock-trip-row">
                  <div className="mock-trip-info">
                    <span className="trip-route">Central Park West → Tech Park</span>
                    <span className="trip-meta">8.4 km · Cleanest Corridor</span>
                  </div>
                  <span className="trip-credits text-eco">+36 pts</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* ── Section 5: Digital Twin Simulation Preview ── */}
      <section id="digital-twin" className="section-padding bg-subtle content-section">
        <div className="section-header-centered animate-on-scroll">
          <Badge variant="info" size="sm">Urban Simulation Engine</Badge>
          <h2 className="section-title">Digital Twin Climate Laboratories</h2>
          <p className="section-subtitle">
            Simulate the municipal impact of high-efficiency green walls, microalgae bioreactors, and building envelope retrofits before deployment. Export executive PDF impact reports with verified Chart.js telemetry.
          </p>
        </div>

        <div className="twin-preview-container animate-on-scroll" style={{ width: "100%", maxWidth: "1160px", margin: "32px auto 0", height: "620px" }}>
          <DigitalTwin3D initialIntervention="green-wall" />
        </div>
      </section>

      {/* ── Section 6: Marketplace Showcase ── */}
      <section className="section-padding content-section">
        <div className="marketplace-teaser-card animate-on-scroll">
          <div className="teaser-content">
            <Badge variant="eco" size="sm">Climate Solutions Network</Badge>
            <h2>Connect with Certified Technology Providers</h2>
            <p>
              Transition from simulation to physical deployment. Browse verified commercial vendors offering biological filtration, building envelope retrofits, and carbon capture infrastructure.
            </p>
            <Button
              variant="obsidian"
              size="md"
              onClick={handleOpenMarketplace}
              icon={<ExternalLinkIcon size={16} />}
              iconPosition="right"
            >
              Browse Solutions Directory
            </Button>
          </div>
          <div className="teaser-pills">
            <div className="tech-pill">🌿 Living Green Walls</div>
            <div className="tech-pill">🧪 Microalgae CCUS</div>
            <div className="tech-pill">🏭 Direct Air Scrubbers</div>
            <div className="tech-pill">🏗️ Envelope Retrofits</div>
            <div className="tech-pill">☀️ High-Albedo Cool Roofs</div>
          </div>
        </div>
      </section>

      {/* ── Final Call to Action ── */}
      <section className="final-cta-section">
        <div className="final-cta-container animate-on-scroll">
          <Badge variant="eco" size="sm" dot>
            Environmental Mobility Grid
          </Badge>
          <h2>Ready to transform your daily commute?</h2>
          <p>
            Experience precision environmental intelligence. Choose the route that keeps your lungs healthy and your city clean.
          </p>
          <div className="cta-button-wrapper">
            <Button 
              variant="primary" 
              size="lg" 
              onClick={handleLaunchCockpit} 
              icon={<RouteIcon size={20} />}
              className="btn-pulse-glow"
            >
              Launch Navigation Cockpit →
            </Button>
          </div>
        </div>
      </section>

      {/* ── Minimalist Footer ── */}
      <footer className="landing-footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <div className="brand-badge-icon sm">
              <LeafIcon size={14} color="#ffffff" strokeWidth={2.4} />
            </div>
            <span>EcoRoute · GreenByte Sustainable Mobility Grid</span>
          </div>
          <div className="footer-links">
            <span className="footer-meta">Powered by Open-Meteo & OSRM Engine</span>
            <span className="footer-meta">© {new Date().getFullYear()} All Rights Reserved</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
