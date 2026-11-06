import "./States.css";
import React, { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { usePermission } from "../context/PermissionContext";
import Loader from "../components/Loader";

import {
  getStates,
  deleteState,
  activateState,
} from "../services/stateService";

import { getCountries } from "../services/countryService";
import SearchableDropdown from "../components/SearchableDropdown";
import CustomSelect from "../components/CustomSelect";
import ConfirmDialog from "../components/ConfirmDialog";

function States() {
  const navigate = useNavigate();
  const { theme } = useTheme();

  const {
    hasPermission,
    loading: permissionsLoading,
  } = usePermission();

  const canViewStates = hasPermission("states.view");
  const canCreateStates = hasPermission("states.create");
  const canEditStates = hasPermission("states.edit");
  const canDeleteStates = hasPermission("states.delete");

  const hasStateActions = true;

  const [states, setStates] = useState([]);
  const [countries, setCountries] = useState([]);
  const [countriesPage, setCountriesPage] = useState(1);
  const [countriesTotalPages, setCountriesTotalPages] = useState(1);
  const [countriesLoading, setCountriesLoading] = useState(false);
  const [countriesSearch, setCountriesSearch] = useState("");
  const [confirmStateAction, setConfirmStateAction] = useState(null);
  const searchTimer = useRef(null);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [countryFilter, setCountryFilter] = useState("all");

  const [statesPerPage, setStatesPerPage] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    totalRecords: 0,
    totalPages: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  const handleActionMenuToggle = (e, stateId) => {
    e.stopPropagation();
    if (openActionMenuId === stateId) {
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
    setOpenActionMenuId(stateId);
  };

  const fetchData = useCallback(
    async (
      page = 1,
      searchValue = search,
      statusValue = status,
      countryValue = countryFilter,
      retries = 2
    ) => {
      if (!canViewStates) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const statesResponse = await getStates(
          page,
          statesPerPage,
          searchValue,
          statusValue,
          countryValue,
        );

        const stateData =
          statesResponse?.data?.data ||
          statesResponse?.data?.states ||
          (Array.isArray(statesResponse?.data) ? statesResponse.data : []) ||
          (Array.isArray(statesResponse) ? statesResponse : []);
        setStates(stateData);

        const pag =
          statesResponse?.pagination ||
          statesResponse?.data?.pagination ||
          null;

        setPagination({
          page: pag?.page || page,
          limit: pag?.limit || statesPerPage,
          totalRecords: pag?.totalRecords || stateData.length || 0,
          totalPages: pag?.totalPages || Math.ceil((stateData.length || 0) / statesPerPage) || 1,
        });

        setCurrentPage(page);
      } catch (err) {
        console.error("GET STATES ERROR:", err);
        if (retries > 0) {
          setTimeout(() => {
            fetchData(page, searchValue, statusValue, countryValue, retries - 1);
          }, 350);
          return;
        }
        setError(err.response?.data?.message || "Unable to load states.");
      } finally {
        setLoading(false);
      }
    },
    [canViewStates, statesPerPage, search, status, countryFilter]
  );

  const loadCountries = async (page = 1, search = "", append = false) => {
    try {
      setCountriesLoading(true);
      const response = await getCountries(page, 50, search, "all");
      const data = response?.data?.data || [];
      const pagination = response?.data?.pagination;

      const formattedData = data.map(c => ({ id: c.id, name: c.name }));

      if (append) {
        setCountries(prev => {
          const existingIds = new Set(prev.map(c => String(c.id)));
          const uniqueNew = formattedData.filter(c => !existingIds.has(String(c.id)));
          return [...prev, ...uniqueNew];
        });
      } else {
        setCountries([{ id: "all", name: "All Countries" }, ...formattedData]);
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
    if (!permissionsLoading && canViewStates) {
      loadCountries(1, "");
    }
  }, [permissionsLoading, canViewStates]);

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

  useEffect(() => {
    if (permissionsLoading || !canViewStates) {
      return;
    }

    if (isInitialMount.current) {
      isInitialMount.current = false;
      fetchData(
        currentPage,
        search,
        status,
        countryFilter,
      );
      return;
    }

    const timer = setTimeout(() => {
      fetchData(
        currentPage,
        search,
        status,
        countryFilter,
      );
    }, 350);

    return () => clearTimeout(timer);
  }, [
    currentPage,
    statesPerPage,
    search,
    status,
    countryFilter,
    permissionsLoading,
    canViewStates,
    fetchData,
  ]);

  const showSuccess = (message) => {
    setSuccessMessage(message);

    setTimeout(() => {
      setSuccessMessage("");
    }, 4000);
  };

  const handleDelete = (state) => {
    if (state.is_active === false) {
      return;
    }
    setConfirmStateAction({ type: "deactivate", state });
  };

  const handleActivate = (state) => {
    if (state.is_active === true) {
      return;
    }
    setConfirmStateAction({ type: "activate", state });
  };

  const handleConfirmStateAction = async () => {
    if (!confirmStateAction) return;
    const { type, state } = confirmStateAction;
    setConfirmStateAction(null);

    if (type === "deactivate") {
      try {
        const response = await deleteState(state.id);

        showSuccess(
          response?.message ||
            "State deactivated successfully.",
        );

        await fetchData(
          currentPage,
          search,
          status,
          countryFilter,
        );
      } catch (err) {
        setError(
          err.response?.data?.message ||
            "Unable to deactivate state.",
        );
      }
    } else {
      try {
        const response = await activateState(state.id);

        showSuccess(
          response?.message ||
            "State activated successfully.",
        );

        await fetchData(
          currentPage,
          search,
          status,
          countryFilter,
        );
      } catch (err) {
        setError(
          err.response?.data?.message ||
            "Unable to activate state.",
        );
      }
    }
  };

  const getCountryName = (countryId) => {
    const country = countries.find(
      (item) =>
        Number(item.id) === Number(countryId),
    );

    return country?.name || "--";
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
      pages.push(
        totalPages - 2,
        totalPages - 1,
        totalPages,
      );

      return pages;
    }

    pages.push(1);
    pages.push("...");
    pages.push(
      currentPage - 1,
      currentPage,
      currentPage + 1,
    );
    pages.push("...");
    pages.push(totalPages);

    return pages;
  };

  const handlePrevious = () => {
    if (currentPage > 1) {
      setCurrentPage(
        (previous) => previous - 1,
      );
    }
  };

  const handleNext = () => {
    if (currentPage < pagination.totalPages) {
      setCurrentPage(
        (previous) => previous + 1,
      );
    }
  };

  const handleSearchChange = (event) => {
    setSearch(event.target.value);
    setCurrentPage(1);
  };

  const handleStatusChange = (event) => {
    setStatus(event.target.value);
    setCurrentPage(1);
  };

  const handleCountryFilterChange = (event) => {
    setCountryFilter(event.target.value);
    setCurrentPage(1);
  };

  const handleStatesPerPageChange = (event) => {
    setStatesPerPage(Number(event.target.value));
    setCurrentPage(1);
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

  if (!canViewStates) {
    if (permissionsLoading) {
      return (
        <div style={{ height: "60vh", display: "flex", justifyContent: "center", alignItems: "center" }}>
          <Loader text="Loading states..." />
        </div>
      );
    }
    return (
      <div className={`states-page ${theme}-theme`} style={{ padding: "2rem", textAlign: "center" }}>
        <h2>Access Denied</h2>
        <p>You do not have permission to view states.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`states-page ${theme}-theme`}
      >
        <div className="states-error">
          <h2>Unable to load states</h2>
          <p>Please try again later.</p>
          <button
            type="button"
            className="create-state-button"
            style={{ marginTop: "16px", cursor: "pointer" }}
            onClick={() =>
              fetchData(
                currentPage,
                search,
                status,
                countryFilter,
              )
            }
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`states-page ${theme}-theme`}
    >
      {successMessage && (
        <div className="state-success-toast">
          <span className="state-success-icon">
            ✓
          </span>

          <div className="state-success-text">
            <strong>Success</strong>

            <span>{successMessage}</span>
          </div>

          <button
            type="button"
            className="state-success-close"
            onClick={() =>
              setSuccessMessage("")
            }
          >
            ×
          </button>
        </div>
      )}

      <div className="states-header">
        <div className="states-title">
          <span className="state-breadcrumb-tag">STATE MANAGEMENT</span>
          <h1>States/Province</h1>

          <p className="states-subtitle">
            Search and manage states.
          </p>
        </div>

        <button
          type="button"
          className="create-state-button"
          onClick={() =>
            navigate("/states/create")
          }
        >
          + Create State
        </button>
      </div>

      <div className="states-controls">
        <div className="state-search-wrapper">
          <span className="state-search-icon">
            🔍
          </span>

          <input
            type="text"
            placeholder="Search states..."
            value={search}
            onChange={handleSearchChange}
          />
        </div>

        <CustomSelect
          value={statesPerPage}
          onChange={handleStatesPerPageChange}
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

      <div className="states-table-card">
        <table className="states-table">
          <thead>
            <tr>
              <th className="state-index-column">
                INDEX
              </th>

              <th className="state-name-column">
                STATE/PROVINCE NAME
              </th>

              <th className="state-country-column">
                COUNTRY
              </th>

              <th className="state-status-column">
                STATUS
              </th>

              <th className="state-created-column">
                CREATED AT
              </th>

              {hasStateActions && (
                <th className="state-action-column">
                  ACTION
                </th>
              )}
            </tr>
          </thead>

          <tbody>
            {states.map((state, index) => (
              <tr key={state.id}>
                <td className="state-index-column">
                  {(currentPage - 1) *
                    statesPerPage +
                    index +
                    1}
                </td>

                <td className="state-name-column">
                  <span className="state-name-text">
                    {state.name}
                  </span>
                </td>

                <td className="state-country-column">
                  {getCountryName(
                    state.country_id,
                  ) || "—"}
                </td>

                <td className="state-status-column">
                  <span
                    className={`state-status ${
                      state.is_active
                        ? "active"
                        : "inactive"
                    }`}
                  >
                    {state.is_active
                      ? "Active"
                      : "Inactive"}
                  </span>
                </td>

                <td className="state-created-column">
                  {formatDate(
                    state.created_at,
                  )}
                </td>

                {hasStateActions && (
                  <td
                    className="state-action-column"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="state-actions-wrapper">
                      <button
                        type="button"
                        className="state-action-btn"
                        onClick={(e) => handleActionMenuToggle(e, state.id)}
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

        {states.length === 0 && !loading && (
          <div className="no-states">
            No states found.
          </div>
        )}
      </div>

      {pagination.totalRecords > 0 && (
        <div className="cities-pagination">
          <div className="cities-pagination-controls">
            <button
              type="button"
              className="pagination-arrow"
              onClick={() =>
                setCurrentPage(1)
              }
              disabled={
                currentPage === 1 ||
                loading
              }
              aria-label="First page"
              title="First page"
            >
              «
            </button>

            <button
              type="button"
              className="pagination-arrow"
              onClick={handlePrevious}
              disabled={
                currentPage === 1 ||
                loading
              }
              aria-label="Previous page"
              title="Previous page"
            >
              ‹
            </button>

            {getPaginationPages().map(
              (page, index) => {
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
                      currentPage === page
                        ? "active"
                        : ""
                    }`}
                    onClick={() =>
                      setCurrentPage(page)
                    }
                    disabled={loading}
                  >
                    {page}
                  </button>
                );
              },
            )}

            <button
              type="button"
              className="pagination-arrow"
              onClick={handleNext}
              disabled={
                currentPage ===
                  pagination.totalPages ||
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
                setCurrentPage(
                  pagination.totalPages,
                )
              }
              disabled={
                currentPage ===
                  pagination.totalPages ||
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

      {confirmStateAction && (
        <ConfirmDialog
          title="Confirm Action"
          message={
            confirmStateAction.type === "deactivate"
              ? `Are you sure you want to deactivate ${confirmStateAction.state.name}?`
              : `Are you sure you want to activate ${confirmStateAction.state.name}?`
          }
          confirmText={confirmStateAction.type === "deactivate" ? "Yes, Deactivate" : "Yes, Activate"}
          cancelText="Cancel"
          onConfirm={handleConfirmStateAction}
          onCancel={() => setConfirmStateAction(null)}
        />
      )}

      {openActionMenuId && menuPosition && (() => {
        const state = states.find((s) => s.id === openActionMenuId);
        if (!state) return null;
        return createPortal(
          <div
            className={`state-action-dropdown ${theme === "dark" ? "dark-theme" : "light-theme"}`}
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
              className="state-dropdown-item"
              onClick={() => {
                setOpenActionMenuId(null);
                setMenuPosition(null);
                navigate(`/states/${state.id}/edit`);
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

export default States;