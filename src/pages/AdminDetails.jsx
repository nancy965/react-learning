import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ConfirmDialog from "../components/ConfirmDialog";

import "./AdminDetails.css";

import { useTheme } from "../context/ThemeContext";

import axios from "axios";

import API_URL from "../config/axios.util";

function AdminDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { theme } = useTheme();

  const [admin, setAdmin] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openMenu, setOpenMenu] = useState(null);
  const [confirmDeleteUser, setConfirmDeleteUser] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    const fetchAdminDetails = async () => {
      try {
        const token = localStorage.getItem("token");

        const response = await axios.get(`${API_URL}/admins/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        setAdmin(response.data.data.admin);
        setUsers(response.data.data.users);
      } catch (error) {
        setError(
          error.response?.data?.message || "Failed to fetch admin details",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchAdminDetails();
  }, [id]);

  useEffect(() => {
    const handleClickOutside = () => {
      setOpenMenu(null);
    };

    document.addEventListener("click", handleClickOutside);

    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

  // VIEW EMPLOYEE
  const handleView = (userId) => {
    setOpenMenu(null);
    navigate(`/users/${userId}`);
  };

  // DELETE / DEACTIVATE EMPLOYEE
  const handleDelete = (user) => {
    setOpenMenu(null);
    setConfirmDeleteUser(user);
  };

  const handleConfirmDelete = async () => {
    if (!confirmDeleteUser) return;
    try {
      setDeleteLoading(true);
      const token = localStorage.getItem("token");

      await axios.delete(`${API_URL}/users/${confirmDeleteUser.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setUsers((prev) =>
        prev.map((user) =>
          user.id === confirmDeleteUser.id ? { ...user, is_active: false } : user,
        ),
      );

      setConfirmDeleteUser(null);
      window.dispatchEvent(new Event("employeeUpdated"));
    } catch (error) {
      alert(error.response?.data?.message || "Failed to deactivate user");
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return <p>Loading...</p>;
  }

  if (error) {
    return (
      <div className={`admin-details-page ${theme}-theme`}>
        <div className="admin-details-error">
          <h2>Unable to load admin details</h2>
          <p>Please try again later.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`admin-details-page ${theme}-theme`}>
      <div className="admin-details-header">
        <div>
          <span className="standard-page-eyebrow">ADMIN MANAGEMENT</span>
          <h1>Admin Details</h1>
          <p>Administrator information and assigned users</p>
        </div>

        <button className="back-button" onClick={() => window.history.back()}>
          ← Back
        </button>
      </div>

      {/* ADMIN PROFILE */}
      {admin && (
        <div className="admin-profile-card">
          <div className="admin-profile-avatar">
            {admin.name?.charAt(0).toUpperCase()}
          </div>

          <div className="admin-profile-info">
            <h2>{admin.name}</h2>

            <div className="admin-details-grid">
              <div>
                <span>Email</span>
                <strong>{admin.email}</strong>
              </div>

              <div>
                <span>Age</span>
                <strong>{admin.age}</strong>
              </div>

              <div>
                <span>Role</span>
                <strong className="role-badge">{admin.role}</strong>
              </div>

              <div>
                <span>Status</span>
                <strong
                  className={
                    admin.is_active ? "status-active" : "status-inactive"
                  }
                >
                  {admin.is_active ? "Active" : "Inactive"}
                </strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EMPLOYEE LIST */}
      <div className="users-section">
        <div className="users-section-header">
          <div>
            <h2>Users Created By This Admin</h2>
            <p>Only users assigned to this administrator are shown.</p>
          </div>

          <div className="users-section-actions">
            <span className="user-count">
              {users.length} User
              {users.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {users.length === 0 ? (
          <div className="empty-users">
            <h3>No Users Found</h3>
            <p>This administrator hasn't created any users yet.</p>
          </div>
        ) : (
          <div className="users-table-container">
            <table className="admin-users-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Age</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="user-name">{user.name}</td>

                    <td>{user.email}</td>

                    <td>{user.age}</td>

                    <td>
                      <span className="user-role">{user.role}</span>
                    </td>

                    <td>
                      <span
                        className={
                          user.is_active ? "status-active" : "status-inactive"
                        }
                      >
                        {user.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>

                    <td className="admin-user-actions">
                      <div className="admin-action-menu">
                        {/* THREE DOT */}
                        <button
                          className="admin-three-dot"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenu(openMenu === user.id ? null : user.id);
                          }}
                          title="Actions"
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="5" r="1.5" />
                            <circle cx="12" cy="12" r="1.5" />
                            <circle cx="12" cy="19" r="1.5" />
                          </svg>
                        </button>

                        {openMenu === user.id && (
                          <div
                            className="admin-action-dropdown"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {/* VIEW */}
                            <button
                              type="button"
                              className="admin-dropdown-item"
                              onClick={() => handleView(user.id)}
                            >
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                <circle cx="12" cy="12" r="3" />
                              </svg>
                              <span>View</span>
                            </button>

                            {/* EDIT */}
                            <button
                              type="button"
                              className="admin-dropdown-item"
                              onClick={() => {
                                setOpenMenu(null);
                                navigate(`/users/${user.id}/edit`);
                              }}
                            >
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                              </svg>
                              <span>Edit</span>
                            </button>

                            <div className="admin-dropdown-divider" />

                            {/* DELETE */}
                            <button
                              type="button"
                              className="admin-dropdown-item admin-dropdown-delete"
                              onClick={() => handleDelete(user)}
                            >
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6l-1 14H6L5 6" />
                                <path d="M10 11v6" />
                                <path d="M14 11v6" />
                                <path d="M9 6V4h6v2" />
                              </svg>
                              <span>Delete</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {confirmDeleteUser && (
        <ConfirmDialog
          title="Confirm Action"
          message={`Are you sure you want to delete ${confirmDeleteUser.name || confirmDeleteUser.email || "this user"}?`}
          confirmText={deleteLoading ? "Deleting..." : "Yes, Delete"}
          cancelText="Cancel"
          onConfirm={handleConfirmDelete}
          onCancel={() => setConfirmDeleteUser(null)}
        />
      )}
    </div>
  );
}

export default AdminDetails;
