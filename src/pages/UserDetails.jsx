import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import "./UserDetails.css";

function UserDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem("token");

        const response = await axios.get(
          `http://localhost:5000/users/${id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        setUser(response.data.data);
      } catch (error) {
        console.error("Error fetching user:", error);
        setError("Unable to load user details");
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [id]);

  if (loading) {
    return <div className="details-message">Loading user details...</div>;
  }

  if (error) {
    return <div className="details-message error">{error}</div>;
  }

  return (
    <div className="user-details-page">

      <div className="details-header">
        <div>
          <p className="details-label">USER PROFILE</p>
          <h1>User Details</h1>
          <p className="details-subtitle">
            View complete information about this user.
          </p>
        </div>

        <button
          className="back-button"
          onClick={() => navigate("/users")}
        >
          ← Back to Users
        </button>
      </div>

      {user && (
        <div className="user-card">

          <div className="user-card-top">
            <div className="avatar">
              {user.name?.charAt(0).toUpperCase()}
            </div>

            <div>
              <h2>{user.name}</h2>
              <p>{user.email}</p>
            </div>

            <span
              className={`status-badge ${
                user.is_active ? "active" : "inactive"
              }`}
            >
              {user.is_active ? "Active" : "Inactive"}
            </span>
          </div>

          <div className="details-grid">

            <div className="detail-item">
              <span>Name</span>
              <strong>{user.name}</strong>
            </div>

            <div className="detail-item">
              <span>Email</span>
              <strong>{user.email}</strong>
            </div>

            <div className="detail-item">
              <span>Age</span>
              <strong>{user.age || "N/A"}</strong>
            </div>

            <div className="detail-item">
              <span>Role</span>
              <strong className="role-badge">{user.role}</strong>
            </div>

            <div className="detail-item">
              <span>Status</span>
              <strong>
                {user.is_active ? "Active" : "Inactive"}
              </strong>
            </div>

            <div className="detail-item">
              <span>Created Date</span>
              <strong>
                {new Date(user.created_at).toLocaleDateString()}
              </strong>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}

export default UserDetails;