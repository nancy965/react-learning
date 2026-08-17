import "./Users.css";
import { useState, useEffect } from "react";
import UserCard from "../components/UserCard";
import { useTheme } from "../context/ThemeContext";
import Loader from "../components/Loader";
import { getUsers, getCurrentUser } from "../services/userService";
import CreateUser from "../components/createUser";
import Button from "../components/Button";
import Table from "../components/Table";

function Users() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [status, setStatus] = useState("all");
  const { theme, toggleTheme } = useTheme();
  const [currentPage, setCurrentPage] = useState(1);

  // Success Toast
  const [successMessage, setSuccessMessage] = useState("");

  const usersPerPage = 5;

  // Get logged-in user's role
  const loggedInUser = JSON.parse(localStorage.getItem("user"));
  const userRole = loggedInUser?.role;

  // Check whether current user is admin
  const isAdmin = userRole === "admin";

  // Logout
  const handleLogout = () => {
    setSuccessMessage("Logout successful!");

    setTimeout(() => {
      localStorage.removeItem("token");
      localStorage.removeItem("role");
      localStorage.removeItem("user");

      window.location.href = "/login";
    }, 1000);
  };

  // Fetch users
  const fetchUsers = () => {
    setLoading(true);
    setError(false);

    getUsers()
      .then((res) => {
        console.log(res);

        setUsers(res.data.data);
        setLoading(false);
      })
      .catch((err) => {
        console.log(err);

        setError(true);
        setLoading(false);
      });
  };

  // Load users
  useEffect(() => {
    fetchUsers();

    getCurrentUser()
      .then((res) => {
        console.log("Current User:", res);
      })
      .catch((err) => {
        console.log("Current User Error:", err);
      });
  }, []);

  // Search + Status filter
  const filteredUsers = users.filter((user) => {
    const searchText = search.toLowerCase();

    const matchesSearch =
      user.name.toLowerCase().includes(searchText) ||
      user.email.toLowerCase().includes(searchText);

    const matchesStatus =
      status === "all" ||
      (status === "active" && user.is_active === true) ||
      (status === "inactive" && user.is_active === false) ||
      (status === "admin" && user.role === "admin") ||
      (status === "employee" && user.role === "employee");
    return matchesSearch && matchesStatus;
  });

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

  const startIndex = (currentPage - 1) * usersPerPage;

  const currentUsers = filteredUsers.slice(
    startIndex,
    startIndex + usersPerPage,
  );
  const columns = [
    {
      key: "name",
      label: "Name",
    },
    {
      key: "email",
      label: "Email",
    },
    {
      key: "age",
      label: "Age",
    },
    {
      key: "role",
      label: "Role",
    },
    {
      key: "status",
      label: "Status",
    },
    {
      key: "action",
      label: "Action",
    },
  ];
  // Loading
  if (loading) {
    return <Loader />;
  }

  // Error
  if (error) {
    return (
      <div className="users-page">
        <h2>Unable to load users.</h2>

        <p>Please try again.</p>

        <Button onClick={fetchUsers}>Retry</Button>
      </div>
    );
  }

  return (
    <div className={`users-page ${theme}-theme`}>
      {/* Success Toast */}
      {successMessage && (
        <div className="success-toast">
          <span className="success-icon">✓</span>

          <span className="success-text">{successMessage}</span>

          <button
            className="success-close"
            onClick={() => setSuccessMessage("")}
          >
            ×
          </button>
        </div>
      )}

      {/* Header */}
      <div className="users-header">
        <div>
          <h2>User Management</h2>

          <p className="user-role">
            Role: <strong>{userRole || "Unknown"}</strong>
          </p>
        </div>
        
      </div>

      {/* Add User */}
      <CreateUser
        refreshUsers={fetchUsers}
        onSuccess={(message) => setSuccessMessage(message)}
      />
      {/* Search */}
      <input
        type="text"
        placeholder="Search"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setCurrentPage(1);
        }}
      />

      {/* Status Filter */}
      <select
        value={status}
        onChange={(e) => {
          setStatus(e.target.value);
          setCurrentPage(1);
        }}
      >
        <option value="all">All</option>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
      </select>

      {isAdmin && (
        <>
          <button
            onClick={() => {
              setStatus("admin");
              setCurrentPage(1);
            }}
          >
            Admin
          </button>

          <button
            onClick={() => {
              setStatus("employee");
              setCurrentPage(1);
            }}
          >
            Employee
          </button>
        </>
      )}

      {/* User Table */}
      <Table
        columns={columns}
        data={currentUsers}
        renderRow={(user) => (
          <UserCard
            key={user.id}
            user={user}
            refreshUsers={fetchUsers}
            isAdmin={isAdmin}
            onSuccess={(message) => setSuccessMessage(message)}
          />
        )}
      />

      {/* No users */}
      {currentUsers.length === 0 && <p>No users found.</p>}

      {/* Pagination */}
      <div className="pagination">
        <Button
          onClick={() => setCurrentPage(currentPage - 1)}
          disabled={currentPage === 1}
        >
          Previous
        </Button>

        <span>
          Page {currentPage} of {totalPages || 1}
        </span>
        <Button
          onClick={() => setCurrentPage(currentPage + 1)}
          disabled={currentPage === totalPages || totalPages === 0}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

export default Users;
