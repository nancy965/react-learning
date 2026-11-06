import { createPortal } from "react-dom";
import { useTheme } from "../context/ThemeContext";
import "./ConfirmDialog.css";

function ConfirmDialog({
  title = "Confirm Action",
  message = "Are you sure you want to delete this user?",
  confirmText = "Yes, Delete",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
}) {
  const { theme } = useTheme();

  return createPortal(
    <div
      className={`confirm-overlay ${theme === "dark" ? "dark-theme" : "light-theme"}`}
      onClick={(e) => {
        if (e.target === e.currentTarget && onCancel) {
          onCancel();
        }
      }}
    >
      <div className="confirm-card">
        <div className="confirm-icon">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="#ffedd5"
            stroke="#ea580c"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            <line x1="12" y1="9" x2="12" y2="13" stroke="#ea580c" strokeWidth="2.5" />
            <circle cx="12" cy="17" r="1.2" fill="#ea580c" stroke="none" />
          </svg>
        </div>

        <h3>{title}</h3>
        <p>{message}</p>

        <div className="confirm-actions">
          <button
            type="button"
            className="confirm-btn-cancel"
            onClick={onCancel}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className="confirm-btn-delete"
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default ConfirmDialog;
