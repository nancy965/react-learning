import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import SuccessToast from "../components/SuccessToast";
import {
  getConversations,
  createConversation,
  getMessages,
  sendMessage,
  markMessagesAsRead,
  getChatEmployees,
  getPresence,
  editMessage,
  deleteMessage,
  createGroup,
  getGroupDetails,
  updateGroup,
  addGroupMembers,
  removeGroupMember,
  deleteGroup,
  uploadChatFile,
  toggleMessageReaction,
} from "../services/chatService";
import "./Chat.css";
import { API_URL } from "../config/axios.util";

const ALPHABET_COLOR_PALETTES = {
  A: { bg: "#dbeafe", text: "#1d4ed8" }, // Blue
  B: { bg: "#fef3c7", text: "#b45309" }, // Amber
  C: { bg: "#f3e8ff", text: "#7e22ce" }, // Violet
  D: { bg: "#ffe4e6", text: "#be123c" }, // Rose
  E: { bg: "#dcfce7", text: "#15803d" }, // Emerald
  F: { bg: "#ffedd5", text: "#c2410c" }, // Orange
  G: { bg: "#cffafe", text: "#0e7490" }, // Cyan
  H: { bg: "#ede9fe", text: "#6d28d9" }, // Indigo
  I: { bg: "#fee2e2", text: "#b91c1c" }, // Red
  J: { bg: "#ccfbf1", text: "#0f766e" }, // Teal
  K: { bg: "#e0e7ff", text: "#3730a3" }, // Deep Indigo
  L: { bg: "#fce7f3", text: "#a21caf" }, // Fuchsia
  M: { bg: "#fef9c3", text: "#854d0e" }, // Yellow
  N: { bg: "#bae6fd", text: "#0369a1" }, // Sky Blue
  O: { bg: "#fed7aa", text: "#9a3412" }, // Apricot
  P: { bg: "#e2e8f0", text: "#334155" }, // Slate
  Q: { bg: "#ddd6fe", text: "#5b21b6" }, // Purple
  R: { bg: "#fae8ff", text: "#86198f" }, // Magenta
  S: { bg: "#d1fae5", text: "#065f46" }, // Mint
  T: { bg: "#f1f5f9", text: "#1e293b" }, // Cool Gray
  U: { bg: "#e0f2fe", text: "#075985" }, // Light Ocean
  V: { bg: "#fef2f2", text: "#991b1b" }, // Light Crimson
  W: { bg: "#f5f3ff", text: "#6b21a8" }, // Lavender
  X: { bg: "#ecfdf5", text: "#047857" }, // Seafoam
  Y: { bg: "#fff7ed", text: "#c2410c" }, // Peach
  Z: { bg: "#f8fafc", text: "#0f172a" }, // Charcoal
};

const getAvatarStyle = (name = "") => {
  if (!name) return ALPHABET_COLOR_PALETTES.A;
  const trimmed = name.trim();
  if (!trimmed) return ALPHABET_COLOR_PALETTES.A;

  // Match the first alphabet character (A-Z) so all names starting with same letter have exact same color
  const match = trimmed.match(/[a-zA-Z]/);
  const firstLetter = match
    ? match[0].toUpperCase()
    : trimmed.charAt(0).toUpperCase();

  return ALPHABET_COLOR_PALETTES[firstLetter] || ALPHABET_COLOR_PALETTES.A;
};

const formatRoleLabel = (rawRole = "") => {
  if (!rawRole) return "Employee";
  const r = String(rawRole).trim();
  const lower = r.toLowerCase();
  if (lower === "employee") return "Employee";
  if (lower === "it admin" || lower === "it_admin" || lower === "it")
    return "IT Admin";
  if (lower === "hr admin" || lower === "hr_admin" || lower === "hr")
    return "HR Admin";
  if (lower === "general admin" || lower === "general_admin")
    return "General Admin";
  if (lower === "security admin" || lower === "security_admin")
    return "Security Admin";
  if (lower === "super admin" || lower === "super_admin") return "Super Admin";
  if (lower === "admin") return "Admin";
  if (lower === "manager") return "Manager";
  if (lower === "crm") return "CRM";
  if (lower === "dashboard") return "Dashboard";
  return r.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
};

const getRoleBadge = (emp) => {
  const rawRole =
    emp?.permission_role || emp?.role_name || emp?.role || "Employee";
  const roleName = formatRoleLabel(rawRole);
  const lower = roleName.toLowerCase();

  if (lower.includes("it")) {
    return { name: roleName, bg: "#f3e8ff", text: "#7c3aed" }; // Purple (IT Admin)
  }
  if (lower.includes("hr")) {
    return { name: roleName, bg: "#ffe4e6", text: "#e11d48" }; // Pink (HR Admin)
  }
  if (lower.includes("general")) {
    return { name: roleName, bg: "#e0e7ff", text: "#4338ca" }; // Indigo (General Admin)
  }
  if (lower.includes("security")) {
    return { name: roleName, bg: "#ccfbf1", text: "#0f766e" }; // Teal (Security Admin)
  }
  if (lower.includes("admin")) {
    return { name: roleName, bg: "#ffedd5", text: "#ea580c" }; // Orange (Admin)
  }
  if (lower.includes("manager")) {
    return { name: roleName, bg: "#fef3c7", text: "#b45309" }; // Amber
  }
  if (lower.includes("crm")) {
    return { name: roleName, bg: "#ede9fe", text: "#6d28d9" }; // Violet
  }
  if (lower.includes("oper")) {
    return { name: roleName, bg: "#ffedd5", text: "#ea580c" }; // Operations
  }
  if (lower.includes("engineer")) {
    return { name: roleName, bg: "#e0f2fe", text: "#0284c7" }; // Engineering
  }
  if (lower.includes("employee")) {
    return { name: roleName, bg: "#e0f2fe", text: "#0284c7" }; // Sky blue
  }

  const palettes = [
    { bg: "#e0f2fe", text: "#0284c7" },
    { bg: "#dcfce7", text: "#16a34a" },
    { bg: "#fee2e2", text: "#dc2626" },
    { bg: "#ffedd5", text: "#ea580c" },
    { bg: "#f3e8ff", text: "#7c3aed" },
    { bg: "#e0e7ff", text: "#4338ca" },
  ];
  let hash = 0;
  for (let i = 0; i < roleName.length; i++) {
    hash = roleName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return {
    name: roleName,
    ...palettes[Math.abs(hash) % palettes.length],
  };
};

const getEmployeeDepartment = (emp) => getRoleBadge(emp);

const getDepartmentBadgeStyle = (deptName = "") => {
  if (!deptName) return null;
  const norm = String(deptName).toLowerCase().trim();
  if (norm.includes("eng"))
    return { name: "Engineering", bg: "#e0f2fe", text: "#0284c7" };
  if (norm.includes("mark"))
    return { name: "Marketing", bg: "#dcfce7", text: "#16a34a" };
  if (norm.includes("hr"))
    return { name: "HR", bg: "#ffe4e6", text: "#e11d48" };
  if (norm.includes("oper"))
    return { name: "Operations", bg: "#ffedd5", text: "#ea580c" };
  if (norm.includes("it"))
    return { name: "IT", bg: "#f3e8ff", text: "#7c3aed" };
  return null;
};

const formatGroupCreatedDate = (dateStr) => {
  if (!dateStr) return "24 Aug 2026";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "24 Aug 2026";
    const day = d.getDate();
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    return `${day} ${months[d.getMonth()]} ${d.getFullYear()}`;
  } catch {
    return "24 Aug 2026";
  }
};

const getInitials = (name = "") => {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

const formatMessageTime = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  let hours = d.getHours();
  const minutes = d.getMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12;
  const strHours = hours < 10 ? "0" + hours : hours;
  const strMinutes = minutes < 10 ? "0" + minutes : minutes;
  return `${strHours}:${strMinutes} ${ampm}`;
};

const formatConversationTime = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);

  if (d.toDateString() === now.toDateString()) {
    return formatMessageTime(dateStr);
  }
  if (d.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  }
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${monthNames[d.getMonth()]} ${d.getDate()}`;
};

const getMessageDateLabel = (dateStr) => {
  if (!dateStr) return "";
  const msgDate = new Date(dateStr);
  if (isNaN(msgDate.getTime())) return "";

  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const dayName = days[msgDate.getDay()];
  const monthName = months[msgDate.getMonth()];
  const dayNum = msgDate.getDate();
  const yearSuffix =
    msgDate.getFullYear() !== today.getFullYear()
      ? `, ${msgDate.getFullYear()}`
      : "";

  // If today -> Only "Today"
  if (msgDate.toDateString() === today.toDateString()) {
    return "Today";
  }

  // If tomorrow -> Only "Tomorrow"
  if (msgDate.toDateString() === tomorrow.toDateString()) {
    return "Tomorrow";
  }

  // Earlier day -> Day with Date (e.g. "Monday, Oct 26" or "Sunday, Oct 25")
  return `${dayName}, ${monthName} ${dayNum}${yearSuffix}`;
};

const parseReply = (raw) => {
  if (!raw || typeof raw !== "string") {
    return { reply: null, content: raw || "" };
  }
  const match = raw.match(/^>\s*\[Replying to (.*?):\s*"(.*?)"\]\n([\s\S]*)$/);
  if (match) {
    return {
      reply: {
        sender: match[1],
        snippet: match[2],
      },
      content: match[3],
    };
  }
  return { reply: null, content: raw };
};

const parseAttachment = (raw) => {
  if (!raw || typeof raw !== "string") return null;
  const match = raw.match(/\[ATTACHMENT:(\{[\s\S]*?\})\]/i);
  if (match) {
    try {
      return JSON.parse(match[1]);
    } catch {
      return null;
    }
  }
  const fileMatch = raw.match(/\[FILE:\s*(.*?)(?:\s*\|\s*(\d+)\s*KB)?\]/i);
  if (fileMatch) {
    const fileName = fileMatch[1].trim();
    const sizeKB = fileMatch[2] ? parseInt(fileMatch[2], 10) : 38;
    const isImg = isImageUrl(fileName);
    return {
      url: `${API_URL}/uploads/chat/${encodeURIComponent(fileName)}`,
      name: fileName,
      size: sizeKB * 1024,
      type: isImg
        ? "image/png"
        : fileName.toLowerCase().endsWith(".pdf")
          ? "application/pdf"
          : "application/octet-stream",
    };
  }
  return null;
};

const isImageUrl = (url = "", type = "") => {
  if (type && type.startsWith("image/")) return true;
  return /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(url);
};

const isSystemActionMessage = (message) => {
  if (!message) return false;
  if (message.sender_role === "system" || message.sender_id === "system") {
    return true;
  }
  const rawText =
    typeof message.message === "string"
      ? message.message.trim()
      : typeof message.content === "string"
        ? message.content.trim()
        : "";
  if (!rawText) return false;

  const patterns = [
    /\bcreated the group\b/i,
    /\bremoved\s+.+\s+from the group\b/i,
    /\badded\s+.+\s+to the group\b/i,
    /\bupdated group\b/i,
    /\brenamed group\b/i,
    /\bchanged group\b/i,
    /\bleft the group\b/i,
    /\bjoined the group\b/i,
    /\bdeleted group\b/i,
  ];

  return patterns.some((p) => p.test(rawText));
};

const playMessageSound = () => {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const audioCtx = new AudioContextClass();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, audioCtx.currentTime);
    osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.22);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.22);
  } catch {
    // Ignore audio error
  }
};

// ==========================================
// EMOJI DATASET REPLICATING EXACT 3RD PICTURE
// ==========================================
const EMOJI_CATEGORIES = [
  { id: "frequent", icon: "⏱", label: "Frequently Used" },
  { id: "smileys", icon: "😀", label: "Smileys & People" },
  { id: "animals", icon: "🐶", label: "Animals & Nature" },
  { id: "food", icon: "🍏", label: "Food & Drink" },
  { id: "activity", icon: "🏀", label: "Activities" },
  { id: "travel", icon: "🚗", label: "Travel & Places" },
  { id: "objects", icon: "💡", label: "Objects" },
  { id: "symbols", icon: "🔣", label: "Symbols" },
  { id: "flags", icon: "🏳️", label: "Flags" },
];

const FREQUENT_EMOJIS = [
  "😀",
  "😆",
  "😅",
  "😂",
  "🤣",
  "👍",
  "👏",
  "🥰",
  "😍",
  "😊",
  "😇",
  "😜",
  "😮",
  "🤗",
  "🎉",
  "😢",
  "✌️",
  "😎",
  "😴",
  "😪",
  "🤫",
  "🥂",
  "😛",
  "😐",
  "🎂",
  "💪",
  "🥶",
  "🙄",
  "🤐",
  "😬",
  "😱",
];

const SMILEYS_EMOJIS = [
  "😀",
  "😃",
  "😄",
  "😁",
  "😆",
  "😅",
  "🤣",
  "😂",
  "🙂",
  "🙃",
  "😉",
  "😊",
  "😇",
  "🥰",
  "😍",
  "🤩",
  "😘",
  "😗",
  "😚",
  "😙",
  "😋",
  "😛",
  "😜",
  "🤪",
  "😝",
  "🤑",
  "🤗",
  "🤭",
  "🤫",
  "🤔",
  "🤐",
  "🤨",
  "😐",
  "😑",
  "😶",
  "😏",
  "😒",
  "🙄",
  "😬",
  "🤥",
  "😌",
  "😔",
  "😪",
  "🤤",
  "😴",
  "😷",
  "🤒",
  "🤕",
  "🤢",
  "🤮",
  "🤧",
  "🥵",
  "🥶",
  "🥴",
  "😵",
  "🤯",
  "🤠",
  "🥳",
  "😎",
  "🤓",
  "🧐",
  "😕",
  "😟",
  "🙁",
  "😮",
  "😯",
  "😲",
  "😳",
  "🥺",
  "😦",
  "😧",
  "😨",
  "😰",
  "😥",
  "😢",
  "😭",
  "😱",
  "😖",
  "😣",
  "😞",
  "😓",
  "😩",
  "😫",
  "🥱",
  "😤",
];

const CATEGORY_EMOJIS = {
  animals: [
    "🐶",
    "🐱",
    "🐭",
    "🐹",
    "🐰",
    "🦊",
    "🐻",
    "🐼",
    "🐨",
    "🐯",
    "🦁",
    "🐮",
    "🐷",
    "🐸",
    "🐵",
    "🐔",
    "🐧",
    "🐦",
    "🐤",
    "🦆",
    "🦅",
    "🦉",
    "🦇",
    "🐺",
    "🐗",
    "🐴",
    "🦄",
    "🐝",
    "🐛",
    "🦋",
    "🐌",
    "🐞",
    "🐜",
    "🐢",
    "🐍",
    "🦎",
    "🐙",
    "🦑",
    "🦐",
    "🦞",
    "🦀",
    "🐡",
    "🐠",
    "🐟",
    "🐬",
    "🐳",
    "🐋",
    "🦈",
    "🐊",
    "🐅",
    "🐆",
    "🦓",
    "🦍",
    "🐘",
    "🦛",
    "🦏",
    "🐪",
    "🐫",
    "🦒",
    "🦘",
  ],
  food: [
    "🍏",
    "🍎",
    "🍐",
    "🍊",
    "🍋",
    "🍌",
    "🍉",
    "🍇",
    "🍓",
    "🫐",
    "🍈",
    "🍒",
    "🍑",
    "🥭",
    "🍍",
    "🥥",
    "🥝",
    "🍅",
    "🥑",
    "🥦",
    "🥒",
    "🌶",
    "🌽",
    "🥕",
    "🧄",
    "🧅",
    "🥔",
    "🥐",
    "🍞",
    "🥖",
    "🥨",
    "🧀",
    "🍳",
    "🥞",
    "🧇",
    "🥓",
    "🥩",
    "🍗",
    "🍖",
    "🌭",
    "🍔",
    "🍟",
    "🍕",
    "🥪",
    "🌮",
    "🌯",
    "🥗",
    "🍝",
    "🍜",
    "🍲",
    "🍛",
    "🍣",
    "🍱",
    "🥟",
    "🍦",
    "🎂",
    "🍰",
    "🧁",
    "🍩",
    "🍪",
    "🍫",
    "🍿",
    "☕️",
    "🧃",
    "🥤",
    "🧋",
    "🍺",
    "🥂",
    "🍷",
  ],
  activity: [
    "⚽️",
    "🏀",
    "🏈",
    "⚾️",
    "🥎",
    "🎾",
    "🏐",
    "🏉",
    "🎱",
    "🏓",
    "🏸",
    "🏒",
    "🏏",
    "⛳️",
    "🏹",
    "🎣",
    "🤿",
    "🥊",
    "🥋",
    "🛹",
    "🛼",
    "🎿",
    "🏂",
    "🏋️",
    "🤺",
    "🏇",
    "🏄",
    "🏊",
    "🚣",
    "🚴",
    "🏆",
    "🥇",
    "🥈",
    "🥉",
    "🏅",
    "🎫",
    "🎭",
    "🎨",
    "🎬",
    "🎤",
    "🎧",
    "🎼",
    "🎹",
    "🥁",
    "🎸",
    "🎻",
    "🎲",
    "♟",
    "🎯",
    "🎳",
    "🎮",
  ],
  travel: [
    "🚗",
    "🚕",
    "🚙",
    "🚌",
    "🚎",
    "🏎",
    "🚓",
    "🚑",
    "🚒",
    "🚐",
    "🚚",
    "🚛",
    "🚜",
    "🛴",
    "🚲",
    "🛵",
    "🏍",
    "🚨",
    "🚔",
    "✈️",
    "🛫",
    "🛬",
    "🛩",
    "🚀",
    "🛸",
    "🚁",
    "⛵️",
    "🚤",
    "🛥",
    "🛳",
    "🚢",
    "⚓️",
    "⛽️",
    "🚦",
    "🚥",
    "🗺",
    "🗿",
    "🗽",
    "🗼",
    "🏰",
    "🏯",
    "🏟",
    "🎡",
    "🎢",
    "🏖",
    "🏝",
    "🏜",
    "🌋",
    "⛰",
    "🏔",
    "🏕",
    "🏠",
    "🏡",
    "🏢",
    "🏬",
    "🏥",
    "🏦",
    "🏨",
  ],
  objects: [
    "💡",
    "🔦",
    "🏮",
    "💻",
    "🖥",
    "🖨",
    "⌨️",
    "🖱",
    "📱",
    "☎️",
    "📞",
    "📺",
    "📻",
    "🎙",
    "⏱",
    "⏲",
    "⏰",
    "⏳",
    "🔋",
    "🔌",
    "💸",
    "💵",
    "💰",
    "💳",
    "💎",
    "⚖️",
    "🧰",
    "🔧",
    "🔨",
    "🛠",
    "🔩",
    "⚙️",
    "💣",
    "🔪",
    "🗡",
    "⚔️",
    "🛡",
    "🔮",
    "🧪",
    "🧬",
    "🔬",
    "🔭",
    "💊",
    "🩹",
    "🩺",
    "🚪",
    "🛗",
    "🪞",
    "🛏",
    "🛋",
    "🪑",
    "🚽",
    "🚿",
    "🛁",
    "📦",
    "✉️",
    "📫",
    "🏷",
  ],
  symbols: [
    "❤️",
    "🧡",
    "💛",
    "💚",
    "💙",
    "💜",
    "🖤",
    "🤍",
    "🤎",
    "💔",
    "❣️",
    "💕",
    "💞",
    "💓",
    "💗",
    "💖",
    "💘",
    "💝",
    "☮️",
    "✝️",
    "☪️",
    "🕉",
    "☸️",
    "✡️",
    "☯️",
    "♈️",
    "♉️",
    "♊️",
    "♋️",
    "♌️",
    "♍️",
    "♎️",
    "♏️",
    "♐️",
    "♑️",
    "♒️",
    "♓️",
    "⚛️",
    "✴️",
    "♨️",
    "💯",
    "🔔",
    "🔕",
    "⛔️",
    "🚫",
    "❌",
    "⭕️",
    "💢",
    "⚠️",
    "♻️",
    "✅",
    "🌐",
    "♿️",
    "🅿️",
    "▶️",
    "⏸",
    "⏹",
    "⏭",
    "⏮",
    "⏩",
    "⏪",
    "➡️",
    "⬅️",
    "⬆️",
    "⬇️",
    "🎵",
    "🎶",
    "➕",
    "➖",
    "✖️",
    "➗",
    "♾",
  ],
  flags: [
    "🏁",
    "🚩",
    "🎌",
    "🏴",
    "🏳️",
    "🏳️‍🌈",
    "🏳️‍⚧️",
    "🇺🇸",
    "🇬🇧",
    "🇨🇦",
    "🇦🇺",
    "🇮🇳",
    "🇯🇵",
    "🇩🇪",
    "🇫🇷",
    "🇮🇹",
    "🇪🇸",
    "🇧🇷",
    "🇷🇺",
    "🇨🇳",
    "🇰🇷",
    "🇿🇦",
    "🇲🇽",
  ],
};

function Chat() {
  const { theme } = useTheme();
  const location = useLocation();

  const loggedInUser = JSON.parse(localStorage.getItem("user") || "{}");
  const userRoleStr = String(loggedInUser?.role || loggedInUser?.baseRole || "")
    .toLowerCase()
    .trim();

  const isAdmin = [
    "admin",
    "general_admin",
    "general admin",
    "super_admin",
  ].includes(userRoleStr);

  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [creatingConversation, setCreatingConversation] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [onlineUsers, setOnlineUsers] = useState({});

  // 3-dots menus & action states
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [openMessageMenuId, setOpenMessageMenuId] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);

  // Group creation modal state
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [selectedGroupMembers, setSelectedGroupMembers] = useState([]);
  const [groupMemberSearch, setGroupMemberSearch] = useState("");
  const [creatingGroup, setCreatingGroup] = useState(false);

  // Attachment preview modal (View without download)
  const [previewFile, setPreviewFile] = useState(null);

  // Advanced Emoji Picker state (Picture 3)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeEmojiCategory, setActiveEmojiCategory] = useState("frequent");
  const [emojiSearchText, setEmojiSearchText] = useState("");

  // Forwarding state
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [forwardingMessage, setForwardingMessage] = useState(null);
  const [forwardSearchText, setForwardSearchText] = useState("");
  const [forwardingLoading, setForwardingLoading] = useState(false);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState("");

  // Starred persistent collections
  const [starredMessageIds, setStarredMessageIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("chat_starred_messages") || "[]");
    } catch {
      return [];
    }
  });

  const [starredMessagesMap, setStarredMessagesMap] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem("chat_starred_messages_map") || "{}",
      );
    } catch {
      return {};
    }
  });

  const [starredConversationIds, setStarredConversationIds] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem("chat_starred_conversations") || "[]",
      );
    } catch {
      return [];
    }
  });

  // Pinned conversations state (stored in localStorage)
  const [pinnedConversationIds, setPinnedConversationIds] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem("chat_pinned_conversations") || "[]",
      );
    } catch {
      return [];
    }
  });
  const [openSidebarConvMenuId, setOpenSidebarConvMenuId] = useState(null);

  // Active conversation section tabs: "chat" | "files" | "starred" (Picture 2)
  const [conversationViewTab, setConversationViewTab] = useState("chat");

  const [showSidebarMenu, setShowSidebarMenu] = useState(false);
  const sidebarHeaderMenuRef = useRef(null);

  // Group management modal state (Dedicated modals for Info, Edit, and Delete)
  const [showManageGroupModal, setShowManageGroupModal] = useState(false);
  const [showGroupInfoModal, setShowGroupInfoModal] = useState(false);
  const [showEditGroupModal, setShowEditGroupModal] = useState(false);
  const [showDeleteGroupModal, setShowDeleteGroupModal] = useState(false);
  const [manageGroupData, setManageGroupData] = useState(null);
  const [editGroupName, setEditGroupName] = useState("");
  const [editGroupDesc, setEditGroupDesc] = useState("");
  const [isEditingGroupDetails, setIsEditingGroupDetails] = useState(false);
  const [groupMemberAddSearch, setGroupMemberAddSearch] = useState("");
  const [selectedAddCandidates, setSelectedAddCandidates] = useState([]);
  const [groupActionLoading, setGroupActionLoading] = useState(false);
  const [groupModalActiveTab, setGroupModalActiveTab] = useState("details");
  const [groupMemberFilterText, setGroupMemberFilterText] = useState("");
  const [showAddMembersSection, setShowAddMembersSection] = useState(false);

  // Picture 5 Lightbox Viewer State
  const [lightboxFile, setLightboxFile] = useState(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [imageRotation, setImageRotation] = useState(0);
  const [reactionPickerMsgId, setReactionPickerMsgId] = useState(null);

  const fileInputRef = useRef(null);
  const messageInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const isAtBottomRef = useRef(true);
  const searchInputRef = useRef(null);
  const headerMenuRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const lastMsgCountRef = useRef(0);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        sidebarHeaderMenuRef.current &&
        !sidebarHeaderMenuRef.current.contains(e.target)
      ) {
        setShowSidebarMenu(false);
      }
      if (headerMenuRef.current && !headerMenuRef.current.contains(e.target)) {
        setShowHeaderMenu(false);
      }
      if (
        !e.target.closest(".msg-actions-wrap") &&
        !e.target.closest(".quick-reactions-popover")
      ) {
        setOpenMessageMenuId(null);
        setReactionPickerMsgId(null);
      }
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(e.target) &&
        !e.target.closest(".emoji-trigger-btn")
      ) {
        setShowEmojiPicker(false);
      }
      if (!e.target.closest(".sidebar-conv-menu-wrap")) {
        setOpenSidebarConvMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (showCreateGroupModal) {
      loadChatEmployees();
    }
  }, [showCreateGroupModal]);

  const syncPresence = async () => {
    try {
      const response = await getPresence();
      setOnlineUsers(response.data?.data || {});
    } catch {
      // Ignore
    }
  };

  const scrollToBottom = (behavior = "smooth") => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior,
      });
    } else {
      messagesEndRef.current?.scrollIntoView({
        behavior,
      });
    }
  };

  const handleMessagesScroll = (e) => {
    const target = e.currentTarget;
    const distanceFromBottom =
      target.scrollHeight - target.scrollTop - target.clientHeight;
    isAtBottomRef.current = distanceFromBottom <= 120;
  };

  const loadConversations = async () => {
    try {
      const response = await getConversations();
      const list = response.data?.data || [];
      setConversations(list);
      setError("");

      const targetConvId = location.state?.conversationId;
      if (targetConvId) {
        const found = list.find((c) => String(c.id) === String(targetConvId));
        if (found) {
          loadMessages(found);
        }
      }

      return list;
    } catch (err) {
      console.error("GET CONVERSATIONS ERROR:", err);
      setError(err.response?.data?.message || "Unable to load conversations.");
      return [];
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversation, isBackground = false) => {
    try {
      if (!isBackground) {
        setSelectedConversation(conversation);
        setMessagesLoading(true);
        setError("");
        setReplyingTo(null);
        setEditingMessage(null);
        setOpenMessageMenuId(null);
        setShowHeaderMenu(false);
        setConversationViewTab(activeTab === "starred" ? "starred" : "chat");
      }

      const response = await getMessages(conversation.id);
      const fetchedMessages = response.data?.data || [];

      if (
        isBackground &&
        lastMsgCountRef.current > 0 &&
        fetchedMessages.length > lastMsgCountRef.current
      ) {
        const latest = fetchedMessages[fetchedMessages.length - 1];
        const isFromOther =
          String(latest.sender_id).toLowerCase() !==
          String(loggedInUser?.id).toLowerCase();
        if (isFromOther) {
          playMessageSound();
        }
        if (isAtBottomRef.current) {
          setTimeout(() => {
            scrollToBottom("smooth");
          }, 50);
        }
      }

      lastMsgCountRef.current = fetchedMessages.length;
      setMessages(fetchedMessages);

      if (!isBackground) {
        setTimeout(() => {
          scrollToBottom("auto");
          isAtBottomRef.current = true;
          messageInputRef.current?.focus();
        }, 80);
      }

      try {
        await markMessagesAsRead(conversation.id);
      } catch (readErr) {
        console.error("markMessagesAsRead error:", readErr);
      }

      setConversations((prev) =>
        prev.map((item) =>
          item.id === conversation.id ? { ...item, unread_count: 0 } : item,
        ),
      );
    } catch (err) {
      if (!isBackground) {
        console.error("GET MESSAGES ERROR:", err);
        setError(err.response?.data?.message || "Unable to load messages.");
      }
    } finally {
      if (!isBackground) {
        setMessagesLoading(false);
      }
    }
  };

  const loadChatEmployees = async () => {
    try {
      setEmployeesLoading(true);
      const response = await getChatEmployees();
      setEmployees(response.data?.data || []);
    } catch (err) {
      console.error("GET CHAT EMPLOYEES ERROR:", err);
    } finally {
      setEmployeesLoading(false);
    }
  };

  const handleSearchChange = (event) => {
    setSearchText(event.target.value);
  };

  const handleEmployeeSelect = async (employee) => {
    if (creatingConversation) return;

    try {
      setCreatingConversation(true);
      setError("");

      const existing = conversations.find(
        (c) => !c.is_group && String(c.employee_id) === String(employee.id),
      );

      if (existing) {
        setSearchText("");
        await loadMessages(existing);
        setCreatingConversation(false);
        return;
      }

      const response = await createConversation(employee.id);
      const conversation = response.data?.data;
      setSearchText("");

      if (conversation) {
        const updatedConversation = {
          ...conversation,
          employee_name: employee.name,
          employee_email: employee.email,
          unread_count: 0,
        };

        const updatedList = await loadConversations();
        const found = updatedList.find((c) => c.id === conversation.id);
        await loadMessages(found || updatedConversation);
      }
    } catch (err) {
      console.error("CREATE CONVERSATION ERROR:", err);
      setError(err.response?.data?.message || "Unable to start conversation.");
    } finally {
      setCreatingConversation(false);
    }
  };

  // Create Professional Group Chat
  const handleCreateGroupSubmit = async (e) => {
    e.preventDefault();
    if (!groupName.trim()) {
      setError("Please provide a group name");
      return;
    }

    try {
      setCreatingGroup(true);
      setError("");

      const res = await createGroup({
        name: groupName.trim(),
        description: groupDescription.trim(),
        memberIds: selectedGroupMembers,
      });

      const newGroup = res.data?.data;
      setShowCreateGroupModal(false);
      setGroupName("");
      setGroupDescription("");
      setSelectedGroupMembers([]);
      setGroupMemberSearch("");
      setToastMessage(`Group "${newGroup.name}" created successfully!`);

      const updatedList = await loadConversations();
      setActiveTab("groups");
      const found = updatedList.find((c) => c.id === newGroup.id) || newGroup;
      await loadMessages(found);
    } catch (err) {
      console.error("CREATE GROUP ERROR:", err);
      setError(err.response?.data?.message || "Failed to create group");
    } finally {
      setCreatingGroup(false);
    }
  };

  const handleToggleMemberSelection = (id) => {
    setSelectedGroupMembers((prev) =>
      prev.includes(id) ? prev.filter((mId) => mId !== id) : [...prev, id],
    );
  };

  // Send Message (Text / Quoted / Attachment)
  const handleSendMessage = async (customText = null) => {
    const rawText = (customText !== null ? customText : messageText).trim();
    if (!rawText || !selectedConversation || sending) return;

    // Handle Edit Mode Submission
    if (editingMessage) {
      try {
        setSending(true);
        setError("");
        await editMessage(editingMessage.id, rawText);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === editingMessage.id
              ? { ...m, message: rawText, is_edited: true }
              : m,
          ),
        );
        setEditingMessage(null);
        setMessageText("");
        setTimeout(() => messageInputRef.current?.focus(), 0);
        setToastMessage("Message updated successfully!");
      } catch (err) {
        console.error("EDIT MESSAGE ERROR:", err);
        setError(err.response?.data?.message || "Unable to update message.");
      } finally {
        setSending(false);
        setTimeout(() => messageInputRef.current?.focus(), 0);
      }
      return;
    }

    // Handle Reply quoting
    let textToSend = rawText;
    if (replyingTo) {
      const cleanSnippet = replyingTo.text.replace(/\n/g, " ").slice(0, 60);
      textToSend = `> [Replying to ${replyingTo.sender}: "${cleanSnippet}"]\n${textToSend}`;
      setReplyingTo(null);
    }

    const tempId = `temp-${Date.now()}`;
    const optimisticMessage = {
      id: tempId,
      conversation_id: selectedConversation.id,
      sender_id: loggedInUser?.id,
      sender_role: isAdmin ? "admin" : "employee",
      sender_name: loggedInUser?.name || (isAdmin ? "Admin" : "Employee"),
      message: textToSend,
      is_read: false,
      created_at: new Date().toISOString(),
      _optimistic: true,
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setTimeout(() => {
      scrollToBottom("smooth");
      isAtBottomRef.current = true;
    }, 50);
    if (customText === null) {
      setMessageText("");
      setTimeout(() => messageInputRef.current?.focus(), 0);
    }
    setShowEmojiPicker(false);
    lastMsgCountRef.current += 1;

    setConversations((prev) => {
      const updated = prev.map((item) =>
        item.id === selectedConversation.id
          ? {
              ...item,
              last_message: textToSend,
              last_message_time: optimisticMessage.created_at,
            }
          : item,
      );
      const current = updated.find((c) => c.id === selectedConversation.id);
      const others = updated.filter((c) => c.id !== selectedConversation.id);
      return current ? [current, ...others] : updated;
    });

    try {
      setSending(true);
      setError("");

      const response = await sendMessage(selectedConversation.id, textToSend);
      const savedMessage = response.data?.data;

      if (savedMessage) {
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? savedMessage : m)),
        );
        setToastMessage("Message sent ✓");
      }
    } catch (err) {
      console.error("SEND MESSAGE ERROR:", err);
      setError(err.response?.data?.message || "Unable to send message.");
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } finally {
      setSending(false);
      setTimeout(() => messageInputRef.current?.focus(), 0);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  // Attachment upload handler: Supports Photos & all Document types

  const handleToggleReaction = async (messageId, emoji) => {
    if (!messageId || !emoji) return;

    const currentUserId = String(loggedInUser?.id || "");
    const currentUserName = loggedInUser?.name || "You";

    setMessages((prevMessages) =>
      prevMessages.map((msg) => {
        if (msg.id !== messageId) return msg;
        let reactions = Array.isArray(msg.reactions) ? [...msg.reactions] : [];
        const existingIndex = reactions.findIndex((r) => r.emoji === emoji);

        if (existingIndex !== -1) {
          const emojiObj = { ...reactions[existingIndex] };
          let userList = Array.isArray(emojiObj.users)
            ? [...emojiObj.users]
            : [];
          const userIdx = userList.findIndex(
            (u) => String(u.id) === currentUserId,
          );

          if (userIdx !== -1) {
            userList.splice(userIdx, 1);
          } else {
            userList.push({ id: currentUserId, name: currentUserName });
          }

          if (userList.length === 0) {
            reactions.splice(existingIndex, 1);
          } else {
            emojiObj.users = userList;
            emojiObj.count = userList.length;
            reactions[existingIndex] = emojiObj;
          }
        } else {
          reactions.push({
            emoji,
            count: 1,
            users: [{ id: currentUserId, name: currentUserName }],
          });
        }

        return { ...msg, reactions };
      }),
    );

    try {
      const res = await toggleMessageReaction(
        messageId,
        emoji,
        currentUserName,
      );
      if (res.data?.reactions) {
        setMessages((prevMessages) =>
          prevMessages.map((msg) =>
            msg.id === messageId
              ? { ...msg, reactions: res.data.reactions }
              : msg,
          ),
        );
      }
    } catch (err) {
      console.error("TOGGLE REACTION ERROR:", err);
    }
  };

  const handleFileAttach = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedConversation) return;

    try {
      setSending(true);
      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await uploadChatFile(formData);
      const fileData = uploadRes.data?.data;

      if (fileData) {
        const payload = `[ATTACHMENT:${JSON.stringify(fileData)}]`;
        await handleSendMessage(payload);
        setToastMessage(`Sent file: ${file.name}`);
      }
    } catch (uploadErr) {
      console.error("UPLOAD ERROR:", uploadErr);
      // Fallback: send as standard attachment badge
      const fallbackText = `[FILE: ${file.name} | ${Math.round(file.size / 1024)} KB]`;
      await handleSendMessage(fallbackText);
      setToastMessage(`Attached: ${file.name}`);
    } finally {
      setSending(false);
      e.target.value = "";
    }
  };

  // Download File to local disk
  const handleDownloadFile = async (fileData) => {
    if (!fileData?.url) return;
    try {
      setToastMessage(`Downloading ${fileData.name || "file"}...`);
      const response = await fetch(fileData.url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = fileData.name || "downloaded-file";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      const link = document.createElement("a");
      link.href = fileData.url;
      link.download = fileData.name || "file";
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Extract all attachments from the current conversation for Picture 5's gallery strip
  const conversationAttachments = messages
    .map((m) => {
      const parsed = parseReply(m.message);
      const att = parseAttachment(parsed.content);
      return att ? { ...att, messageId: m.id, date: m.created_at } : null;
    })
    .filter(Boolean);

  // Open Picture 5 Lightbox (Eye button)
  const handlePreviewMedia = (fileData) => {
    let list = conversationAttachments;
    if (!list.some((a) => a.url === fileData.url || a.name === fileData.name)) {
      list = [...list, fileData];
    }
    const idx = list.findIndex(
      (a) => a.url === fileData.url || a.name === fileData.name,
    );
    setLightboxIndex(idx >= 0 ? idx : 0);
    setLightboxFile(fileData);
    setImageRotation(0);
  };

  const handlePrevAttachment = () => {
    if (conversationAttachments.length <= 1) return;
    const newIdx =
      (lightboxIndex - 1 + conversationAttachments.length) %
      conversationAttachments.length;
    setLightboxIndex(newIdx);
    setLightboxFile(conversationAttachments[newIdx]);
    setImageRotation(0);
  };

  const handleNextAttachment = () => {
    if (conversationAttachments.length <= 1) return;
    const newIdx = (lightboxIndex + 1) % conversationAttachments.length;
    setLightboxIndex(newIdx);
    setLightboxFile(conversationAttachments[newIdx]);
    setImageRotation(0);
  };

  // 1. Open Group Info & Members Modal (Picture 1 UI)
  const handleOpenGroupInfoModal = async (
    groupToView = selectedConversation,
  ) => {
    if (!groupToView) return;
    try {
      setShowHeaderMenu(false);
      setShowGroupInfoModal(true);
      setShowEditGroupModal(false);
      setGroupModalActiveTab("details");
      setGroupMemberFilterText("");
      setIsEditingGroupDetails(false);
      setShowAddMembersSection(false);
      setSelectedAddCandidates([]);
      setEditGroupName(groupToView.name || "");
      setEditGroupDesc(groupToView.description || "");
      setManageGroupData(groupToView);

      const res = await getGroupDetails(groupToView.id);
      if (res.data?.data) {
        setManageGroupData(res.data.data);
      }
    } catch (err) {
      console.error("Error loading group info:", err);
    }
  };

  // 2. Open Edit Group Details Modal (Picture 1 UI with edit active)
  const handleOpenEditGroupModal = async (
    groupToEdit = selectedConversation,
  ) => {
    if (!groupToEdit) return;
    try {
      setShowHeaderMenu(false);
      setShowGroupInfoModal(false);
      setShowEditGroupModal(true);
      setGroupModalActiveTab("details");
      setGroupMemberFilterText("");
      setGroupMemberAddSearch("");
      setIsEditingGroupDetails(true);
      setShowAddMembersSection(false);
      setSelectedAddCandidates([]);
      setEditGroupName(groupToEdit.name || "");
      setEditGroupDesc(groupToEdit.description || "");
      setManageGroupData(groupToEdit);

      const res = await getGroupDetails(groupToEdit.id);
      if (res.data?.data) {
        setManageGroupData(res.data.data);
      }
    } catch (err) {
      console.error("Error loading group details:", err);
    }
  };

  // 3. Open Delete Group Confirmation Modal (Popup)
  const handleOpenDeleteGroupModal = () => {
    setShowHeaderMenu(false);
    setShowDeleteGroupModal(true);
  };

  // Backward compatibility alias
  const handleOpenGroupManage = (groupToManage = selectedConversation) => {
    handleOpenGroupInfoModal(groupToManage);
  };

  // Save updated Group Name / Description
  const handleSaveGroupDetails = async (e) => {
    e?.preventDefault();
    if (!selectedConversation?.id || !editGroupName.trim()) return;
    try {
      setGroupActionLoading(true);
      const res = await updateGroup(selectedConversation.id, {
        name: editGroupName.trim(),
        description: editGroupDesc.trim(),
      });
      const updated = res.data?.data;
      if (updated) {
        setManageGroupData((prev) => ({ ...prev, ...updated }));
        setSelectedConversation((prev) => ({
          ...prev,
          name: updated.name,
          description: updated.description,
        }));
        setConversations((prev) =>
          prev.map((c) =>
            c.id === selectedConversation.id
              ? { ...c, name: updated.name, employee_name: updated.name }
              : c,
          ),
        );
        setIsEditingGroupDetails(false);
        setToastMessage("Group details updated successfully!");
        loadMessages(selectedConversation, true);
      }
    } catch (err) {
      console.error("Update group error:", err);
      setError(err.response?.data?.message || "Failed to update group");
    } finally {
      setGroupActionLoading(false);
    }
  };

  // Add Member to Group
  const handleAddMemberToGroup = async (employeeId) => {
    if (!selectedConversation?.id || !employeeId) return;
    try {
      setGroupActionLoading(true);
      const res = await addGroupMembers(selectedConversation.id, [employeeId]);
      const updated = res.data?.data;
      if (updated) {
        setManageGroupData((prev) => ({ ...prev, ...updated }));
        setSelectedConversation((prev) => ({
          ...prev,
          members: updated.members,
          member_count: updated.member_count,
        }));
        setConversations((prev) =>
          prev.map((c) =>
            c.id === selectedConversation.id
              ? {
                  ...c,
                  members: updated.members,
                  member_count: updated.member_count,
                }
              : c,
          ),
        );
        setToastMessage("Member added to group!");
        loadMessages(selectedConversation, true);
      }
    } catch (err) {
      console.error("Add member error:", err);
      setError(err.response?.data?.message || "Failed to add member to group");
    } finally {
      setGroupActionLoading(false);
    }
  };

  // Remove Member from Group
  const handleRemoveMemberFromGroup = async (memberId) => {
    if (!selectedConversation?.id || !memberId) return;
    try {
      setGroupActionLoading(true);
      const res = await removeGroupMember(selectedConversation.id, memberId);
      const updated = res.data?.data;
      if (updated) {
        setManageGroupData((prev) => ({ ...prev, ...updated }));
        setSelectedConversation((prev) => ({
          ...prev,
          members: updated.members,
          member_count: updated.member_count,
        }));
        setConversations((prev) =>
          prev.map((c) =>
            c.id === selectedConversation.id
              ? {
                  ...c,
                  members: updated.members,
                  member_count: updated.member_count,
                }
              : c,
          ),
        );
        setToastMessage("Member removed from group");
        loadMessages(selectedConversation, true);
      }
    } catch (err) {
      console.error("Remove member error:", err);
      setError(err.response?.data?.message || "Failed to remove member");
    } finally {
      setGroupActionLoading(false);
    }
  };

  // Delete Group trigger (Opens confirmation popup)
  const handleDeleteGroup = () => {
    if (!selectedConversation?.id) return;
    setShowHeaderMenu(false);
    setShowDeleteGroupModal(true);
  };

  // Confirm delete group action
  const handleConfirmDeleteGroup = async () => {
    if (!selectedConversation?.id) return;
    try {
      setGroupActionLoading(true);
      await deleteGroup(selectedConversation.id);
      setShowDeleteGroupModal(false);
      setShowGroupInfoModal(false);
      setShowEditGroupModal(false);
      setShowManageGroupModal(false);
      setShowHeaderMenu(false);
      setToastMessage(`Group "${selectedConversation.name}" deleted`);
      setSelectedConversation(null);
      await loadConversations();
    } catch (err) {
      console.error("Delete group error:", err);
      setError(err.response?.data?.message || "Failed to delete group");
    } finally {
      setGroupActionLoading(false);
    }
  };

  // Toggle candidate selection for adding to group
  const handleToggleAddCandidate = (empId) => {
    setSelectedAddCandidates((prev) =>
      prev.includes(empId)
        ? prev.filter((id) => id !== empId)
        : [...prev, empId],
    );
  };

  // Save changes from Edit Group Modal (Update name/desc & add checked candidates)
  const handleSaveEditGroup = async (e) => {
    e?.preventDefault();
    if (!selectedConversation?.id) return;
    try {
      setGroupActionLoading(true);
      let anySaved = false;

      // 1. Update name or description if changed
      if (
        editGroupName.trim() &&
        (editGroupName.trim() !== selectedConversation.name ||
          editGroupDesc.trim() !== (selectedConversation.description || ""))
      ) {
        const res = await updateGroup(selectedConversation.id, {
          name: editGroupName.trim(),
          description: editGroupDesc.trim(),
        });
        const updated = res.data?.data;
        if (updated) {
          setManageGroupData((prev) => ({ ...prev, ...updated }));
          setSelectedConversation((prev) => ({
            ...prev,
            name: updated.name,
            description: updated.description,
          }));
          setConversations((prev) =>
            prev.map((c) =>
              c.id === selectedConversation.id
                ? { ...c, name: updated.name, employee_name: updated.name }
                : c,
            ),
          );
          anySaved = true;
        }
      }

      // 2. Add selected candidate members
      if (selectedAddCandidates.length > 0) {
        const res = await addGroupMembers(
          selectedConversation.id,
          selectedAddCandidates,
        );
        const updated = res.data?.data;
        if (updated) {
          setManageGroupData((prev) => ({ ...prev, ...updated }));
          setSelectedConversation((prev) => ({
            ...prev,
            members: updated.members,
            member_count: updated.member_count,
          }));
          setConversations((prev) =>
            prev.map((c) =>
              c.id === selectedConversation.id
                ? {
                    ...c,
                    members: updated.members,
                    member_count: updated.member_count,
                  }
                : c,
            ),
          );
          setSelectedAddCandidates([]);
          anySaved = true;
        }
      }

      if (anySaved) {
        setToastMessage("Group changes saved successfully!");
        loadMessages(selectedConversation, true);
      }
      setShowGroupInfoModal(false);
      setShowEditGroupModal(false);
      setShowManageGroupModal(false);
      setIsEditingGroupDetails(false);
      setShowAddMembersSection(false);
    } catch (err) {
      console.error("Save edit group error:", err);
      setError(err.response?.data?.message || "Failed to save group changes");
    } finally {
      setGroupActionLoading(false);
    }
  };

  // Alias for backward compatibility
  const handleSaveAllGroupChanges = handleSaveEditGroup;

  // Add Emoji to input
  const addEmoji = (emoji) => {
    setMessageText((prev) => prev + emoji);
  };

  // Star / Unstar conversation
  const handleToggleStarConversation = (convId) => {
    setStarredConversationIds((prev) => {
      const isStarred = prev.includes(convId);
      const nextList = isStarred
        ? prev.filter((id) => id !== convId)
        : [...prev, convId];
      localStorage.setItem(
        "chat_starred_conversations",
        JSON.stringify(nextList),
      );
      return nextList;
    });
  };

  // Star / Unstar individual message
  const handleToggleStarMessage = (message) => {
    setOpenMessageMenuId(null);
    const convId =
      selectedConversation?.id || message.conversation_id || message.group_id;

    setStarredMessageIds((prev) => {
      const isStarred = prev.includes(message.id);
      const nextList = isStarred
        ? prev.filter((id) => id !== message.id)
        : [...prev, message.id];
      localStorage.setItem("chat_starred_messages", JSON.stringify(nextList));
      return nextList;
    });

    setStarredMessagesMap((prev) => {
      const isStarred = Boolean(prev[message.id]);
      const nextMap = { ...prev };
      if (isStarred) {
        delete nextMap[message.id];
      } else {
        if (convId) nextMap[message.id] = String(convId);
      }
      localStorage.setItem(
        "chat_starred_messages_map",
        JSON.stringify(nextMap),
      );
      return nextMap;
    });
  };

  // Reply to a message
  const handleReplyClick = (message) => {
    const isMine =
      String(message.sender_id).toLowerCase() ===
        String(loggedInUser?.id).toLowerCase() ||
      String(message.sender_id).toLowerCase() ===
        String(loggedInUser?.registerId).toLowerCase() ||
      (isAdmin && message.sender_role === "admin") ||
      (!isAdmin && message.sender_role === "employee");

    const senderName = isMine
      ? "You"
      : message.sender_name ||
        (selectedConversation?.is_group
          ? selectedConversation.name
          : selectedContactName);
    const parsed = parseReply(message.message);
    let snippet = parsed.content || message.message;
    if (snippet.includes("[ATTACHMENT:")) {
      const att = parseAttachment(snippet);
      snippet = `Attachment: ${att?.name || "file"}`;
    } else if (snippet.includes("[FILE:")) {
      snippet = snippet.replace(/\[FILE:\s*(.*?)\s*\|.*?\]/, "$1");
    }
    setReplyingTo({
      id: message.id,
      sender: senderName,
      text: snippet,
    });
    setEditingMessage(null);
    setOpenMessageMenuId(null);
    setTimeout(() => messageInputRef.current?.focus(), 50);
  };

  // Start editing own message
  const handleStartEdit = (message) => {
    const parsed = parseReply(message.message);
    setEditingMessage(message);
    setReplyingTo(null);
    setMessageText(parsed.content || message.message);
    setOpenMessageMenuId(null);
    setTimeout(() => messageInputRef.current?.focus(), 50);
  };

  // Copy message text to clipboard
  const handleCopyClick = async (message) => {
    const parsed = parseReply(message.message);
    let textToCopy = parsed.content || message.message;
    if (textToCopy.includes("[ATTACHMENT:")) {
      const att = parseAttachment(textToCopy);
      textToCopy = att?.url || att?.name || textToCopy;
    } else if (textToCopy.includes("[FILE:")) {
      textToCopy = textToCopy.replace(/\[FILE:\s*(.*?)\s*\|.*?\]/, "$1");
    }
    try {
      await navigator.clipboard.writeText(textToCopy);
    } catch {
      const textArea = document.createElement("textarea");
      textArea.value = textToCopy;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
    }
    setOpenMessageMenuId(null);
  };

  // Delete own message
  const handleDeleteClick = async (message) => {
    setOpenMessageMenuId(null);
    try {
      await deleteMessage(message.id);
      setMessages((prev) => prev.filter((m) => m.id !== message.id));
      setToastMessage("Message deleted");
    } catch (err) {
      console.error("Delete message error:", err);
      setError(err.response?.data?.message || "Failed to delete message");
    }
  };

  // Open forward modal
  const handleForwardClick = (message) => {
    const parsed = parseReply(message.message);
    setForwardingMessage({
      ...message,
      cleanMessage: parsed.content || message.message,
    });
    setForwardSearchText("");
    setShowForwardModal(true);
    setOpenMessageMenuId(null);
  };

  // Execute forward to target contact
  const handleExecuteForward = async (targetContact) => {
    if (!forwardingMessage) return;
    try {
      setForwardingLoading(true);
      let targetConvId = targetContact.conversationId;
      if (!targetConvId && targetContact.employeeId) {
        const createRes = await createConversation(targetContact.employeeId);
        targetConvId = createRes.data?.data?.id;
      }
      if (!targetConvId) {
        throw new Error("Could not find or create target conversation");
      }

      await sendMessage(
        targetConvId,
        forwardingMessage.cleanMessage || forwardingMessage.message,
      );
      setShowForwardModal(false);
      setForwardingMessage(null);
      setToastMessage(`Message forwarded to ${targetContact.name}!`);
      loadConversations();
    } catch (err) {
      console.error("Forward error:", err);
      setError(err.response?.data?.message || "Failed to forward message");
    } finally {
      setForwardingLoading(false);
    }
  };

  // Pin / Unpin conversation to top
  const handleTogglePinConversation = (convId, e) => {
    e?.stopPropagation();
    setPinnedConversationIds((prev) => {
      const isPinned = prev.includes(convId);
      const updated = isPinned
        ? prev.filter((id) => id !== convId)
        : [convId, ...prev];
      try {
        localStorage.setItem(
          "chat_pinned_conversations",
          JSON.stringify(updated),
        );
      } catch {
        // Ignore storage error
      }
      return updated;
    });
    setOpenSidebarConvMenuId(null);
  };

  // Mark all messages in conversation as read
  const handleMarkConversationAsRead = async (convId, e) => {
    e?.stopPropagation();
    const targetConv = conversations.find((c) => c.id === convId);
    if (!targetConv || Number(targetConv.unread_count) === 0) {
      setOpenSidebarConvMenuId(null);
      return;
    }
    try {
      await markMessagesAsRead(convId);
      setConversations((prev) =>
        prev.map((c) => (c.id === convId ? { ...c, unread_count: 0 } : c)),
      );
      if (selectedConversation?.id === convId) {
        setMessages((prev) => prev.map((m) => ({ ...m, is_read: true })));
      }
    } catch (err) {
      console.error("Mark as read error:", err);
    }
    setOpenSidebarConvMenuId(null);
  };

  const filteredEmployees = employees.filter((employee) => {
    const search = searchText.trim().toLowerCase();
    if (!search) return false;
    return (
      employee.name?.toLowerCase().includes(search) ||
      employee.email?.toLowerCase().includes(search)
    );
  });

  // Filter conversations according to Active Tab (All, Unread, Groups, Starred)
  // AND Sort pinned conversations to the top!
  const displayedConversations = conversations
    .filter((c) => {
      if (activeTab === "unread") {
        return Number(c.unread_count) > 0;
      }
      if (activeTab === "groups") {
        return Boolean(c.is_group);
      }
      if (activeTab === "starred") {
        const hasStarredMsg = Object.values(starredMessagesMap).some(
          (convId) => String(convId) === String(c.id),
        );
        return starredConversationIds.includes(c.id) || hasStarredMsg;
      }
      return true; // 'all' tab
    })
    .sort((a, b) => {
      const aPinned = pinnedConversationIds.includes(a.id);
      const bPinned = pinnedConversationIds.includes(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      return 0;
    });

  const totalUnreadCount = conversations.reduce(
    (acc, curr) => acc + (Number(curr.unread_count) || 0),
    0,
  );

  const groupConversationsCount = conversations.filter((c) =>
    Boolean(c.is_group),
  ).length;

  useEffect(() => {
    loadConversations();
    syncPresence();
    if (isAdmin) {
      loadChatEmployees();
    }
  }, [isAdmin]);

  useEffect(() => {
    const presenceTimer = setInterval(syncPresence, 2500);
    return () => clearInterval(presenceTimer);
  }, []);

  // Scroll to bottom only when selecting a conversation once loading completes
  useEffect(() => {
    if (selectedConversation && !messagesLoading) {
      setTimeout(() => {
        scrollToBottom("auto");
        isAtBottomRef.current = true;
      }, 60);
    }
  }, [selectedConversation?.id, messagesLoading]);

  // Real-time synchronization
  useEffect(() => {
    if (!selectedConversation) return;

    lastMsgCountRef.current = messages.length;

    const interval = setInterval(() => {
      loadMessages(selectedConversation, true);
    }, 2000);

    return () => clearInterval(interval);
  }, [selectedConversation?.id]);

  if (loading) {
    return (
      <div className={`chat-page ${theme}-theme`}>
        <div className="chat-loading">Loading conversations...</div>
      </div>
    );
  }

  const selectedContactName = selectedConversation
    ? selectedConversation.is_group
      ? selectedConversation.name
      : isAdmin
        ? selectedConversation.employee_name || "Employee"
        : selectedConversation.admin_name || "Admin"
    : "";

  const selectedAvatarStyle = getAvatarStyle(selectedContactName);

  const otherContactId =
    selectedConversation && !selectedConversation.is_group
      ? isAdmin
        ? selectedConversation.employee_id
        : selectedConversation.admin_id
      : null;

  const otherContactEmail =
    selectedConversation && !selectedConversation.is_group
      ? isAdmin
        ? selectedConversation.employee_email
        : selectedConversation.admin_email
      : null;

  const isContactOnline = selectedConversation?.is_group
    ? true
    : Boolean(
        (otherContactId && onlineUsers[String(otherContactId).toLowerCase()]) ||
        (otherContactEmail &&
          onlineUsers[String(otherContactEmail).toLowerCase()]) ||
        selectedConversation?.is_online,
      );

  // Targets for Forward Modal
  const forwardTargetList = [
    ...conversations.map((c) => ({
      id: c.id,
      conversationId: c.id,
      is_group: c.is_group,
      name: c.is_group
        ? c.name
        : isAdmin
          ? c.employee_name || "Employee"
          : c.admin_name || "Admin",
      email: c.is_group
        ? `${c.members?.length || 2} members`
        : isAdmin
          ? c.employee_email
          : c.admin_email,
      avatarStyle: getAvatarStyle(
        c.is_group
          ? c.name
          : isAdmin
            ? c.employee_name || ""
            : c.admin_name || "",
      ),
    })),
    ...employees
      .filter(
        (emp) =>
          !conversations.some(
            (c) => !c.is_group && String(c.employee_id) === String(emp.id),
          ),
      )
      .map((emp) => ({
        id: emp.id,
        employeeId: emp.id,
        name: emp.name,
        email: emp.email,
        avatarStyle: getAvatarStyle(emp.name),
      })),
  ].filter((item) => {
    if (!forwardSearchText.trim()) return true;
    const q = forwardSearchText.toLowerCase();
    return (
      item.name?.toLowerCase().includes(q) ||
      item.email?.toLowerCase().includes(q)
    );
  });

  // Filtered member candidates for Group Creation
  const filteredCandidatesForGroup = employees.filter((emp) => {
    if (!groupMemberSearch.trim()) return true;
    const q = groupMemberSearch.toLowerCase();
    return (
      emp.name?.toLowerCase().includes(q) ||
      emp.email?.toLowerCase().includes(q)
    );
  });

  // Candidate employees to add to the existing active group
  const candidateEmployeesToAdd = employees.filter((emp) => {
    const currentMembers =
      manageGroupData?.members || selectedConversation?.members || [];
    const isAlreadyMember = currentMembers.some(
      (m) => String(m.id) === String(emp.id),
    );
    if (isAlreadyMember) return false;
    if (!groupMemberAddSearch.trim()) return true;
    const q = groupMemberAddSearch.toLowerCase();
    const dept = String(
      emp.department || emp.permission_role || emp.role_name || emp.role || "",
    ).toLowerCase();
    return (
      emp.name?.toLowerCase().includes(q) ||
      emp.email?.toLowerCase().includes(q) ||
      dept.includes(q)
    );
  });

  // Active Emoji List based on Category or Search
  const getActiveEmojis = () => {
    if (emojiSearchText.trim()) {
      const q = emojiSearchText.toLowerCase();
      const allEmojis = [
        ...FREQUENT_EMOJIS,
        ...SMILEYS_EMOJIS,
        ...Object.values(CATEGORY_EMOJIS).flat(),
      ];
      return Array.from(new Set(allEmojis));
    }
    if (activeEmojiCategory === "frequent") return FREQUENT_EMOJIS;
    if (activeEmojiCategory === "smileys") return SMILEYS_EMOJIS;
    return CATEGORY_EMOJIS[activeEmojiCategory] || SMILEYS_EMOJIS;
  };

  return (
    <div className={`chat-page ${theme}-theme`}>
      {error && (
        <div className="chat-error">
          <span>{error}</span>
          <button type="button" onClick={() => setError("")}>
            ×
          </button>
        </div>
      )}

      {/* Success feedback toast */}
      <SuccessToast
        message={toastMessage}
        onClose={() => setToastMessage("")}
      />

      <div className="chat-container">
        {/* ================= LEFT SIDEBAR ================= */}
        <aside className="conversation-sidebar">
          <div className="conversation-header">
            <div className="conversation-header-row">
              <div>
                <h2>Messages</h2>
                <p className="sidebar-subtitle">
                  Stay connected with your team
                </p>
              </div>

              {isAdmin && (
                <div
                  className="sidebar-header-menu-wrap"
                  ref={sidebarHeaderMenuRef}
                >
                  <button
                    type="button"
                    className={`sidebar-menu-dots-btn ${showSidebarMenu ? "active" : ""}`}
                    onClick={() => setShowSidebarMenu((prev) => !prev)}
                    title="Menu"
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="5" r="1.5"></circle>
                      <circle cx="12" cy="12" r="1.5"></circle>
                      <circle cx="12" cy="19" r="1.5"></circle>
                    </svg>
                  </button>

                  {showSidebarMenu && (
                    <div className="sidebar-header-dropdown">
                      <button
                        type="button"
                        className="sidebar-header-dropdown-item"
                        onClick={() => {
                          setShowSidebarMenu(false);
                          searchInputRef.current?.focus();
                          if (!searchText) setSearchText(" ");
                        }}
                      >
                        <span className="sidebar-dropdown-icon">💬</span>
                        <span>+ New Chat</span>
                      </button>
                      <button
                        type="button"
                        className="sidebar-header-dropdown-item"
                        onClick={() => {
                          setShowSidebarMenu(false);
                          setShowCreateGroupModal(true);
                        }}
                      >
                        <span className="sidebar-dropdown-icon">👥</span>
                        <span>+ New Group</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Search Box */}
          <div className="chat-search-wrapper">
            <div className="chat-search-box">
              <svg
                className="chat-search-icon"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>

              <input
                ref={searchInputRef}
                type="text"
                value={searchText.trimStart()}
                onChange={handleSearchChange}
                placeholder="Search by name, email or message..."
                aria-label="Search"
              />

              {searchText && (
                <button
                  type="button"
                  className="chat-search-clear"
                  onClick={() => setSearchText("")}
                >
                  ×
                </button>
              )}
            </div>
          </div>

          {/* Filter Tabs (All, Unread, Groups, Starred) */}
          <div className="chat-tabs-bar">
            <button
              type="button"
              className={`chat-tab ${activeTab === "all" ? "active" : ""}`}
              onClick={() => setActiveTab("all")}
            >
              All
            </button>
            <button
              type="button"
              className={`chat-tab ${activeTab === "unread" ? "active" : ""}`}
              onClick={() => setActiveTab("unread")}
            >
              Unread
              {totalUnreadCount > 0 && (
                <span className="tab-unread-badge">{totalUnreadCount}</span>
              )}
            </button>
            <button
              type="button"
              className={`chat-tab ${activeTab === "groups" ? "active" : ""}`}
              onClick={() => setActiveTab("groups")}
            >
              Groups
              {groupConversationsCount > 0 && (
                <span className="tab-groups-badge">
                  {groupConversationsCount}
                </span>
              )}
            </button>
            <button
              type="button"
              className={`chat-tab ${activeTab === "starred" ? "active" : ""}`}
              onClick={() => setActiveTab("starred")}
            >
              Starred
              {(starredConversationIds.length > 0 ||
                Object.keys(starredMessagesMap).length > 0) && (
                <span className="tab-starred-indicator">★</span>
              )}
            </button>
          </div>

          {/* Conversation / Employee / Group List */}
          <div className="conversation-list">
            {isAdmin && searchText.trim() ? (
              employeesLoading ? (
                <div className="search-status">
                  <span className="search-loader"></span>
                  Searching employees...
                </div>
              ) : filteredEmployees.length === 0 ? (
                <div className="search-status">
                  <div className="search-empty-icon">⌕</div>
                  <strong>No employee found</strong>
                  <span>Try another name or email.</span>
                </div>
              ) : (
                <div className="employee-search-results">
                  <div className="search-result-label">
                    Select an Employee to Chat
                  </div>

                  {filteredEmployees.map((employee) => {
                    const avatarStyle = getAvatarStyle(employee.name);
                    return (
                      <button
                        key={employee.id}
                        type="button"
                        className="employee-search-item"
                        onClick={() => handleEmployeeSelect(employee)}
                        disabled={creatingConversation}
                      >
                        <div
                          className="conversation-avatar"
                          style={{
                            background: avatarStyle.bg,
                            color: avatarStyle.text,
                          }}
                        >
                          {employee.name?.charAt(0)?.toUpperCase() || "U"}
                        </div>

                        <div className="conversation-info">
                          <strong className="employee-search-name">
                            {employee.name || "Employee"}
                          </strong>
                          <span className="employee-search-email">
                            {employee.email || ""}
                          </span>
                        </div>

                        <span className="employee-search-arrow">›</span>
                      </button>
                    );
                  })}
                </div>
              )
            ) : displayedConversations.length === 0 ? (
              <div className="empty-conversations">
                <div className="empty-chat-icon">
                  {activeTab === "groups" ? "👥" : "💬"}
                </div>
                <h3>
                  {activeTab === "unread"
                    ? "No unread messages"
                    : activeTab === "groups"
                      ? "No groups yet"
                      : activeTab === "starred"
                        ? "No starred chats"
                        : "No conversations"}
                </h3>
                <p>
                  {activeTab === "unread"
                    ? "You are completely caught up!"
                    : activeTab === "groups"
                      ? "Create a professional team group to collaborate with your team."
                      : activeTab === "starred"
                        ? "Star important conversations from the 3 dots menu in the chat header."
                        : isAdmin
                          ? "Search for an employee above or click '+ New Chat'."
                          : "Your conversations will appear here."}
                </p>
                {activeTab === "groups" && isAdmin && (
                  <button
                    type="button"
                    className="create-group-inline-btn"
                    onClick={() => setShowCreateGroupModal(true)}
                  >
                    + Create Professional Group
                  </button>
                )}
              </div>
            ) : (
              displayedConversations.map((conversation) => {
                const isGroup = Boolean(conversation.is_group);
                const participantName = isGroup
                  ? conversation.name
                  : isAdmin
                    ? conversation.employee_name || "Employee"
                    : conversation.admin_name || "Admin";

                const isSelected = selectedConversation?.id === conversation.id;
                const avatarStyle = getAvatarStyle(participantName);
                const timeLabel = formatConversationTime(
                  conversation.last_message_time || conversation.created_at,
                );

                const participantId = !isGroup
                  ? isAdmin
                    ? conversation.employee_id
                    : conversation.admin_id
                  : null;
                const participantEmail = !isGroup
                  ? isAdmin
                    ? conversation.employee_email
                    : conversation.admin_email
                  : null;

                const isItemOnline = isGroup
                  ? true
                  : Boolean(
                      (participantId &&
                        onlineUsers[String(participantId).toLowerCase()]) ||
                      (participantEmail &&
                        onlineUsers[String(participantEmail).toLowerCase()]) ||
                      conversation.is_online,
                    );

                const unreadCount = Number(conversation.unread_count) || 0;
                let previewMessage =
                  conversation.last_message || "No messages yet";
                if (previewMessage.includes("[ATTACHMENT:")) {
                  const att = parseAttachment(previewMessage);
                  previewMessage = `📎 ${att?.name || "Attachment"}`;
                }

                const previewTime = timeLabel;
                const isConvStarred =
                  starredConversationIds.includes(conversation.id) ||
                  Object.values(starredMessagesMap).some(
                    (convId) => String(convId) === String(conversation.id),
                  );

                const isPinned = pinnedConversationIds.includes(
                  conversation.id,
                );

                return (
                  <div
                    key={conversation.id}
                    role="button"
                    tabIndex={0}
                    className={`conversation-item ${
                      isSelected ? "selected" : ""
                    } ${isGroup ? "group-item" : ""}`}
                    onClick={() => loadMessages(conversation)}
                  >
                    <div
                      className={`conversation-avatar ${isGroup ? "group-avatar" : ""}`}
                      style={{
                        background: isGroup ? "#ede9fe" : avatarStyle.bg,
                        color: isGroup ? "#6d28d9" : avatarStyle.text,
                      }}
                    >
                      {isGroup ? "👥" : participantName.charAt(0).toUpperCase()}
                      {/* Corner dot: Green when online, Red when offline */}
                      <span
                        className={`avatar-corner-badge ${
                          isItemOnline ? "online" : "offline"
                        }`}
                        title={isItemOnline ? "Online" : "Offline"}
                      ></span>
                    </div>

                    <div className="conversation-info">
                      <div className="conversation-top-row">
                        <div className="conversation-name-group">
                          {isPinned && (
                            <span
                              className="sidebar-pin-icon"
                              title="Pinned to top"
                            >
                              📌
                            </span>
                          )}
                          <span
                            className="conversation-user-name"
                            title={participantName}
                          >
                            {participantName}
                          </span>
                          {isGroup && (
                            <span className="group-badge-tag">Group</span>
                          )}
                        </div>
                        <div className="conversation-time-group">
                          {isConvStarred && (
                            <span
                              className="sidebar-starred-star"
                              title="Starred conversation"
                            >
                              ★
                            </span>
                          )}
                          {previewTime && (
                            <span className="conversation-time">
                              {previewTime}
                            </span>
                          )}
                          {unreadCount > 0 && (
                            <span className="unread-dot"></span>
                          )}
                        </div>
                      </div>

                      <div className="conversation-bottom-row">
                        <span className="conversation-last-message">
                          {previewMessage}
                        </span>
                        {unreadCount > 0 && (
                          <span className="unread-badge">{unreadCount}</span>
                        )}
                      </div>
                    </div>

                    {/* Corner 3-dots menu on hover (Pin & Mark as read) */}
                    <div
                      className="sidebar-conv-menu-wrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        className={`sidebar-conv-dots-btn ${
                          openSidebarConvMenuId === conversation.id
                            ? "active"
                            : ""
                        }`}
                        title="Conversation options"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenSidebarConvMenuId((prev) =>
                            prev === conversation.id ? null : conversation.id,
                          );
                        }}
                      >
                        ⋮
                      </button>

                      {openSidebarConvMenuId === conversation.id && (
                        <div
                          className="sidebar-conv-dropdown"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            className="sidebar-conv-dropdown-item"
                            onClick={(e) =>
                              handleTogglePinConversation(conversation.id, e)
                            }
                          >
                            <span className="sidebar-conv-item-icon">📌</span>
                            <span>
                              {isPinned ? "Unpin chat" : "Pin to top"}
                            </span>
                          </button>

                          <button
                            type="button"
                            className={`sidebar-conv-dropdown-item ${
                              unreadCount === 0 ? "disabled" : ""
                            }`}
                            disabled={unreadCount === 0}
                            onClick={(e) => {
                              if (unreadCount === 0) return;
                              handleMarkConversationAsRead(conversation.id, e);
                            }}
                            title={
                              unreadCount === 0
                                ? "All messages are already read"
                                : "Mark as read"
                            }
                          >
                            <span className="sidebar-conv-item-icon">✓</span>
                            <span>Mark as read</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* ================= RIGHT CHAT WINDOW ================= */}
        <main className="chat-main">
          {!selectedConversation ? (
            <div className="chat-empty-state">
              <div className="chat-empty-icon">💬</div>
              <h2>Select a conversation</h2>
              <p>
                {isAdmin
                  ? "Choose a conversation or create a group to start messaging."
                  : "Choose a conversation from the left to start messaging."}
              </p>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="chat-conversation-header">
                <div
                  className={`chat-header-user ${selectedConversation.is_group ? "clickable-group-header" : ""}`}
                  onClick={() =>
                    selectedConversation.is_group && handleOpenGroupManage()
                  }
                  title={
                    selectedConversation.is_group
                      ? "Click to view & manage group"
                      : ""
                  }
                >
                  {/* Round avatar with corner presence dot */}
                  <div
                    className={`chat-user-avatar ${selectedConversation.is_group ? "group-avatar" : ""}`}
                    style={{
                      background: selectedConversation.is_group
                        ? "#ede9fe"
                        : selectedAvatarStyle.bg,
                      color: selectedConversation.is_group
                        ? "#6d28d9"
                        : selectedAvatarStyle.text,
                    }}
                  >
                    {selectedConversation.is_group
                      ? "👥"
                      : selectedContactName.charAt(0).toUpperCase()}
                    <span
                      className={`avatar-corner-badge ${
                        isContactOnline ? "online" : "offline"
                      }`}
                      title={isContactOnline ? "Online" : "Offline"}
                    ></span>
                  </div>

                  <div className="chat-header-info">
                    <div className="chat-header-title-row">
                      <h2>{selectedContactName}</h2>
                      {selectedConversation.is_group && (
                        <span
                          className="group-header-badge clickable-group-header"
                          onClick={() => handleOpenEditGroupModal()}
                          style={{ cursor: "pointer" }}
                          title="Edit Group Details & Members"
                        >
                          Group Chat · Manage ⚙️
                        </span>
                      )}
                      {activeTab === "starred" && (
                        <span
                          className="starred-filter-tag"
                          title="Showing starred messages only"
                        >
                          ★ Starred Messages
                        </span>
                      )}
                    </div>
                    {/* Status text */}
                    <div className="chat-header-status">
                      <span
                        className={`status-text ${
                          isContactOnline ? "online" : "offline"
                        }`}
                      >
                        {selectedConversation.is_group ? (
                          <span
                            onClick={() => handleOpenGroupInfoModal()}
                            style={{
                              cursor: "pointer",
                              textDecoration: "underline",
                            }}
                            title="Click to view group info & members"
                          >
                            {(
                              manageGroupData?.members ||
                              selectedConversation.members ||
                              []
                            ).length || 2}{" "}
                            members (click for info)
                          </span>
                        ) : isContactOnline ? (
                          "Online"
                        ) : (
                          "Offline"
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Header 3-dots Menu with Close Chat */}
                <div className="header-menu-wrap" ref={headerMenuRef}>
                  <button
                    type="button"
                    className={`header-menu-btn ${showHeaderMenu ? "active" : ""}`}
                    title="Chat options"
                    onClick={() => setShowHeaderMenu((prev) => !prev)}
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="5" r="1.5"></circle>
                      <circle cx="12" cy="12" r="1.5"></circle>
                      <circle cx="12" cy="19" r="1.5"></circle>
                    </svg>
                  </button>

                  {showHeaderMenu && (
                    <div className="header-dropdown-menu">
                      {selectedConversation.is_group && (
                        <>
                          <button
                            type="button"
                            className="header-dropdown-item"
                            onClick={() => handleOpenGroupInfoModal()}
                          >
                            <span className="dropdown-item-icon">👥</span>
                            <span>Group Info & Members</span>
                          </button>
                          <button
                            type="button"
                            className="header-dropdown-item"
                            onClick={() => handleOpenEditGroupModal()}
                          >
                            <span className="dropdown-item-icon">✏️</span>
                            <span>Edit Group Details</span>
                          </button>
                          <button
                            type="button"
                            className="header-dropdown-item delete-group-action"
                            onClick={() => handleOpenDeleteGroupModal()}
                          >
                            <span className="dropdown-item-icon">🗑️</span>
                            <span>Delete Group</span>
                          </button>
                          <div className="header-dropdown-divider"></div>
                        </>
                      )}

                      <button
                        type="button"
                        className="header-dropdown-item"
                        onClick={() => {
                          handleToggleStarConversation(selectedConversation.id);
                          setShowHeaderMenu(false);
                        }}
                      >
                        <span className="dropdown-item-icon">
                          {starredConversationIds.includes(
                            selectedConversation.id,
                          )
                            ? "★"
                            : "☆"}
                        </span>
                        <span>
                          {starredConversationIds.includes(
                            selectedConversation.id,
                          )
                            ? "Unstar Conversation"
                            : "Star Conversation"}
                        </span>
                      </button>

                      <div className="header-dropdown-divider"></div>

                      <button
                        type="button"
                        className="header-dropdown-item close-chat-action"
                        onClick={() => {
                          setSelectedConversation(null);
                          setShowHeaderMenu(false);
                        }}
                      >
                        <span className="dropdown-item-icon close-mark-icon">
                          ✕
                        </span>
                        <span>Close Chat</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Active Conversation Sub-header Tabs: Chat, Files, Starred (Matches Picture 2) */}
              <div className="chat-section-tabs">
                <button
                  type="button"
                  className={`chat-section-tab ${conversationViewTab === "chat" ? "active" : ""}`}
                  onClick={() => {
                    setConversationViewTab("chat");
                    if (activeTab === "starred") {
                      setActiveTab("all");
                    }
                  }}
                  title="View all messages in this chat"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill={
                      conversationViewTab === "chat" ? "currentColor" : "none"
                    }
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                  </svg>
                  <span>Chat</span>
                </button>

                <button
                  type="button"
                  className={`chat-section-tab ${conversationViewTab === "files" ? "active" : ""}`}
                  onClick={() => setConversationViewTab("files")}
                  title="View only files, photos, and attachments in this chat"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                  </svg>
                  <span>Files</span>
                </button>

                <button
                  type="button"
                  className={`chat-section-tab ${conversationViewTab === "starred" ? "active" : ""}`}
                  onClick={() => setConversationViewTab("starred")}
                  title="View only starred messages in this chat"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill={
                      conversationViewTab === "starred"
                        ? "currentColor"
                        : "none"
                    }
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                  </svg>
                  <span>Starred</span>
                </button>
              </div>

              {/* Messages Container */}
              <div
                className="messages-container"
                ref={messagesContainerRef}
                onScroll={handleMessagesScroll}
              >
                {(() => {
                  const visibleMessages = (() => {
                    if (conversationViewTab === "files") {
                      return messages.filter((m) => {
                        if (!m) return false;
                        if (
                          m.attachment ||
                          m.attachment_url ||
                          m.file_url ||
                          m.file
                        )
                          return true;
                        const parsed = parseReply(m.message);
                        const att = parseAttachment(parsed.content);
                        return Boolean(att);
                      });
                    }
                    if (
                      conversationViewTab === "starred" ||
                      activeTab === "starred"
                    ) {
                      return messages.filter((m) =>
                        starredMessageIds.includes(m.id),
                      );
                    }
                    return messages;
                  })();

                  if (messagesLoading) {
                    return (
                      <div className="messages-loading">
                        Loading messages...
                      </div>
                    );
                  }

                  if (visibleMessages.length === 0) {
                    if (conversationViewTab === "files") {
                      return (
                        <div className="no-messages">
                          <div
                            className="empty-chat-icon"
                            style={{ color: "#2563eb", background: "#eff6ff" }}
                          >
                            📁
                          </div>
                          <h3>No files or attachments in this chat</h3>
                          <p>
                            Photos, documents, and files shared in this
                            conversation will appear here.
                          </p>
                          <button
                            type="button"
                            className="btn-show-all-msgs"
                            onClick={() => setConversationViewTab("chat")}
                          >
                            Back to chat
                          </button>
                        </div>
                      );
                    }

                    if (
                      conversationViewTab === "starred" ||
                      activeTab === "starred"
                    ) {
                      return (
                        <div className="no-messages">
                          <div
                            className="empty-chat-icon"
                            style={{ color: "#eab308", background: "#fef9c3" }}
                          >
                            ★
                          </div>
                          <h3>No starred messages in this chat</h3>
                          <p>
                            You haven't starred any messages in this chat. Star
                            messages using the 3-dots menu on any message to see
                            them here.
                          </p>
                          <button
                            type="button"
                            className="btn-show-all-msgs"
                            onClick={() => {
                              setConversationViewTab("chat");
                              if (activeTab === "starred") setActiveTab("all");
                            }}
                          >
                            Back to chat
                          </button>
                        </div>
                      );
                    }

                    return (
                      <div className="no-messages">
                        <div className="empty-chat-icon">💬</div>
                        <h3>No messages yet</h3>
                        <p>
                          Start the conversation by sending a message below.
                        </p>
                      </div>
                    );
                  }

                  return visibleMessages.map((message, index) => {
                    const isMine =
                      String(message.sender_id).toLowerCase() ===
                        String(loggedInUser?.id).toLowerCase() ||
                      String(message.sender_id).toLowerCase() ===
                        String(loggedInUser?.registerId).toLowerCase() ||
                      (isAdmin &&
                        message.sender_role === "admin" &&
                        !selectedConversation.is_group) ||
                      (!isAdmin &&
                        message.sender_role === "employee" &&
                        !selectedConversation.is_group);

                    const currentDateLabel = getMessageDateLabel(
                      message.created_at,
                    );
                    const prevDateLabel =
                      index > 0
                        ? getMessageDateLabel(
                            visibleMessages[index - 1].created_at,
                          )
                        : null;
                    const showDateDivider =
                      currentDateLabel && currentDateLabel !== prevDateLabel;

                    const parsed = parseReply(message.message);
                    const attachmentData = parseAttachment(parsed.content);
                    const isPhoto =
                      attachmentData &&
                      isImageUrl(attachmentData.url, attachmentData.type);
                    const isDoc = attachmentData && !isPhoto;
                    let cleanCaption = attachmentData
                      ? parsed.content
                          .replace(/\[ATTACHMENT:\{[\s\S]*?\}\]/gi, "")
                          .replace(/\[ATTACHMENT:[\s\S]*?\]/gi, "")
                          .replace(/\[FILE:[\s\S]*?\]/gi, "")
                          .trim()
                      : parsed.content;

                    if (
                      cleanCaption &&
                      (cleanCaption.includes('"type":') ||
                        cleanCaption.includes('"size":') ||
                        cleanCaption.includes("application/pdf"))
                    ) {
                      cleanCaption = "";
                    }

                    const isStarredMsg = starredMessageIds.includes(message.id);
                    const isMenuOpen = openMessageMenuId === message.id;

                    const senderDisplayName = isMine
                      ? "You"
                      : message.sender_name ||
                        (selectedConversation.is_group
                          ? "Team Member"
                          : selectedContactName);

                    const senderAvatarStyle = getAvatarStyle(senderDisplayName);
                    const senderInitials = getInitials(senderDisplayName);

                    // Render Message 3-dots action menu
                    const isNearBottom =
                      index >= Math.max(0, visibleMessages.length - 4);
                    const renderMessageActions = () => (
                      <div className="msg-actions-wrap">
                        {/* Quick Reaction Button & Popover */}
                        <div className="msg-reaction-wrap">
                          <button
                            type="button"
                            className={`msg-reaction-trigger ${
                              reactionPickerMsgId === message.id ? "active" : ""
                            }`}
                            title="Add reaction"
                            onClick={() => {
                              setOpenMessageMenuId(null);
                              setReactionPickerMsgId((prev) =>
                                prev === message.id ? null : message.id,
                              );
                            }}
                          >
                            <svg
                              width="15"
                              height="15"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <circle cx="12" cy="12" r="10"></circle>
                              <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
                              <line x1="9" y1="9" x2="9.01" y2="9"></line>
                              <line x1="15" y1="9" x2="15.01" y2="9"></line>
                            </svg>
                          </button>

                          {reactionPickerMsgId === message.id && (
                            <div
                              className={`quick-reactions-popover ${
                                isMine ? "mine-popover" : "theirs-popover"
                              }`}
                            >
                              {[
                                "👍",
                                "❤️",
                                "😂",
                                "😮",
                                "😢",
                                "🙏",
                                "🔥",
                                "🎉",
                              ].map((emoji) => {
                                const hasReacted =
                                  Array.isArray(message.reactions) &&
                                  message.reactions.some(
                                    (r) =>
                                      r.emoji === emoji &&
                                      (r.users || []).some(
                                        (u) =>
                                          String(u.id) ===
                                          String(loggedInUser?.id),
                                      ),
                                  );
                                return (
                                  <button
                                    key={emoji}
                                    type="button"
                                    className={`quick-reaction-btn ${
                                      hasReacted ? "active" : ""
                                    }`}
                                    onClick={() => {
                                      handleToggleReaction(message.id, emoji);
                                      setReactionPickerMsgId(null);
                                    }}
                                    title={emoji}
                                  >
                                    {emoji}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* 3 dots action menu trigger */}
                        <button
                          type="button"
                          className={`msg-actions-trigger ${isMenuOpen ? "active" : ""}`}
                          title="Message options"
                          onClick={() => {
                            setReactionPickerMsgId(null);
                            setOpenMessageMenuId((prev) =>
                              prev === message.id ? null : message.id,
                            );
                          }}
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <circle cx="12" cy="5" r="1.5"></circle>
                            <circle cx="12" cy="12" r="1.5"></circle>
                            <circle cx="12" cy="19" r="1.5"></circle>
                          </svg>
                        </button>

                        {isMenuOpen && (
                          <div
                            className={`msg-actions-dropdown ${
                              isMine ? "mine-dropdown" : "theirs-dropdown"
                            } ${isNearBottom ? "open-upwards" : "open-downwards"}`}
                          >
                            {/* Reply button */}
                            <button
                              type="button"
                              className="msg-dropdown-item"
                              onClick={() => handleReplyClick(message)}
                            >
                              <span className="msg-dropdown-icon">↩</span>
                              <span>Reply</span>
                            </button>

                            {/* Edit button (Only for own messages without files) */}
                            {isMine && !attachmentData && (
                              <button
                                type="button"
                                className="msg-dropdown-item"
                                onClick={() => handleStartEdit(message)}
                              >
                                <span className="msg-dropdown-icon">✏️</span>
                                <span>Edit</span>
                              </button>
                            )}

                            {/* Copy button */}
                            <button
                              type="button"
                              className="msg-dropdown-item"
                              onClick={() => handleCopyClick(message)}
                            >
                              <span className="msg-dropdown-icon">📋</span>
                              <span>Copy</span>
                            </button>

                            {/* Forward button */}
                            <button
                              type="button"
                              className="msg-dropdown-item"
                              onClick={() => handleForwardClick(message)}
                            >
                              <span className="msg-dropdown-icon">↪</span>
                              <span>Forward</span>
                            </button>

                            {/* Starred button */}
                            <button
                              type="button"
                              className="msg-dropdown-item"
                              onClick={() => handleToggleStarMessage(message)}
                            >
                              <span className="msg-dropdown-icon">
                                {isStarredMsg ? "★" : "☆"}
                              </span>
                              <span>{isStarredMsg ? "Unstar" : "Starred"}</span>
                            </button>

                            {/* Delete button (Only for own messages) */}
                            {isMine && (
                              <>
                                <div className="msg-dropdown-divider"></div>
                                <button
                                  type="button"
                                  className="msg-dropdown-item delete-item"
                                  onClick={() => handleDeleteClick(message)}
                                >
                                  <span className="msg-dropdown-icon">🗑️</span>
                                  <span>Delete</span>
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );

                    if (isSystemActionMessage(message)) {
                      return (
                        <div
                          key={message.id || index}
                          className="message-item-wrapper"
                        >
                          {showDateDivider && (
                            <div className="chat-date-separator">
                              <div className="separator-line"></div>
                              <span className="separator-pill">
                                {currentDateLabel}
                              </span>
                              <div className="separator-line"></div>
                            </div>
                          )}

                          <div className="chat-system-action-row">
                            <div className="chat-system-action-line"></div>
                            <div className="chat-system-action-pill">
                              <span className="chat-system-action-text">
                                {cleanCaption ||
                                  parsed.content ||
                                  message.message}
                              </span>
                              <span className="chat-system-action-time">
                                {formatMessageTime(message.created_at)}
                              </span>
                            </div>
                            <div className="chat-system-action-line"></div>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={message.id || index}
                        className="message-item-wrapper"
                      >
                        {showDateDivider && (
                          <div className="chat-date-separator">
                            <div className="separator-line"></div>
                            <span className="separator-pill">
                              {currentDateLabel}
                            </span>
                            <div className="separator-line"></div>
                          </div>
                        )}

                        <div
                          className={`message-row ${
                            isMine ? "mine" : "theirs"
                          }`}
                        >
                          {/* Show contact avatar on receiver's side */}
                          {!isMine && (
                            <div
                              className="theirs-avatar"
                              style={{
                                background: senderAvatarStyle.bg,
                                color: senderAvatarStyle.text,
                              }}
                              title={senderDisplayName}
                            >
                              {senderInitials}
                            </div>
                          )}

                          <div className="message-content-wrapper">
                            {/* If own message: 3 dots appear on the left of bubble */}
                            {isMine && renderMessageActions()}

                            <div className="message-bubble-container">
                              {/* Group sender header (matches Picture 2: "Dhruvi Gadhiya 11:42 AM") */}
                              {selectedConversation.is_group && !isMine && (
                                <div className="group-sender-header">
                                  <span className="group-sender-name">
                                    {senderDisplayName}
                                  </span>
                                  <span className="group-sender-time">
                                    {formatMessageTime(message.created_at)}
                                  </span>
                                </div>
                              )}

                              <div
                                className={`message-bubble ${
                                  attachmentData ? "has-attachment-bubble" : ""
                                }`}
                              >
                                {/* Quoted Reply Preview */}
                                {parsed.reply && (
                                  <div className="quoted-reply-banner">
                                    <div className="quoted-reply-line"></div>
                                    <div className="quoted-reply-body">
                                      <span className="quoted-reply-sender">
                                        {parsed.reply.sender}
                                      </span>
                                      <span className="quoted-reply-text">
                                        {parsed.reply.snippet}
                                      </span>
                                    </div>
                                  </div>
                                )}

                                {/* PHOTO ATTACHMENT WITH EYE & DOWNLOAD HOVER (Picture 2) */}
                                {isPhoto && (
                                  <div className="chat-media-card chat-image-card">
                                    <img
                                      src={attachmentData.url}
                                      alt={attachmentData.name}
                                      className="chat-media-image"
                                      onClick={() =>
                                        handlePreviewMedia(attachmentData)
                                      }
                                    />
                                    {/* Hover overlay with Eye and Download buttons */}
                                    <div className="media-hover-overlay">
                                      <button
                                        type="button"
                                        className="media-overlay-btn view-btn"
                                        title="View photo without downloading"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handlePreviewMedia(attachmentData);
                                        }}
                                      >
                                        <svg
                                          width="18"
                                          height="18"
                                          viewBox="0 0 24 24"
                                          fill="none"
                                          stroke="currentColor"
                                          strokeWidth="2.2"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                        >
                                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                          <circle
                                            cx="12"
                                            cy="12"
                                            r="3"
                                          ></circle>
                                        </svg>
                                      </button>

                                      <button
                                        type="button"
                                        className="media-overlay-btn download-btn"
                                        title="Download photo"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDownloadFile(attachmentData);
                                        }}
                                      >
                                        <svg
                                          width="18"
                                          height="18"
                                          viewBox="0 0 24 24"
                                          fill="none"
                                          stroke="currentColor"
                                          strokeWidth="2.2"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                        >
                                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                          <polyline points="7 10 12 15 17 10"></polyline>
                                          <line
                                            x1="12"
                                            y1="15"
                                            x2="12"
                                            y2="3"
                                          ></line>
                                        </svg>
                                      </button>
                                    </div>
                                  </div>
                                )}

                                {/* DOCUMENT ATTACHMENT WITH EYE & DOWNLOAD HOVER (Picture 2) */}
                                {isDoc && (
                                  <div className="chat-media-card chat-document-card">
                                    <div className="document-card-body">
                                      <div className="document-icon-badge">
                                        <svg
                                          width="22"
                                          height="22"
                                          viewBox="0 0 24 24"
                                          fill="currentColor"
                                        >
                                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                          <polyline
                                            points="14 2 14 8 20 8"
                                            fill="none"
                                            stroke="#ffffff"
                                            strokeWidth="2"
                                          ></polyline>
                                        </svg>
                                      </div>
                                      <div className="document-details">
                                        <strong>{attachmentData.name}</strong>
                                        <span>
                                          {Math.round(
                                            (attachmentData.size || 0) / 1024,
                                          )}{" "}
                                          KB
                                        </span>
                                      </div>
                                    </div>

                                    {/* Hover overlay with Eye and Download buttons */}
                                    <div className="media-hover-overlay">
                                      <button
                                        type="button"
                                        className="media-overlay-btn view-btn"
                                        title="View document"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handlePreviewMedia(attachmentData);
                                        }}
                                      >
                                        <svg
                                          width="18"
                                          height="18"
                                          viewBox="0 0 24 24"
                                          fill="none"
                                          stroke="currentColor"
                                          strokeWidth="2.2"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                        >
                                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                          <circle
                                            cx="12"
                                            cy="12"
                                            r="3"
                                          ></circle>
                                        </svg>
                                      </button>

                                      <button
                                        type="button"
                                        className="media-overlay-btn download-btn"
                                        title="Download document"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDownloadFile(attachmentData);
                                        }}
                                      >
                                        <svg
                                          width="18"
                                          height="18"
                                          viewBox="0 0 24 24"
                                          fill="none"
                                          stroke="currentColor"
                                          strokeWidth="2.2"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                        >
                                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                          <polyline points="7 10 12 15 17 10"></polyline>
                                          <line
                                            x1="12"
                                            y1="15"
                                            x2="12"
                                            y2="3"
                                          ></line>
                                        </svg>
                                      </button>
                                    </div>
                                  </div>
                                )}

                                {cleanCaption && <p>{cleanCaption}</p>}

                                <div className="message-meta">
                                  {isStarredMsg && (
                                    <span
                                      className="msg-starred-star"
                                      title="Starred"
                                    >
                                      ★
                                    </span>
                                  )}
                                  {message.is_edited && (
                                    <span className="msg-edited-tag">
                                      (edited)
                                    </span>
                                  )}
                                  <span>
                                    {formatMessageTime(message.created_at)}
                                  </span>
                                  {isMine && (
                                    <span
                                      className={
                                        message.is_read
                                          ? "message-read-check"
                                          : "message-sent-check"
                                      }
                                    >
                                      {message.is_read ? "✓✓" : "✓"}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Message Reactions Pills */}
                              {Array.isArray(message.reactions) &&
                                message.reactions.length > 0 && (
                                  <div
                                    className={`message-reactions-bar ${
                                      isMine
                                        ? "mine-reactions"
                                        : "theirs-reactions"
                                    }`}
                                  >
                                    {message.reactions.map((reactItem) => {
                                      const userList = Array.isArray(
                                        reactItem.users,
                                      )
                                        ? reactItem.users
                                        : [];
                                      const hasReacted = userList.some(
                                        (u) =>
                                          String(u.id) ===
                                          String(loggedInUser?.id),
                                      );
                                      const userNames = userList
                                        .map((u) => u.name || "User")
                                        .join(", ");
                                      return (
                                        <button
                                          key={reactItem.emoji}
                                          type="button"
                                          className={`reaction-pill ${
                                            hasReacted ? "active-reaction" : ""
                                          }`}
                                          onClick={() =>
                                            handleToggleReaction(
                                              message.id,
                                              reactItem.emoji,
                                            )
                                          }
                                          title={
                                            userNames
                                              ? `${userNames} reacted with ${reactItem.emoji}`
                                              : reactItem.emoji
                                          }
                                        >
                                          <span className="reaction-emoji">
                                            {reactItem.emoji}
                                          </span>
                                          <span className="reaction-count">
                                            {userList.length ||
                                              reactItem.count ||
                                              1}
                                          </span>
                                        </button>
                                      );
                                    })}
                                    <button
                                      type="button"
                                      className="reaction-add-btn"
                                      onClick={() =>
                                        setReactionPickerMsgId((prev) =>
                                          prev === message.id
                                            ? null
                                            : message.id,
                                        )
                                      }
                                      title="Add reaction"
                                    >
                                      +
                                    </button>
                                  </div>
                                )}
                            </div>

                            {/* If receiver message: 3 dots appear on the right of bubble */}
                            {!isMine && renderMessageActions()}
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
                <div ref={messagesEndRef} />
              </div>

              {/* Bottom Message Input Area */}
              <div className="message-input-area">
                {/* Active Reply Banner */}
                {replyingTo && (
                  <div className="input-active-banner reply-mode-banner">
                    <div className="input-banner-left">
                      <span className="input-banner-title">
                        ↩ Replying to {replyingTo.sender}
                      </span>
                      <p className="input-banner-desc">{replyingTo.text}</p>
                    </div>
                    <button
                      type="button"
                      className="input-banner-dismiss"
                      onClick={() => setReplyingTo(null)}
                      title="Cancel reply"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* Active Edit Banner (Compact, slim, and subtle) */}
                {editingMessage && (
                  <div className="compact-edit-banner">
                    <div className="compact-edit-content">
                      <span className="compact-edit-icon">✏️</span>
                      <span className="compact-edit-title">
                        Editing message:
                      </span>
                      <span className="compact-edit-snippet">
                        "
                        {parseReply(editingMessage.message)
                          .content.replace(/\n/g, " ")
                          .slice(0, 45)}
                        "
                      </span>
                    </div>
                    <button
                      type="button"
                      className="compact-edit-cancel-btn"
                      onClick={() => {
                        setEditingMessage(null);
                        setMessageText("");
                      }}
                      title="Cancel edit"
                    >
                      ✕ Cancel
                    </button>
                  </div>
                )}

                {/* ADVANCED EMOJI PICKER MODAL (Picture 2) */}
                {showEmojiPicker && (
                  <div
                    className="full-emoji-picker"
                    ref={emojiPickerRef}
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    {/* Top Category Tabs Row with Purple Underline */}
                    <div className="emoji-category-tabs">
                      {EMOJI_CATEGORIES.map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          className={`emoji-cat-btn ${
                            activeEmojiCategory === cat.id ? "active" : ""
                          }`}
                          onClick={() => {
                            setActiveEmojiCategory(cat.id);
                            setEmojiSearchText("");
                          }}
                          title={cat.label}
                        >
                          {cat.icon}
                        </button>
                      ))}
                    </div>

                    {/* Search Bar */}
                    <div className="emoji-search-box">
                      <input
                        type="text"
                        value={emojiSearchText}
                        onChange={(e) => setEmojiSearchText(e.target.value)}
                        placeholder="Search"
                        autoFocus
                      />
                      <span className="emoji-search-icon">🔍</span>
                    </div>

                    {/* Emoji Content List */}
                    <div className="emoji-scroll-body">
                      {!emojiSearchText &&
                      activeEmojiCategory === "frequent" ? (
                        <>
                          <div className="emoji-section-header">
                            Frequently Used
                          </div>
                          <div className="emoji-grid-matrix">
                            {FREQUENT_EMOJIS.map((emoji, idx) => (
                              <button
                                key={`freq-${idx}`}
                                type="button"
                                className="emoji-item-btn"
                                onClick={() => addEmoji(emoji)}
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>

                          <div className="emoji-section-header">
                            Smileys & People
                          </div>
                          <div className="emoji-grid-matrix">
                            {SMILEYS_EMOJIS.map((emoji, idx) => (
                              <button
                                key={`smil-${idx}`}
                                type="button"
                                className="emoji-item-btn"
                                onClick={() => addEmoji(emoji)}
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </>
                      ) : (
                        <div className="emoji-grid-matrix">
                          {getActiveEmojis().map((emoji, idx) => (
                            <button
                              key={`emj-${idx}`}
                              type="button"
                              className="emoji-item-btn"
                              onClick={() => addEmoji(emoji)}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="message-input-box">
                  {/* Paperclip attachment icon: Photos and all Document formats */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileAttach}
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip"
                    style={{ display: "none" }}
                  />
                  <button
                    type="button"
                    className="input-action-btn"
                    onClick={() => fileInputRef.current?.click()}
                    title="Attach photo or document"
                    disabled={sending}
                  >
                    <svg
                      width="19"
                      height="19"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
                    </svg>
                  </button>

                  <textarea
                    ref={messageInputRef}
                    value={messageText}
                    onChange={(event) => setMessageText(event.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={
                      editingMessage
                        ? "Edit your message and hit send..."
                        : replyingTo
                          ? `Reply to ${replyingTo.sender}...`
                          : "Type a message (Enter to send, Shift+Enter for new line)..."
                    }
                    rows={1}
                  />

                  {/* Smiley emoji icon triggering Picture 2 Emoji Picker */}
                  <button
                    type="button"
                    className={`input-action-btn emoji-trigger-btn ${showEmojiPicker ? "active" : ""}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowEmojiPicker((prev) => !prev);
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    title="Insert emoji"
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="10"></circle>
                      <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
                      <line x1="9" y1="9" x2="9.01" y2="9"></line>
                      <line x1="15" y1="9" x2="15.01" y2="9"></line>
                    </svg>
                  </button>

                  {/* Send Button */}
                  <button
                    type="button"
                    className="send-btn-orange"
                    onClick={() => handleSendMessage()}
                    disabled={!messageText.trim() || sending}
                    title={editingMessage ? "Save edit" : "Send message"}
                  >
                    {sending ? (
                      "..."
                    ) : editingMessage ? (
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    ) : (
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="22" y1="2" x2="11" y2="13"></line>
                        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </>
          )}
        </main>
      </div>

      {/* ================= CREATE GROUP CHAT MODAL (EXACT COPY OF IMAGE 1) ================= */}
      {showCreateGroupModal && (
        <div
          className="chat-modal-overlay"
          onClick={() => setShowCreateGroupModal(false)}
        >
          <div
            className="chat-modal-card create-group-card"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header: Orange Icon Box + Title & Subtitle + Close 'X' */}
            <div className="create-group-modal-header">
              <div className="create-group-header-left">
                <div className="create-group-icon-badge">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#ea580c"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                  </svg>
                </div>
                <div className="create-group-header-text">
                  <h3 className="create-group-title">Create Group Chat</h3>
                  <p className="create-group-subtitle">
                    Add group details and select team members.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="chat-modal-close"
                onClick={() => setShowCreateGroupModal(false)}
                title="Close"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={handleCreateGroupSubmit}
              className="create-group-form"
            >
              {/* Group Name Field */}
              <div className="form-group-field">
                <label>
                  Group Name <span className="field-required-star">*</span>
                </label>
                <div className="form-input-with-icon">
                  <span className="form-input-icon">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#94a3b8"
                      strokeWidth="1.9"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                      <circle cx="9" cy="7" r="4"></circle>
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                    </svg>
                  </span>
                  <input
                    type="text"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="e.g. Engineering Team, Marketing Sprint..."
                    required
                    autoFocus
                  />
                </div>
              </div>

              {/* Description / Purpose Field */}
              <div className="form-group-field">
                <label>Description / Purpose</label>
                <div className="form-input-with-icon">
                  <span className="form-input-icon">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#94a3b8"
                      strokeWidth="1.9"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                      <polyline points="10 9 9 9 8 9"></polyline>
                    </svg>
                  </span>
                  <input
                    type="text"
                    value={groupDescription}
                    onChange={(e) => setGroupDescription(e.target.value)}
                    placeholder="e.g. Core team discussions, project updates, daily communication..."
                  />
                </div>
              </div>

              {/* Add Team Members Field */}
              <div className="form-group-field members-selection-field">
                <div className="members-field-header">
                  <label>Add Team Members</label>
                  <span className="selected-count-tag-orange">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                      <circle cx="9" cy="7" r="4"></circle>
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                    </svg>
                    <span>{selectedGroupMembers.length} selected</span>
                  </span>
                </div>

                {/* Search employees */}
                <div className="group-members-search">
                  <span className="search-input-icon">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#94a3b8"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="11" cy="11" r="8"></circle>
                      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                  </span>
                  <input
                    type="text"
                    value={groupMemberSearch}
                    onChange={(e) => setGroupMemberSearch(e.target.value)}
                    placeholder="Search employees by name or email..."
                  />
                </div>

                {/* Members Checklist */}
                <div className="group-members-checklist">
                  {filteredCandidatesForGroup.length === 0 ? (
                    <div className="no-members-found">No employees found</div>
                  ) : (
                    filteredCandidatesForGroup.map((emp) => {
                      const isChecked = selectedGroupMembers.includes(emp.id);
                      const style = getAvatarStyle(emp.name);
                      const dept = getEmployeeDepartment(emp);
                      return (
                        <div
                          key={emp.id}
                          className={`member-check-row ${isChecked ? "checked" : ""}`}
                          onClick={() => handleToggleMemberSelection(emp.id)}
                        >
                          <div
                            className={`custom-checkbox ${isChecked ? "checked" : ""}`}
                          >
                            {isChecked && (
                              <svg
                                width="12"
                                height="12"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="#ffffff"
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <polyline points="20 6 9 17 4 12"></polyline>
                              </svg>
                            )}
                          </div>
                          <div
                            className="member-avatar-mini"
                            style={{
                              background: style.bg,
                              color: style.text,
                            }}
                          >
                            {emp.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="member-check-info">
                            <strong>{emp.name}</strong>
                            <span>{emp.email}</span>
                          </div>
                          <span
                            className="member-dept-badge"
                            style={{
                              background: dept.bg,
                              color: dept.text,
                            }}
                          >
                            {dept.name}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Actions: Cancel & Create Group Chat (Centered) */}
              <div className="create-group-actions">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={() => setShowCreateGroupModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-modal-submit"
                  disabled={!groupName.trim() || creatingGroup}
                >
                  {creatingGroup ? "Creating..." : "Create Group Chat"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= 1. GROUP INFO & MEMBERS MODAL (VIEW ONLY - CLEAN & BEAUTIFUL) ================= */}
      {showGroupInfoModal && (
        <div
          className="chat-modal-overlay p1-modal-overlay"
          onClick={() => setShowGroupInfoModal(false)}
        >
          <div
            className="chat-modal-card p1-manage-group-card"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header: Purple Icon Badge + Title & Subtitle + Close Icon */}
            <div className="p1-modal-header">
              <div className="p1-header-left">
                <div className="p1-group-avatar-badge">
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#6366f1"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
                <div className="p1-header-text">
                  <h3 className="p1-group-title">
                    {manageGroupData?.name ||
                      selectedConversation?.name ||
                      "Group Info"}
                  </h3>
                  <div className="p1-group-subtitle">
                    <span className="p1-subtitle-item">
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                      </svg>
                      {
                        (
                          manageGroupData?.members ||
                          selectedConversation?.members ||
                          []
                        ).length
                      }{" "}
                      {(
                        manageGroupData?.members ||
                        selectedConversation?.members ||
                        []
                      ).length === 1
                        ? "member"
                        : "members"}
                    </span>
                    <span className="p1-bullet">•</span>
                    <span className="p1-subtitle-item">
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect
                          x="3"
                          y="4"
                          width="18"
                          height="18"
                          rx="2"
                          ry="2"
                        />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                      Created by{" "}
                      {manageGroupData?.created_by_name ||
                        selectedConversation?.created_by_name ||
                        "Nancy"}
                    </span>
                    <span className="p1-bullet">•</span>
                    <span className="p1-subtitle-item">
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect
                          x="3"
                          y="4"
                          width="18"
                          height="18"
                          rx="2"
                          ry="2"
                        />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                      {formatGroupCreatedDate(
                        manageGroupData?.created_at ||
                          selectedConversation?.created_at,
                      )}
                    </span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="p1-modal-close"
                onClick={() => setShowGroupInfoModal(false)}
              >
                ✕
              </button>
            </div>

            {/* Sub-header Tabs: Group Details | Members ({count}) (Picture 1) */}
            <div className="p1-modal-tabs">
              <button
                type="button"
                className={`p1-modal-tab ${groupModalActiveTab === "details" ? "active" : ""}`}
                onClick={() => setGroupModalActiveTab("details")}
              >
                Group Details
              </button>
              <button
                type="button"
                className={`p1-modal-tab ${groupModalActiveTab === "members" ? "active" : ""}`}
                onClick={() => setGroupModalActiveTab("members")}
              >
                Members (
                {
                  (
                    manageGroupData?.members ||
                    selectedConversation?.members ||
                    []
                  ).length
                }
                )
              </button>
            </div>

            {/* Modal Body */}
            <div className="p1-modal-body">
              {/* Card 1: Group Details Card (Picture 1) */}
              {(groupModalActiveTab === "details" || !groupModalActiveTab) && (
                <div className="p1-card-box p1-details-card">
                  <div className="p1-card-header">
                    <div className="p1-card-header-left">
                      <div className="p1-card-icon-badge">
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#6366f1"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                          <circle cx="9" cy="7" r="4" />
                          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                      </div>
                      <span className="p1-card-title">Group Details</span>
                    </div>

                    {isAdmin && (
                      <button
                        type="button"
                        className="p1-btn-edit-details"
                        onClick={() =>
                          setIsEditingGroupDetails((prev) => !prev)
                        }
                        title="Edit group name and description"
                      >
                        <svg
                          width="13"
                          height="13"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                        <span>
                          {isEditingGroupDetails ? "Close Edit" : "Edit"}
                        </span>
                      </button>
                    )}
                  </div>

                  {isEditingGroupDetails ? (
                    <div className="p1-edit-details-form">
                      <div className="p1-details-columns">
                        <div className="p1-col-field">
                          <span className="p1-details-label">Name</span>
                          <input
                            type="text"
                            className="p1-input-field"
                            value={editGroupName}
                            onChange={(e) => setEditGroupName(e.target.value)}
                            placeholder="Group Name"
                          />
                        </div>
                        <div className="p1-col-field">
                          <span className="p1-details-label">Description</span>
                          <input
                            type="text"
                            className="p1-input-field"
                            value={editGroupDesc}
                            onChange={(e) => setEditGroupDesc(e.target.value)}
                            placeholder="Description"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p1-details-columns">
                      <div className="p1-col-field">
                        <span className="p1-details-label">Name</span>
                        <span className="p1-details-value">
                          {manageGroupData?.name || selectedConversation?.name}
                        </span>
                      </div>
                      <div className="p1-col-field">
                        <span className="p1-details-label">Description</span>
                        <span className="p1-details-value">
                          {manageGroupData?.description ||
                            selectedConversation?.description ||
                            "discussion!"}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Card 2: Group Members Card with Search Input (Picture 1) */}
              <div className="p1-card-box p1-info-members-card">
                <div className="p1-card-header">
                  <div className="p1-card-header-left">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#475569"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                    <span className="p1-card-title">
                      Group Members (
                      {
                        (
                          manageGroupData?.members ||
                          selectedConversation?.members ||
                          []
                        ).length
                      }
                      )
                    </span>
                  </div>

                  {/* Search members bar (Picture 1) */}
                  <div className="p1-header-search-wrap">
                    <svg
                      className="p1-header-search-icon"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#94a3b8"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                      type="text"
                      className="p1-header-search-input"
                      value={groupMemberFilterText}
                      onChange={(e) => setGroupMemberFilterText(e.target.value)}
                      placeholder="Search members..."
                    />
                  </div>
                </div>

                <div className="p1-members-list">
                  {(() => {
                    const allMembers =
                      manageGroupData?.members ||
                      selectedConversation?.members ||
                      [];
                    const filtered = allMembers.filter((m) => {
                      if (!groupMemberFilterText.trim()) return true;
                      const q = groupMemberFilterText.toLowerCase();
                      return (
                        (m.name && m.name.toLowerCase().includes(q)) ||
                        (m.email && m.email.toLowerCase().includes(q)) ||
                        (m.role && m.role.toLowerCase().includes(q)) ||
                        (m.department && m.department.toLowerCase().includes(q))
                      );
                    });

                    if (filtered.length === 0) {
                      return (
                        <div className="p1-empty-members">
                          No members matching "{groupMemberFilterText}"
                        </div>
                      );
                    }

                    return filtered.map((member) => {
                      const avatar = getAvatarStyle(member.name);
                      const isCurrentUser =
                        String(member.id) === String(loggedInUser?.id);
                      const roleBadge = getRoleBadge(member);
                      const isCreatorOrAdmin =
                        member.role === "admin" ||
                        member.is_admin ||
                        String(member.id) ===
                          String(
                            manageGroupData?.created_by ||
                              selectedConversation?.created_by,
                          ) ||
                        (member.name &&
                          (
                            manageGroupData?.created_by_name ||
                            selectedConversation?.created_by_name ||
                            ""
                          )
                            .toLowerCase()
                            .includes(member.name.toLowerCase()));

                      return (
                        <div key={member.id} className="p1-member-item">
                          <div
                            className="p1-member-avatar"
                            style={{
                              background: avatar.bg,
                              color: avatar.text,
                            }}
                          >
                            {getInitials(member.name)}
                          </div>
                          <div className="p1-member-details">
                            <div className="p1-member-name-row">
                              <span className="p1-member-name">
                                {member.name}
                              </span>
                              {isCreatorOrAdmin && (
                                <span
                                  className="p1-crown-icon"
                                  title="Group Admin / Creator"
                                >
                                  👑
                                </span>
                              )}
                              <span
                                className="p1-role-badge"
                                style={{
                                  background: roleBadge.bg,
                                  color: roleBadge.text,
                                }}
                              >
                                {roleBadge.name}
                              </span>
                              {isCurrentUser && (
                                <span className="p1-you-badge">YOU</span>
                              )}
                            </div>
                            <span className="p1-member-email">
                              {member.email}
                            </span>
                          </div>

                          <div className="p1-member-actions-right">
                            {isAdmin && !isCurrentUser && (
                              <button
                                type="button"
                                className="p1-btn-remove-member"
                                onClick={() =>
                                  handleRemoveMemberFromGroup(member.id)
                                }
                                disabled={groupActionLoading}
                                title="Remove member from group"
                              >
                                <svg
                                  width="13"
                                  height="13"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <polyline points="3 6 5 6 21 6" />
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                </svg>
                                <span>Remove</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* Card 3: Expandable Add More Team Members Section (Picture 1) */}
              {showAddMembersSection && isAdmin && (
                <div className="p1-card-box p1-add-candidates-box">
                  <div className="p1-card-header">
                    <div className="p1-card-header-left">
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#475569"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="8.5" cy="7" r="4" />
                        <line x1="20" y1="8" x2="20" y2="14" />
                        <line x1="23" y1="11" x2="17" y2="11" />
                      </svg>
                      <span className="p1-card-title">
                        Add More Team Members
                      </span>
                    </div>
                    <span className="p1-selected-pill">
                      {selectedAddCandidates.length} selected
                    </span>
                  </div>

                  {/* Search Input Box */}
                  <div className="p1-search-input-wrap">
                    <svg
                      className="p1-search-icon"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#94a3b8"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                      type="text"
                      className="p1-search-input"
                      value={groupMemberAddSearch}
                      onChange={(e) => setGroupMemberAddSearch(e.target.value)}
                      placeholder="Search employees by name, email or department..."
                    />
                  </div>

                  {/* Candidates List with Checkbox, Avatar, Name/Email, Dept Badge, + Add Button */}
                  <div className="p1-candidate-list">
                    {(() => {
                      const currentMemberIds = (
                        manageGroupData?.members ||
                        selectedConversation?.members ||
                        []
                      ).map((m) => String(m.id).toLowerCase());

                      const availableCandidates = employees.filter((emp) => {
                        const empIdStr = String(emp.id).toLowerCase();
                        if (currentMemberIds.includes(empIdStr)) return false;
                        if (!groupMemberAddSearch.trim()) return true;
                        const q = groupMemberAddSearch.toLowerCase();
                        return (
                          (emp.name && emp.name.toLowerCase().includes(q)) ||
                          (emp.email && emp.email.toLowerCase().includes(q)) ||
                          (emp.department &&
                            emp.department.toLowerCase().includes(q))
                        );
                      });

                      if (availableCandidates.length === 0) {
                        return (
                          <div className="p1-empty-candidates">
                            No additional candidates available to add.
                          </div>
                        );
                      }

                      return availableCandidates.map((candidate) => {
                        const isSelected = selectedAddCandidates.includes(
                          candidate.id,
                        );
                        const cAvatar = getAvatarStyle(candidate.name);
                        const deptBadge = getDepartmentBadgeStyle(
                          candidate.department || candidate.role,
                        );

                        return (
                          <div
                            key={candidate.id}
                            className={`p1-candidate-row ${
                              isSelected ? "selected-candidate" : ""
                            }`}
                            onClick={() =>
                              handleToggleAddCandidate(candidate.id)
                            }
                          >
                            <div
                              className={`p1-checkbox ${
                                isSelected ? "checked" : ""
                              }`}
                            >
                              {isSelected && <span>✓</span>}
                            </div>
                            <div
                              className="p1-candidate-avatar"
                              style={{
                                background: cAvatar.bg,
                                color: cAvatar.text,
                              }}
                            >
                              {getInitials(candidate.name)}
                            </div>
                            <div className="p1-candidate-info">
                              <span className="p1-candidate-name">
                                {candidate.name}
                              </span>
                              <span className="p1-candidate-email">
                                {candidate.email}
                              </span>
                            </div>
                            {deptBadge && (
                              <span
                                className="p1-dept-badge"
                                style={{
                                  background: deptBadge.bg,
                                  color: deptBadge.text,
                                }}
                              >
                                {deptBadge.name}
                              </span>
                            )}
                            <button
                              type="button"
                              className="p1-btn-add-pill"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddMemberToGroup(candidate.id);
                              }}
                              disabled={groupActionLoading}
                            >
                              + Add
                            </button>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer: Cancel & Save Changes on right */}
            <div className="p1-modal-footer">
              <div className="p1-footer-right-actions">
                <button
                  type="button"
                  className="p1-btn-cancel"
                  onClick={() => {
                    setShowGroupInfoModal(false);
                    setShowEditGroupModal(false);
                    setIsEditingGroupDetails(false);
                    setShowAddMembersSection(false);
                    setSelectedAddCandidates([]);
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="p1-btn-save-changes"
                  onClick={handleSaveEditGroup}
                  disabled={groupActionLoading}
                >
                  {groupActionLoading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= 2. EDIT GROUP DETAILS & MANAGE MEMBERS MODAL (PICTURE 1 EXACT REPLICA) ================= */}
      {showEditGroupModal && (
        <div
          className="chat-modal-overlay p1-modal-overlay"
          onClick={() => {
            setShowEditGroupModal(false);
            setSelectedAddCandidates([]);
          }}
        >
          <div
            className="chat-modal-card p1-manage-group-card p1-edit-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header: Avatar, Title, Subtitle, Close */}
            <div className="p1-modal-header">
              <div className="p1-header-left">
                <div className="p1-group-avatar-badge">
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="#6366f1"
                  >
                    <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
                  </svg>
                </div>
                <div className="p1-header-text">
                  <h3 className="p1-group-title">Edit Group Details</h3>
                  <div className="p1-group-subtitle">
                    <span>
                      Update group information and manage team members
                    </span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="p1-modal-close"
                onClick={() => {
                  setShowEditGroupModal(false);
                  setSelectedAddCandidates([]);
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body: 2 Columns Layout (Picture 1) */}
            <div className="p1-edit-columns">
              {/* LEFT COLUMN: Card 1 (Group Details) + Card 2 (Group Members) */}
              <div className="p1-edit-col-left">
                {/* Card 1: Group Details */}
                <div className="p1-card-box p1-edit-form-card">
                  <div className="p1-card-header">
                    <div className="p1-card-header-left">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#6366f1"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                      <span className="p1-card-title">Group Details</span>
                    </div>
                  </div>

                  <div className="p1-edit-fields-list">
                    <div className="p1-edit-field-row">
                      <span className="p1-field-label">
                        Name <span className="field-required-star">*</span>
                      </span>
                      <input
                        type="text"
                        className="p1-field-input"
                        value={editGroupName}
                        onChange={(e) => setEditGroupName(e.target.value)}
                        placeholder="Group Name"
                      />
                    </div>

                    <div className="p1-edit-field-row align-top">
                      <span className="p1-field-label">Description</span>
                      <div className="p1-textarea-wrap">
                        <textarea
                          className="p1-field-textarea"
                          maxLength={200}
                          value={editGroupDesc}
                          onChange={(e) => setEditGroupDesc(e.target.value)}
                          placeholder="Description"
                          rows={3}
                        />
                        <span className="p1-char-count">
                          {editGroupDesc.length}/200
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card 2: Group Members (10) */}
                <div className="p1-card-box p1-edit-members-card">
                  <div className="p1-card-header">
                    <div className="p1-card-header-left">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#475569"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                      </svg>
                      <span className="p1-card-title">
                        Group Members (
                        {
                          (
                            manageGroupData?.members ||
                            selectedConversation?.members ||
                            []
                          ).length
                        }
                        )
                      </span>
                    </div>
                    <span className="p1-count-pill">
                      {
                        (
                          manageGroupData?.members ||
                          selectedConversation?.members ||
                          []
                        ).length
                      }{" "}
                      members
                    </span>
                  </div>

                  <div className="p1-members-list p1-members-scroll">
                    {(
                      manageGroupData?.members ||
                      selectedConversation?.members ||
                      []
                    ).map((member) => {
                      const avatar = getAvatarStyle(member.name);
                      const isCurrentUser =
                        String(member.id) === String(loggedInUser?.id);
                      const roleBadge = getRoleBadge(member);

                      return (
                        <div key={member.id} className="p1-member-item">
                          <div
                            className="p1-member-avatar"
                            style={{
                              background: avatar.bg,
                              color: avatar.text,
                            }}
                          >
                            {getInitials(member.name)}
                          </div>
                          <div className="p1-member-details">
                            <div className="p1-member-name-row">
                              <span className="p1-member-name">
                                {member.name}
                              </span>
                              <span
                                className="p1-role-badge"
                                style={{
                                  background: roleBadge.bg,
                                  color: roleBadge.text,
                                }}
                              >
                                {roleBadge.name?.toUpperCase()}
                              </span>
                            </div>
                            <span className="p1-member-email">
                              {member.email}
                            </span>
                          </div>

                          <div className="p1-member-actions-right">
                            {isAdmin && (
                              <button
                                type="button"
                                className="p1-btn-remove-member"
                                onClick={() =>
                                  handleRemoveMemberFromGroup(member.id)
                                }
                                disabled={groupActionLoading}
                                title="Remove member from group"
                              >
                                <svg
                                  width="12"
                                  height="12"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <polyline points="3 6 5 6 21 6" />
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                </svg>
                                <span>Remove</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: Card 3 (Add Team Members with Checkboxes & Summary) */}
              <div className="p1-edit-col-right">
                <div className="p1-add-members-card">
                  <div className="p1-add-members-header">
                    <div className="p1-add-icon-badge">
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#6366f1"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="8.5" cy="7" r="4" />
                        <line x1="20" y1="8" x2="20" y2="14" />
                        <line x1="23" y1="11" x2="17" y2="11" />
                      </svg>
                    </div>
                    <div className="p1-header-text">
                      <span className="p1-add-title">Add Team Members</span>
                      <span className="p1-add-subtitle">
                        Search and add employees to this group
                      </span>
                    </div>
                  </div>

                  {/* Search Input Box with Magnifying Glass */}
                  <div className="p1-search-input-wrap">
                    <svg
                      className="p1-search-icon"
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#94a3b8"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                      type="text"
                      className="p1-search-input"
                      value={groupMemberAddSearch}
                      onChange={(e) => setGroupMemberAddSearch(e.target.value)}
                      placeholder="Search by name, email or department..."
                    />
                  </div>

                  {/* Candidates List with Checkbox, Avatar, Name/Email, Dept Badge */}
                  <div className="p1-candidate-list p1-candidates-scroll">
                    {candidateEmployeesToAdd.length === 0 ? (
                      <div className="p1-empty-candidates">
                        {groupMemberAddSearch.trim()
                          ? "No matching employees found"
                          : "All employees are already in this group"}
                      </div>
                    ) : (
                      candidateEmployeesToAdd.map((emp) => {
                        const isSelected = selectedAddCandidates.includes(
                          emp.id,
                        );
                        const avatar = getAvatarStyle(emp.name);
                        const deptBadge =
                          getDepartmentBadgeStyle(emp.department) ||
                          getRoleBadge(emp);

                        return (
                          <div
                            key={emp.id}
                            className={`p1-candidate-row ${isSelected ? "selected" : ""}`}
                            onClick={() => handleToggleAddCandidate(emp.id)}
                          >
                            <div
                              className={`p1-candidate-checkbox ${isSelected ? "checked" : ""}`}
                            >
                              {isSelected && (
                                <svg
                                  width="12"
                                  height="12"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="#ffffff"
                                  strokeWidth="3"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              )}
                            </div>
                            <div
                              className="p1-candidate-avatar"
                              style={{
                                background: avatar.bg,
                                color: avatar.text,
                              }}
                            >
                              {getInitials(emp.name)}
                            </div>
                            <div className="p1-candidate-info">
                              <span className="p1-candidate-name">
                                {emp.name}
                              </span>
                              <span className="p1-candidate-email">
                                {emp.email}
                              </span>
                            </div>
                            <span
                              className="p1-dept-badge"
                              style={{
                                background: deptBadge.bg,
                                color: deptBadge.text,
                              }}
                            >
                              {deptBadge.name}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Bottom selection footer inside Card 3 (Picture 1) */}
                  <div className="p1-selected-summary-bar">
                    <div className="p1-summary-left">
                      <div className="p1-selected-avatar-stack">
                        {selectedAddCandidates.slice(0, 3).map((candId) => {
                          const cEmp = employees.find(
                            (e) => String(e.id) === String(candId),
                          );
                          if (!cEmp) return null;
                          const cAvatar = getAvatarStyle(cEmp.name);
                          return (
                            <div
                              key={candId}
                              className="p1-stack-chip"
                              style={{
                                background: cAvatar.bg,
                                color: cAvatar.text,
                              }}
                            >
                              {getInitials(cEmp.name)}
                            </div>
                          );
                        })}
                      </div>
                      <span className="p1-selected-count-text">
                        {selectedAddCandidates.length} selected
                      </span>
                    </div>

                    {selectedAddCandidates.length > 0 && (
                      <button
                        type="button"
                        className="p1-btn-clear-selection"
                        onClick={() => setSelectedAddCandidates([])}
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer: Delete Entire Group on left, Cancel & Save Changes on right (Picture 1) */}
            <div className="p1-modal-footer">
              {isAdmin ? (
                <button
                  type="button"
                  className="p1-btn-delete-entire-group"
                  onClick={handleDeleteGroup}
                  title="Delete this entire group"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                  <span>Delete Entire Group</span>
                </button>
              ) : (
                <div></div>
              )}

              <div className="p1-footer-right-actions">
                <button
                  type="button"
                  className="p1-btn-cancel"
                  onClick={() => {
                    setShowEditGroupModal(false);
                    setSelectedAddCandidates([]);
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="p1-btn-save-changes"
                  onClick={handleSaveEditGroup}
                  disabled={groupActionLoading || !editGroupName.trim()}
                >
                  {groupActionLoading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= 3. DELETE GROUP CONFIRMATION POPUP MODAL ================= */}
      {showDeleteGroupModal && (
        <div
          className="chat-modal-overlay delete-confirm-overlay"
          onClick={() => setShowDeleteGroupModal(false)}
        >
          <div
            className="chat-modal-card delete-confirm-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="delete-confirm-icon-wrap">
              <svg
                width="30"
                height="30"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#dc2626"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>

            <h3 className="delete-confirm-title">Delete Entire Group?</h3>
            <p className="delete-confirm-desc">
              Are you sure you want to delete the group{" "}
              <strong>"{selectedConversation?.name}"</strong>? All conversation
              messages, attachments, and member access in this group will be
              permanently removed. This action cannot be undone.
            </p>

            <div className="delete-confirm-actions">
              <button
                type="button"
                className="btn-modal-cancel"
                onClick={() => setShowDeleteGroupModal(false)}
                disabled={groupActionLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-confirm-delete-danger"
                onClick={handleConfirmDeleteGroup}
                disabled={groupActionLoading}
              >
                {groupActionLoading ? "Deleting..." : "Delete Group"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= PICTURE 5 LIGHTBOX VIEWER ================= */}
      {lightboxFile && (
        <div className="lightbox-overlay" onClick={() => setLightboxFile(null)}>
          <div
            className="lightbox-container"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Bar matching Picture 5 */}
            <div className="lightbox-top-bar">
              <div className="lightbox-file-meta">
                <span className="lightbox-file-title" title={lightboxFile.name}>
                  {lightboxFile.name || "image.png"}
                </span>
                <span className="lightbox-file-size">
                  {Math.round((lightboxFile.size || 0) / 1024)} KB
                </span>
              </div>

              <div className="lightbox-actions-group">
                {/* 3-dots */}
                <button
                  type="button"
                  className="lightbox-btn"
                  title="More options"
                >
                  ⋮
                </button>

                {/* Rotate button */}
                {isImageUrl(lightboxFile.url, lightboxFile.type) && (
                  <button
                    type="button"
                    className="lightbox-btn"
                    onClick={() =>
                      setImageRotation((prev) => (prev + 90) % 360)
                    }
                    title="Rotate 90°"
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="23 4 23 10 17 10"></polyline>
                      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                    </svg>
                  </button>
                )}

                {/* Download button */}
                <button
                  type="button"
                  className="lightbox-btn"
                  onClick={() => handleDownloadFile(lightboxFile)}
                  title="Download file"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                </button>

                {/* Close button */}
                <button
                  type="button"
                  className="lightbox-btn lightbox-close-btn"
                  onClick={() => setLightboxFile(null)}
                  title="Close"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Stage with Navigation Arrows matching Picture 5 */}
            <div className="lightbox-viewport-stage">
              {conversationAttachments.length > 1 && (
                <button
                  type="button"
                  className="lightbox-arrow-btn left-arrow"
                  onClick={handlePrevAttachment}
                  title="Previous"
                >
                  ‹
                </button>
              )}

              <div className="lightbox-content-display">
                {isImageUrl(lightboxFile.url, lightboxFile.type) ? (
                  <img
                    src={lightboxFile.url}
                    alt={lightboxFile.name}
                    className="lightbox-displayed-img"
                    style={{ transform: `rotate(${imageRotation}deg)` }}
                    onError={(e) => {
                      e.target.src = `${API_URL}/uploads/chat/Screenshot%202026-08-04%20110833.png`;
                    }}
                  />
                ) : lightboxFile.type?.includes("pdf") ||
                  /\.pdf$/i.test(lightboxFile.url) ? (
                  <iframe
                    src={lightboxFile.url}
                    title={lightboxFile.name}
                    className="lightbox-embedded-pdf"
                  />
                ) : (
                  <div className="lightbox-document-panel">
                    <div className="doc-icon-large">📄</div>
                    <h3>{lightboxFile.name}</h3>
                    <p>
                      {Math.round((lightboxFile.size || 0) / 1024)} KB ·
                      Document file
                    </p>
                    <button
                      type="button"
                      className="lightbox-action-btn"
                      onClick={() => handleDownloadFile(lightboxFile)}
                    >
                      Download and Open File
                    </button>
                  </div>
                )}
              </div>

              {conversationAttachments.length > 1 && (
                <button
                  type="button"
                  className="lightbox-arrow-btn right-arrow"
                  onClick={handleNextAttachment}
                  title="Next"
                >
                  ›
                </button>
              )}
            </div>

            {/* Bottom Gallery Filmstrip matching Picture 5 */}
            {conversationAttachments.length > 0 && (
              <div className="lightbox-filmstrip-strip">
                {conversationAttachments.map((att, idx) => {
                  const isCur =
                    att.url === lightboxFile.url ||
                    att.name === lightboxFile.name;
                  const isImg = isImageUrl(att.url, att.type);
                  return (
                    <div
                      key={`film-${idx}`}
                      className={`filmstrip-item-thumb ${isCur ? "active-thumb" : ""}`}
                      onClick={() => {
                        setLightboxFile(att);
                        setLightboxIndex(idx);
                        setImageRotation(0);
                      }}
                      title={att.name}
                    >
                      {isImg ? (
                        <img
                          src={att.url}
                          alt={att.name}
                          onError={(e) => {
                            e.target.src = `${API_URL}/uploads/chat/Screenshot%202026-08-04%20110833.png`;
                          }}
                        />
                      ) : (
                        <div className="filmstrip-doc-badge">
                          <span>PDF</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= FORWARD MODAL ================= */}
      {showForwardModal && (
        <div
          className="chat-modal-overlay"
          onClick={() => setShowForwardModal(false)}
        >
          <div className="chat-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="chat-modal-header">
              <h3>Forward Message</h3>
              <button
                type="button"
                className="chat-modal-close"
                onClick={() => setShowForwardModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="forward-message-preview">
              <span className="forward-preview-label">Selected message:</span>
              <p className="forward-preview-text">
                {forwardingMessage?.cleanMessage || forwardingMessage?.message}
              </p>
            </div>

            <div className="forward-search-box">
              <input
                type="text"
                value={forwardSearchText}
                onChange={(e) => setForwardSearchText(e.target.value)}
                placeholder="Search contact or conversation..."
                autoFocus
              />
            </div>

            <div className="forward-contact-list">
              {forwardTargetList.length === 0 ? (
                <div className="forward-empty-state">No contacts found</div>
              ) : (
                forwardTargetList.map((contact) => (
                  <button
                    key={contact.id}
                    type="button"
                    className="forward-contact-item"
                    onClick={() => handleExecuteForward(contact)}
                    disabled={forwardingLoading}
                  >
                    <div
                      className="conversation-avatar"
                      style={{
                        background: contact.avatarStyle.bg,
                        color: contact.avatarStyle.text,
                      }}
                    >
                      {contact.is_group
                        ? "👥"
                        : contact.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="forward-contact-info">
                      <strong>{contact.name}</strong>
                      <span>{contact.email || "Conversation"}</span>
                    </div>
                    <span className="forward-send-icon">↪ Forward</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Chat;
