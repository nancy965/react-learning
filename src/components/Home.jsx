import { useNavigate } from "react-router-dom";
import logo from "../assets/logo.jpg";
import "./Home.css";

function Home() {
  const navigate = useNavigate();

  return (
    <div className="home-page">
      {/* Background Soft Waves matching Picture 1 */}
      <div className="home-waves-container">
        <svg
          className="home-waves-svg"
          viewBox="0 0 1440 900"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="homeBlueWave1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#bfdbfe" stopOpacity="0.55" />
              <stop offset="50%" stopColor="#dbeafe" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#eff6ff" stopOpacity="0.1" />
            </linearGradient>
            <linearGradient id="homeBlueWave2" x1="0%" y1="0%" x2="100%" y2="80%">
              <stop offset="0%" stopColor="#93c5fd" stopOpacity="0.4" />
              <stop offset="60%" stopColor="#bfdbfe" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="homeBlueWave3" x1="10%" y1="10%" x2="90%" y2="90%">
              <stop offset="0%" stopColor="#cbd5e1" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#94a3b8" stopOpacity="0.05" />
            </linearGradient>
            <linearGradient id="homePeachWaveLeft" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#fed7aa" stopOpacity="0.8" />
              <stop offset="60%" stopColor="#ffedd5" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="homePeachWaveRight" x1="100%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#fed7aa" stopOpacity="0.8" />
              <stop offset="60%" stopColor="#ffedd5" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Top and middle gentle wave sweeps */}
          <path
            d="M-50,140 C280,-40 540,260 980,60 C1240,-40 1440,70 1550,110 L1550,-50 L-50,-50 Z"
            fill="url(#homeBlueWave1)"
          />
          <path
            d="M-50,260 C300,100 620,360 1140,160 C1360,90 1490,180 1550,210 L1550,-50 L-50,-50 Z"
            fill="url(#homeBlueWave2)"
          />
          <path
            d="M-50,400 C360,240 740,460 1200,290 C1410,220 1500,310 1550,340 L1550,-50 L-50,-50 Z"
            fill="url(#homeBlueWave3)"
          />

          {/* Bottom-left soft peach wave */}
          <path
            d="M-50,620 C140,600 300,700 400,950 L-50,950 Z"
            fill="url(#homePeachWaveLeft)"
          />
          <path
            d="M-50,720 C180,660 320,780 460,950 L-50,950 Z"
            fill="#fed7aa"
            fillOpacity="0.4"
          />

          {/* Bottom-right soft peach wave */}
          <path
            d="M920,950 C1080,740 1290,770 1550,680 L1550,950 Z"
            fill="url(#homePeachWaveRight)"
          />
          <path
            d="M1060,950 C1200,810 1370,830 1550,760 L1550,950 Z"
            fill="#fed7aa"
            fillOpacity="0.4"
          />
        </svg>
      </div>

      {/* Main Centered White Card */}
      <div className="home-card">
        {/* Logo and EMS header block */}
        <div className="home-logo-container">
          <img src={logo} alt="EMS Logo" className="home-logo-img" />
          <div className="home-logo-text">
            <span className="home-logo-title">EMS</span>
            <span className="home-logo-subtitle">
              Employee Management System
            </span>
          </div>
        </div>

        {/* Small orange accent divider line */}
        <div className="home-divider" />

        {/* Welcome Title */}
        <h1 className="home-title">Welcome</h1>

        {/* Subtitle */}
        <p className="home-subtitle">
          Welcome to our platform. Please login or create an account to
          continue.
        </p>

        {/* Action Buttons */}
        <div className="home-buttons">
          <button
            className="home-btn home-btn-login"
            onClick={() => navigate("/login")}
          >
            Login
          </button>
          <button
            className="home-btn home-btn-register"
            onClick={() => navigate("/register")}
          >
            Register
          </button>
        </div>
      </div>
    </div>
  );
}

export default Home;
