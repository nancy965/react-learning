import { useState } from "react";
import API_URL from "../config/axios.util";
import "./TicketAttachmentsView.css";

const formatFileSize = (bytes) => {
  const num = Number(bytes);
  if (!num || num <= 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(num) / Math.log(k));
  return parseFloat((num / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
};

const isImageFile = (type = "", name = "") => {
  return (
    type.toLowerCase().startsWith("image/") ||
    /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(name)
  );
};

const isPdfFile = (type = "", name = "") => {
  return type.toLowerCase() === "application/pdf" || /\.pdf$/i.test(name);
};

export default function TicketAttachmentsView({
  attachments = [],
  title = "Attached Files",
  subtitle = "Click to view or download uploaded files",
  variant = "default",
}) {
  const [lightboxImage, setLightboxImage] = useState(null);

  if (!attachments || attachments.length === 0) {
    return null;
  }

  const getFullUrl = (filePath) => {
    if (!filePath) return "";
    if (filePath.startsWith("http://") || filePath.startsWith("https://")) {
      return filePath;
    }
    return `${API_URL}${filePath.startsWith("/") ? "" : "/"}${filePath}`;
  };

  const handleDownload = (e, fileUrl, fileName) => {
    e.stopPropagation();
    const link = document.createElement("a");
    link.href = fileUrl;
    link.download = fileName;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenNewTab = (e, fileUrl) => {
    e.stopPropagation();
    window.open(fileUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className={`detail-attachments-card ${variant ? `variant-${variant}` : ""}`}>
      {/* Header */}
      <div className="attachments-card-header">
        <div className="attachments-header-left">
          <div className="attachments-icon-circle">
            {variant === "resolution" ? (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            ) : (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
              </svg>
            )}
          </div>
          <div>
            <h4 className="attachments-card-title">{title}</h4>
            <span className="attachments-card-subtitle">{subtitle}</span>
          </div>
        </div>
        <span className="attachments-count-badge">
          {attachments.length} {attachments.length === 1 ? "file" : "files"}
        </span>
      </div>

      {/* Grid of File Cards */}
      <div className="attachments-grid">
        {attachments.map((att) => {
          const fileUrl = getFullUrl(att.file_path);
          const isImg = isImageFile(att.file_type, att.original_name);
          const isPdf = isPdfFile(att.file_type, att.original_name);

          return (
            <div
              key={att.id || att.file_path}
              className={`attachment-item-card ${isImg ? "item-image" : isPdf ? "item-pdf" : "item-doc"}`}
              onClick={() => {
                if (isImg) {
                  setLightboxImage({ url: fileUrl, name: att.original_name });
                } else {
                  handleOpenNewTab({ stopPropagation: () => {} }, fileUrl);
                }
              }}
              title={`Click to view ${att.original_name}`}
            >
              {/* Thumbnail / Icon Left */}
              <div className="attachment-preview-box">
                {isImg ? (
                  <img
                    src={fileUrl}
                    alt={att.original_name}
                    className="attachment-thumb-img"
                    loading="lazy"
                  />
                ) : isPdf ? (
                  <div className="file-type-icon pdf-icon">
                    <svg
                      width="22"
                      height="22"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                      <line x1="10" y1="9" x2="8" y2="9" />
                    </svg>
                    <span className="file-badge-text">PDF</span>
                  </div>
                ) : (
                  <div className="file-type-icon doc-icon">
                    <svg
                      width="22"
                      height="22"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                      <polyline points="13 2 13 9 20 9" />
                    </svg>
                    <span className="file-badge-text">DOC</span>
                  </div>
                )}
              </div>

              {/* Meta Info */}
              <div className="attachment-info-box">
                <span className="attachment-name" title={att.original_name}>
                  {att.original_name}
                </span>
                <div className="attachment-meta-row">
                  <span className="attachment-size">{formatFileSize(att.file_size)}</span>
                  <span className={`attachment-source-badge ${att.source === "resolution" ? "badge-agent" : "badge-requester"}`}>
                    {att.source === "resolution" ? "By Agent" : "By Requester"}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="attachment-actions-box">
                {isImg && (
                  <button
                    type="button"
                    className="attachment-btn-action"
                    title="Preview Image"
                    onClick={(e) => {
                      e.stopPropagation();
                      setLightboxImage({ url: fileUrl, name: att.original_name });
                    }}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </button>
                )}

                <button
                  type="button"
                  className="attachment-btn-action"
                  title="Open in New Tab"
                  onClick={(e) => handleOpenNewTab(e, fileUrl)}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </button>

                <button
                  type="button"
                  className="attachment-btn-action download-btn"
                  title="Download File"
                  onClick={(e) => handleDownload(e, fileUrl, att.original_name)}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Image Lightbox Modal */}
      {lightboxImage && (
        <div
          className="attachment-lightbox-overlay"
          onClick={() => setLightboxImage(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="attachment-lightbox-box"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="attachment-lightbox-header">
              <span className="lightbox-filename" title={lightboxImage.name}>
                {lightboxImage.name}
              </span>
              <div className="lightbox-header-actions">
                <button
                  type="button"
                  className="lightbox-action-btn"
                  onClick={(e) => handleDownload(e, lightboxImage.url, lightboxImage.name)}
                  title="Download Image"
                >
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Download
                </button>
                <button
                  type="button"
                  className="lightbox-action-btn"
                  onClick={(e) => handleOpenNewTab(e, lightboxImage.url)}
                  title="Open Original"
                >
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                  Open in Tab
                </button>
                <button
                  type="button"
                  className="lightbox-close-btn"
                  onClick={() => setLightboxImage(null)}
                  title="Close Preview"
                >
                  &times;
                </button>
              </div>
            </div>

            <div className="attachment-lightbox-body">
              <img
                src={lightboxImage.url}
                alt={lightboxImage.name}
                className="lightbox-full-img"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
