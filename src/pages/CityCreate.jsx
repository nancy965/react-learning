import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import "./CityCreate.css";

import { useTheme } from "../context/ThemeContext";
import { usePermission } from "../context/PermissionContext";
import Loader from "../components/Loader";
import SearchableDropdown from "../components/SearchableDropdown";

import { createCity } from "../services/cityService";
import { getStates } from "../services/stateService";

function CityCreate() {
  const navigate = useNavigate();
  const { theme } = useTheme();

  const {
    hasPermission,
    loading: permissionsLoading,
  } = usePermission();

  const canCreateCities = hasPermission("cities.create");

  const [states, setStates] = useState([]);
  const [selectedState, setSelectedState] = useState("");
  const [cityName, setCityName] = useState("");
  const [cityActive, setCityActive] = useState(true);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    const loadStates = async () => {
      try {
        setLoading(true);

        const response = await getStates();

        if (response.success) {
          setStates(response.data || []);
        }
      } catch (error) {
        setFormError(
          error.response?.data?.message ||
            "Unable to load states.",
        );
      } finally {
        setLoading(false);
      }
    };

    if (!permissionsLoading && canCreateCities) {
      loadStates();
    }
  }, [permissionsLoading, canCreateCities]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    const name = cityName.trim();

    if (!selectedState) {
      setFormError("Please select a state.");
      return;
    }

    if (!name) {
      setFormError("City name is required.");
      return;
    }

    if (!/^[A-Za-z ]+$/.test(name)) {
      setFormError(
        "City name should contain only letters.",
      );
      return;
    }

    try {
      setSaving(true);
      setFormError("");

      const formattedStateId =
        typeof selectedState === "object" && selectedState !== null
          ? selectedState.id || selectedState.value
          : selectedState;
      const finalStateId = /^\d+$/.test(String(formattedStateId).trim())
        ? Number(formattedStateId)
        : formattedStateId;

      const response = await createCity({
        state_id: finalStateId,
        name,
        is_active: cityActive,
      });

      if (!response.success) {
        setFormError(
          response.message || "Unable to create city.",
        );
        return;
      }

      navigate("/cities");
    } catch (error) {
      setFormError(
        error.response?.data?.message ||
          "Unable to create city.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (permissionsLoading || loading) {
    return <Loader />;
  }

  if (!canCreateCities) {
    return null;
  }

  return (
    <div className={`city-create-page ${theme}-theme`}>
      <div className="city-create-header">
        <div className="city-create-title">
          <span className="city-breadcrumb-tag">LOCATION MANAGEMENT</span>
          <h1>Create City</h1>

          <p>
            Add a new city to the system.
          </p>
        </div>
      </div>

      <div className="city-create-card">
        <form onSubmit={handleSubmit}>
          <div className="city-create-field">
            <label htmlFor="city-state">
              State
            </label>

            <div
              id="city-state"
              className="city-create-dropdown"
            >
              <SearchableDropdown
                value={selectedState}
                options={states.filter(
                  (state) => state.is_active,
                )}
                onChange={(value) => {
                  setSelectedState(value);
                  setFormError("");
                }}
                placeholder="Select state"
                searchPlaceholder="Search state..."
                disabled={saving}
                getOptionValue={(state) => state.id}
                getOptionLabel={(state) =>
                  `${state.name}${
                    state.country_name
                      ? ` - ${state.country_name}`
                      : ""
                  }`
                }
              />
            </div>
          </div>

          <div className="city-create-field">
            <label htmlFor="city-name">
              City Name
            </label>

            <input
              id="city-name"
              type="text"
              placeholder="Enter city name"
              value={cityName}
              onChange={(event) => {
                setCityName(event.target.value);
                setFormError("");
              }}
              disabled={saving}
              autoFocus
            />
          </div>

          <div className="city-create-toggle-row">
            <div className="city-create-toggle-content">
              <strong>Active Status</strong>

              <span>
                Allow this city to be used in the
                system.
              </span>
            </div>

            <button
              type="button"
              className={`city-create-toggle ${
                cityActive ? "active" : ""
              }`}
              onClick={() =>
                setCityActive((previous) => !previous)
              }
              disabled={saving}
            >
              <span className="city-create-toggle-circle"></span>
            </button>
          </div>

          {formError && (
            <div className="city-create-error">
              {formError}
            </div>
          )}

          <div className="city-create-actions">
            <button
              type="button"
              className="city-create-cancel"
              onClick={() => navigate("/cities")}
              disabled={saving}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="city-create-submit"
              disabled={saving}
            >
              {saving ? "Creating..." : "Create City"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CityCreate;