import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  LeafIcon, 
  SearchIcon, 
  ShieldCheckIcon, 
  SlidersIcon, 
  ChevronRightIcon 
} from './ui/Icons';
import Button from './ui/Button';
import { Badge } from './ui/Badge';
import './Marketplace.css';

interface Vendor {
  id: string;
  name: string;
  intervention: string;
  logo: string;
  website: string;
  price: string;
  description: string;
  location: string;
  rating: number;
  certifications: string[];
}

const vendors: Vendor[] = [
  // Green Wall Vendors
  {
    id: 'gw1',
    name: 'Ambius',
    intervention: 'Green Wall',
    logo: '🌿',
    website: 'https://www.ambius.com',
    price: '$150-300/sq ft',
    description: 'Leading provider of interior and exterior green wall systems with bespoke architectural design capabilities.',
    location: 'Nationwide (US)',
    rating: 4.8,
    certifications: ['LEED Certified', 'Green Building Council']
  },
  {
    id: 'gw2',
    name: 'GSky Plant Systems',
    intervention: 'Green Wall',
    logo: '🏢',
    website: 'https://www.gsky.com',
    price: '$200-400/sq ft',
    description: 'Award-winning green wall systems for interior and exterior spaces, enhancing pedestrian air quality.',
    location: 'Global',
    rating: 4.9,
    certifications: ['ISO 14001', 'Living Building Challenge']
  },

  // Algae Panel Vendors
  {
    id: 'ap1',
    name: 'Alcarbo Technologies',
    intervention: 'Algae Panel',
    logo: '🧪',
    website: 'https://www.alcarbotechnologies.com.hk',
    price: '$500-800/panel',
    description: 'Revolutionary algae photobioreactor systems engineered to neutralize high-density urban emissions.',
    location: 'Hong Kong, Global',
    rating: 4.7,
    certifications: ['Carbon Trust Certified', 'ISO 9001']
  },
  {
    id: 'ap2',
    name: 'Carbelim',
    intervention: 'Algae Panel',
    logo: '🔬',
    website: 'https://www.carbelim.io',
    price: '$600-1000/panel',
    description: 'Microalgae CCUS technology transforming street-level exhaust into valuable bioplastic biomass.',
    location: 'Europe, North America',
    rating: 4.6,
    certifications: ['EU Carbon Removal Certified', 'Verified Carbon Standard']
  },

  // Direct Air Capture Vendors
  {
    id: 'dac1',
    name: 'Climeworks',
    intervention: 'Direct Air Capture',
    logo: '🏭',
    website: 'https://climeworks.com',
    price: '$600-1200/tonne',
    description: 'Pioneer in industrial air capture technology with modular collectors powered entirely by clean geothermal & solar.',
    location: 'Switzerland, Global',
    rating: 4.9,
    certifications: ['Gold Standard', 'Verified Carbon Standard', 'ISO 14064']
  },
  {
    id: 'dac2',
    name: 'Carbon Engineering',
    intervention: 'Direct Air Capture',
    logo: '⚙️',
    website: 'https://carbonengineering.com',
    price: '$400-800/tonne',
    description: 'Megatonne-scale direct air capture technology with permanent deep geological mineral storage solutions.',
    location: 'Canada, US',
    rating: 4.8,
    certifications: ['California LCFS', 'Clean Development Mechanism']
  },

  // Building Retrofit Vendors
  {
    id: 'br1',
    name: 'Efficient Home LLC',
    intervention: 'Building Retrofit',
    logo: '🏗️',
    website: 'https://efficienthomellc.com',
    price: '$5,000-25,000/bldg',
    description: 'Comprehensive energy audits, high-performance insulation, and building envelope retrofits.',
    location: 'Mid-Atlantic (US)',
    rating: 4.7,
    certifications: ['BPI Certified', 'ENERGY STAR Partner']
  },
  {
    id: 'br2',
    name: 'BlocPower',
    intervention: 'Building Retrofit',
    logo: '⚡',
    website: 'https://www.blocpower.io',
    price: '$10,000-50,000/bldg',
    description: 'Climate tech company turning aging urban infrastructure into all-electric, energy-smart clean buildings.',
    location: 'New York, Major US Cities',
    rating: 4.8,
    certifications: ['B Corp Certified', 'USGBC Member']
  },

  // Biochar Vendors
  {
    id: 'bc1',
    name: 'Wakefield Biochar',
    intervention: 'Biochar',
    logo: '🪨',
    website: 'https://www.wakefieldbiochar.com',
    price: '$2-5/lb bulk',
    description: 'FSC-certified biochar soil conditioner for roadway bioretention cells, urban parks, and carbon storage.',
    location: 'US Nationwide',
    rating: 4.7,
    certifications: ['OMRI Listed', 'FSC Certified', 'USDA BioPreferred']
  },
  {
    id: 'bc2',
    name: 'Pacific Biochar',
    intervention: 'Biochar',
    logo: '🌱',
    website: 'https://pacificbiochar.com',
    price: '$150-300/cubic yard',
    description: 'Carbon-negative biochar manufacturing from forestry residues with certified carbon removal credits.',
    location: 'Western US',
    rating: 4.8,
    certifications: ['IBI Certified', 'Puro.earth Verified']
  },

  // Cool Roof Vendors
  {
    id: 'cr1',
    name: 'GAF Energy',
    intervention: 'Cool Roof',
    logo: '☀️',
    website: 'https://www.gaf.energy',
    price: '$4-8/sq ft',
    description: 'Solar roof systems and high-albedo cool roof membranes engineered to mitigate urban heat island effects.',
    location: 'US Nationwide',
    rating: 4.8,
    certifications: ['CRRC Rated', 'ENERGY STAR', 'UL Certified']
  },
  {
    id: 'cr2',
    name: 'CertainTeed',
    intervention: 'Cool Roof',
    logo: '🏠',
    website: 'https://www.certainteed.com',
    price: '$3-7/sq ft',
    description: 'Solar reflective roofing granules and cool membrane materials reflecting solar radiation.',
    location: 'North America',
    rating: 4.6,
    certifications: ['Cool Roof Rating Council', 'LEED Point Contributor']
  }
];

const interventionTypes = [
  'All Solutions',
  'Green Wall',
  'Algae Panel',
  'Direct Air Capture',
  'Building Retrofit',
  'Biochar',
  'Cool Roof'
];

export const Marketplace: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIntervention, setSelectedIntervention] = useState('All Solutions');
  const navigate = useNavigate();

  const filteredVendors = vendors.filter(vendor => {
    const matchesSearch = vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vendor.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vendor.location.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesIntervention = selectedIntervention === 'All Solutions' || 
                               vendor.intervention === selectedIntervention;
    
    return matchesSearch && matchesIntervention;
  });

  const handleSimulateVendor = (_interventionName: string) => {
    navigate('/dashboard');
  };

  return (
    <div className="marketplace-container">
      {/* Navigation Header */}
      <header className="marketplace-top-nav">
        <Link to="/dashboard" className="marketplace-back-btn">
          <span>←</span>
          <span>Back to Cockpit</span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Badge variant="eco" size="md">
            12 Certified Solutions
          </Badge>
        </div>
      </header>

      {/* Hero Header */}
      <section className="marketplace-hero">
        <div className="marketplace-hero-badge">
          <ShieldCheckIcon size={14} color="#34d399" />
          <span>Verified Climate Infrastructure</span>
        </div>
        <h1>Climate Technology & Solutions Marketplace</h1>
        <p>
          Connect with certified vendors providing validated carbon removal, vertical bio-canopies, photobioreactors, and heat island mitigation systems.
        </p>
      </section>

      {/* Filter and Search Controls */}
      <div className="marketplace-controls-box">
        <div className="marketplace-search-row">
          <div className="marketplace-search-input-wrap">
            <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}>
              <SearchIcon size={16} />
            </span>
            <input
              type="text"
              placeholder="Search by vendor, technology, or coverage area..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="marketplace-search-input"
            />
          </div>

          <span style={{ fontSize: '13px', color: '#94a3b8' }}>
            Showing <strong>{filteredVendors.length}</strong> of <strong>{vendors.length}</strong> vendors
          </span>
        </div>

        {/* Category Pills */}
        <div className="marketplace-pills-row">
          {interventionTypes.map((type) => (
            <button
              type="button"
              key={type}
              className={`marketplace-pill-btn ${selectedIntervention === type ? 'active' : ''}`}
              onClick={() => setSelectedIntervention(type)}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Vendors Grid */}
      <div className="marketplace-vendors-grid">
        {filteredVendors.map((vendor) => (
          <article key={vendor.id} className="vendor-card">
            <div className="vendor-header">
              <div className="vendor-brand-group">
                <div className="vendor-logo-box">{vendor.logo}</div>
                <div>
                  <h3 className="vendor-title">{vendor.name}</h3>
                  <span className="vendor-intervention-tag">{vendor.intervention}</span>
                </div>
              </div>
              <div className="vendor-rating-chip">
                <span>★</span>
                <span>{vendor.rating.toFixed(1)}</span>
              </div>
            </div>

            <p className="vendor-description">{vendor.description}</p>

            <div className="vendor-specs-row">
              <span className="vendor-price">{vendor.price}</span>
              <span className="vendor-location">📍 {vendor.location}</span>
            </div>

            <div className="vendor-certs-wrap">
              {vendor.certifications.map((cert) => (
                <span key={cert} className="vendor-cert-badge">
                  ✓ {cert}
                </span>
              ))}
            </div>

            <div className="vendor-card-actions">
              <a 
                href={vendor.website}
                target="_blank"
                rel="noopener noreferrer"
                style={{ flex: 1, textDecoration: 'none' }}
              >
                <Button 
                  variant="primary" 
                  size="sm" 
                  style={{ width: '100%' }}
                >
                  Visit Portal
                </Button>
              </a>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleSimulateVendor(vendor.intervention)}
                icon={<SlidersIcon size={14} />}
                title="Open in Digital Twin Simulation Laboratory"
              >
                Simulate
              </Button>
            </div>
          </article>
        ))}
      </div>

      {/* No Results Empty State */}
      {filteredVendors.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          background: 'rgba(15, 23, 42, 0.4)',
          borderRadius: '16px',
          maxWidth: '600px',
          margin: '0 auto',
          border: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          <LeafIcon size={40} color="#64748b" />
          <h3 style={{ fontSize: '18px', color: '#f8fafc', margin: '12px 0 6px 0' }}>No Solutions Found</h3>
          <p style={{ color: '#94a3b8', fontSize: '13px', margin: 0 }}>
            No vendors matched "{searchTerm}". Try clearing your search or switching to "All Solutions".
          </p>
        </div>
      )}
    </div>
  );
};

export default Marketplace;