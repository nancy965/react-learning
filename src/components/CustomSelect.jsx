import { useState, useRef, useEffect } from "react";
import "./CustomSelect.css";

export default function CustomSelect({
  value,
  onChange,
  options = [],
  placeholder = "Select...",
  className = "",
  style = {},
  disabled = false,
  minWidth,
  name,
  id,
  icon,
  isClearable = true,
  clearable,
  onClear,
  searchable = true,
  includeAllInMenu = false,
  renderOption,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Normalize options to [{ value, label }]
  const normalizedOptions = options.map((opt) => {
    if (typeof opt === "object" && opt !== null) {
      return {
        ...opt,
        value: opt.value ?? opt.id,
        label: opt.label ?? opt.name ?? String(opt.value ?? opt.id),
      };
    }
    return { value: opt, label: String(opt) };
  });

  // Detect page size dropdowns (Show 5, Show 10, etc.)
  const isPageSize =
    normalizedOptions.some((opt) => /show\s*\d+/i.test(opt.label)) ||
    name === "pageSize" ||
    name === "perPage" ||
    name === "usersPerPage" ||
    id === "notif-per-page" ||
    (typeof className === "string" &&
      (className.includes("page-size") || className.includes("pagesize"))) ||
    (normalizedOptions.length > 0 &&
      normalizedOptions.every(
        (opt) =>
          typeof opt.value === "number" &&
          [5, 10, 15, 20, 25, 50, 100, 150, 200, 250, 300, 350, 400, 450, 500].includes(opt.value) &&
          !String(opt.label).toLowerCase().includes("id")
      ));

  // Determine if in-field search should be active
  const isSearchable = searchable !== false && !isPageSize && !disabled;

  // Find any "All ..." option (e.g. { value: "all", label: "All Request Types" })
  const allOption = !isPageSize
    ? normalizedOptions.find((opt) => {
        const valStr = String(opt.value).trim().toLowerCase();
        const lblStr = String(opt.label).trim().toLowerCase();
        return valStr === "all" || (valStr === "" && lblStr.startsWith("all "));
      })
    : null;

  // Options to render in the opened dropdown list:
  // "All Request Types" / "All Statuses" / etc. are filtered unless includeAllInMenu is true
  const menuOptions = !isPageSize
    ? normalizedOptions.filter((opt) => {
        if (includeAllInMenu) return true;
        const valStr = String(opt.value).trim().toLowerCase();
        const lblStr = String(opt.label).trim().toLowerCase();
        if (valStr === "all") return false;
        if (valStr === "" && lblStr.startsWith("all ")) return false;
        return true;
      })
    : normalizedOptions;

  // The placeholder to show in the field when nothing is selected
  const effectivePlaceholder =
    placeholder && placeholder !== "Select..."
      ? placeholder
      : allOption
      ? allOption.label
      : placeholder || "Select...";

  // Check if current value represents an "all" or unselected state
  const isAllOrEmpty =
    value === undefined ||
    value === null ||
    value === "" ||
    String(value).trim().toLowerCase() === "all";

  // hasValue is true ONLY when a REAL option is selected!
  const hasValue = !isAllOrEmpty;

  // canClear is true everywhere EXCEPT page-size dropdowns, or when explicitly disabled
  const canClear =
    !isPageSize &&
    isClearable !== false &&
    clearable !== false &&
    !disabled;

  const selectedOpt = hasValue
    ? normalizedOptions.find(
        (opt) => String(opt.value) === String(value)
      )
    : null;

  const displayLabel = selectedOpt ? selectedOpt.label : effectivePlaceholder;

  // Filter menu options if user is actively searching in the field
  const filteredOptions =
    isSearchable && isTyping && searchTerm.trim() !== ""
      ? menuOptions.filter((opt) =>
          String(opt.label).toLowerCase().includes(searchTerm.trim().toLowerCase())
        )
      : menuOptions;

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setIsTyping(false);
        setSearchTerm("");
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isOpen]);

  const handleSelect = (optValue) => {
    if (disabled) return;
    setIsOpen(false);
    setIsTyping(false);
    setSearchTerm("");
    if (onChange) {
      const syntheticEvent = {
        target: { value: optValue, name },
        currentTarget: { value: optValue, name },
        valueOf: () => optValue,
        toString: () => String(optValue),
      };
      onChange(syntheticEvent, optValue);
    }
  };

  const handleClear = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;

    setIsOpen(false);
    setIsTyping(false);
    setSearchTerm("");

    if (onClear) {
      onClear();
    }
    if (onChange) {
      const clearVal = allOption ? "all" : "";
      const syntheticEvent = {
        target: { value: clearVal, name },
        currentTarget: { value: clearVal, name },
        valueOf: () => clearVal,
        toString: () => String(clearVal),
      };
      onChange(syntheticEvent, clearVal);
    }
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleInputFocus = (e) => {
    if (disabled) return;
    if (!isOpen) {
      setIsOpen(true);
    }
    if (selectedOpt && !isTyping) {
      // Select all text on focus so user can immediately type to search or clear
      e.target.select();
    }
  };

  const handleInputChange = (e) => {
    if (disabled) return;
    const text = e.target.value;
    setIsTyping(true);
    setSearchTerm(text);
    if (!isOpen) {
      setIsOpen(true);
    }

    // Immediately clear selection if user erases all text
    if (text.trim() === "" && value) {
      if (onChange) {
        const clearVal = allOption ? "all" : "";
        const syntheticEvent = {
          target: { value: clearVal, name },
          currentTarget: { value: clearVal, name },
          valueOf: () => clearVal,
          toString: () => String(clearVal),
        };
        onChange(syntheticEvent, clearVal);
      }
      if (onClear) {
        onClear();
      }
    }
  };

  const handleTriggerClick = (e) => {
    if (disabled) return;
    if (e.target === inputRef.current) {
      return;
    }
    if (isOpen) {
      setIsOpen(false);
      setIsTyping(false);
      setSearchTerm("");
    } else {
      setIsOpen(true);
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        if (selectedOpt) {
          inputRef.current?.select();
        }
      });
    }
  };

  const handleKeyDown = (e) => {
    if (disabled) return;
    if (e.key === "Escape") {
      setIsOpen(false);
      setIsTyping(false);
      setSearchTerm("");
      inputRef.current?.blur();
    } else if (e.key === "Enter") {
      if (isOpen && filteredOptions.length > 0) {
        e.preventDefault();
        handleSelect(filteredOptions[0].value);
      }
    } else if (e.key === "ArrowDown" && !isOpen) {
      e.preventDefault();
      setIsOpen(true);
    }
  };

  // What text to show in the search input
  const inputValue = isTyping
    ? searchTerm
    : selectedOpt
    ? selectedOpt.label
    : "";

  // The close mark (x) MUST disappear if field is empty or user erased the text
  const hasActiveContent = isTyping
    ? searchTerm.trim() !== ""
    : Boolean(hasValue && selectedOpt && String(value).trim() !== "" && String(value).trim().toLowerCase() !== "all");

  const showClearButton = canClear && hasActiveContent;

  return (
    <div
      ref={containerRef}
      className={`custom-select-container ${className} ${disabled ? "disabled" : ""} ${isOpen ? "open" : ""}`}
      style={{ ...(minWidth ? { minWidth } : {}), ...style }}
      id={id}
    >
      <div
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className={`custom-select-trigger ${isOpen ? "open" : ""} ${disabled ? "disabled" : ""}`}
        onClick={handleTriggerClick}
        onKeyDown={handleKeyDown}
      >
        {icon && <span className="custom-select-left-icon">{icon}</span>}

        {isSearchable ? (
          <input
            ref={inputRef}
            type="text"
            className="custom-select-search-input"
            value={inputValue}
            placeholder={effectivePlaceholder}
            disabled={disabled}
            autoComplete="off"
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onClick={(e) => {
              e.stopPropagation();
              if (!isOpen) {
                setIsOpen(true);
              }
            }}
          />
        ) : (
          <span className="custom-select-label">{displayLabel}</span>
        )}

        <div className="custom-select-actions">
          {showClearButton && (
            <button
              type="button"
              className="custom-select-clear-btn"
              onClick={handleClear}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              tabIndex={-1}
              aria-label="Clear selection"
              title="Clear"
            >
              ×
            </button>
          )}
          <span
            className={`custom-select-arrow ${isOpen ? "open" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              handleTriggerClick(e);
            }}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#64748b"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`custom-select-chevron-svg ${isOpen ? "open" : ""}`}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </span>
        </div>
      </div>

      {isOpen && (
        <div className="custom-select-menu" role="listbox">
          <div className="custom-select-menu-scroll">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => {
                const isSelected = String(opt.value) === String(value);
                return (
                  <button
                    key={String(opt.value)}
                    type="button"
                    className={`custom-select-option ${isSelected ? "selected" : ""}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelect(opt.value);
                    }}
                    role="option"
                    aria-selected={isSelected}
                  >
                    {renderOption ? (
                      renderOption(opt, isSelected)
                    ) : (
                      <span>{opt.label}</span>
                    )}
                  </button>
                );
              })
            ) : (
              <div className="custom-select-empty">No options found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
