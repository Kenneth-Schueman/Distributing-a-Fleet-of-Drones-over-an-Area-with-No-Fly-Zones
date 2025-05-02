import { MapPin, Shield, Route } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Fade } from 'react-awesome-reveal';
import './Home.css';

const Home = () => {
  return (
    <Fade>
      <div className="homepage">
      
        {/* Hero Section */}
        <div className="hero">
          <div className="hero-content">
            <h1>Smart Drone Fleet Router</h1>
            <p className="hero-description">
              Optimize your drone fleet routes with FAA compliance built-in
            </p>
            <Link to="/plan">
              <button className="cta-button">Plan Your Route</button>
            </Link>
          </div>
        </div>

        {/* Features Section */}
        <div className="features">
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-header">
                <MapPin className="feature-icon" />
                <h2 className="feature-title">Smart Area Partitioning</h2>
                <p className="feature-subtitle">
                  Automatically divide your target area for optimal coverage
                </p>
              </div>
              <div className="feature-content">
                Upload your map and specify the number of drones. Our system will intelligently partition the area for maximum efficiency.
              </div>
            </div>

            <div className="feature-card">
              <div className="feature-header">
                <Shield className="feature-icon" />
                <h2 className="feature-title">FAA Compliance</h2>
                <p className="feature-subtitle">
                  Real-time FAA zone checking and route optimization
                </p>
              </div>
              <div className="feature-content">
                Our system automatically checks FAA restricted zones and adjusts routes to ensure full compliance while maintaining efficiency.
                <a href='https://www.faa.gov/uas/getting_started/b4ufly' target="_blank" rel="noopener noreferrer"> Learn more.</a>
              </div>
            </div>

            <div className="feature-card">
              <div className="feature-header">
                <Route className="feature-icon" />
                <h2 className="feature-title">Dynamic Path Planning</h2>
                <p className="feature-subtitle">
                  Optimized flight paths for your entire fleet
                </p>
              </div>
              <div className="feature-content">
                Get detailed flight paths for each drone that minimize overlap and maximize coverage while respecting airspace regulations.
              </div>
            </div>
          </div>
        </div>

        {/* How It Works Section */}
        <div className="how-it-works">
          <h2>How It Works</h2>
          <div className="steps-grid">
            <div className="step">
              <div className="step-number">
                <span>1</span>
              </div>
              <h3>Upload Map</h3>
              <p>Import your target area map</p>
            </div>
            <div className="step">
              <div className="step-number">
                <span>2</span>
              </div>
              <h3>Set Fleet Size</h3>
              <p>Specify number of available drones</p>
            </div>
            <div className="step">
              <div className="step-number">
                <span>3</span>
              </div>
              <h3>Generate Routes</h3>
              <p>Get optimized flight paths</p>
            </div>
            <div className="step">
              <div className="step-number">
                <span>4</span>
              </div>
              <h3>Deploy</h3>
              <p>Execute your mission safely</p>
            </div>
          </div>
        </div>
      </div>
    </Fade>
  );
};

export default Home;