import Input from "./Input";
import Button from "./Button";

function UserForm({
  formData,
  setFormData,
  onSubmit,
  loading,
  error,
  mode = "register",
}) {
  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "age") {
      // Allow empty field
      if (value === "") {
        setFormData({
          ...formData,
          age: "",
        });
        return;
      }

      // Only allow numbers
      if (!/^\d+$/.test(value)) {
        return;
      }

      // Maximum age = 100
      if (Number(value) > 100) {
        return;
      }
    }

    setFormData({
      ...formData,
      [name]: value,
    });
  };

  // Prevent invalid age characters
  const handleAgeKeyDown = (e) => {
    if (
      e.key === "-" ||
      e.key === "+" ||
      e.key === "e" ||
      e.key === "E"
    ) {
      e.preventDefault();
    }
  };

  // =========================
  // REGISTER FORM
  // =========================

  if (mode === "register") {
    return (
      <form onSubmit={onSubmit}>
        <Input
          label="Name"
          name="name"
          type="text"
          placeholder="Enter your name"
          value={formData.name}
          onChange={handleChange}
          required
        />

        <Input
          label="Email"
          name="email"
          type="email"
          placeholder="Enter your email"
          value={formData.email}
          onChange={handleChange}
          required
        />

        <Input
          label="Password"
          name="password"
          type="password"
          placeholder="Enter your password"
          value={formData.password}
          onChange={handleChange}
          required
        />

        <Input
          label="Age"
          name="age"
          type="number"
          placeholder="Enter your age"
          min="18"
          max="100"
          value={formData.age}
          onChange={handleChange}
          onKeyDown={handleAgeKeyDown}
          required
        />

        <div className="input-group">
          <label>Role</label>

          <select
            name="role"
            value={formData.role}
            onChange={handleChange}
          >
            <option value="employee">Employee</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        {error && <p className="error-message">{error}</p>}

        <Button
          type="submit"
          className="register-button"
          disabled={loading}
        >
          {loading ? "Registering..." : "Register"}
        </Button>
      </form>
    );
  }

  // =========================
  // CREATE USER FORM
  // OLD UI STRUCTURE
  // =========================

  return (
    <form onSubmit={onSubmit}>
      {/* NAME */}
      <input
        type="text"
        name="name"
        placeholder="Name"
        value={formData.name}
        onChange={handleChange}
      />

      {/* EMAIL */}
      <input
        type="email"
        name="email"
        placeholder="Email"
        value={formData.email}
        onChange={handleChange}
      />

      {/* AGE */}
      <input
        type="number"
        name="age"
        placeholder="Age"
        min="18"
        max="100"
        value={formData.age}
        onChange={handleChange}
        onKeyDown={handleAgeKeyDown}
      />

      {/* ROLE */}
      <select
        name="role"
        value={formData.role}
        onChange={handleChange}
      >
        <option value="employee">Employee</option>
        <option value="admin">Admin</option>
      </select>

      {/* ACTIVE / INACTIVE */}
      {/* ACTIVE / INACTIVE + SAVE + RESET */}
<div>
  <select
    name="is_active"
    value={formData.is_active ? "active" : "inactive"}
    onChange={(e) =>
      setFormData({
        ...formData,
        is_active: e.target.value === "active",
      })
    }
  >
    <option value="active">Active</option>
    <option value="inactive">Inactive</option>
  </select>

  <Button type="submit" disabled={loading}>
    {loading ? "Saving..." : "Save"}
  </Button>

  <Button
    type="button"
    onClick={() =>
      setFormData({
        name: "",
        email: "",
        age: "",
        role: "employee",
        is_active: true,
      })
    }
    disabled={loading}
  >
    Reset
  </Button>
</div>
    </form>
  );
}

export default UserForm;