import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Upload, FileUp, Download, Check, FileText, X } from "lucide-react";
import { bulkCreateUsers } from "../services/userService";
import "./UserImport.css";

function UserImport() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const validateAndSetFile = (file) => {
    if (!file) return;

    const allowedExtensions = [".xlsx", ".xls"];
    const extension = file.name
      .toLowerCase()
      .slice(file.name.lastIndexOf("."));

    if (!allowedExtensions.includes(extension)) {
      setSelectedFile(null);
      setUploadError("Only Excel files (.xlsx or .xls) are allowed.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setSelectedFile(null);
      setUploadError("File size must be less than 5 MB.");
      return;
    }

    setUploadError("");
    setSelectedFile(file);
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    validateAndSetFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!uploading) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (uploading) return;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      validateAndSetFile(file);
    }
  };

  const handleRemoveFile = (e) => {
    e.stopPropagation();
    setSelectedFile(null);
    setUploadError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const handleDownloadTemplate = () => {
    const xmlContent = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Worksheet ss:Name="Users">
  <Table>
   <Row>
    <Cell><Data ss:Type="String">name</Data></Cell>
    <Cell><Data ss:Type="String">email</Data></Cell>
    <Cell><Data ss:Type="String">password</Data></Cell>
    <Cell><Data ss:Type="String">age</Data></Cell>
    <Cell><Data ss:Type="String">role</Data></Cell>
    <Cell><Data ss:Type="String">country</Data></Cell>
    <Cell><Data ss:Type="String">state</Data></Cell>
    <Cell><Data ss:Type="String">city</Data></Cell>
    <Cell><Data ss:Type="String">pincode</Data></Cell>
   </Row>
   <Row>
    <Cell><Data ss:Type="String">John Doe</Data></Cell>
    <Cell><Data ss:Type="String">john.doe@example.com</Data></Cell>
    <Cell><Data ss:Type="String">Password@123</Data></Cell>
    <Cell><Data ss:Type="Number">28</Data></Cell>
    <Cell><Data ss:Type="String">Employee</Data></Cell>
    <Cell><Data ss:Type="String">India</Data></Cell>
    <Cell><Data ss:Type="String">Gujarat</Data></Cell>
    <Cell><Data ss:Type="String">Ahmedabad</Data></Cell>
    <Cell><Data ss:Type="String">380015</Data></Cell>
   </Row>
  </Table>
 </Worksheet>
</Workbook>`;

    const blob = new Blob([xmlContent], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "bulk_users_template.xls";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleBulkUpload = async () => {
    if (!selectedFile) {
      setUploadError("Please select an Excel file.");
      return;
    }

    if (uploading) return;

    try {
      setUploading(true);
      setUploadError("");

      const result = await bulkCreateUsers(selectedFile);
      const responseData = result?.data || result;

      const createdCount =
        responseData?.createdCount ??
        responseData?.count ??
        responseData?.created ??
        responseData?.usersCreated ??
        responseData?.data?.createdCount ??
        responseData?.data?.count ??
        responseData?.data?.created ??
        responseData?.data?.usersCreated;

      let message = responseData?.message || "Users uploaded successfully.";

      if (createdCount !== undefined && createdCount !== null) {
        message = `${createdCount} user${
          Number(createdCount) === 1 ? "" : "s"
        } uploaded successfully.`;
      }

      sessionStorage.setItem("userImportSuccess", message);
      navigate("/users");
    } catch (err) {
      const message =
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Unable to upload users.";

      setUploadError(message);
      setUploading(false);
    }
  };

  const handleCancel = () => {
    if (uploading) return;
    navigate("/users");
  };

  return (
    <div className="user-import-page">
      {/* Top Header Row */}
      <div className="user-import-header">
        <button
          type="button"
          className="btn-back-white user-import-back-btn"
          onClick={handleCancel}
          disabled={uploading}
        >
          <ArrowLeft size={14} /> Back
        </button>

        <div className="user-import-title">
          <span className="task-breadcrumb-tag">USER MANAGEMENT</span>
          <h1>Bulk Users Upload</h1>
          <p className="user-import-subtitle">
            Upload multiple employees using an Excel file. All fields are required and new users will be created as active.
          </p>
        </div>
      </div>

      {/* Main 2-Column Content Grid */}
      <div className="user-import-layout">
        {/* Left Card: Upload Excel File */}
        <div className="user-import-card upload-main-card">
          <div className="import-card-header">
            <div className="import-card-icon-badge">
              <FileUp size={22} />
            </div>
            <div className="import-card-heading">
              <h2>Upload Excel File</h2>
              <p>Drag and drop your Excel file here or browse from your computer.</p>
            </div>
          </div>

          <div
            className={`upload-dropzone ${isDragging ? "dragging" : ""} ${
              selectedFile ? "has-file" : ""
            } ${uploading ? "uploading" : ""}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !uploading && fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              id="bulk-user-file-input"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              disabled={uploading}
              style={{ display: "none" }}
            />

            {uploading ? (
              <div className="dropzone-uploading-state">
                <span className="bulk-upload-spinner"></span>
                <strong>Uploading users...</strong>
                <span>Please wait while your employee records are being processed</span>
              </div>
            ) : selectedFile ? (
              <div className="dropzone-file-selected-state">
                <div className="selected-file-icon-circle">
                  <FileText size={26} />
                </div>
                <strong className="selected-file-name" title={selectedFile.name}>
                  {selectedFile.name}
                </strong>
                <span className="selected-file-meta">
                  {formatFileSize(selectedFile.size)} • Ready to upload
                </span>
                <div className="selected-file-actions">
                  <button
                    type="button"
                    className="btn-change-file"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                  >
                    Change File
                  </button>
                  <button
                    type="button"
                    className="btn-remove-file"
                    onClick={handleRemoveFile}
                    title="Remove file"
                  >
                    <X size={14} /> Remove
                  </button>
                </div>
              </div>
            ) : (
              <div className="dropzone-idle-state">
                <div className="cloud-icon-circle">
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#ea580c"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
                    <path d="M12 12v9" />
                    <path d="m8 16 4-4 4 4" />
                  </svg>
                </div>

                <strong className="dropzone-main-text">
                  Drag & drop your Excel file here
                </strong>

                <span className="dropzone-or-text">or</span>

                <button
                  type="button"
                  className="btn-choose-excel"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                >
                  <FileText size={16} /> Choose Excel File
                </button>

                <p className="dropzone-format-hint">
                  Supported format: .xlsx, .xls | Max size: 5 MB
                </p>
              </div>
            )}
          </div>

          {uploadError && (
            <div className="bulk-upload-error-alert">
              <span className="error-alert-icon">!</span>
              <span>{uploadError}</span>
            </div>
          )}

          <div className="bulk-role-info-banner">
            <span className="role-info-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" fill="#ea580c" />
                <line x1="12" y1="16" x2="12" y2="11" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
                <circle cx="12" cy="7.5" r="1.2" fill="#ffffff" />
              </svg>
            </span>
            <span className="role-info-text">
              Role must be <strong>Employee</strong>. New users are created as active.
            </span>
          </div>
        </div>

        {/* Right Column: Requirements & Download Template */}
        <div className="user-import-sidebar">
          {/* File Requirements Card */}
          <div className="user-import-card requirements-card">
            <div className="import-card-header">
              <div className="import-card-icon-badge">
                <FileText size={22} />
              </div>
              <div className="import-card-heading">
                <h2>File Requirements</h2>
                <p>Your Excel file must follow the format below.</p>
              </div>
            </div>

            <div className="requirements-checklist-box">
              <div className="requirement-item">
                <span className="req-check-badge">
                  <Check size={11} strokeWidth={3.5} />
                </span>
                <span>File format: .xlsx or .xls</span>
              </div>

              <div className="requirement-item">
                <span className="req-check-badge">
                  <Check size={11} strokeWidth={3.5} />
                </span>
                <span>All fields are required</span>
              </div>

              <div className="requirement-item">
                <span className="req-check-badge">
                  <Check size={11} strokeWidth={3.5} />
                </span>
                <span>
                  Role must be <strong>Employee</strong>
                </span>
              </div>

              <div className="requirement-item">
                <span className="req-check-badge">
                  <Check size={11} strokeWidth={3.5} />
                </span>
                <span>New users will be created as active</span>
              </div>

              <div className="requirement-item">
                <span className="req-check-badge">
                  <Check size={11} strokeWidth={3.5} />
                </span>
                <span>Maximum file size: 5 MB</span>
              </div>
            </div>
          </div>

          {/* Download Template Card */}
          <div className="user-import-card template-download-card">
            <div className="import-card-header">
              <div className="import-card-icon-badge">
                <Download size={22} />
              </div>
              <div className="import-card-heading">
                <h2>Download Template</h2>
                <p>Download the Excel template with the required columns.</p>
              </div>
            </div>

            <div className="template-button-container">
              <button
                type="button"
                className="btn-download-template"
                onClick={handleDownloadTemplate}
              >
                <Download size={15} /> Download Excel Template
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Action Buttons */}
      <div className="user-import-bottom-actions">
        <button
          type="button"
          className="bulk-action-cancel"
          onClick={handleCancel}
          disabled={uploading}
        >
          Cancel
        </button>

        <button
          type="button"
          className="bulk-action-submit"
          onClick={handleBulkUpload}
          disabled={!selectedFile || uploading}
        >
          {uploading ? (
            <span className="bulk-submit-loading">
              <span className="bulk-button-spinner"></span>
              Uploading...
            </span>
          ) : (
            <>
              <Upload size={16} /> Upload Users
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default UserImport;