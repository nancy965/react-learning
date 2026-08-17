import { Link, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import "./MainLayout.css";

function MainLayout() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className={`main-layout ${theme}-theme`}>

      {/* HEADER */}
      <header className="main-header">
        <h2>Admin Panel</h2>

        {/* THEME BUTTON */}
        <button className="theme-button" onClick={toggleTheme}>
          {theme === "dark" ? "☀️ Light Mode" : "🌙 Dark Mode"}
        </button>
      </header>

      {/* BODY */}
      <div className="layout-body">

        {/* SIDEBAR */}
        <aside className="sidebar">
          <nav className="sidebar-nav">

            <Link to="/dashboard">
              Dashboard
            </Link>

            <Link to="/users">
              Users
            </Link>

            <Link to="/profile">
              Profile
            </Link>

            {/* LOGOUT */}
            <button className="logout-button" onClick={handleLogout}>
              Logout
            </button>

          </nav>
        </aside>

        {/* MAIN CONTENT */}
        <main className="main-content">
          <Outlet />
        </main>

      </div>

    </div>
  );
}

export default MainLayout;