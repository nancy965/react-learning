import "./AdCampaignCreate.css";

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useTheme } from "../context/ThemeContext";
import { usePermission } from "../context/PermissionContext";
import Loader from "../components/Loader";

import { createAdCampaign } from "../services/adCampaignService";
import { getAdPlatforms } from "../services/adPlatformService";
import CustomDatePicker from "../components/CustomDatePicker";

function AdCampaignCreate() {
  const navigate = useNavigate();
  const { theme } = useTheme();

  const {
    hasPermission,
    loading: permissionsLoading,
  } = usePermission();

  const canCreateCampaigns = hasPermission(
    "ad_campaigns.create",
  );

  const platformDropdownRef = useRef(null);

  const [platforms, setPlatforms] = useState([]);
  const [campaignName, setCampaignName] = useState("");
  const [campaignDescription, setCampaignDescription] = useState("");
  const [campaignObjective, setCampaignObjective] = useState("");
  const [campaignPlatform, setCampaignPlatform] = useState("");
  const [platformSearch, setPlatformSearch] = useState("");
  const [showPlatformOptions, setShowPlatformOptions] = useState(false);
  const [campaignStartDate, setCampaignStartDate] = useState("");
  const [campaignEndDate, setCampaignEndDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    const loadPlatforms = async () => {
      try {
        setLoading(true);

        const response = await getAdPlatforms();

        setPlatforms(response.data?.data || []);
      } catch (error) {
        setFormError(
          error.response?.data?.message ||
            "Unable to load ad platforms.",
        );
      } finally {
        setLoading(false);
      }
    };

    if (!permissionsLoading && canCreateCampaigns) {
      loadPlatforms();
    }
  }, [permissionsLoading, canCreateCampaigns]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        platformDropdownRef.current &&
        !platformDropdownRef.current.contains(event.target)
      ) {
        setShowPlatformOptions(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);

    return () =>
      document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();

    const name = campaignName.trim();
    const description = campaignDescription.trim() || null;

    if (!name) {
      setFormError("Campaign name is required.");
      return;
    }

    if (!campaignObjective) {
      setFormError("Campaign objective is required.");
      return;
    }

    if (!campaignPlatform) {
      setFormError("Ad platform is required.");
      return;
    }

    if (!campaignStartDate) {
      setFormError("Start date is required.");
      return;
    }

    if (
      campaignEndDate &&
      campaignEndDate < campaignStartDate
    ) {
      setFormError("End date cannot be before start date.");
      return;
    }

    try {
      setSaving(true);
      setFormError("");

      await createAdCampaign({
        name,
        description,
        objective: campaignObjective,
        platform_id: Number(campaignPlatform),
        start_date: campaignStartDate,
        end_date: campaignEndDate || null,
      });

      navigate("/ad-campaigns");
    } catch (error) {
      setFormError(
        error.response?.data?.message ||
          "Unable to create ad campaign.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (permissionsLoading || loading) {
    return <Loader />;
  }

  if (!canCreateCampaigns) {
    return null;
  }

  const filteredPlatforms = platforms
    .filter((platform) => platform.is_active)
    .filter((platform) =>
      platform.name
        .toLowerCase()
        .includes(platformSearch.toLowerCase()),
    );

  return (
    <div
      className={`ad-campaign-create-page ${theme}-theme`}
    >
      <div className="ad-campaign-create-header">
        <div>
          <span className="standard-page-eyebrow">AD MANAGEMENT</span>
          <h1>Create Ad Campaign</h1>

          <p>
            Add a new advertising campaign.
          </p>
        </div>
      </div>

      <div className="ad-campaign-create-card">
        <form onSubmit={handleSubmit}>
          <div className="ad-campaign-create-form-group">
            <label htmlFor="campaign-name">
              Campaign Name
              <span className="required">*</span>
            </label>

            <input
              id="campaign-name"
              type="text"
              placeholder="Enter campaign name"
              value={campaignName}
              onChange={(event) => {
                setCampaignName(event.target.value);
                setFormError("");
              }}
              disabled={saving}
              autoFocus
            />
          </div>

          <div className="ad-campaign-create-form-group">
            <label htmlFor="campaign-description">
              Description
            </label>

            <textarea
              id="campaign-description"
              placeholder="Enter campaign description"
              value={campaignDescription}
              onChange={(event) => {
                setCampaignDescription(event.target.value);
                setFormError("");
              }}
              disabled={saving}
            />
          </div>

          <div className="ad-campaign-create-form-row">
            <div className="ad-campaign-create-form-group">
              <label htmlFor="campaign-objective">
                Objective
                <span className="required">*</span>
              </label>

              <input
                id="campaign-objective"
                type="text"
                placeholder="Enter campaign objective"
                value={campaignObjective}
                onChange={(event) => {
                  setCampaignObjective(event.target.value);
                  setFormError("");
                }}
                disabled={saving}
              />
            </div>

            <div className="ad-campaign-create-form-group">
              <label htmlFor="campaign-platform">
                Platform
                <span className="required">*</span>
              </label>

              <div
                className="ad-campaign-create-platform-search"
                ref={platformDropdownRef}
              >
                <input
                  id="campaign-platform"
                  type="text"
                  placeholder="Search platform"
                  value={platformSearch}
                  onFocus={() =>
                    setShowPlatformOptions(true)
                  }
                  onChange={(event) => {
                    setPlatformSearch(event.target.value);
                    setCampaignPlatform("");
                    setShowPlatformOptions(true);
                    setFormError("");
                  }}
                  disabled={saving}
                />

                {showPlatformOptions && (
                  <div className="ad-campaign-create-platform-options">
                    {filteredPlatforms.map((platform) => (
                      <button
                        type="button"
                        key={platform.id}
                        className="ad-campaign-create-platform-option"
                        onClick={() => {
                          setCampaignPlatform(
                            String(platform.id),
                          );

                          setPlatformSearch(platform.name);
                          setShowPlatformOptions(false);
                          setFormError("");
                        }}
                      >
                        {platform.name}
                      </button>
                    ))}

                    {filteredPlatforms.length === 0 && (
                      <div className="ad-campaign-create-platform-no-result">
                        No platform found
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="ad-campaign-create-form-row">
            <div className="ad-campaign-create-form-group">
              <label htmlFor="campaign-start-date">
                Start Date
                <span className="required">*</span>
              </label>

              <CustomDatePicker
                id="campaign-start-date"
                value={campaignStartDate}
                onChange={(event) => {
                  setCampaignStartDate(event.target.value);
                  setFormError("");
                }}
                disabled={saving}
              />
            </div>

            <div className="ad-campaign-create-form-group">
              <label htmlFor="campaign-end-date">
                End Date
              </label>

              <CustomDatePicker
                id="campaign-end-date"
                value={campaignEndDate}
                onChange={(event) => {
                  setCampaignEndDate(event.target.value);
                  setFormError("");
                }}
                disabled={saving}
              />
            </div>
          </div>

          {formError && (
            <div className="ad-campaign-create-form-error">
              {formError}
            </div>
          )}

          <div className="ad-campaign-create-actions">
            <button
              type="button"
              className="ad-campaign-create-cancel-button"
              onClick={() => navigate("/ad-campaigns")}
              disabled={saving}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="ad-campaign-create-submit-button"
              disabled={saving}
            >
              {saving ? "Creating..." : "Create Campaign"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AdCampaignCreate;