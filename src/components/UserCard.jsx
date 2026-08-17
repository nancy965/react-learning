
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import Modal from "./Modal";
import ConfirmDialog from "./ConfirmDialog";
import Button from "./Button";

import {
  updateUser,
  deleteUser,
} from "../services/userService";

function UserCard({
  user,
  refreshUsers,
  isAdmin,
  onSuccess,
}) {
  const navigate = useNavigate();

  const [showModal, setShowModal] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [formData, setFormData] = useState({
    name: user.name,
    email: user.email,
    age: user.age,
    role: user.role || "employee",
    is_active: user.is_active ?? true,
  });

  const [error, setError] = useState("");
  const [updateLoading, setUpdateLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

 //handle input changes

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData({
      ...formData,
      [name]: value,
    });
  };

 //edit

  const handleEdit = () => {
    setFormData({
      name: user.name,
      email: user.email,
      age: user.age,
      role: user.role || "employee",
      is_active: user.is_active ?? true,
    });

    setError("");
    setShowModal(true);
  };

  //update user
  const handleUpdate = async () => {
    setError("");

    if (updateLoading) {
      return;
    }

    // NAME
    if (!formData.name.trim()) {
      setError("Name is required");
      return;
    }

    if (!/^[A-Za-z ]+$/.test(formData.name.trim())) {
      setError("Name should contain only letters");
      return;
    }

    // EMAIL
    if (!formData.email.trim()) {
      setError("Email is required");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError("Enter valid email");
      return;
    }

    // AGE
    if (!formData.age) {
      setError("Age is required");
      return;
    }

    if (formData.age < 1 || formData.age > 100) {
      setError("Age must be between 1 and 100");
      return;
    }

    try {
      setUpdateLoading(true);

      await updateUser(user.id, {
        name: formData.name.trim(),
        email: formData.email.trim(),
        age: Number(formData.age),
        role: formData.role,
        is_active: formData.is_active,
      });

      setShowModal(false);

      onSuccess("User updated successfully!");

      refreshUsers();

    } catch (error) {
      console.log("UPDATE ERROR:", error);

      setError(
        error.response?.data?.message ||
        "Something went wrong"
      );

    } finally {
      setUpdateLoading(false);
    }
  };

  //delete user
  const handleDelete = async () => {
    if (deleteLoading) {
      return;
    }

    try {
      setDeleteLoading(true);

      await deleteUser(user.id);

      setShowConfirm(false);

      onSuccess("User deleted successfully!");

      refreshUsers();

    } catch (error) {
      console.log("DELETE ERROR:", error);

      setShowConfirm(false);

      setError(
        error.response?.data?.message ||
        "Something went wrong"
      );

    } finally {
      setDeleteLoading(false);
    }
  };

  //table form

  return (
    <>
      <div className="user-row">

        {/* NAME */}
        <div className="user-name">
          {user.name}
        </div>

        {/* EMAIL */}
        <div className="user-email">
          {user.email}
        </div>

        {/* AGE */}
        <div className="user-age">
          {user.age}
        </div>

        {/* ROLE */}
        <div className="user-role-cell">
          {user.role || "employee"}
        </div>

        {/* STATUS */}
        <div className="user-status">
          {user.is_active ? "Active" : "Inactive"}
        </div>

        {/* ACTION */}
        <div className="actions">

          {/* ADMIN ONLY */}
          {isAdmin && (
            <>
              <Button
                onClick={() =>
                  navigate(`/users/${user.id}`)
                }
              >
                View
              </Button>

              <Button onClick={handleEdit}>
                Edit
              </Button>

              <Button
                onClick={() =>
                  setShowConfirm(true)
                }
                disabled={deleteLoading}
              >
                {deleteLoading
                  ? "Deleting..."
                  : "Delete"}
              </Button>
            </>
          )}

          {/* EMPLOYEE / USER */}
          {!isAdmin && (
            <span>
              View Only
            </span>
          )}

        </div>
      </div>

    
      {/* EDIT MODAL */}
    
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setError("");
        }}
        title="Edit User"
      >
        {error && (
          <p className="error">
            {error}
          </p>
        )}

        {/* NAME */}
        <div className="input-group">
          <label>Name</label>

          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
          />
        </div>

        {/* EMAIL */}
        <div className="input-group">
          <label>Email</label>

          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
          />
        </div>

        {/* AGE */}
        <div className="input-group">
          <label>Age</label>

          <input
            type="number"
            name="age"
            value={formData.age}
            onChange={handleChange}
          />
        </div>

        {/* ROLE */}
        <div className="input-group">
          <label>Role</label>

          <select
            name="role"
            value={formData.role}
            onChange={handleChange}
          >
            <option value="employee">
              Employee
            </option>

            <option value="admin">
              Admin
            </option>
          </select>
        </div>

        {/* STATUS */}
        <div className="input-group">
          <label>Status</label>

          <select
            value={
              formData.is_active
                ? "active"
                : "inactive"
            }
            onChange={(e) =>
              setFormData({
                ...formData,
                is_active:
                  e.target.value === "active",
              })
            }
          >
            <option value="active">
              Active
            </option>

            <option value="inactive">
              Inactive
            </option>
          </select>
        </div>

        {/* MODAL BUTTONS */}
        <div className="actions">

          <Button
            onClick={handleUpdate}
            disabled={updateLoading}
          >
            {updateLoading
              ? "Updating..."
              : "Update"}
          </Button>

          <Button
            onClick={() => {
              setShowModal(false);
              setError("");
            }}
            disabled={updateLoading}
          >
            Cancel
          </Button>

        </div>
      </Modal>

      {/* DELETE CONFIRMATION */}
      {showConfirm && (
        <ConfirmDialog
          message="Are you sure you want to delete this user?"
          onConfirm={handleDelete}
          onCancel={() =>
            setShowConfirm(false)
          }
        />
      )}
    </>
  );
}

export default UserCard;

