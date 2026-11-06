import React, { useState, useEffect, useRef } from "react";
import "./SnoozeEmailModal.css";
import CustomDatePicker from "./CustomDatePicker";

function SnoozeEmailModal({
  isOpen,
  email,
  anchorRect,
  onClose,
  onSnooze,
  onUnsnooze,
}) {
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [customDateTime, setCustomDateTime] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const cardRef = useRef(null);

  useEffect(() => {
    if (!isOpen || showCustomPicker) return;

    const handleOutsideClick = (e) => {
      if (cardRef.current && !cardRef.current.contains(e.target)) {
        onClose();
      }
    };

    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleOutsideClick);
    }, 20);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isOpen, showCustomPicker, onClose]);

  useEffect(() => {
    if (isOpen) {
      setShowCustomPicker(false);
      setCustomDateTime("");
    }
  }, [isOpen, email]);

  if (!isOpen || !email) return null;

  // Calculate preset timestamps
  const now = new Date();

  // 1. Later Today (6:00 PM today, or +3 hours if already past 5 PM)
  const laterToday = new Date(now);
  if (now.getHours() >= 17) {
    laterToday.setHours(now.getHours() + 3, 0, 0, 0);
  } else {
    laterToday.setHours(18, 0, 0, 0);
  }

  // 2. Tomorrow Morning (Tomorrow 8:00 AM)
  const tomorrowMorning = new Date(now);
  tomorrowMorning.setDate(tomorrowMorning.getDate() + 1);
  tomorrowMorning.setHours(8, 0, 0, 0);

  // 3. This Weekend (Saturday 8:00 AM)
  const thisWeekend = new Date(now);
  const dayOfWeek = now.getDay(); // 0 is Sunday, 6 is Saturday
  const daysUntilSaturday = (6 - dayOfWeek + 7) % 7 || 7;
  thisWeekend.setDate(now.getDate() + daysUntilSaturday);
  thisWeekend.setHours(8, 0, 0, 0);

  // 4. Next Week (Next Monday 8:00 AM)
  const nextWeek = new Date(now);
  const daysUntilMonday = (1 - dayOfWeek + 7) % 7 || 7;
  nextWeek.setDate(now.getDate() + daysUntilMonday);
  nextWeek.setHours(8, 0, 0, 0);

  const presets = [
    {
      id: "later_today",
      title: "Later today",
      time: laterToday,
      label: laterToday.toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      }),
    },
    {
      id: "tomorrow",
      title: "Tomorrow",
      time: tomorrowMorning,
      label: `${tomorrowMorning.toLocaleDateString([], { weekday: "short" })}, 8:00 AM`,
    },
    {
      id: "weekend",
      title: "This weekend",
      time: thisWeekend,
      label: `${thisWeekend.toLocaleDateString([], { weekday: "short" })}, 8:00 AM`,
    },
    {
      id: "next_week",
      title: "Next week",
      time: nextWeek,
      label: `${nextWeek.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}, 8:00 AM`,
    },
  ];

  const handleApplySnooze = async (targetDate) => {
    try {
      setSubmitting(true);
      await onSnooze(email.id, targetDate.toISOString());
      onClose();
    } catch (err) {
      console.error("Failed to snooze email:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCustomSubmit = () => {
    if (!customDateTime) return;
    const dt = new Date(customDateTime);
    if (isNaN(dt.getTime()) || dt.getTime() <= Date.now()) {
      alert("Please select a future date and time.");
      return;
    }
    handleApplySnooze(dt);
  };

  const handleApplyUnsnooze = async () => {
    try {
      setSubmitting(true);
      if (onUnsnooze) await onUnsnooze(email.id);
      onClose();
    } catch (err) {
      console.error("Failed to unsnooze email:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const isCurrentlySnoozed =
    email.snoozed_until && new Date(email.snoozed_until).getTime() > Date.now();

  const getDropdownStyle = () => {
    if (!anchorRect) return {};
    const popoverWidth = 280;
    const popoverHeight = 310;
    const margin = 10;

    // Align right edge with snooze button's right edge
    let left = anchorRect.right - popoverWidth;
    if (left < margin) {
      left = Math.max(margin, anchorRect.left);
    }
    if (left + popoverWidth > window.innerWidth - margin) {
      left = window.innerWidth - popoverWidth - margin;
    }

    let top = anchorRect.bottom + 6;
    // If popover goes off-screen at bottom, flip above button
    if (top + popoverHeight > window.innerHeight - margin) {
      const topAbove = anchorRect.top - popoverHeight - 6;
      if (topAbove >= margin) {
        top = topAbove;
      }
    }

    return {
      top: `${top}px`,
      left: `${left}px`,
    };
  };

  // State 2: Custom Date & Time Picker -> Centered modal popup in the middle of screen
  if (showCustomPicker) {
    return (
      <div
        className="snooze-modal-backdrop snooze-backdrop-centered"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          className="snooze-modal-card snooze-card-centered"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="snooze-modal-header">
            <div className="snooze-header-title">
              <span className="snooze-icon">📅</span>
              <span>Pick date &amp; time</span>
            </div>
            <button
              type="button"
              className="snooze-close-btn"
              onClick={onClose}
              title="Close"
            >
              ✕
            </button>
          </div>

          <div className="snooze-custom-body">
            <div className="snooze-back-row">
              <button
                type="button"
                className="btn-snooze-back"
                onClick={() => setShowCustomPicker(false)}
              >
                ← Back to presets
              </button>
            </div>
            <CustomDatePicker
              showTime={true}
              allowFutureYears={true}
              inline={true}
              min={new Date().toISOString().slice(0, 10)}
              value={customDateTime}
              onChange={(e) => setCustomDateTime(e.target.value)}
            />
            <div className="snooze-custom-actions">
              <button
                type="button"
                className="btn-snooze-cancel"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-snooze-confirm"
                disabled={!customDateTime || submitting}
                onClick={handleCustomSubmit}
              >
                {submitting ? "Snoozing..." : "Save Snooze"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // State 1: Preset List -> Anchored popover right below the Snooze button (no full-screen blocking overlay so underlying email row hover effects work smoothly)!
  return (
    <div
      ref={cardRef}
      className="snooze-popover-card"
      style={getDropdownStyle()}
      onClick={(e) => e.stopPropagation()}
    >
        {/* Header */}
        <div className="snooze-modal-header">
          <div className="snooze-header-title">
            <span className="snooze-icon">🕒</span>
            <span>Snooze email</span>
          </div>
          <button
            type="button"
            className="snooze-close-btn"
            onClick={onClose}
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Preset List */}
        <div className="snooze-preset-list">
          <div className="snooze-hint-text">
            Snooze until... (will reappear in your Inbox at the scheduled time)
          </div>

          {presets.map((p) => (
            <div
              key={p.id}
              className="snooze-preset-item"
              onClick={() => handleApplySnooze(p.time)}
            >
              <span className="preset-name">{p.title}</span>
              <span className="preset-time-label">{p.label}</span>
            </div>
          ))}

          <div
            className="snooze-preset-item custom-pick-row"
            onClick={() => {
              const target = new Date();
              target.setDate(target.getDate() + 1);
              target.setHours(8, 0, 0, 0);
              const yr = target.getFullYear();
              const mo = String(target.getMonth() + 1).padStart(2, "0");
              const da = String(target.getDate()).padStart(2, "0");
              setCustomDateTime(`${yr}-${mo}-${da}T08:00`);
              setShowCustomPicker(true);
            }}
          >
            <span className="preset-name">📅 Pick date &amp; time</span>
            <span className="preset-arrow">›</span>
          </div>

          {isCurrentlySnoozed && (
            <div className="snooze-unsnooze-wrap">
              <button
                type="button"
                className="btn-unsnooze-action"
                disabled={submitting}
                onClick={handleApplyUnsnooze}
              >
                ↩ Unsnooze and return to Inbox now
              </button>
            </div>
          )}
        </div>
    </div>
  );
}

export default SnoozeEmailModal;
