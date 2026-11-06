import { useState } from "react";
import { useNavigate } from "react-router-dom";

import "./CountryCreate.css";

import { useTheme } from "../context/ThemeContext";
import { usePermission } from "../context/PermissionContext";
import Loader from "../components/Loader";

import { createCountry } from "../services/countryService";

function CountryCreate() {
  const navigate = useNavigate();
  const { theme } = useTheme();

  const {
    hasPermission,
    loading: permissionsLoading,
  } = usePermission();

  const canCreateCountries =
    hasPermission("countries.create");

  const [countryName, setCountryName] = useState("");
  const [countryActive, setCountryActive] =
    useState(true);

  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    const name = countryName.trim();

    if (!name) {
      setFormError("Country name is required.");
      return;
    }

    if (!/^[A-Za-z ]+$/.test(name)) {
      setFormError(
        "Country name should contain only letters.",
      );
      return;
    }

    try {
      setSaving(true);
      setFormError("");

      await createCountry({
        name,
        is_active: countryActive,
      });

      navigate("/countries");
    } catch (error) {
      setFormError(
        error.response?.data?.message ||
          "Unable to create country.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (permissionsLoading) {
    return <Loader />;
  }

  if (!canCreateCountries) {
    return null;
  }

  return (
    <div
      className={`country-create-page ${
        theme === "dark"
          ? "dark-theme"
          : "light-theme"
      }`}
    >
      <div className="country-create-header">
        <div className="country-create-title">
          <span className="country-breadcrumb-tag">LOCATION MANAGEMENT</span>
          <h1>Create Country</h1>

          <p>
            Add a new country to the system.
          </p>
        </div>
      </div>

      <div className="country-create-card">
        <form onSubmit={handleSubmit}>
          <div className="country-create-field">
            <label htmlFor="country-name">
              Country Name
            </label>

            <input
              id="country-name"
              type="text"
              placeholder="Enter country name"
              value={countryName}
              onChange={(event) => {
                setCountryName(
                  event.target.value,
                );
                setFormError("");
              }}
              disabled={saving}
              autoFocus
            />
          </div>

          <div className="country-create-toggle-row">
            <div className="country-create-toggle-content">
              <strong>
                Active Status
              </strong>

              <span>
                Allow this country to be used
                in the system.
              </span>
            </div>

            <button
              type="button"
              className={`country-create-toggle ${
                countryActive
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                setCountryActive(
                  (previous) =>
                    !previous,
                )
              }
              disabled={saving}
            >
              <span className="country-create-toggle-circle"></span>
            </button>
          </div>

          {formError && (
            <div className="country-create-error">
              {formError}
            </div>
          )}

          <div className="country-create-actions">
            <button
              type="button"
              className="country-create-cancel"
              onClick={() =>
                navigate("/countries")
              }
              disabled={saving}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="country-create-submit"
              disabled={saving}
            >
              {saving
                ? "Creating..."
                : "Create Country"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CountryCreate;