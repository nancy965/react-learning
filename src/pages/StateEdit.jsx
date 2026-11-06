import React, { useEffect, useState } from "react";
import {
  useNavigate,
  useParams,
} from "react-router-dom";

import "./StateEdit.css";

import { useTheme } from "../context/ThemeContext";
import { usePermission } from "../context/PermissionContext";
import Loader from "../components/Loader";
import SearchableDropdown from "../components/SearchableDropdown";

import { getStateById, updateState } from "../services/stateService";

import { getCountries } from "../services/countryService";

function StateEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { theme } = useTheme();

  const {
    hasPermission,
    loading: permissionsLoading,
  } = usePermission();

  const canEditStates = hasPermission("states.edit");

  const [countries, setCountries] = useState([]);
  const [selectedCountry, setSelectedCountry] =
    useState("");
  const [stateName, setStateName] = useState("");
  const [stateActive, setStateActive] =
    useState(true);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [countriesPage, setCountriesPage] = useState(1);
  const [countriesTotalPages, setCountriesTotalPages] = useState(1);
  const [countriesLoading, setCountriesLoading] = useState(false);
  const [countriesSearch, setCountriesSearch] = useState("");
  const searchTimer = React.useRef(null);

  const loadCountries = async (page = 1, search = "", append = false) => {
    try {
      setCountriesLoading(true);
      const response = await getCountries(page, 50, search, "active");
      const data = response?.data?.data || [];
      const pagination = response?.data?.pagination;

      if (append) {
        setCountries(prev => {
          const existingIds = new Set(prev.map(c => String(c.id)));
          const uniqueNew = data.filter(c => !existingIds.has(String(c.id)));
          return [...prev, ...uniqueNew];
        });
      } else {
        setCountries(data);
      }

      setCountriesPage(pagination?.page || page);
      setCountriesTotalPages(pagination?.totalPages || 1);
    } catch (error) {
      console.error("GET COUNTRIES ERROR:", error);
    } finally {
      setCountriesLoading(false);
    }
  };

  useEffect(() => {
  const loadData = async () => {
    try {
      setLoading(true);
      setFormError("");

      const response = await getStateById(id);
      const state = response?.data;

      if (!state) {
        setFormError("State not found.");
        return;
      }

      setSelectedCountry(state.country_id || "");
      setStateName(state.name || "");
      setStateActive(state.is_active ?? true);

      await loadCountries(1, "");

      if (state.country_id) {
        setCountries((previousCountries) => {
          const exists = previousCountries.some(
            (country) =>
              String(country.id) ===
              String(state.country_id)
          );

          if (exists) {
            return previousCountries;
          }

          return [
            {
              id: state.country_id,
              name: state.country_name,
            },
            ...previousCountries,
          ];
        });
      }
    } catch (error) {
      setFormError(
        error.response?.data?.message ||
          "Unable to load state."
      );
    } finally {
      setLoading(false);
    }
  };

  if (!permissionsLoading && canEditStates) {
    loadData();
  }
}, [id, permissionsLoading, canEditStates]);

  const handleCountrySearch = (value) => {
    setCountriesSearch(value);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      loadCountries(1, value);
    }, 300);
  };

  const loadMoreCountries = () => {
    if (!countriesLoading && countriesPage < countriesTotalPages) {
      loadCountries(countriesPage + 1, countriesSearch, true);
    }
  };

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

      await updateState(id, {
        country_id: finalCountryId,
        name,
        is_active: stateActive,
      });

      navigate("/states");
    } catch (error) {
      setFormError(
        error.response?.data?.message ||
          "Unable to update state.",
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

  if (!canEditStates) {
    return null;
  }

  return (
    <div
      className={`state-edit-page ${
        theme === "dark"
          ? "dark-theme"
          : "light-theme"
      }`}
    >
      <div className="state-edit-header">
        <div className="state-edit-title">
          <span className="state-breadcrumb-tag">LOCATION MANAGEMENT</span>
          <h1>Edit State</h1>

          <p>
            Update state information.
          </p>
        </div>
      </div>

      <div className="state-edit-card">
        <form onSubmit={handleSubmit}>
          <div className="state-edit-field">
            <label>
              Country
            </label>

            <SearchableDropdown
              value={selectedCountry}
              options={countries}
              onChange={(value) => {
                setSelectedCountry(value);
                setFormError("");
              }}
              onOpen={() => {
                if (countries.length === 0) loadCountries(1, "");
              }}
              onSearchChange={handleCountrySearch}
              onLoadMore={loadMoreCountries}
              placeholder="Select country"
              searchPlaceholder="Search country..."
              disabled={saving}
              getOptionValue={(country) => country.id}
              getOptionLabel={(country) => country.name}
            />
          </div>

          <div className="state-edit-field">
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

          <div className="state-edit-toggle-row">
            <div className="state-edit-toggle-content">
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
              className={`state-edit-toggle ${
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
              <span className="state-edit-toggle-circle"></span>
            </button>
          </div>

          {formError && (
            <div className="state-edit-error">
              {formError}
            </div>
          )}

          <div className="state-edit-actions">
            <button
              type="button"
              className="state-edit-cancel"
              onClick={() =>
                navigate("/states")
              }
              disabled={saving}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="state-edit-submit"
              disabled={saving}
            >
              {saving
                ? "Updating..."
                : "Update State"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default StateEdit;