import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import "./PincodeCreate.css";

import { useTheme } from "../context/ThemeContext";
import { usePermission } from "../context/PermissionContext";
import Loader from "../components/Loader";
import SearchableDropdown from "../components/SearchableDropdown";

import { createPincode } from "../services/pincodeService";
import { getCities } from "../services/cityService";

function PincodeCreate() {
  const navigate = useNavigate();
  const { theme } = useTheme();

  const {
    hasPermission,
    loading: permissionsLoading,
  } = usePermission();

  const canCreatePincodes =
    hasPermission("pincodes.create");

  const [cities, setCities] = useState([]);
  const [selectedCity, setSelectedCity] =
    useState("");
  const [pincode, setPincode] = useState("");
  const [pincodeActive, setPincodeActive] =
    useState(true);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    const loadCities = async () => {
      try {
        setLoading(true);

        const response = await getCities();

        if (response.success) {
          setCities(response.data || []);
        }
      } catch (error) {
        setFormError(
          error.response?.data?.message ||
            "Unable to load cities.",
        );
      } finally {
        setLoading(false);
      }
    };

    if (
      !permissionsLoading &&
      canCreatePincodes
    ) {
      loadCities();
    }
  }, [
    permissionsLoading,
    canCreatePincodes,
  ]);

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
        await createPincode({
          city_id: finalCityId,
          pincode: pincodeValue,
          is_active: pincodeActive,
        });

      if (!response.success) {
        setFormError(
          response.message ||
            "Unable to create pincode.",
        );
        return;
      }

      navigate("/pincodes");
    } catch (error) {
      setFormError(
        error.response?.data?.message ||
          "Unable to create pincode.",
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

  if (!canCreatePincodes) {
    return null;
  }

  return (
    <div
      className={`pincode-create-page ${
        theme === "dark"
          ? "dark-theme"
          : "light-theme"
      }`}
    >
      <div className="pincode-create-header">
        <div className="pincode-create-title">
          <span className="pincode-breadcrumb-tag">LOCATION MANAGEMENT</span>
          <h1>Create Pincode</h1>

          <p>
            Add a new pincode to the system.
          </p>
        </div>
      </div>

      <div className="pincode-create-card">
        <form onSubmit={handleSubmit}>
          <div className="pincode-create-field">
            <label>
              City
            </label>

            <SearchableDropdown
              value={selectedCity}
              options={cities.filter(
                (city) =>
                  city.is_active &&
                  city.state_is_active !==
                    false &&
                  city.country_is_active !==
                    false,
              )}
              onChange={(value) => {
                setSelectedCity(value);
                setFormError("");
              }}
              placeholder="Select City"
              searchPlaceholder="Search city..."
              disabled={saving}
              getOptionValue={(city) =>
                city.id
              }
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

          <div className="pincode-create-field">
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

          <div className="pincode-create-toggle-row">
            <div className="pincode-create-toggle-content">
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
              className={`pincode-create-toggle ${
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
              <span className="pincode-create-toggle-circle"></span>
            </button>
          </div>

          {formError && (
            <div className="pincode-create-error">
              {formError}
            </div>
          )}

          <div className="pincode-create-actions">
            <button
              type="button"
              className="pincode-create-cancel"
              onClick={() =>
                navigate("/pincodes")
              }
              disabled={saving}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="pincode-create-submit"
              disabled={saving}
            >
              {saving
                ? "Creating..."
                : "Create Pincode"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default PincodeCreate;