import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Admins.css";
import { useTheme } from "../context/ThemeContext";
import { getAdmins, deleteAdmin } from "../services/userService";
import ConfirmDialog from "../components/ConfirmDialog";

function Admins() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openMenu, setOpenMenu] = useState(null);

  // Delete
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [confirmDeleteAdmin, setConfirmDeleteAdmin] = useState(null);
  const { theme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  // GET ADMINS
  const fetchAdmins = async () => {
    try {
      const response = await getAdmins();

      setAdmins(response.data);
    } catch (error) {
      setError(error.response?.data?.message || "Failed to fetch admins");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();

    const handleEmployeeUpdated = () => {
      fetchAdmins();
    };

    window.addEventListener("employeeUpdated", handleEmployeeUpdated);

    return () => {
      window.removeEventListener("employeeUpdated", handleEmployeeUpdated);
    };
  }, []);

  // VIEW ADMIN
  const handleView = (id) => {
    setOpenMenu(null);
    navigate(`/admins/${id}`);
  };


  // DELETE ADMIN
  const handleDelete = (admin) => {
    setOpenMenu(null);
    setConfirmDeleteAdmin(admin);
  };

  const handleConfirmDelete = async () => {
    if (!confirmDeleteAdmin) return;
    try {
      setDeleteLoading(true);
      await deleteAdmin(confirmDeleteAdmin.id);
      setConfirmDeleteAdmin(null);
      await fetchAdmins();
    } catch (error) {
      console.log("DELETE ADMIN ERROR:", error);
      alert(error.response?.data?.message || "Failed to delete admin");
    } finally {
      setDeleteLoading(false);
    }
  };

  // LOADING
  if (loading) {
    return <p>Loading admins...</p>;
  }

  // ERROR
  if (error) {
    return (
      <div className={`admins-page ${theme}-theme`}>
        <div className="admins-error">
          <h2>Unable to load admins</h2>
          <p>Please try again later.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`admins-page ${theme}-theme`}>
      {/* HEADER */}
      <div className="admins-header">
        <div>
          <span className="standard-page-eyebrow">ADMIN MANAGEMENT</span>
          <h1>Administrators</h1>
          <p>Manage and view all administrators</p>
        </div>

        <div className="admin-count">
          {admins.length} Admin
          {admins.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* ADMIN CARDS */}
      <div className="admins-grid">
        {admins.map((admin) => (
          <div key={admin.id} className="admin-card">
            {/* ADMIN INFORMATION */}
            <div
              className="admin-card-content"
              onClick={() => navigate(`/admins/${admin.id}`)}
            >
              <div className="admin-avatar">
                {admin.name?.charAt(0).toUpperCase()}
              </div>

              <div className="admin-info">
                <h3>{admin.name}</h3>

                <p>{admin.email}</p>

                <span className="admin-role">{admin.role}</span>

                <p className="employee-count">
                  {admin.employee_count} Employee
                  {Number(admin.employee_count) !== 1 ? "s" : ""}
                </p>
              </div>
            </div>

            {/* THREE DOT */}
            <div className="admin-card-actions">
              <button
                className="admin-card-three-dot"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenMenu(openMenu === admin.id ? null : admin.id);
                }}
                title="Actions"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="5" r="1.5" />
                  <circle cx="12" cy="12" r="1.5" />
                  <circle cx="12" cy="19" r="1.5" />
                </svg>
              </button>

              {/* DROPDOWN */}
              {openMenu === admin.id && (
                <div
                  className="admin-card-dropdown"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* VIEW */}
                  <button onClick={() => handleView(admin.id)}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                    <span>View</span>
                  </button>

                  {/* EDIT */}
                  <button
                    onClick={() => {
                      setOpenMenu(null);
                      navigate(`/admins/${admin.id}/edit`);
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
                    className="admin-dropdown-delete"
                    onClick={() => handleDelete(admin)}
                    disabled={deleteLoading}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14H6L5 6" />
                      <path d="M10 11v6" />
                      <path d="M14 11v6" />
                      <path d="M9 6V4h6v2" />
                    </svg>
                    <span>{deleteLoading ? "Deleting..." : "Delete"}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* CONFIRM DELETE MODAL */}
      {confirmDeleteAdmin && (
        <ConfirmDialog
          title="Confirm Action"
          message={`Are you sure you want to delete ${confirmDeleteAdmin.name || "this admin"}?`}
          confirmText={deleteLoading ? "Deleting..." : "Yes, Delete"}
          cancelText="Cancel"
          onConfirm={handleConfirmDelete}
          onCancel={() => setConfirmDeleteAdmin(null)}
        />
      )}
    </div>
  );
}

export default Admins;
