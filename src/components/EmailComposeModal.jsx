import { useState, useEffect, useRef } from "react";
import {
  sendEmail,
  saveDraft,
  searchRecipients,
  getTemplates,
} from "../services/emailService";
import "./EmailComposeModal.css";
import RichEmojiPicker from "./RichEmojiPicker";
import CustomDatePicker from "./CustomDatePicker";
import AttachmentPreviewModal from "./AttachmentPreviewModal";

const DRAFT_STORAGE_KEY = "email_compose_draft_state";

const getSavedDraftState = () => {
  try {
    const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
};

function EmailComposeModal({
  isOpen,
  onClose,
  onSent,
  initialData = null,
  expandTrigger = 0,
}) {
  const [isMinimized, setIsMinimized] = useState(() => {
    const saved = getSavedDraftState();
    return saved && typeof saved.isMinimized === "boolean" ? saved.isMinimized : false;
  });
  const [isMaximized, setIsMaximized] = useState(() => {
    const saved = getSavedDraftState();
    return saved && typeof saved.isMaximized === "boolean" ? saved.isMaximized : false;
  });

  // Form Fields
  const [toList, setToList] = useState(() => {
    const saved = getSavedDraftState();
    return saved && Array.isArray(saved.toList) ? saved.toList : [];
  });
  const [toInput, setToInput] = useState("");
  const toInputRef = useRef(null);
  const [isToFocused, setIsToFocused] = useState(false);
  const [ccList, setCcList] = useState(() => {
    const saved = getSavedDraftState();
    return saved && Array.isArray(saved.ccList) ? saved.ccList : [];
  });
  const [ccInput, setCcInput] = useState("");
  const [bccList, setBccList] = useState(() => {
    const saved = getSavedDraftState();
    return saved && Array.isArray(saved.bccList) ? saved.bccList : [];
  });
  const [bccInput, setBccInput] = useState("");
  const [showCc, setShowCc] = useState(() => {
    const saved = getSavedDraftState();
    return saved ? !!saved.showCc : false;
  });
  const [showBcc, setShowBcc] = useState(() => {
    const saved = getSavedDraftState();
    return saved ? !!saved.showBcc : false;
  });
  const [subject, setSubject] = useState(() => {
    const saved = getSavedDraftState();
    return saved && typeof saved.subject === "string" ? saved.subject : "";
  });
  const [draftId, setDraftId] = useState(() => {
    const saved = getSavedDraftState();
    return saved?.draftId || null;
  });

  // Attachments
  const [attachments, setAttachments] = useState([]);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);

  // Recipient Auto-suggest / Directory
  const [suggestions, setSuggestions] = useState([]);
  const [activeField, setActiveField] = useState("to"); // "to" | "cc" | "bcc"
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Templates
  const [templates, setTemplates] = useState([]);
  const [showTemplateDropdown, setShowTemplateDropdown] = useState(false);

  // Emoji Popover & Templates Refs
  const [showEmojiPopover, setShowEmojiPopover] = useState(false);
  const emojiPopoverRef = useRef(null);
  const templateDropdownRef = useRef(null);
  const suggestionsRef = useRef(null);

  // Hyperlink Modal (Title / Display text + Link URL)
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkDisplayText, setLinkDisplayText] = useState("");
  const [linkUrl, setLinkUrl] = useState("https://");
  const [savedLinkRange, setSavedLinkRange] = useState(null);
  const linkTitleInputRef = useRef(null);
  const linkUrlInputRef = useRef(null);

  // Formatting state: starts strictly left, bold/italic/underline/strike status
  const [paragraphFormat, setParagraphFormat] = useState("p");
  const [showParagraphDropdown, setShowParagraphDropdown] = useState(false);
  const paragraphDropdownRef = useRef(null);
  const paragraphOptions = [
    { value: "p", label: "Paragraph" },
    { value: "h1", label: "Heading 1" },
    { value: "h2", label: "Heading 2" },
    { value: "h3", label: "Heading 3" },
    { value: "blockquote", label: "Quote" },
  ];
  const currentParagraphLabel =
    paragraphOptions.find((o) => o.value === paragraphFormat)?.label || "Paragraph";

  const [activeAlign, setActiveAlign] = useState("left");
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrike, setIsStrike] = useState(false);

  // Loading & State
  const [sending, setSending] = useState(false);
  const [draftSaving, setDraftSaving] = useState(false);

  // Undo Send States
  const [undoSending, setUndoSending] = useState(false);
  const [undoCountdown, setUndoCountdown] = useState(6);
  const pendingSendRef = useRef(null);
  const undoTimerRef = useRef(null);
  const undoIntervalRef = useRef(null);

  // Drag and Drop Attachment States
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const dragCounterRef = useRef(0);

  // In-Browser Document & PDF Preview Lightbox
  const [previewAttachment, setPreviewAttachment] = useState(null);
  // Image Selection & Remove State
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedImagePos, setSelectedImagePos] = useState(null);

  // Schedule Send States
  const [showScheduleMenu, setShowScheduleMenu] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [customDateTime, setCustomDateTime] = useState("");
  const scheduleMenuRef = useRef(null);

  const [errorMessage, setErrorMessage] = useState("");
  const [successToast, setSuccessToast] = useState("");

  const bodyEditorRef = useRef(null);

  // Dismiss dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        emojiPopoverRef.current &&
        !emojiPopoverRef.current.contains(e.target)
      ) {
        setShowEmojiPopover(false);
      }
      if (
        templateDropdownRef.current &&
        !templateDropdownRef.current.contains(e.target)
      ) {
        setShowTemplateDropdown(false);
      }
      if (
        paragraphDropdownRef.current &&
        !paragraphDropdownRef.current.contains(e.target)
      ) {
        setShowParagraphDropdown(false);
      }
      if (
        scheduleMenuRef.current &&
        !scheduleMenuRef.current.contains(e.target) &&
        !e.target.closest(".schedule-center-modal-card") &&
        !e.target.closest(".schedule-center-modal-backdrop") &&
        !e.target.closest(".custom-datepicker-dropdown-menu")
      ) {
        setShowScheduleMenu(false);
      }
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target) &&
        !e.target.closest(".btn-address-book")
      ) {
        setShowSuggestions(false);
      }
      if (
        !e.target.closest(".image-actions-popover") &&
        e.target.tagName !== "IMG"
      ) {
        if (bodyEditorRef.current) {
          bodyEditorRef.current.querySelectorAll("img.selected-img").forEach((el) => {
            el.classList.remove("selected-img");
          });
        }
        setSelectedImage(null);
        setSelectedImagePos(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close Link Modal on Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && showLinkModal) {
        setShowLinkModal(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showLinkModal]);

  // Sync image popover position on scroll or resize
  useEffect(() => {
    if (!selectedImage) return;

    const handleSyncPos = () => {
      updateImagePos(selectedImage);
    };

    window.addEventListener("resize", handleSyncPos);
    window.addEventListener("scroll", handleSyncPos, true);
    return () => {
      window.removeEventListener("resize", handleSyncPos);
      window.removeEventListener("scroll", handleSyncPos, true);
    };
  }, [selectedImage]);

  // Un-minimize if compose is triggered while already open
  useEffect(() => {
    if (isOpen && expandTrigger > 0) {
      setIsMinimized(false);
      setIsMaximized(false);
    }
  }, [expandTrigger, isOpen]);

  // Lock body scroll while modal is actively open and not minimized
  useEffect(() => {
    if (isOpen && !isMinimized && !undoSending) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [isOpen, isMinimized, undoSending]);

  // Clean up undo send timers on unmount
  useEffect(() => {
    return () => {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
      if (undoIntervalRef.current) clearInterval(undoIntervalRef.current);
    };
  }, []);

  const isFirstMountRef = useRef(true);

  // Initialize data on open or when initialData changes
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setToList(
          Array.isArray(initialData.to)
            ? initialData.to
            : initialData.to
            ? [initialData.to]
            : []
        );
        setCcList(
          Array.isArray(initialData.cc)
            ? initialData.cc
            : initialData.cc
            ? [initialData.cc]
            : []
        );
        setBccList(
          Array.isArray(initialData.bcc)
            ? initialData.bcc
            : initialData.bcc
            ? [initialData.bcc]
            : []
        );
        setSubject(initialData.subject || "");
        setDraftId(initialData.draftId || null);

        const initialHtml = initialData.bodyHtml || initialData.bodyText || "";
        if (bodyEditorRef.current) {
          bodyEditorRef.current.innerHTML = initialHtml;
        }

        if (initialData.cc && initialData.cc.length > 0) setShowCc(true);
        if (initialData.bcc && initialData.bcc.length > 0) setShowBcc(true);
      } else if (!isFirstMountRef.current) {
        // If not initial mount and user explicitly opened with no initialData, reset
        resetForm();
      } else {
        // First mount (such as page refresh / restore from localStorage)
        const saved = getSavedDraftState();
        if (saved?.bodyHtml && bodyEditorRef.current) {
          bodyEditorRef.current.innerHTML = saved.bodyHtml;
        }
      }
      isFirstMountRef.current = false;
      loadTemplatesList();
    }
  }, [isOpen, initialData]);

  // Restore editor body HTML when modal is un-minimized or opened
  useEffect(() => {
    if (isOpen && !isMinimized && bodyEditorRef.current) {
      const saved = getSavedDraftState();
      if (saved?.bodyHtml && !bodyEditorRef.current.innerHTML) {
        bodyEditorRef.current.innerHTML = saved.bodyHtml;
      }
    }
  }, [isOpen, isMinimized]);

  // Continuously sync compose draft state and minimization status to localStorage
  useEffect(() => {
    if (isOpen) {
      try {
        const currentHtml = bodyEditorRef.current
          ? bodyEditorRef.current.innerHTML
          : (getSavedDraftState()?.bodyHtml || "");
        const draftState = {
          isMinimized,
          isMaximized,
          toList,
          ccList,
          bccList,
          showCc,
          showBcc,
          subject,
          draftId,
          bodyHtml: currentHtml,
        };
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftState));
      } catch (e) {
        console.warn("Could not save compose draft to localStorage:", e);
      }
    }
  }, [isOpen, isMinimized, isMaximized, toList, ccList, bccList, showCc, showBcc, subject, draftId]);

  const resetForm = () => {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch {}
    setToList([]);
    setToInput("");
    setIsToFocused(false);
    setCcList([]);
    setCcInput("");
    setBccList([]);
    setBccInput("");
    setShowCc(false);
    setShowBcc(false);
    setSubject("");
    setDraftId(null);
    setAttachments([]);
    setErrorMessage("");
    setSuccessToast("");
    setIsMinimized(false);
    setIsMaximized(false);
    setParagraphFormat("p");
    setActiveAlign("left");
    setIsBold(false);
    setIsItalic(false);
    setIsUnderline(false);
    setIsStrike(false);
    setShowEmojiPopover(false);
    setShowTemplateDropdown(false);
    setShowSuggestions(false);
    if (bodyEditorRef.current) {
      bodyEditorRef.current.innerHTML = "";
    }
  };

  const handleModalClose = () => {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      localStorage.removeItem("email_compose_open_state");
    } catch {}
    resetForm();
    onClose();
  };

  const handleEditorInput = () => {
    updateToolbarStates();
    if (isOpen) {
      try {
        const saved = getSavedDraftState() || {};
        saved.bodyHtml = bodyEditorRef.current ? bodyEditorRef.current.innerHTML : "";
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(saved));
      } catch {}
    }
  };

  const loadTemplatesList = async () => {
    try {
      const res = await getTemplates();
      if (res.success) {
        setTemplates(res.templates || []);
      }
    } catch (e) {
      console.warn("Could not load templates:", e);
    }
  };

  // Search recipients as user types
  const handleRecipientInputChange = async (value, field) => {
    if (field === "to") setToInput(value);
    else if (field === "cc") setCcInput(value);
    else if (field === "bcc") setBccInput(value);

    setActiveField(field);

    if (value.trim().length >= 1) {
      try {
        const res = await searchRecipients(value.trim());
        setSuggestions(res.recipients || []);
        setShowSuggestions(true);
      } catch (err) {
        console.error("Recipient search error:", err);
      }
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // Add recipient chip
  const addRecipient = (email, field = activeField) => {
    const trimmed = (email || "").trim();
    if (!trimmed) return;

    if (field === "to") {
      if (!toList.includes(trimmed)) setToList([...toList, trimmed]);
      setToInput("");
    } else if (field === "cc") {
      if (!ccList.includes(trimmed)) setCcList([...ccList, trimmed]);
      setCcInput("");
    } else if (field === "bcc") {
      if (!bccList.includes(trimmed)) setBccList([...bccList, trimmed]);
      setBccInput("");
    }

    setSuggestions([]);
    setShowSuggestions(false);
  };

  // Remove recipient chip
  const removeRecipient = (index, field) => {
    if (field === "to") {
      setToList(toList.filter((_, i) => i !== index));
    } else if (field === "cc") {
      setCcList(ccList.filter((_, i) => i !== index));
    } else if (field === "bcc") {
      setBccList(bccList.filter((_, i) => i !== index));
    }
  };

  // Handle Enter or Comma key in recipient inputs
  const handleKeyDown = (e, field) => {
    if (e.key === "Enter" || e.key === "," || e.key === "Tab") {
      e.preventDefault();
      const val =
        field === "to" ? toInput : field === "cc" ? ccInput : bccInput;
      if (val.trim()) {
        addRecipient(val.trim(), field);
      }
    } else if (e.key === "Backspace" && !e.target.value) {
      if (field === "to" && toList.length > 0) {
        removeRecipient(toList.length - 1, "to");
      } else if (field === "cc" && ccList.length > 0) {
        removeRecipient(ccList.length - 1, "cc");
      } else if (field === "bcc" && bccList.length > 0) {
        removeRecipient(bccList.length - 1, "bcc");
      }
    }
  };

  // Toggle contacts directory list
  const handleToggleAddressBook = async (field = "to") => {
    setActiveField(field);
    if (!showSuggestions || activeField !== field) {
      try {
        const res = await searchRecipients("");
        setSuggestions(res.recipients || []);
        setShowSuggestions(true);
      } catch (err) {
        console.error(err);
      }
    } else {
      setShowSuggestions(false);
    }
  };

  // Helper to insert an image file directly inline into rich text editor (Gmail style matching Pic 3)
  const insertInlineImageFile = (file) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target.result;
      if (bodyEditorRef.current) {
        bodyEditorRef.current.focus();

        const img = document.createElement("img");
        img.src = dataUrl;
        img.alt = file.name || "inline image";
        img.style.maxWidth = "260px";
        img.style.maxHeight = "190px";
        img.style.width = "auto";
        img.style.height = "auto";
        img.style.objectFit = "contain";
        img.style.display = "inline-block";
        img.style.margin = "8px 0";
        img.style.border = "none";
        img.style.outline = "none";
        img.style.boxShadow = "none";
        img.style.borderRadius = "6px";
        img.style.cursor = "pointer";

        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0 && bodyEditorRef.current.contains(sel.anchorNode)) {
          const range = sel.getRangeAt(0);
          range.deleteContents();
          range.insertNode(img);

          const p = document.createElement("p");
          p.innerHTML = "<br>";
          if (img.nextSibling) {
            img.parentNode.insertBefore(p, img.nextSibling);
          } else {
            img.parentNode.appendChild(p);
          }

          const newRange = document.createRange();
          newRange.setStart(p, 0);
          newRange.collapse(true);
          sel.removeAllRanges();
          sel.addRange(newRange);
        } else {
          bodyEditorRef.current.appendChild(img);
          const p = document.createElement("p");
          p.innerHTML = "<br>";
          bodyEditorRef.current.appendChild(p);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  // Drag and Drop Handlers
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDraggingFile(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDraggingFile(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);
    dragCounterRef.current = 0;
    const droppedFiles = Array.from(e.dataTransfer.files || []);
    if (droppedFiles.length > 0) {
      const nonImageFiles = [];
      let err = "";
      droppedFiles.forEach((file) => {
        if (file.size > 25 * 1024 * 1024) {
          err = `File "${file.name}" exceeds maximum allowed size of 25MB.`;
          return;
        }
        const isImage =
          file.type?.startsWith("image/") ||
          /.(png|jpe?g|gif|webp|bmp|svg)$/i.test(file.name);
        if (isImage) {
          // Embed inline into rich text editor (Gmail style matching Pic 3)
          insertInlineImageFile(file);
        } else {
          // Non-image files go to attachment strip
          nonImageFiles.push(file);
        }
      });
      if (err) setErrorMessage(err);
      if (nonImageFiles.length > 0) {
        setAttachments((prev) => [...prev, ...nonImageFiles]);
      }
    }
  };

  // Attachments Handling
  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    const validFiles = [];
    let err = "";

    selectedFiles.forEach((file) => {
      if (file.size > 25 * 1024 * 1024) {
        err = `File "${file.name}" exceeds maximum allowed size of 25MB.`;
      } else {
        validFiles.push(file);
      }
    });

    if (err) setErrorMessage(err);
    if (validFiles.length > 0) {
      setAttachments((prev) => [...prev, ...validFiles]);
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Image Selection (toolbar image button - embeds inline into rich text editor)
  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 25 * 1024 * 1024) {
        setErrorMessage("Image exceeds 25MB limit.");
        return;
      }
      insertInlineImageFile(file);
    }
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  // Clipboard Paste Support (pasted images are inserted inline)
  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].type && items[i].type.startsWith("image/")) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            if (file.size > 25 * 1024 * 1024) {
              setErrorMessage("Pasted image exceeds 25MB limit.");
              return;
            }
            insertInlineImageFile(file);
            return;
          }
        }
      }
    }
  };

  const removeAttachment = (index) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return "0 KB";
    if (bytes < 1024 * 1024) {
      return (bytes / 1024).toFixed(1) + " KB";
    }
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  // Update toolbar active states (bold, italic, underline, strike, text align)
  const updateToolbarStates = () => {
    try {
      const selection = window.getSelection();
      let currentBlock = "p";
      let insideHeading = false;
      let insideQuote = false;
      let hasExplicitBold = false;
      let hasExplicitItalic = false;
      let hasExplicitUnderline = false;

      if (selection && selection.rangeCount > 0) {
        let node = selection.anchorNode;
        if (node && node.nodeType === 3) node = node.parentNode;

        let curr = node;
        while (curr && curr !== bodyEditorRef.current) {
          const tag = curr.tagName ? curr.tagName.toLowerCase() : "";
          if (tag === "h1" || tag === "h2" || tag === "h3") {
            insideHeading = true;
            currentBlock = tag;
          } else if (tag === "blockquote") {
            insideQuote = true;
            currentBlock = "blockquote";
          }

          if (
            tag === "b" ||
            tag === "strong" ||
            curr.style?.fontWeight === "bold" ||
            parseInt(curr.style?.fontWeight) >= 700
          ) {
            hasExplicitBold = true;
          }
          if (
            tag === "i" ||
            tag === "em" ||
            curr.style?.fontStyle === "italic"
          ) {
            hasExplicitItalic = true;
          }
          if (
            tag === "u" ||
            curr.style?.textDecoration?.includes("underline")
          ) {
            hasExplicitUnderline = true;
          }
          curr = curr.parentNode;
        }
      }

      setParagraphFormat(currentBlock);

      // Bold: headings have font-weight:700 naturally; only active if user explicitly applied bold tag/style
      if (insideHeading) {
        setIsBold(hasExplicitBold);
      } else {
        setIsBold(document.queryCommandState("bold"));
      }

      // Italic: blockquote may have font-style:italic naturally; only active if user explicitly applied italic tag/style
      if (insideQuote) {
        setIsItalic(hasExplicitItalic);
      } else {
        setIsItalic(document.queryCommandState("italic"));
      }

      setIsUnderline(document.queryCommandState("underline") && (hasExplicitUnderline || !insideHeading));
      setIsStrike(document.queryCommandState("strikeThrough"));

      if (document.queryCommandState("justifyCenter")) {
        setActiveAlign("center");
      } else if (document.queryCommandState("justifyRight")) {
        setActiveAlign("right");
      } else {
        setActiveAlign("left");
      }
    } catch {
      // Ignore if document queryCommandState not accessible
    }
  };

  // Rich Text Formatting Commands
  const handleFormat = (command, value = null) => {
    if (bodyEditorRef.current) {
      bodyEditorRef.current.focus();
      try {
        document.execCommand("styleWithCSS", false, true);
      } catch {
        // Fallback for older browsers
      }
      document.execCommand(command, false, value);
      setTimeout(updateToolbarStates, 10);
    }
  };

  const handleParagraphChange = (val) => {
    setParagraphFormat(val);
    if (bodyEditorRef.current) {
      bodyEditorRef.current.focus();
      const formatTag = val.startsWith("<") ? val : `<${val}>`;
      try {
        const success = document.execCommand("formatBlock", false, formatTag);
        if (!success) {
          document.execCommand("formatBlock", false, val);
        }
      } catch {
        try {
          document.execCommand("formatBlock", false, val);
        } catch (e) {
          console.warn("formatBlock error:", e);
        }
      }
      // Never automatically select bold, italic, or underline
      setIsBold(false);
      setIsItalic(false);
      setIsUnderline(false);
      setTimeout(updateToolbarStates, 30);
    }
  };

  const handleOpenLinkModal = () => {
    let savedRange = null;
    let selectedText = "";
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      savedRange = selection.getRangeAt(0).cloneRange();
      selectedText = selection.toString();
    }
    setSavedLinkRange(savedRange);
    setLinkDisplayText(selectedText || "");
    setLinkUrl("https://");
    setShowLinkModal(true);

    setTimeout(() => {
      if (selectedText) {
        linkUrlInputRef.current?.focus();
        linkUrlInputRef.current?.select();
      } else {
        linkTitleInputRef.current?.focus();
        linkTitleInputRef.current?.select();
      }
    }, 50);
  };

  const handleConfirmInsertLink = (e) => {
    if (e) e.preventDefault();
    const trimmedUrl = linkUrl.trim();
    if (!trimmedUrl || trimmedUrl === "https://" || trimmedUrl === "http://") {
      return;
    }

    const formattedUrl =
      trimmedUrl.startsWith("http://") ||
      trimmedUrl.startsWith("https://") ||
      trimmedUrl.startsWith("mailto:")
        ? trimmedUrl
        : `https://${trimmedUrl}`;

    const titleToUse = linkDisplayText.trim() || formattedUrl;

    if (bodyEditorRef.current) {
      bodyEditorRef.current.focus();
      const selection = window.getSelection();
      if (savedLinkRange && selection) {
        try {
          selection.removeAllRanges();
          selection.addRange(savedLinkRange);
        } catch (err) {
          console.warn("Could not restore link range:", err);
        }
      }

      const tempDiv = document.createElement("div");
      tempDiv.textContent = titleToUse;
      const escapedTitle = tempDiv.innerHTML;

      const linkHtml = `<a href="${formattedUrl}" target="_blank" rel="noopener noreferrer" style="color: #2563eb; text-decoration: underline; font-weight: 500; cursor: pointer;">${escapedTitle}</a>&nbsp;`;
      document.execCommand("insertHTML", false, linkHtml);
      setTimeout(updateToolbarStates, 10);
    }

    setShowLinkModal(false);
    setLinkDisplayText("");
    setLinkUrl("https://");
    setSavedLinkRange(null);
  };

  const updateImagePos = (imgElement) => {
    if (!imgElement || !imgElement.isConnected) {
      setSelectedImage(null);
      setSelectedImagePos(null);
      return;
    }
    const rect = imgElement.getBoundingClientRect();
    setSelectedImagePos({
      top: rect.bottom + 6,
      left: rect.left + rect.width / 2,
    });
  };

  const handleRemoveSelectedImage = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (selectedImage) {
      selectedImage.remove();
      setSelectedImage(null);
      setSelectedImagePos(null);
      if (bodyEditorRef.current) {
        bodyEditorRef.current.focus();
      }
    }
  };

  const handleEditorClick = (e) => {
    if (bodyEditorRef.current) {
      bodyEditorRef.current.querySelectorAll("img.selected-img").forEach((el) => {
        el.classList.remove("selected-img");
      });
    }

    if (e.target && e.target.tagName === "IMG") {
      e.stopPropagation();
      e.target.classList.add("selected-img");
      setSelectedImage(e.target);
      updateImagePos(e.target);
    } else {
      setSelectedImage(null);
      setSelectedImagePos(null);
    }

    const linkEl = e.target.closest("a");
    if (linkEl && linkEl.href) {
      window.open(linkEl.href, "_blank", "noopener,noreferrer");
    }
  };

  const handleInsertEmoji = (emoji) => {
    if (bodyEditorRef.current) {
      bodyEditorRef.current.focus();
      document.execCommand("insertText", false, emoji);
      setTimeout(updateToolbarStates, 10);
    }
    setShowEmojiPopover(false);
  };

  // Apply Predefined Template
  const handleApplyTemplate = (template) => {
    setSubject(template.subject);
    if (bodyEditorRef.current) {
      bodyEditorRef.current.innerHTML = template.body_html;
      bodyEditorRef.current.focus();
    }
    setShowTemplateDropdown(false);
    setSuccessToast(`Applied "${template.title}" template.`);
    setTimeout(() => setSuccessToast(""), 3000);
    setTimeout(updateToolbarStates, 10);
  };

  // Prepare FormData payload from editor DOM (no cursor-reset re-renders!)
  const buildFormData = () => {
    const formData = new FormData();

    let currentHtml = "";
    if (bodyEditorRef.current) {
      const clone = bodyEditorRef.current.cloneNode(true);
      clone.querySelectorAll(".selected-img").forEach((el) => el.classList.remove("selected-img"));
      currentHtml = clone.innerHTML;
    }
    const tmp = document.createElement("div");
    tmp.innerHTML = currentHtml;
    const currentText = tmp.innerText || tmp.textContent || "";

    const finalTo = [...toList];
    if (toInput.trim() && !finalTo.includes(toInput.trim())) {
      finalTo.push(toInput.trim());
    }

    const finalCc = [...ccList];
    if (ccInput.trim() && !finalCc.includes(ccInput.trim())) {
      finalCc.push(ccInput.trim());
    }

    const finalBcc = [...bccList];
    if (bccInput.trim() && !finalBcc.includes(bccInput.trim())) {
      finalBcc.push(bccInput.trim());
    }

    formData.append("to", JSON.stringify(finalTo));
    formData.append("cc", JSON.stringify(finalCc));
    formData.append("bcc", JSON.stringify(finalBcc));
    formData.append("subject", subject.trim());
    formData.append("bodyHtml", currentHtml);
    formData.append("bodyText", currentText);

    if (draftId) {
      formData.append("draftId", draftId);
    }

    attachments.forEach((file) => {
      formData.append("attachments", file);
    });

    return { formData, finalTo };
  };

  // Schedule Send Helpers
  const getPresetDate = (presetKey) => {
    const d = new Date();
    if (presetKey === "tomorrow_morning") {
      d.setDate(d.getDate() + 1);
      d.setHours(8, 0, 0, 0);
      return d;
    }
    if (presetKey === "tomorrow_afternoon") {
      d.setDate(d.getDate() + 1);
      d.setHours(13, 0, 0, 0);
      return d;
    }
    if (presetKey === "monday_morning") {
      const day = d.getDay();
      const daysUntilMonday = ((1 - day + 7) % 7) || 7;
      d.setDate(d.getDate() + daysUntilMonday);
      d.setHours(8, 0, 0, 0);
      return d;
    }
    return d;
  };

  const formatPresetPreview = (presetKey) => {
    const d = getPresetDate(presetKey);
    const dayName = d.toLocaleDateString([], { weekday: "short" });
    const month = d.toLocaleDateString([], { month: "short" });
    const dayNum = d.getDate();
    const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    return `${dayName}, ${month} ${dayNum}, ${time}`;
  };

  const getMinDateTime = () => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + 2);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hours = String(d.getHours()).padStart(2, "0");
    const mins = String(d.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${mins}`;
  };

  const handleApplySchedulePreset = (presetKey) => {
    const scheduledDate = getPresetDate(presetKey);
    handleSend(scheduledDate);
  };

  const formatSchedulePreview = (dtStr) => {
    if (!dtStr) return "";
    try {
      const d = new Date(dtStr);
      if (isNaN(d.getTime())) return "";
      return d.toLocaleString([], {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return dtStr;
    }
  };

  const handleScheduleCustomSubmit = (e) => {
    if (e) e.preventDefault();
    if (!customDateTime) return;
    const selectedDate = new Date(customDateTime);
    if (isNaN(selectedDate.getTime()) || selectedDate.getTime() <= Date.now()) {
      setErrorMessage("Please select a future date and time.");
      return;
    }
    setShowScheduleModal(false);
    handleSend(selectedDate);
  };

  // Execute actual send API call
  const executeFinalSend = async (formData, scheduledDate = null) => {
    try {
      setSending(true);
      setUndoSending(false);
      const res = await sendEmail(formData);
      if (res.success) {
        if (scheduledDate) {
          const formatted = new Date(scheduledDate).toLocaleString([], {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          });
          setSuccessToast(`Email scheduled for ${formatted} 🕒`);
        } else {
          setSuccessToast("Email dispatched successfully! 🚀");
        }
        setShowScheduleMenu(false);
        setShowScheduleModal(false);
        if (onSent) onSent(res.email);
        setTimeout(() => {
          handleModalClose();
        }, 800);
      }
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message || err.message || "Failed to send email."
      );
      setUndoSending(false);
    } finally {
      setSending(false);
      pendingSendRef.current = null;
    }
  };

  // Undo Send Action: Cancel timer & reopen composer
  const handleUndoSend = () => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    if (undoIntervalRef.current) clearInterval(undoIntervalRef.current);
    setUndoSending(false);
    pendingSendRef.current = null;
    setSuccessToast("Sending undone. Continue editing.");
    setTimeout(() => setSuccessToast(""), 2500);
  };

  // Immediate send without waiting for countdown
  const handleSendNow = () => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    if (undoIntervalRef.current) clearInterval(undoIntervalRef.current);
    if (pendingSendRef.current) {
      executeFinalSend(pendingSendRef.current.formData, pendingSendRef.current.scheduledDate);
    }
  };

  // Send Email (Immediate with 6s Undo Buffer, or Scheduled)
  const handleSend = async (scheduledDate = null) => {
    setErrorMessage("");
    const { formData, finalTo } = buildFormData();

    if (finalTo.length === 0) {
      setErrorMessage("Please specify at least one recipient in the 'To' field.");
      return;
    }

    if (scheduledDate) {
      if (new Date(scheduledDate).getTime() <= Date.now()) {
        setErrorMessage("Scheduled date and time must be in the future.");
        return;
      }
      formData.append("scheduledAt", new Date(scheduledDate).toISOString());
      executeFinalSend(formData, scheduledDate);
      return;
    }

    // Normal Send: Start 6-Second Undo Send Buffer
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    if (undoIntervalRef.current) clearInterval(undoIntervalRef.current);

    pendingSendRef.current = { formData, scheduledDate: null };
    setUndoSending(true);
    setUndoCountdown(6);

    undoIntervalRef.current = setInterval(() => {
      setUndoCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(undoIntervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    undoTimerRef.current = setTimeout(() => {
      if (pendingSendRef.current) {
        executeFinalSend(pendingSendRef.current.formData, null);
      }
    }, 6000);
  };

  // Save Draft
  const handleSaveDraft = async () => {
    setErrorMessage("");
    const { formData } = buildFormData();

    try {
      setDraftSaving(true);
      const res = await saveDraft(formData);
      if (res.success) {
        setDraftId(res.draft?.id || null);
        setSuccessToast("Draft saved successfully.");
        if (onSent) onSent(res.draft);
        setTimeout(() => setSuccessToast(""), 2500);
      }
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message || err.message || "Failed to save draft."
      );
    } finally {
      setDraftSaving(false);
    }
  };

  // When email is in undo-sending state, render only the floating bottom-left widget without any backdrop or blur
  if (undoSending) {
    return (
      <div className="undo-send-floating-banner" onClick={(e) => e.stopPropagation()}>
        <div className="undo-send-inner">
          <div className="undo-send-left">
            <div className="undo-send-pulse">
              <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#ffffff"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </div>
            <div className="undo-send-text">
              <span className="undo-title">Email sending...</span>
              <span className="undo-countdown-badge">{undoCountdown}s</span>
            </div>
          </div>

          <div className="undo-send-actions">
            <button
              type="button"
              className="btn-undo-action"
              onClick={handleUndoSend}
              title="Cancel send and reopen composer"
            >
              Undo
            </button>
            <button
              type="button"
              className="btn-send-now-action"
              onClick={handleSendNow}
              title="Dispatch immediately without waiting"
            >
              Send now
            </button>
          </div>
        </div>

        <div className="undo-progress-track">
          <div
            className="undo-progress-fill"
            style={{ width: `${(undoCountdown / 6) * 100}%` }}
          />
        </div>
      </div>
    );
  }

  if (!isOpen) return null;

  return (
    <div
      className={`compose-backdrop ${isMinimized ? "is-minimized-backdrop" : ""}`}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isMinimized) {
          handleModalClose();
        }
      }}
    >
      <div
        className={`compose-card-pic1 ${isMaximized ? "maximized" : ""} ${
          isMinimized ? "minimized" : ""
        } ${isDraggingFile ? "is-drag-over" : ""}`}
        onClick={(e) => e.stopPropagation()}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >

        {/* ================= MODAL HEADER (Matching Pic 1) ================= */}
        <div
          className="compose-header-pic1"
          onClick={() => isMinimized && setIsMinimized(false)}
        >
          <div className="compose-header-left-pic1">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#ffffff"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
            <span className="compose-title-text-pic1">New Message</span>
          </div>

          <div
            className="compose-header-controls-pic1"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Minimize */}
            <button
              type="button"
              className="ctrl-btn-pic1"
              title={isMinimized ? "Expand" : "Minimize"}
              onClick={() => setIsMinimized(!isMinimized)}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>

            {/* Maximize */}
            <button
              type="button"
              className="ctrl-btn-pic1"
              title={isMaximized ? "Exit Fullscreen" : "Fullscreen"}
              onClick={() => {
                setIsMaximized(!isMaximized);
                setIsMinimized(false);
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
              </svg>
            </button>

            {/* Close */}
            <button
              type="button"
              className="ctrl-btn-pic1 close"
              title="Close"
              onClick={handleModalClose}
            >
              ✕
            </button>
          </div>
        </div>

        {/* ================= MODAL BODY ================= */}
        {!isMinimized && (
          <div className="compose-content-pic1">
            {/* Success Toast */}
            {successToast && (
              <div className="banner-msg success">
                <span>{successToast}</span>
              </div>
            )}

            {/* Error Toast */}
            {errorMessage && (
              <div className="banner-msg error">
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Form Fields: To & Subject Rows */}
            <div className="compose-form-fields-pic1">
              {/* TO ROW - Shows "Add recipients..." initially; clicking reveals "To" */}
              <div
                className="form-field-row-pic1"
                onClick={() => toInputRef.current?.focus()}
              >
                {(isToFocused || toList.length > 0 || toInput.trim()) && (
                  <label className="field-label-pic1">To</label>
                )}
                <div className="field-input-box-pic1">
                  <div className="chips-wrapper-pic1">
                    {toList.map((item, idx) => (
                      <span key={idx} className="recipient-pill-chip">
                        {item}
                        <button
                          type="button"
                          className="chip-remove-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeRecipient(idx, "to");
                          }}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    <input
                      ref={toInputRef}
                      type="text"
                      className="clean-text-input"
                      placeholder={toList.length === 0 ? "Add recipients..." : ""}
                      value={toInput}
                      onChange={(e) =>
                        handleRecipientInputChange(e.target.value, "to")
                      }
                      onKeyDown={(e) => handleKeyDown(e, "to")}
                      onFocus={() => {
                        setIsToFocused(true);
                        setActiveField("to");
                      }}
                      onBlur={() => {
                        setIsToFocused(false);
                      }}
                    />
                  </div>

                  {/* Integrated trailing controls matching Pic 1/2 */}
                  <div className="to-row-extras">
                    {!showCc && (
                      <button
                        type="button"
                        className="btn-text-toggle"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowCc(true);
                        }}
                      >
                        Cc
                      </button>
                    )}
                    {!showBcc && (
                      <button
                        type="button"
                        className="btn-text-toggle"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowBcc(true);
                        }}
                      >
                        Bcc
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn-address-book"
                      title="Browse Users & Employees"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleAddressBook("to");
                      }}
                    >
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
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* CC ROW (Optional) */}
              {showCc && (
                <div className="form-field-row-pic1">
                  <label className="field-label-pic1">Cc</label>
                  <div className="field-input-box-pic1">
                    <div className="chips-wrapper-pic1">
                      {ccList.map((item, idx) => (
                        <span key={idx} className="recipient-pill-chip">
                          {item}
                          <button
                            type="button"
                            className="chip-remove-btn"
                            onClick={() => removeRecipient(idx, "cc")}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                      <input
                        type="text"
                        className="clean-text-input"
                        placeholder="Add Cc recipients..."
                        value={ccInput}
                        onChange={(e) =>
                          handleRecipientInputChange(e.target.value, "cc")
                        }
                        onKeyDown={(e) => handleKeyDown(e, "cc")}
                        onFocus={() => setActiveField("cc")}
                      />
                    </div>
                    <div className="to-row-extras">
                      <button
                        type="button"
                        className="btn-address-book"
                        title="Browse Users & Employees for Cc"
                        onClick={() => handleToggleAddressBook("cc")}
                      >
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
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                          <circle cx="9" cy="7" r="4" />
                          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* BCC ROW (Optional) */}
              {showBcc && (
                <div className="form-field-row-pic1">
                  <label className="field-label-pic1">Bcc</label>
                  <div className="field-input-box-pic1">
                    <div className="chips-wrapper-pic1">
                      {bccList.map((item, idx) => (
                        <span key={idx} className="recipient-pill-chip">
                          {item}
                          <button
                            type="button"
                            className="chip-remove-btn"
                            onClick={() => removeRecipient(idx, "bcc")}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                      <input
                        type="text"
                        className="clean-text-input"
                        placeholder="Add Bcc recipients..."
                        value={bccInput}
                        onChange={(e) =>
                          handleRecipientInputChange(e.target.value, "bcc")
                        }
                        onKeyDown={(e) => handleKeyDown(e, "bcc")}
                        onFocus={() => setActiveField("bcc")}
                      />
                    </div>
                    <div className="to-row-extras">
                      <button
                        type="button"
                        className="btn-address-book"
                        title="Browse Users & Employees for Bcc"
                        onClick={() => handleToggleAddressBook("bcc")}
                      >
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
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                          <circle cx="9" cy="7" r="4" />
                          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Suggestions Popup */}
              {showSuggestions && suggestions.length > 0 && (
                <div
                  ref={suggestionsRef}
                  className="suggestions-popup-pic1"
                  style={{
                    top:
                      activeField === "bcc"
                        ? (showCc ? "170px" : "114px")
                        : activeField === "cc"
                        ? "114px"
                        : "58px",
                    left: "24px",
                  }}
                >
                  <div className="suggestions-header">
                    Select Recipient ({suggestions.length})
                  </div>
                  <div className="suggestions-list-scroll">
                    {suggestions.map((u) => (
                      <div
                        key={u.id}
                        className="suggestion-row"
                        onClick={() => addRecipient(u.email, activeField)}
                      >
                        <div className="suggestion-info">
                          <span className="name">{u.name}</span>
                          <span className="email">{u.email}</span>
                        </div>
                        <span className="role-tag">{u.role}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SUBJECT ROW - Clean inline field with placeholder, no separate label on left */}
              <div className="form-field-row-pic1">
                <div className="field-input-box-pic1">
                  <input
                    type="text"
                    className="clean-text-input"
                    placeholder="Subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* ================= RICH TEXT EDITOR BOX (Matching Pic 1) ================= */}
            <div className="editor-outer-box-pic1">
              {/* Integrated Formatting Toolbar */}
              <div className="editor-toolbar-pic1">
                {/* Undo / Redo */}
                <button
                  type="button"
                  className="tb-btn"
                  title="Undo"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleFormat("undo")}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <polyline points="1 4 1 10 7 10" />
                    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                  </svg>
                </button>
                <button
                  type="button"
                  className="tb-btn"
                  title="Redo"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleFormat("redo")}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <polyline points="23 4 23 10 17 10" />
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                  </svg>
                </button>

                <span className="tb-divider" />

                {/* Custom Paragraph Dropdown matching project UI */}
                <div className="tb-dropdown-container" ref={paragraphDropdownRef}>
                  <button
                    type="button"
                    className={`tb-dropdown-trigger ${showParagraphDropdown ? "open" : ""}`}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setShowParagraphDropdown((prev) => !prev)}
                    title="Paragraph format"
                  >
                    <span className="tb-dropdown-label">{currentParagraphLabel}</span>
                    <svg
                      className={`tb-dropdown-arrow ${showParagraphDropdown ? "open" : ""}`}
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M7 10l5 5 5-5z" />
                    </svg>
                  </button>

                  {showParagraphDropdown && (
                    <div
                      className="tb-dropdown-menu"
                      onMouseDown={(e) => e.preventDefault()}
                    >
                      {paragraphOptions.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          className={`tb-dropdown-option ${paragraphFormat === opt.value ? "selected" : ""}`}
                          onClick={() => {
                            handleParagraphChange(opt.value);
                            setShowParagraphDropdown(false);
                          }}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <span className="tb-divider" />

                {/* Bold, Italic, Underline, Strikethrough */}
                <button
                  type="button"
                  className={`tb-btn ${isBold ? "active" : ""}`}
                  title="Bold"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleFormat("bold")}
                >
                  <strong>B</strong>
                </button>
                <button
                  type="button"
                  className={`tb-btn italic ${isItalic ? "active" : ""}`}
                  title="Italic"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleFormat("italic")}
                >
                  <em>I</em>
                </button>
                <button
                  type="button"
                  className={`tb-btn underline ${isUnderline ? "active" : ""}`}
                  title="Underline"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleFormat("underline")}
                >
                  <u>U</u>
                </button>
                <button
                  type="button"
                  className={`tb-btn strike ${isStrike ? "active" : ""}`}
                  title="Strikethrough"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleFormat("strikeThrough")}
                >
                  <s>S</s>
                </button>

                <span className="tb-divider" />

                {/* Lists */}
                <button
                  type="button"
                  className="tb-btn"
                  title="Bullet List"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleFormat("insertUnorderedList")}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="8" y1="6" x2="21" y2="6" />
                    <line x1="8" y1="12" x2="21" y2="12" />
                    <line x1="8" y1="18" x2="21" y2="18" />
                    <circle cx="4" cy="6" r="1.5" fill="currentColor" />
                    <circle cx="4" cy="12" r="1.5" fill="currentColor" />
                    <circle cx="4" cy="18" r="1.5" fill="currentColor" />
                  </svg>
                </button>
                <button
                  type="button"
                  className="tb-btn"
                  title="Numbered List"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleFormat("insertOrderedList")}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="10" y1="6" x2="21" y2="6" />
                    <line x1="10" y1="12" x2="21" y2="12" />
                    <line x1="10" y1="18" x2="21" y2="18" />
                    <path d="M4 6h1v4" />
                    <path d="M4 10h2" />
                    <path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" />
                  </svg>
                </button>

                <span className="tb-divider" />

                {/* Alignment: Left, Center, Right (Default Left, user can align center or right anytime) */}
                <button
                  type="button"
                  className={`tb-btn ${activeAlign === "left" ? "active" : ""}`}
                  title="Align Left (Default)"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleFormat("justifyLeft")}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="3" y1="12" x2="15" y2="12" />
                    <line x1="3" y1="18" x2="18" y2="18" />
                  </svg>
                </button>
                <button
                  type="button"
                  className={`tb-btn ${activeAlign === "center" ? "active" : ""}`}
                  title="Align Center"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleFormat("justifyCenter")}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="6" y1="12" x2="18" y2="12" />
                    <line x1="4" y1="18" x2="20" y2="18" />
                  </svg>
                </button>
                <button
                  type="button"
                  className={`tb-btn ${activeAlign === "right" ? "active" : ""}`}
                  title="Align Right"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleFormat("justifyRight")}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="9" y1="12" x2="21" y2="12" />
                    <line x1="6" y1="18" x2="21" y2="18" />
                  </svg>
                </button>

                <span className="tb-divider" />



                {/* Emoji Icon with live Popover */}
                <div style={{ position: "relative" }} ref={emojiPopoverRef}>
                  <button
                    type="button"
                    className={`tb-btn ${showEmojiPopover ? "active" : ""}`}
                    title="Insert Emoji"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setShowEmojiPopover(!showEmojiPopover)}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                      <line x1="9" y1="9" x2="9.01" y2="9" strokeWidth="3" />
                      <line x1="15" y1="9" x2="15.01" y2="9" strokeWidth="3" />
                    </svg>
                  </button>

                  {showEmojiPopover && (
                    <RichEmojiPicker
                      onSelectEmoji={handleInsertEmoji}
                      onClose={() => setShowEmojiPopover(false)}
                    />
                  )}
                </div>

                {/* Insert Image */}
                <button
                  type="button"
                  className="tb-btn"
                  title="Insert Image"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => imageInputRef.current?.click()}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                </button>
              </div>

              {/* Editable Body: Starts on Left by default, NO reverse typing, full formatting support */}
              <div
                className={`editor-textarea-pic1 ${isDraggingFile ? "is-drag-over" : ""}`}
                contentEditable
                ref={bodyEditorRef}
                data-placeholder="Write your email here..."
                spellCheck="true"
                onInput={handleEditorInput}
                onKeyUp={updateToolbarStates}
                onMouseUp={updateToolbarStates}
                onClick={handleEditorClick}
                onPaste={handlePaste}
              />

              {/* Attachment Preview Chips inside editor container */}
              {attachments.length > 0 && (
                <div className="attachments-strip-pic1">
                  <div className="strip-title">
                    Attached Files ({attachments.length})
                  </div>
                  <div className="strip-chips">
                    {attachments.map((file, i) => (
                      <div
                        key={i}
                        className="att-pill-chip clickable-att"
                        onClick={() => setPreviewAttachment(file)}
                        title="Click to preview file"
                      >
                        <span className="clip-sym">📎</span>
                        <span className="name">{file.name}</span>
                        <span className="size">({formatFileSize(file.size)})</span>

                        <button
                          type="button"
                          className="remove-btn"
                          title="Remove attachment"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeAttachment(i);
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Hidden File Inputs */}
            <input
              type="file"
              multiple
              ref={fileInputRef}
              style={{ display: "none" }}
              onChange={handleFileSelect}
            />
            <input
              type="file"
              accept="image/*"
              ref={imageInputRef}
              style={{ display: "none" }}
              onChange={handleImageSelect}
            />

            {/* ================= FOOTER ACTIONS (Matching Pic 1) ================= */}
            <div className="compose-footer-pic1">
              {/* Left Action Cards (Attach & Link) */}
              <div className="footer-left-cards-pic1">
                {/* 1. Attach */}
                <div
                  className="quick-card-btn"
                  onClick={() => fileInputRef.current?.click()}
                  title="Attach Documents or Files"
                >
                  <div className="card-box">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2">
                      <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                    </svg>
                  </div>
                  <span className="card-lbl">Attach</span>
                </div>

                {/* 2. Link */}
                <div
                  className="quick-card-btn"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={handleOpenLinkModal}
                  title="Insert Hyperlink"
                >
                  <div className="card-box">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2">
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                    </svg>
                  </div>
                  <span className="card-lbl">Link</span>
                </div>
              </div>

              {/* Right Action Buttons */}
              <div className="footer-right-actions-pic1">
                {/* Save Draft Button */}
                <button
                  type="button"
                  className="btn-pic1-save-draft"
                  onClick={handleSaveDraft}
                  disabled={sending || draftSaving}
                  title="Save draft"
                >
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
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                  </svg>
                  <span>{draftSaving ? "Saving..." : "Save Draft"}</span>
                </button>

                {/* Send Button & Schedule Dropdown (Split Button) */}
                <div className="btn-pic1-send-group" ref={scheduleMenuRef}>
                  <button
                    type="button"
                    className="btn-pic1-send"
                    onClick={() => handleSend()}
                    disabled={sending || draftSaving}
                  >
                    {sending ? (
                      <span>Sending...</span>
                    ) : (
                      <>
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <line x1="22" y1="2" x2="11" y2="13" />
                          <polygon points="22 2 15 22 11 13 2 9 22 2" />
                        </svg>
                        <span>Send</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    className="btn-pic1-send-caret"
                    title="Schedule send"
                    onClick={() => setShowScheduleMenu((prev) => !prev)}
                    disabled={sending || draftSaving}
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>

                  {/* Schedule Send Popover */}
                  {showScheduleMenu && (
                    <div className="schedule-send-popover">
                      <div className="schedule-popover-header">
                        <svg
                          width="15"
                          height="15"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#ea580c"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                        <span className="schedule-header-title">Schedule send</span>
                      </div>

                      <div className="schedule-presets-list">
                        <button
                          type="button"
                          className="schedule-preset-btn"
                          onClick={() => handleApplySchedulePreset("tomorrow_morning")}
                        >
                          <span className="preset-name">Tomorrow morning</span>
                          <span className="preset-time">{formatPresetPreview("tomorrow_morning")}</span>
                        </button>

                        <button
                          type="button"
                          className="schedule-preset-btn"
                          onClick={() => handleApplySchedulePreset("tomorrow_afternoon")}
                        >
                          <span className="preset-name">Tomorrow afternoon</span>
                          <span className="preset-time">{formatPresetPreview("tomorrow_afternoon")}</span>
                        </button>

                        <button
                          type="button"
                          className="schedule-preset-btn"
                          onClick={() => handleApplySchedulePreset("monday_morning")}
                        >
                          <span className="preset-name">Monday morning</span>
                          <span className="preset-time">{formatPresetPreview("monday_morning")}</span>
                        </button>

                        <div className="schedule-divider" />

                        <button
                          type="button"
                          className="schedule-preset-btn custom-trigger"
                          onClick={() => {
                            setShowScheduleMenu(false);
                            if (!customDateTime) {
                              const tomorrow8am = getPresetDate("tomorrow_morning");
                              setCustomDateTime(tomorrow8am.toISOString().slice(0, 16));
                            }
                            setShowScheduleModal(true);
                          }}
                        >
                          <span className="preset-name">Pick date & time</span>
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
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                            <line x1="16" y1="2" x2="16" y2="6" />
                            <line x1="8" y1="2" x2="8" y2="6" />
                            <line x1="3" y1="10" x2="21" y2="10" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Centered Schedule Send Modal Dialog */}
        {showScheduleModal && (
          <div
            className="schedule-center-modal-backdrop"
            onClick={() => setShowScheduleModal(false)}
          >
            <div
              className="schedule-center-modal-card"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="schedule-center-modal-header">
                <div className="schedule-center-modal-title">
                  <div className="schedule-icon-circle">
                    <svg
                      width="17"
                      height="17"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#ea580c"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                  </div>
                  <span>Schedule send</span>
                </div>
                <button
                  type="button"
                  className="schedule-center-modal-close"
                  onClick={() => setShowScheduleModal(false)}
                  title="Close"
                >
                  ✕
                </button>
              </div>

              <div className="schedule-center-modal-body">
                <CustomDatePicker
                  showTime={true}
                  allowFutureYears={true}
                  inline={true}
                  min={new Date().toISOString().slice(0, 10)}
                  value={customDateTime}
                  onChange={(e) => setCustomDateTime(e.target.value)}
                />
              </div>

              <div className="schedule-center-modal-footer">
                <div className="schedule-time-summary">
                  {customDateTime ? (
                    <span>
                      Scheduled for: <strong>{formatSchedulePreview(customDateTime)}</strong>
                    </span>
                  ) : (
                    <span>Select a date and time above</span>
                  )}
                </div>
                <div className="schedule-center-modal-actions">
                  <button
                    type="button"
                    className="btn-schedule-cancel"
                    onClick={() => setShowScheduleModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn-schedule-confirm"
                    disabled={!customDateTime}
                    onClick={handleScheduleCustomSubmit}
                  >
                    Schedule send
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Custom Hyperlink Modal (Title / Display text + Link URL) */}
        {showLinkModal && (
          <div
            className="link-dialog-backdrop"
            onClick={() => setShowLinkModal(false)}
          >
            <div
              className="link-dialog-card"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="link-dialog-header">
                <div className="link-dialog-title-wrap">
                  <div className="link-dialog-icon">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                    >
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                    </svg>
                  </div>
                  <span className="link-dialog-title">Insert Link</span>
                </div>
                <button
                  type="button"
                  className="link-dialog-close"
                  onClick={() => setShowLinkModal(false)}
                  title="Close"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleConfirmInsertLink} className="link-dialog-body">
                <div className="link-dialog-field">
                  <label className="link-dialog-label" htmlFor="link-title-input">
                    Title / Text to display
                  </label>
                  <input
                    id="link-title-input"
                    ref={linkTitleInputRef}
                    type="text"
                    className="link-dialog-input"
                    placeholder="e.g. email"
                    value={linkDisplayText}
                    onChange={(e) => setLinkDisplayText(e.target.value)}
                  />
                  <span className="link-dialog-hint">
                    This text will appear in your email as the clickable link.
                  </span>
                </div>

                <div className="link-dialog-field">
                  <label className="link-dialog-label" htmlFor="link-url-input">
                    Link URL
                  </label>
                  <input
                    id="link-url-input"
                    ref={linkUrlInputRef}
                    type="text"
                    className="link-dialog-input"
                    placeholder="https://example.com"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                  />
                </div>

                <div className="link-dialog-footer">
                  <button
                    type="button"
                    className="link-dialog-btn-cancel"
                    onClick={() => setShowLinkModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="link-dialog-btn-ok"
                    disabled={
                      !linkUrl.trim() ||
                      linkUrl.trim() === "https://" ||
                      linkUrl.trim() === "http://"
                    }
                  >
                    OK
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
      {/* Floating Image Action: Remove */}
      {selectedImage && selectedImagePos && (
        <div
          className="image-actions-popover"
          style={{
            position: "fixed",
            top: `${selectedImagePos.top}px`,
            left: `${selectedImagePos.left}px`,
            transform: "translate(-50%, 0)",
            zIndex: 100000,
          }}
          onMouseDown={(e) => e.preventDefault()}
        >
          <button
            type="button"
            className="image-remove-btn"
            onClick={handleRemoveSelectedImage}
            title="Remove picture"
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
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <line x1="10" y1="11" x2="10" y2="17" />
              <line x1="14" y1="11" x2="14" y2="17" />
            </svg>
            <span>Remove</span>
          </button>
        </div>
      )}

      {/* In-Browser Document & PDF Lightbox Preview */}
      <AttachmentPreviewModal
        isOpen={!!previewAttachment}
        attachment={previewAttachment}
        onClose={() => setPreviewAttachment(null)}
      />
    </div>
  );
}

export default EmailComposeModal;
