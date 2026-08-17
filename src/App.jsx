import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import Register from "./components/Register";
import Home from "./components/Home";
import ProtectedRoute from "./routes/ProtectedRoute";

import Dashboard from "./pages/Dashboard";
import Users from "./pages/users";
import UserDetails from "./pages/UserDetails";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";

import MainLayout from "./layouts/MainLayout";
import { AuthProvider } from "./context/AuthContext";

function App() {
  return (
    <AuthProvider>
    <BrowserRouter>
      <Routes>

        {/* Public Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected Layout */}
        <Route
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/users" element={<Users />} />
          <Route path="/users/:id" element={<UserDetails />} />
          <Route path="/profile" element={<Profile />} />
        </Route>

        {/* Not Found */}
        <Route path="/not-found" element={<NotFound />} />
        <Route path="*" element={<NotFound />} />

      </Routes>
    </BrowserRouter>
    </AuthProvider>
  );
}

export default App;