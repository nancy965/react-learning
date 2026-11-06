import "./ApprovalStepper.css";

const formatDateTime = (dateStr) => {
  if (!dateStr) return { date: "-", time: "" };
  const d = new Date(dateStr);
  const date = d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const time = d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  return { date, time };
};

export default function ApprovalStepper({ steps = [], currentStep = 1, overallStatus = "Pending" }) {
  if (!steps || steps.length === 0) return null;

  return (
    <div className="approval-stepper-container">
      <div className="approval-stepper-header">
        <div className="stepper-header-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="18" r="3" />
            <circle cx="6" cy="6" r="3" />
            <circle cx="18" cy="6" r="3" />
            <path d="M18 9v1a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V9" />
            <line x1="12" y1="12" x2="12" y2="15" />
          </svg>
          <h4>Approval Chain Progress ({steps.length} {steps.length === 1 ? "Level" : "Levels"})</h4>
        </div>
      </div>

      <div className="stepper-track-list">
        {steps.map((step, idx) => {
          const isDone = step.status === "Approved";
          const isCurrent = step.status === "Pending";
          const isRejected = step.status === "Rejected";
          const isWaiting = step.status === "Waiting";
          const isSkipped = step.status === "Skipped";

          const dt = formatDateTime(step.decided_at);
          const isLast = idx === steps.length - 1;

          return (
            <div
              key={step.id || idx}
              className={`stepper-node-row ${
                isDone
                  ? "node-approved"
                  : isRejected
                  ? "node-rejected"
                  : isCurrent
                  ? "node-active"
                  : isSkipped
                  ? "node-skipped"
                  : "node-waiting"
              }`}
            >
              {/* Left Column: Icon Circle & Connecting Line */}
              <div className="stepper-indicator-col">
                <div className="stepper-circle">
                  {isDone && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                  {isRejected && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  )}
                  {isCurrent && (
                    <span className="stepper-pulse-dot"></span>
                  )}
                  {(isWaiting || isSkipped) && (
                    <span className="stepper-number-text">{step.step_number}</span>
                  )}
                </div>

                {!isLast && (
                  <div
                    className={`stepper-connecting-line ${
                      isDone ? "line-complete" : isCurrent ? "line-current" : "line-upcoming"
                    }`}
                  ></div>
                )}
              </div>

              {/* Right Column: Step Content Card */}
              <div className="stepper-content-card">
                <div className="stepper-card-top">
                  <div className="stepper-title-area">
                    <span className="stepper-step-count">Level {step.step_number}</span>
                    <h5 className="stepper-step-name">{step.step_name}</h5>
                    <span className={`stepper-role-pill role-${step.approver_role?.toLowerCase()}`}>
                      {step.approver_role === "general_admin" ? "General Admin" : "Admin Reviewer"}
                    </span>
                  </div>

                  <div className={`stepper-status-chip chip-${step.status?.toLowerCase()}`}>
                    <span className="chip-dot"></span>
                    <span>{step.status === "Waiting" ? "Upcoming" : step.status}</span>
                  </div>
                </div>

                {/* Approver & Decision Meta */}
                {step.decided_at && (
                  <div className="stepper-decision-meta">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    <span>
                      Decided by <strong>{step.action_by_name || "Approver"}</strong> on {dt.date} at {dt.time}
                    </span>
                  </div>
                )}

                {/* Comment Box */}
                {step.decision_comment && (
                  <div className={`stepper-comment-box ${isRejected ? "comment-rejected" : "comment-approved"}`}>
                    <div className="comment-quote-icon">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                      </svg>
                    </div>
                    <p className="comment-text">"{step.decision_comment}"</p>
                  </div>
                )}

                {/* If step is currently awaiting decision */}
                {isCurrent && (
                  <div className="stepper-awaiting-notice">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 15 14" />
                    </svg>
                    <span>Currently awaiting action from authorized {step.approver_role === "general_admin" ? "General Admin" : "Admin"}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
