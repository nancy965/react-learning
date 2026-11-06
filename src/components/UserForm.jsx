import Input from "./Input";
import Button from "./Button";
import SearchableDropdown from "./SearchableDropdown";
import CustomSelect from "./CustomSelect";
import "./UserForm.css";
import { useEffect, useRef, useState } from "react";

import {
  getCountries,
  getStates,
  getStatesByCountry,
  getStateLocation,
  getCities,
  getCitiesByCountry,
  getCitiesByState,
  getCityLocation,
  getPincodes,
  getPincodesByCity,
  getPincodeLocation,
  getPincodesByState,
  getPincodesByCountry,
  getRoles,
} from "../services/userService";

function UserForm({
  formData,
  setFormData,
  setError,
  onSubmit,
  loading,
  error,
  mode = "register",
  userRole,
  admins,
  onClose,
}) {
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [pincodes, setPincodes] = useState([]);

  const [locationLoading, setLocationLoading] = useState({
    countries: false,
    states: false,
    cities: false,
    pincodes: false,
  });

  const [availableRoles, setAvailableRoles] = useState([]);

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const data = await getRoles();
        if (data.success) {
          const rolesList = data.data || [];
          setAvailableRoles(rolesList);
          if (!formData.roleId && rolesList.length > 0) {
            const currentRole = (formData.role || "employee").replace(/_/g, " ").toLowerCase();
            const matched = rolesList.find(
              (r) => r.name.toLowerCase() === currentRole
            );
            if (matched) {
              setFormData((prev) => ({
                ...prev,
                roleId: matched.id,
              }));
            }
          }
        }
      } catch (error) {
        console.error("FETCH ROLES ERROR:", error);
      }
    };
    if (mode !== "register") {
      fetchRoles();
    }
  }, [mode]);

  const [locationPagination, setLocationPagination] = useState({
    countries: {
      page: 1,
      totalPages: 1,
    },
    states: {
      page: 1,
      totalPages: 1,
    },
    cities: {
      page: 1,
      totalPages: 1,
    },
    pincodes: {
      page: 1,
      totalPages: 1,
    },
  });

  const citiesRequestRef = useRef(0);

  const searchTimers = useRef({
    countries: null,
    states: null,
    cities: null,
    pincodes: null,
  });

  const locationLoadingMore = useRef({
    countries: false,
    states: false,
    cities: false,
    pincodes: false,
  });

  const savedAdminIdRef = useRef(formData.adminId || "");

  useEffect(() => {
    if (formData.adminId) {
      savedAdminIdRef.current = formData.adminId;
    }
  }, [formData.adminId]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (setError) setError("");

    if (name === "age") {
      if (value === "") {
        setFormData({ ...formData, age: "" });
        return;
      }

      if (!/^\d+$/.test(value)) return;
      if (Number(value) > 100) return;
    }

    setFormData({ ...formData, [name]: value });
  };

  const handleAgeKeyDown = (e) => {
    if (e.key === "-" || e.key === "+" || e.key === "e" || e.key === "E") {
      e.preventDefault();
    }
  };

  // Load countries when create or edit form opens
  useEffect(() => {
    if (mode === "register") return;

    const fetchCountries = async () => {
      try {
        setLocationLoading((prev) => ({
          ...prev,
          countries: true,
        }));

        const response = await getCountries(1, 50);

        const data = response?.data || response;

        const rows = Array.isArray(data)
          ? data
          : data?.rows || data?.countries || [];

        const pagination = response?.pagination;

        setCountries(rows);

        setLocationPagination((prev) => ({
          ...prev,
          countries: {
            page: pagination?.page || 1,
            totalPages: pagination?.totalPages || 1,
          },
        }));
      } catch (error) {
        console.error("FETCH COUNTRIES ERROR:", error);
        setCountries([]);
      } finally {
        setLocationLoading((prev) => ({
          ...prev,
          countries: false,
        }));
      }
    };

    fetchCountries();
  }, [mode]);

  // Load selected location options when editing an existing user
  useEffect(() => {
    if (mode !== "edit") return;
    if (!formData.countryId) return;

    const loadEditLocations = async () => {
      try {
        const countryId = String(formData.countryId);
        const stateId = formData.stateId ? String(formData.stateId) : "";
        const cityId = formData.cityId ? String(formData.cityId) : "";
        const pincodeId = formData.pincodeId ? String(formData.pincodeId) : "";

        setCountries((prev) => {
          if (prev.some((item) => String(item.id) === countryId)) {
            return prev;
          }

          return [
            ...prev,
            {
              id: countryId,
              name: formData.countryName || "Selected Country",
            },
          ];
        });

        setLocationLoading((prev) => ({
          ...prev,
          states: true,
          cities: true,
          pincodes: true,
        }));

        const stateResponse = await getStatesByCountry(countryId, 1, 50, "");

        const stateData = stateResponse?.data || stateResponse;

        let stateRows = Array.isArray(stateData)
          ? stateData
          : stateData?.rows || stateData?.states || [];

        if (stateId && !stateRows.some((item) => String(item.id) === stateId)) {
          stateRows = [
            ...stateRows,
            {
              id: stateId,
              name: formData.stateName || "Selected State",
            },
          ];
        }

        setStates(stateRows);

        if (stateId) {
          const cityResponse = await getCitiesByState(stateId, 1, 50, "");

          const cityData = cityResponse?.data || cityResponse;

          let cityRows = Array.isArray(cityData)
            ? cityData
            : cityData?.rows || cityData?.cities || [];

          if (cityId && !cityRows.some((item) => String(item.id) === cityId)) {
            cityRows = [
              ...cityRows,
              {
                id: cityId,
                name: formData.cityName || "Selected City",
              },
            ];
          }

          setCities(cityRows);

          if (cityId) {
            const pincodeResponse = await getPincodesByCity(cityId, 1, 50, "");

            const pincodeData = pincodeResponse?.data || pincodeResponse;

            let pincodeRows = Array.isArray(pincodeData)
              ? pincodeData
              : pincodeData?.rows || pincodeData?.pincodes || [];

            if (
              pincodeId &&
              !pincodeRows.some((item) => String(item.id) === pincodeId)
            ) {
              pincodeRows = [
                ...pincodeRows,
                {
                  id: pincodeId,
                  pincode: formData.pincode || "",
                },
              ];
            }

            setPincodes(pincodeRows);
          }
        }
      } catch (error) {
        console.error("LOAD EDIT LOCATIONS ERROR:", error);
      } finally {
        setLocationLoading((prev) => ({
          ...prev,
          states: false,
          cities: false,
          pincodes: false,
        }));
      }
    };

    loadEditLocations();
  }, [
    mode,
    formData.countryId,
    formData.stateId,
    formData.cityId,
    formData.pincodeId,
  ]);

  const loadMoreCountries = async () => {
    const currentPage = locationPagination.countries.page;
    const totalPages = locationPagination.countries.totalPages;

    if (locationLoadingMore.current.countries || currentPage >= totalPages) {
      return;
    }

    try {
      locationLoadingMore.current.countries = true;

      const nextPage = currentPage + 1;

      const response = await getCountries(nextPage, 50);

      const data = response?.data || response;

      const newRows = Array.isArray(data)
        ? data
        : data?.rows || data?.countries || [];

      const pagination = response?.pagination;

      setCountries((prev) => {
        const existingIds = new Set(prev.map((item) => String(item.id)));

        const uniqueRows = newRows.filter(
          (item) => !existingIds.has(String(item.id)),
        );

        return [...prev, ...uniqueRows];
      });

      setLocationPagination((prev) => ({
        ...prev,
        countries: {
          page: pagination?.page || nextPage,
          totalPages: pagination?.totalPages || totalPages,
        },
      }));
    } catch (error) {
      console.error("LOAD MORE COUNTRIES ERROR:", error);
    } finally {
      locationLoadingMore.current.countries = false;
    }
  };

  // Load states using server-side search
  const loadStates = async (search = "", page = 1, append = false) => {
    try {
      setLocationLoading((prev) => ({
        ...prev,
        states: true,
      }));

      let response;

      if (formData.countryId) {
        response = await getStatesByCountry(
          formData.countryId,
          page,
          50,
          search,
        );
      } else {
        response = await getStates(page, 50, search);
      }

      const data = response?.data || response;

      const rows = Array.isArray(data)
        ? data
        : data?.rows || data?.states || [];

      const pagination = response?.pagination;

      if (append) {
        setStates((prev) => {
          const existingIds = new Set(prev.map((item) => String(item.id)));

          const uniqueRows = rows.filter(
            (item) => !existingIds.has(String(item.id)),
          );

          return [...prev, ...uniqueRows];
        });
      } else {
        setStates(rows);
      }

      setLocationPagination((prev) => ({
        ...prev,
        states: {
          page: pagination?.page || page,
          totalPages: pagination?.totalPages || 1,
        },
      }));
    } catch (error) {
      console.error("FETCH STATES ERROR:", error);

      if (!append) {
        setStates([]);
      }
    } finally {
      setLocationLoading((prev) => ({
        ...prev,
        states: false,
      }));
    }
  };

  const loadMoreStates = async () => {
    const currentPage = locationPagination.states.page;

    const totalPages = locationPagination.states.totalPages;

    if (locationLoadingMore.current.states || currentPage >= totalPages) {
      return;
    }

    try {
      locationLoadingMore.current.states = true;

      await loadStates("", currentPage + 1, true);
    } finally {
      locationLoadingMore.current.states = false;
    }
  };

  // Load cities using server-side search
  const loadCities = async (search = "", page = 1, append = false) => {
    const requestId = ++citiesRequestRef.current;

    try {
      setLocationLoading((prev) => ({
        ...prev,
        cities: true,
      }));

      let response;

      if (formData.stateId) {
        response = await getCitiesByState(formData.stateId, page, 50, search);
      } else if (formData.countryId) {
        response = await getCitiesByCountry(
          formData.countryId,
          page,
          50,
          search,
        );
      } else {
        response = await getCities(page, 50, search);
      }

      if (requestId !== citiesRequestRef.current) {
        return;
      }

      const data = response?.data || response;

      const rows = Array.isArray(data)
        ? data
        : data?.rows || data?.cities || [];

      const pagination = response?.pagination;

      if (append) {
        setCities((prev) => {
          const existingIds = new Set(prev.map((item) => String(item.id)));

          const uniqueRows = rows.filter(
            (item) => !existingIds.has(String(item.id)),
          );

          return [...prev, ...uniqueRows];
        });
      } else {
        setCities(rows);
      }

      setLocationPagination((prev) => ({
        ...prev,
        cities: {
          page: pagination?.page || page,
          totalPages: pagination?.totalPages || 1,
        },
      }));
    } catch (error) {
      if (requestId !== citiesRequestRef.current) {
        return;
      }

      console.error("FETCH CITIES ERROR:", error);

      if (!append) {
        setCities([]);
      }
    } finally {
      if (requestId === citiesRequestRef.current) {
        setLocationLoading((prev) => ({
          ...prev,
          cities: false,
        }));
      }
    }
  };

  const loadMoreCities = async () => {
    const currentPage = locationPagination.cities.page;

    const totalPages = locationPagination.cities.totalPages;

    if (locationLoadingMore.current.cities || currentPage >= totalPages) {
      return;
    }

    try {
      locationLoadingMore.current.cities = true;

      await loadCities("", currentPage + 1, true);
    } finally {
      locationLoadingMore.current.cities = false;
    }
  };

  // Load pincodes using the most specific selected location
  const loadPincodes = async (search = "", page = 1, append = false) => {
    try {
      setLocationLoading((prev) => ({
        ...prev,
        pincodes: true,
      }));

      let response;

      if (formData.cityId) {
        response = await getPincodesByCity(formData.cityId, page, 50, search);
      } else if (formData.stateId) {
        response = await getPincodesByState(formData.stateId, page, 50, search);
      } else if (formData.countryId) {
        response = await getPincodesByCountry(
          formData.countryId,
          page,
          50,
          search,
        );
      } else {
        response = await getPincodes(page, 50, search);
      }

      const data = response?.data || response;

      const rows = Array.isArray(data)
        ? data
        : data?.rows || data?.pincodes || [];

      const pagination = response?.pagination;

      if (append) {
        setPincodes((prev) => {
          const existingIds = new Set(prev.map((item) => String(item.id)));

          const uniqueRows = rows.filter(
            (item) => !existingIds.has(String(item.id)),
          );

          return [...prev, ...uniqueRows];
        });
      } else {
        setPincodes(rows);
      }

      setLocationPagination((prev) => ({
        ...prev,
        pincodes: {
          page: pagination?.page || page,
          totalPages: pagination?.totalPages || 1,
        },
      }));

      return rows;
    } catch (error) {
      console.error("FETCH PINCODES ERROR:", error);

      if (!append) {
        setPincodes([]);
      }

      return [];
    } finally {
      setLocationLoading((prev) => ({
        ...prev,
        pincodes: false,
      }));
    }
  };

  const loadMorePincodes = async () => {
    const currentPage = locationPagination.pincodes.page;

    const totalPages = locationPagination.pincodes.totalPages;

    if (locationLoadingMore.current.pincodes || currentPage >= totalPages) {
      return;
    }

    try {
      locationLoadingMore.current.pincodes = true;

      await loadPincodes("", currentPage + 1, true);
    } finally {
      locationLoadingMore.current.pincodes = false;
    }
  };

  // Search countries on every typed character
  const handleCountrySearch = (value) => {
    clearTimeout(searchTimers.current.countries);

    searchTimers.current.countries = setTimeout(async () => {
      const search = value.trim();

      try {
        setLocationLoading((prev) => ({
          ...prev,
          countries: true,
        }));

        const response = await getCountries(1, 50, search);

        const data = response?.data || response;

        const rows = Array.isArray(data)
          ? data
          : data?.rows || data?.countries || [];

        const pagination = response?.pagination;

        setCountries(rows);

        setLocationPagination((prev) => ({
          ...prev,
          countries: {
            page: pagination?.page || 1,
            totalPages: pagination?.totalPages || 1,
          },
        }));
      } catch (error) {
        console.error("SEARCH COUNTRIES ERROR:", error);
      } finally {
        setLocationLoading((prev) => ({
          ...prev,
          countries: false,
        }));
      }
    }, 0);
  };

  // Search states on every typed character
  const handleStateSearch = (value) => {
    clearTimeout(searchTimers.current.states);

    searchTimers.current.states = setTimeout(async () => {
      const search = value.trim();

      await loadStates(search);
    }, 0);
  };

  // Search cities on every typed character
  const handleCitySearch = (value) => {
    clearTimeout(searchTimers.current.cities);

    searchTimers.current.cities = setTimeout(async () => {
      const search = value.trim();

      await loadCities(search);
    }, 0);
  };

  // Search pincodes on every typed character
  const handlePincodeSearch = async (value) => {
    const pincode = value.trim();

    clearTimeout(searchTimers.current.pincodes);

    searchTimers.current.pincodes = setTimeout(async () => {
      if (!pincode) {
        await loadPincodes("");

        return;
      }

      const selectedCityId = formData.cityId ? String(formData.cityId) : "";

      const searchedRows = await loadPincodes(pincode);

      if (pincode.length < 3) {
        return;
      }

      if (!selectedCityId) {
        return;
      }

      const matchingPincode = searchedRows.find((item) => {
        const itemPincode = String(item.pincode ?? "").trim();

        const itemCityId = item.city_id ?? item.cityId;

        if (itemCityId !== undefined && itemCityId !== null) {
          return (
            itemPincode === pincode && String(itemCityId) === selectedCityId
          );
        }

        return itemPincode === pincode;
      });

      if (!matchingPincode) {
        try {
          setError(
            "Pincode / postal code does not belong to the selected city",
          );
        } catch (error) {
          console.error("PINCODE VALIDATION ERROR:", error);
        }

        return;
      }

      try {
        setError("");

        setLocationLoading((prev) => ({
          ...prev,
          pincodes: true,
        }));

        const response = await getPincodeLocation(encodeURIComponent(pincode));

        const location = response?.location;

        if (!location) {
          return;
        }

        const locationCityId = location.city_id ?? location.cityId;

        if (locationCityId && String(locationCityId) !== selectedCityId) {
          setError(
            "Pincode / postal code does not belong to the selected city",
          );

          return;
        }

        await applyPincodeLocation(location, pincode, selectedCityId);
      } catch (error) {
        if (error?.response?.status === 404) {
          return;
        }

        console.error("PINCODE LOCATION ERROR:", error);
      } finally {
        setLocationLoading((prev) => ({
          ...prev,
          pincodes: false,
        }));
      }
    }, 0);
  };

  const handleCountryChange = async (countryId) => {
    setError("");

    const selectedCountryId = String(countryId);

    setFormData((prev) => ({
      ...prev,
      countryId: selectedCountryId,
      stateId: "",
      cityId: "",
      pincodeId: "",
      pincode: "",
    }));

    setStates([]);
    setCities([]);
    setPincodes([]);

    if (!selectedCountryId) {
      return;
    }

    try {
      setLocationLoading((prev) => ({
        ...prev,
        states: true,
      }));

      const response = await getStatesByCountry(selectedCountryId, 1, 50, "");

      const data = response?.data || response;

      const rows = Array.isArray(data)
        ? data
        : data?.rows || data?.states || [];

      const pagination = response?.pagination;

      setStates(rows);

      setLocationPagination((prev) => ({
        ...prev,
        states: {
          page: pagination?.page || 1,
          totalPages: pagination?.totalPages || 1,
        },
      }));
    } catch (error) {
      console.error("FETCH STATES ERROR:", error);

      setStates([]);
    } finally {
      setLocationLoading((prev) => ({
        ...prev,
        states: false,
      }));
    }
  };

  const handleStateChange = async (stateId) => {
    setError("");

    const selectedStateId = String(stateId);

    if (!selectedStateId) {
      setFormData((prev) => ({
        ...prev,
        stateId: "",
        cityId: "",
        pincodeId: "",
        pincode: "",
      }));

      setCities([]);
      setPincodes([]);

      return;
    }

    setFormData((prev) => ({
      ...prev,
      stateId: selectedStateId,
      cityId: "",
      pincodeId: "",
      pincode: "",
    }));

    setCities([]);
    setPincodes([]);

    try {
      setLocationLoading((prev) => ({
        ...prev,
        cities: true,
      }));

      const response = await getCitiesByState(selectedStateId, 1, 50, "");

      const data = response?.data || response;

      const rows = Array.isArray(data)
        ? data
        : data?.rows || data?.cities || [];

      const pagination = response?.pagination;

      setCities(rows);

      setLocationPagination((prev) => ({
        ...prev,
        cities: {
          page: pagination?.page || 1,
          totalPages: pagination?.totalPages || 1,
        },
      }));

      if (!formData.countryId) {
        const selectedState = states.find(
          (item) => String(item.id) === selectedStateId,
        );

        const stateName = selectedState?.name;

        if (stateName) {
          try {
            const locationResponse = await getStateLocation(stateName);

            const location = locationResponse?.location;

            if (location) {
              const countryId = location.country_id ?? location.countryId;

              const countryName = location.country_name ?? location.countryName;

              setFormData((prev) => ({
                ...prev,
                countryId: countryId ? String(countryId) : "",
                stateId: selectedStateId,
              }));

              if (countryId) {
                setCountries((prev) => {
                  const exists = prev.some(
                    (item) => String(item.id) === String(countryId),
                  );

                  if (exists) return prev;

                  return [
                    ...prev,
                    {
                      id: countryId,
                      name: countryName || "Country",
                    },
                  ];
                });
              }
            }
          } catch (error) {
            if (error?.response?.status !== 404) {
              console.error("FETCH STATE LOCATION ERROR:", error);
            }
          }
        }
      }
    } catch (error) {
      console.error("FETCH CITIES ERROR:", error);

      setCities([]);
    } finally {
      setLocationLoading((prev) => ({
        ...prev,
        cities: false,
      }));
    }
  };

  const handleCityChange = async (cityId) => {
    setError("");

    const selectedCityId = String(cityId);

    if (!selectedCityId) {
      setFormData((prev) => ({
        ...prev,
        cityId: "",
        pincodeId: "",
        pincode: "",
      }));

      setPincodes([]);

      return;
    }

    const selectedCity = cities.find(
      (item) => String(item.id) === selectedCityId,
    );

    const cityName = selectedCity?.name;

    setFormData((prev) => ({
      ...prev,
      cityId: selectedCityId,
      pincodeId: "",
      pincode: "",
    }));

    setPincodes([]);

    try {
      setLocationLoading((prev) => ({
        ...prev,
        pincodes: true,
      }));

      const response = await getPincodesByCity(selectedCityId, 1, 50, "");

      const data = response?.data || response;

      const rows = Array.isArray(data)
        ? data
        : data?.rows || data?.pincodes || [];

      const pagination = response?.pagination;

      setPincodes(rows);

      setLocationPagination((prev) => ({
        ...prev,
        pincodes: {
          page: pagination?.page || 1,
          totalPages: pagination?.totalPages || 1,
        },
      }));

      if (!formData.countryId || !formData.stateId) {
        if (cityName) {
          try {
            const locationResponse = await getCityLocation(cityName);

            const location = locationResponse?.location;

            if (location) {
              const countryId = location.country_id ?? location.countryId;

              const stateId = location.state_id ?? location.stateId;

              const countryName = location.country_name ?? location.countryName;

              const stateName = location.state_name ?? location.stateName;

              setFormData((prev) => ({
                ...prev,
                countryId: countryId ? String(countryId) : prev.countryId,
                stateId: stateId ? String(stateId) : prev.stateId,
                cityId: selectedCityId,
                pincodeId: "",
                pincode: "",
              }));

              if (countryId) {
                setCountries((prev) => {
                  const exists = prev.some(
                    (item) => String(item.id) === String(countryId),
                  );

                  if (exists) return prev;

                  return [
                    ...prev,
                    {
                      id: countryId,
                      name: countryName || "Country",
                    },
                  ];
                });
              }

              if (countryId && !formData.countryId) {
                const statesResponse = await getStatesByCountry(countryId);

                const statesData = statesResponse?.data || statesResponse;

                setStates(
                  Array.isArray(statesData)
                    ? statesData
                    : statesData?.states || [],
                );
              }

              if (stateId && !formData.stateId) {
                const citiesResponse = await getCitiesByState(stateId);

                const citiesData = citiesResponse?.data || citiesResponse;

                setCities(
                  Array.isArray(citiesData)
                    ? citiesData
                    : citiesData?.cities || [],
                );
              }
            }
          } catch (error) {
            if (error?.response?.status !== 404) {
              console.error("FETCH CITY LOCATION ERROR:", error);
            }
          }
        }
      }
    } catch (error) {
      if (error?.response?.status !== 404) {
        console.error("FETCH PINCODES ERROR:", error);
      }

      setPincodes([]);
    } finally {
      setLocationLoading((prev) => ({
        ...prev,
        pincodes: false,
      }));
    }
  };

  const applyPincodeLocation = async (
    location,
    typedPincode,
    selectedCityId,
  ) => {
    const countryId = location.country_id ?? location.countryId;

    const stateId = location.state_id ?? location.stateId;

    const cityId = location.city_id ?? location.cityId;

    const pincodeId = location.pincode_id ?? location.pincodeId ?? location.id;

    const pincodeValue = location.pincode ?? typedPincode;

    const countryName = location.country_name ?? location.countryName;

    const stateName = location.state_name ?? location.stateName;

    const cityName = location.city_name ?? location.cityName;

    if (selectedCityId && cityId && String(cityId) !== String(selectedCityId)) {
      setError("Pincode / postal code does not belong to the selected city");

      return;
    }

    setFormData((prev) => ({
      ...prev,
      countryId: countryId ? String(countryId) : "",
      stateId: stateId ? String(stateId) : "",
      cityId: cityId ? String(cityId) : "",
      pincodeId: pincodeId ? String(pincodeId) : "",
      pincode: String(pincodeValue),
    }));

    if (countryId) {
      setCountries((prev) => {
        const exists = prev.some(
          (item) => String(item.id) === String(countryId),
        );

        if (exists) return prev;

        return [
          ...prev,
          {
            id: countryId,
            name: countryName || "Country",
          },
        ];
      });
    }

    if (countryId) {
      try {
        const response = await getStatesByCountry(countryId);

        const data = response?.data || response;

        const stateList = Array.isArray(data) ? data : data?.states || [];

        setStates(stateList);

        if (
          stateId &&
          !stateList.some((item) => String(item.id) === String(stateId))
        ) {
          setStates((prev) => [
            ...prev,
            {
              id: stateId,
              name: stateName || "State",
            },
          ]);
        }
      } catch (error) {
        console.error("FETCH STATES ERROR:", error);
      }
    }

    if (stateId) {
      try {
        const response = await getCitiesByState(stateId);

        const data = response?.data || response;

        const cityList = Array.isArray(data) ? data : data?.cities || [];

        setCities(cityList);

        if (
          cityId &&
          !cityList.some((item) => String(item.id) === String(cityId))
        ) {
          setCities((prev) => [
            ...prev,
            {
              id: cityId,
              name: cityName || "City",
            },
          ]);
        }
      } catch (error) {
        console.error("FETCH CITIES ERROR:", error);
      }
    }

    if (cityId) {
      try {
        const response = await getPincodesByCity(cityId);

        const data = response?.data || response;

        const pincodeList = Array.isArray(data) ? data : data?.pincodes || [];

        setPincodes(pincodeList);

        if (
          pincodeId &&
          !pincodeList.some((item) => String(item.id) === String(pincodeId))
        ) {
          setPincodes((prev) => [
            ...prev,
            {
              id: pincodeId,
              pincode: pincodeValue,
            },
          ]);
        }
      } catch (error) {
        console.error("FETCH PINCODES ERROR:", error);
      }
    }
  };

  const handlePincodeSelect = async (pincodeId) => {
    if (!pincodeId) {
      setFormData((prev) => ({
        ...prev,
        pincodeId: "",
        pincode: "",
      }));
      return;
    }

    const selectedPincode = pincodes.find(
      (item) => String(item.id) === String(pincodeId),
    );

    if (!selectedPincode) return;

    setError("");

    const pincodeValue = String(selectedPincode.pincode);

    const selectedCityId = formData.cityId ? String(formData.cityId) : "";

    const pincodeCityId = selectedPincode.city_id ?? selectedPincode.cityId;

    if (
      selectedCityId &&
      pincodeCityId &&
      String(pincodeCityId) !== selectedCityId
    ) {
      setError("Pincode / postal code does not belong to the selected city");

      return;
    }

    try {
      setLocationLoading((prev) => ({
        ...prev,
        pincodes: true,
      }));

      const response = await getPincodeLocation(
        encodeURIComponent(pincodeValue),
      );

      const location = response?.location;

      if (!location) {
        setFormData((prev) => ({
          ...prev,
          pincodeId: String(selectedPincode.id),
          pincode: pincodeValue,
        }));

        return;
      }

      const locationCityId = location.city_id ?? location.cityId;

      if (
        selectedCityId &&
        locationCityId &&
        String(locationCityId) !== selectedCityId
      ) {
        setError("Pincode / postal code does not belong to the selected city");

        return;
      }

      await applyPincodeLocation(location, pincodeValue, selectedCityId);
    } catch (error) {
      if (error?.response?.status === 404) {
        setError("Pincode / postal code not found");
      } else {
        console.error("PINCODE LOCATION LOOKUP ERROR:", error);
      }
    } finally {
      setLocationLoading((prev) => ({
        ...prev,
        pincodes: false,
      }));
    }
  };

  if (mode === "register") {
    return (
      <form onSubmit={onSubmit}>
        <Input
          label="Name"
          name="name"
          type="text"
          placeholder="Enter your name"
          value={formData.name}
          onChange={handleChange}
          required
        />

        <Input
          label="Email"
          name="email"
          type="email"
          placeholder="Enter your email"
          value={formData.email}
          onChange={handleChange}
          required
        />

        <Input
          label="Password"
          name="password"
          type="password"
          placeholder="Enter your password"
          value={formData.password}
          onChange={handleChange}
          required
        />

        <Input
          label="Age"
          name="age"
          type="number"
          placeholder="Enter your age"
          min="18"
          max="100"
          value={formData.age}
          onChange={handleChange}
          onKeyDown={handleAgeKeyDown}
          required
        />

        <div className="input-group">
          <label>Role</label>

          <CustomSelect
            name="role"
            value={formData.role}
            options={[
              { value: "employee", label: "Employee" },
              { value: "admin", label: "Admin" },
            ]}
            onChange={handleChange}
          />
        </div>

        {error && <p className="error-message">{error}</p>}

        <Button type="submit" disabled={loading}>
          {loading ? "Registering..." : "Register"}
        </Button>
      </form>
    );
  }

  return (
    <form className="create-user-form" onSubmit={onSubmit}>
      <h3>{mode === "edit" ? "Edit User" : "Create User"}</h3>

      <div className={`create-user-row ${mode === "edit" ? "row-three-fields" : ""}`}>
        <div className="create-field">
          <label>
            Your Name <span className="required-star">*</span>
          </label>

          <input
            type="text"
            name="name"
            placeholder="Enter your name"
            value={formData.name}
            onChange={handleChange}
            required
          />
        </div>

        <div className="create-field">
          <label>
            Email <span className="required-star">*</span>
          </label>

          <input
            type="email"
            name="email"
            placeholder="Enter your email"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>

        <div className="create-field">
          <label>
            Age <span className="required-star">*</span>
          </label>

          <input
            type="number"
            name="age"
            placeholder="Enter your age"
            min="18"
            max="100"
            value={formData.age}
            onChange={handleChange}
            onKeyDown={handleAgeKeyDown}
            required
          />
        </div>

        {mode !== "edit" && (
          <div className="create-field">
            <label>
              Password <span className="required-star">*</span>
            </label>

            <input
              type="password"
              name="password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>
        )}
      </div>

      <div className="create-user-row location-row">
        <div className="create-field">
          <label>
            Country <span className="required-star">*</span>
          </label>

          <SearchableDropdown
            value={formData.countryId || ""}
            options={countries}
            onChange={handleCountryChange}
            onOpen={() => {
              handleCountrySearch("");
            }}
            onSearchChange={handleCountrySearch}
            onLoadMore={loadMoreCountries}
            placeholder={formData.countryName || "Select country"}
            searchPlaceholder="Search country..."
            disabled={false}
            getOptionValue={(country) => country.id}
            getOptionLabel={(country) => country.name}
          />
        </div>

        <div className="create-field">
          <label>
            State <span className="required-star">*</span>
          </label>

          <SearchableDropdown
            value={formData.stateId || ""}
            options={states}
            onChange={handleStateChange}
            onOpen={() => {
              if (!locationLoading.states) {
                loadStates("", 1, false);
              }
            }}
            onSearchChange={handleStateSearch}
            onLoadMore={loadMoreStates}
            placeholder={formData.stateName || "Select state"}
            searchPlaceholder="Search state..."
            disabled={false}
            getOptionValue={(state) => state.id}
            getOptionLabel={(state) => state.name}
          />
        </div>

        <div className="create-field">
          <label>
            City <span className="required-star">*</span>
          </label>

          <SearchableDropdown
            value={formData.cityId || ""}
            options={cities}
            onChange={handleCityChange}
            onOpen={() => {
              if (!locationLoading.cities) {
                loadCities("", 1, false);
              }
            }}
            onSearchChange={handleCitySearch}
            onLoadMore={loadMoreCities}
            placeholder={formData.cityName || "Select city"}
            searchPlaceholder="Search city..."
            disabled={false}
            getOptionValue={(city) => city.id}
            getOptionLabel={(city) => city.name}
          />
        </div>

        <div className="create-field">
          <label>
            Pincode / Postal Code <span className="required-star">*</span>
          </label>

          <SearchableDropdown
            value={formData.pincodeId || ""}
            options={pincodes}
            onChange={handlePincodeSelect}
            onOpen={() => {
              if (!locationLoading.pincodes) {
                loadPincodes("", 1, false);
              }
            }}
            onSearchChange={handlePincodeSearch}
            onLoadMore={loadMorePincodes}
            placeholder={formData.pincode || "Select pincode"}
            searchPlaceholder="Enter pincode / postal code..."
            disabled={false}
            getOptionValue={(pincode) => pincode.id}
            getOptionLabel={(pincode) => pincode.pincode}
          />
        </div>
      </div>

      <div className={`create-user-row second-row ${userRole !== "general_admin" || formData.role !== "employee" ? "row-three-fields" : ""}`}>
        <div className="create-field">
          <label>
            Role <span className="required-star">*</span>
          </label>

          <SearchableDropdown
  value={formData.role || ""}
  options={
    userRole === "general_admin"
      ? [
          { id: "admin", name: "Admin" },
          { id: "employee", name: "Employee" },
        ]
      : [{ id: "employee", name: "Employee" }]
  }
  onChange={(role) => {
    setError("");

    setFormData((prev) => {
      const targetRoleName = (role || "employee").replace(/_/g, " ").toLowerCase();
      const matched = availableRoles.find(
        (r) => r.name.toLowerCase() === targetRoleName
      );
      return {
        ...prev,
        role,
        roleId: matched ? matched.id : prev.roleId,
        adminId:
          role === "admin"
            ? ""
            : prev.adminId || savedAdminIdRef.current || "",
      };
    });
  }}
  placeholder="Select role"
  searchPlaceholder="Search role..."
  getOptionValue={(role) => role.id}
  getOptionLabel={(role) => role.name}
/>
        </div>

        {userRole === "general_admin" && formData.role === "employee" && (
          <div className="create-field">
            <label>
              Select Admin <span className="required-star">*</span>
            </label>

            <SearchableDropdown
  value={formData.adminId || ""}
  options={[
    ...(formData.adminId &&
    formData.adminName &&
    !admins?.some(
      (admin) => String(admin.id) === String(formData.adminId)
    )
      ? [
          {
            id: formData.adminId,
            name: formData.adminName,
          },
        ]
      : []),
    ...(admins || []),
  ]}
  onChange={(adminId) => {
    setError("");

    setFormData((prev) => ({
      ...prev,
      adminId: adminId || "",
    }));
  }}
  placeholder="Select an admin"
  searchPlaceholder="Search admin..."
  getOptionValue={(admin) => admin.id}
  getOptionLabel={(admin) => admin.name}
/>
          </div>
        )}

        <div className="create-field">
          <label>
            Status <span className="required-star">*</span>
          </label>

          <CustomSelect
            name="is_active"
            value={formData.is_active ? "active" : "inactive"}
            options={[
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
            ]}
            onChange={(e) => {
              setError("");

              setFormData({
                ...formData,
                is_active: e.target.value === "active",
              });
            }}
          />
        </div>

        {mode !== "register" && (
          <div className="create-field">
            <label>Permissions Role</label>
            <SearchableDropdown
              value={formData.roleId || ""}
              options={availableRoles}
              onChange={(roleId) => {
                setError("");

                setFormData((prev) => ({
                  ...prev,
                  roleId: roleId || "",
                }));
              }}
              placeholder="Select a role"
              searchPlaceholder="Search role..."
              disabled={false}
              getOptionValue={(role) => role.id}
              getOptionLabel={(role) => role.name}
              maxVisibleOptions={4}
            />
          </div>
        )}
      </div>

      {error && <p className="error-message">{error}</p>}

      <div className="create-user-buttons">
        <Button type="submit" disabled={loading}>
          {loading
            ? mode === "edit"
              ? "Updating..."
              : "Creating..."
            : mode === "edit"
              ? "Update"
              : "Create"}
        </Button>

        <Button
          type="button"
          onClick={() => {
            setFormData({
              name: "",
              email: "",
              password: "",
              age: "",
              role: "employee",
              is_active: true,
              adminId: "",
              countryId: "",
              stateId: "",
              cityId: "",
              pincodeId: "",
              pincode: "",
              roleId: "",
            });

            setStates([]);
            setCities([]);
            setPincodes([]);
            setError("");

            if (onClose) {
              onClose();
            }
          }}
          disabled={loading}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

export default UserForm;
