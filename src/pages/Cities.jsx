import { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { usePermission } from "../context/PermissionContext";
import Loader from "../components/Loader";

import { getCities, deleteCity, activateCity } from "../services/cityService";

import { getStates } from "../services/stateService";

import "./Cities.css";
import CustomSelect from "../components/CustomSelect";
import ConfirmDialog from "../components/ConfirmDialog";

function Cities() {
  const navigate = useNavigate();
  const { theme } = useTheme();

  const { hasPermission, loading: permissionsLoading } = usePermission();

  const canViewCities = hasPermission("cities.view");
  const canCreateCities = hasPermission("cities.create");
  const canEditCities = hasPermission("cities.edit");
  const canDeleteCities = hasPermission("cities.delete");

  const hasCityActions = true;

  const [cities, setCities] = useState([]);
  const [states, setStates] = useState([]);

  const [citiesPerPage, setCitiesPerPage] = useState(50);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [currentPage, setCurrentPage] = useState(1);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    totalRecords: 0,
    totalPages: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirmCityAction, setConfirmCityAction] = useState(null);

  const [toast, setToast] = useState("");
  const [openActionMenuId, setOpenActionMenuId] = useState(null);
  const [menuPosition, setMenuPosition] = useState(null);
  const isInitialMount = useRef(true);

  useEffect(() => {
    const handleClose = () => {
      setOpenActionMenuId(null);
      setMenuPosition(null);
    };
    window.addEventListener("click", handleClose);
    window.addEventListener("scroll", handleClose, true);
    window.addEventListener("resize", handleClose);
    return () => {
      window.removeEventListener("click", handleClose);
      window.removeEventListener("scroll", handleClose, true);
      window.removeEventListener("resize", handleClose);
    };
  }, []);

  const handleActionMenuToggle = (e, cityId) => {
    e.stopPropagation();
    if (openActionMenuId === cityId) {
      setOpenActionMenuId(null);
      setMenuPosition(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const openUp = window.innerHeight - rect.bottom < 140;
    setMenuPosition({
      right: Math.max(10, window.innerWidth - rect.right),
      top: openUp ? null : rect.bottom + 4,
      bottom: openUp ? window.innerHeight - rect.top + 4 : null,
    });
    setOpenActionMenuId(cityId);
  };

  const fetchCities = useCallback(
    async (
      page = 1,
      searchValue = search,
      statusValue = statusFilter,
      retries = 2
    ) => {
      if (!canViewCities) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const response = await getCities(
          page,
          citiesPerPage,
          searchValue,
          statusValue,
        );

        if (response && response.success !== false) {
          const cityData =
            response.data?.data ||
            response.data?.cities ||
            (Array.isArray(response.data) ? response.data : []) ||
            (Array.isArray(response.cities) ? response.cities : []);

          setCities(cityData);

          const pag =
            response.pagination ||
            response.data?.pagination ||
            null;

          setPagination(
            pag || {
              page,
              limit: citiesPerPage,
              totalRecords: cityData.length || 0,
              totalPages: Math.ceil((cityData.length || 0) / citiesPerPage) || 1,
            },
          );
          setCurrentPage(page);
        } else {
          if (retries > 0) {
            setTimeout(() => {
              fetchCities(page, searchValue, statusValue, retries - 1);
            }, 350);
            return;
          }
          setError(response?.message || "Failed to fetch cities.");
        }
      } catch (err) {
        console.error("GET CITIES ERROR:", err);
        if (retries > 0) {
          setTimeout(() => {
            fetchCities(page, searchValue, statusValue, retries - 1);
          }, 350);
          return;
        }
        setError(err.response?.data?.message || "Failed to fetch cities.");
      } finally {
        setLoading(false);
      }
    },
    [canViewCities, citiesPerPage, search, statusFilter]
  );

  useEffect(() => {
    if (permissionsLoading || !canViewCities) {
      return;
    }

    if (isInitialMount.current) {
      isInitialMount.current = false;
      fetchCities(currentPage, search, statusFilter);
      return;
    }

    const timer = setTimeout(() => {
      fetchCities(currentPage, search, statusFilter);
    }, 350);

    return () => clearTimeout(timer);
  }, [
    currentPage,
    search,
    statusFilter,
    citiesPerPage,
    permissionsLoading,
    canViewCities,
    fetchCities,
  ]);

  useEffect(() => {
    if (!permissionsLoading && canViewCities) {
      fetchStates();
    }
  }, [permissionsLoading, canViewCities]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer = setTimeout(() => {
      setToast("");
    }, 3000);

    return () => clearTimeout(timer);
  }, [toast]);

  const fetchStates = async () => {
    try {
      const response = await getStates();

      if (response.success) {
        setStates(response.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch states:", err);
    }
  };

  const handleSearchChange = (event) => {
    setSearch(event.target.value);
    setCurrentPage(1);
  };

  const handleStatusChange = (event) => {
    setStatusFilter(event.target.value);
    setCurrentPage(1);
  };

  const handleCitiesPerPageChange = (event) => {
    setCitiesPerPage(Number(event.target.value));
    setCurrentPage(1);
  };

  const handleDeactivate = (id) => {
    const city = cities.find((item) => Number(item.id) === Number(id));

    if (!city) {
      return;
    }

    setConfirmCityAction({ type: "deactivate", id, city });
  };

  const handleActivate = (id) => {
    const city = cities.find((item) => Number(item.id) === Number(id));

    if (!city) return;

    setConfirmCityAction({ type: "activate", id, city });
  };

  const handleConfirmCityAction = async () => {
    if (!confirmCityAction) return;
    const { type, id } = confirmCityAction;
    setConfirmCityAction(null);

    if (type === "deactivate") {
      try {
        const response = await deleteCity(id);

        if (!response.success) {
          setToast(response.message || "Unable to deactivate city.");
          return;
        }

        setToast("City deactivated successfully.");
        await fetchCities(currentPage, search, statusFilter);
      } catch (err) {
        setToast(err.response?.data?.message || "Unable to deactivate city.");
      }
    } else {
      try {
        const response = await activateCity(id);

        if (!response.success) {
          setToast(response.message || "Unable to activate city.");
          return;
        }

        setToast("City activated successfully.");
        await fetchCities(currentPage, search, statusFilter);
      } catch (err) {
        setToast(err.response?.data?.message || "Unable to activate city.");
      }
    }
  };

  const renderPagination = () => {
    const totalPages = pagination.totalPages;

    if (totalPages <= 1) {
      return null;
    }

    const pages = [];

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      if (currentPage > 4) {
        pages.push("...");
      }

      const startPage = Math.max(2, currentPage - 1);

      const endPage = Math.min(totalPages - 1, currentPage + 1);

      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 3) {
        pages.push("...");
      }

      pages.push(totalPages);
    }

    return (
      <div className="cities-pagination-controls">
        <button
          type="button"
          onClick={() => setCurrentPage(1)}
          disabled={currentPage === 1}
          className="pagination-arrow"
        >
          «
        </button>

        <button
          type="button"
          onClick={() => setCurrentPage((previous) => previous - 1)}
          disabled={currentPage === 1}
          className="pagination-arrow"
        >
          ‹
        </button>

        {pages.map((page, index) =>
          page === "..." ? (
            <span key={`dots-${index}`} className="pagination-dots">
              ...
            </span>
          ) : (
            <button
              type="button"
              key={page}
              onClick={() => setCurrentPage(page)}
              className={
                currentPage === page
                  ? "pagination-number active"
                  : "pagination-number"
              }
            >
              {page}
            </button>
          ),
        )}

        <button
          type="button"
          onClick={() => setCurrentPage((previous) => previous + 1)}
          disabled={currentPage === totalPages}
          className="pagination-arrow"
        >
          ›
        </button>

        <button
          type="button"
          onClick={() => setCurrentPage(totalPages)}
          disabled={currentPage === totalPages}
          className="pagination-arrow"
        >
          »
        </button>
      </div>
    );
  };

  const formatDate = (date) => {
    if (!date) {
      return "-";
    }

    return new Date(date).toLocaleDateString("en-GB");
  };

  if (!canViewCities) {
    if (permissionsLoading) {
      return (
        <div style={{ height: "60vh", display: "flex", justifyContent: "center", alignItems: "center" }}>
          <Loader text="Loading cities..." />
        </div>
      );
    }
    return (
      <div className={`cities-page ${theme === "dark" ? "dark-theme" : "light-theme"}`} style={{ padding: "2rem", textAlign: "center" }}>
        <h2>Access Denied</h2>
        <p>You do not have permission to view cities.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`cities-page ${
          theme === "dark" ? "dark-theme" : "light-theme"
        }`}
      >
        <div className="cities-error">
          <h2>Unable to load cities</h2>
          <p>Please try again later.</p>
          <button
            type="button"
            className="create-city-button"
            style={{ marginTop: "16px", cursor: "pointer" }}
            onClick={() => fetchCities(currentPage, search, statusFilter)}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`cities-page ${
        theme === "dark" ? "dark-theme" : "light-theme"
      }`}
    >
      <div className="cities-header">
        <div className="cities-title">
          <span className="city-breadcrumb-tag">CITY MANAGEMENT</span>
          <h1>Cities</h1>

          <p className="cities-subtitle">
            Manage cities and their state assignments.
          </p>
        </div>

        <button
          type="button"
          className="create-city-button"
          onClick={() => navigate("/cities/create")}
        >
          + Create City
        </button>
      </div>

      <div className="cities-controls">
        <div className="city-search-wrapper">
          <span className="city-search-icon">⌕</span>

          <input
            type="text"
            placeholder="Search cities..."
            value={search}
            onChange={handleSearchChange}
          />
        </div>

        <CustomSelect
          value={citiesPerPage}
          onChange={handleCitiesPerPageChange}
          options={[
            { value: 50, label: "Show 50" },
            { value: 100, label: "Show 100" },
            { value: 150, label: "Show 150" },
            { value: 200, label: "Show 200" },
            { value: 250, label: "Show 250" },
            { value: 300, label: "Show 300" },
            { value: 350, label: "Show 350" },
            { value: 400, label: "Show 400" },
            { value: 450, label: "Show 450" },
            { value: 500, label: "Show 500" },
          ]}
          minWidth="120px"
        />

        <CustomSelect
          value={statusFilter}
          onChange={handleStatusChange}
          options={[
            { value: "all", label: "All Status" },
            { value: "active", label: "Active" },
            { value: "inactive", label: "Inactive" },
          ]}
          minWidth="125px"
        />
      </div>

      <div className="cities-table-card">
        <table className="cities-table">
          <thead>
            <tr>
              <th className="city-index-column">#</th>

              <th className="city-name-column">CITY</th>

              <th className="city-state-column">STATE</th>

              <th className="city-country-column">COUNTRY</th>

              <th className="city-status-column">STATUS</th>

              <th className="city-created-column">CREATED AT</th>

              {hasCityActions && (
                <th className="city-action-column">ACTIONS</th>
              )}
            </tr>
          </thead>

          <tbody>
            {cities.length > 0 ? (
              cities.map((city, index) => (
                <tr key={city.id}>
                  <td className="city-index-column">
                    {(currentPage - 1) * citiesPerPage + index + 1}
                  </td>

                  <td className="city-name-column">
                    <span className="city-name-text">{city.name}</span>
                  </td>

                  <td className="city-state-column">
                    {city.state_name || "-"}
                  </td>

                  <td className="city-country-column">
                    {city.country_name || "-"}
                  </td>

                  <td className="city-status-column">
                    <span
                      className={`city-status ${
                        city.is_active ? "active" : "inactive"
                      }`}
                    >
                      {city.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>

                  <td className="city-created-column">
                    {formatDate(city.created_at)}
                  </td>

                  {hasCityActions && (
                    <td
                      className="city-action-column"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="city-actions-wrapper">
                        <button
                          type="button"
                          className="city-action-btn"
                          onClick={(e) => handleActionMenuToggle(e, city.id)}
                          title="Actions"
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="5" r="1.5" />
                            <circle cx="12" cy="12" r="1.5" />
                            <circle cx="12" cy="19" r="1.5" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={hasCityActions ? 7 : 6}>
                  <div className="no-cities">{loading ? "" : "No cities found."}</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pagination.totalRecords > 0 && (
        <div className="cities-pagination">{renderPagination()}</div>
      )}

      {toast && (
        <div className="city-success-toast">
          <div className="city-success-icon">✓</div>

          <div className="city-success-text">
            <strong>Success</strong>

            <span>{toast}</span>
          </div>

          <button className="city-success-close" onClick={() => setToast("")}>
            ×
          </button>
        </div>
      )}

      {confirmCityAction && (
        <ConfirmDialog
          title="Confirm Action"
          message={
            confirmCityAction.type === "deactivate"
              ? `Are you sure you want to deactivate ${confirmCityAction.city.name}?`
              : `Are you sure you want to activate ${confirmCityAction.city.name}?`
          }
          confirmText={confirmCityAction.type === "deactivate" ? "Yes, Deactivate" : "Yes, Activate"}
          cancelText="Cancel"
          onConfirm={handleConfirmCityAction}
          onCancel={() => setConfirmCityAction(null)}
        />
      )}

      {openActionMenuId && menuPosition && (() => {
        const city = cities.find((c) => c.id === openActionMenuId);
        if (!city) return null;
        return createPortal(
          <div
            className={`city-action-dropdown ${theme === "dark" ? "dark-theme" : "light-theme"}`}
            style={{
              position: "fixed",
              right: `${menuPosition.right}px`,
              top: menuPosition.top !== null ? `${menuPosition.top}px` : "auto",
              bottom: menuPosition.bottom !== null ? `${menuPosition.bottom}px` : "auto",
              zIndex: 999999,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="city-dropdown-item"
              onClick={() => {
                setOpenActionMenuId(null);
                setMenuPosition(null);
                navigate(`/cities/${city.id}/edit`);
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              <span>Edit</span>
            </button>
          </div>,
          document.body
        );
      })()}
    </div>
  );
}

export default Cities;
