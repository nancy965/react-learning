import { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useTheme } from "../context/ThemeContext";
import "./CustomDatePicker.css";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const WEEKDAY_NAMES = ["S", "M", "T", "W", "T", "F", "S"];

const CURRENT_YEAR = new Date().getFullYear();
const START_YEAR = 1950;

function padZero(num) {
  return String(num).padStart(2, "0");
}

function parseDateString(str) {
  if (!str) return null;
  const match = String(str).slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10) - 1; // 0-based
  const day = parseInt(match[3], 10);
  return { year, month, day };
}

function parseTimeString(str) {
  if (!str) return null;
  const match = String(str).match(/[T ](\d{1,2}):(\d{2})/);
  if (!match) return null;
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  return { hours, minutes };
}

function formatTime12(hours, minutes) {
  const ampm = hours >= 12 ? "PM" : "AM";
  const h12 = hours % 12 || 12;
  return `${padZero(h12)}:${padZero(minutes)} ${ampm}`;
}

function parseUserTime(input, fallbackHours = 8, fallbackMinutes = 0) {
  if (!input || typeof input !== "string") return null;
  const raw = input.trim();
  if (!raw) return null;

  // 1. Detect AM / PM intent
  let ampm = null;
  if (/am|a\.m\.|a\b/i.test(raw)) {
    ampm = "AM";
  } else if (/pm|p\.m\.|p\b/i.test(raw)) {
    ampm = "PM";
  }

  // 2. Extract digits and separators (: or .)
  const cleaned = raw.replace(/[^\d:.]/g, "");
  if (!cleaned) return null;

  let h = 0;
  let m = 0;

  if (cleaned.includes(":") || cleaned.includes(".")) {
    const parts = cleaned.split(/[:.]/);
    h = parseInt(parts[0], 10);
    m = parts[1] !== undefined && parts[1] !== "" ? parseInt(parts[1], 10) : 0;
  } else {
    // Pure numbers: "1", "01", "10", "130", "1030"
    if (cleaned.length <= 2) {
      h = parseInt(cleaned, 10);
      m = 0;
    } else if (cleaned.length === 3) {
      h = parseInt(cleaned.slice(0, 1), 10);
      m = parseInt(cleaned.slice(1), 10);
    } else if (cleaned.length === 4) {
      h = parseInt(cleaned.slice(0, 2), 10);
      m = parseInt(cleaned.slice(2), 10);
    } else {
      return null;
    }
  }

  if (isNaN(h) || isNaN(m) || m < 0 || m > 59) return null;

  // If user provided AM/PM
  if (ampm) {
    if (h < 1 || h > 12) return null;
    if (ampm === "PM" && h < 12) h += 12;
    if (ampm === "AM" && h === 12) h = 0;
    return { hours: h, minutes: m };
  }

  // If 24-hr format (13..23)
  if (h >= 13 && h <= 23) {
    return { hours: h, minutes: m };
  }

  // If 0..12:
  if (h >= 0 && h <= 12) {
    const isCurrentlyPm = fallbackHours >= 12;
    if (h === 12) {
      h = isCurrentlyPm ? 12 : 0;
    } else if (h === 0) {
      h = 0;
    } else {
      h = isCurrentlyPm ? h + 12 : h;
    }
    return { hours: h, minutes: m };
  }

  return null;
}

function toDateString(year, month, day) {
  return `${year}-${padZero(month + 1)}-${padZero(day)}`;
}

function formatDisplayDate(str) {
  const parsed = parseDateString(str);
  if (!parsed) return "";
  return `${padZero(parsed.day)}-${padZero(parsed.month + 1)}-${parsed.year}`;
}

function formatDisplayDateTime(str) {
  const parsedDate = parseDateString(str);
  if (!parsedDate) return "";
  const d = padZero(parsedDate.day);
  const m = padZero(parsedDate.month + 1);
  const y = parsedDate.year;
  const parsedTime = parseTimeString(str);
  if (!parsedTime) {
    return `${d}-${m}-${y}`;
  }
  const ampm = parsedTime.hours >= 12 ? "PM" : "AM";
  const h12 = parsedTime.hours % 12 || 12;
  return `${d}-${m}-${y}  ${padZero(h12)}:${padZero(parsedTime.minutes)} ${ampm}`;
}

export default function CustomDatePicker({
  value = "",
  onChange,
  min = "",
  max = "",
  placeholder = "dd-mm-yyyy",
  disabled = false,
  className = "",
  id,
  name,
  required = false,
  autoFocus = false,
  showTime = false,
  allowFutureYears = false,
  initiallyOpen = false,
  inline = false,
}) {
  const [isOpen, setIsOpen] = useState(() => !!(initiallyOpen || autoFocus));

  const effectiveAllowFuture = allowFutureYears || showTime;
  const maxYear = effectiveAllowFuture ? CURRENT_YEAR + 10 : CURRENT_YEAR;
  const yearsList = useMemo(() => {
    return Array.from(
      { length: Math.max(1, maxYear - START_YEAR + 1) },
      (_, i) => START_YEAR + i
    );
  }, [maxYear]);
  const containerRef = useRef(null);
  const popoverRef = useRef(null);

  const themeContext = useTheme();
  const theme = themeContext?.theme || "light";

  // Month & Year dropdown menu states and refs
  const [activeDropdown, setActiveDropdown] = useState(null); // 'month' | 'year' | null
  const monthDropdownRef = useRef(null);
  const yearDropdownRef = useRef(null);
  const yearListRef = useRef(null);
  const selectedYearRef = useRef(null);

  const [popoverStyle, setPopoverStyle] = useState({});
  const [isFlippedUp, setIsFlippedUp] = useState(false);

  const today = useMemo(() => {
    const d = new Date();
    return {
      year: d.getFullYear(),
      month: d.getMonth(),
      day: d.getDate(),
      str: toDateString(d.getFullYear(), d.getMonth(), d.getDate()),
    };
  }, []);

  const parsedValue = useMemo(() => parseDateString(value), [value]);
  const parsedMin = useMemo(() => parseDateString(min), [min]);
  const parsedMax = useMemo(() => parseDateString(max), [max]);

  // Viewing month and year in calendar
  const [viewYear, setViewYear] = useState(() => {
    if (parsedValue) return Math.min(parsedValue.year, maxYear);
    if (parsedMin) return Math.min(parsedMin.year, maxYear);
    return Math.min(today.year, maxYear);
  });

  const [viewMonth, setViewMonth] = useState(() => {
    if (parsedValue) return parsedValue.month;
    if (parsedMin) return parsedMin.month;
    return today.month;
  });

  // Calculate popover fixed position to prevent scrollbar on page
  const updatePopoverPosition = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const popoverHeight = showTime ? 430 : 340;
    const popoverWidth = 310;

    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    // Flip up if space below is too tight and space above has more room
    const openUp = spaceBelow < popoverHeight && spaceAbove > spaceBelow;

    const style = {
      position: "fixed",
      zIndex: 9999999,
      width: "310px",
    };

    if (openUp) {
      style.bottom = `${Math.max(8, window.innerHeight - rect.top + 6)}px`;
      style.top = "auto";
    } else {
      style.top = `${Math.max(8, rect.bottom + 6)}px`;
      style.bottom = "auto";
    }

    if (rect.left + popoverWidth > window.innerWidth) {
      style.right = `${Math.max(8, window.innerWidth - rect.right)}px`;
      style.left = "auto";
    } else {
      style.left = `${Math.max(8, rect.left)}px`;
      style.right = "auto";
    }

    setPopoverStyle(style);
    setIsFlippedUp(openUp);
  };

  // Re-calculate position on scroll/resize and close if scrolled out of view
  useEffect(() => {
    if (!isOpen) return;
    updatePopoverPosition();

    const handleScrollOrResize = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.bottom < -40 || rect.top > window.innerHeight + 40) {
        setIsOpen(false);
        setActiveDropdown(null);
        return;
      }
      updatePopoverPosition();
    };

    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);

    return () => {
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [isOpen]);

  // When value or min changes from outside, sync view if calendar opened
  useEffect(() => {
    if (parsedValue) {
      setViewYear(Math.min(parsedValue.year, maxYear));
      setViewMonth(parsedValue.month);
    } else if (parsedMin) {
      if (viewYear < parsedMin.year) {
        setViewYear(Math.min(parsedMin.year, maxYear));
        setViewMonth(parsedMin.month);
      } else if (viewYear === parsedMin.year && viewMonth < parsedMin.month) {
        setViewMonth(parsedMin.month);
      }
    }
  }, [parsedValue, parsedMin, maxYear]);

  // Handle outside click to close popover
  useEffect(() => {
    const handleOutsideClick = (e) => {
      const clickedInsideInput =
        containerRef.current && containerRef.current.contains(e.target);
      const clickedInsidePopover =
        popoverRef.current && popoverRef.current.contains(e.target);

      if (!clickedInsideInput && !clickedInsidePopover) {
        setIsOpen(false);
        setActiveDropdown(null);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isOpen]);

  // Reset dropdown when popover closes
  useEffect(() => {
    if (!isOpen) {
      setActiveDropdown(null);
    }
  }, [isOpen]);

  // Handle outside click to close month/year dropdown menu
  useEffect(() => {
    const handleDropdownOutsideClick = (e) => {
      if (
        monthDropdownRef.current &&
        !monthDropdownRef.current.contains(e.target) &&
        yearDropdownRef.current &&
        !yearDropdownRef.current.contains(e.target)
      ) {
        setActiveDropdown(null);
      }
    };
    if (activeDropdown) {
      document.addEventListener("mousedown", handleDropdownOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleDropdownOutsideClick);
    };
  }, [activeDropdown]);

  // Auto-scroll year list to the currently selected year
  useEffect(() => {
    if (activeDropdown === "year" && selectedYearRef.current && yearListRef.current) {
      const container = yearListRef.current;
      const item = selectedYearRef.current;
      container.scrollTop =
        item.offsetTop - container.clientHeight / 2 + item.clientHeight / 2;
    }
  }, [activeDropdown, viewYear]);

  const isPrevMonthDisabled = useMemo(() => {
    if (viewYear <= START_YEAR && viewMonth <= 0) return true;
    if (!parsedMin) return false;
    if (viewYear < parsedMin.year) return true;
    if (viewYear === parsedMin.year && viewMonth <= parsedMin.month) return true;
    return false;
  }, [viewYear, viewMonth, parsedMin]);

  const isNextMonthDisabled = useMemo(() => {
    if (viewYear >= maxYear && viewMonth >= 11) return true;
    if (!parsedMax) return false;
    if (viewYear > parsedMax.year) return true;
    if (viewYear === parsedMax.year && viewMonth >= parsedMax.month) return true;
    return false;
  }, [viewYear, viewMonth, maxYear, parsedMax]);

  const handlePrevMonth = (e) => {
    e.stopPropagation();
    setActiveDropdown(null);
    if (isPrevMonthDisabled) return;
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((prev) => prev - 1);
    } else {
      setViewMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = (e) => {
    e.stopPropagation();
    setActiveDropdown(null);
    if (isNextMonthDisabled) return;
    if (viewMonth === 11) {
      if (viewYear < maxYear) {
        setViewMonth(0);
        setViewYear((prev) => prev + 1);
      }
    } else {
      setViewMonth((prev) => prev + 1);
    }
  };

  // Calendar Days Calculation
  const calendarCells = useMemo(() => {
    const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay(); // 0 = Sun
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    const cells = [];

    // Empty cells before the 1st
    for (let i = 0; i < firstDayIndex; i++) {
      cells.push({ type: "empty", key: `empty-${i}` });
    }

    // Days in the current month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = toDateString(viewYear, viewMonth, day);
      const isSelected = parsedValue
        ? parsedValue.year === viewYear &&
          parsedValue.month === viewMonth &&
          parsedValue.day === day
        : false;

      const isToday =
        today.year === viewYear &&
        today.month === viewMonth &&
        today.day === day;

      const minDateOnly = min ? String(min).slice(0, 10) : "";
      const maxDateOnly = max ? String(max).slice(0, 10) : "";
      const isDisabled = Boolean(
        (minDateOnly && dateStr < minDateOnly) || (maxDateOnly && dateStr > maxDateOnly)
      );

      cells.push({
        type: "day",
        day,
        dateStr,
        isSelected,
        isToday,
        isDisabled,
        key: `day-${day}`,
      });
    }

    return cells;
  }, [viewYear, viewMonth, parsedValue, today, min, max]);

  // Time selection states for showTime mode
  const [timeHours, setTimeHours] = useState(() => {
    const parsedTime = parseTimeString(value);
    return parsedTime ? parsedTime.hours : 8; // default 8 AM
  });
  const [timeMinutes, setTimeMinutes] = useState(() => {
    const parsedTime = parseTimeString(value);
    return parsedTime ? parsedTime.minutes : 0; // default :00
  });

  const minuteOptions = useMemo(() => {
    const base = Array.from({ length: 12 }, (_, i) => padZero(i * 5));
    const currentMinStr = padZero(timeMinutes);
    if (!base.includes(currentMinStr)) {
      return [...base, currentMinStr].sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
    }
    return base;
  }, [timeMinutes]);

  const isTimeInputFocusedRef = useRef(false);

  const [timeInputText, setTimeInputText] = useState(() =>
    formatTime12(timeHours, timeMinutes)
  );

  // Only synchronize timeInputText when user is NOT actively typing
  useEffect(() => {
    if (!isTimeInputFocusedRef.current) {
      setTimeInputText(formatTime12(timeHours, timeMinutes));
    }
  }, [timeHours, timeMinutes]);

  // Handle typing: permit complete freedom to erase, backspace, and write without interruption
  const handleTimeInputChange = (e) => {
    setTimeInputText(e.target.value);
  };

  const commitTimeInput = () => {
    isTimeInputFocusedRef.current = false;
    const parsed = parseUserTime(timeInputText, timeHours, timeMinutes);
    if (parsed) {
      handleTimeChange(parsed.hours, parsed.minutes);
      setTimeInputText(formatTime12(parsed.hours, parsed.minutes));
    } else {
      // Restore valid formatted time if input is blank or unparseable
      setTimeInputText(formatTime12(timeHours, timeMinutes));
    }
  };

  const handleTimeInputBlur = () => {
    commitTimeInput();
  };

  useEffect(() => {
    const parsedTime = parseTimeString(value);
    if (parsedTime) {
      setTimeHours(parsedTime.hours);
      setTimeMinutes(parsedTime.minutes);
    }
  }, [value]);

  const handleTimeChange = (newHours, newMinutes) => {
    setTimeHours(newHours);
    setTimeMinutes(newMinutes);

    let currentDateStr = value ? String(value).slice(0, 10) : "";
    if (!currentDateStr || !parseDateString(currentDateStr)) {
      currentDateStr = toDateString(viewYear, viewMonth, today.day);
    }

    const finalDateTimeStr = `${currentDateStr}T${padZero(newHours)}:${padZero(newMinutes)}`;
    if (onChange) {
      onChange({
        target: {
          value: finalDateTimeStr,
          name: name || id,
          id,
        },
      });
    }
  };

  const handleSelectDay = (dateStr, isDisabled) => {
    if (isDisabled || disabled) return;
    if (showTime) {
      let h = timeHours;
      let m = timeMinutes;
      const parsed = parseUserTime(timeInputText, timeHours, timeMinutes);
      if (parsed) {
        h = parsed.hours;
        m = parsed.minutes;
        setTimeHours(h);
        setTimeMinutes(m);
        setTimeInputText(formatTime12(h, m));
      }
      const finalDateTimeStr = `${dateStr}T${padZero(h)}:${padZero(m)}`;
      if (onChange) {
        onChange({
          target: {
            value: finalDateTimeStr,
            name: name || id,
            id,
          },
        });
      }
    } else {
      setIsOpen(false);
      if (onChange) {
        onChange({
          target: {
            value: dateStr,
            name: name || id,
            id,
          },
        });
      }
    }
  };

  const handleClear = (e) => {
    e.stopPropagation();
    if (disabled) return;
    if (onChange) {
      onChange({
        target: {
          value: "",
          name: name || id,
          id,
        },
      });
    }
  };

  // Inline rendering for centered modals / embedded dialogs
  if (inline) {
    return (
      <div
        ref={containerRef}
        className={`custom-datepicker-inline-wrap ${className} ${theme === "dark" ? "dark-theme" : "light-theme"}`}
        id={id}
      >
        {/* Header with Navigation and Month/Year Dropdowns */}
        <div className="custom-datepicker-header">
          <button
            type="button"
            className="custom-datepicker-nav-btn"
            onClick={handlePrevMonth}
            disabled={isPrevMonthDisabled}
            title={isPrevMonthDisabled ? "Previous dates not available" : "Previous month"}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          <div className="custom-datepicker-header-selectors">
            {/* Month Dropdown */}
            <div
              className="custom-datepicker-dropdown-container"
              ref={monthDropdownRef}
            >
              <button
                type="button"
                className={`custom-datepicker-header-btn ${
                  activeDropdown === "month" ? "active" : ""
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveDropdown((prev) =>
                    prev === "month" ? null : "month"
                  );
                }}
                title="Select month"
              >
                <span>{MONTH_NAMES[viewMonth]}</span>
                <svg
                  className={`custom-datepicker-header-arrow ${
                    activeDropdown === "month" ? "open" : ""
                  }`}
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {activeDropdown === "month" && (
                <div
                  className="custom-datepicker-dropdown-menu month-menu"
                  onClick={(e) => e.stopPropagation()}
                >
                  {MONTH_NAMES.map((name, idx) => {
                    const isSelected = viewMonth === idx;
                    const isMonthDisabled = Boolean(
                      (parsedMin &&
                        (viewYear < parsedMin.year ||
                          (viewYear === parsedMin.year && idx < parsedMin.month))) ||
                      (parsedMax &&
                        (viewYear > parsedMax.year ||
                          (viewYear === parsedMax.year && idx > parsedMax.month)))
                    );
                    return (
                      <button
                        key={name}
                        type="button"
                        disabled={isMonthDisabled}
                        className={`custom-datepicker-dropdown-item ${
                          isSelected ? "selected" : ""
                        } ${isMonthDisabled ? "disabled" : ""}`}
                        onClick={() => {
                          if (isMonthDisabled) return;
                          setViewMonth(idx);
                          setActiveDropdown(null);
                        }}
                      >
                        {name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Year Dropdown */}
            <div
              className="custom-datepicker-dropdown-container"
              ref={yearDropdownRef}
            >
              <button
                type="button"
                className={`custom-datepicker-header-btn ${
                  activeDropdown === "year" ? "active" : ""
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveDropdown((prev) =>
                    prev === "year" ? null : "year"
                  );
                }}
                title="Select year"
              >
                <span>{viewYear}</span>
                <svg
                  className={`custom-datepicker-header-arrow ${
                    activeDropdown === "year" ? "open" : ""
                  }`}
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {activeDropdown === "year" && (
                <div
                  className="custom-datepicker-dropdown-menu year-menu"
                  ref={yearListRef}
                  onClick={(e) => e.stopPropagation()}
                >
                  {yearsList.map((yr) => {
                    const isSelected = viewYear === yr;
                    const isYearDisabled = Boolean(
                      (parsedMin && yr < parsedMin.year) ||
                      (parsedMax && yr > parsedMax.year)
                    );
                    return (
                      <button
                        key={yr}
                        ref={isSelected ? selectedYearRef : null}
                        type="button"
                        disabled={isYearDisabled}
                        className={`custom-datepicker-dropdown-item ${
                          isSelected ? "selected" : ""
                        } ${isYearDisabled ? "disabled" : ""}`}
                        onClick={() => {
                          if (isYearDisabled) return;
                          setViewYear(yr);
                          if (parsedMin && yr === parsedMin.year && viewMonth < parsedMin.month) {
                            setViewMonth(parsedMin.month);
                          }
                          setActiveDropdown(null);
                        }}
                      >
                        {yr}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            className="custom-datepicker-nav-btn"
            onClick={handleNextMonth}
            disabled={isNextMonthDisabled}
            title={isNextMonthDisabled ? "Future dates not available" : "Next month"}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>

        {/* Weekday Names */}
        <div className="custom-datepicker-weekdays">
          {WEEKDAY_NAMES.map((name, idx) => (
            <span key={idx} className="custom-datepicker-weekday">
              {name}
            </span>
          ))}
        </div>

        {/* Days Grid */}
        <div className="custom-datepicker-days-grid">
          {calendarCells.map((cell) => {
            if (cell.type === "empty") {
              return (
                <span
                  key={cell.key}
                  className="custom-datepicker-day-cell empty"
                />
              );
            }

            let cellClasses = "custom-datepicker-day-cell";
            if (cell.isSelected) cellClasses += " selected";
            else if (cell.isToday) cellClasses += " today";
            if (cell.isDisabled) cellClasses += " disabled";

            return (
              <button
                key={cell.key}
                type="button"
                className={cellClasses}
                onClick={() => handleSelectDay(cell.dateStr, cell.isDisabled)}
                disabled={cell.isDisabled}
              >
                {cell.day}
              </button>
            );
          })}
        </div>

        {/* Time Selector Section for showTime */}
        {showTime && (
          <div className="custom-datepicker-time-section">
            <div className="custom-datepicker-time-row">
              <div className="custom-datepicker-time-label">
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <span>Time</span>
              </div>

              <div className="custom-datepicker-time-controls">
                <input
                  type="text"
                  className="custom-datepicker-time-text-input"
                  value={timeInputText}
                  onFocus={() => {
                    isTimeInputFocusedRef.current = true;
                  }}
                  onChange={handleTimeInputChange}
                  onBlur={handleTimeInputBlur}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      commitTimeInput();
                      e.target.blur();
                    }
                  }}
                  placeholder="10:46 AM"
                  title="Type time (e.g. 10:46 AM, 1:00 PM, 2pm)"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  const displayString = showTime ? formatDisplayDateTime(value) : formatDisplayDate(value);

  return (
    <div
      ref={containerRef}
      className={`custom-datepicker-wrap ${className} ${disabled ? "disabled" : ""} ${isOpen ? "open" : ""}`}
      id={id ? `${id}-wrapper` : undefined}
    >
      <div
        className={`custom-datepicker-input-box ${isOpen ? "active" : ""} ${disabled ? "disabled" : ""}`}
        onClick={() => {
          if (!disabled) {
            if (!isOpen) {
              updatePopoverPosition();
            }
            setIsOpen((prev) => !prev);
          }
        }}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (!disabled) {
              if (!isOpen) updatePopoverPosition();
              setIsOpen((prev) => !prev);
            }
          } else if (e.key === "Escape") {
            setIsOpen(false);
          }
        }}
      >
        <span
          className={`custom-datepicker-value ${!displayString ? "placeholder" : ""}`}
        >
          {displayString || placeholder}
        </span>

        <div className="custom-datepicker-icons">
          {value && !disabled && (
            <button
              type="button"
              className="custom-datepicker-clear-btn"
              onClick={handleClear}
              title="Clear date"
            >
              ×
            </button>
          )}
          <span className="custom-datepicker-calendar-icon">
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </span>
        </div>
      </div>

      {isOpen && !disabled &&
        createPortal(
          <div
            ref={popoverRef}
            className={`custom-datepicker-popover ${theme === "dark" ? "dark-theme" : "light-theme"} ${isFlippedUp ? "flipped-up" : ""}`}
            style={popoverStyle}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with Navigation and Month/Year Dropdowns */}
            <div className="custom-datepicker-header">
              <button
                type="button"
                className="custom-datepicker-nav-btn"
                onClick={handlePrevMonth}
                disabled={isPrevMonthDisabled}
                title={isPrevMonthDisabled ? "Previous dates not available" : "Previous month"}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>

              <div className="custom-datepicker-header-selectors">
                {/* Month Selector */}
                <div
                  className="custom-datepicker-dropdown-container"
                  ref={monthDropdownRef}
                >
                  <button
                    type="button"
                    className={`custom-datepicker-header-btn ${
                      activeDropdown === "month" ? "active" : ""
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveDropdown((prev) =>
                        prev === "month" ? null : "month"
                      );
                    }}
                    title="Select month"
                  >
                    <span>{MONTH_NAMES[viewMonth]}</span>
                    <svg
                      className={`custom-datepicker-header-arrow ${
                        activeDropdown === "month" ? "open" : ""
                      }`}
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>

                  {activeDropdown === "month" && (
                    <div
                      className="custom-datepicker-dropdown-menu month-menu"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {MONTH_NAMES.map((name, index) => {
                        const isSelected = viewMonth === index;
                        const isMonthDisabled = Boolean(
                          (parsedMin &&
                            (viewYear < parsedMin.year ||
                              (viewYear === parsedMin.year && index < parsedMin.month))) ||
                          (parsedMax &&
                            (viewYear > parsedMax.year ||
                              (viewYear === parsedMax.year && index > parsedMax.month)))
                        );
                        return (
                          <button
                            key={name}
                            type="button"
                            disabled={isMonthDisabled}
                            className={`custom-datepicker-dropdown-item ${
                              isSelected ? "selected" : ""
                            } ${isMonthDisabled ? "disabled" : ""}`}
                            onClick={() => {
                              if (isMonthDisabled) return;
                              setViewMonth(index);
                              setActiveDropdown(null);
                            }}
                          >
                            {name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Year Selector */}
                <div
                  className="custom-datepicker-dropdown-container"
                  ref={yearDropdownRef}
                >
                  <button
                    type="button"
                    className={`custom-datepicker-header-btn ${
                      activeDropdown === "year" ? "active" : ""
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveDropdown((prev) =>
                        prev === "year" ? null : "year"
                      );
                    }}
                    title="Select year"
                  >
                    <span>{viewYear}</span>
                    <svg
                      className={`custom-datepicker-header-arrow ${
                        activeDropdown === "year" ? "open" : ""
                      }`}
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>

                  {activeDropdown === "year" && (
                    <div
                      className="custom-datepicker-dropdown-menu year-menu"
                      ref={yearListRef}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {yearsList.map((yr) => {
                        const isSelected = viewYear === yr;
                        const isYearDisabled = Boolean(
                          (parsedMin && yr < parsedMin.year) ||
                          (parsedMax && yr > parsedMax.year)
                        );
                        return (
                          <button
                            key={yr}
                            ref={isSelected ? selectedYearRef : null}
                            type="button"
                            disabled={isYearDisabled}
                            className={`custom-datepicker-dropdown-item ${
                              isSelected ? "selected" : ""
                            } ${isYearDisabled ? "disabled" : ""}`}
                            onClick={() => {
                              if (isYearDisabled) return;
                              setViewYear(yr);
                              if (parsedMin && yr === parsedMin.year && viewMonth < parsedMin.month) {
                                setViewMonth(parsedMin.month);
                              }
                              setActiveDropdown(null);
                            }}
                          >
                            {yr}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <button
                type="button"
                className="custom-datepicker-nav-btn"
                onClick={handleNextMonth}
                disabled={isNextMonthDisabled}
                title={isNextMonthDisabled ? "Future dates not available" : "Next month"}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>

            {/* Weekday Names */}
            <div className="custom-datepicker-weekdays">
              {WEEKDAY_NAMES.map((name, idx) => (
                <span key={idx} className="custom-datepicker-weekday">
                  {name}
                </span>
              ))}
            </div>

            {/* Days Grid */}
            <div className="custom-datepicker-days-grid">
              {calendarCells.map((cell) => {
                if (cell.type === "empty") {
                  return (
                    <span
                      key={cell.key}
                      className="custom-datepicker-day-cell empty"
                    />
                  );
                }

                let cellClasses = "custom-datepicker-day-cell";
                if (cell.isSelected) cellClasses += " selected";
                else if (cell.isToday) cellClasses += " today";
                if (cell.isDisabled) cellClasses += " disabled";

                return (
                  <button
                    key={cell.key}
                    type="button"
                    className={cellClasses}
                    onClick={() => handleSelectDay(cell.dateStr, cell.isDisabled)}
                    disabled={cell.isDisabled}
                  >
                    {cell.day}
                  </button>
                );
              })}
            </div>

            {/* Time Selector Section for showTime */}
            {showTime && (
              <div className="custom-datepicker-time-section">
                <div className="custom-datepicker-time-row">
                  <div className="custom-datepicker-time-label">
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#2563eb"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    <span>Time</span>
                  </div>

                  <div className="custom-datepicker-time-controls">
                    <input
                      type="text"
                      className="custom-datepicker-time-text-input"
                      value={timeInputText}
                      onFocus={() => {
                        isTimeInputFocusedRef.current = true;
                      }}
                      onChange={handleTimeInputChange}
                      onBlur={handleTimeInputBlur}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          commitTimeInput();
                          e.target.blur();
                        }
                      }}
                      placeholder="10:46 AM"
                      title="Type time (e.g. 10:46 AM, 1:00 PM, 2pm)"
                    />
                  </div>
                </div>

                {/* Dedicated Footer with Done button completely inside card */}
                <div className="custom-datepicker-footer">
                  <button
                    type="button"
                    className="custom-datepicker-done-btn"
                    onClick={() => setIsOpen(false)}
                    title="Done"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>,
          document.body
        )}
    </div>
  );
}
