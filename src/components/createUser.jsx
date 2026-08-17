import { useState } from "react";
import { createUser as createUserApi } from "../services/userService";
import UserForm from "./UserForm";

function CreateUser({ refreshUsers, onSuccess }) {
  const [user, setUser] = useState({
    name: "",
    email: "",
    age: "",
    role: "employee",
    is_active: true,
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  //reset form
  const resetForm = () => {
    setUser({
      name: "",
      email: "",
      age: "",
      role: "employee",
      is_active: true,
    });

    setError("");
  };

  //submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");

    //Prevent duplicate submission
    if (loading) {
      return;
    }

    //validation
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

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email)) {
      setError("Enter valid email");
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

    try {
      setLoading(true);

      await createUserApi({
        name: user.name.trim(),
        email: user.email.trim(),
        age: Number(user.age),
        role: user.role,
        is_active: user.is_active,
      });

      //success message
      onSuccess("User added successfully!");

      //reset form
      resetForm();

      //refresh users table
      refreshUsers();
    } catch (error) {
      console.log("CREATE USER ERROR:", error);

      if (error.response) {
        setError(error.response.data.message || "Something went wrong");
      } else {
        setError("Something went wrong");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h3>Add User</h3>

      <UserForm
        formData={user}
        setFormData={setUser}
        onSubmit={handleSubmit}
        loading={loading}
        error={error}
        mode="create"
      />
    </div>
  );
}

export default CreateUser;
