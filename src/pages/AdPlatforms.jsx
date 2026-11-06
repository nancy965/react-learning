import "./AdPlatforms.css";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import Loader from "../components/Loader";
import { usePermission } from "../context/PermissionContext";

import {
  getAdPlatforms,
  deleteAdPlatform,
  updateAdPlatform,
} from "../services/adPlatformService";
import CustomSelect from "../components/CustomSelect";
import ConfirmDialog from "../components/ConfirmDialog";

function AdPlatforms() {
  const navigate = useNavigate();
  const { theme } = useTheme();

  const {
    hasPermission,
    loading: permissionsLoading,
  } = usePermission();

  const canViewPlatforms = hasPermission(
    "ad_platforms.view",
  );

  const canCreatePlatforms = hasPermission(
    "ad_platforms.create",
  );

  const canEditPlatforms = hasPermission(
    "ad_platforms.edit",
  );

  const canDeletePlatforms = hasPermission(
    "ad_platforms.delete",
  );

  const hasPlatformActions =
    canEditPlatforms ||
    canDeletePlatforms;

  const [platforms, setPlatforms] = useState([]);
  const [filteredPlatforms, setFilteredPlatforms] =
    useState([]);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");

  const [platformsPerPage, setPlatformsPerPage] =
    useState(5);

  const [currentPage, setCurrentPage] =
    useState(1);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");
  const [confirmPlatformAction, setConfirmPlatformAction] =
    useState(null);

  const fetchPlatforms = async () => {
    if (!canViewPlatforms) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response =
        await getAdPlatforms();

      const platformData =
        response.data?.data || [];

      setPlatforms(platformData);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load ad platforms.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (
      permissionsLoading ||
      !canViewPlatforms
    ) {
      return;
    }

    fetchPlatforms();
  }, [
    permissionsLoading,
    canViewPlatforms,
  ]);

  useEffect(() => {
    let result = [...platforms];

    if (search.trim()) {
      const searchValue =
        search.toLowerCase();

      result = result.filter(
        (platform) =>
          platform.name
            ?.toLowerCase()
            .includes(searchValue) ||
          platform.code
            ?.toLowerCase()
            .includes(searchValue) ||
          platform.description
            ?.toLowerCase()
            .includes(searchValue),
      );
    }

    if (status === "active") {
      result = result.filter(
        (platform) =>
          platform.is_active === true,
      );
    }

    if (status === "inactive") {
      result = result.filter(
        (platform) =>
          platform.is_active === false,
      );
    }

    setFilteredPlatforms(result);
  }, [
    platforms,
    search,
    status,
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    search,
    status,
    platformsPerPage,
  ]);

  const getPageSizeOptions = (totalCount) => {
    const count = totalCount || 0;
    const maxLimit = Math.max(5, Math.ceil(count / 5) * 5);
    const options = [];
    for (let i = 5; i <= maxLimit; i += 5) {
      options.push(i);
    }
    return options;
  };

  useEffect(() => {
    const options = getPageSizeOptions(platforms.length);
    if (!options.includes(platformsPerPage)) {
      setPlatformsPerPage(5);
    }
  }, [platforms.length, platformsPerPage]);

  useEffect(() => {
    if (!successMessage) {
      return;
    }

    const timer = setTimeout(() => {
      setSuccessMessage("");
    }, 4000);

    return () => clearTimeout(timer);
  }, [successMessage]);

  const totalRecords =
    filteredPlatforms.length;

  const totalPages = Math.ceil(
    totalRecords / platformsPerPage,
  );

  const startIndex =
    (currentPage - 1) *
    platformsPerPage;

  const endIndex =
    startIndex + platformsPerPage;

  const currentPlatforms =
    filteredPlatforms.slice(
      startIndex,
      endIndex,
    );

  const handlePlatformsPerPageChange = (
    event,
  ) => {
    setPlatformsPerPage(
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
    setStatus(event.target.value);
    setCurrentPage(1);
  };

  const getPaginationPages = () => {
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
      currentPage < totalPages
    ) {
      setCurrentPage(
        (previous) => previous + 1,
      );
    }
  };

  const showSuccess = (message) => {
    setSuccessMessage(message);
  };

  const handleDelete = (
    platform,
  ) => {
    if (
      platform.is_active === false
    ) {
      return;
    }
    setConfirmPlatformAction({ type: "deactivate", platform });
  };

  const handleActivate = (
    platform,
  ) => {
    setConfirmPlatformAction({ type: "activate", platform });
  };

  const handleConfirmPlatformAction = async () => {
    if (!confirmPlatformAction) return;
    const { type, platform } = confirmPlatformAction;
    setConfirmPlatformAction(null);

    if (type === "deactivate") {
      try {
        const response =
          await deleteAdPlatform(
            platform.id,
          );

        showSuccess(
          response.message ||
            "Ad platform deactivated successfully.",
        );

        await fetchPlatforms();
      } catch (err) {
        setError(
          err.response?.data?.message ||
            "Unable to deactivate ad platform.",
        );
      }
    } else {
      try {
        const response =
          await updateAdPlatform(
            platform.id,
            {
              name: platform.name,
              code: platform.code,
              description:
                platform.description,
              is_active: true,
            },
          );

        showSuccess(
          response.message ||
            "Ad platform activated successfully.",
        );

        await fetchPlatforms();
      } catch (err) {
        setError(
          err.response?.data?.message ||
            "Unable to activate ad platform.",
        );
      }
    }
  };

  const formatDate = (date) => {
    if (!date) {
      return "--";
    }

    const parsedDate =
      new Date(date);

    if (
      Number.isNaN(
        parsedDate.getTime(),
      )
    ) {
      return "--";
    }

    return parsedDate.toLocaleDateString(
      "en-GB",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      },
    );
  };

  if (!canViewPlatforms) {
    if (permissionsLoading) {
      return (
        <div style={{ height: "60vh", display: "flex", justifyContent: "center", alignItems: "center" }}>
          <Loader text="Loading ad platforms..." />
        </div>
      );
    }
    return (
      <div className={`ad-platforms-page ${theme}-theme`} style={{ padding: "2rem", textAlign: "center" }}>
        <h2>Access Denied</h2>
        <p>You do not have permission to view ad platforms.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`ad-platforms-page ${theme}-theme`}
      >
        <div className="ad-platforms-error">
          <h2>
            Unable to load ad platforms
          </h2>
          <p>Please try again later.</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`ad-platforms-page ${theme}-theme`}
    >
      {successMessage && (
        <div className="ad-platform-success-toast">
          <span className="ad-platform-success-icon">
            ✓
          </span>

          <div className="ad-platform-success-text">
            <strong>Success</strong>

            <span>{successMessage}</span>
          </div>

          <button
            type="button"
            className="ad-platform-success-close"
            onClick={() =>
              setSuccessMessage("")
            }
          >
            ×
          </button>
        </div>
      )}

      <div className="ad-platforms-header">
        <div className="ad-platforms-title">
          <span className="standard-page-eyebrow">AD MANAGEMENT</span>
          <h1>Ad Platforms</h1>

          <p className="ad-platforms-subtitle">
            Manage advertising platforms and integrations.
          </p>
        </div>

        <button
          type="button"
          className="create-ad-platform-button"
          onClick={() =>
            navigate(
              "/ad-platforms/create",
            )
          }
        >
          + Create Platform
        </button>
      </div>

      <div className="ad-platforms-controls">
        <div className="ad-platform-search-wrapper">
          <span className="ad-platform-search-icon">
            🔍
          </span>

          <input
            type="text"
            placeholder="Search platforms..."
            value={search}
            onChange={
              handleSearchChange
            }
          />
        </div>

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

        <CustomSelect
          value={platformsPerPage}
          onChange={handlePlatformsPerPageChange}
          options={getPageSizeOptions(platforms.length).map((size) => ({
            value: size,
            label: `Show ${size}`,
          }))}
          minWidth="120px"
        />
      </div>

      <div className="ad-platforms-table-card">
        <table className="ad-platforms-table">
          <thead>
            <tr>
              <th className="ad-platform-index-column">
                Index
              </th>

              <th className="ad-platform-name-column">
                Platform Name
              </th>

              <th className="ad-platform-code-column">
                Code
              </th>

              <th className="ad-platform-description-column">
                Description
              </th>

              <th className="ad-platform-status-column">
                Status
              </th>

              <th className="ad-platform-created-column">
                Created At
              </th>

              {hasPlatformActions && (
                <th className="ad-platform-action-column">
                  Action
                </th>
              )}
            </tr>
          </thead>

          <tbody>
            {currentPlatforms.map(
              (platform, index) => (
                <tr
                  key={platform.id}
                >
                  <td className="ad-platform-index-column">
                    {startIndex +
                      index +
                      1}
                  </td>

                  <td className="ad-platform-name-column">
                    <div className="ad-platform-name-cell">
                      <span>
                        {platform.name}
                      </span>
                    </div>
                  </td>

                  <td className="ad-platform-code-column">
                    <span className="ad-platform-code">
                      {platform.code}
                    </span>
                  </td>

                  <td className="ad-platform-description-column ad-platform-description">
                    <span className="ad-platform-description-text">
                      {platform.description ||
                        "--"}
                    </span>
                  </td>

                  <td className="ad-platform-status-column">
                    <span
                      className={`ad-platform-status ${
                        platform.is_active
                          ? "active"
                          : "inactive"
                      }`}
                    >
                      {platform.is_active
                        ? "Active"
                        : "Inactive"}
                    </span>
                  </td>

                  <td className="ad-platform-created-column">
                    {formatDate(
                      platform.created_at,
                    )}
                  </td>

                  {hasPlatformActions && (
                    <td className="ad-platform-action-column">
                      <div className="ad-platform-actions">
                        {canEditPlatforms && (
                          <button
                            type="button"
                            className="ad-platform-edit-button"
                            onClick={() =>
                              navigate(
                                `/ad-platforms/${platform.id}/edit`,
                              )
                            }
                          >
                            Edit
                          </button>
                        )}

                        {canDeletePlatforms &&
                          (platform.is_active ? (
                            <button
                              type="button"
                              className="ad-platform-deactivate-button"
                              onClick={() =>
                                handleDelete(
                                  platform,
                                )
                              }
                            >
                              Deactivate
                            </button>
                          ) : (
                            canEditPlatforms && (
                              <button
                                type="button"
                                className="ad-platform-activate-button"
                                onClick={() =>
                                  handleActivate(
                                    platform,
                                  )
                                }
                              >
                                Activate
                              </button>
                            )
                          ))}
                      </div>
                    </td>
                  )}
                </tr>
              ),
            )}
          </tbody>
        </table>

        {currentPlatforms.length === 0 && (
          <div className="no-ad-platforms">
            No ad platforms found.
          </div>
        )}
      </div>

      {totalRecords > 0 && (
        <div className="ad-platforms-pagination">
          <div className="ad-platforms-pagination-controls">
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
                  totalPages ||
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
                  totalPages,
                )
              }
              disabled={
                currentPage ===
                  totalPages ||
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

      {confirmPlatformAction && (
        <ConfirmDialog
          title="Confirm Action"
          message={
            confirmPlatformAction.type === "deactivate"
              ? `Are you sure you want to deactivate ${confirmPlatformAction.platform.name}?`
              : `Are you sure you want to activate ${confirmPlatformAction.platform.name}?`
          }
          confirmText={confirmPlatformAction.type === "deactivate" ? "Yes, Deactivate" : "Yes, Activate"}
          cancelText="Cancel"
          onConfirm={handleConfirmPlatformAction}
          onCancel={() => setConfirmPlatformAction(null)}
        />
      )}
    </div>
  );
}

export default AdPlatforms;