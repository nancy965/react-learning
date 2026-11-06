import { useEffect, useRef, useState } from "react";
import "./SearchableDropdown.css";

function SearchableDropdown({
  value,
  options = [],
  onChange,
  placeholder = "Search / select",
  searchPlaceholder,
  disabled = false,
  getOptionValue = (option) => option.id,
  getOptionLabel = (option) => option.name,
  onSearchChange,
  onOpen,
  onLoadMore,
  maxVisibleOptions = 4,
  icon,
  prefix,
  allowAll = false,
  className = "",
  style = {},
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [selectedOptionState, setSelectedOptionState] = useState(null);

  const dropdownRef = useRef(null);
  const inputRef = useRef(null);
  const openingRef = useRef(false);

  const selectedOptionFromOptions = options.find(
    (option) => String(getOptionValue(option)) === String(value),
  );

  useEffect(() => {
    if (selectedOptionFromOptions) {
      setSelectedOptionState(selectedOptionFromOptions);
    }

    if (!value) {
      setSelectedOptionState(null);
    }
  }, [value, selectedOptionFromOptions]);

  const selectedOption = selectedOptionFromOptions || selectedOptionState;

  const selectedLabel = selectedOption
    ? String(getOptionLabel(selectedOption))
    : (allowAll && (!value || String(value).toLowerCase() === "all") ? (placeholder || "") : "");

  const filteredOptions = options.filter((option) => {
    const optionVal = String(getOptionValue(option)).toLowerCase();
    const optionLbl = String(getOptionLabel(option)).trim().toLowerCase();
    if (optionVal === "all" || (optionVal === "" && optionLbl.startsWith("all "))) {
      return false;
    }

    if (!isTyping) {
      return true;
    }

    return optionLbl.includes(inputValue.toLowerCase());
  });

  useEffect(() => {
    if (!isOpen && !value && !allowAll) {
      setInputValue("");
      setIsTyping(false);
      return;
    }

    if (!isOpen && !isTyping && selectedLabel) {
      setInputValue(selectedLabel);
    }
  }, [value, selectedLabel, isOpen, isTyping]);

  useEffect(() => {
    if (!value && !isTyping && !allowAll) {
      setInputValue("");
      setIsTyping(false);
      setIsOpen(false);
      setSelectedOptionState(null);
      inputRef.current?.blur();
    }
  }, [value, isTyping]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setIsTyping(false);

        if (selectedLabel) {
          setInputValue(selectedLabel);
        } else {
          setInputValue("");
        }

        if (onSearchChange) {
          onSearchChange("");
        }
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [selectedLabel, onSearchChange]);

  const openDropdown = () => {
    if (disabled || openingRef.current) {
      return;
    }

    openingRef.current = true;

    setIsOpen(true);
    setIsTyping(false);
    setInputValue(selectedLabel);

    if (onOpen) {
      onOpen();
    }

    requestAnimationFrame(() => {
      if (inputRef.current) {
        inputRef.current.focus();

        if (selectedLabel) {
          inputRef.current.setSelectionRange(0, 0);
        }
      }

      openingRef.current = false;
    });
  };

  const handleInputFocus = () => {
    if (!isOpen) {
      openDropdown();
    }
  };

  const handleInputChange = (e) => {
    const newValue = e.target.value;

    if (value && !isTyping) {
      setIsTyping(true);
      setInputValue(newValue.slice(-1));

      onChange("");

      if (onSearchChange) {
        onSearchChange(newValue.slice(-1));
      }

      return;
    }

    setIsTyping(true);
    setInputValue(newValue);
    setIsOpen(true);

    if (newValue.trim() === "" && value) {
      onChange("");

      if (onSearchChange) {
        onSearchChange("");
      }

      return;
    }

    if (onSearchChange) {
      onSearchChange(newValue);
    }
  };

  const handleClear = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (disabled) return;

    onChange(allowAll ? "all" : "");
    setSelectedOptionState(null);
    setInputValue(allowAll ? (placeholder || "") : "");
    setIsTyping(false);
    setIsOpen(false);

    inputRef.current?.blur();

    if (onSearchChange) {
      onSearchChange("");
    }
  };

  const handleArrowClick = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (disabled) return;

    if (isOpen) {
      const trimmedValue = inputValue.trim();

      if (value && trimmedValue === "") {
        onChange("");
        setSelectedOptionState(null);
        setInputValue("");
      } else if (selectedLabel) {
        setInputValue(selectedLabel);
      } else {
        setInputValue("");
      }

      setIsOpen(false);
      setIsTyping(false);

      if (onSearchChange) {
        onSearchChange("");
      }

      return;
    }

    openDropdown();
  };

  const handleOptionsScroll = (e) => {
    if (!onLoadMore) return;

    const element = e.currentTarget;

    const isNearBottom =
      element.scrollTop + element.clientHeight >= element.scrollHeight - 20;

    if (isNearBottom) {
      onLoadMore();
    }
  };

  const handleSelect = (option) => {
    const optionValue = getOptionValue(option);
    const optionLabel = getOptionLabel(option);

    setSelectedOptionState(option);

    onChange(optionValue);

    setInputValue(optionLabel);
    setIsTyping(false);
    setIsOpen(false);

    if (onSearchChange) {
      onSearchChange("");
    }

    inputRef.current?.blur();
  };

  return (
    <div
      className={`searchable-dropdown ${disabled ? "disabled" : ""} ${className}`}
      style={style}
      ref={dropdownRef}
    >
      <div className="searchable-dropdown-input-wrapper">
        {icon && <span className="searchable-dropdown-left-icon">{icon}</span>}
        {prefix && <span className="searchable-dropdown-prefix-label">{prefix}</span>}
        <input
          ref={inputRef}
          type="text"
          className="searchable-dropdown-input"
          value={inputValue}
          placeholder={!selectedOption ? (searchPlaceholder || placeholder || "Search...") : ""}
          disabled={disabled}
          onFocus={handleInputFocus}
          onChange={handleInputChange}
          autoComplete="off"
        />

        {value && String(value).toLowerCase() !== "all" && (
          <button
            type="button"
            className="searchable-dropdown-clear-button"
            onMouseDown={handleClear}
            disabled={disabled}
            tabIndex="-1"
            aria-label="Clear selection"
          >
            ×
          </button>
        )}

        <button
          type="button"
          className={`searchable-dropdown-arrow-button ${isOpen ? "open" : ""}`}
          onMouseDown={handleArrowClick}
          disabled={disabled}
          tabIndex="-1"
        >
          <span>▾</span>
        </button>
      </div>

      {isOpen && !disabled && (
        <div className="searchable-dropdown-menu">
          <div
            className="searchable-dropdown-options"
            style={{
              maxHeight: `${maxVisibleOptions * 40}px`,
            }}
            onScroll={handleOptionsScroll}
          >
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => {
                const optionValue = getOptionValue(option);

                const optionLabel = getOptionLabel(option);

                const isSelected = String(optionValue) === String(value);

                return (
                  <button
                    key={optionValue}
                    type="button"
                    className={`searchable-dropdown-option ${
                      isSelected ? "selected" : ""
                    }`}
                    onClick={() => handleSelect(option)}
                  >
                    <span>{optionLabel}</span>

                    {isSelected && (
                      <span className="searchable-dropdown-check">✓</span>
                    )}
                  </button>
                );
              })
            ) : (
              <div className="searchable-dropdown-empty">No results found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default SearchableDropdown;
