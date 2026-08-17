import { useNavigate } from "react-router-dom";
import "./Home.css";

function Home() {
  const navigate = useNavigate();
  return (
    <div className="home-page">
      <div className="home-card">
        <h1>Welcome</h1>
        <p>
          Welcome to our platform. Please login or create an account to
          continue.
        </p>
        <div className="home-buttons">
          <button className="home-button" onClick={() => navigate("/login")}>
            Login
          </button>
          <button
            className="home-button register-home-button"
            onClick={() => navigate("/register")}>
            Register
          </button>
        </div>
      </div>
    </div>
  );
}
export default Home;
