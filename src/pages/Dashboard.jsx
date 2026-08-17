import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getUsers } from "../services/userService";
import { useTheme } from "../context/ThemeContext";
import "./Dashboard.css";

function Dashboard() {
  const navigate = useNavigate();

  const { theme } = useTheme();

  const [totalUsers, setTotalUsers] = useState(0);
  const [activeUsers, setActiveUsers] = useState(0);
  const [loading, setLoading] = useState(true);

  const user = JSON.parse(localStorage.getItem("user"));

  useEffect(() => {
    const fetchUserStats = async () => {
      try {
        const response = await getUsers();
        const users = response.data.data;

        // Total users
        setTotalUsers(users.length);

        // Active users
        const active = users.filter(
          (user) => user.is_active === true
        );

        setActiveUsers(active.length);
      } catch (error) {
        console.error("Error fetching user stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserStats();
  }, []);

  return (
    <div className={`dashboard-page ${theme}-theme`}>

      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1>Welcome {user?.name}</h1>

          <p>
            Role: <strong>{user?.role}</strong>
          </p>
        </div>
      </div>

      {/* Statistics */}
      <div className="dashboard-cards">

        <div className="dashboard-card">
          <h3>Total Users</h3>

          <p>
            {loading ? "..." : totalUsers}
          </p>
        </div>

        <div className="dashboard-card">
          <h3>Active Users</h3>

          <p>
            {loading ? "..." : activeUsers}
          </p>
        </div>

      </div>

      {/* Actions */}
      <div className="dashboard-actions">

        {/* Everyone can view users */}
        <button onClick={() => navigate("/users")}>
          Users
        </button>

        {/* Profile */}
        <button onClick={() => navigate("/profile")}>
          Profile
        </button>

        {/* Admin only */}
        {user?.role === "admin" && (
          <button>
            Manage Users
          </button>
        )}

      </div>

    </div>
  );
}

export default Dashboard;