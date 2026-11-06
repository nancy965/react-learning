import { useAuth } from "../context/AuthContext";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./createUser.css";
import { useTheme } from "../context/ThemeContext";
import {
  createUser as createUserApi,
  getAdmins,
} from "../services/userService";
import UserForm from "./UserForm";

function CreateUser() {
  const navigate = useNavigate();
  const { user: loggedInUser } = useAuth();
  const { theme } = useTheme();

  const userRole = loggedInUser?.role;

  const [user, setUser] = useState({
    name: "",
    email: "",
    password: "",
    age: "",
    role: "employee",
    is_active: true,
    adminId: "",
    countryId: "",
    stateId: "",
    cityId: "",
    pincodeId: "",
    pincode: "",
    roleId: "",
  });

  const [admins, setAdmins] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchAdmins = async () => {
      if (userRole !== "general_admin") return;

      try {
        const response = await getAdmins();
        setAdmins(response.data);
      } catch (error) {
        console.log("FETCH ADMINS ERROR:", error);
        setError("Failed to fetch admins");
      }
    };

    fetchAdmins();
  }, [userRole]);

  const resetForm = () => {
    setUser({
      name: "",
      email: "",
      password: "",
      age: "",
      role: "employee",
      is_active: true,
      adminId: "",
      countryId: "",
      stateId: "",
      cityId: "",
      pincodeId: "",
      pincode: "",
      roleId: "",
    });

    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (loading) return;

    if (!user.name.trim()) {
      setError("Name is required");
      return;
    }

    if (!/^[A-Za-z ]+$/.test(user.name.trim())) {
      setError("Name should contain only letters");
      return;
    }

    if (!user.email.trim()) {
      setError("Email is required");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email.trim())) {
      setError("Enter valid email");
      return;
    }

    if (!user.password) {
      setError("Password is required");
      return;
    }

    if (user.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (!user.age) {
      setError("Age is required");
      return;
    }

    if (user.age < 18 || user.age > 100) {
      setError("Age must be between 18 and 100");
      return;
    }

    if (userRole === "admin" && user.role !== "employee") {
      setError("Admin can create employees only");
      return;
    }

    if (
      userRole === "general_admin" &&
      user.role === "employee" &&
      !user.adminId
    ) {
      setError("Please select an admin");
      return;
    }

    if (user.role === "employee" && !user.countryId) {
      setError("Please select a country");
      return;
    }

    if (user.role === "employee" && !user.stateId) {
      setError("Please select a state");
      return;
    }

    if (user.role === "employee" && !user.cityId) {
      setError("Please select a city");
      return;
    }

    if (user.role === "employee" && !user.pincodeId) {
      setError("Please select a valid pincode");
      return;
    }

    try {
      setLoading(true);

      await createUserApi({
        name: user.name.trim(),
        email: user.email.trim(),
        age: Number(user.age),
        role: user.role,
        password: user.password,
        is_active: user.is_active,
        adminId: user.adminId || undefined,
        countryId: user.countryId,
        stateId: user.stateId,
        cityId: user.cityId,
        pincodeId: user.pincodeId,
        roleId: user.roleId || undefined,
      });

      resetForm();
      navigate("/users");
    } catch (error) {
      console.log("CREATE USER ERROR:", error);

      if (error.response) {
        setError(
          error.response.data?.message || "Something went wrong"
        );
      } else {
        setError("Something went wrong");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    navigate("/users");
  };

  return (
    <div className={`create-user-container ${theme}-theme`}>
      <div className="create-user-header-row">
        <div>
          <span className="standard-page-eyebrow">USER MANAGEMENT</span>
          <h1 className="standard-page-title">Create User</h1>
          <p className="standard-page-subtitle">
            Fill in the details to create a new user.
          </p>
        </div>
      </div>

      <div className="create-user-form-wrapper">
        <UserForm
          formData={user}
          setFormData={setUser}
          setError={setError}
          onSubmit={handleSubmit}
          loading={loading}
          error={error}
          mode="create"
          userRole={userRole}
          admins={admins}
          onClose={handleClose}
        />
      </div>
    </div>
  );
}

export default CreateUser;