import "./Countries.css";
import { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { usePermission } from "../context/PermissionContext";
import { useTheme } from "../context/ThemeContext";
import Loader from "../components/Loader";
import {
  getCountries,
  deleteCountry,
  activateCountry,
} from "../services/countryService";
import CustomSelect from "../components/CustomSelect";
import ConfirmDialog from "../components/ConfirmDialog";

function Countries() {
  const navigate = useNavigate();
  const { theme } = useTheme();

  const { hasPermission, loading: permissionsLoading } = usePermission();

  const canViewCountries = hasPermission("countries.view");
  const canCreateCountries = hasPermission("countries.create");
  const canEditCountries = hasPermission("countries.edit");
  const canDeleteCountries = hasPermission("countries.delete");
  const canActivateCountries = hasPermission("countries.activate");

  const hasCountryActions = true;

  const [countries, setCountries] = useState([]);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");

  const [countriesPerPage, setCountriesPerPage] = useState(50);

  const [currentPage, setCurrentPage] = useState(1);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    totalRecords: 0,
    totalPages: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirmCountryAction, setConfirmCountryAction] = useState(null);

  const [successMessage, setSuccessMessage] = useState("");
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

  const handleActionMenuToggle = (e, countryId) => {
    e.stopPropagation();
    if (openActionMenuId === countryId) {
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
    setOpenActionMenuId(countryId);
  };

  const fetchCountries = useCallback(
    async (
      page = 1,
      searchValue = search,
      statusValue = status,
      retries = 2
    ) => {
      try {
        setLoading(true);
        setError("");

        const response = await getCountries(
          page,
          countriesPerPage,
          searchValue,
          statusValue
        );

        const countryData =
          response.data?.data ||
          response.data?.countries ||
          (Array.isArray(response.data) ? response.data : []);

        setCountries(countryData);

        setPagination({
          page: response.data?.pagination?.page || page,
          limit: response.data?.pagination?.limit || countriesPerPage,
          totalRecords: response.data?.pagination?.totalRecords || countryData.length || 0,
          totalPages: response.data?.pagination?.totalPages || Math.ceil((countryData.length || 0) / countriesPerPage) || 1,
        });

        setCurrentPage(page);
      } catch (err) {
        if (retries > 0) {
          setTimeout(() => {
            fetchCountries(page, searchValue, statusValue, retries - 1);
          }, 350);
          return;
        }
        setError(
          err.response?.data?.message || "Unable to load countries."
        );
      } finally {
        setLoading(false);
      }
    },
    [countriesPerPage, search, status]
  );

  useEffect(() => {
    if (permissionsLoading || !canViewCountries) {
      return;
    }

    if (isInitialMount.current) {
      isInitialMount.current = false;
      fetchCountries(currentPage, search, status);
      return;
    }

    const timer = setTimeout(() => {
      fetchCountries(currentPage, search, status);
    }, 350);

    return () => clearTimeout(timer);
  }, [
    permissionsLoading,
    canViewCountries,
    currentPage,
    countriesPerPage,
    search,
    status,
    fetchCountries,
  ]);

  const handleCountriesPerPageChange = (event) => {
    setCountriesPerPage(Number(event.target.value));
    setCurrentPage(1);
  };

  const handleSearchChange = (event) => {
    setSearch(event.target.value);
    setCurrentPage(1);
  };

  const handleStatusChange = (event) => {
    setStatus(event.target.value);
    setCurrentPage(1);
  };

  const getPaginationPages = () => {
    const totalPages = pagination.totalPages;
    const pages = [];

    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }

      return pages;
    }

    if (currentPage <= 3) {
      pages.push(1, 2, 3);
      pages.push("...");
      pages.push(totalPages);

      return pages;
    }

    if (currentPage >= totalPages - 2) {
      pages.push(1);
      pages.push("...");
      pages.push(totalPages - 2, totalPages - 1, totalPages);

      return pages;
    }

    pages.push(1);
    pages.push("...");
    pages.push(currentPage - 1, currentPage, currentPage + 1);
    pages.push("...");
    pages.push(totalPages);

    return pages;
  };

  const handlePrevious = () => {
    if (currentPage > 1) {
      setCurrentPage((previous) => previous - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < pagination.totalPages) {
      setCurrentPage((previous) => previous + 1);
    }
  };

  const showSuccess = (message) => {
    setSuccessMessage(message);

    setTimeout(() => {
      setSuccessMessage("");
    }, 4000);
  };

  const handleDelete = (country) => {
    if (country.is_active === false) {
      return;
    }
    setConfirmCountryAction({ type: "deactivate", country });
  };

  const handleActivate = (country) => {
    if (country.is_active === true) {
      return;
    }
    setConfirmCountryAction({ type: "activate", country });
  };

  const handleConfirmCountryAction = async () => {
    if (!confirmCountryAction) return;
    const { type, country } = confirmCountryAction;
    setConfirmCountryAction(null);

    if (type === "deactivate") {
      try {
        const response = await deleteCountry(country.id);

        showSuccess(
          response.data?.message ||
            response.message ||
            "Country deactivated successfully.",
        );

        await fetchCountries(currentPage, search, status);
      } catch (err) {
        setError(
          err.response?.data?.message ||
            "Unable to deactivate country.",
        );
      }
    } else {
      try {
        const response = await activateCountry(country.id);

        showSuccess(
          response.data?.message ||
            response.message ||
            "Country activated successfully."
        );

        await fetchCountries(currentPage, search, status);
      } catch (err) {
        setError(
          err.response?.data?.message ||
            "Unable to activate country."
        );
      }
    }
  };

  const formatDate = (date) => {
    if (!date) {
      return "--";
    }

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "--";
    }

    return parsedDate.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  if (!canViewCountries) {
    if (permissionsLoading) {
      return (
        <div style={{ height: "60vh", display: "flex", justifyContent: "center", alignItems: "center" }}>
          <Loader text="Loading countries..." />
        </div>
      );
    }
    return (
      <div className={`countries-page ${theme}-theme`} style={{ padding: "2rem", textAlign: "center" }}>
        <h2>Access Denied</h2>
        <p>You do not have permission to view countries.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`countries-page ${theme}-theme`}>
        <div className="countries-error">
          <h2>Unable to load countries</h2>
          <p>Please try again later.</p>
          <button
            type="button"
            className="create-country-button"
            style={{ marginTop: "16px", cursor: "pointer" }}
            onClick={() => fetchCountries(currentPage, search, status)}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`countries-page ${theme}-theme`}>
      {successMessage && (
        <div className="country-success-toast">
          <span className="country-success-icon">✓</span>

          <div className="country-success-text">
            <strong>Success</strong>
            <span>{successMessage}</span>
          </div>

          <button
            type="button"
            className="country-success-close"
            onClick={() => setSuccessMessage("")}
          >
            ×
          </button>
        </div>
      )}

      <div className="countries-header">
        <div className="countries-title">
          <span className="country-breadcrumb-tag">COUNTRY MANAGEMENT</span>
          <h1>Countries</h1>

          <p className="countries-subtitle">
            Search and manage countries.
          </p>
        </div>

        <button
          type="button"
          className="create-country-button"
          onClick={() => navigate("/countries/create")}
        >
          + Create Country
        </button>
      </div>

      <div className="countries-controls">
        <div className="country-search-wrapper">
          <span className="country-search-icon">🔍</span>

          <input
            type="text"
            placeholder="Search countries..."
            value={search}
            onChange={handleSearchChange}
          />
        </div>

        <CustomSelect
          value={countriesPerPage}
          onChange={handleCountriesPerPageChange}
          options={[
            { value: 50, label: "Show 50" },
            { value: 100, label: "Show 100" },
            { value: 150, label: "Show 150" },
            { value: 200, label: "Show 200" },
            { value: 250, label: "Show 250" },
          ]}
          minWidth="120px"
        />

        <CustomSelect
          value={status}
          onChange={handleStatusChange}
          options={[
            { value: "all", label: "All Status" },
            { value: "active", label: "Active" },
            { value: "inactive", label: "Inactive" },
          ]}
          minWidth="125px"
        />
      </div>

      <div className="countries-table-card">
        <table className="countries-table">
          <thead>
            <tr>
              <th className="country-index-column">
                INDEX
              </th>

              <th className="country-name-column">
                COUNTRY NAME
              </th>

              <th className="country-status-column">
                STATUS
              </th>

              <th className="country-created-column">
                CREATED AT
              </th>

              {hasCountryActions && (
                <th className="country-action-column">
                  ACTION
                </th>
              )}
            </tr>
          </thead>

          <tbody>
            {countries.map((country, index) => (
              <tr key={country.id}>
                <td className="country-index-column">
                  {(currentPage - 1) * countriesPerPage +
                    index +
                    1}
                </td>

                <td className="country-name-column">
                  <span className="country-name-text">
                    {country.name}
                  </span>
                </td>

                <td className="country-status-column">
                  <span
                    className={`country-status ${
                      country.is_active
                        ? "active"
                        : "inactive"
                    }`}
                  >
                    {country.is_active
                      ? "Active"
                      : "Inactive"}
                  </span>
                </td>

                <td className="country-created-column">
                  {formatDate(country.created_at)}
                </td>

                {hasCountryActions && (
                  <td
                    className="country-action-column"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="country-actions-wrapper">
                      <button
                        type="button"
                        className="country-action-btn"
                        onClick={(e) => handleActionMenuToggle(e, country.id)}
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
            ))}
          </tbody>
        </table>

        {countries.length === 0 && !loading && (
          <div className="no-countries">
            No countries found.
          </div>
        )}
      </div>

      {pagination.totalRecords > 0 && (
        <div className="cities-pagination">
          <div className="cities-pagination-controls">
            <button
              type="button"
              className="pagination-arrow"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1 || loading}
              aria-label="First page"
              title="First page"
            >
              «
            </button>

            <button
              type="button"
              className="pagination-arrow"
              onClick={handlePrevious}
              disabled={currentPage === 1 || loading}
              aria-label="Previous page"
              title="Previous page"
            >
              ‹
            </button>

            {getPaginationPages().map((page, index) => {
              if (page === "...") {
                return (
                  <span
                    key={`dots-${index}`}
                    className="pagination-dots"
                  >
                    ...
                  </span>
                );
              }

              return (
                <button
                  key={page}
                  type="button"
                  className={`pagination-number ${
                    currentPage === page ? "active" : ""
                  }`}
                  onClick={() => setCurrentPage(page)}
                  disabled={loading}
                >
                  {page}
                </button>
              );
            })}

            <button
              type="button"
              className="pagination-arrow"
              onClick={handleNext}
              disabled={
                currentPage === pagination.totalPages ||
                loading
              }
              aria-label="Next page"
              title="Next page"
            >
              ›
            </button>

            <button
              type="button"
              className="pagination-arrow"
              onClick={() =>
                setCurrentPage(pagination.totalPages)
              }
              disabled={
                currentPage === pagination.totalPages ||
                loading
              }
              aria-label="Last page"
              title="Last page"
            >
              »
            </button>
          </div>
        </div>
      )}

      {confirmCountryAction && (
        <ConfirmDialog
          title="Confirm Action"
          message={
            confirmCountryAction.type === "deactivate"
              ? `Are you sure you want to deactivate ${confirmCountryAction.country.name}?`
              : `Are you sure you want to activate ${confirmCountryAction.country.name}?`
          }
          confirmText={confirmCountryAction.type === "deactivate" ? "Yes, Deactivate" : "Yes, Activate"}
          cancelText="Cancel"
          onConfirm={handleConfirmCountryAction}
          onCancel={() => setConfirmCountryAction(null)}
        />
      )}

      {openActionMenuId && menuPosition && (() => {
        const country = countries.find((c) => c.id === openActionMenuId);
        if (!country) return null;
        return createPortal(
          <div
            className={`country-action-dropdown ${theme === "dark" ? "dark-theme" : "light-theme"}`}
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
              className="country-dropdown-item"
              onClick={() => {
                setOpenActionMenuId(null);
                setMenuPosition(null);
                navigate(`/countries/${country.id}/edit`);
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

export default Countries;