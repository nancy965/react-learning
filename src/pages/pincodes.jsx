import { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { usePermission } from "../context/PermissionContext";
import Loader from "../components/Loader";

import {
  getPincodes,
} from "../services/pincodeService";

import { getCities } from "../services/cityService";
import "./Pincodes.css";
import CustomSelect from "../components/CustomSelect";

function Pincodes() {
  const navigate = useNavigate();
  const { theme } = useTheme();

  const {
    hasPermission,
    loading: permissionsLoading,
  } = usePermission();

  const canViewPincodes =
    hasPermission("pincodes.view");

  const canCreatePincodes =
    hasPermission("pincodes.create");

  const canEditPincodes =
    hasPermission("pincodes.edit");

  const hasPincodeActions = canEditPincodes;

  const [pincodes, setPincodes] = useState([]);
  const [cities, setCities] = useState([]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState("all");

  const [pincodesPerPage, setPincodesPerPage] =
    useState(50);

  const [currentPage, setCurrentPage] =
    useState(1);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    totalRecords: 0,
    totalPages: 0,
  });

  const [loading, setLoading] =
    useState(true);

  const [error, setError] = useState("");

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

  const handleActionMenuToggle = (e, pincodeId) => {
    e.stopPropagation();
    if (openActionMenuId === pincodeId) {
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
    setOpenActionMenuId(pincodeId);
  };

  const fetchPincodes = useCallback(
    async (
      page = 1,
      searchValue = search,
      statusValue = statusFilter,
      retries = 2
    ) => {
      if (!canViewPincodes) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const response = await getPincodes(
          page,
          pincodesPerPage,
          searchValue,
          statusValue,
        );

        if (response && response.success !== false) {
          const pincodeData =
            response.pincodes ||
            response.data?.pincodes ||
            response.data?.data ||
            (Array.isArray(response.data) ? response.data : []) ||
            (Array.isArray(response.pincodes) ? response.pincodes : []);

          setPincodes(pincodeData);

          const pag =
            response.pagination ||
            response.data?.pagination ||
            null;

          setPagination({
            page:
              pag?.page ||
              page,
            limit:
              pag?.limit ||
              pincodesPerPage,
            totalRecords:
              pag?.totalRecords ||
              pincodeData.length ||
              0,
            totalPages:
              pag?.totalPages ||
              Math.ceil((pincodeData.length || 0) / pincodesPerPage) ||
              1,
          });

          setCurrentPage(page);
        } else {
          if (retries > 0) {
            setTimeout(() => {
              fetchPincodes(page, searchValue, statusValue, retries - 1);
            }, 350);
            return;
          }
          setError(
            response?.message ||
              "Failed to fetch pincodes.",
          );
        }
      } catch (err) {
        console.error("GET PINCODES ERROR:", err);
        if (retries > 0) {
          setTimeout(() => {
            fetchPincodes(page, searchValue, statusValue, retries - 1);
          }, 350);
          return;
        }
        setError(
          err.response?.data?.message ||
            "Unable to load pincodes.",
        );
      } finally {
        setLoading(false);
      }
    },
    [canViewPincodes, pincodesPerPage, search, statusFilter]
  );

  useEffect(() => {
    if (
      permissionsLoading ||
      !canViewPincodes
    ) {
      return;
    }

    if (isInitialMount.current) {
      isInitialMount.current = false;
      fetchPincodes(
        currentPage,
        search,
        statusFilter,
      );
      return;
    }

    const timer = setTimeout(() => {
      fetchPincodes(
        currentPage,
        search,
        statusFilter,
      );
    }, 350);

    return () => clearTimeout(timer);
  }, [
    permissionsLoading,
    canViewPincodes,
    currentPage,
    pincodesPerPage,
    search,
    statusFilter,
    fetchPincodes,
  ]);

  useEffect(() => {
    if (
      permissionsLoading ||
      !canViewPincodes
    ) {
      return;
    }

    fetchCities();
  }, [
    permissionsLoading,
    canViewPincodes,
  ]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer = setTimeout(() => {
      setToast("");
    }, 3000);

    return () => clearTimeout(timer);
  }, [toast]);

  const fetchCities = async () => {
    try {
      const response = await getCities();

      if (response.success) {
        setCities(
          response.data || [],
        );
      }
    } catch (err) {
      console.error(
        "Failed to fetch cities:",
        err,
      );
    }
  };

  const handlePincodesPerPageChange = (
    event,
  ) => {
    setPincodesPerPage(
      Number(event.target.value),
    );

    setCurrentPage(1);
  };

  const handleSearchChange = (
    event,
  ) => {
    setSearch(event.target.value);
    setCurrentPage(1);
  };

  const handleStatusChange = (
    event,
  ) => {
    setStatusFilter(
      event.target.value,
    );

    setCurrentPage(1);
  };

  const getPaginationPages = () => {
    const totalPages =
      pagination.totalPages;

    const pages = [];

    if (totalPages <= 5) {
      for (
        let i = 1;
        i <= totalPages;
        i++
      ) {
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

    if (
      currentPage >=
      totalPages - 2
    ) {
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
    if (
      currentPage <
      pagination.totalPages
    ) {
      setCurrentPage(
        (previous) => previous + 1,
      );
    }
  };



  const formatDate = (date) => {
    if (!date) {
      return "-";
    }

    return new Date(
      date,
    ).toLocaleDateString(
      "en-GB",
    );
  };

  if (!canViewPincodes) {
    if (permissionsLoading) {
      return (
        <div style={{ height: "60vh", display: "flex", justifyContent: "center", alignItems: "center" }}>
          <Loader text="Loading pincodes..." />
        </div>
      );
    }
    return (
      <div className={`pincodes-page ${theme}-theme`} style={{ padding: "2rem", textAlign: "center" }}>
        <h2>Access Denied</h2>
        <p>You do not have permission to view pincodes.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`pincodes-page ${
          theme === "dark"
            ? "dark-theme"
            : "light-theme"
        }`}
      >
        <div className="pincodes-error">
          <h2>
            Unable to load pincodes
          </h2>
          <p>Please try again later.</p>
          <button
            type="button"
            className="create-pincode-button"
            style={{ marginTop: "16px", cursor: "pointer" }}
            onClick={() =>
              fetchPincodes(
                currentPage,
                search,
                statusFilter,
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
      className={`pincodes-page ${
        theme === "dark"
          ? "dark-theme"
          : "light-theme"
      }`}
    >
      <div className="pincodes-header">
        <div className="pincodes-title">
          <span className="pincode-breadcrumb-tag">PINCODE MANAGEMENT</span>
          <h1>Pincodes</h1>

          <p className="pincodes-subtitle">
            Manage pincodes and their city assignments.
          </p>
        </div>

        <button
          type="button"
          className="create-pincode-button"
          onClick={() =>
            navigate(
              "/pincodes/create",
            )
          }
        >
          + Create Pincode
        </button>
      </div>

      <div className="pincodes-controls">
        <div className="pincode-search-wrapper">
          <span className="pincode-search-icon">
            ⌕
          </span>

          <input
            type="text"
            placeholder="Search pincodes..."
            value={search}
            onChange={
              handleSearchChange
            }
          />
        </div>

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

        <CustomSelect
          value={pincodesPerPage}
          onChange={handlePincodesPerPageChange}
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
      </div>

      <div className="pincodes-table-card">
        <table className="pincodes-table">
          <thead>
            <tr>
              <th className="pincode-index-column">
                #
              </th>

              <th className="pincode-code-column">
                PINCODE
              </th>

              <th className="pincode-city-column">
                CITY
              </th>

              <th className="pincode-state-column">
                STATE
              </th>

              <th className="pincode-country-column">
                COUNTRY
              </th>

              <th className="pincode-status-column">
                STATUS
              </th>

              <th className="pincode-created-column">
                CREATED AT
              </th>

              {hasPincodeActions && (
                <th className="pincode-action-column">
                  ACTIONS
                </th>
              )}
            </tr>
          </thead>

          <tbody>
            {pincodes.length > 0 ? (
              pincodes.map(
                (item, index) => (
                  <tr key={item.id}>
                    <td className="pincode-index-column">
                      {(currentPage - 1) *
                        pincodesPerPage +
                        index +
                        1}
                    </td>

                    <td className="pincode-code-column">
                      <span className="pincode-code-text">
                        {item.pincode}
                      </span>
                    </td>

                    <td className="pincode-city-column">
                      {item.city_name ||
                        "-"}
                    </td>

                    <td className="pincode-state-column">
                      {item.state_name ||
                        "-"}
                    </td>

                    <td className="pincode-country-column">
                      {item.country_name ||
                        "-"}
                    </td>

                    <td className="pincode-status-column">
                      <span
                        className={`pincode-status ${
                          item.is_active
                            ? "active"
                            : "inactive"
                        }`}
                      >
                        {item.is_active
                          ? "Active"
                          : "Inactive"}
                      </span>
                    </td>

                    <td className="pincode-created-column">
                      {formatDate(
                        item.created_at,
                      )}
                    </td>

                    {hasPincodeActions && (
                      <td
                        className="pincode-action-column"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div
                          className="pincode-actions-wrapper"
                          style={{
                            position: "relative",
                            display: "inline-block",
                          }}
                        >
                          <button
                            type="button"
                            className="pincode-action-btn"
                            onClick={(e) => handleActionMenuToggle(e, item.id)}
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
                ),
              )
            ) : (
              <tr>
                <td
                  colSpan={
                    hasPincodeActions
                      ? 8
                      : 7
                  }
                >
                  <div className="no-pincodes">
                    {loading ? "" : "No pincodes found."}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
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
                if (
                  page === "..."
                ) {
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
                      setCurrentPage(
                        page,
                      )
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

      {toast && (
        <div className="pincode-success-toast">
          <div className="pincode-success-icon">
            ✓
          </div>

          <div className="pincode-success-text">
            <strong>Success</strong>

            <span>{toast}</span>
          </div>

          <button
            type="button"
            className="pincode-success-close"
            onClick={() => setToast("")}
          >
            ×
          </button>
        </div>
      )}

      {openActionMenuId && menuPosition && (() => {
        const pincode = pincodes.find((p) => p.id === openActionMenuId);
        if (!pincode) return null;
        return createPortal(
          <div
            className={`pincode-action-dropdown ${theme === "dark" ? "dark-theme" : "light-theme"}`}
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
              className="pincode-dropdown-item"
              onClick={() => {
                setOpenActionMenuId(null);
                setMenuPosition(null);
                navigate(`/pincodes/${pincode.id}/edit`);
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

export default Pincodes;