import React, { useState, useEffect, useMemo } from "react";
import "./AttachmentPreviewModal.css";
import { API_URL } from "../config/axios.util";

function AttachmentPreviewModal({ isOpen, attachment, onClose }) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [textContent, setTextContent] = useState("");
  const [loadingText, setLoadingText] = useState(false);

  // Reset zoom & rotation when attachment changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setRotation(0);
      setTextContent("");
    }
  }, [isOpen, attachment]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, onClose]);

  // Determine file details
  const fileMeta = useMemo(() => {
    if (!attachment) return null;

    let name = "";
    let size = 0;
    let mime = "";
    let isNativeFile = false;
    let url = "";

    if (attachment instanceof File || attachment instanceof Blob) {
      isNativeFile = true;
      name = attachment.name || "Attachment";
      size = attachment.size || 0;
      mime = attachment.type || "";
      url = URL.createObjectURL(attachment);
    } else {
      name = attachment.original_name || attachment.file_name || "Attachment";
      size = attachment.file_size || attachment.size || 0;
      mime = attachment.mime_type || attachment.file_type || "";
      const token = localStorage.getItem("token") || "";

      if (attachment.file_path && attachment.file_path.startsWith("http")) {
        url = attachment.file_path;
      } else if (attachment.id) {
        url = `${API_URL}/emails/attachments/${attachment.id}/download?token=${encodeURIComponent(token)}`;
      } else {
        url = attachment.url || "";
      }
    }

    const ext = (name.split(".").pop() || "").toLowerCase();

    const isImage =
      mime.startsWith("image/") ||
      ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"].includes(ext);

    const isPdf = mime === "application/pdf" || ext === "pdf";

    const isAudio =
      mime.startsWith("audio/") || ["mp3", "wav", "ogg", "aac"].includes(ext);

    const isVideo =
      mime.startsWith("video/") || ["mp4", "webm", "mov", "m4v"].includes(ext);

    const isText =
      mime.startsWith("text/") ||
      [
        "txt",
        "json",
        "csv",
        "md",
        "js",
        "jsx",
        "ts",
        "tsx",
        "html",
        "css",
        "xml",
        "log",
      ].includes(ext);

    return {
      name,
      size,
      mime,
      url,
      ext,
      isNativeFile,
      isImage,
      isPdf,
      isAudio,
      isVideo,
      isText,
    };
  }, [attachment]);

  // Clean up ObjectURL when component unmounts or file changes
  useEffect(() => {
    return () => {
      if (fileMeta?.isNativeFile && fileMeta?.url) {
        URL.revokeObjectURL(fileMeta.url);
      }
    };
  }, [fileMeta]);

  // Load text file content if text
  useEffect(() => {
    if (isOpen && fileMeta?.isText && fileMeta?.url) {
      setLoadingText(true);
      if (fileMeta.isNativeFile && attachment instanceof Blob) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setTextContent(e.target?.result || "");
          setLoadingText(false);
        };
        reader.onerror = () => {
          setTextContent("Failed to load text preview.");
          setLoadingText(false);
        };
        reader.readAsText(attachment);
      } else {
        fetch(fileMeta.url)
          .then((res) => res.text())
          .then((txt) => {
            setTextContent(txt);
            setLoadingText(false);
          })
          .catch(() => {
            setTextContent("Could not load preview for this file.");
            setLoadingText(false);
          });
      }
    }
  }, [isOpen, fileMeta, attachment]);

  if (!isOpen || !fileMeta) return null;

  const formatFileSize = (bytes) => {
    if (!bytes || bytes <= 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const handleDownload = (e) => {
    if (e) e.stopPropagation();
    const link = document.createElement("a");
    link.href = fileMeta.url;
    link.download = fileMeta.name;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const zoomIn = () => setZoom((z) => Math.min(3, parseFloat((z + 0.25).toFixed(2))));
  const zoomOut = () => setZoom((z) => Math.max(0.5, parseFloat((z - 0.25).toFixed(2))));
  const resetZoom = () => {
    setZoom(1);
    setRotation(0);
  };
  const rotateRight = () => setRotation((r) => (r + 90) % 360);

  return (
    <div
      className="att-preview-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="att-preview-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Header Bar */}
        <div className="att-preview-header">
          <div className="att-preview-file-info">
            <span className="file-icon">
              {fileMeta.isImage
                ? "🖼️"
                : fileMeta.isPdf
                ? "📄"
                : fileMeta.isAudio
                ? "🎵"
                : fileMeta.isVideo
                ? "🎬"
                : fileMeta.isText
                ? "📝"
                : "📎"}
            </span>
            <div className="file-names-col">
              <span className="file-main-name" title={fileMeta.name}>
                {fileMeta.name}
              </span>
              <span className="file-meta-sub">
                {formatFileSize(fileMeta.size)} &bull; {fileMeta.ext.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="att-preview-actions">
            {fileMeta.isImage && (
              <div className="image-zoom-controls">
                <button
                  type="button"
                  className="ctrl-btn"
                  title="Zoom Out"
                  onClick={zoomOut}
                  disabled={zoom <= 0.5}
                >
                  −
                </button>
                <span className="zoom-level-text">{Math.round(zoom * 100)}%</span>
                <button
                  type="button"
                  className="ctrl-btn"
                  title="Zoom In"
                  onClick={zoomIn}
                  disabled={zoom >= 3}
                >
                  +
                </button>
                <button
                  type="button"
                  className="ctrl-btn"
                  title="Rotate 90°"
                  onClick={rotateRight}
                >
                  🔄
                </button>
                <button
                  type="button"
                  className="ctrl-btn"
                  title="Reset Zoom"
                  onClick={resetZoom}
                >
                  1:1
                </button>
              </div>
            )}

            <button
              type="button"
              className="action-btn download"
              onClick={handleDownload}
              title="Download file"
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>Download</span>
            </button>

            <button
              type="button"
              className="action-btn close"
              onClick={onClose}
              title="Close Preview (Esc)"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="att-preview-body">
          {fileMeta.isImage && (
            <div className="image-viewer-stage">
              <img
                src={fileMeta.url}
                alt={fileMeta.name}
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  transition: "transform 0.15s ease",
                }}
                className="preview-image"
              />
            </div>
          )}

          {fileMeta.isPdf && (
            <div className="pdf-viewer-stage">
              <iframe
                src={`${fileMeta.url}#toolbar=1&navpanes=0`}
                title={fileMeta.name}
                className="pdf-iframe-element"
              />
            </div>
          )}

          {fileMeta.isAudio && (
            <div className="audio-viewer-stage">
              <div className="media-card">
                <span className="media-art">🎵</span>
                <h4>{fileMeta.name}</h4>
                <audio controls src={fileMeta.url} className="audio-player" autoPlay />
              </div>
            </div>
          )}

          {fileMeta.isVideo && (
            <div className="video-viewer-stage">
              <video
                controls
                src={fileMeta.url}
                className="video-player"
                autoPlay
              />
            </div>
          )}

          {fileMeta.isText && (
            <div className="text-viewer-stage">
              {loadingText ? (
                <div className="text-loading">Loading text preview...</div>
              ) : (
                <pre className="text-pre-content">{textContent}</pre>
              )}
            </div>
          )}

          {!fileMeta.isImage &&
            !fileMeta.isPdf &&
            !fileMeta.isAudio &&
            !fileMeta.isVideo &&
            !fileMeta.isText && (
              <div className="generic-doc-stage">
                <div className="generic-card">
                  <div className="doc-big-icon">📄</div>
                  <h3>{fileMeta.name}</h3>
                  <p>
                    In-browser preview is not available for this file type (
                    {fileMeta.ext.toUpperCase()}).
                  </p>
                  <button
                    type="button"
                    className="btn-primary-download"
                    onClick={handleDownload}
                  >
                    Download to View ({formatFileSize(fileMeta.size)})
                  </button>
                </div>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}

export default AttachmentPreviewModal;

