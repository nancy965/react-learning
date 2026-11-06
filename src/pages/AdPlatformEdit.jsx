import "./AdPlatformEdit.css";

import { useEffect, useState } from "react";
import {
  useNavigate,
  useParams,
} from "react-router-dom";

import { useTheme } from "../context/ThemeContext";
import { usePermission } from "../context/PermissionContext";
import Loader from "../components/Loader";

import {
  getAdPlatforms,
  updateAdPlatform,
} from "../services/adPlatformService";

function AdPlatformEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { theme } = useTheme();

  const {
    hasPermission,
    loading: permissionsLoading,
  } = usePermission();

  const canEditPlatforms = hasPermission(
    "ad_platforms.edit",
  );

  const [platformName, setPlatformName] = useState("");
  const [platformCode, setPlatformCode] = useState("");
  const [platformDescription, setPlatformDescription] = useState("");
  const [platformActive, setPlatformActive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    const loadPlatform = async () => {
      try {
        setLoading(true);
        setFormError("");

        const response = await getAdPlatforms();

        const platforms = response.data?.data || [];

        const platform = platforms.find(
          (item) => String(item.id) === String(id),
        );

        if (!platform) {
          setFormError("Ad platform not found.");
          return;
        }

        setPlatformName(platform.name || "");
        setPlatformCode(platform.code || "");
        setPlatformDescription(platform.description || "");
        setPlatformActive(platform.is_active ?? true);
      } catch (error) {
        setFormError(
          error.response?.data?.message ||
            "Unable to load ad platform.",
        );
      } finally {
        setLoading(false);
      }
    };

    if (
      !permissionsLoading &&
      canEditPlatforms
    ) {
      loadPlatform();
    }
  }, [
    id,
    permissionsLoading,
    canEditPlatforms,
  ]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    const name = platformName.trim();
    const code = platformCode.trim().toLowerCase();
    const description =
      platformDescription.trim() || null;

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
        "Platform code can contain only letters, numbers, underscores, and hyphens.",
      );
      return;
    }

    try {
      setSaving(true);
      setFormError("");

      await updateAdPlatform(id, {
        name,
        code,
        description,
        is_active: platformActive,
      });

      navigate("/ad-platforms");
    } catch (error) {
      setFormError(
        error.response?.data?.message ||
          "Unable to update ad platform.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (
    permissionsLoading ||
    loading
  ) {
    return <Loader />;
  }

  if (!canEditPlatforms) {
    return null;
  }

  return (
    <div className={`ad-platform-edit-page ${theme}-theme`}>
      <div className="ad-platform-edit-header">
        <div className="ad-platform-edit-title">
          <span className="ad-platform-edit-tag">AD PLATFORMS</span>
          <h1>Edit Ad Platform</h1>

          <p className="ad-platform-edit-subtitle">
            Update platform information.
          </p>
        </div>
      </div>

      <div className="ad-platform-edit-card">
        <form onSubmit={handleSubmit}>
          <div className="ad-platform-edit-fields-row">
            <div className="ad-platform-edit-group">
              <label htmlFor="platform-name">
                Platform Name
              </label>

              <input
                id="platform-name"
                type="text"
                placeholder="Enter platform name"
                value={platformName}
                onChange={(event) => {
                  setPlatformName(event.target.value);
                  setFormError("");
                }}
                disabled={saving}
                autoFocus
              />
            </div>

            <div className="ad-platform-edit-group">
              <label htmlFor="platform-code">
                Platform Code
              </label>

              <input
                id="platform-code"
                type="text"
                placeholder="e.g. facebook"
                value={platformCode}
                onChange={(event) => {
                  setPlatformCode(event.target.value);
                  setFormError("");
                }}
                disabled={saving}
              />
            </div>
          </div>

          <div className="ad-platform-edit-group">
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

          <div className="ad-platform-edit-toggle-row">
            <div className="ad-platform-edit-toggle-text">
              <strong>Active Status</strong>

              <span>
                Allow this platform to be used in the system.
              </span>
            </div>

            <button
              type="button"
              className={`ad-platform-edit-toggle ${
                platformActive ? "active" : ""
              }`}
              onClick={() =>
                setPlatformActive(
                  (previous) => !previous,
                )
              }
              disabled={saving}
            >
              <span className="ad-platform-edit-toggle-circle"></span>
            </button>
          </div>

          {formError && (
            <div className="ad-platform-edit-error">
              {formError}
            </div>
          )}

          <div className="ad-platform-edit-actions">
            <button
              type="button"
              className="ad-platform-edit-cancel"
              onClick={() => navigate("/ad-platforms")}
              disabled={saving}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="ad-platform-edit-submit"
              disabled={saving}
            >
              {saving
                ? "Updating..."
                : "Update Platform"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AdPlatformEdit;