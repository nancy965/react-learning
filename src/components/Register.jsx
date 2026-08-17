import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import SuccessToast from "./SuccessToast";
import UserForm from "./UserForm";
import "./Register.css";

function Register() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    age: "",
    role: "employee",
  });

  const [message, setMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const handleRegister = async (e) => {
    e.preventDefault();
    setMessage("");
    setSuccessMessage("");

//name validation
    if (!formData.name.trim()) {
      setMessage("Name is required");
      return;
    }

    if (!/^[A-Za-z ]+$/.test(formData.name.trim())) {
      setMessage("Name can contain only letters and spaces");
      return;
    }

//email validation
    if (!formData.email.trim()) {
      setMessage("Email is required");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setMessage("Please enter a valid email address");
      return;
    }

//pass validationn
    if (!formData.password) {
      setMessage("Password is required");
      return;
    }
    if (formData.password.length < 6) {
      setMessage("Password must be at least 6 characters");
      return;
    }

//age validation
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
      const response = await axios.post(
        "http://localhost:5000/auth/register",
        {
          name: formData.name.trim(),
          email: formData.email.trim(),
          password: formData.password,
          age: numericAge,
          role: formData.role,
        }
      );

      console.log("Register response:", response.data);
      setSuccessMessage("Registration successful!");
      setTimeout(() => {
        navigate("/login");
      }, 1000);

    } catch (error) {
      console.error(error);
      setMessage(
        error.response?.data?.message || "Registration failed"
      );

    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page">
      <SuccessToast
        message={successMessage}
        onClose={() => setSuccessMessage("")}/>
      <div className="register-card">
        <div className="register-header">
          <h1>Create Account</h1>
          <p>Register to continue</p>
        </div>
        <UserForm
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleRegister}
          loading={loading}
          error={message}
          mode="register"/>

        <div className="login-link">
          Already have an account?
          <button onClick={() => navigate("/login")}>
            Login
          </button>
        </div>
      </div>
    </div>
  );
}
export default Register;