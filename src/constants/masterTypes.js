/**
 * Master Types Registry
 * To add a new dropdown/master field to Common Master in the future,
 * simply add a new entry to this array.
 */
export const MASTER_TYPES = [
  {
    key: "task_type",
    label: "Task Type",
    description: "Task difficulty and categorization options (e.g., basic, normal, hard)",
    badgeColor: "#3b82f6",
  },
  {
    key: "task_frequency",
    label: "Task Frequency",
    description: "Task repetition and scheduling frequencies (e.g., daily, one-time)",
    badgeColor: "#10b981",
  },
  {
    key: "ticket_category",
    label: "Ticket Category",
    description: "Support ticket issue classification (e.g., Technical Issue, Billing, etc.)",
    badgeColor: "#8b5cf6",
  },
  {
    key: "ticket_priority",
    label: "Ticket Priority",
    description: "Support ticket urgency levels (e.g., Low, Medium, High, Urgent)",
    badgeColor: "#f59e0b",
  },
  {
    key: "approval_request_type",
    label: "Approval Request Type",
    description: "Approval workflow category and classification options (e.g., Laptop Purchase, Reimbursement)",
    badgeColor: "#ea580c",
  },
];

export const getMasterTypeConfig = (typeKey) => {
  return (
    MASTER_TYPES.find((item) => item.key.toLowerCase() === (typeKey || "").toLowerCase()) || {
      key: typeKey,
      label: typeKey,
      description: "",
      badgeColor: "#64748b",
    }
  );
};
