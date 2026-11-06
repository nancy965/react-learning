import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import "./CountryEdit.css";

import { useTheme } from "../context/ThemeContext";
import { usePermission } from "../context/PermissionContext";
import Loader from "../components/Loader";

import {
  getCountries,
  updateCountry,
} from "../services/countryService";

function CountryEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { theme } = useTheme();

  const {
    hasPermission,
    loading: permissionsLoading,
  } = usePermission();

  const canEditCountries =
    hasPermission("countries.edit");

  const [countryName, setCountryName] = useState("");
  const [countryActive, setCountryActive] =
    useState(true);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    const fetchCountry = async () => {
      try {
        setLoading(true);
        setFormError("");

        const response = await getCountries(
          1,
          250,
          "",
          "all",
        );

        const countries =
          response.data?.data || [];

        const country = countries.find(
          (item) =>
            String(item.id) === String(id),
        );

        if (!country) {
          setFormError(
            "Country not found.",
          );
          return;
        }

        setCountryName(country.name || "");
        setCountryActive(
          country.is_active ?? true,
        );
      } catch (error) {
        setFormError(
          error.response?.data?.message ||
            "Unable to load country.",
        );
      } finally {
        setLoading(false);
      }
    };

    if (
      !permissionsLoading &&
      canEditCountries
    ) {
      fetchCountry();
    }
  }, [
    id,
    permissionsLoading,
    canEditCountries,
  ]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    const name = countryName.trim();

    if (!name) {
      setFormError(
        "Country name is required.",
      );
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

      await updateCountry(id, {
        name,
        is_active: countryActive,
      });

      navigate("/countries");
    } catch (error) {
      setFormError(
        error.response?.data?.message ||
          "Unable to update country.",
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

  if (!canEditCountries) {
    return null;
  }

  return (
    <div
      className={`country-edit-page ${
        theme === "dark"
          ? "dark-theme"
          : "light-theme"
      }`}
    >
      <div className="country-edit-header">
        <div className="country-edit-title">
          <span className="country-breadcrumb-tag">LOCATION MANAGEMENT</span>
          <h1>Edit Country</h1>

          <p>
            Update country information.
          </p>
        </div>
      </div>

      <div className="country-edit-card">
        <form onSubmit={handleSubmit}>
          <div className="country-edit-field">
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

          <div className="country-edit-toggle-row">
            <div className="country-edit-toggle-content">
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
              className={`country-edit-toggle ${
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
              <span className="country-edit-toggle-circle"></span>
            </button>
          </div>

          {formError && (
            <div className="country-edit-error">
              {formError}
            </div>
          )}

          <div className="country-edit-actions">
            <button
              type="button"
              className="country-edit-cancel"
              onClick={() =>
                navigate("/countries")
              }
              disabled={saving}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="country-edit-submit"
              disabled={saving}
            >
              {saving
                ? "Updating..."
                : "Update Country"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CountryEdit;