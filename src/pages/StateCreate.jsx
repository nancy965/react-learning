import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import "./StateCreate.css";

import { useTheme } from "../context/ThemeContext";
import { usePermission } from "../context/PermissionContext";
import Loader from "../components/Loader";
import SearchableDropdown from "../components/SearchableDropdown";

import { createState } from "../services/stateService";
import { getCountries } from "../services/countryService";

function StateCreate() {
  const navigate = useNavigate();
  const { theme } = useTheme();

  const {
    hasPermission,
    loading: permissionsLoading,
  } = usePermission();

  const canCreateStates =
    hasPermission("states.create");

  const [countries, setCountries] = useState([]);
  const [selectedCountry, setSelectedCountry] =
    useState("");
  const [stateName, setStateName] = useState("");
  const [stateActive, setStateActive] =
    useState(true);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    const loadCountries = async () => {
      try {
        setLoading(true);
        setFormError("");

        const response = await getCountries();

        const data =
          response?.data?.data || [];

        data.sort(
          (a, b) => a.id - b.id,
        );

        setCountries(data);
      } catch (error) {
        setFormError(
          error.response?.data?.message ||
            "Unable to load countries.",
        );
      } finally {
        setLoading(false);
      }
    };

    if (
      !permissionsLoading &&
      canCreateStates
    ) {
      loadCountries();
    }
  }, [
    permissionsLoading,
    canCreateStates,
  ]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    const name = stateName.trim();

    if (!selectedCountry) {
      setFormError(
        "Please select a country.",
      );
      return;
    }

    if (!name) {
      setFormError(
        "State name is required.",
      );
      return;
    }

    if (!/^[A-Za-z ]+$/.test(name)) {
      setFormError(
        "State name should contain only letters.",
      );
      return;
    }

    try {
      setSaving(true);
      setFormError("");

      const formattedCountryId =
        typeof selectedCountry === "object" && selectedCountry !== null
          ? selectedCountry.id || selectedCountry.value
          : selectedCountry;
      const finalCountryId = /^\d+$/.test(String(formattedCountryId).trim())
        ? Number(formattedCountryId)
        : formattedCountryId;

      await createState({
        country_id: finalCountryId,
        name,
        is_active: stateActive,
      });

      navigate("/states");
    } catch (error) {
      setFormError(
        error.response?.data?.message ||
          "Unable to create state.",
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

  if (!canCreateStates) {
    return null;
  }

  return (
    <div
      className={`state-create-page ${
        theme === "dark"
          ? "dark-theme"
          : "light-theme"
      }`}
    >
      <div className="state-create-header">
        <div className="state-create-title">
          <span className="state-breadcrumb-tag">LOCATION MANAGEMENT</span>
          <h1>Create State</h1>

          <p>
            Add a new state to the system.
          </p>
        </div>
      </div>

      <div className="state-create-card">
        <form onSubmit={handleSubmit}>
          <div className="state-create-field">
            <label>
              Country
            </label>

            <SearchableDropdown
              value={selectedCountry}
              options={countries.filter(
                (country) =>
                  country.is_active,
              )}
              onChange={(value) => {
                setSelectedCountry(value);
                setFormError("");
              }}
              placeholder="Select country"
              searchPlaceholder="Search country..."
              disabled={saving}
              getOptionValue={(country) =>
                country.id
              }
              getOptionLabel={(country) =>
                country.name
              }
            />
          </div>

          <div className="state-create-field">
            <label htmlFor="state-name">
              State/Province Name
            </label>

            <input
              id="state-name"
              type="text"
              placeholder="Enter state name"
              value={stateName}
              onChange={(event) => {
                setStateName(
                  event.target.value,
                );
                setFormError("");
              }}
              disabled={saving}
              autoFocus
            />
          </div>

          <div className="state-create-toggle-row">
            <div className="state-create-toggle-content">
              <strong>
                Active Status
              </strong>

              <span>
                Allow this state to be used
                in the system.
              </span>
            </div>

            <button
              type="button"
              className={`state-create-toggle ${
                stateActive
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                setStateActive(
                  (previous) =>
                    !previous,
                )
              }
              disabled={saving}
            >
              <span className="state-create-toggle-circle"></span>
            </button>
          </div>

          {formError && (
            <div className="state-create-error">
              {formError}
            </div>
          )}

          <div className="state-create-actions">
            <button
              type="button"
              className="state-create-cancel"
              onClick={() =>
                navigate("/states")
              }
              disabled={saving}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="state-create-submit"
              disabled={saving}
            >
              {saving
                ? "Creating..."
                : "Create State"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default StateCreate;