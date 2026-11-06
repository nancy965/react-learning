import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./RolePermissions.css";
import PATHS from "../config/path.config";
import BindingModal from "../components/BindingModal";
import CustomSelect from "../components/CustomSelect";
import ConfirmDialog from "../components/ConfirmDialog";
import PermissionSimulatorModal from "../components/PermissionSimulatorModal";
import { API_URL } from "../config/axios.util";

function RolePermissions() {
  const navigate = useNavigate();

  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [showPageSizeDropdown, setShowPageSizeDropdown] = useState(false);
  const [openMenu, setOpenMenu] = useState(null);
  const [confirmDeleteRole, setConfirmDeleteRole] = useState(null);

  // Role binding modal state
  const [selectedRoleForBinding, setSelectedRoleForBinding] = useState(null);
  const [isBindingModalOpen, setIsBindingModalOpen] = useState(false);

  // Permission simulator modal state
  const [isSimulatorModalOpen, setIsSimulatorModalOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = () => {
      setOpenMenu(null);
      setShowPageSizeDropdown(false);
    };

    document.addEventListener("click", handleClickOutside);

    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

  const loadRoles = async (page = 1, limit = pageSize, searchTerm = search) => {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("token");

      const response = await axios.get(`${API_URL}/role-permissions/roles`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params: {
          page,
          limit,
          search: searchTerm ? searchTerm.trim() : "",
        },
      });

      const rolesData = response.data.data || [];
      setRoles(rolesData);

      if (response.data.pagination) {
        setTotalRecords(response.data.pagination.totalRecords || 0);
        setTotalPages(response.data.pagination.totalPages || 1);
        setCurrentPage(response.data.pagination.page || page);
      } else {
        setTotalRecords(rolesData.length);
        setTotalPages(Math.ceil(rolesData.length / limit) || 1);
        setCurrentPage(page);
      }
    } catch (err) {
      console.error("Load roles error:", err);
      setError(err.response?.data?.message || "Failed to load roles");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadRoles(1, pageSize, search);
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  const handleAddRole = () => {
    navigate(PATHS.ROLE_CREATE);
  };

  const handleMenuClick = (event, roleId) => {
    event.stopPropagation();
    setShowPageSizeDropdown(false);
    setOpenMenu((current) => (current === roleId ? null : roleId));
  };

  const handleOpenBinding = (role) => {
    setOpenMenu(null);
    setSelectedRoleForBinding(role);
    setIsBindingModalOpen(true);
  };

  const handleViewRole = (role) => {
    setOpenMenu(null);
    navigate(`/roles/${role.id}`);
  };

  const handleEditRole = (role) => {
    setOpenMenu(null);
    navigate(`/roles/${role.id}/edit`);
  };

  const handleDeleteRole = (role) => {
    setOpenMenu(null);
    setConfirmDeleteRole(role);
  };

  const handleConfirmDeleteRole = async () => {
    if (!confirmDeleteRole) return;
    try {
      const token = localStorage.getItem("token");

      await axios.delete(
        `${API_URL}/role-permissions/roles/${confirmDeleteRole.id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      setConfirmDeleteRole(null);
      await loadRoles(currentPage, pageSize, search);
    } catch (err) {
      console.error("Delete role error:", err);
      setError(err.response?.data?.message || "Failed to delete role");
    }
  };

  const handlePageChange = (newPage) => {
    if (
      newPage < 1 ||
      newPage > totalPages ||
      newPage === currentPage ||
      loading
    ) {
      return;
    }
    loadRoles(newPage, pageSize, search);
  };

  const handlePageSizeChange = (newSize) => {
    setPageSize(newSize);
    setShowPageSizeDropdown(false);
    loadRoles(1, newSize, search);
  };

  const handlePrevious = () => {
    if (currentPage <= 1 || loading) {
      return;
    }
    loadRoles(currentPage - 1, pageSize, search);
  };

  const handleNext = () => {
    if (currentPage >= totalPages || loading) {
      return;
    }
    loadRoles(currentPage + 1, pageSize, search);
  };

  const maxRoleOption = Math.max(5, Math.ceil((totalRecords || 0) / 5) * 5);
  const pageSizeOptions = [];
  for (let i = 5; i <= maxRoleOption; i += 5) {
    pageSizeOptions.push(i);
  }

  const getPaginationPages = () => {
    const pages = [];

    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
      return pages;
    }

    if (currentPage <= 3) {
      pages.push(1, 2, 3);
      pages.push("...");
      pages.push(totalPages);
      return pages;
    }

    if (currentPage >= totalPages - 2) {
      pages.push(1);
      pages.push("...");
      pages.push(totalPages - 2, totalPages - 1, totalPages);
      return pages;
    }

    pages.push(1);
    pages.push("...");
    pages.push(currentPage - 1, currentPage, currentPage + 1);
    pages.push("...");
    pages.push(totalPages);

    return pages;
  };

  if (error && !roles.length) {
    return (
      <div className="role-permissions-page">
        <div className="role-permissions-error-state">
          <h2>Unable to load roles</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="role-permissions-page">
      {/* Header matching Dashboard layout */}
      <div className="role-permissions-header">
        <div>
          <span className="role-breadcrumb-tag">ROLE MANAGEMENT</span>
          <h1>Roles & Permissions</h1>
          <p>Manage roles and their permissions.</p>
        </div>

        <div className="role-header-actions">
          <button
            type="button"
            className="sim-launch-header-btn"
            onClick={() => setIsSimulatorModalOpen(true)}
            title="Open Permission Simulator"
          >
            🛡️ Permission Simulator
          </button>

          <button
            type="button"
            className="add-role-button-orange"
            onClick={handleAddRole}
          >
            + Add Role
          </button>
        </div>
      </div>

      {error && <div className="role-permissions-error">{error}</div>}

      {/* Search and Show 5 controls matching Image 1 */}
      <div className="role-controls-row">
        <div className="role-search-box">
          <input
            type="text"
            placeholder="Search roles..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <CustomSelect
          value={pageSize}
          onChange={(e) => handlePageSizeChange(Number(e.target.value))}
          options={pageSizeOptions.map((opt) => ({
            value: opt,
            label: `Show ${opt}`,
          }))}
          minWidth="120px"
        />
      </div>

      {/* Table Card matching Image 1 */}
      <div className="role-table-card">
        <div className="role-table-header-row">
          <div className="header-cell col-index">INDEX</div>
          <div className="header-cell col-role">ROLE</div>
          <div className="header-cell col-action">ACTION</div>
        </div>

        <div className="role-table-body">
          {loading ? (
            <div className="role-loading-row">Loading roles...</div>
          ) : roles.length === 0 ? (
            <div className="role-empty-row">No roles found.</div>
          ) : (
            roles.map((role, idx) => (
              <div
                className="role-table-data-row"
                key={role.id}
                onClick={() => handleOpenBinding(role)}
              >
                <div className="data-cell col-index">
                  {(currentPage - 1) * pageSize + idx + 1}
                </div>

                <div className="data-cell col-role">
                  <span className="role-title-text">{role.name}</span>
                </div>

                <div
                  className="data-cell col-action"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    className="role-menu-button"
                    onClick={(event) => handleMenuClick(event, role.id)}
                    title="Actions"
                  >
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="5" r="1.5" />
                      <circle cx="12" cy="12" r="1.5" />
                      <circle cx="12" cy="19" r="1.5" />
                    </svg>
                  </button>

                  {openMenu === role.id && (
                    <div
                      className="role-dropdown-menu"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <button
                        type="button"
                        className="role-dropdown-item"
                        onClick={() => handleOpenBinding(role)}
                      >
                        <svg
                          width="15"
                          height="15"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                          <circle cx="9" cy="7" r="4" />
                          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                        <span>Binding</span>
                      </button>
                      <button
                        type="button"
                        className="role-dropdown-item"
                        onClick={() => handleViewRole(role)}
                      >
                        <svg
                          width="15"
                          height="15"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                        <span>View</span>
                      </button>
                      <button
                        type="button"
                        className="role-dropdown-item"
                        onClick={() => handleEditRole(role)}
                      >
                        <svg
                          width="15"
                          height="15"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                        <span>Edit</span>
                      </button>
                      <div className="role-dropdown-divider" />
                      <button
                        type="button"
                        className="role-dropdown-item delete-role-action"
                        onClick={() => handleDeleteRole(role)}
                      >
                        <svg
                          width="15"
                          height="15"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
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
              </div>
            ))
          )}
        </div>
      </div>

      {totalRecords > 0 && (
        <div className="role-pagination">
          <button
            type="button"
            className="pagination-button"
            onClick={() => handlePageChange(1)}
            disabled={currentPage === 1 || loading}
            aria-label="First page"
            title="First page"
          >
            «
          </button>

          <button
            type="button"
            className="pagination-button"
            onClick={handlePrevious}
            disabled={currentPage === 1 || loading}
            aria-label="Previous page"
            title="Previous page"
          >
            ‹
          </button>

          {getPaginationPages().map((page, index) => {
            if (page === "...") {
              return (
                <span key={`dots-${index}`} className="pagination-dots">
                  ...
                </span>
              );
            }

            return (
              <button
                key={page}
                type="button"
                className={`pagination-number ${
                  currentPage === page ? "active" : ""
                }`}
                onClick={() => handlePageChange(page)}
                disabled={loading}
              >
                {page}
              </button>
            );
          })}

          <button
            type="button"
            className="pagination-button"
            onClick={handleNext}
            disabled={currentPage === totalPages || loading}
            aria-label="Next page"
            title="Next page"
          >
            ›
          </button>

          <button
            type="button"
            className="pagination-button"
            onClick={() => handlePageChange(totalPages)}
            disabled={currentPage === totalPages || loading}
            aria-label="Last page"
            title="Last page"
          >
            »
          </button>
        </div>
      )}

      {/* Role Binding Modal */}
      {isBindingModalOpen && selectedRoleForBinding && (
        <BindingModal
          role={selectedRoleForBinding}
          isOpen={isBindingModalOpen}
          onClose={() => setIsBindingModalOpen(false)}
        />
      )}

      {/* Delete Role Confirm Dialog */}
      {confirmDeleteRole && (
        <ConfirmDialog
          title="Confirm Action"
          message={`Are you sure you want to delete "${confirmDeleteRole.name}"?`}
          confirmText="Yes, Delete"
          cancelText="Cancel"
          onConfirm={handleConfirmDeleteRole}
          onCancel={() => setConfirmDeleteRole(null)}
        />
      )}
      {/* Permission Simulator Modal */}
      {isSimulatorModalOpen && (
        <PermissionSimulatorModal
          isOpen={isSimulatorModalOpen}
          onClose={() => setIsSimulatorModalOpen(false)}
        />
      )}
    </div>
  );
}

export default RolePermissions;
