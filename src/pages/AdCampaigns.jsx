import "./AdCampaigns.css";
import { useEffect, useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { usePermission } from "../context/PermissionContext";
import Loader from "../components/Loader";
import { useNavigate } from "react-router-dom";

import {
  getAdCampaigns,
} from "../services/adCampaignService";

import { getAdPlatforms } from "../services/adPlatformService";
import CustomSelect from "../components/CustomSelect";

function AdCampaigns() {
  const navigate = useNavigate();
  const { theme } = useTheme();

  const {
    hasPermission,
    loading: permissionsLoading,
  } = usePermission();

  const canViewCampaigns =
    hasPermission("ad_campaigns.view");

  const canCreateCampaigns =
    hasPermission("ad_campaigns.create");

  const [campaigns, setCampaigns] = useState([]);
  const [platforms, setPlatforms] = useState([]);
  const [filteredCampaigns, setFilteredCampaigns] =
    useState([]);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [platformFilter, setPlatformFilter] =
    useState("all");

  const [campaignsPerPage, setCampaignsPerPage] =
    useState(5);

  const [currentPage, setCurrentPage] =
    useState(1);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  const fetchData = async () => {
    if (!canViewCampaigns) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const [
        campaignResponse,
        platformResponse,
      ] = await Promise.all([
        getAdCampaigns(),
        getAdPlatforms(),
      ]);

      setCampaigns(
        campaignResponse.data?.data || [],
      );

      setPlatforms(
        platformResponse.data?.data || [],
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load ad campaigns.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (
      permissionsLoading ||
      !canViewCampaigns
    ) {
      return;
    }

    fetchData();
  }, [
    permissionsLoading,
    canViewCampaigns,
  ]);

  useEffect(() => {
    let result = [...campaigns];

    if (search.trim()) {
      const searchValue =
        search.toLowerCase();

      result = result.filter(
        (campaign) =>
          campaign.name
            ?.toLowerCase()
            .includes(searchValue) ||
          campaign.objective
            ?.toLowerCase()
            .includes(searchValue) ||
          campaign.platform_name
            ?.toLowerCase()
            .includes(searchValue) ||
          campaign.description
            ?.toLowerCase()
            .includes(searchValue),
      );
    }

    if (status !== "all") {
      result = result.filter(
        (campaign) =>
          campaign.status === status,
      );
    }

    if (platformFilter !== "all") {
      result = result.filter(
        (campaign) =>
          String(campaign.platform_id) ===
          String(platformFilter),
      );
    }

    setFilteredCampaigns(result);
  }, [
    campaigns,
    search,
    status,
    platformFilter,
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    search,
    status,
    platformFilter,
    campaignsPerPage,
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
    const options = getPageSizeOptions(campaigns.length);
    if (!options.includes(campaignsPerPage)) {
      setCampaignsPerPage(5);
    }
  }, [campaigns.length, campaignsPerPage]);

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
    filteredCampaigns.length;

  const totalPages = Math.ceil(
    totalRecords / campaignsPerPage,
  );

  const startIndex =
    (currentPage - 1) *
    campaignsPerPage;

  const endIndex =
    startIndex + campaignsPerPage;

  const currentCampaigns =
    filteredCampaigns.slice(
      startIndex,
      endIndex,
    );

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

  const handlePlatformFilterChange = (
    event,
  ) => {
    setPlatformFilter(
      event.target.value,
    );
    setCurrentPage(1);
  };

  const handleCampaignsPerPageChange = (
    event,
  ) => {
    setCampaignsPerPage(
      Number(event.target.value),
    );
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
    if (currentPage < totalPages) {
      setCurrentPage(
        (previous) => previous + 1,
      );
    }
  };

  const formatDate = (date) => {
    if (!date) {
      return "--";
    }

    const parsedDate = new Date(date);

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

  if (!canViewCampaigns) {
    if (permissionsLoading) {
      return (
        <div style={{ height: "60vh", display: "flex", justifyContent: "center", alignItems: "center" }}>
          <Loader text="Loading campaigns..." />
        </div>
      );
    }
    return (
      <div className={`ad-campaigns-page ${theme}-theme`} style={{ padding: "2rem", textAlign: "center" }}>
        <h2>Access Denied</h2>
        <p>You do not have permission to view ad campaigns.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`ad-campaigns-page ${theme}-theme`}
      >
        <div className="ad-campaigns-error">
          <h2>
            Unable to load ad campaigns
          </h2>
          <p>Please try again later.</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`ad-campaigns-page ${theme}-theme`}
    >
      {successMessage && (
        <div className="ad-campaign-success-toast">
          <span className="ad-campaign-success-icon">
            ✓
          </span>

          <div className="ad-campaign-success-text">
            <strong>Success</strong>

            <span>{successMessage}</span>
          </div>

          <button
            type="button"
            className="ad-campaign-success-close"
            onClick={() =>
              setSuccessMessage("")
            }
          >
            ×
          </button>
        </div>
      )}

      <div className="ad-campaigns-header">
        <div className="ad-campaigns-title">
          <span className="standard-page-eyebrow">AD MANAGEMENT</span>
          <h1>Ad Campaigns</h1>

          <p className="ad-campaigns-subtitle">
            Manage active advertising campaigns and targets.
          </p>
        </div>

        <button
          type="button"
          className="create-ad-campaign-button"
          onClick={() =>
            navigate(
              "/ad-campaigns/create",
            )
          }
        >
          + Create Campaign
        </button>
      </div>

      <div className="ad-campaigns-controls">
        <div className="ad-campaign-search-wrapper">
          <span className="ad-campaign-search-icon">
            🔍
          </span>

          <input
            type="text"
            placeholder="Search campaigns..."
            value={search}
            onChange={handleSearchChange}
          />
        </div>

        <CustomSelect
          value={platformFilter}
          onChange={handlePlatformFilterChange}
          options={[
            { value: "all", label: "All Platforms" },
            ...platforms.map((platform) => ({
              value: platform.id,
              label: platform.name,
            })),
          ]}
          minWidth="140px"
        />

        <CustomSelect
          value={status}
          onChange={handleStatusChange}
          options={[
            { value: "all", label: "All Status" },
            { value: "draft", label: "Draft" },
            { value: "scheduled", label: "Scheduled" },
            { value: "active", label: "Active" },
            { value: "paused", label: "Paused" },
            { value: "completed", label: "Completed" },
            { value: "cancelled", label: "Cancelled" },
          ]}
          minWidth="125px"
        />

        <CustomSelect
          value={campaignsPerPage}
          onChange={handleCampaignsPerPageChange}
          options={getPageSizeOptions(campaigns.length).map((size) => ({
            value: size,
            label: `Show ${size}`,
          }))}
          minWidth="120px"
        />
      </div>

      <div className="ad-campaigns-table-card">
        <table className="ad-campaigns-table">
          <thead>
            <tr>
              <th>Index</th>
              <th>Campaign Name</th>
              <th>Platform</th>
              <th>Objective</th>
              <th>Start Date</th>
              <th>End Date</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            {currentCampaigns.map(
              (campaign, index) => (
                <tr key={campaign.id}>
                  <td>
                    {startIndex +
                      index +
                      1}
                  </td>

                  <td>
                    <strong>
                      {campaign.name}
                    </strong>

                    {campaign.description && (
                      <span className="ad-campaign-description">
                        {campaign.description}
                      </span>
                    )}
                  </td>

                  <td>
                    {campaign.platform_name ||
                      "--"}
                  </td>

                  <td>
                    <span className="ad-campaign-objective">
                      {campaign.objective}
                    </span>
                  </td>

                  <td>
                    {formatDate(
                      campaign.start_date,
                    )}
                  </td>

                  <td>
                    {formatDate(
                      campaign.end_date,
                    )}
                  </td>

                  <td>
                    <span
                      className={`ad-campaign-status ${campaign.status}`}
                    >
                      {campaign.status}
                    </span>
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>

        {currentCampaigns.length === 0 && (
          <div className="no-ad-campaigns">
            No ad campaigns found.
          </div>
        )}
      </div>

      {totalRecords > 0 && (
        <div className="ad-campaigns-pagination">
          <div className="ad-campaigns-pagination-controls">
            <button
              type="button"
              className="pagination-arrow"
              onClick={() =>
                setCurrentPage(1)
              }
              disabled={
                currentPage === 1
              }
            >
              «
            </button>

            <button
              type="button"
              className="pagination-arrow"
              onClick={handlePrevious}
              disabled={
                currentPage === 1
              }
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
                totalPages
              }
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
                totalPages
              }
            >
              »
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdCampaigns;