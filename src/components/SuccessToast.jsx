import { useEffect, useState } from "react";
import "./SuccessToast.css";

function SuccessToast({ message, onClose }) {
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (!message) {
      return;
    }

    const timer = setTimeout(() => {
      handleClose();
    }, 4500);

    return () => clearTimeout(timer);
  }, [message]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      if (onClose) onClose();
    }, 250);
  };

  if (!message) {
    return null;
  }

  return (
    <div
      className={`premium-toast-wrapper success-toast ${isClosing ? "toast-exit" : "toast-enter"}`}
      role="alert"
      aria-live="polite"
    >
      <div className="premium-toast-card">
        {/* Left Glowing Icon Circle */}
        <div className="premium-toast-icon-box">
          <svg
            className="premium-toast-check-svg"
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        {/* Toast Body */}
        <div className="premium-toast-content">
          <div className="premium-toast-title-row">
            <span className="premium-toast-title">Success</span>
          </div>
          <p className="premium-toast-msg">{message}</p>
        </div>

        {/* Close Button */}
        <button
          type="button"
          className="premium-toast-close-btn"
          onClick={handleClose}
          aria-label="Close"
          title="Close notification"
        >
          <svg
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Animated Progress Bar */}
        <div className="premium-toast-progress-track">
          <div className="premium-toast-progress-bar"></div>
        </div>
      </div>
    </div>
  );
}

export default SuccessToast;