import { useEffect, useState } from "react";
import SearchableDropdown from "../components/SearchableDropdown";
import {
  getCountries,
  getStatesByCountry,
  getCitiesByState,
  getPincodesByCity,
} from "../services/userService";
import {
  getProfile,
  updateProfile,
  changeProfilePassword,
} from "../services/profileService";
import "./Profile.css";

const Profile = () => {
  const [profile, setProfile] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    age: "",
    country_id: "",
    state_id: "",
    city_id: "",
    pincode_id: "",
  });

  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [pincodes, setPincodes] = useState([]);

  const [selectedCountry, setSelectedCountry] = useState(null);
  const [selectedState, setSelectedState] = useState(null);
  const [selectedCity, setSelectedCity] = useState(null);
  const [selectedPincode, setSelectedPincode] = useState(null);

  const [countrySearch, setCountrySearch] = useState("");
  const [stateSearch, setStateSearch] = useState("");
  const [citySearch, setCitySearch] = useState("");
  const [pincodeSearch, setPincodeSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);

  const [profileMessage, setProfileMessage] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");

  const [profileError, setProfileError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [activeTab, setActiveTab] = useState("personal");

  const role = profile?.role;
  const isEmployee = role === "employee";

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setProfileError("");

      const response = await getProfile();
      const user = response?.user || response;

      setProfile(user);

      setFormData({
        name: user.name || "",
        age: user.age || "",
        country_id: user.country_id || "",
        state_id: user.state_id || "",
        city_id: user.city_id || "",
        pincode_id: user.pincode_id || "",
      });

      if (user?.role === "employee") {
        await loadCountries();

        if (user.country_id) {
          setSelectedCountry({
            id: user.country_id,
            name: user.country_name,
          });

          await loadStates(user.country_id);

          if (user.state_id) {
            setSelectedState({
              id: user.state_id,
              name: user.state_name,
            });

            await loadCities(user.state_id);

            if (user.city_id) {
              setSelectedCity({
                id: user.city_id,
                name: user.city_name,
              });

              if (user.pincode_id) {
                setSelectedPincode({
                  id: user.pincode_id,
                  pincode: user.pincode,
                  name: user.pincode,
                });
              }
            }
          }
        }
      }
    } catch (error) {
      setProfileError(
        error.response?.data?.message ||
          "Failed to load profile"
      );
    } finally {
      setLoading(false);
    }
  };

  const loadCountries = async () => {
    try {
      const response = await getCountries(1, 50, countrySearch);
      setCountries(response?.data || response || []);
    } catch (error) {
      console.error("Load countries error:", error);
    }
  };

  const loadStates = async (countryId, search = "") => {
    try {
      const response = await getStatesByCountry(countryId, 1, 50, search);
      setStates(response?.data || response || []);
    } catch (error) {
      console.error("Load states error:", error);
      setStates([]);
    }
  };

  const loadCities = async (stateId, search = "") => {
    try {
      const response = await getCitiesByState(stateId, 1, 50, search);
      setCities(response?.data || response || []);
    } catch (error) {
      console.error("Load cities error:", error);
      setCities([]);
    }
  };

  const loadPincodes = async (cityId, search = "") => {
    if (search.length > 0 && search.length < 3) {
      setPincodes([]);
      return;
    }

    try {
      const response = await getPincodesByCity(cityId, 1, 50, search);
      setPincodes(response?.data || response || []);
    } catch (error) {
      console.error("Load pincodes error:", error);
      setPincodes([]);
    }
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setProfileMessage("");
    setProfileError("");
  };

  const handleCountryChange = async (value) => {
    const countryId = typeof value === "object" ? value?.id : value;
    const country =
      countries.find((item) => item.id === countryId) || value;

    setSelectedCountry(country);

    setFormData((previous) => ({
      ...previous,
      country_id: countryId || "",
      state_id: "",
      city_id: "",
      pincode_id: "",
    }));

    setSelectedState(null);
    setSelectedCity(null);
    setSelectedPincode(null);

    setStates([]);
    setCities([]);
    setPincodes([]);

    if (countryId) {
      await loadStates(countryId);
    }
  };

  const handleStateChange = async (value) => {
    const stateId = typeof value === "object" ? value?.id : value;
    const state =
      states.find((item) => item.id === stateId) || value;

    setSelectedState(state);

    setFormData((previous) => ({
      ...previous,
      state_id: stateId || "",
      city_id: "",
      pincode_id: "",
    }));

    setSelectedCity(null);
    setSelectedPincode(null);

    setCities([]);
    setPincodes([]);

    if (stateId) {
      await loadCities(stateId);
    }
  };

  const handleCityChange = async (value) => {
    const cityId = typeof value === "object" ? value?.id : value;
    const city =
      cities.find((item) => item.id === cityId) || value;

    setSelectedCity(city);

    setFormData((previous) => ({
      ...previous,
      city_id: cityId || "",
      pincode_id: "",
    }));

    setSelectedPincode(null);
    setPincodes([]);

    if (cityId && pincodeSearch.length >= 3) {
      await loadPincodes(cityId, pincodeSearch);
    }
  };

  const handlePincodeChange = (value) => {
    const pincodeId = typeof value === "object" ? value?.id : value;
    const pincode =
      pincodes.find((item) => item.id === pincodeId) || value;

    setSelectedPincode(pincode);

    setFormData((previous) => ({
      ...previous,
      pincode_id: pincodeId || "",
    }));
  };

  const handleCountrySearch = async (value) => {
    setCountrySearch(value);
    try {
      const response = await getCountries(1, 50, value);
      setCountries(response?.data || response || []);
    } catch (error) {
      console.error("Country search error:", error);
    }
  };

  const handleStateSearch = async (value) => {
    setStateSearch(value);
    if (!formData.country_id) return;
    await loadStates(formData.country_id, value);
  };

  const handleCitySearch = async (value) => {
    setCitySearch(value);
    if (!formData.state_id) return;
    await loadCities(formData.state_id, value);
  };

  const handlePincodeSearch = async (value) => {
    setPincodeSearch(value);
    if (!formData.city_id) return;
    if (value.length < 3) {
      setPincodes([]);
      return;
    }
    await loadPincodes(formData.city_id, value);
  };

  const handleSaveProfile = async (event) => {
    event.preventDefault();

    try {
      setSaving(true);
      setProfileMessage("");
      setProfileError("");

      const response = await updateProfile(formData);

      setProfile(response.user);
      setProfileMessage(
        response.message || "Profile updated successfully"
      );
    } catch (error) {
      setProfileError(
        error.response?.data?.message || "Failed to update profile"
      );
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = (event) => {
    const { name, value } = event.target;

    setPasswordData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setPasswordMessage("");
    setPasswordError("");
  };

  const handleChangePassword = async (event) => {
    event.preventDefault();

    setPasswordMessage("");
    setPasswordError("");

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError(
        "New password and confirm password do not match"
      );
      return;
    }

    try {
      setPasswordSaving(true);

      const response = await changeProfilePassword(passwordData);

      setPasswordMessage(
        response.message || "Password changed successfully"
      );

      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error) {
      setPasswordError(
        error.response?.data?.message || "Failed to change password"
      );
    } finally {
      setPasswordSaving(false);
    }
  };

  const getOptionValue = (option) => {
    return option?.id;
  };

  const getLocationLabel = (option) => {
    return (
      option?.name ||
      option?.country_name ||
      option?.state_name ||
      option?.city_name ||
      option?.pincode ||
      ""
    );
  };

  if (loading) {
    return (
      <div className="profile-premium-page">
        <div className="profile-loading">
          Loading profile...
        </div>
      </div>
    );
  }

  if (profileError && !profile) {
    return (
      <div className="profile-premium-page">
        <div className="profile-error">
          <h2>Unable to load profile</h2>
          <p>Please try again later.</p>
        </div>
      </div>
    );
  }

  const displayName = profile?.name || "Nency";
  const displayEmail = profile?.email || "nency@gmail.com";
  const displayRole = profile?.role_name || profile?.role || "General Admin";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="profile-premium-page">
      {/* Top Header matching Image 1 */}
      <div className="profile-premium-header">
        <div className="profile-header-left">
          <h1>Profile</h1>
          <p>Manage your personal information and account settings.</p>
        </div>
        <div className="profile-breadcrumb-badge">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            width="15"
            height="15"
          >
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          <span>/ Profile</span>
        </div>
      </div>

      <div className="profile-premium-grid">
        {/* Left Sidebar matching Image 1 */}
        <div className="profile-sidebar">
          <div className="profile-sidebar-bg" />
          <div className="profile-avatar-section">
            <div className="profile-avatar-wrapper">
              <div className="profile-avatar-circle">{initial}</div>
              <button
                type="button"
                className="profile-camera-btn"
                title="Change Photo"
                aria-label="Change Photo"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  width="13"
                  height="13"
                >
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              </button>
            </div>

            <h2 className="profile-name">{displayName}</h2>
            <p className="profile-email">{displayEmail}</p>

            <div className="profile-role-badge">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                width="13"
                height="13"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <span>{displayRole}</span>
            </div>

            <div className="profile-status-badge">
              <span
                className={`status-dot ${
                  profile?.is_active !== false ? "active" : "inactive"
                }`}
              />
              <span>
                {profile?.is_active !== false ? "Active" : "Inactive"}
              </span>
            </div>
          </div>

          <div className="profile-nav-links">
            <button
              type="button"
              className={`profile-nav-btn ${
                activeTab === "personal" ? "active" : ""
              }`}
              onClick={() => {
                setActiveTab("personal");
                document
                  .getElementById("personal-info-card")
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                width="16"
                height="16"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span>Personal Information</span>
            </button>

            <button
              type="button"
              className={`profile-nav-btn ${
                activeTab === "password" ? "active" : ""
              }`}
              onClick={() => {
                setActiveTab("password");
                document
                  .getElementById("change-password-card")
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                width="16"
                height="16"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span>Change Password</span>
            </button>

            <button
              type="button"
              className={`profile-nav-btn ${
                activeTab === "settings" ? "active" : ""
              }`}
              onClick={() => setActiveTab("settings")}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                width="16"
                height="16"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              <span>Account Settings</span>
            </button>
          </div>
        </div>

        {/* Right Cards matching Image 1 */}
        <div className="profile-cards-container">
          {/* Card 1: Personal Information */}
          <div id="personal-info-card" className="premium-card">
            <div className="premium-card-header">
              <div className="premium-title-group">
                <div className="icon-box orange-box">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    width="20"
                    height="20"
                  >
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                <div>
                  <h2>Personal Information</h2>
                  <p>Update your personal details.</p>
                </div>
              </div>
              <div className="edit-hint-btn">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  width="14"
                  height="14"
                >
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
                <span>Edit your basic information and role details.</span>
              </div>
            </div>

            <form onSubmit={handleSaveProfile}>
              <div className="form-grid-2">
                <div className="input-group">
                  <label>Full Name</label>
                  <div className="input-wrapper">
                    <svg
                      className="input-icon"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      width="16"
                      height="16"
                    >
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Enter your name"
                      required
                    />
                  </div>
                </div>

                <div className="input-group">
                  <label>Email</label>
                  <div className="input-wrapper disabled">
                    <svg
                      className="input-icon"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      width="16"
                      height="16"
                    >
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                    <input
                      type="email"
                      name="email"
                      value={displayEmail}
                      disabled
                    />
                  </div>
                </div>

                <div className="input-group">
                  <label>Age</label>
                  <div className="input-wrapper">
                    <svg
                      className="input-icon"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      width="16"
                      height="16"
                    >
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    <input
                      type="number"
                      name="age"
                      value={formData.age}
                      onChange={handleChange}
                      placeholder="Enter your age"
                    />
                  </div>
                </div>

                <div className="input-group">
                  <label>Role</label>
                  <div className="input-wrapper disabled">
                    <svg
                      className="input-icon"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      width="16"
                      height="16"
                    >
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                    <input
                      type="text"
                      name="role"
                      value={displayRole}
                      disabled
                    />
                    <svg
                      className="input-icon-right"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      width="16"
                      height="16"
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>
                </div>
              </div>

              {isEmployee && (
                <>
                  <div className="profile-section-title">Location</div>
                  <div className="form-grid-2">
                    <SearchableDropdown
                      value={selectedCountry}
                      options={countries}
                      onChange={handleCountryChange}
                      placeholder="Select Country"
                      searchPlaceholder="Search country..."
                      getOptionValue={getOptionValue}
                      getOptionLabel={getLocationLabel}
                      onSearchChange={handleCountrySearch}
                      maxVisibleOptions={4}
                    />
                    <SearchableDropdown
                      value={selectedState}
                      options={states}
                      onChange={handleStateChange}
                      placeholder="Select State"
                      searchPlaceholder="Search state..."
                      getOptionValue={getOptionValue}
                      getOptionLabel={getLocationLabel}
                      onSearchChange={handleStateSearch}
                      disabled={!formData.country_id}
                      maxVisibleOptions={4}
                    />
                    <SearchableDropdown
                      value={selectedCity}
                      options={cities}
                      onChange={handleCityChange}
                      placeholder="Select City"
                      searchPlaceholder="Search city..."
                      getOptionValue={getOptionValue}
                      getOptionLabel={getLocationLabel}
                      onSearchChange={handleCitySearch}
                      disabled={!formData.state_id}
                      maxVisibleOptions={4}
                    />
                    <SearchableDropdown
                      value={selectedPincode}
                      options={pincodes}
                      onChange={handlePincodeChange}
                      placeholder="Search Pincode"
                      searchPlaceholder="Enter at least 3 characters..."
                      getOptionValue={getOptionValue}
                      getOptionLabel={getLocationLabel}
                      onSearchChange={handlePincodeSearch}
                      disabled={!formData.city_id}
                      maxVisibleOptions={4}
                    />
                  </div>
                </>
              )}

              {profileMessage && (
                <div className="alert-success">{profileMessage}</div>
              )}
              {profileError && (
                <div className="alert-error">{profileError}</div>
              )}

              <div className="card-actions right">
                <button
                  type="submit"
                  className="btn-save dark"
                  disabled={saving}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    width="16"
                    height="16"
                  >
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                    <polyline points="17 21 17 13 7 13 7 21" />
                    <polyline points="7 3 7 8 15 8" />
                  </svg>
                  <span>{saving ? "Saving..." : "Save Changes"}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Card 2: Change Password matching Image 1 */}
          <div id="change-password-card" className="premium-card mt-24">
            <div className="premium-card-header">
              <div className="premium-title-group">
                <div className="icon-box blue-box">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    width="20"
                    height="20"
                  >
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <div>
                  <h2>Change Password</h2>
                  <p>Update your password to keep your account secure.</p>
                </div>
              </div>
              <div className="info-banner blue-banner">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  width="16"
                  height="16"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
                <span>
                  Use a strong password with a mix of letters, numbers and special characters.
                </span>
              </div>
            </div>

            <form onSubmit={handleChangePassword}>
              <div className="form-grid-3">
                <div className="input-group">
                  <label>Current Password</label>
                  <div className="input-wrapper">
                    <svg
                      className="input-icon"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      width="16"
                      height="16"
                    >
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    <input
                      type={showCurrentPassword ? "text" : "password"}
                      name="currentPassword"
                      value={passwordData.currentPassword}
                      onChange={handlePasswordChange}
                      placeholder="Enter current password"
                      required
                    />
                    <button
                      type="button"
                      className="input-icon-right pointer"
                      onClick={() =>
                        setShowCurrentPassword(!showCurrentPassword)
                      }
                      aria-label="Toggle password visibility"
                    >
                      {showCurrentPassword ? (
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          width="16"
                          height="16"
                        >
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      ) : (
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          width="16"
                          height="16"
                        >
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <div className="input-group">
                  <label>New Password</label>
                  <div className="input-wrapper">
                    <svg
                      className="input-icon"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      width="16"
                      height="16"
                    >
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    <input
                      type={showNewPassword ? "text" : "password"}
                      name="newPassword"
                      value={passwordData.newPassword}
                      onChange={handlePasswordChange}
                      placeholder="Enter new password"
                      required
                    />
                    <button
                      type="button"
                      className="input-icon-right pointer"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      aria-label="Toggle password visibility"
                    >
                      {showNewPassword ? (
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          width="16"
                          height="16"
                        >
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      ) : (
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          width="16"
                          height="16"
                        >
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <div className="input-group">
                  <label>Confirm New Password</label>
                  <div className="input-wrapper">
                    <svg
                      className="input-icon"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      width="16"
                      height="16"
                    >
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      name="confirmPassword"
                      value={passwordData.confirmPassword}
                      onChange={handlePasswordChange}
                      placeholder="Confirm new password"
                      required
                    />
                    <button
                      type="button"
                      className="input-icon-right pointer"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      aria-label="Toggle password visibility"
                    >
                      {showConfirmPassword ? (
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          width="16"
                          height="16"
                        >
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      ) : (
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          width="16"
                          height="16"
                        >
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {passwordMessage && (
                <div className="alert-success">{passwordMessage}</div>
              )}
              {passwordError && (
                <div className="alert-error">{passwordError}</div>
              )}

              <div className="card-actions right">
                <button
                  type="submit"
                  className="btn-save dark"
                  disabled={passwordSaving}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    width="16"
                    height="16"
                  >
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <span>{passwordSaving ? "Changing..." : "Change Password"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;