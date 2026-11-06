import React, { useState, useEffect, useMemo, useRef } from "react";
import axios from "axios";
import "./PermissionSimulatorModal.css";
import { API_URL } from "../config/axios.util";

/**
 * Custom Searchable Dropdown Matching Pic 2
 * - In-field searchbar (type directly into the same field)
 * - Clear (×) mark right next to the arrow
 * - Exactly 4 items visible at once before scrolling
 * - Clean white scrollbar
 * - No internal searchbar in the dropdown menu
 */
function SimulatorCustomSelect({
  value,
  onChange,
  onClear,
  options = [],
  placeholder = "-- Select --",
  icon = null,
  getOptionValue = (opt) => opt.id || opt.value || opt,
  getSearchText = (opt) => opt.name || opt.label || String(opt),
  renderSelected,
  renderOption,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setIsTyping(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = useMemo(() => {
    if (!value) return null;
    return (
      options.find((opt) => String(getOptionValue(opt)) === String(value)) ||
      null
    );
  }, [options, value, getOptionValue]);

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter((opt) =>
      getSearchText(opt).toLowerCase().includes(q),
    );
  }, [options, search, getSearchText]);

  const handleSelect = (optVal, opt) => {
    onChange(optVal, opt);
    setIsOpen(false);
    setIsTyping(false);
    setSearch("");
  };

  const handleClear = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onClear) onClear();
    setSearch("");
    setIsTyping(true);
    setIsOpen(true);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 20);
  };

  const handleInputChange = (e) => {
    const text = e.target.value;
    setSearch(text);
    setIsTyping(true);
    if (!isOpen) {
      setIsOpen(true);
    }
  };

  const handleInputFocus = () => {
    if (!isOpen) {
      setIsOpen(true);
    }
  };

  const handleTriggerClick = (e) => {
    // If clicked clear or arrow button, let their handlers handle it
    if (
      e.target.closest(".sim-select-clear-btn") ||
      e.target.closest(".sim-select-arrow-btn")
    ) {
      return;
    }

    if (!isOpen) {
      setIsOpen(true);
      if (!selectedOption) {
        setIsTyping(true);
        setTimeout(() => inputRef.current?.focus(), 20);
      }
    } else if (e.target !== inputRef.current) {
      setIsOpen(false);
      setIsTyping(false);
      setSearch("");
    }
  };

  const handleBadgeClick = (e) => {
    e.stopPropagation();
    setIsTyping(true);
    setIsOpen(true);
    setSearch("");
    setTimeout(() => {
      inputRef.current?.focus();
    }, 20);
  };

  const handleArrowClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOpen) {
      setIsOpen(false);
      setIsTyping(false);
      setSearch("");
    } else {
      setIsOpen(true);
      if (!selectedOption) {
        setIsTyping(true);
        setTimeout(() => inputRef.current?.focus(), 20);
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      setIsOpen(false);
      setIsTyping(false);
      setSearch("");
      inputRef.current?.blur();
    } else if (e.key === "Enter" && isOpen && filteredOptions.length > 0) {
      e.preventDefault();
      const firstOpt = filteredOptions[0];
      handleSelect(getOptionValue(firstOpt), firstOpt);
    } else if (e.key === "ArrowDown" && !isOpen) {
      e.preventDefault();
      setIsOpen(true);
      if (!selectedOption) {
        setIsTyping(true);
        setTimeout(() => inputRef.current?.focus(), 20);
      }
    }
  };

  const showClear = Boolean(
    selectedOption || (isTyping && search.trim() !== ""),
  );

  return (
    <div
      className={`sim-custom-select-container ${isOpen ? "open" : ""}`}
      ref={containerRef}
      onKeyDown={handleKeyDown}
    >
      {/* Field Trigger: In-field search with right-side close mark & arrow */}
      <div
        className={`sim-custom-select-trigger ${
          selectedOption ? "has-value" : ""
        } ${isOpen ? "is-focused" : ""}`}
        onClick={handleTriggerClick}
      >
        {icon && <span className="sim-select-left-icon">{icon}</span>}

        <div className="sim-select-display-content">
          {selectedOption && !isTyping ? (
            <div
              className="sim-selected-badge-wrapper"
              onClick={handleBadgeClick}
              title="Click to search / change"
            >
              {renderSelected ? (
                renderSelected(selectedOption)
              ) : (
                <span className="sim-select-value-text">
                  {getSearchText(selectedOption)}
                </span>
              )}
            </div>
          ) : (
            <input
              ref={inputRef}
              type="text"
              className="sim-infield-search-input"
              placeholder={
                selectedOption ? getSearchText(selectedOption) : placeholder
              }
              value={search}
              onChange={handleInputChange}
              onFocus={handleInputFocus}
              onClick={(e) => {
                e.stopPropagation();
                if (!isOpen) setIsOpen(true);
              }}
              autoComplete="off"
            />
          )}
        </div>

        <div className="sim-select-actions-right">
          {showClear && (
            <button
              type="button"
              className="sim-select-clear-btn"
              onClick={handleClear}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              title="Clear selection"
              aria-label="Clear selection"
            >
              ×
            </button>
          )}

          <button
            type="button"
            className={`sim-select-arrow-btn ${isOpen ? "open" : ""}`}
            onClick={handleArrowClick}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            title={isOpen ? "Close dropdown" : "Open dropdown"}
            aria-label="Toggle dropdown"
          >
            ▾
          </button>
        </div>
      </div>

      {/* Opened Dropdown: Direct list without duplicate searchbox, exactly 4 items visible */}
      {isOpen && (
        <div className="sim-custom-select-menu">
          <div className="sim-select-options-list">
            {filteredOptions.length === 0 ? (
              <div className="sim-select-no-options">No matches found</div>
            ) : (
              filteredOptions.map((opt) => {
                const optVal = getOptionValue(opt);
                const isSelected = String(optVal) === String(value);

                return (
                  <div
                    key={optVal}
                    className={`sim-select-option-item ${
                      isSelected ? "selected" : ""
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelect(optVal, opt);
                    }}
                  >
                    {renderOption ? (
                      renderOption(opt, isSelected)
                    ) : (
                      <span className="sim-opt-simple-label">
                        {getSearchText(opt)}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function PermissionSimulatorModal({ isOpen, onClose }) {
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [metaError, setMetaError] = useState("");
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [modules, setModules] = useState([]);

  // Form selections - start empty
  const [targetType, setTargetType] = useState("user"); // "user" | "role"
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [selectedModuleId, setSelectedModuleId] = useState("");
  const [selectedOperation, setSelectedOperation] = useState("");

  // Simulation execution state
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState(null);
  const [simulationError, setSimulationError] = useState("");

  // Load simulator metadata once when modal opens
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const fetchMeta = async () => {
      try {
        setLoadingMeta(true);
        setMetaError("");
        setSimulationResult(null);
        setSimulationError("");

        const token = localStorage.getItem("token");

        const res = await axios.get(
          `${API_URL}/role-permissions/simulator/meta`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        if (!isMounted) return;

        const data = res.data?.data || {};
        setUsers(data.users || []);
        setRoles(data.roles || []);
        setModules(data.modules || []);

        // Leave selections empty so user selects manually
        setSelectedUserId("");
        setSelectedRoleId("");
        setSelectedModuleId("");
        setSelectedOperation("");
      } catch (err) {
        if (!isMounted) return;
        console.error("Failed to load simulator metadata:", err);
        setMetaError(
          err.response?.data?.message || "Failed to load simulator metadata",
        );
      } finally {
        if (isMounted) setLoadingMeta(false);
      }
    };

    fetchMeta();

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Selected module details
  const activeModule = useMemo(() => {
    return (
      modules.find(
        (m) => m.identifier === selectedModuleId || m.id === selectedModuleId,
      ) || null
    );
  }, [modules, selectedModuleId]);

  // Available operations for current selected module
  const availableOperations = useMemo(() => {
    if (
      activeModule &&
      Array.isArray(activeModule.operations) &&
      activeModule.operations.length > 0
    ) {
      return activeModule.operations;
    }
    return ["view", "create", "edit", "delete", "import", "export"];
  }, [activeModule]);

  // Selected target object
  const activeUser = useMemo(() => {
    return users.find((u) => u.id === selectedUserId) || null;
  }, [users, selectedUserId]);

  const activeRole = useMemo(() => {
    return roles.find((r) => r.id === selectedRoleId) || null;
  }, [roles, selectedRoleId]);

  // Execute simulation core function
  const executeSimulation = async ({ tType, uId, rId, modId, op }) => {
    try {
      setIsSimulating(true);
      setSimulationError("");
      const token = localStorage.getItem("token");

      const payload = {
        targetType: tType,
        userId: tType === "user" ? uId : null,
        roleId: tType === "role" ? rId : null,
        identifier: modId,
        operation: op,
      };

      const res = await axios.post(
        `${API_URL}/role-permissions/simulator/simulate`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      setSimulationResult(res.data?.data || null);
    } catch (err) {
      console.error("Simulation error:", err);
      setSimulationError(
        err.response?.data?.message || "Failed to execute simulation",
      );
    } finally {
      setIsSimulating(false);
    }
  };

  const handleSimulate = (customOp = null) => {
    const opToRun = customOp || selectedOperation;

    if (targetType === "user" && !selectedUserId) {
      setSimulationError("Please select a target user.");
      return;
    }
    if (targetType === "role" && !selectedRoleId) {
      setSimulationError("Please select a target role.");
      return;
    }
    if (!selectedModuleId) {
      setSimulationError("Please select a target module / resource.");
      return;
    }
    if (!opToRun) {
      setSimulationError("Please select an operation (action).");
      return;
    }

    if (customOp) {
      setSelectedOperation(customOp);
    }

    executeSimulation({
      tType: targetType,
      uId: selectedUserId,
      rId: selectedRoleId,
      modId: selectedModuleId,
      op: opToRun,
    });
  };

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="sim-modal-overlay" onClick={onClose}>
      <div
        className="sim-modal-container"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sim-modal-title"
      >
        {/* Header */}
        <div className="sim-modal-header">
          <div className="sim-header-left">
            <div className="sim-shield-icon-box">
              <svg
                width="22"
                height="24"
                viewBox="0 0 24 26"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 1L3 5V11.5C3 17.5 6.8 23.1 12 24.5C17.2 23.1 21 17.5 21 11.5V5L12 1Z"
                  stroke="#2563eb"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M12 7V17M8 11.5L12 7L16 11.5"
                  stroke="#2563eb"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className="sim-header-info">
              <div className="sim-tag-row">
                <span className="sim-badge-tag">SECURITY DIAGNOSTICS</span>
                <span className="sim-badge-mode">100% READ-ONLY</span>
              </div>
              <h2 id="sim-modal-title" className="sim-modal-title">
                Permission Simulator
              </h2>
              <p className="sim-modal-subtitle">
                Inspect access boundaries, diagnose blocked permissions, and
                trace rule decisions across roles and user overrides in
                real-time.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="sim-close-btn"
            onClick={onClose}
            aria-label="Close simulator"
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Target Mode Switcher Tabs */}
        <div className="sim-mode-tabs">
          <button
            type="button"
            className={`sim-mode-tab ${targetType === "user" ? "active" : ""}`}
            onClick={() => {
              setTargetType("user");
              setSimulationResult(null);
              setSimulationError("");
            }}
          >
            <div className="sim-tab-icon-circle">
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
            </div>
            <div className="sim-tab-labels">
              <span className="sim-tab-heading">Simulate by User</span>
              <span className="sim-tab-subtext">
                Test with a specific user (role + overrides)
              </span>
            </div>
          </button>

          <button
            type="button"
            className={`sim-mode-tab ${targetType === "role" ? "active" : ""}`}
            onClick={() => {
              setTargetType("role");
              setSimulationResult(null);
              setSimulationError("");
            }}
          >
            <div className="sim-tab-icon-circle">
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
              </svg>
            </div>
            <div className="sim-tab-labels">
              <span className="sim-tab-heading">Simulate by Role</span>
              <span className="sim-tab-subtext">
                Test base role permissions
              </span>
            </div>
          </button>
        </div>

        {/* Modal Body */}
        <div className="sim-modal-body">
          {loadingMeta ? (
            <div className="sim-loading-state">
              <div className="sim-spinner"></div>
              <p>Loading security definitions and user accounts...</p>
            </div>
          ) : metaError ? (
            <div className="sim-error-banner">
              ⚠️ <strong>Error loading metadata:</strong> {metaError}
            </div>
          ) : (
            <>
              {/* Form Controls Card */}
              <div className="sim-controls-card">
                <div className="sim-inputs-row">
                  {/* Target User / Role Selector */}
                  <div className="sim-field-col sim-col-target">
                    <label className="sim-field-label">
                      {targetType === "user" ? "Target User" : "Target Role"}{" "}
                      <span className="sim-asterisk">*</span>
                    </label>

                    {targetType === "user" ? (
                      <SimulatorCustomSelect
                        value={selectedUserId}
                        onChange={(val) => {
                          setSelectedUserId(val);
                          setSimulationError("");
                        }}
                        onClear={() => {
                          setSelectedUserId("");
                          setSimulationError("");
                        }}
                        options={users}
                        placeholder="Select User"
                        icon={
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="#64748b"
                          >
                            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                          </svg>
                        }
                        getOptionValue={(u) => u.id}
                        getSearchText={(u) =>
                          `${u.name} ${u.role_name || u.role || ""}`
                        }
                        renderSelected={(u) => (
                          <div className="sim-user-select-row">
                            <span className="sim-user-name-left">{u.name}</span>
                            <span className="sim-user-role-right">
                              [{u.role_name || u.role}]
                            </span>
                          </div>
                        )}
                        renderOption={(u) => (
                          <div className="sim-user-select-row">
                            <span className="sim-user-name-left">{u.name}</span>
                            <span className="sim-user-role-right">
                              [{u.role_name || u.role}]
                            </span>
                          </div>
                        )}
                      />
                    ) : (
                      <SimulatorCustomSelect
                        value={selectedRoleId}
                        onChange={(val) => {
                          setSelectedRoleId(val);
                          setSimulationError("");
                        }}
                        onClear={() => {
                          setSelectedRoleId("");
                          setSimulationError("");
                        }}
                        options={roles}
                        placeholder="Select Role"
                        icon={
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="#64748b"
                          >
                            <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
                          </svg>
                        }
                        getOptionValue={(r) => r.id}
                        getSearchText={(r) => r.name}
                        renderSelected={(r) => (
                          <span className="sim-simple-left-text">{r.name}</span>
                        )}
                        renderOption={(r) => (
                          <span className="sim-simple-left-text">{r.name}</span>
                        )}
                      />
                    )}
                  </div>

                  {/* Target Module / Resource Selector */}
                  <div className="sim-field-col sim-col-module">
                    <label className="sim-field-label">
                      Target Module / Resource{" "}
                      <span className="sim-asterisk">*</span>
                    </label>

                    <SimulatorCustomSelect
                      value={selectedModuleId}
                      onChange={(val) => {
                        setSelectedModuleId(val);
                        setSimulationError("");
                      }}
                      onClear={() => {
                        setSelectedModuleId("");
                        setSimulationError("");
                      }}
                      options={modules}
                      placeholder="Select Module"
                      icon={
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="#64748b"
                        >
                          <path d="M21 16.5c0 .38-.21.71-.53.88l-7.9 4.44c-.16.12-.36.18-.57.18s-.41-.06-.57-.18l-7.9-4.44A.991.991 0 0 1 3 16.5v-9c0-.38.21-.71.53-.88l7.9-4.44c.16-.12.36-.18.57-.18s.41.06.57.18l7.9 4.44c.32.17.53.5.53.88v9z" />
                        </svg>
                      }
                      getOptionValue={(m) => m.identifier || m.id}
                      getSearchText={(m) =>
                        `${m.parentName || ""} ${m.shortName || m.name}`
                      }
                      renderSelected={(m) => (
                        <div className="sim-module-select-row">
                          <span className="sim-module-name-left">
                            {m.parentName || m.shortName || m.name}
                          </span>
                          {m.parentName && (
                            <span className="sim-module-sub-right">
                              {m.shortName}
                            </span>
                          )}
                        </div>
                      )}
                      renderOption={(m) => (
                        <div className="sim-module-select-row">
                          <span className="sim-module-name-left">
                            {m.parentName || m.shortName || m.name}
                          </span>
                          {m.parentName && (
                            <span className="sim-module-sub-right">
                              {m.shortName}
                            </span>
                          )}
                        </div>
                      )}
                    />
                  </div>

                  {/* Operation (Action) Selector */}
                  <div className="sim-field-col sim-col-operation">
                    <label className="sim-field-label">
                      Operation (Action) <span className="sim-asterisk">*</span>
                    </label>

                    <SimulatorCustomSelect
                      value={selectedOperation}
                      onChange={(val) => {
                        setSelectedOperation(val);
                        setSimulationError("");
                      }}
                      onClear={() => {
                        setSelectedOperation("");
                        setSimulationError("");
                      }}
                      options={availableOperations}
                      placeholder="Select Action"
                      icon={
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="#64748b"
                        >
                          <path d="M7 2v11h3v9l7-12h-4l4-8z" />
                        </svg>
                      }
                      getOptionValue={(op) => op}
                      getSearchText={(op) => String(op).toUpperCase()}
                      renderSelected={(op) => (
                        <span className="sim-simple-left-text">
                          {String(op).toUpperCase()}
                        </span>
                      )}
                      renderOption={(op) => (
                        <span className="sim-simple-left-text">
                          {String(op).toUpperCase()}
                        </span>
                      )}
                    />
                  </div>

                  {/* Run Simulation Button */}
                  <div className="sim-field-col sim-col-btn">
                    <button
                      type="button"
                      className="sim-run-button"
                      onClick={() => handleSimulate()}
                      disabled={isSimulating}
                    >
                      {isSimulating ? (
                        <>
                          <span className="sim-btn-spinner-icon"></span>
                          Simulating...
                        </>
                      ) : (
                        <>
                          <span className="sim-run-triangle">▶</span> Run
                          Simulation
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Testing Context Bar */}
                <div className="sim-testing-context-row">
                  <span className="sim-testing-title">Testing:</span>
                  <div className="sim-test-target-pill">
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                    </svg>
                    <span>
                      {targetType === "user"
                        ? activeUser?.name || "Not Selected"
                        : activeRole?.name || "Not Selected"}
                    </span>
                  </div>
                  <span className="sim-test-arrow-char">➔</span>
                  <div className="sim-test-module-badge">
                    {activeModule?.parentName
                      ? `${activeModule.parentName} ${activeModule.shortName}`
                      : activeModule?.name ||
                        (selectedModuleId ? selectedModuleId : "Not Selected")}
                  </div>
                  <span className="sim-test-arrow-char">➔</span>
                  <div className="sim-test-op-badge">
                    <svg
                      width="11"
                      height="11"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
                    </svg>
                    <span>
                      {selectedOperation
                        ? selectedOperation.toUpperCase()
                        : "NOT SELECTED"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Simulation Error Alert */}
              {simulationError && (
                <div className="sim-error-banner">⚠️ {simulationError}</div>
              )}

              {/* Main Display: Empty State OR Live Simulation Results */}
              {!simulationResult ? (
                <div className="sim-empty-state-card">
                  <div className="sim-empty-shield-icon-wrapper">
                    <svg width="44" height="44" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M12 2L4 6V11.5C4 16.5 7.4 21.1 12 22.5C16.6 21.1 20 16.5 20 11.5V6L12 2Z"
                        stroke="#2563eb"
                        strokeWidth="1.75"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="#eff6ff"
                      />
                      <path
                        d="M12 8V13M12 16H12.01"
                        stroke="#2563eb"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                  <h3 className="sim-empty-title">Ready to Simulate Access</h3>
                  <p className="sim-empty-subtitle">
                    Select a target {targetType === "user" ? "user" : "role"},
                    module, and operation from the dropdowns above, then click{" "}
                    <strong>"Run Simulation"</strong> to evaluate permissions in
                    real-time.
                  </p>

                  <div className="sim-empty-features-grid">
                    <div className="sim-empty-feat-box">
                      <span className="sim-feat-emoji">🛡️</span>
                      <span className="sim-feat-title">Role Permissions</span>
                      <span className="sim-feat-desc">
                        Evaluates standard permissions granted to the role in
                        role_identifier_access
                      </span>
                    </div>

                    <div className="sim-empty-feat-box">
                      <span className="sim-feat-emoji">👤</span>
                      <span className="sim-feat-title">User Overrides</span>
                      <span className="sim-feat-desc">
                        Checks custom user overrides configured in
                        user_identifier_access
                      </span>
                    </div>

                    <div className="sim-empty-feat-box">
                      <span className="sim-feat-emoji">🔍</span>
                      <span className="sim-feat-title">Diagnostic Trace</span>
                      <span className="sim-feat-desc">
                        Provides step-by-step audit trace with actionable fix
                        recommendations
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="sim-results-wrapper">
                  {/* Middle Feedback Row: 2 Columns Side-by-Side */}
                  <div className="sim-feedback-two-columns">
                    {/* Left: Verdict Banner */}
                    <div
                      className={`sim-verdict-box ${
                        simulationResult.result?.isAllowed
                          ? "allowed"
                          : "blocked"
                      }`}
                    >
                      <div className="sim-verdict-circle-icon">
                        {simulationResult.result?.isAllowed ? (
                          <svg
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                          >
                            <circle cx="12" cy="12" r="10" fill="#16a34a" />
                            <path
                              d="M8 12.5L10.5 15L16 9.5"
                              stroke="#ffffff"
                              strokeWidth="2.2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        ) : (
                          <svg
                            width="28"
                            height="28"
                            viewBox="0 0 24 24"
                            fill="none"
                          >
                            <circle
                              cx="12"
                              cy="12"
                              r="10"
                              fill="#fee2e2"
                              stroke="#ef4444"
                              strokeWidth="2"
                            />
                            <path
                              d="M4.93 4.93L19.07 19.07"
                              stroke="#ef4444"
                              strokeWidth="2.2"
                              strokeLinecap="round"
                            />
                          </svg>
                        )}
                      </div>

                      <div className="sim-verdict-body">
                        <div className="sim-verdict-pill-row">
                          <span className="sim-status-label-pill">
                            {simulationResult.result?.isAllowed
                              ? "ACCESS GRANTED"
                              : "ACCESS BLOCKED"}
                          </span>
                          <span className="sim-source-info-pill">
                            Source:{" "}
                            {simulationResult.result?.source?.toUpperCase()}
                          </span>
                        </div>

                        <h3 className="sim-verdict-main-text">
                          {simulationResult.result?.isAllowed
                            ? `Permission ALLOWED for ${simulationResult.primaryOperation.toUpperCase()}`
                            : `Permission DENIED for ${simulationResult.primaryOperation.toUpperCase()}`}
                        </h3>

                        <p className="sim-verdict-detail-text">
                          {simulationResult.result?.reason}
                        </p>
                      </div>
                    </div>

                    {/* Right: Remediation & Recommendation */}
                    <div className="sim-remediation-box">
                      <div className="sim-rem-icon-circle">💡</div>
                      <div className="sim-rem-body">
                        <h4 className="sim-rem-title">
                          REMEDIATION & RECOMMENDATION
                        </h4>
                        <p className="sim-rem-description">
                          {simulationResult.result?.recommendation}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Split Row: 2 Columns Side-by-Side */}
                  <div className="sim-bottom-two-columns">
                    {/* Left: Module Access Matrix */}
                    <div className="sim-matrix-card">
                      <div className="sim-card-header-bar">
                        <div className="sim-matrix-title-group">
                          <span className="sim-stack-icon">🥞</span>
                          <h4 className="sim-matrix-heading">
                            Module Access Matrix:{" "}
                            <span className="sim-active-module-text">
                              {simulationResult.module?.name}
                            </span>
                          </h4>
                        </div>

                        <div className="sim-legend-container">
                          <span className="sim-legend-badge">
                            <span className="sim-legend-bullet bullet-allowed"></span>{" "}
                            Allowed
                          </span>
                          <span className="sim-legend-badge">
                            <span className="sim-legend-bullet bullet-denied"></span>{" "}
                            Denied
                          </span>
                          <span className="sim-legend-badge">
                            <span className="sim-legend-bullet bullet-conditional"></span>{" "}
                            Conditional
                          </span>
                        </div>
                      </div>

                      <div className="sim-matrix-grid-layout">
                        {Object.entries(
                          simulationResult.operationsMatrix || {},
                        ).map(([op, data]) => {
                          const isSelected = selectedOperation === op;
                          return (
                            <button
                              key={op}
                              type="button"
                              className={`sim-matrix-action-cell ${
                                data.isAllowed ? "cell-allowed" : "cell-denied"
                              } ${isSelected ? "cell-selected" : ""}`}
                              onClick={() => handleSimulate(op)}
                              title={`Click to simulate ${op}`}
                            >
                              <div className="sim-cell-top-row">
                                <span className="sim-cell-op-name">
                                  {op.toUpperCase()}
                                </span>
                                <span
                                  className={`sim-cell-status-badge ${
                                    data.isAllowed
                                      ? "badge-allowed"
                                      : "badge-denied"
                                  }`}
                                >
                                  {data.isAllowed ? "✓ ALLOW" : "✕ DENY"}
                                </span>
                              </div>
                              <span className="sim-cell-via-text">
                                via: {data.source}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Right: Diagnostic Evaluation Pipeline */}
                    <div className="sim-pipeline-card">
                      <div className="sim-card-header-bar">
                        <div className="sim-pipeline-title-group">
                          <span className="sim-pipeline-icon">📊</span>
                          <h4 className="sim-pipeline-heading">
                            Diagnostic Evaluation Pipeline (Execution Steps)
                          </h4>
                        </div>
                      </div>

                      <div className="sim-steps-timeline">
                        {simulationResult.result?.trace?.map((step) => {
                          const isSuccess =
                            step.status === "GRANTED" ||
                            step.status === "OVERRIDE_ALLOW" ||
                            step.status === "ROLE_GRANTED" ||
                            step.status === "SUPPORTED" ||
                            step.status === "PASSED" ||
                            step.status === "ALLOWED";

                          const isDanger =
                            step.status === "OVERRIDE_DENY" ||
                            step.status === "ROLE_DENIED" ||
                            step.status === "NOT_SUPPORTED" ||
                            step.status === "DENIED";

                          const statusTheme = isDanger
                            ? "step-danger"
                            : isSuccess
                              ? "step-success"
                              : "step-neutral";

                          return (
                            <div
                              key={step.step}
                              className={`sim-step-item-card ${statusTheme}`}
                            >
                              <div className="sim-step-indicators-col">
                                <span
                                  className={`sim-step-circle ${
                                    isDanger
                                      ? "circle-danger"
                                      : "circle-success"
                                  }`}
                                >
                                  {isDanger ? "✕" : "✓"}
                                </span>
                                <span className="sim-step-order-number">
                                  {step.step}
                                </span>
                              </div>

                              <div className="sim-step-info-col">
                                <div className="sim-step-title-row">
                                  <span className="sim-step-name-text">
                                    {step.name}
                                  </span>
                                  <span
                                    className={`sim-step-pill-badge ${statusTheme}`}
                                  >
                                    {step.status}
                                  </span>
                                </div>
                                <p className="sim-step-description-text">
                                  {step.detail}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="sim-modal-footer">
          <div className="sim-footer-note">
            <span className="sim-info-blue-icon">ℹ</span>
            <span>
              100% Non-destructive test engine. Queries live database rules
              directly.
            </span>
          </div>
          <button
            type="button"
            className="sim-footer-close-btn"
            onClick={onClose}
          >
            Close Simulator
          </button>
        </div>
      </div>
    </div>
  );
}
