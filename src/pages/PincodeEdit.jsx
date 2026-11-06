import React, { useEffect, useState } from "react";
import {
  useNavigate,
  useParams,
} from "react-router-dom";

import "./PincodeEdit.css";

import { useTheme } from "../context/ThemeContext";
import { usePermission } from "../context/PermissionContext";
import Loader from "../components/Loader";
import SearchableDropdown from "../components/SearchableDropdown";

import {
  getPincodeById,
  updatePincode,
} from "../services/pincodeService";

import { getCities } from "../services/cityService";

function PincodeEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { theme } = useTheme();

  const {
    hasPermission,
    loading: permissionsLoading,
  } = usePermission();

  const canEditPincodes =
    hasPermission("pincodes.edit");

  const [cities, setCities] = useState([]);
  const [selectedCity, setSelectedCity] =
    useState("");
  const [pincode, setPincode] =
    useState("");
  const [pincodeActive, setPincodeActive] =
    useState(true);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [citiesPage, setCitiesPage] = useState(1);
  const [citiesTotalPages, setCitiesTotalPages] = useState(1);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [citiesSearch, setCitiesSearch] = useState("");
  const searchTimer = React.useRef(null);

  const loadCities = async (page = 1, search = "", append = false) => {
    try {
      setCitiesLoading(true);
      const response = await getCities(page, 50, search, "active");
      const data = response?.data || [];
      const pagination = response?.pagination;

      if (append) {
        setCities(prev => {
          const existingIds = new Set(prev.map(c => String(c.id)));
          const uniqueNew = data.filter(c => !existingIds.has(String(c.id)));
          return [...prev, ...uniqueNew];
        });
      } else {
        setCities(data);
      }

      setCitiesPage(pagination?.page || page);
      setCitiesTotalPages(pagination?.totalPages || 1);
    } catch (error) {
      console.error("GET CITIES ERROR:", error);
    } finally {
      setCitiesLoading(false);
    }
  };

  useEffect(() => {
  const loadData = async () => {
    try {
      setLoading(true);
      setFormError("");

      const response = await getPincodeById(id);

console.log("GET PINCODE BY ID RESPONSE:", response);

const currentPincode = response?.pincode;

      if (!currentPincode) {
        setFormError("Pincode not found.");
        return;
      }

      setSelectedCity(
        currentPincode.city_id || ""
      );

      setPincode(
        currentPincode.pincode || ""
      );

      setPincodeActive(
        currentPincode.is_active ?? true
      );

      await loadCities(1, "");

      if (currentPincode.city_id) {
        setCities((previousCities) => {
          const exists = previousCities.some(
            (city) =>
              String(city.id) ===
              String(currentPincode.city_id)
          );

          if (exists) {
            return previousCities;
          }

          return [
            {
              id: currentPincode.city_id,
              name: currentPincode.city_name,
              state_name:
                currentPincode.state_name,
              country_name:
                currentPincode.country_name,
            },
            ...previousCities,
          ];
        });
      }
    } catch (error) {
      setFormError(
        error.response?.data?.message ||
          "Unable to load pincode."
      );
    } finally {
      setLoading(false);
    }
  };

  if (!permissionsLoading && canEditPincodes) {
    loadData();
  }
}, [
  id,
  permissionsLoading,
  canEditPincodes,
]);

  const handleCitySearch = (value) => {
    setCitiesSearch(value);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      loadCities(1, value);
    }, 300);
  };

  const loadMoreCities = () => {
    if (!citiesLoading && citiesPage < citiesTotalPages) {
      loadCities(citiesPage + 1, citiesSearch, true);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const pincodeValue =
      String(pincode).trim();

    if (!selectedCity) {
      setFormError(
        "Please select a city.",
      );
      return;
    }

    if (!pincodeValue) {
      setFormError(
        "Pincode is required.",
      );
      return;
    }

    if (
      !/^[A-Za-z0-9 -]+$/.test(
        pincodeValue,
      )
    ) {
      setFormError(
        "Pincode should contain only letters, numbers, spaces or hyphens.",
      );
      return;
    }

    try {
      setSaving(true);
      setFormError("");

      const formattedCityId =
        typeof selectedCity === "object" && selectedCity !== null
          ? selectedCity.id || selectedCity.value
          : selectedCity;
      const finalCityId = /^\d+$/.test(String(formattedCityId).trim())
        ? Number(formattedCityId)
        : formattedCityId;

      const response =
        await updatePincode(
          id,
          {
            city_id: finalCityId,
            pincode: pincodeValue,
            is_active: pincodeActive,
          },
        );

      if (!response.success) {
        setFormError(
          response.message ||
            "Unable to update pincode.",
        );
        return;
      }

      navigate("/pincodes");
    } catch (error) {
      setFormError(
        error.response?.data?.message ||
          "Unable to update pincode.",
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

  if (!canEditPincodes) {
    return null;
  }

  return (
    <div
      className={`pincode-edit-page ${
        theme === "dark"
          ? "dark-theme"
          : "light-theme"
      }`}
    >
      <div className="pincode-edit-header">
        <div className="pincode-edit-title">
          <span className="pincode-breadcrumb-tag">LOCATION MANAGEMENT</span>
          <h1>Edit Pincode</h1>

          <p>
            Update pincode information.
          </p>
        </div>
      </div>

      <div className="pincode-edit-card">
        <form onSubmit={handleSubmit}>
          <div className="pincode-edit-field">
            <label>
              City
            </label>

            <SearchableDropdown
              value={selectedCity}
              options={cities}
              onChange={(value) => {
                setSelectedCity(value);
                setFormError("");
              }}
              onOpen={() => {
                if (cities.length <= 1) loadCities(1, "");
              }}
              onSearchChange={handleCitySearch}
              onLoadMore={loadMoreCities}
              placeholder="Select City"
              searchPlaceholder="Search city..."
              disabled={saving}
              getOptionValue={(city) => city.id}
              getOptionLabel={(city) =>
                `${city.name}${
                  city.state_name
                    ? ` - ${city.state_name}`
                    : ""
                }${
                  city.country_name
                    ? ` - ${city.country_name}`
                    : ""
                }`
              }
            />
          </div>

          <div className="pincode-edit-field">
            <label htmlFor="pincode">
              Pincode
            </label>

            <input
              id="pincode"
              type="text"
              value={pincode}
              onChange={(event) => {
                setPincode(
                  event.target.value,
                );
                setFormError("");
              }}
              placeholder="Enter pincode"
              maxLength="50"
              disabled={saving}
              autoFocus
            />
          </div>

          <div className="pincode-edit-toggle-row">
            <div className="pincode-edit-toggle-content">
              <strong>
                Active Status
              </strong>

              <span>
                Allow this pincode to be used
                in the system.
              </span>
            </div>

            <button
              type="button"
              className={`pincode-edit-toggle ${
                pincodeActive
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                setPincodeActive(
                  (previous) =>
                    !previous,
                )
              }
              disabled={saving}
            >
              <span className="pincode-edit-toggle-circle"></span>
            </button>
          </div>

          {formError && (
            <div className="pincode-edit-error">
              {formError}
            </div>
          )}

          <div className="pincode-edit-actions">
            <button
              type="button"
              className="pincode-edit-cancel"
              onClick={() =>
                navigate("/pincodes")
              }
              disabled={saving}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="pincode-edit-submit"
              disabled={saving}
            >
              {saving
                ? "Updating..."
                : "Update Pincode"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default PincodeEdit;