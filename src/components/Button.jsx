import "./Button.css";
function Button({
  children,
  type = "button",
  onClick,
  disabled = false,
  className = "",
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`reusable-button ${className}`}>
      {children}
    </button>
  );
}

export default Button;