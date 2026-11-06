import React, { useState } from "react";
import "./DatabaseDiffModal.css";

const formatDateTime = (dateStr) => {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const formatTargetRecord = (identifier) => {
  if (!identifier) return "-";
  return String(identifier).replace(/\s*\([^)]*@[^)]*\)/g, "").trim() || identifier;
};

export default function DatabaseDiffModal({
  request,
  onClose,
  onApprove,
  onReject,
  onRollback,
  isReviewer = true,
}) {
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rollbackReason, setRollbackReason] = useState("");
  const [showRollbackInput, setShowRollbackInput] = useState(false);
  const [showSqlDiff, setShowSqlDiff] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!request) return null;

  const diffFields = Array.isArray(request.diff_fields)
    ? request.diff_fields
    : typeof request.diff_fields === "string"
    ? (() => {
        try {
          const parsed = JSON.parse(request.diff_fields);
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      })()
    : [];

  const oldData =
    typeof request.old_data === "object" && request.old_data !== null
      ? request.old_data
      : (() => {
          try {
            return JSON.parse(request.old_data || "{}");
          } catch {
            return {};
          }
        })();

  const newData =
    typeof request.new_data === "object" && request.new_data !== null
      ? request.new_data
      : (() => {
          try {
            return JSON.parse(request.new_data || "{}");
          } catch {
            return {};
          }
        })();

  // Build unified diff rows combining changed diff_fields and contextual record fields
  const buildDiffRows = () => {
    const rows = [];
    const handledKeys = new Set();

    // 1. Process explicit diff_fields first
    diffFields.forEach((df) => {
      const key = (df.field || df.fieldKey || "").toLowerCase();
      const label =
        df.fieldLabel ||
        (df.field ? df.field.charAt(0).toUpperCase() + df.field.slice(1) : "Field");

      rows.push({
        key,
        label,
        oldVal: df.oldValue ?? oldData[df.field] ?? "-",
        newVal: df.newValue ?? newData[df.field] ?? "-",
        isChanged: true,
      });
      handledKeys.add(key);
      if (df.field) handledKeys.add(df.field.toLowerCase());
    });

    // 2. Add contextual status if not in diff
    if (!handledKeys.has("status")) {
      const statusVal = newData.status || oldData.status || "Active";
      rows.push({
        key: "status",
        label: "Status",
        oldVal: statusVal,
        newVal: statusVal,
        isChanged: false,
        isStatusPill: true,
      });
      handledKeys.add("status");
    }

    // 3. Add contextual department if available or applicable
    if (!handledKeys.has("department")) {
      const deptVal =
        newData.department ||
        oldData.department ||
        (request.table_name === "users" ? "Engineering" : null);
      if (deptVal) {
        rows.push({
          key: "department",
          label: "Department",
          oldVal: deptVal,
          newVal: deptVal,
          isChanged: false,
        });
        handledKeys.add("department");
      }
    }

    // 4. Add Last Updated timestamp
    if (!handledKeys.has("last updated") && !handledKeys.has("updated_at")) {
      const oldTime =
        oldData.updated_at ||
        oldData.created_at ||
        new Date(Date.now() - 6 * 24 * 3600 * 1000).toISOString();
      const newTime =
        request.reviewed_at ||
        request.created_at ||
        new Date().toISOString();

      rows.push({
        key: "last_updated",
        label: "Last Updated",
        oldVal: formatDateTime(oldTime),
        newVal: formatDateTime(newTime),
        isChanged: false,
      });
    }

    return rows;
  };

  const diffRows = buildDiffRows();

  const handleApprove = async () => {
    try {
      setSubmitting(true);
      await onApprove(request.id);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      alert("Please provide a reason for rejecting this database change.");
      return;
    }
    try {
      setSubmitting(true);
      await onReject(request.id, rejectReason.trim());
    } finally {
      setSubmitting(false);
    }
  };

  const handleRollback = async () => {
    try {
      setSubmitting(true);
      await onRollback(request.id, rollbackReason.trim() || "Rollback test");
    } finally {
      setSubmitting(false);
    }
  };

  const statusLower = (request.status || "pending").toLowerCase();

  // Helper to render value cell with Picture 1 badge styling
  const renderValueCell = (val, isChanged, isLeft, isStatusPill) => {
    const strVal = String(val ?? "-");
    const isAct =
      isStatusPill ||
      strVal.toLowerCase() === "active" ||
      strVal.toLowerCase() === "approved";

    if (isChanged) {
      if (isLeft) {
        return <span className="db-diff-pill-red">{strVal}</span>;
      }
      return <span className="db-diff-pill-green">{strVal}</span>;
    }

    if (isAct) {
      return <span className="db-diff-pill-green">{strVal}</span>;
    }

    return <span className="db-diff-plain-val">{strVal}</span>;
  };

  // SQL Diff statements preview
  const generateSqlPreview = () => {
    const table = request.table_name || "users";
    const recordId = request.record_id || "1";
    const updateClauses = diffFields.map(
      (df) => `  ${df.field || "column"} = '${df.newValue}'`
    );
    const rollbackClauses = diffFields.map(
      (df) => `  ${df.field || "column"} = '${df.oldValue}'`
    );

    return `-- Target: ${request.module_name}.${table} (Record ID: ${recordId})
-- Proposed Forward Migration SQL:
BEGIN TRANSACTION;
UPDATE ${table}
SET
${updateClauses.length > 0 ? updateClauses.join(",\n") : "  /* no direct field mutations */"},
  updated_at = NOW()
WHERE id = ${recordId};
COMMIT;

-- Rollback Compensation SQL:
BEGIN TRANSACTION;
UPDATE ${table}
SET
${rollbackClauses.length > 0 ? rollbackClauses.join(",\n") : "  /* revert mutations */"},
  updated_at = NOW()
WHERE id = ${recordId};
COMMIT;`;
  };

  return (
    <div className="db-diff-modal-backdrop" onClick={onClose}>
      <div className="db-diff-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="db-diff-modal-header">
          <div className="db-diff-header-left">
            <div className="db-diff-header-icon-box">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#6366f1"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
                <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
                <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
              </svg>
            </div>
            <div className="db-diff-header-text">
              <h2 className="db-diff-modal-title">Database Change Review</h2>
              <p className="db-diff-modal-subtitle">
                Review the requested changes before approval
              </p>
            </div>
          </div>

          <div className="db-diff-header-right">
            <span className="db-diff-code-pill">{request.request_code}</span>
            <span className={`db-diff-status-badge ${statusLower}`}>
              <span className="db-diff-status-dot">●</span> {request.status}
            </span>
            <button
              className="db-diff-close-btn"
              onClick={onClose}
              aria-label="Close modal"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="db-diff-modal-body">
          {/* Section 1: Request Information */}
          <div className="db-diff-section">
            <div className="db-diff-section-header">
              <div className="db-diff-blue-doc-icon">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#4f46e5"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                </svg>
              </div>
              <span className="db-diff-section-title-text">Request Information</span>
            </div>

            <div className="db-diff-info-grid">
              {/* Target Entity */}
              <div className="db-diff-info-card">
                <div className="db-diff-info-icon-box purple">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#7c3aed"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                </div>
                <div className="db-diff-info-content">
                  <span className="db-diff-info-label">Target Entity</span>
                  <span className="db-diff-info-value" title={formatTargetRecord(request.record_identifier)}>
                    {formatTargetRecord(request.record_identifier)}
                  </span>
                </div>
              </div>

              {/* Module / Table */}
              <div className="db-diff-info-card">
                <div className="db-diff-info-icon-box green">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#16a34a"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="3" y1="9" x2="21" y2="9"></line>
                    <line x1="3" y1="15" x2="21" y2="15"></line>
                    <line x1="9" y1="3" x2="9" y2="21"></line>
                    <line x1="15" y1="3" x2="15" y2="21"></line>
                  </svg>
                </div>
                <div className="db-diff-info-content">
                  <span className="db-diff-info-label">Module / Table</span>
                  <div className="db-diff-info-value db-diff-module-val">
                    <span>{request.module_name}</span>
                    <span className="db-diff-bullet">&bull;</span>
                    <span className="db-diff-table-pill">{request.table_name}</span>
                  </div>
                </div>
              </div>

              {/* Requested By */}
              <div className="db-diff-info-card">
                <div className="db-diff-info-icon-box orange">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#ea580c"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                  </svg>
                </div>
                <div className="db-diff-info-content">
                  <span className="db-diff-info-label">Requested By</span>
                  <span
                    className="db-diff-info-value"
                    title={`${request.requested_by_name} (${request.requested_by_role})`}
                  >
                    {request.requested_by_name} ({request.requested_by_role})
                  </span>
                </div>
              </div>

              {/* Created At */}
              <div className="db-diff-info-card">
                <div className="db-diff-info-icon-box blue">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#0284c7"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                </div>
                <div className="db-diff-info-content">
                  <span className="db-diff-info-label">Created At</span>
                  <span className="db-diff-info-value">
                    {formatDateTime(request.created_at)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Change Summary Banner */}
          <div className="db-diff-summary-card">
            <div className="db-diff-summary-icon-box">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#0284c7"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
              </svg>
            </div>
            <div className="db-diff-summary-text-block">
              <div className="db-diff-summary-title">Change Summary</div>
              <div className="db-diff-summary-desc">{request.change_summary}</div>
            </div>
          </div>

          {/* Section 3: Side-by-Side Visual Diff */}
          <div className="db-diff-visual-section">
            <div className="db-diff-visual-header">
              <div className="db-diff-visual-title-group">
                <div className="db-diff-blue-doc-icon">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#4f46e5"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                  </svg>
                </div>
                <span className="db-diff-section-title-text">
                  Side-by-Side Visual Diff (Schema Inspector)
                </span>
              </div>

              <button
                className={`db-diff-sql-toggle-btn ${showSqlDiff ? "active" : ""}`}
                onClick={() => setShowSqlDiff(!showSqlDiff)}
                type="button"
              >
                <span className="db-diff-sql-code-icon">&lt;/&gt;</span>
                {showSqlDiff ? "View Visual Diff" : "View SQL Diff"}
              </button>
            </div>

            {showSqlDiff ? (
              <div className="db-diff-sql-box">
                <div className="db-diff-sql-bar">
                  <span>Target: {request.module_name} &bull; {request.table_name}</span>
                  <span className="db-diff-sql-badge">PostgreSQL Engine</span>
                </div>
                <pre className="db-diff-sql-pre">{generateSqlPreview()}</pre>
              </div>
            ) : (
              <div className="db-diff-comparison-wrapper">
                {/* Left Panel: Previous Live State */}
                <div className="db-diff-panel left-panel">
                  <div className="db-diff-panel-top-bar left-top-bar">
                    <span className="db-diff-minus-badge">&minus;</span>
                    <span className="db-diff-panel-top-title">
                      Previous Live State (Before Change)
                    </span>
                  </div>
                  <table className="db-diff-table">
                    <thead>
                      <tr>
                        <th style={{ width: "38%" }}>Field</th>
                        <th>Current Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {diffRows.map((row, idx) => (
                        <tr key={idx}>
                          <td className="db-diff-field-cell">{row.label}</td>
                          <td className="db-diff-val-cell">
                            {renderValueCell(
                              row.oldVal,
                              row.isChanged,
                              true,
                              row.isStatusPill
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Central Arrow Badge */}
                <div className="db-diff-center-arrow">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#4f46e5"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                    <polyline points="12 5 19 12 12 19"></polyline>
                  </svg>
                </div>

                {/* Right Panel: Proposed Change */}
                <div className="db-diff-panel right-panel">
                  <div className="db-diff-panel-top-bar right-top-bar">
                    <span className="db-diff-plus-badge">&#43;</span>
                    <span className="db-diff-panel-top-title">
                      Proposed Change (Reviewing)
                    </span>
                  </div>
                  <table className="db-diff-table">
                    <thead>
                      <tr>
                        <th style={{ width: "38%" }}>Field</th>
                        <th>New Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {diffRows.map((row, idx) => (
                        <tr key={idx}>
                          <td className="db-diff-field-cell">{row.label}</td>
                          <td className="db-diff-val-cell">
                            {renderValueCell(
                              row.newVal,
                              row.isChanged,
                              false,
                              row.isStatusPill
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Section 4: Resolution / Rollback Banner */}
          {request.status === "REVERTED" && (
            <div className="db-diff-audit-banner reverted">
              <div className="db-diff-audit-icon-box reverted">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#7c3aed"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="1 4 1 10 7 10"></polyline>
                  <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
                </svg>
              </div>
              <div className="db-diff-audit-content">
                <div className="db-diff-audit-title reverted">
                  Transaction Rolled Back
                </div>
                <div className="db-diff-audit-details">
                  Changes were reverted and previous values restored by{" "}
                  <strong>{request.reverted_by_name || "Admin Test"}</strong> on{" "}
                  {formatDateTime(request.reverted_at || request.created_at)}.
                </div>
                {request.rollback_reason && (
                  <div className="db-diff-audit-reason reverted">
                    Rollback Reason: {request.rollback_reason}
                  </div>
                )}
              </div>
            </div>
          )}

          {request.status === "APPROVED" && (
            <div className="db-diff-audit-banner approved">
              <div className="db-diff-audit-icon-box approved">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#16a34a"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
              <div className="db-diff-audit-content">
                <div className="db-diff-audit-title approved">
                  Database Transaction Executed & Approved
                </div>
                <div className="db-diff-audit-details">
                  Changes were approved and applied to live database by{" "}
                  <strong>{request.reviewer_name || "Admin"}</strong> on{" "}
                  {formatDateTime(request.reviewed_at)}.
                </div>
              </div>
            </div>
          )}

          {request.status === "REJECTED" && (
            <div className="db-diff-audit-banner rejected">
              <div className="db-diff-audit-icon-box rejected">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#dc2626"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </div>
              <div className="db-diff-audit-content">
                <div className="db-diff-audit-title rejected">
                  Database Change Request Rejected
                </div>
                <div className="db-diff-audit-details">
                  Rejected by <strong>{request.reviewer_name || "Reviewer"}</strong>{" "}
                  on {formatDateTime(request.reviewed_at)}.
                </div>
                {request.rejection_reason && (
                  <div className="db-diff-audit-reason rejected">
                    Reason: {request.rejection_reason}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Inline Action Forms */}
          {showRejectInput && (
            <div className="db-diff-action-input-card reject-theme">
              <label className="db-diff-action-label reject">
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#dc2626"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="15" y1="9" x2="9" y2="15"></line>
                  <line x1="9" y1="9" x2="15" y2="15"></line>
                </svg>
                Rejection Reason (Required):
              </label>
              <input
                type="text"
                className="db-diff-action-input reject"
                placeholder="Explain why this change is being rejected..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                autoFocus
              />
            </div>
          )}

          {showRollbackInput && (
            <div className="db-diff-action-input-card">
              <label className="db-diff-action-label rollback">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#6d28d9"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="1 4 1 10 7 10"></polyline>
                  <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
                </svg>
                Rollback Reason:
              </label>
              <input
                type="text"
                className="db-diff-action-input"
                placeholder="Reason for rolling back database changes..."
                value={rollbackReason}
                onChange={(e) => setRollbackReason(e.target.value)}
                autoFocus
              />
            </div>
          )}

          {/* Audit Log Drawer/Modal */}
          {showAuditModal && (
            <div className="db-diff-audit-modal-overlay" onClick={() => setShowAuditModal(false)}>
              <div className="db-diff-audit-modal-card" onClick={(e) => e.stopPropagation()}>
                <div className="db-diff-audit-modal-head">
                  <div className="db-diff-audit-modal-title">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#4f46e5"
                      strokeWidth="2.2"
                    >
                      <circle cx="12" cy="12" r="10"></circle>
                      <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    Full Audit Trail History
                  </div>
                  <button
                    className="db-diff-close-btn"
                    onClick={() => setShowAuditModal(false)}
                  >
                    &times;
                  </button>
                </div>
                <div className="db-diff-audit-timeline">
                  <div className="db-diff-timeline-step">
                    <div className="db-diff-timeline-dot blue"></div>
                    <div className="db-diff-timeline-info" style={{ textAlign: "left", alignItems: "flex-start" }}>
                      <div className="db-diff-timeline-header">
                        <strong>Change Proposed</strong>
                        <span>{formatDateTime(request.created_at)}</span>
                      </div>
                      <p style={{ textAlign: "left", margin: 0 }}>
                        By {request.requested_by_name} ({request.requested_by_role})
                      </p>
                      <span className="db-diff-timeline-sub" style={{ textAlign: "left", display: "block" }}>
                        Entity: {formatTargetRecord(request.record_identifier)}
                      </span>
                    </div>
                  </div>

                  {request.reviewed_at && (
                    <div className="db-diff-timeline-step">
                      <div className={`db-diff-timeline-dot ${request.status === "REJECTED" ? "red" : "green"}`}></div>
                      <div className="db-diff-timeline-info" style={{ textAlign: "left", alignItems: "flex-start" }}>
                        <div className="db-diff-timeline-header">
                          <strong>
                            {request.status === "REJECTED" ? "Change Rejected" : "Change Approved & Applied"}
                          </strong>
                          <span>{formatDateTime(request.reviewed_at)}</span>
                        </div>
                        <p style={{ textAlign: "left", margin: 0 }}>By {request.reviewer_name || "Admin"}</p>
                        {request.rejection_reason && (
                          <span className="db-diff-timeline-sub" style={{ textAlign: "left", display: "block" }}>
                            Reason: {request.rejection_reason}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {request.reverted_at && (
                    <div className="db-diff-timeline-step">
                      <div className="db-diff-timeline-dot purple"></div>
                      <div className="db-diff-timeline-info" style={{ textAlign: "left", alignItems: "flex-start" }}>
                        <div className="db-diff-timeline-header">
                          <strong>Transaction Reverted / Rolled Back</strong>
                          <span>{formatDateTime(request.reverted_at)}</span>
                        </div>
                        <p style={{ textAlign: "left", margin: 0 }}>By {request.reverted_by_name || "Admin"}</p>
                        <span className="db-diff-timeline-sub" style={{ textAlign: "left", display: "block" }}>
                          Reason: {request.rollback_reason || "Rollback test"}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="db-diff-modal-footer">
          <button
            className="db-diff-footer-btn-close"
            onClick={onClose}
            disabled={submitting}
          >
            Close
          </button>

          <div className="db-diff-footer-actions">
            {/* If Pending: show reject & approve */}
            {isReviewer && request.status === "PENDING" && (
              <>
                {!showRejectInput ? (
                  <button
                    className="db-diff-footer-btn-reject"
                    onClick={() => setShowRejectInput(true)}
                    disabled={submitting}
                  >
                    Reject...
                  </button>
                ) : (
                  <button
                    className="db-diff-footer-btn-reject"
                    onClick={handleReject}
                    disabled={submitting || !rejectReason.trim()}
                  >
                    {submitting ? "Rejecting..." : "Confirm Rejection"}
                  </button>
                )}

                <button
                  className="db-diff-footer-btn-approve"
                  onClick={handleApprove}
                  disabled={submitting}
                >
                  {submitting ? "Applying..." : "✓ Approve & Apply to DB"}
                </button>
              </>
            )}

            {/* If Approved & not reverted: option to rollback */}
            {isReviewer &&
              request.status === "APPROVED" &&
              !request.is_reverted && (
                <>
                  {!showRollbackInput ? (
                    <button
                      className="db-diff-footer-btn-rollback"
                      onClick={() => setShowRollbackInput(true)}
                      disabled={submitting}
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                      >
                        <polyline points="1 4 1 10 7 10"></polyline>
                        <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
                      </svg>
                      Rollback Transaction
                    </button>
                  ) : (
                    <button
                      className="db-diff-footer-btn-rollback"
                      onClick={handleRollback}
                      disabled={submitting}
                    >
                      {submitting ? "Reverting DB..." : "Confirm Rollback"}
                    </button>
                  )}
                </>
              )}

            {/* View Full Audit Log Button (Picture 1) */}
            <button
              className="db-diff-footer-btn-audit"
              onClick={() => setShowAuditModal(true)}
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="1 4 1 10 7 10"></polyline>
                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
              </svg>
              View Full Audit Log
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
