import "./TaskEdit.css";

import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { usePermission } from "../context/PermissionContext";
import {
  getTaskById,
  getTaskEmployees,
  updateTask,
  getTasks,
  getTaskDependencies,
} from "../services/taskService";
import { getCommonMasterByType } from "../services/commonMasterService";
import CustomSelect from "../components/CustomSelect";
import CustomDatePicker from "../components/CustomDatePicker";

function TaskEdit() {
  const { id } = useParams();
  const navigate = useNavigate();

  const {
    hasPermission,
    permissions,
    loading: permissionsLoading,
  } = usePermission();

  const [employees, setEmployees] = useState([]);
  const [formData, setFormData] = useState({
    assignedTo: [],
    taskName: "",
    taskDate: "",
    dueDate: "",
    isActive: true,
    taskType: "normal",
    frequency: "daily",
  });

  const [frequencyOptions, setFrequencyOptions] = useState([
    { value: "daily", label: "Daily" },
    { value: "one-time", label: "One Time" },
  ]);
  const [taskTypeOptions, setTaskTypeOptions] = useState([
    { value: "basic", label: "Basic" },
    { value: "normal", label: "Normal" },
    { value: "hard", label: "Hard" },
  ]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);

  const [availableTasks, setAvailableTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [selectedDependencies, setSelectedDependencies] = useState([]);
  const [showDepDropdown, setShowDepDropdown] = useState(false);
  const [depSearch, setDepSearch] = useState("");
  const depDropdownRef = useRef(null);
  const depInputRef = useRef(null);

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
    const baseDate =
      formData.taskDate && formData.taskDate > today ? formData.taskDate : today;
    if (formData.frequency === "daily") {
      return baseDate;
    }
    const next = new Date(baseDate);
    next.setDate(next.getDate() + 1);
    const nextDay = getLocalDateString(next);
    return nextDay > tomorrowDate ? nextDay : tomorrowDate;
  })();

  const formatDateForInput = (date) => {
    if (!date) return "";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "";
    }

    const year = parsedDate.getFullYear();
    const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
    const day = String(parsedDate.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    const loadTask = async () => {
      if (permissionsLoading) return;

      if (!hasPermission("tasks.edit")) {
        setError("You do not have permission to edit tasks");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const [response, depRes, allTasksRes] = await Promise.all([
          getTaskById(id, token),
          getTaskDependencies(id, token).catch(() => ({ data: { predecessors: [] } })),
          getTasks(token, 1, 100).catch(() => ({ tasks: [] })),
        ]);

        const task = response.data || response.task;

        if (!task) {
          setError("Task not found");
          return;
        }

        if (task.end_time) {
          setError("Completed tasks cannot be edited");
          return;
        }

        const initialDeps = (depRes?.data?.predecessors || []).map((p) => String(p.id));
        setSelectedDependencies(initialDeps);

        const otherTasks = (allTasksRes?.tasks || allTasksRes?.data || []).filter(
          (t) => String(t.id) !== String(id)
        );
        setAvailableTasks(otherTasks);

        const assignedEmployeeId =
          task.assigned_to_id ||
          task.assigned_to ||
          task.employee_id;

        setFormData({
          assignedTo: assignedEmployeeId
            ? [String(assignedEmployeeId)]
            : [],
          taskName: task.task_name || "",
          taskDate: formatDateForInput(task.task_date),
          dueDate: formatDateForInput(task.due_date),
          isActive: Boolean(task.is_active),
          taskType: task.task_type || "normal",
          frequency: task.frequency || "daily",
        });
      } catch (error) {
        console.error("GET TASK ERROR:", error);

        setError(
          error.response?.data?.message || "Failed to load task"
        );
      } finally {
        setLoading(false);
      }
    };

    loadTask();
  }, [id, permissionsLoading]);

  useEffect(() => {
    const loadEmployees = async () => {
      if (
        permissionsLoading ||
        !permissions.includes("tasks.view_employees")
      ) {
        return;
      }

      try {
        const response = await getTaskEmployees(token);

        setEmployees(response.employees || []);
      } catch (error) {
        console.error("GET EMPLOYEES ERROR:", error);

        setEmployees([]);
      }
    };

    loadEmployees();
  }, [permissionsLoading, permissions]);

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
        }
      } catch (err) {
        console.error("Failed to load master options in TaskEdit:", err);
      }
    };

    fetchMasterOptions();
  }, [token]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest(".task-edit-employee-select")) {
        setShowEmployeeDropdown(false);
      }
      if (depDropdownRef.current && !depDropdownRef.current.contains(event.target)) {
        setShowDepDropdown(false);
      }
    };

    document.addEventListener("click", handleClickOutside);

    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

  const isTaskCompleted = (t) => {
    if (!t) return false;
    if (t.end_time) return true;
    const status = String(t.status || t.task_status || "").trim().toLowerCase();
    return status === "completed" || status === "complete";
  };

  const handleSelectDependency = (t) => {
    if (isTaskCompleted(t)) return;
    const taskId = String(t.id);
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
    setSelectedDependencies(selectedDependencies.filter((dId) => dId !== String(taskId)));
  };

  const filteredTasks = availableTasks.filter((t) => {
    if (String(t.id) === String(id)) return false;
    if (isTaskCompleted(t)) return false;
    return (t.task_name || "").toLowerCase().includes(depSearch.toLowerCase());
  });

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleToggle = () => {
    setFormData((prev) => ({
      ...prev,
      isActive: !prev.isActive,
    }));
  };

  const handleRemoveEmployee = (employeeId, e) => {
    e.stopPropagation();

    setFormData((prev) => ({
      ...prev,
      assignedTo: prev.assignedTo.filter(
        (id) => String(id) !== String(employeeId)
      ),
    }));
  };

  const getEmployeeName = (employeeId) => {
    const employee = employees.find(
      (item) => String(item.id) === String(employeeId)
    );

    return employee?.name || "Employee";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!hasPermission("tasks.edit")) {
      return;
    }

    if (!formData.taskName.trim()) {
      setError("Task name is required");
      return;
    }

    if (!formData.assignedTo.length) {
      setError("Please select at least one employee");
      return;
    }

    if (!formData.taskDate || !formData.dueDate) {
      setError("Task date and due date are required");
      return;
    }

    if (formData.frequency === "daily") {
      if (formData.dueDate < formData.taskDate) {
        setError("Due date cannot be before task date");
        return;
      }
    } else {
      if (formData.dueDate <= formData.taskDate) {
        setError("Due date must be after task date");
        return;
      }
    }

    setSaving(true);
    setError("");

    try {
      const existingEmployeeId = String(formData.assignedTo[0]);

      const updateData = {
        taskName: formData.taskName.trim(),
        taskDate: formData.taskDate,
        dueDate: formData.dueDate,
        isActive: formData.isActive,
        taskType: formData.taskType,
        assignedTo: existingEmployeeId,
        dependencyIds: selectedDependencies,
      };

      await updateTask(id, updateData, token);

      window.dispatchEvent(new Event("taskUpdated"));

      navigate("/tasks");
    } catch (error) {
      console.error("UPDATE TASK ERROR:", error);

      setError(
        error.response?.data?.message || "Failed to update task"
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading || permissionsLoading) {
    return (
      <div className="task-edit-page">
        <p className="task-edit-loading">Loading task...</p>
      </div>
    );
  }

  return (
    <div className="task-edit-page">
      <div className="task-edit-header">
        <div>
          <span className="task-breadcrumb-tag">TASK MANAGEMENT</span>
          <h1>Edit Task</h1>
          <p className="task-edit-subtitle">
            Update task details and assignment
          </p>
        </div>
      </div>

      {error && <p className="task-edit-error">{error}</p>}

      {!error && (
        <div className="task-edit-card">
          <form onSubmit={handleSubmit}>
            <div className="task-edit-field">
              <label>
                Task Name <span>*</span>
              </label>

              <textarea
                name="taskName"
                value={formData.taskName}
                onChange={handleChange}
                placeholder="Enter task details"
                required
              />
            </div>

            <div className="task-edit-grid">
              <div className="task-edit-field">
                <label>
                  Assign To <span>*</span>
                </label>

                <div className="task-edit-employee-select">
                  <div
                    className="task-edit-selected-employees"
                    onClick={() =>
                      setShowEmployeeDropdown((prev) => !prev)
                    }
                  >
                    {formData.assignedTo.length === 0 ? (
                      <span className="task-edit-employee-placeholder">
                        Select employee
                      </span>
                    ) : (
                      formData.assignedTo.map((employeeId) => (
                        <span
                          className="task-edit-employee-tag"
                          key={employeeId}
                        >
                          {getEmployeeName(employeeId)}

                          <button
                            type="button"
                            onClick={(e) =>
                              handleRemoveEmployee(employeeId, e)
                            }
                          >
                            ×
                          </button>
                        </span>
                      ))
                    )}

                    <span className="task-edit-employee-arrow">
                      ▾
                    </span>
                  </div>

                  {showEmployeeDropdown && (
                    <div className="task-edit-employee-dropdown">
                      {employees.length > 0 ? (
                        employees.map((employee) => {
                          const employeeId = String(employee.id);

                          const isSelected =
                            formData.assignedTo.includes(employeeId);

                          return (
                            <div
                              key={employee.id}
                              className={`task-edit-employee-option ${
                                isSelected ? "selected" : ""
                              }`}
                              onClick={() => {
                                if (!isSelected) {
                                  setFormData((prev) => ({
                                    ...prev,
                                    assignedTo: [
                                      ...prev.assignedTo,
                                      employeeId,
                                    ],
                                  }));
                                }

                                setShowEmployeeDropdown(false);
                              }}
                            >
                              {employee.name}
                            </div>
                          );
                        })
                      ) : (
                        <div className="task-edit-employee-option">
                          No employees found
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="task-edit-field">
                <label>
                  Task Frequency <span>*</span>
                </label>

                <CustomSelect
                  name="frequency"
                  value={formData.frequency}
                  onChange={handleChange}
                  options={frequencyOptions}
                />
              </div>

              <div className="task-edit-field">
                <label>
                  Task Type <span>*</span>
                </label>

                <CustomSelect
                  name="taskType"
                  value={formData.taskType}
                  onChange={handleChange}
                  options={taskTypeOptions}
                />
              </div>
            </div>

            <div className="task-edit-grid">
              <div className="task-edit-field">
                <label>
                  Task Date <span>*</span>
                </label>

                <CustomDatePicker
                  name="taskDate"
                  min={today}
                  value={formData.taskDate}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="task-edit-field">
                <label>
                  Due Date <span>*</span>
                </label>

                <CustomDatePicker
                  name="dueDate"
                  min={minDueDate}
                  value={formData.dueDate}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="task-edit-field">
                <label>Status</label>

                <div className="task-edit-status-row">
                  <span className="task-edit-status-label">
                    {formData.isActive ? "Active" : "Inactive"}
                  </span>

                  <button
                    type="button"
                    className={`task-edit-toggle ${
                      formData.isActive ? "active" : ""
                    }`}
                    onClick={handleToggle}
                  >
                    <span></span>
                  </button>
                </div>
              </div>
            </div>

            {/* Prerequisite Tasks (Task Dependencies) */}
            <div className="task-edit-field task-create-dep-field" style={{ marginTop: "18px", marginBottom: "18px" }}>
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
                className={`task-edit-employee-select ${showDepDropdown ? "open" : ""}`}
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
                    className="task-edit-employee-dropdown"
                    onClick={(e) => e.stopPropagation()}
                    style={{ position: "absolute", zIndex: 100, background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "6px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", maxHeight: "200px", overflowY: "auto", width: "100%", marginTop: "4px" }}
                  >
                    {tasksLoading ? (
                      <div style={{ padding: "8px 12px", color: "#64748b" }}>Loading tasks...</div>
                    ) : filteredTasks.length === 0 ? (
                      <div style={{ padding: "8px 12px", color: "#64748b" }}>No tasks available</div>
                    ) : (
                      filteredTasks.map((t) => {
                        const isSelected = selectedDependencies.includes(String(t.id));
                        return (
                          <div
                            key={t.id}
                            className={`task-edit-employee-option ${isSelected ? "selected" : ""}`}
                            onClick={() => handleSelectDependency(t)}
                            style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", cursor: "pointer", borderBottom: "1px solid #f1f5f9", background: isSelected ? "#f8fafc" : "transparent" }}
                          >
                            <div>
                              <strong style={{ display: "block", fontSize: "12px", color: "#0f172a" }}>{t.task_name}</strong>
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

            <div className="task-edit-actions">
              <button
                type="button"
                className="task-edit-cancel-btn"
                onClick={() => navigate("/tasks")}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="task-edit-submit-btn"
                disabled={saving}
              >
                {saving ? "Updating..." : "Update"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default TaskEdit;