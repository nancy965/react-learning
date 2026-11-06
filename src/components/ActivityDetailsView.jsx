import "./ActivityDetailsView.css";

// SVG Icons
const Icons = {
  documentPen: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
      <polyline points="14 2 14 8 20 8"></polyline>
      <path d="M10.5 14.5L16 9l1.5 1.5L12 16l-3.5.5.5-3.5z"></path>
    </svg>
  ),
  clock: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <polyline points="12 6 12 12 16 14"></polyline>
    </svg>
  ),
  user: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
      <circle cx="12" cy="7" r="4"></circle>
    </svg>
  ),
  users: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
      <circle cx="9" cy="7" r="4"></circle>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
    </svg>
  ),
  settings: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"></circle>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
    </svg>
  ),
  success: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
      <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>
  ),
  docNew: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
      <polyline points="14 2 14 8 20 8"></polyline>
      <line x1="16" y1="13" x2="8" y2="13"></line>
      <line x1="16" y1="17" x2="8" y2="17"></line>
      <polyline points="10 9 9 9 8 9"></polyline>
    </svg>
  ),
  docOld: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
      <polyline points="14 2 14 8 20 8"></polyline>
      <circle cx="10" cy="13" r="2"></circle>
      <line x1="14" y1="17" x2="11.5" y2="14.5"></line>
    </svg>
  ),
  info: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="12" y1="16" x2="12" y2="12"></line>
      <line x1="12" y1="8" x2="12.01" y2="8"></line>
    </svg>
  ),
  calendar: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
      <line x1="16" y1="2" x2="16" y2="6"></line>
      <line x1="8" y1="2" x2="8" y2="6"></line>
      <line x1="3" y1="10" x2="21" y2="10"></line>
    </svg>
  ),
  monitor: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
      <line x1="8" y1="21" x2="16" y2="21"></line>
      <line x1="12" y1="17" x2="12" y2="21"></line>
    </svg>
  ),
  mapPin: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
      <circle cx="12" cy="10" r="3"></circle>
    </svg>
  ),
  shield: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
    </svg>
  )
};

function ActivityDetailsView({ log, user, onClose }) {
  if (!log) return null;

  const actionName = (log.action || log.title || "").toUpperCase();

  // Extract common variables
  let moduleName = "System";
  if (actionName.includes("LIFECYCLE")) moduleName = "Employee Lifecycle";
  else if (actionName.includes("EMPLOYEE")) moduleName = "Employee";
  else if (actionName.includes("TASK")) moduleName = "Task";
  else if (actionName.includes("ROLE")) moduleName = "Role";
  else if (actionName.includes("MASTER")) moduleName = "Common Master";
  else if (actionName.includes("TICKET")) moduleName = "Support Ticket";
  else if (actionName.includes("APPROVAL")) moduleName = "Approval Workflow";

  const dateStr = log.created_at ? new Date(log.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true }) : (log.time || "-");

  let badgeType = "default";
  if (actionName.includes("UPDATE") || actionName.includes("REOPEN")) badgeType = "update";
  else if (actionName.includes("CREATE") || actionName.includes("ADD") || actionName.includes("COMPLET")) badgeType = "create";
  else if (actionName.includes("DELETE") || actionName.includes("DEACTIVATE")) badgeType = "delete";

  // Parse details
  let parsedDetails = {};
  if (typeof log.details === "string") {
    try {
      parsedDetails = JSON.parse(log.details);
    } catch (e) {
      parsedDetails = { raw: log.details };
    }
  } else if (typeof log.details === "object" && log.details !== null) {
    parsedDetails = { ...log.details };
  }

  // Find specifically oldData and newData keys (ignoring case)
  let oldData = null;
  let newData = null;

  Object.keys(parsedDetails).forEach(key => {
    if (key.toLowerCase() === "olddata") {
      oldData = parsedDetails[key];
      delete parsedDetails[key];
    } else if (key.toLowerCase() === "newdata") {
      newData = parsedDetails[key];
      delete parsedDetails[key];
    }
  });

  // If oldData/newData is stringified JSON, parse it
  const parseNestedJson = (val) => {
    if (typeof val === "string") {
      try {
        const p = JSON.parse(val);
        if (typeof p === "object" && p !== null) return p;
      } catch (e) { }
    }
    return val;
  };

  if (oldData) oldData = parseNestedJson(oldData);
  if (newData) newData = parseNestedJson(newData);

  // Remaining keys like adminId
  const mainAdminId = parsedDetails.adminId || parsedDetails.AdminId || log.target_user || "-";
  const targetName = log.target_user_name || log.target_name || (user && user.name) || log.target_user || mainAdminId;

  // If action is employee related, ensure all user data fields are present
  if (actionName.includes("EMPLOYEE")) {
    if (!newData && !oldData) {
      parsedDetails = {
        Age: (user && user.age) || parsedDetails.age || parsedDetails.Age || "-",
        Name: (user && user.name) || targetName || parsedDetails.name || parsedDetails.Name || "-",
        Email: (user && user.email) || parsedDetails.email || parsedDetails.Email || "-",
        Role: (user && (user.role || user.permission_role)) || parsedDetails.role || parsedDetails.Role || "Employee",
        Status: user && user.is_active !== undefined ? (user.is_active ? "Active" : "Inactive") : (parsedDetails.status || "Active"),
        City_Name: (user && user.city_name) || parsedDetails.city_name || parsedDetails.cityName || "-",
        State_Name: (user && user.state_name) || parsedDetails.state_name || parsedDetails.stateName || "-",
        Country_Name: (user && user.country_name) || parsedDetails.country_name || parsedDetails.countryName || "-",
        Pincode_Name: (user && user.pincode) || parsedDetails.pincode || parsedDetails.pincodeName || "-",
        Employee_ID: (user && (user.employee_id || user.id)) || parsedDetails.employee_id || parsedDetails.Employee_ID || "-",
        ...parsedDetails,
      };
      delete parsedDetails.cityId;
      delete parsedDetails.stateId;
      delete parsedDetails.countryId;
      delete parsedDetails.pincodeId;
      delete parsedDetails.roleId;
      delete parsedDetails.age;
      delete parsedDetails.name;
      delete parsedDetails.email;
      delete parsedDetails.role;
      delete parsedDetails.status;
    }
  }

  // Remaining keys like adminId
  const otherKeys = Object.keys(parsedDetails).filter(k => k !== 'taskId' && k !== 'adminId');

  const formatKeyName = (key) => {
    const map = {
      City_Name: "City Name",
      State_Name: "State Name",
      Country_Name: "Country Name",
      Pincode_Name: "Pincode Name",
      Employee_ID: "Employee ID",
      employee_id: "Employee ID",
      employeeId: "Employee ID",
      city_id: "City Name",
      cityId: "City Name",
      city_name: "City Name",
      cityName: "City Name",
      role_id: "Role Name",
      roleId: "Role Name",
      role_name: "Role Name",
      roleName: "Role Name",
      state_id: "State Name",
      stateId: "State Name",
      state_name: "State Name",
      stateName: "State Name",
      country_id: "Country Name",
      countryId: "Country Name",
      country_name: "Country Name",
      countryName: "Country Name",
      pincode_id: "Pincode Name",
      pincodeId: "Pincode Name",
      pincode_name: "Pincode Name",
      pincodeName: "Pincode Name",
      is_active: "Is Active",
      isActive: "Is Active",
      type: "Master Type",
      masterId: "Master ID",
      status: "Status",
      age: "Age",
      name: "Name",
      email: "Email",
      adminId: "Admin ID",
      admin_id: "Admin ID",
    };

    if (map[key]) return map[key];

    return key
      .replace(/([A-Z])/g, " $1")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase())
      .trim();
  };

  const renderTable = (dataObj) => {
    if (typeof dataObj !== "object" || dataObj === null) {
      return <div className="adv-table-raw">{String(dataObj)}</div>;
    }

    return (
      <div className="adv-data-table">
        {Object.entries(dataObj).map(([key, value]) => {
          if (value === null || value === undefined) return null;

          let displayVal = value;
          if (typeof value === "object") displayVal = JSON.stringify(value);
          else displayVal = String(value);

          return (
            <div key={key} className="adv-table-row">
              <div className="adv-table-key">{formatKeyName(key)}</div>
              <div className="adv-table-val">
                <span className={typeof value === 'boolean' ? (value ? 'adv-bool-true' : 'adv-bool-false') : ''}>
                  {displayVal}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="adv-container">

      {/* Header */}
      <div className="adv-header">
        <div className="adv-header-left">
          <div className="adv-header-icon adv-icon-orange">
            {Icons.documentPen}
          </div>
          <div className="adv-header-title-box">
            <h2 className="adv-title">Activity Details: {actionName}</h2>
            <p className="adv-subtitle">Detailed view of the changes made in this activity</p>
          </div>
        </div>
        <div className="adv-header-right-wrap">
          <div className="adv-header-right">
            <div className={`adv-badge adv-badge-${badgeType}`}>
              <span className="adv-badge-dot"></span>
              {badgeType.toUpperCase()}
            </div>
            <div className="adv-header-date">
              {Icons.clock} {dateStr}
            </div>
          </div>
          {onClose && (
            <button
              type="button"
              className="adv-close-btn"
              onClick={onClose}
              aria-label="Close"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* 4 Summary Cards */}
      <div className="adv-summary-grid">
        <div className="adv-summary-card">
          <div className="adv-summary-icon adv-bg-light-orange">{Icons.user}</div>
          <div className="adv-summary-info">
            <span className="adv-summary-label">Target Name</span>
            <span className="adv-summary-value">{targetName}</span>
          </div>
        </div>
        <div className="adv-summary-card">
          <div className="adv-summary-icon adv-bg-light-blue">{Icons.users}</div>
          <div className="adv-summary-info">
            <span className="adv-summary-label">Module</span>
            <span className="adv-summary-value">{moduleName}</span>
          </div>
        </div>
        <div className="adv-summary-card">
          <div className="adv-summary-icon adv-bg-light-purple">{Icons.settings}</div>
          <div className="adv-summary-info">
            <span className="adv-summary-label">Action</span>
            <span className="adv-summary-value">{actionName}</span>
          </div>
        </div>
        <div className="adv-summary-card">
          <div className="adv-summary-icon adv-bg-light-green">{Icons.success}</div>
          <div className="adv-summary-info">
            <span className="adv-summary-label">Status</span>
            <span className="adv-summary-value">Success</span>
          </div>
        </div>
      </div>

      {/* Main Data Split */}
      <div className={`adv-data-grid ${(!oldData || !newData) ? 'adv-data-grid-single' : ''}`}>

        {newData && (
          <div className="adv-data-card">
            <div className="adv-data-card-header">
              <div className="adv-data-icon adv-text-green">{Icons.docNew}</div>
              <div className="adv-data-title-box">
                <h3>New Data (Updated Values)</h3>
                <p>Current values after the update</p>
              </div>
            </div>
            <div className="adv-data-body">
              {renderTable(newData)}
            </div>
          </div>
        )}

        {oldData && (
          <div className="adv-data-card">
            <div className="adv-data-card-header">
              <div className="adv-data-icon adv-text-red">{Icons.docOld}</div>
              <div className="adv-data-title-box">
                <h3>Old Data (Previous Values)</h3>
                <p>Values before the update</p>
              </div>
            </div>
            <div className="adv-data-body">
              {renderTable(oldData)}
            </div>
          </div>
        )}

        {/* If neither exists, just render parsedDetails */}
        {(!newData && !oldData && Object.keys(parsedDetails).length > 0) && (
          <div className="adv-data-card">
            <div className="adv-data-card-header">
              <div className="adv-data-icon adv-text-blue">{Icons.docNew}</div>
              <div className="adv-data-title-box">
                <h3>Activity Data</h3>
                <p>Recorded values for this activity</p>
              </div>
            </div>
            <div className="adv-data-body">
              {renderTable(parsedDetails)}
            </div>
          </div>
        )}

      </div>

    </div>
  );
}

export default ActivityDetailsView;
