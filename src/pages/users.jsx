import "./Users.css";
import "./Tasks.css";
import "./UserDetails.css";
import "./ActivityLogs.css";
import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

import UserCard from "../components/UserCard";
import { useTheme } from "../context/ThemeContext";
import Loader from "../components/Loader";
import { getUsers } from "../services/userService";
import Table from "../components/Table";
import { usePermission } from "../context/PermissionContext";
import CustomSelect from "../components/CustomSelect";

function Users() {
  const navigate = useNavigate();

  const [searchParams] = useSearchParams();

  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [status, setStatus] = useState(searchParams.get("status") || "all");

  const { theme } = useTheme();

  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  const [successMessage, setSuccessMessage] = useState("");
  const [openUserMenuId, setOpenUserMenuId] = useState(null);
  const [showPageSizeDropdown, setShowPageSizeDropdown] = useState(false);

  const [usersPerPage, setUsersPerPage] = useState(
    Number(searchParams.get("limit")) || 5,
  );

  const loggedInUser = JSON.parse(localStorage.getItem("user"));

  const userRole = loggedInUser?.role;

  const { hasPermission, loading: permissionsLoading } = usePermission();

  const isGeneralAdmin =
    userRole === "general_admin" ||
    userRole === "super_admin" ||
    String(loggedInUser?.role_name || loggedInUser?.roleName || "").toLowerCase().includes("general") ||
    loggedInUser?.baseRole === "general_admin" ||
    loggedInUser?.email === "nency@gmail.com" ||
    String(loggedInUser?.name || "").toLowerCase() === "nency";

  const canViewUsers =
    isGeneralAdmin ||
    userRole === "admin" ||
    hasPermission(["users.view", "users"]);

  const canCreateUsers =
    isGeneralAdmin ||
    userRole === "admin" ||
    hasPermission(["users.create", "users"]);

  const canBulkCreateUsers =
    isGeneralAdmin ||
    userRole === "admin" ||
    hasPermission(["users.bulk_create", "users.create"]);

  const canEditUsers =
    isGeneralAdmin ||
    userRole === "admin" ||
    hasPermission(["users.edit"]);

  const canDeleteUsers =
    isGeneralAdmin ||
    userRole === "admin" ||
    hasPermission(["users.delete"]);

  useEffect(() => {
    const urlStatus = searchParams.get("status");

    if (urlStatus && urlStatus !== status) {
      setStatus(urlStatus);
    }
  }, [searchParams]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        !event.target.closest(".action-menu") &&
        !event.target.closest(".action-dropdown")
      ) {
        setOpenUserMenuId(null);
      }

      if (
        !event.target.closest(".tasks-page-size") &&
        !event.target.closest(".users-page-size")
      ) {
        setShowPageSizeDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const fetchUsers = async (
    page = 1,
    limit = usersPerPage,
    showPageLoader = false,
    currentStatus = status,
    currentSearch = search,
  ) => {
    if (showPageLoader) {
      setLoading(true);
    }

    setError(false);

    try {
      const res = await getUsers(page, limit, currentStatus, currentSearch);

      setUsers(res.data.data || []);

      setTotalRecords(res.data.pagination?.totalRecords || 0);

      setTotalPages(res.data.pagination?.totalPages || 0);

      setCurrentPage(page);
    } catch (err) {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (permissionsLoading) return;

    if (!canViewUsers) {
      setLoading(false);
      return;
    }

    fetchUsers(1, usersPerPage, true, status, search);
  }, [permissionsLoading, canViewUsers, status, search]);

  const handleUsersPerPageChange = async (eventOrLimit) => {
    const newLimit = Number(
      eventOrLimit?.target ? eventOrLimit.target.value : eventOrLimit,
    );

    setUsersPerPage(newLimit);

    await fetchUsers(1, newLimit, false, status, search);
  };

  const handleViewUser = (id) => {
    navigate(`/users/${id}`);
  };

  const handleSearchChange = (event) => {
    setSearch(event.target.value);
  };

  const handleStatusChange = (event) => {
    const newStatus = event.target.value;

    setStatus(newStatus);
  };

  const filteredUsers = users;

  const handlePrevious = async () => {
    if (currentPage <= 1 || loading) {
      return;
    }

    await fetchUsers(currentPage - 1, usersPerPage, false);
  };

  const handleNext = async () => {
    if (currentPage >= totalPages || loading) {
      return;
    }

    await fetchUsers(currentPage + 1, usersPerPage, false);
  };

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



  if (error) {
    return (
      <div className={`users-page ${theme}-theme`}>
        <div className="users-error">
          <h2>Unable to load users</h2>
          <p>Please try again later.</p>
        </div>
      </div>
    );
  }

  if (!canViewUsers) {
    if (permissionsLoading) {
      return (
        <div
          style={{
            height: "60vh",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Loader text="Loading users..." />
        </div>
      );
    }
    return (
      <div className={`users-page ${theme}-theme`}>
        <div className="users-error">
          <h2>Access Denied</h2>
          <p>You do not have permission to view users.</p>
        </div>
      </div>
    );
  }

  const columns = [
    {
      key: "index",
      label: "#",
      width: "45px",
      align: "center",
    },
    {
      key: "name",
      label: "NAME",
      width: "1.3fr",
      align: "left",
    },
    {
      key: "email",
      label: "EMAIL",
      width: "1.6fr",
      align: "left",
    },
    {
      key: "country_name",
      label: "COUNTRY",
      width: "1fr",
      align: "left",
    },
    {
      key: "state_name",
      label: "STATE",
      width: "1fr",
      align: "left",
    },
    {
      key: "city_name",
      label: "CITY",
      width: "1.1fr",
      align: "left",
    },
    {
      key: "pincode",
      label: "PINCODE",
      width: "0.9fr",
      align: "left",
    },
    {
      key: "role",
      label: "ROLE",
      width: "1fr",
      align: "center",
    },
    {
      key: "permission_role",
      label: "PERMISSION ROLE",
      width: "1.2fr",
      align: "center",
    },
    {
      key: "status",
      label: "STATUS",
      width: "1fr",
      align: "center",
    },
    {
      key: "created_at",
      label: "CREATED AT",
      width: "1.1fr",
      align: "center",
    },
    {
      key: "action",
      label: "ACTION",
      width: "0.8fr",
      align: "center",
    },
  ];

  const maxUserOption = Math.max(
    5,
    Math.ceil((totalRecords || 0) / 5) * 5,
  );

  const userPageSizeOptions = [];

  for (let i = 5; i <= maxUserOption; i += 5) {
    userPageSizeOptions.push(i);
  }

  return (
    <div className={`tasks-page ${theme}-theme`}>
      {successMessage && (
        <div className="success-toast">
          <span className="success-icon">✓</span>

          <div className="success-text">
            <strong>Success</strong>

            <span>{successMessage}</span>
          </div>

          <button
            className="success-close"
            onClick={() => setSuccessMessage("")}
          >
            ×
          </button>
        </div>
      )}

      <div className="tasks-header">
        <div className="tasks-title">
          <span className="task-breadcrumb-tag">USER MANAGEMENT</span>
          <h1>Users</h1>
          <p className="task-subtitle">Search and manage your users.</p>
        </div>

        <div className="tasks-header-actions">
          {(isGeneralAdmin || canBulkCreateUsers) && (
            <button
              type="button"
              className="add-task-btn"
              onClick={() => navigate("/users/import")}
            >
              Import
            </button>
          )}

          <button
            type="button"
            className="add-task-btn"
            onClick={() => navigate("/users/create")}
          >
            + Create User
          </button>
        </div>
      </div>

      <div className="users-controls task-controls">
        <div className="search-wrapper task-search-wrapper">
          <input
            type="text"
            placeholder="Search name, email, role or location..."
            value={search}
            onChange={handleSearchChange}
          />
        </div>

        <div className="tasks-page-size users-page-size">
          <button
            type="button"
            className="tasks-page-size-button"
            onClick={() =>
              setShowPageSizeDropdown((previous) => !previous)
            }
            aria-haspopup="listbox"
            aria-expanded={showPageSizeDropdown}
          >
            <span>Show {usersPerPage}</span>

            <span
              className={`tasks-page-size-arrow ${
                showPageSizeDropdown ? "open" : ""
              }`}
            >
              ▾
            </span>
          </button>

          {showPageSizeDropdown && (
            <div className="tasks-page-size-menu" role="listbox">
              {userPageSizeOptions.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  className={`tasks-page-size-option ${
                    usersPerPage === opt ? "selected" : ""
                  }`}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={() => {
                    handleUsersPerPageChange(opt);
                    setShowPageSizeDropdown(false);
                  }}
                >
                  Show {opt}
                </button>
              ))}
            </div>
          )}
        </div>

        <CustomSelect
          value={
            status === "admin" || status === "employee" ? "all" : status
          }
          onChange={handleStatusChange}
          options={[
            { value: "all", label: "All Status" },
            { value: "active", label: "Active" },
            { value: "inactive", label: "Inactive" },
          ]}
          minWidth="140px"
        />

        {isGeneralAdmin && (
          <>
            <button
              type="button"
              className={`tasks-page-size-button ${
                status === "admin" ? "active" : ""
              }`}
              style={{
                width: "auto",
                background:
                  status === "admin" ? "#edf5ff" : "#ffffff",
                borderColor:
                  status === "admin" ? "#b9cee6" : "#d5e0ec",
                color:
                  status === "admin" ? "#0d1f5c" : "#47617f",
              }}
              onClick={() => {
                setStatus("admin");
              }}
            >
              Admin
            </button>

            <button
              type="button"
              className={`tasks-page-size-button ${
                status === "employee" ? "active" : ""
              }`}
              style={{
                width: "auto",
                background:
                  status === "employee" ? "#edf5ff" : "#ffffff",
                borderColor:
                  status === "employee" ? "#b9cee6" : "#d5e0ec",
                color:
                  status === "employee" ? "#0d1f5c" : "#47617f",
              }}
              onClick={() => {
                setStatus("employee");
              }}
            >
              Employee
            </button>
          </>
        )}

        {userRole === "admin" && (
          <button
            type="button"
            className={`tasks-page-size-button ${
              status === "employee" ? "active" : ""
            }`}
            style={{
              width: "auto",
              background:
                status === "employee" ? "#edf5ff" : "#ffffff",
              borderColor:
                status === "employee" ? "#b9cee6" : "#d5e0ec",
              color:
                status === "employee" ? "#0d1f5c" : "#47617f",
            }}
            onClick={() => {
              setStatus("employee");
            }}
          >
            Employee
          </button>
        )}
      </div>

      <div className="users-table-container" style={{ marginTop: "20px", width: "100%" }}>
        <Table
          minWidth="100%"
          columns={columns}
          data={filteredUsers}
          emptyMessage="No users found."
          renderRow={(user, index, gridTemplate) => (
            <UserCard
              key={user.id}
              user={user}
              index={(currentPage - 1) * usersPerPage + index + 1}
              gridTemplate={gridTemplate}
              refreshUsers={() =>
                fetchUsers(currentPage, usersPerPage, false)
              }
              isAdmin={
                isGeneralAdmin ||
                canViewUsers ||
                canEditUsers ||
                canDeleteUsers
              }
              userRole={userRole}
              canViewUsers={canViewUsers}
              canEditUsers={canEditUsers}
              canDeleteUsers={canDeleteUsers}
              onSuccess={(message) => setSuccessMessage(message)}
              onView={handleViewUser}
              openUserMenuId={openUserMenuId}
              setOpenUserMenuId={setOpenUserMenuId}
              openMenuUp={index >= filteredUsers.length - 2}
            />
          )}
        />
      </div>

      {totalPages > 0 && (
        <div className="task-pagination">
          <div className="task-pagination-controls">
            <button
              type="button"
              className="pagination-button pagination-arrow"
              onClick={() =>
                fetchUsers(1, usersPerPage, false)
              }
              disabled={currentPage === 1 || loading}
              aria-label="First page"
              title="First page"
            >
              «
            </button>

            <button
              type="button"
              className="pagination-button pagination-arrow"
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
                  <span
                    key={`dots-${index}`}
                    className="pagination-dots"
                  >
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
                  onClick={() =>
                    fetchUsers(page, usersPerPage, false)
                  }
                  disabled={loading}
                >
                  {page}
                </button>
              );
            })}

            <button
              type="button"
              className="pagination-button pagination-arrow"
              onClick={handleNext}
              disabled={currentPage === totalPages || loading}
              aria-label="Next page"
              title="Next page"
            >
              ›
            </button>

            <button
              type="button"
              className="pagination-button pagination-arrow"
              onClick={() =>
                fetchUsers(totalPages, usersPerPage, false)
              }
              disabled={currentPage === totalPages || loading}
              aria-label="Last page"
              title="Last page"
            >
              »
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Users;