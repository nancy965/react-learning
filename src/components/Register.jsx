import { useState } from "react";
import axios from "axios";
import { API_URL } from "../config/axios.util";
import { useNavigate } from "react-router-dom";
import SuccessToast from "./SuccessToast";
import "./Register.css";
import registerBanner from "../assets/register-banner.png";
import logo from "../assets/logo.jpg";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  Calendar,
  ArrowRight,
} from "lucide-react";

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

function Register() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    age: "",
    role: "employee",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setMessage("");
    setSuccessMessage("");

    if (!formData.name.trim()) {
      setMessage("Name is required");
      return;
    }

    if (!/^[A-Za-z ]+$/.test(formData.name.trim())) {
      setMessage("Name can contain only letters and spaces");
      return;
    }

    if (!formData.email.trim()) {
      setMessage("Email is required");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setMessage("Please enter a valid email address");
      return;
    }

    if (!formData.password) {
      setMessage("Password is required");
      return;
    }
    if (formData.password.length < 6) {
      setMessage("Password must be at least 6 characters");
      return;
    }

    if (!formData.age) {
      setMessage("Age is required");
      return;
    }
    const numericAge = Number(formData.age);
    if (numericAge < 18 || numericAge > 100) {
      setMessage("Age must be between 18 and 100");
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post(`${API_URL}/auth/register`, {
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
        age: numericAge,
        role: formData.role,
      });

      console.log("Register response:", response.data);
      setSuccessMessage("Registration successful!");
      setTimeout(() => {
        navigate("/login");
      }, 1000);
    } catch (error) {
      console.error(error);
      setMessage(error.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = () => {
    // Just a placeholder since the user doesn't want functionality removed or added
    alert("Google sign up not implemented");
  };

  return (
    <div className="register-page">
      <SuccessToast
        message={successMessage}
        onClose={() => setSuccessMessage("")}
      />
      <div className="register-banner-container">
        <img
          src={registerBanner}
          alt="EMS Registration"
          className="register-banner-image"
        />
      </div>
      <div className="register-right-panel">
        <div className="register-card">
          <div className="register-header-top">
            <div className="register-logo-container">
              <img src={logo} alt="EMS Logo" className="register-logo-img" />
              <div className="logo-text">
                <span className="logo-title">EMS</span>
                <span className="logo-subtitle">
                  Employee Management System
                </span>
              </div>
            </div>
            <div className="register-titles">
              <h1>Create Account</h1>
              <p>Join EMS and start managing effortlessly</p>
            </div>
          </div>

          <form onSubmit={handleRegister}>
            <div className="input-group">
              <label>Full Name</label>
              <div className="input-wrapper">
                <User className="input-icon" size={18} />
                <input
                  type="text"
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>
            </div>

            <div className="input-group">
              <label>Email Address</label>
              <div className="input-wrapper">
                <Mail className="input-icon" size={18} />
                <input
                  type="email"
                  placeholder="Enter your email address"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
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
                  placeholder="Create a strong password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
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
              <p className="input-hint">
                Use at least 8 characters with a mix of letters, numbers and
                symbols.
              </p>
            </div>

            <div className="input-row">
              <div className="input-group half-width">
                <label>Age</label>
                <div className="input-wrapper">
                  <Calendar className="input-icon" size={18} />
                  <input
                    type="number"
                    placeholder="Enter your age"
                    value={formData.age}
                    onChange={(e) =>
                      setFormData({ ...formData, age: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div className="input-group half-width">
                <label>Role</label>
                <div className="input-wrapper">
                  <User className="input-icon" size={18} />
                  <select
                    value={formData.role}
                    onChange={(e) =>
                      setFormData({ ...formData, role: e.target.value })
                    }
                    required
                  >
                    <option value="employee">Employee</option>
                    <option value="manager">Manager</option>
                  </select>
                </div>
              </div>
            </div>

            {message && <div className="error-message">{message}</div>}

            <button
              type="submit"
              className="register-submit-btn"
              disabled={loading}
            >
              {loading ? "Creating..." : "Create Account"}{" "}
              <ArrowRight size={18} />
            </button>
          </form>

          <div className="login-divider">
            <span>OR</span>
          </div>

          <button
            type="button"
            className="google-signup-btn"
            onClick={handleGoogleSignup}
          >
            <GoogleIcon /> Sign up with Google
          </button>

          <div className="register-link">
            Already have an account?
            <button type="button" onClick={() => navigate("/login")}>
              Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;
