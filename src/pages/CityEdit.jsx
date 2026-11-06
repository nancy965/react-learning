import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import "./CityEdit.css";

import { useTheme } from "../context/ThemeContext";
import { usePermission } from "../context/PermissionContext";
import Loader from "../components/Loader";
import SearchableDropdown from "../components/SearchableDropdown";

import { getCityById, updateCity } from "../services/cityService";

import { getStates } from "../services/stateService";
import ConfirmDialog from "../components/ConfirmDialog";

function CityEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { theme } = useTheme();

  const { hasPermission, loading: permissionsLoading } = usePermission();

  const canEditCities = hasPermission("cities.edit");

  const [states, setStates] = useState([]);
  const [selectedState, setSelectedState] = useState("");
  const [cityName, setCityName] = useState("");
  const [cityActive, setCityActive] = useState(true);
  const [originalCityActive, setOriginalCityActive] = useState(true);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [confirmAction, setConfirmAction] = useState(null);

  const [statesPage, setStatesPage] = useState(1);
  const [statesTotalPages, setStatesTotalPages] = useState(1);
  const [statesLoading, setStatesLoading] = useState(false);
  const [statesSearch, setStatesSearch] = useState("");
  const searchTimer = React.useRef(null);

  const loadStates = async (page = 1, search = "", append = false) => {
    try {
      setStatesLoading(true);

      const response = await getStates(page, 50, search, "active");

      const data = response?.data || [];
      const pagination = response?.pagination;

      if (append) {
        setStates((prev) => {
          const existingIds = new Set(prev.map((state) => String(state.id)));

          const uniqueNew = data.filter(
            (state) => !existingIds.has(String(state.id)),
          );

          return [...prev, ...uniqueNew];
        });
      } else {
        setStates(data);
      }

      setStatesPage(pagination?.page || page);

      setStatesTotalPages(pagination?.totalPages || 1);
    } catch (error) {
      console.error("GET STATES ERROR:", error);
    } finally {
      setStatesLoading(false);
    }
  };

  useEffect(() => {
  const loadData = async () => {
    try {
      setLoading(true);
      setFormError("");

      const response = await getCityById(id);
      const city = response?.data;

      if (!city) {
        setFormError("City not found.");
        return;
      }

      setSelectedState(city.state_id || "");
      setCityName(city.name || "");

      const activeStatus = city.is_active ?? true;
      setCityActive(activeStatus);
      setOriginalCityActive(activeStatus);

      await loadStates(1, "");

      if (city.state_id) {
        setStates((previousStates) => {
          const exists = previousStates.some(
            (state) =>
              String(state.id) === String(city.state_id)
          );

          if (exists) {
            return previousStates;
          }

          return [
            {
              id: city.state_id,
              name: city.state_name,
            },
            ...previousStates,
          ];
        });
      }
    } catch (error) {
      setFormError(
        error.response?.data?.message ||
          "Unable to load city."
      );
    } finally {
      setLoading(false);
    }
  };

  if (!permissionsLoading && canEditCities) {
    loadData();
  }
}, [id, permissionsLoading, canEditCities]);

  const handleStateSearch = (value) => {
    setStatesSearch(value);

    clearTimeout(searchTimer.current);

    searchTimer.current = setTimeout(() => {
      loadStates(1, value);
    }, 300);
  };

  const loadMoreStates = () => {
    if (!statesLoading && statesPage < statesTotalPages) {
      loadStates(statesPage + 1, statesSearch, true);
    }
  };

  const performSubmit = async (name) => {
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

      const response = await updateCity(id, {
        state_id: finalStateId,
        name,
        is_active: cityActive,
      });

      if (!response.success) {
        setFormError(
          response.message ||
            "Unable to update city."
        );
        return;
      }

      navigate("/cities");
    } catch (error) {
      setFormError(
        error.response?.data?.message ||
          "Unable to update city."
      );
    } finally {
      setSaving(false);
    }
  };

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
        "City name should contain only letters."
      );
      return;
    }

    if (cityActive !== originalCityActive) {
      const action = cityActive
        ? "activate"
        : "deactivate";

      setConfirmAction({ action, name });
      return;
    }

    await performSubmit(name);
  };

  const handleConfirmAction = async () => {
    const name = confirmAction?.name || cityName.trim();
    setConfirmAction(null);
    await performSubmit(name);
  };

  if (permissionsLoading || loading) {
    return <Loader />;
  }

  if (!canEditCities) {
    return null;
  }

  return (
    <div
      className={`city-edit-page ${
        theme === "dark" ? "dark-theme" : "light-theme"
      }`}
    >
      <div className="city-edit-header">
        <div className="city-edit-title">
          <span className="city-breadcrumb-tag">LOCATION MANAGEMENT</span>
          <h1>Edit City</h1>

          <p>Update city information.</p>
        </div>
      </div>

      <div className="city-edit-card">
        <form onSubmit={handleSubmit}>
          <div className="city-edit-field">
            <label>State</label>

            <SearchableDropdown
              value={selectedState}
              options={states}
              onChange={(value) => {
                setSelectedState(value);
                setFormError("");
              }}
              onOpen={() => {
                if (states.length <= 1) {
                  loadStates(1, "");
                }
              }}
              onSearchChange={handleStateSearch}
              onLoadMore={loadMoreStates}
              placeholder="Select state"
              searchPlaceholder="Search state..."
              disabled={saving}
              getOptionValue={(state) => state.id}
              getOptionLabel={(state) =>
                `${state.name}${
                  state.country_name ? ` - ${state.country_name}` : ""
                }`
              }
            />
          </div>

          <div className="city-edit-field">
            <label htmlFor="city-name">City Name</label>

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

          <div className="city-edit-toggle-row">
            <div className="city-edit-toggle-content">
              <strong>Active Status</strong>

              <span>Allow this city to be used in the system.</span>
            </div>

            <button
              type="button"
              className={`city-edit-toggle ${cityActive ? "active" : ""}`}
              onClick={() => setCityActive((previous) => !previous)}
              disabled={saving}
            >
              <span className="city-edit-toggle-circle"></span>
            </button>
          </div>

          {formError && <div className="city-edit-error">{formError}</div>}

          <div className="city-edit-actions">
            <button
              type="button"
              className="city-edit-cancel"
              onClick={() => navigate("/cities")}
              disabled={saving}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="city-edit-submit"
              disabled={saving}
            >
              {saving ? "Updating..." : "Update City"}
            </button>
          </div>
        </form>
      </div>

      {confirmAction && (
        <ConfirmDialog
          title="Confirm Action"
          message={`Are you sure you want to ${confirmAction.action} ${confirmAction.name}?`}
          confirmText={confirmAction.action === "activate" ? "Yes, Activate" : "Yes, Deactivate"}
          cancelText="Cancel"
          onConfirm={handleConfirmAction}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </div>
  );
}

export default CityEdit;
