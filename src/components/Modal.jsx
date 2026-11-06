import "./Modal.css";

function Modal({
  isOpen,
  onClose,
  title,
  children,
  className = "",
}) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className={`modal-box ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {title ? (
          <div className="modal-header">
            <h2>{title}</h2>

            <button
              className="modal-close"
              onClick={onClose}
              type="button"
            >
              ×
            </button>
          </div>
        ) : (
          <button
            className="modal-close modal-close-floating"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        )}

        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export default Modal;