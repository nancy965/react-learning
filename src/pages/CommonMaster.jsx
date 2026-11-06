import { useEffect, useState, useMemo } from "react";
import { useTheme } from "../context/ThemeContext";
import {
  getAllCommonMaster,
  createCommonMaster,
  updateCommonMaster,
  deleteCommonMaster,
  toggleCommonMasterStatus,
} from "../services/commonMasterService";
import { MASTER_TYPES, getMasterTypeConfig } from "../constants/masterTypes";
import CustomSelect from "../components/CustomSelect";
import Loader from "../components/Loader";
import ConfirmDialog from "../components/ConfirmDialog";
import "./CommonMaster.css";

function CommonMaster() {
  const { theme } = useTheme();

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addType, setAddType] = useState(MASTER_TYPES[0]?.key || "task_type");
  const [addName, setAddName] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");

  // Edit Modal States
  const [editingRecord, setEditingRecord] = useState(null);
  const [editName, setEditName] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");

  // Delete Modal States
  const [deletingRecord, setDeletingRecord] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [confirmDeactivateRecord, setConfirmDeactivateRecord] = useState(null);

  const loadRecords = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await getAllCommonMaster();
      if (response?.data) {
        setRecords(response.data);
      }
    } catch (err) {
      console.error("Failed to load common master records:", err);
      setError(
        err.response?.data?.message ||
          "Failed to load common master records. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecords();
  }, []);

  // Show temporary toast message
  const triggerSuccess = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => {
      setSuccessMessage("");
    }, 4000);
  };

  // Group records by type
  const groupedRecords = useMemo(() => {
    const map = {};
    MASTER_TYPES.forEach((t) => {
      map[t.key] = [];
    });

    records.forEach((rec) => {
      const typeKey = (rec.type || "").toLowerCase();
      if (!map[typeKey]) {
        map[typeKey] = [];
      }
      map[typeKey].push(rec);
    });

    return map;
  }, [records]);

  // Open Add modal (optionally pre-selected to a specific type)
  const handleOpenAddModal = (presetType = null) => {
    setAddType(presetType || MASTER_TYPES[0]?.key || "task_type");
    setAddName("");
    setAddError("");
    setIsAddModalOpen(true);
  };

  const handleCloseAddModal = () => {
    if (addLoading) return;
    setIsAddModalOpen(false);
    setAddName("");
    setAddError("");
  };

  // Submit Add
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!addType) {
      setAddError("Please select a type section");
      return;
    }
    const cleanName = addName.trim();
    if (!cleanName) {
      setAddError("Please enter a name");
      return;
    }

    try {
      setAddLoading(true);
      setAddError("");
      const res = await createCommonMaster({
        type: addType,
        name: cleanName,
      });

      if (res.success) {
        triggerSuccess(`"${cleanName}" added successfully to ${getMasterTypeConfig(addType).label}`);
        handleCloseAddModal();
        await loadRecords();
      } else {
        setAddError(res.message || "Failed to add record");
      }
    } catch (err) {
      console.error("Add master error:", err);
      setAddError(
        err.response?.data?.message ||
          "Failed to add record. Please check if this name already exists."
      );
    } finally {
      setAddLoading(false);
    }
  };

  // Open Edit modal
  const handleOpenEditModal = (record) => {
    setEditingRecord(record);
    setEditName(record.name);
    setEditError("");
  };

  const handleCloseEditModal = () => {
    if (editLoading) return;
    setEditingRecord(null);
    setEditName("");
    setEditError("");
  };

  // Submit Edit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    const cleanName = editName.trim();
    if (!cleanName) {
      setEditError("Name cannot be empty");
      return;
    }

    try {
      setEditLoading(true);
      setEditError("");
      const res = await updateCommonMaster(editingRecord.id, {
        name: cleanName,
      });

      if (res.success) {
        triggerSuccess(`Updated to "${cleanName}". All existing references were synchronized.`);
        handleCloseEditModal();
        await loadRecords();
      } else {
        setEditError(res.message || "Failed to update record");
      }
    } catch (err) {
      console.error("Edit master error:", err);
      setEditError(
        err.response?.data?.message ||
          "Failed to update record. Name might already be in use."
      );
    } finally {
      setEditLoading(false);
    }
  };

  // Open Delete modal
  const handleOpenDeleteModal = (record) => {
    setDeletingRecord(record);
    setDeleteError("");
  };

  const handleCloseDeleteModal = () => {
    if (deleteLoading) return;
    setDeletingRecord(null);
    setDeleteError("");
  };

  // Submit Delete
  const handleDeleteSubmit = async () => {
    if (!deletingRecord) return;

    try {
      setDeleteLoading(true);
      setDeleteError("");
      const res = await deleteCommonMaster(deletingRecord.id);

      if (res.success) {
        triggerSuccess(`"${deletingRecord.name}" deleted successfully.`);
        handleCloseDeleteModal();
        await loadRecords();
      } else {
        setDeleteError(res.message || "Failed to delete record");
      }
    } catch (err) {
      console.error("Delete master error:", err);
      setDeleteError(
        err.response?.data?.message ||
          "Failed to delete record. It may be currently in use by existing tasks."
      );
    } finally {
      setDeleteLoading(false);
    }
  };

  // Toggle Status
  const handleToggleStatus = async (record) => {
    if (record.is_active) {
      setConfirmDeactivateRecord(record);
      return;
    }
    await executeToggleStatus(record);
  };

  const executeToggleStatus = async (record) => {
    try {
      const res = await toggleCommonMasterStatus(record.id);
      if (res.success) {
        triggerSuccess(
          `"${record.name}" ${res.data?.is_active ? "activated" : "deactivated"} successfully.`
        );
        await loadRecords();
      }
    } catch (err) {
      console.error("Toggle status error:", err);
      setError(err.response?.data?.message || "Failed to update status");
    }
  };

  return (
    <div className={`common-master-page ${theme === "dark" ? "dark-theme" : "light-theme"}`}>
      {/* Top Header */}
      <div className="common-master-header">
        <div className="common-master-header-left">
          <span className="common-master-tag">ADMIN CONFIGURATION</span>
          <h1>Common Master</h1>
          <p className="common-master-subtitle">
            Centralized management for dropdown choices and categories across the entire system.
          </p>
        </div>

        <button
          type="button"
          className="common-master-add-btn"
          onClick={() => handleOpenAddModal()}
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
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Master Value
        </button>
      </div>

      {/* Toast / Global Alerts */}
      {successMessage && (
        <div className="common-master-alert alert-success">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>{successMessage}</span>
          <button type="button" onClick={() => setSuccessMessage("")} className="alert-close">×</button>
        </div>
      )}

      {error && (
        <div className="common-master-alert alert-error">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{error}</span>
          <button type="button" onClick={() => setError("")} className="alert-close">×</button>
        </div>
      )}

      {loading ? (
        <div className="common-master-loading">
          <Loader />
        </div>
      ) : (
        <div className="common-master-tables-grid">
          {MASTER_TYPES.map((typeObj) => {
            const typeKey = typeObj.key;
            const items = groupedRecords[typeKey] || [];

            return (
              <div key={typeKey} className="common-master-table-card">
                {/* Table Header */}
                <div className="table-card-header">
                  <div className="table-card-title-group">
                    <div
                      className="type-indicator-pill"
                      style={{ backgroundColor: typeObj.badgeColor || "#3b82f6" }}
                    />
                    <div>
                      <h2>{typeObj.label}</h2>
                      <span className="type-count-badge">
                        {items.length} {items.length === 1 ? "value" : "values"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Table */}
                <div className="common-master-table-wrapper">
                  <table className="common-master-table">
                    <thead>
                      <tr>
                        <th style={{ width: "50px" }}>#</th>
                        <th>NAME</th>
                        <th style={{ width: "110px" }}>STATUS</th>
                        <th style={{ width: "120px" }}>ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.length === 0 ? (
                        <tr>
                          <td colSpan="4" className="empty-table-cell">
                            No {typeObj.label} values defined yet.
                          </td>
                        </tr>
                      ) : (
                        items.map((item, idx) => (
                          <tr key={item.id} className={!item.is_active ? "row-inactive" : ""}>
                            <td className="index-cell">{idx + 1}</td>
                            <td className="name-cell">
                              <span className="value-name-text">
                                {item.name}
                              </span>
                            </td>
                            <td>
                              <button
                                type="button"
                                className={`status-pill ${item.is_active ? "status-active" : "status-inactive"}`}
                                onClick={() => handleToggleStatus(item)}
                                title="Click to toggle status"
                              >
                                <span className="status-dot" />
                                {item.is_active ? "Active" : "Inactive"}
                              </button>
                            </td>
                            <td className="actions-cell">
                              <button
                                type="button"
                                className="action-btn edit-action-btn"
                                onClick={() => handleOpenEditModal(item)}
                                title="Edit & rename"
                              >
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                </svg>
                              </button>

                              <button
                                type="button"
                                className="action-btn delete-action-btn"
                                onClick={() => handleOpenDeleteModal(item)}
                                title="Delete value"
                              >
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <polyline points="3 6 5 6 21 6" />
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                </svg>
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ADD MODAL */}
      {isAddModalOpen && (
        <div className="cm-modal-overlay" onClick={(e) => e.target === e.currentTarget && handleCloseAddModal()}>
          <div className="cm-modal-box" role="dialog" aria-modal="true">
            <div className="cm-modal-header">
              <div className="cm-modal-header-text">
                <h3>Add New Master Value</h3>
                <p>Add a new choice that will immediately appear in forms across the app.</p>
              </div>
              <button type="button" className="cm-modal-close" onClick={handleCloseAddModal} disabled={addLoading}>
                ×
              </button>
            </div>

            <form onSubmit={handleAddSubmit}>
              <div className="cm-modal-body">
                {addError && (
                  <div className="cm-modal-error">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <span>{addError}</span>
                  </div>
                )}

                {/* Type Section */}
                <div className="cm-form-group">
                  <label htmlFor="master-type-select">
                    Type Section <span className="req-star">*</span>
                  </label>
                  <CustomSelect
                    value={addType}
                    onChange={(e) => {
                      setAddType(e.target.value);
                      setAddError("");
                    }}
                    options={MASTER_TYPES.map((t) => ({
                      value: t.key,
                      label: t.label,
                    }))}
                    placeholder="Select Type Section"
                    isClearable={true}
                    disabled={addLoading}
                  />
                  <span className="cm-field-hint">
                    Select which dropdown category this new value belongs to.
                  </span>
                </div>

                {/* Name Field */}
                <div className="cm-form-group">
                  <label htmlFor="master-name-input">
                    Name <span className="req-star">*</span>
                  </label>
                  <input
                    id="master-name-input"
                    type="text"
                    className="cm-text-input"
                    placeholder="e.g. easy, urgent, bi-weekly"
                    value={addName}
                    onChange={(e) => {
                      setAddName(e.target.value);
                      setAddError("");
                    }}
                    disabled={addLoading}
                    autoFocus
                  />
                  <span className="cm-field-hint">
                    This exact name will be saved and shown as an option in the UI.
                  </span>
                </div>
              </div>

              <div className="cm-modal-footer">
                <button
                  type="button"
                  className="cm-btn cm-btn-secondary"
                  onClick={handleCloseAddModal}
                  disabled={addLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="cm-btn cm-btn-primary"
                  disabled={addLoading || !addName.trim()}
                >
                  {addLoading ? "Adding..." : "Add Value"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingRecord && (
        <div className="cm-modal-overlay" onClick={(e) => e.target === e.currentTarget && handleCloseEditModal()}>
          <div className="cm-modal-box" role="dialog" aria-modal="true">
            <div className="cm-modal-header">
              <div className="cm-modal-header-text">
                <h3>Edit Master Value</h3>
                <p>Renaming will automatically update all existing records across the database.</p>
              </div>
              <button type="button" className="cm-modal-close" onClick={handleCloseEditModal} disabled={editLoading}>
                ×
              </button>
            </div>

            <form onSubmit={handleEditSubmit}>
              <div className="cm-modal-body">
                {editError && (
                  <div className="cm-modal-error">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <span>{editError}</span>
                  </div>
                )}

                <div className="cm-form-group">
                  <label>Type Section</label>
                  <div className="cm-readonly-badge">
                    {getMasterTypeConfig(editingRecord.type).label}
                  </div>
                </div>

                <div className="cm-form-group">
                  <label htmlFor="edit-name-input">
                    Name <span className="req-star">*</span>
                  </label>
                  <input
                    id="edit-name-input"
                    type="text"
                    className="cm-text-input"
                    value={editName}
                    onChange={(e) => {
                      setEditName(e.target.value);
                      setEditError("");
                    }}
                    disabled={editLoading}
                    autoFocus
                  />
                  <div className="cm-sync-notice">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
                      <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                    </svg>
                    <span>
                      Renaming <strong>"{editingRecord.name}"</strong> to <strong>"{editName || "..."}"</strong> will synchronize all existing tasks in the database.
                    </span>
                  </div>
                </div>
              </div>

              <div className="cm-modal-footer">
                <button
                  type="button"
                  className="cm-btn cm-btn-secondary"
                  onClick={handleCloseEditModal}
                  disabled={editLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="cm-btn cm-btn-primary"
                  disabled={editLoading || !editName.trim()}
                >
                  {editLoading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingRecord && (
        <div className="cm-modal-overlay" onClick={(e) => e.target === e.currentTarget && handleCloseDeleteModal()}>
          <div className="cm-modal-box cm-modal-danger" role="dialog" aria-modal="true">
            <div className="cm-modal-header">
              <div className="cm-modal-header-text">
                <h3 style={{ color: "#dc2626" }}>Confirm Deletion</h3>
                <p>Are you sure you want to delete this master value?</p>
              </div>
              <button type="button" className="cm-modal-close" onClick={handleCloseDeleteModal} disabled={deleteLoading}>
                ×
              </button>
            </div>

            <div className="cm-modal-body">
              {deleteError ? (
                <div className="cm-modal-error">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>{deleteError}</span>
                </div>
              ) : (
                <div className="cm-delete-prompt">
                  <p>
                    You are deleting <strong>"{deletingRecord.name}"</strong> from{" "}
                    <strong>{getMasterTypeConfig(deletingRecord.type).label}</strong>.
                  </p>
                  <p className="cm-delete-warning">
                    If any existing tasks or records rely on this value, deletion will be blocked to protect data integrity.
                  </p>
                </div>
              )}
            </div>

            <div className="cm-modal-footer">
              <button
                type="button"
                className="cm-btn cm-btn-secondary"
                onClick={handleCloseDeleteModal}
                disabled={deleteLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="cm-btn cm-btn-danger"
                onClick={handleDeleteSubmit}
                disabled={deleteLoading}
              >
                {deleteLoading ? "Deleting..." : "Delete Value"}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDeactivateRecord && (
        <ConfirmDialog
          title="Confirm Action"
          message={`Are you sure you want to deactivate "${confirmDeactivateRecord.name}"?`}
          confirmText="Yes, Deactivate"
          cancelText="Cancel"
          onConfirm={async () => {
            const rec = confirmDeactivateRecord;
            setConfirmDeactivateRecord(null);
            await executeToggleStatus(rec);
          }}
          onCancel={() => setConfirmDeactivateRecord(null)}
        />
      )}
    </div>
  );
}

export default CommonMaster;
