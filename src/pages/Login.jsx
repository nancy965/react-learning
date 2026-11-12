import { useState } from "react";
import axios from "axios";
import { API_URL } from "../config/axios.util";
import { useNavigate } from "react-router-dom";
import SuccessToast from "../components/SuccessToast";
import "./Login.css";
import LoginAnimationBanner from "../components/LoginAnimationBanner";
import logo from "../assets/logo.jpg";
import { useAuth } from "../context/AuthContext";
import { Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
import {
  getNavigation,
  getFirstAvailableRoute,
} from "../services/navigationService";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const [successMessage, setSuccessMessage] = useState("");

  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!email || !password) {
      setMessage("Email and password are required");
      return;
    }

    try {
      setLoading(true);

      const response = await axios.post(`${API_URL}/auth/login`, {
        email,
        password,
      });

      console.log("Login response:", response.data);

      const token = response.data.token;
      const user = response.data.user;
      const accessData = response.data.access;

      login(token, user, accessData);

      setSuccessMessage("Login successful!");

      let targetRoute = "/dashboard";
      try {
        const navResponse = await getNavigation(token);
        const navList =
          navResponse?.success &&
          Array.isArray(navResponse.data) &&
          navResponse.data.length > 0
            ? navResponse.data
            : Array.isArray(accessData) && accessData.length > 0
              ? accessData
              : null;

        if (navList) {
          localStorage.setItem("sessionNavigation", JSON.stringify(navList));
          targetRoute = getFirstAvailableRoute(navList, user?.role);
        }
      } catch (navError) {
        console.error("Failed to fetch navigation on login:", navError);
        if (Array.isArray(accessData) && accessData.length > 0) {
          localStorage.setItem("sessionNavigation", JSON.stringify(accessData));
          targetRoute = getFirstAvailableRoute(accessData, user?.role);
        }
      }

      setTimeout(() => {
        navigate(targetRoute || "/dashboard");
      }, 800);
    } catch (error) {
      console.error(error);
      setMessage(error.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <SuccessToast
        message={successMessage}
        onClose={() => setSuccessMessage("")}
      />

      <div className="login-banner-container">
        <LoginAnimationBanner />
      </div>

      <div className="login-right-panel">
        <div className="login-card">
          <div className="login-header">
            <div className="login-logo-container">
              <img src={logo} alt="EMS Logo" className="login-logo-img" />
              <div className="logo-text">
                <span className="logo-title">EMS</span>
                <span className="logo-subtitle">
                  Employee Management System
                </span>
              </div>
            </div>
            <h1>Welcome Back</h1>
            <p>Sign in to access your account</p>
          </div>

          <form onSubmit={handleLogin}>
            <div className="input-group">
              <label>Email Address</label>
              <div className="input-wrapper">
                <Mail className="input-icon" size={18} />
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="input-group">
              <label>Password</label>
              <div className="input-wrapper">
                <Lock className="input-icon" size={18} />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                </button>
              </div>
            </div>

            <div className="login-options">
              <label className="remember-me">
                <input type="checkbox" />
                <span className="checkbox-custom"></span>
                <span className="remember-text">
                  Remember me on this device
                </span>
              </label>
              <a href="#" className="forgot-password">
                Forgot password?
              </a>
            </div>

            {message && <div className="error-message">{message}</div>}

            <button
              type="submit"
              className="login-submit-btn"
              disabled={loading}
            >
              {loading ? "Logging in..." : "Log in"} <ArrowRight size={18} />
            </button>
          </form>

          <div className="login-divider">
            <span>OR</span>
          </div>

          <div className="register-link">
            Don't have an account?
            <button type="button" onClick={() => navigate("/register")}>
              Register
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
