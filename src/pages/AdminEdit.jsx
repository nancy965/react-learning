
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getAdmins,
  updateAdmin,
  getCountries,
  getStatesByCountry,
  getCitiesByState,
  getPincodesByCity,
} from "../services/userService";
import "./AdminEdit.css";

function AdminEdit() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [editData, setEditData] = useState({
    name: "",
    email: "",
    age: "",
    role: "admin",
    is_active: true,
    country_id: "",
    state_id: "",
    city_id: "",
    pincode_id: "",
  });

  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [pincodes, setPincodes] = useState([]);

  const [loading, setLoading] = useState(true);
  const [editLoading, setEditLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [error, setError] = useState("");

  const getList = (response) => {
    if (Array.isArray(response)) {
      return response;
    }

    if (Array.isArray(response?.data)) {
      return response.data;
    }

    if (Array.isArray(response?.data?.data)) {
      return response.data.data;
    }

    return [];
  };

  useEffect(() => {
    loadAdmin();
  }, [id]);

  const loadAdmin = async () => {
    try {
      setLoading(true);
      setError("");

      const [adminResponse, countryResponse] = await Promise.all([
        getAdmins(),
        getCountries(1, 50, ""),
      ]);

      const admins = getList(adminResponse);
      const countryList = getList(countryResponse);

      const admin = admins.find(
        (item) => String(item.id) === String(id)
      );

      if (!admin) {
        setError("Admin not found");
        return;
      }

      const countryId =
        admin.country_id ??
        admin.countryId ??
        "";

      const stateId =
        admin.state_id ??
        admin.stateId ??
        "";

      const cityId =
        admin.city_id ??
        admin.cityId ??
        "";

      const pincodeId =
        admin.pincode_id ??
        admin.pincodeId ??
        "";

      setCountries(countryList);

      setEditData({
        name: admin.name || "",
        email: admin.email || "",
        age: admin.age || "",
        role: "admin",
        is_active: admin.is_active ?? true,
        country_id: countryId ? String(countryId) : "",
        state_id: stateId ? String(stateId) : "",
        city_id: cityId ? String(cityId) : "",
        pincode_id: pincodeId ? String(pincodeId) : "",
      });

      if (countryId) {
        const stateResponse = await getStatesByCountry(
          countryId,
          1,
          50,
          ""
        );

        const stateList = getList(stateResponse);
        setStates(stateList);

        if (stateId) {
          const cityResponse = await getCitiesByState(
            stateId,
            1,
            50,
            ""
          );

          const cityList = getList(cityResponse);
          setCities(cityList);

          if (cityId) {
            const pincodeResponse = await getPincodesByCity(
  cityId,
  1,
  50,
  ""
);

let pincodeList = getList(pincodeResponse);

const selectedPincode = pincodeList.find(
  (item) => String(item.id) === String(pincodeId)
);

if (!selectedPincode && pincodeId) {
  try {
    const selectedResponse = await getPincodeLocation(pincodeId);

    const selectedData =
      selectedResponse?.data?.data ||
      selectedResponse?.data ||
      selectedResponse;

    if (selectedData?.id) {
      pincodeList = [selectedData, ...pincodeList];
    }
  } catch (error) {
    console.error("Load selected pincode error:", error);
  }
}

setPincodes(pincodeList);
          }
        }
      }
    } catch (error) {
      console.error("Load admin error:", error);

      setError(
        error.response?.data?.message ||
          "Failed to load admin"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setEditData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleStatusChange = (e) => {
    setEditData((prev) => ({
      ...prev,
      is_active: e.target.value === "active",
    }));
  };

  const handleCountryChange = async (e) => {
    const countryId = e.target.value;

    setEditData((prev) => ({
      ...prev,
      country_id: countryId,
      state_id: "",
      city_id: "",
      pincode_id: "",
    }));

    setStates([]);
    setCities([]);
    setPincodes([]);

    if (!countryId) {
      return;
    }

    try {
      setLocationLoading(true);
      setError("");

      const response = await getStatesByCountry(
        countryId,
        1,
        50,
        ""
      );

      setStates(getList(response));
    } catch (error) {
      console.error("Load states error:", error);

      setError(
        error.response?.data?.message ||
          "Failed to load states"
      );
    } finally {
      setLocationLoading(false);
    }
  };

  const handleStateChange = async (e) => {
    const stateId = e.target.value;

    setEditData((prev) => ({
      ...prev,
      state_id: stateId,
      city_id: "",
      pincode_id: "",
    }));

    setCities([]);
    setPincodes([]);

    if (!stateId) {
      return;
    }

    try {
      setLocationLoading(true);
      setError("");

      const response = await getCitiesByState(
        stateId,
        1,
        50,
        ""
      );

      setCities(getList(response));
    } catch (error) {
      console.error("Load cities error:", error);

      setError(
        error.response?.data?.message ||
          "Failed to load cities"
      );
    } finally {
      setLocationLoading(false);
    }
  };

  const handleCityChange = async (e) => {
    const cityId = e.target.value;

    setEditData((prev) => ({
      ...prev,
      city_id: cityId,
      pincode_id: "",
    }));

    setPincodes([]);

    if (!cityId) {
      return;
    }

    try {
      setLocationLoading(true);
      setError("");

      const response = await getPincodesByCity(
        cityId,
        1,
        50,
        ""
      );

      setPincodes(getList(response));
    } catch (error) {
      console.error("Load pincodes error:", error);

      setError(
        error.response?.data?.message ||
          "Failed to load pincodes"
      );
    } finally {
      setLocationLoading(false);
    }
  };

  const handlePincodeChange = (e) => {
    const pincodeId = e.target.value;

    setEditData((prev) => ({
      ...prev,
      pincode_id: pincodeId,
    }));
  };

  const handleUpdate = async (e) => {
    e.preventDefault();

    setError("");

    if (!editData.name.trim()) {
      setError("Name is required");
      return;
    }

    if (!/^[A-Za-z ]+$/.test(editData.name.trim())) {
      setError("Name should contain only letters");
      return;
    }

    if (!editData.email.trim()) {
      setError("Email is required");
      return;
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        editData.email.trim()
      )
    ) {
      setError("Enter a valid email");
      return;
    }

    if (!editData.age) {
      setError("Age is required");
      return;
    }

    const age = Number(editData.age);

    if (age < 18 || age > 100) {
      setError("Age must be between 18 and 100");
      return;
    }

    try {
      setEditLoading(true);

     await updateAdmin(id, {
  name: editData.name.trim(),
  email: editData.email.trim(),
  age,
  role: "admin",
  is_active: editData.is_active,
  country_id: editData.country_id
    ? Number(editData.country_id)
    : null,
  state_id: editData.state_id
    ? Number(editData.state_id)
    : null,
  city_id: editData.city_id
    ? Number(editData.city_id)
    : null,
  pincode_id: editData.pincode_id
    ? Number(editData.pincode_id)
    : null,
});

      navigate("/admins");
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Failed to update admin"
      );
    } finally {
      setEditLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-edit-page">
        <p className="admin-edit-loading">
          Loading admin...
        </p>
      </div>
    );
  }

  return (
    <div className="admin-edit-page">
      <div className="admin-edit-container">
        <span className="standard-page-eyebrow">ADMIN MANAGEMENT</span>
        <h1>Edit Admin</h1>
        <p className="standard-page-subtitle" style={{ marginBottom: "16px" }}>Update administrator details and assignments.</p>

        {error && (
          <p className="admin-edit-error">
            {error}
          </p>
        )}

        <form onSubmit={handleUpdate}>
          <div className="admin-edit-group">
            <label>Name *</label>

            <input
              type="text"
              name="name"
              value={editData.name}
              onChange={handleChange}
            />
          </div>

          <div className="admin-edit-group">
            <label>Email *</label>

            <input
              type="email"
              name="email"
              value={editData.email}
              onChange={handleChange}
            />
          </div>

          <div className="admin-edit-group">
            <label>Age *</label>

            <input
              type="number"
              name="age"
              min="18"
              max="100"
              value={editData.age}
              onChange={handleChange}
            />
          </div>

          <div className="admin-edit-group">
            <label>Role</label>

            <select value="admin" disabled>
              <option value="admin">
                Admin
              </option>
            </select>
          </div>

          <div className="admin-edit-group">
            <label>Country</label>

            <select
              name="country_id"
              value={editData.country_id}
              onChange={handleCountryChange}
            >
              <option value="">
                Select Country
              </option>

              {countries.map((country) => (
                <option
                  key={country.id}
                  value={country.id}
                >
                  {country.name}
                </option>
              ))}
            </select>
          </div>

          <div className="admin-edit-group">
            <label>State</label>

            <select
              name="state_id"
              value={editData.state_id}
              onChange={handleStateChange}
              disabled={
                !editData.country_id ||
                locationLoading
              }
            >
              <option value="">
                Select State
              </option>

              {states.map((state) => (
                <option
                  key={state.id}
                  value={state.id}
                >
                  {state.name}
                </option>
              ))}
            </select>
          </div>

          <div className="admin-edit-group">
            <label>City</label>

            <select
              name="city_id"
              value={editData.city_id}
              onChange={handleCityChange}
              disabled={
                !editData.state_id ||
                locationLoading
              }
            >
              <option value="">
                Select City
              </option>

              {cities.map((city) => (
                <option
                  key={city.id}
                  value={city.id}
                >
                  {city.name}
                </option>
              ))}
            </select>
          </div>

          <div className="admin-edit-group">
            <label>Pincode</label>

            <select
              name="pincode_id"
              value={editData.pincode_id}
              onChange={handlePincodeChange}
              disabled={
                !editData.city_id ||
                locationLoading
              }
            >
              <option value="">
                Select Pincode
              </option>

              {pincodes.map((pincode) => (
                <option
                  key={pincode.id}
                  value={pincode.id}
                >
                  {pincode.pincode}
                </option>
              ))}
            </select>
          </div>

          <div className="admin-edit-group">
            <label>Status</label>

            <select
              name="is_active"
              value={
                editData.is_active
                  ? "active"
                  : "inactive"
              }
              onChange={handleStatusChange}
            >
              <option value="active">
                Active
              </option>

              <option value="inactive">
                Inactive
              </option>
            </select>
          </div>

          <div className="admin-edit-buttons">
            <button
              type="button"
              onClick={() => navigate("/admins")}
              disabled={editLoading}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={editLoading}
            >
              {editLoading
                ? "Updating..."
                : "Update"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AdminEdit;
