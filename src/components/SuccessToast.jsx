import "./SuccessToast.css";
function SuccessToast({ message, onClose }) {
  if (!message) {
    return null;
  }

  return (
    <div className="success-toast">
      <span className="success-icon">✓</span>

      <span className="success-text">
        {message}
      </span>

      <button
        className="success-close"
        onClick={onClose}>
        ×
      </button>
    </div>
  );
}
export default SuccessToast;