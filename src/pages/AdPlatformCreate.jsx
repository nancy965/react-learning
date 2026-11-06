import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./AdPlatformCreate.css";
import { useTheme } from "../context/ThemeContext";
import { usePermission } from "../context/PermissionContext";
import Loader from "../components/Loader";
import { createAdPlatform } from "../services/adPlatformService";

function AdPlatformCreate() {
  const navigate = useNavigate();
  const { theme } = useTheme();

  const {
    hasPermission,
    loading: permissionsLoading,
  } = usePermission();

  const canCreatePlatforms = hasPermission(
    "ad_platforms.create"
  );

  const [platformName, setPlatformName] = useState("");
  const [platformCode, setPlatformCode] = useState("");
  const [platformDescription, setPlatformDescription] = useState("");
  const [platformActive, setPlatformActive] = useState(true);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    const name = platformName.trim();
    const code = platformCode.trim().toLowerCase();
    const description = platformDescription.trim() || null;

    if (!name) {
      setFormError("Platform name is required.");
      return;
    }

    if (!code) {
      setFormError("Platform code is required.");
      return;
    }

    if (!/^[A-Za-z0-9_-]+$/.test(code)) {
      setFormError(
        "Platform code can contain only letters, numbers, underscores, and hyphens."
      );
      return;
    }

    try {
      setSaving(true);
      setFormError("");

      await createAdPlatform({
        name,
        code,
        description,
        is_active: platformActive,
      });

      navigate("/ad-platforms");
    } catch (error) {
      setFormError(
        error.response?.data?.message ||
          "Unable to create ad platform."
      );
    } finally {
      setSaving(false);
    }
  };

  if (permissionsLoading) {
    return <Loader />;
  }

  if (!canCreatePlatforms) {
    return null;
  }

  return (
    <div className={`ad-platform-create-page ${theme}-theme`}>
      <div className="ad-platform-create-header">
        <div className="ad-platform-create-title">
          <span className="ad-platform-create-tag">AD PLATFORMS</span>
          <h1>Create Ad Platform</h1>
          <p className="ad-platform-create-subtitle">Add a new platform to the system</p>
        </div>
      </div>

      <div className="ad-platform-create-card">
        <form onSubmit={handleSubmit}>
          <div className="ad-platform-create-fields-row">
            <div className="ad-platform-create-group">
              <label htmlFor="platform-name">
                Platform Name
              </label>

              <input
                id="platform-name"
                type="text"
                placeholder=""
                value={platformName}
                onChange={(event) => {
                  setPlatformName(event.target.value);
                  setFormError("");
                }}
                disabled={saving}
                autoFocus
              />
            </div>

            <div className="ad-platform-create-group">
              <label htmlFor="platform-code">
                Platform Code
              </label>

              <input
                id="platform-code"
                type="text"
                placeholder=""
                value={platformCode}
                onChange={(event) => {
                  setPlatformCode(event.target.value);
                  setFormError("");
                }}
                disabled={saving}
              />
            </div>
          </div>

          <div className="ad-platform-create-group description-group">
            <label htmlFor="platform-description">
              Description
            </label>

            <textarea
              id="platform-description"
              placeholder="Enter platform description"
              value={platformDescription}
              onChange={(event) => {
                setPlatformDescription(event.target.value);
                setFormError("");
              }}
              disabled={saving}
            />
          </div>

          <div className="ad-platform-create-toggle-row">
            <div className="ad-platform-create-toggle-text">
              <strong>Active Status</strong>

              <span>
                Allow this platform to be used in the system.
              </span>
            </div>

            <button
              type="button"
              className={`ad-platform-create-toggle ${
                platformActive ? "active" : ""
              }`}
              onClick={() =>
                setPlatformActive((previous) => !previous)
              }
              disabled={saving}
            >
              <span className="ad-platform-create-toggle-circle"></span>
            </button>
          </div>

          {formError && (
            <div className="ad-platform-create-error">
              {formError}
            </div>
          )}

          <div className="ad-platform-create-actions">
            <button
              type="button"
              className="ad-platform-create-cancel"
              onClick={() => navigate("/ad-platforms")}
              disabled={saving}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="ad-platform-create-submit"
              disabled={saving}
            >
              {saving ? "Creating..." : "Create Platform"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AdPlatformCreate;