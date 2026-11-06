import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { usePermission } from "../context/PermissionContext";
import { getUserById, updateUser, getAdmins } from "../services/userService";
import UserForm from "../components/UserForm";
import Loader from "../components/Loader";
import "./AdminUserEdit.css";

function AdminUserEdit() {
  const { id, userId } = useParams();
  const targetUserId = id || userId;
  const navigate = useNavigate();

  const { user: loggedInUser } = useAuth();
  const { hasPermission, loading: permissionsLoading } = usePermission();

  const userRole = loggedInUser?.role;
  const isGeneralAdmin =
    userRole === "general_admin" ||
    userRole === "super_admin" ||
    (loggedInUser?.role_name || "").toLowerCase() === "general admin" ||
    (loggedInUser?.roleName || "").toLowerCase() === "general admin" ||
    loggedInUser?.baseRole === "general_admin" ||
    loggedInUser?.email === "nency@gmail.com";
  const canEditUsers = hasPermission("users.edit");

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    age: "",
    role: "employee",
    is_active: true,
    adminId: "",
    adminName: "",
    countryId: "",
    countryName: "",
    stateId: "",
    stateName: "",
    cityId: "",
    cityName: "",
    pincodeId: "",
    pincode: "",
    roleId: "",
  });

  const [admins, setAdmins] = useState([]);
  const [initialData, setInitialData] = useState(null);
  const [requireApproval, setRequireApproval] = useState(false);
  const [approvalSuccessModal, setApprovalSuccessModal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Load admins if general_admin
  useEffect(() => {
    const fetchAdmins = async () => {
      if (!isGeneralAdmin) return;
      try {
        const res = await getAdmins();
        setAdmins(res.data || []);
      } catch (err) {
        console.error("FETCH ADMINS ERROR:", err);
      }
    };
    fetchAdmins();
  }, [isGeneralAdmin]);

  // Fetch user details
  useEffect(() => {
    const fetchUserData = async () => {
      if (!targetUserId) {
        setError("User ID is missing");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const response = await getUserById(targetUserId);
        const userData = response.data || response;

        if (!userData) {
          setError("User not found");
          return;
        }

        setInitialData(userData);
        setFormData({
          name: userData.name || "",
          email: userData.email || "",
          age: userData.age || "",
          role: userData.role || "employee",
          is_active: userData.is_active ?? true,
          adminId: userData.admin_id || userData.adminId || "",
          adminName: userData.admin_name || userData.adminName || "",
          countryId: userData.country_id || userData.countryId || "",
          countryName: userData.country_name || userData.countryName || "",
          stateId: userData.state_id || userData.stateId || "",
          stateName: userData.state_name || userData.stateName || "",
          cityId: userData.city_id || userData.cityId || "",
          cityName: userData.city_name || userData.cityName || "",
          pincodeId: userData.pincode_id || userData.pincodeId || "",
          pincode: userData.pincode || "",
          roleId: userData.role_id || userData.roleId || "",
        });

        if (!permissionsLoading && !canEditUsers) {
          setError("You do not have permission to perform this action");
        }
      } catch (err) {
        console.error("FETCH USER ERROR:", err);
        setError(
          err.response?.data?.message ||
            "You do not have permission to perform this action"
        );
      } finally {
        setLoading(false);
      }
    };

    if (!permissionsLoading) {
      fetchUserData();
    }
  }, [targetUserId, permissionsLoading, canEditUsers]);

  const handleUpdate = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    if (!canEditUsers) {
      setError("You do not have permission to perform this action");
      return;
    }

    if (!formData.name?.trim()) {
      setError("Name is required");
      return;
    }

    if (!/^[A-Za-z ]+$/.test(formData.name.trim())) {
      setError("Name should contain only letters");
      return;
    }

    if (!formData.email?.trim()) {
      setError("Email is required");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      setError("Enter valid email");
      return;
    }

    if (!formData.age) {
      setError("Age is required");
      return;
    }

    const ageNum = Number(formData.age);
    if (ageNum < 18 || ageNum > 100) {
      setError("Age must be between 18 and 100");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const res = await updateUser(targetUserId, {
        name: formData.name.trim(),
        email: formData.email.trim(),
        age: ageNum,
        role: formData.role,
        is_active: formData.is_active,
        countryId: formData.countryId || undefined,
        stateId: formData.stateId || undefined,
        cityId: formData.cityId || undefined,
        pincodeId: formData.pincodeId || undefined,
        roleId: formData.roleId || undefined,
        adminId: formData.adminId || undefined,
        requireApproval,
      });

      if (res?.requiresApproval) {
        setApprovalSuccessModal({
          requestCode: res.requestCode || "DB-CHG-PENDING",
          message: res.message || "Database change request created and pending reviewer approval.",
        });
      } else {
        window.dispatchEvent(new Event("employeeUpdated"));
        navigate("/users");
      }
    } catch (err) {
      console.error("UPDATE USER ERROR:", err);
      setError(
        err.response?.data?.message ||
          "You do not have permission to perform this action"
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading || permissionsLoading) {
    return (
      <div className="admin-user-edit-page">
        <Loader />
      </div>
    );
  }

  return (
    <div className="admin-user-edit-page">
      <div className="admin-user-edit-header-row">
        <div className="admin-user-edit-title-group">
          <span className="task-breadcrumb-tag">USER MANAGEMENT</span>
          <h1 className="admin-user-edit-title">Edit User</h1>
          <p className="task-subtitle">
            Update user information.
          </p>
        </div>
      </div>

      <div className="admin-user-edit-content-wrapper">
        {/* Bytebase Workflow Banner / Toggle */}
        <div className="bytebase-approval-banner">
          <div className="bytebase-approval-banner-left">
            <div className="bytebase-shield-icon-box">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <div>
              <div className="bytebase-approval-title">
                Database Change Approval (Bytebase Maker-Checker)
              </div>
              <div className="bytebase-approval-subtitle">
                This user will require an authorized reviewer to verify and approve critical changes (assigned admin, roles) before they take effect.
              </div>
            </div>
          </div>
          <label className="bytebase-toggle-wrapper">
            <input
              type="checkbox"
              className="bytebase-toggle-input"
              checked={requireApproval}
              onChange={(e) => setRequireApproval(e.target.checked)}
            />
            <span className={`bytebase-toggle-track ${requireApproval ? "checked" : ""}`}>
              <span className="bytebase-toggle-thumb" />
            </span>
            <span className="bytebase-toggle-label">
              Require Reviewer Approval
            </span>
          </label>
        </div>

        <UserForm
          formData={formData}
          setFormData={setFormData}
          setError={setError}
          onSubmit={handleUpdate}
          loading={saving}
          error={error}
          mode="edit"
          userRole={userRole}
          admins={admins}
          onClose={() => navigate("/users")}
        />
      </div>

      {/* Approval Success Modal */}
      {approvalSuccessModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.7)",
            backdropFilter: "blur(4px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1.5rem",
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              maxWidth: "520px",
              width: "100%",
              padding: "24px",
              boxShadow: "0 25px 50px -12px rgba(15, 23, 42, 0.25)",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: "56px",
                height: "56px",
                background: "#f0fdf4",
                color: "#16a34a",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
                fontSize: "24px",
                fontWeight: "bold",
              }}
            >
              ✓
            </div>
            <h3 style={{ margin: "0 0 8px", fontSize: "18px", fontWeight: "700", color: "#0f172a" }}>
              Database Change Request Submitted!
            </h3>
            <span
              style={{
                display: "inline-block",
                fontFamily: "monospace",
                fontSize: "13px",
                fontWeight: "700",
                background: "#e0e7ff",
                color: "#3730a3",
                padding: "3px 10px",
                borderRadius: "6px",
                marginBottom: "12px",
              }}
            >
              {approvalSuccessModal.requestCode}
            </span>
            <p style={{ fontSize: "13px", color: "#475569", lineHeight: "1.5", margin: "0 0 20px" }}>
              Your requested change has been submitted for Maker-Checker review. The live database values remain untouched until an authorized reviewer approves the change.
            </p>
            <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
              <button
                type="button"
                onClick={() => navigate("/users")}
                style={{
                  padding: "8px 16px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  background: "#ffffff",
                  color: "#475569",
                  fontWeight: "600",
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                Back to Users
              </button>
              <button
                type="button"
                onClick={() => navigate("/approvals/inbox?tab=database_changes")}
                style={{
                  padding: "8px 18px",
                  borderRadius: "8px",
                  border: "none",
                  background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                  color: "#ffffff",
                  fontWeight: "600",
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                View in Approval Inbox ➔
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminUserEdit;