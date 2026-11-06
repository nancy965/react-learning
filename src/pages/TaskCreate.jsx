import "./TaskCreate.css";
import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { usePermission } from "../context/PermissionContext";
import Loader from "../components/Loader";
import { createTask, getTaskEmployees, getTasks } from "../services/taskService";
import { getCommonMasterByType } from "../services/commonMasterService";
import CustomSelect from "../components/CustomSelect";
import CustomDatePicker from "../components/CustomDatePicker";

function TaskCreate() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { hasPermission, loading: permissionsLoading } = usePermission();

  const canCreateTask = hasPermission("tasks.create");

  const [employees, setEmployees] = useState([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState("");

  const [availableTasks, setAvailableTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [selectedDependencies, setSelectedDependencies] = useState([]);
  const [showDepDropdown, setShowDepDropdown] = useState(false);
  const [depSearch, setDepSearch] = useState("");
  const depDropdownRef = useRef(null);
  const depInputRef = useRef(null);

  const [taskName, setTaskName] = useState("");
  const [assignedTo, setAssignedTo] = useState([]);
  const [frequency, setFrequency] = useState("one-time");
  const [taskType, setTaskType] = useState("hard");
  const [frequencyOptions, setFrequencyOptions] = useState([
    { value: "daily", label: "Daily" },
    { value: "one-time", label: "One Time" },
  ]);
  const [taskTypeOptions, setTaskTypeOptions] = useState([
    { value: "basic", label: "Basic" },
    { value: "normal", label: "Normal" },
    { value: "hard", label: "Hard" },
  ]);
  const [taskDate, setTaskDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const token = localStorage.getItem("token");

  const getLocalDateString = (dateObj = new Date()) => {
    const yyyy = dateObj.getFullYear();
    const mm = String(dateObj.getMonth() + 1).padStart(2, "0");
    const dd = String(dateObj.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const today = getLocalDateString(new Date());

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowDate = getLocalDateString(tomorrow);

  const minDueDate = (() => {
    const baseDate = taskDate && taskDate > today ? taskDate : today;
    if (frequency === "daily") {
      return baseDate;
    }
    const next = new Date(baseDate);
    next.setDate(next.getDate() + 1);
    const nextDay = getLocalDateString(next);
    return nextDay > tomorrowDate ? nextDay : tomorrowDate;
  })();

  useEffect(() => {
    if (dueDate && dueDate < minDueDate) {
      setDueDate(minDueDate);
    }
  }, [minDueDate, dueDate]);
  const dropdownRef = useRef(null);
  const employeeInputRef = useRef(null);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        setEmployeesLoading(true);
        const res = await getTaskEmployees(token);
        const empList = res.employees || res.data || [];
        setEmployees(empList);
      } catch (err) {
        console.error("LOAD EMPLOYEES ERROR:", err);
      } finally {
        setEmployeesLoading(false);
      }
    };

    if (token) {
      fetchEmployees();
    }
  }, [token]);

  useEffect(() => {
    const fetchMasterOptions = async () => {
      try {
        const [typeRes, freqRes] = await Promise.allSettled([
          getCommonMasterByType("task_type", token),
          getCommonMasterByType("task_frequency", token),
        ]);

        if (
          typeRes.status === "fulfilled" &&
          Array.isArray(typeRes.value?.data) &&
          typeRes.value.data.length > 0
        ) {
          const formattedTypes = typeRes.value.data.map((item) => ({
            value: item.name,
            label: item.name.charAt(0).toUpperCase() + item.name.slice(1),
          }));
          setTaskTypeOptions(formattedTypes);
          setTaskType((prev) => {
            const exists = formattedTypes.some(
              (opt) => opt.value.toLowerCase() === prev.toLowerCase()
            );
            return exists ? prev : formattedTypes[0].value;
          });
        }

        if (
          freqRes.status === "fulfilled" &&
          Array.isArray(freqRes.value?.data) &&
          freqRes.value.data.length > 0
        ) {
          const formattedFreqs = freqRes.value.data.map((item) => ({
            value: item.name,
            label: item.name.charAt(0).toUpperCase() + item.name.slice(1),
          }));
          setFrequencyOptions(formattedFreqs);
          setFrequency((prev) => {
            const exists = formattedFreqs.some(
              (opt) => opt.value.toLowerCase() === prev.toLowerCase()
            );
            return exists ? prev : formattedFreqs[0].value;
          });
        }
      } catch (err) {
        console.error("Failed to load master options in TaskCreate:", err);
      }
    };

    fetchMasterOptions();
  }, [token]);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setTasksLoading(true);
        const res = await getTasks(token, 1, 100);
        const list = res.tasks || res.data || [];
        setAvailableTasks(list);
      } catch (err) {
        console.error("LOAD TASKS FOR DEPENDENCIES ERROR:", err);
      } finally {
        setTasksLoading(false);
      }
    };

    if (token) {
      fetchTasks();
    }
  }, [token]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowEmployeeDropdown(false);
      }
      if (depDropdownRef.current && !depDropdownRef.current.contains(e.target)) {
        setShowDepDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectEmployee = (emp) => {
    const empId = String(emp.id);
    if (!assignedTo.includes(empId)) {
      setAssignedTo([...assignedTo, empId]);
    }
    setEmployeeSearch("");
    if (employeeInputRef.current) {
      employeeInputRef.current.focus();
    }
  };

  const isTaskCompleted = (t) => {
    if (!t) return false;
    if (t.end_time) return true;
    const status = String(t.status || t.task_status || "").trim().toLowerCase();
    return status === "completed" || status === "complete";
  };

  const handleSelectDependency = (task) => {
    if (isTaskCompleted(task)) return;
    const taskId = String(task.id);
    if (!selectedDependencies.includes(taskId)) {
      setSelectedDependencies([...selectedDependencies, taskId]);
    }
    setDepSearch("");
    if (depInputRef.current) {
      depInputRef.current.focus();
    }
  };

  const handleRemoveDependency = (taskId, e) => {
    e.stopPropagation();
    setSelectedDependencies(selectedDependencies.filter((id) => id !== String(taskId)));
  };

  const filteredTasks = availableTasks.filter((t) => {
    if (isTaskCompleted(t)) return false;
    return (t.task_name || "").toLowerCase().includes(depSearch.toLowerCase());
  });

  const handleRemoveEmployee = (empId, e) => {
    e.stopPropagation();
    setAssignedTo(assignedTo.filter((id) => id !== String(empId)));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!taskName.trim()) {
      setFormError("Task name is required");
      return;
    }

    if (assignedTo.length === 0) {
      setFormError("Please select at least one employee");
      return;
    }

    if (!taskDate || !dueDate) {
      setFormError("Task date and due date are required");
      return;
    }

    if (taskDate < today) {
      setFormError("Task date cannot be in the past");
      return;
    }

    if (dueDate < minDueDate) {
      setFormError(
        frequency === "daily"
          ? "Due date cannot be before task date"
          : "Due date must be a future date"
      );
      return;
    }

    try {
      setSaving(true);
      setFormError("");

      await createTask(
        {
          taskName: taskName.trim(),
          taskDate,
          dueDate,
          isActive,
          taskType,
          assignedTo,
          frequency,
          dependencyIds: selectedDependencies,
        },
        token
      );

      window.dispatchEvent(new Event("taskCreated"));
      navigate("/tasks");
    } catch (err) {
      console.error("CREATE TASK ERROR:", err);
      setFormError(
        err.response?.data?.message || "Failed to create task"
      );
    } finally {
      setSaving(false);
    }
  };

  if (permissionsLoading) {
    return <Loader />;
  }

  if (!canCreateTask) {
    return null;
  }

  const filteredEmployees = employees.filter((emp) =>
    (emp.name || "").toLowerCase().includes(employeeSearch.toLowerCase())
  );

  return (
    <div className={`task-create-page ${theme}-theme`}>
      <div className="task-create-header">
        <div className="task-create-title-group">
          <span className="task-create-breadcrumb task-create-tag">TASKS</span>
          <h1>Create Task</h1>
          <p className="task-create-subtitle">
            Create a new task and assign it to an employee
          </p>
        </div>
      </div>

      <div className="task-create-card">
        <form onSubmit={handleSubmit}>
          {/* Task Name */}
          <div className="task-create-field">
            <label>
              Task Name <span className="required-star">*</span>
            </label>
            <textarea
              value={taskName}
              onChange={(e) => {
                setTaskName(e.target.value);
                setFormError("");
              }}
              placeholder="Left Sidebar Navigation: Group primary links by relevance (e.g., Overview, Analytics,"
              rows={4}
              disabled={saving}
              autoFocus
            />
          </div>

          {/* 3 Columns: Assign To, Task Frequency, Task Type */}
          <div className="task-create-grid">
            {/* Assign To */}
            <div className="task-create-field">
              <label>
                Assign To <span className="required-star">*</span>
              </label>

              <div className="task-create-employee-select" ref={dropdownRef}>
                <div
                  className="task-create-selected-employees"
                  onClick={() => {
                    setShowEmployeeDropdown(true);
                    if (employeeInputRef.current) {
                      employeeInputRef.current.focus();
                    }
                  }}
                >
                  {assignedTo.map((id) => {
                    const emp = employees.find(
                      (e) => String(e.id) === String(id)
                    );
                    const name = emp ? emp.name : `Emp ${id}`;
                    return (
                      <span className="task-create-employee-tag" key={id}>
                        {name}
                        <button
                          type="button"
                          onClick={(e) => handleRemoveEmployee(id, e)}
                          title="Remove"
                        >
                          ×
                        </button>
                      </span>
                    );
                  })}

                  <input
                    ref={employeeInputRef}
                    type="text"
                    className="task-create-employee-search-input"
                    placeholder={
                      assignedTo.length === 0
                        ? "Select employees..."
                        : "Search employee..."
                    }
                    value={employeeSearch}
                    onChange={(e) => {
                      setEmployeeSearch(e.target.value);
                      if (!showEmployeeDropdown) setShowEmployeeDropdown(true);
                    }}
                    onFocus={() => setShowEmployeeDropdown(true)}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!showEmployeeDropdown) setShowEmployeeDropdown(true);
                    }}
                  />

                  <span
                    className="task-create-employee-arrow"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowEmployeeDropdown((prev) => !prev);
                    }}
                  >
                    ▾
                  </span>
                </div>

                {showEmployeeDropdown && (
                  <div className="task-create-employee-dropdown">
                    {employeesLoading ? (
                      <div className="task-create-employee-option">
                        Loading...
                      </div>
                    ) : filteredEmployees.length === 0 ? (
                      <div className="task-create-employee-option">
                        No employees found
                      </div>
                    ) : (
                      filteredEmployees.map((emp) => {
                        const isSelected = assignedTo.includes(String(emp.id));
                        return (
                          <div
                            key={emp.id}
                            className={`task-create-employee-option ${
                              isSelected ? "selected" : ""
                            }`}
                            onClick={() => handleSelectEmployee(emp)}
                          >
                            <span>{emp.name}</span>
                            {isSelected && <span>✓</span>}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Task Frequency */}
            <div className="task-create-field">
              <label>
                Task Frequency <span className="required-star">*</span>
              </label>
              <CustomSelect
                value={frequency}
                onChange={(e) => {
                  setFrequency(e.target.value);
                  setFormError("");
                }}
                disabled={saving}
                options={frequencyOptions}
              />
            </div>

            {/* Task Type */}
            <div className="task-create-field">
              <label>
                Task Type <span className="required-star">*</span>
              </label>
              <CustomSelect
                value={taskType}
                onChange={(e) => {
                  setTaskType(e.target.value);
                  setFormError("");
                }}
                disabled={saving}
                options={taskTypeOptions}
              />
            </div>
          </div>

          {/* Row 2: Task Date and Due Date */}
          <div className="task-create-grid task-create-grid-dates">
            <div className="task-create-field">
              <label>
                Task Date <span className="required-star">*</span>
              </label>
              <CustomDatePicker
                value={taskDate}
                min={today}
                onChange={(e) => {
                  setTaskDate(e.target.value);
                  setFormError("");
                }}
                disabled={saving}
              />
            </div>

            <div className="task-create-field">
              <label>
                Due Date <span className="required-star">*</span>
              </label>
              <CustomDatePicker
                value={dueDate}
                min={minDueDate}
                onChange={(e) => {
                  setDueDate(e.target.value);
                  setFormError("");
                }}
                disabled={saving}
              />
            </div>

            <div className="task-create-field-empty"></div>
          </div>

          {/* Prerequisite Tasks (Task Dependencies) */}
          <div className="task-create-field task-create-dep-field" style={{ marginTop: "18px", marginBottom: "18px" }}>
            <div className="task-create-dep-header-row">
              <label className="task-create-dep-label">
                <span>Prerequisite Tasks</span>
                <span className="task-create-dep-sub">(Optional - tasks that must finish before this can start)</span>
              </label>
              {selectedDependencies.length > 0 && (
                <span className="task-create-dep-count">
                  {selectedDependencies.length} prerequisite{selectedDependencies.length > 1 ? "s" : ""} selected
                </span>
              )}
            </div>

            <div
              className={`task-create-employee-select ${showDepDropdown ? "open" : ""}`}
              ref={depDropdownRef}
            >
              <div
                className="task-create-selected-dependencies"
                onClick={() => {
                  setShowDepDropdown(true);
                  if (depInputRef.current) {
                    depInputRef.current.focus();
                  }
                }}
              >
                {selectedDependencies.map((depId) => {
                  const t = availableTasks.find((item) => String(item.id) === String(depId));
                  return (
                    <span key={depId} className="task-create-dependency-tag">
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="dep-link-icon"
                      >
                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                      </svg>
                      <span className="dep-tag-text">{t ? t.task_name : `Task #${depId}`}</span>
                      <button
                        type="button"
                        onClick={(e) => handleRemoveDependency(depId, e)}
                        title="Remove prerequisite"
                      >
                        ×
                      </button>
                    </span>
                  );
                })}

                <input
                  ref={depInputRef}
                  type="text"
                  placeholder={
                    selectedDependencies.length === 0
                      ? "Search and select prerequisite tasks..."
                      : "Add more prerequisites..."
                  }
                  value={depSearch}
                  onChange={(e) => {
                    setDepSearch(e.target.value);
                    if (!showDepDropdown) setShowDepDropdown(true);
                  }}
                  onFocus={() => setShowDepDropdown(true)}
                  className="task-create-dependency-search-input"
                  disabled={saving}
                />

                <span
                  className="task-create-employee-arrow"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDepDropdown((prev) => !prev);
                  }}
                >
                  ▾
                </span>
              </div>

              {showDepDropdown && (
                <div
                  className="task-create-employee-dropdown"
                  onClick={(e) => e.stopPropagation()}
                >
                  {tasksLoading ? (
                    <div className="task-create-employee-option">Loading tasks...</div>
                  ) : filteredTasks.length === 0 ? (
                    <div className="task-create-employee-option">No tasks available</div>
                  ) : (
                    filteredTasks.map((t) => {
                      const isSelected = selectedDependencies.includes(String(t.id));
                      return (
                        <div
                          key={t.id}
                          className={`task-create-employee-option ${isSelected ? "selected" : ""}`}
                          onClick={() => handleSelectDependency(t)}
                          style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
                        >
                          <div>
                            <strong style={{ display: "block", fontSize: "12px" }}>{t.task_name}</strong>
                            <span style={{ fontSize: "10px", color: "#64748b" }}>
                              Status: {t.status || "Pending"} | Due: {t.due_date ? String(t.due_date).slice(0, 10) : "N/A"}
                            </span>
                          </div>
                          {isSelected && <span style={{ color: "#3b82f6", fontWeight: 700 }}>✓</span>}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Active Status Row */}
          <div className="task-create-toggle-row">
            <div className="task-create-toggle-text">
              <strong>Active Status</strong>
              <span>Set whether this task is currently active or disabled.</span>
            </div>

            <button
              type="button"
              className={`task-create-toggle ${isActive ? "active" : ""}`}
              onClick={() => setIsActive((prev) => !prev)}
              disabled={saving}
            >
              <span></span>
            </button>
          </div>

          {/* Error message */}
          {formError && <div className="task-create-error">{formError}</div>}

          {/* Actions */}
          <div className="task-create-actions">
            <button
              type="button"
              className="task-create-cancel-btn"
              onClick={() => navigate("/tasks")}
              disabled={saving}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="task-create-submit-btn"
              disabled={saving}
            >
              {saving ? "Creating..." : "Create Task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default TaskCreate;