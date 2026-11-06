import Input from "./Input";
import Button from "./Button";
import { useState } from "react";
import axios from "axios";
import { API_URL } from "../config/axios.util";
import { useNavigate } from "react-router-dom";
import SuccessToast from "./SuccessToast";
import "./Login.css";
import { useAuth } from "../context/AuthContext";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

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

      login(token, user);

      // SUCCESS TOAST
      setSuccessMessage("Login successful!");

      // Wait a little so user can see the toast
      setTimeout(() => {
        navigate("/dashboard");
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

      <div className="login-card">
        <div className="login-header">
          <h1>Log in</h1>

          <p>Enter your credentials to access your account</p>
        </div>

        <form onSubmit={handleLogin}>
          <Input
            label="Email Address"
            name="email"
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Input
            label="Password"
            name="password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {message && <div className="error-message">{message}</div>}

          <Button type="submit" className="login-button" disabled={loading}>
            {loading ? "Logging in..." : "Log in"}
          </Button>
        </form>

        <div className="register-link">
          Don't have an account?
          <button type="button" onClick={() => navigate("/register")}>
            Register
          </button>
        </div>

        <div className="login-footer">Secure Employee Management System</div>
      </div>
    </div>
  );
}

export default Login;
