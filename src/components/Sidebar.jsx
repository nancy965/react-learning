import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";

function Sidebar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
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

        <button onClick={handleLogout}>
          Logout
        </button>

      </nav>

    </aside>
  );
}

export default Sidebar;