import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useAuth } from "../context/AuthContext";
import CustomDatePicker from "../components/CustomDatePicker";
import CustomSelect from "../components/CustomSelect";
import SearchableDropdown from "../components/SearchableDropdown";
import ConfirmDialog from "../components/ConfirmDialog";
import SuccessToast from "../components/SuccessToast";
import API_URL from "../config/axios.util";
import {
  getExpenseCategories,
  getExpenseStats,
  getExpenseClaims,
  getExpenseClaimById,
  createExpenseClaim,
  approveExpenseClaim,
  rejectExpenseClaim,
  settleExpenseClaim,
  initiateInstantPayout,
  getMyBankDetails,
  saveMyBankDetails,
  getEmployeeBankDetailsById,
  deleteExpenseClaim,
  updateCategoryLimits,
} from "../services/expenseService";
import "./ExpenseManagement.css";

const PAYMENT_METHODS = [
  "UPI",
  "Cash",
  "Personal Credit Card",
  "Debit Card",
  "Net Banking",
];
const SETTLEMENT_MODES = [
  "NEFT / IMPS",
  "UPI Transfer",
  "Company Bank Transfer",
  "Corporate Card",
  "Payroll Addition",
];

// Auto-generate realistic transaction / UTR references based on disbursement mode
export const generateTransactionRef = (mode = "NEFT / IMPS") => {
  const now = new Date();
  const year = now.getFullYear();
  const monthNames = [
    "JAN",
    "FEB",
    "MAR",
    "APR",
    "MAY",
    "JUN",
    "JUL",
    "AUG",
    "SEP",
    "OCT",
    "NOV",
    "DEC",
  ];
  const mon = monthNames[now.getMonth()];
  const yymmdd = `${String(year).slice(-2)}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;

  const randomDigits = (len) => {
    let res = "";
    for (let i = 0; i < len; i++) {
      res += Math.floor(Math.random() * 10);
    }
    return res;
  };

  const randomAlphaNum = (len) => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let res = "";
    for (let i = 0; i < len; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return res;
  };

  const normalized = (mode || "").toLowerCase().trim();

  if (normalized.includes("upi")) {
    return `UPI-${randomDigits(12)}`;
  } else if (normalized.includes("neft") || normalized.includes("imps")) {
    return `UTR${yymmdd}${randomDigits(6)}`;
  } else if (normalized.includes("card")) {
    return `CC-AUTH-${randomDigits(6)}`;
  } else if (normalized.includes("payroll")) {
    return `PAY-${mon}${String(year).slice(-2)}-${randomDigits(4)}`;
  } else if (normalized.includes("bank") || normalized.includes("transfer")) {
    return `CBT-${year}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${randomAlphaNum(4)}`;
  } else if (normalized.includes("cash")) {
    return `CASH-VCH-${randomDigits(5)}`;
  } else if (normalized.includes("cheque") || normalized.includes("check")) {
    return `CHQ-${randomDigits(6)}`;
  } else {
    return `TXN-${yymmdd}-${randomAlphaNum(6)}`;
  }
};

function ExpenseManagement() {
  const { user } = useAuth();
  
  const checkIsGeneralAdmin = (u) => {
    if (!u) return false;
    const r = String(u?.role || "").toLowerCase().trim();
    const br = String(u?.baseRole || u?.base_role || "").toLowerCase().trim();
    const rn = String(u?.role_name || u?.roleName || "").toLowerCase().trim();
    const email = String(u?.email || "").toLowerCase().trim();
    const name = String(u?.name || "").toLowerCase().trim();
    return (
      r === "general_admin" ||
      r === "general admin" ||
      r.includes("general") ||
      r === "super_admin" ||
      r === "super admin" ||
      br === "general_admin" ||
      br === "general admin" ||
      br.includes("general") ||
      rn === "general admin" ||
      rn === "general_admin" ||
      rn.includes("general") ||
      email === "nency@gmail.com" ||
      name === "nency"
    );
  };

  const isGeneralAdmin = useMemo(() => checkIsGeneralAdmin(user), [user]);

  const isAdmin = useMemo(() => {
    if (isGeneralAdmin) return true;
    const r = String(user?.role || "").toLowerCase().trim();
    const br = String(user?.baseRole || user?.base_role || "").toLowerCase().trim();
    const rn = String(user?.role_name || user?.roleName || "").toLowerCase().trim();
    return (
      r === "admin" ||
      r === "super_admin" ||
      br === "admin" ||
      rn === "admin" ||
      r.includes("admin") ||
      rn.includes("admin")
    );
  }, [user, isGeneralAdmin]);

  // Active Tab:
  // General Admin -> "pending" | "reviewed" | "reimbursed" | "all_claims"
  // Non-General Admin (Admin / Employee) -> strictly "my_claims"
  const [activeTab, setActiveTab] = useState(() =>
    checkIsGeneralAdmin(user) ? "pending" : "my_claims",
  );

  useEffect(() => {
    if (isGeneralAdmin && activeTab === "my_claims") {
      setActiveTab("pending");
    } else if (!isGeneralAdmin && activeTab !== "my_claims") {
      setActiveTab("my_claims");
    }
  }, [isGeneralAdmin, activeTab]);

  // Stats
  const [stats, setStats] = useState({
    totalCount: 0,
    totalClaimedAmount: 0,
    pendingCount: 0,
    pendingAmount: 0,
    approvedCount: 0,
    approvedAmount: 0,
    reimbursedCount: 0,
    reimbursedAmount: 0,
    rejectedCount: 0,
  });

  // Categories
  const [categories, setCategories] = useState([]);

  // Claims List
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 5,
    total: 0,
    totalPages: 1,
  });

  // Filters
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [claimToDelete, setClaimToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [activeClaim, setActiveClaim] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);

  useEffect(() => {
    const handleGlobalClick = () => setOpenMenuId(null);
    window.addEventListener("click", handleGlobalClick);
    return () => window.removeEventListener("click", handleGlobalClick);
  }, []);

  // Form states for Create Claim
  const [createForm, setCreateForm] = useState({
    category_id: "",
    title: "",
    merchant_name: "",
    expense_date: new Date().toISOString().slice(0, 10),
    claim_amount: "",
    payment_method: "UPI",
    description: "",
  });
  const [selectedReceipts, setSelectedReceipts] = useState([]);
  const [createSubmitting, setCreateSubmitting] = useState(false);

  // Form state for Approval
  const [approvalDecision, setApprovalDecision] = useState("approve"); // "approve" | "partial" | "reject"
  const [approvedAmountInput, setApprovedAmountInput] = useState("");
  const [approvalNotes, setApprovalNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  // Form state for Settlement
  const [settleForm, setSettleForm] = useState({
    settlement_mode: "NEFT / IMPS",
    transaction_ref: "",
    notes: "",
  });
  const [settleSubmitting, setSettleSubmitting] = useState(false);

  // Bank & Payout Details Modal State
  const [showBankModal, setShowBankModal] = useState(false);
  const [bankLoading, setBankLoading] = useState(false);
  const [bankSaving, setBankSaving] = useState(false);
  const [isEditingBankDetails, setIsEditingBankDetails] = useState(false);
  const [savedBankData, setSavedBankData] = useState(null);
  const [showFullAccount, setShowFullAccount] = useState(false);
  const [myBankForm, setMyBankForm] = useState({
    account_holder_name: "",
    account_number: "",
    confirm_account_number: "",
    ifsc_code: "",
    bank_name: "",
    upi_id: "",
    preferred_mode: "bank_account",
  });

  // Automated / Instant Payout State
  const [settleMethodType, setSettleMethodType] = useState("instant"); // "instant" | "manual"
  const [instantPayoutMode, setInstantPayoutMode] = useState("IMPS"); // "IMPS" | "NEFT" | "UPI"
  const [activeEmpBank, setActiveEmpBank] = useState(null);
  const [loadingEmpBank, setLoadingEmpBank] = useState(false);
  const [quickAddBankMode, setQuickAddBankMode] = useState(false);
  const [quickBankForm, setQuickBankForm] = useState({
    account_holder_name: "",
    account_number: "",
    ifsc_code: "",
    bank_name: "",
    upi_id: "",
    preferred_mode: "bank_account",
  });

  // Toast Notification
  const [toastMessage, setToastMessage] = useState("");
  const showToast = (message) => {
    setToastMessage(message);
  };

  // Alert Modal State
  const [alertModal, setAlertModal] = useState({
    visible: false,
    title: "",
    message: "",
  });
  const showAlert = (message, title = "Notice") => {
    setAlertModal({ visible: true, title, message });
  };

  // Load Categories
  const loadCategories = useCallback(async () => {
    try {
      const res = await getExpenseCategories();
      if (res.success && res.categories) {
        setCategories(res.categories);
        if (!createForm.category_id && res.categories.length > 0) {
          setCreateForm((prev) => ({
            ...prev,
            category_id: String(res.categories[0].id),
          }));
        }
      }
    } catch (err) {
      console.warn("Error loading categories:", err);
    }
  }, [createForm.category_id]);

  // Load Stats
  const loadStats = useCallback(async () => {
    try {
      const scope = isGeneralAdmin && activeTab !== "my_claims" ? "all" : "my";
      const res = await getExpenseStats(scope);
      if (res.success && res.stats) {
        setStats(res.stats);
      }
    } catch (err) {
      console.warn("Error loading stats:", err);
    }
  }, [activeTab, isGeneralAdmin]);

  // Load Claims
  const loadClaims = useCallback(
    async (page = 1, customLimit = null) => {
      try {
        setLoading(true);
        const limitToUse =
          customLimit !== null ? customLimit : pagination.limit;
        const scope =
          isGeneralAdmin && activeTab !== "my_claims" ? "all" : "my";
        const params = {
          page,
          limit: limitToUse,
          status: selectedStatus,
          category_id: selectedCategory,
          search: searchQuery,
          scope,
          tab: activeTab,
        };

        const res = await getExpenseClaims(params);
        if (res.success) {
          setClaims(res.claims || []);
          setPagination(
            res.pagination || {
              page: 1,
              limit: limitToUse,
              total: 0,
              totalPages: 1,
            },
          );
        }
      } catch (err) {
        console.error("Failed to load expense claims:", err);
        showToast("Error loading expense claims.", "error");
      } finally {
        setLoading(false);
      }
    },
    [
      activeTab,
      selectedStatus,
      selectedCategory,
      searchQuery,
      pagination.limit,
      isGeneralAdmin,
    ],
  );

  // Guarantee client-side strict isolation by active tab
  const displayedClaims = useMemo(() => {
    if (!claims || !Array.isArray(claims)) return [];
    if (activeTab === "pending") {
      return claims.filter((c) => c.status === "Pending");
    }
    if (activeTab === "reviewed") {
      return claims.filter((c) => {
        if (selectedStatus === "Approved") return c.status === "Approved";
        if (selectedStatus === "Rejected") return c.status === "Rejected";
        return c.status === "Approved" || c.status === "Rejected";
      });
    }
    if (activeTab === "reimbursed") {
      return claims.filter((c) => c.status === "Reimbursed");
    }
    return claims;
  }, [claims, activeTab, selectedStatus]);

  // Dynamic page size calculation (e.g., 4 claims -> Show 5; 7 claims -> Show 5, Show 10; 14 claims -> Show 5, Show 10, Show 15)
  const getPageSizeOptions = (totalCount) => {
    const count = Number(totalCount) || 0;
    const maxLimit = Math.max(5, Math.ceil(count / 5) * 5);
    const options = [];
    for (let i = 5; i <= maxLimit; i += 5) {
      options.push({ value: i, label: `Show ${i}` });
    }
    return options;
  };

  const currentTotal =
    pagination.total > 0
      ? pagination.total
      : stats?.totalClaims || claims.length || 0;
  const pageSizeOptions = useMemo(
    () => getPageSizeOptions(currentTotal),
    [currentTotal],
  );

  useEffect(() => {
    const availableSizes = pageSizeOptions.map((o) => o.value);
    if (
      availableSizes.length > 0 &&
      !availableSizes.includes(pagination.limit)
    ) {
      setPagination((prev) => ({ ...prev, limit: 5, page: 1 }));
    }
  }, [pageSizeOptions, pagination.limit]);

  // Handle Page Size Change (Show 5, Show 10, etc.)
  const handlePageSizeChange = (valOrEvent) => {
    const rawVal = valOrEvent?.target ? valOrEvent.target.value : valOrEvent;
    const newSize = Number(rawVal) || 5;
    setPagination((prev) => ({ ...prev, limit: newSize, page: 1 }));
  };

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    loadStats();
    loadClaims(1);
  }, [loadStats, loadClaims]);

  // Selected Category Object in Create Form
  const activeCreateCategory = useMemo(() => {
    return categories.find(
      (c) => String(c.id) === String(createForm.category_id),
    );
  }, [categories, createForm.category_id]);

  const MAX_CLAIM_LIMIT = 10000;

  // Check if entered amount is over policy limit
  const isAmountOverLimit = useMemo(() => {
    if (!createForm.claim_amount) return false;
    const val = parseFloat(createForm.claim_amount);
    return !isNaN(val) && val > MAX_CLAIM_LIMIT;
  }, [createForm.claim_amount]);

  // Handle Receipt File Selection
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length + selectedReceipts.length > 5) {
      showAlert(
        "You can upload a maximum of 5 receipts per claim.",
        "Upload Limit Exceeded",
      );
      return;
    }
    setSelectedReceipts((prev) => [...prev, ...files]);
  };

  const handleRemoveReceipt = (idx) => {
    setSelectedReceipts((prev) => prev.filter((_, i) => i !== idx));
  };

  // Reset Create Form
  const resetCreateForm = () => {
    setCreateForm({
      category_id: categories.length > 0 ? String(categories[0].id) : "",
      title: "",
      merchant_name: "",
      expense_date: new Date().toISOString().slice(0, 10),
      claim_amount: "",
      payment_method: "UPI",
      description: "",
    });
    setSelectedReceipts([]);
  };

  // Submit New Expense Claim
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (isGeneralAdmin) {
      showAlert(
        "General Admins cannot submit expense claims. Only Admins and Employees can submit claims.",
        "Permission Denied",
      );
      return;
    }
    if (!createForm.title.trim()) {
      showAlert("Please enter the expense reason / purpose.", "Required Field");
      return;
    }
    const amt = parseFloat(createForm.claim_amount);
    if (isNaN(amt) || amt <= 0) {
      showAlert(
        "Please enter a valid positive claim amount.",
        "Invalid Amount",
      );
      return;
    }
    if (amt > MAX_CLAIM_LIMIT) {
      showAlert(
        `Claim amount cannot exceed the company policy limit of ${formatCurrency(MAX_CLAIM_LIMIT)}.`,
        "Policy Limit Exceeded",
      );
      return;
    }
    if (amt >= 500 && selectedReceipts.length === 0) {
      showAlert(
        "Receipt / bill upload is required for expenses of ₹500 or more.",
        "Receipt Required",
      );
      return;
    }

    try {
      setCreateSubmitting(true);
      const fd = new FormData();
      if (createForm.category_id) {
        fd.append("category_id", createForm.category_id);
      } else if (categories.length > 0) {
        fd.append("category_id", String(categories[0].id));
      }
      fd.append("title", createForm.title.trim());
      fd.append("merchant_name", createForm.merchant_name.trim());
      fd.append("expense_date", createForm.expense_date);
      fd.append("claim_amount", String(amt));
      fd.append("payment_method", createForm.payment_method);
      fd.append("description", createForm.description.trim());

      selectedReceipts.forEach((file) => {
        fd.append("receipts", file);
      });

      const res = await createExpenseClaim(fd);
      showToast(res.message || "Expense claim submitted successfully! 📋");
      setShowCreateModal(false);
      resetCreateForm();
      loadClaims(1);
      loadStats();
    } catch (err) {
      console.error("Create expense error:", err);
      showAlert(
        err.response?.data?.message || err.message || "Failed to submit claim.",
        "Submission Error",
      );
    } finally {
      setCreateSubmitting(false);
    }
  };

  // Open Details Modal
  const handleOpenDetail = async (claim) => {
    try {
      const full = await getExpenseClaimById(claim.id);
      setActiveClaim(full.claim || claim);
      setShowDetailModal(true);
    } catch {
      setActiveClaim(claim);
      setShowDetailModal(true);
    }
  };

  // Open Review / Approval Modal
  const handleOpenReview = (claim) => {
    if (!isGeneralAdmin) {
      showAlert(
        "Only General Admins have permission to review expense claims.",
        "Permission Denied",
      );
      return;
    }
    setActiveClaim(claim);
    setApprovalDecision("approve");
    setApprovedAmountInput(String(claim.claim_amount));
    setApprovalNotes("");
    setRejectionReason("");
    setShowApprovalModal(true);
  };

  // Submit Approval or Rejection
  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!activeClaim) return;

    try {
      setReviewSubmitting(true);
      if (approvalDecision === "reject") {
        if (!rejectionReason.trim()) {
          showAlert(
            "Please specify a reason for rejecting this claim.",
            "Rejection Reason Required",
          );
          setReviewSubmitting(false);
          return;
        }
        await rejectExpenseClaim(activeClaim.id, {
          reason: rejectionReason.trim(),
        });
        showToast(`Claim ${activeClaim.claim_code} has been rejected.`);
      } else {
        const approvedAmt =
          approvalDecision === "partial"
            ? parseFloat(approvedAmountInput)
            : parseFloat(activeClaim.claim_amount);

        if (isNaN(approvedAmt) || approvedAmt <= 0) {
          showAlert("Please enter a valid approved amount.", "Invalid Amount");
          setReviewSubmitting(false);
          return;
        }
        await approveExpenseClaim(activeClaim.id, {
          approved_amount: approvedAmt,
          notes: approvalNotes.trim(),
        });
        showToast(
          `Claim ${activeClaim.claim_code} approved for ₹${approvedAmt.toLocaleString()}! 🎉`,
        );
      }

      setShowApprovalModal(false);
      loadClaims(pagination.page);
      loadStats();
    } catch (err) {
      showAlert(
        err.response?.data?.message ||
          err.message ||
          "Failed to process review.",
        "Review Error",
      );
    } finally {
      setReviewSubmitting(false);
    }
  };

  // Open My Bank Details Modal
  const handleOpenMyBankModal = async () => {
    setShowBankModal(true);
    setBankLoading(true);
    setShowFullAccount(false);
    try {
      const res = await getMyBankDetails();
      if (
        res.success &&
        res.details &&
        (res.details.account_number || res.details.upi_id)
      ) {
        setSavedBankData(res.details);
        setIsEditingBankDetails(false); // Details already exist -> show clean view mode with Edit button
        setMyBankForm({
          account_holder_name:
            res.details.account_holder_name || user?.name || "",
          account_number: res.details.account_number || "",
          confirm_account_number: res.details.account_number || "",
          ifsc_code: res.details.ifsc_code || "",
          bank_name: res.details.bank_name || "",
          upi_id: res.details.upi_id || "",
          preferred_mode: res.details.preferred_mode || "bank_account",
        });
      } else {
        setSavedBankData(null);
        setIsEditingBankDetails(true); // No details yet -> open directly in edit/input mode
        setMyBankForm((prev) => ({
          ...prev,
          account_holder_name: user?.name || "",
          account_number: "",
          confirm_account_number: "",
          ifsc_code: "",
          bank_name: "",
          upi_id: "",
          preferred_mode: "bank_account",
        }));
      }
    } catch (err) {
      console.warn("Failed to load bank details:", err);
      setIsEditingBankDetails(true);
    } finally {
      setBankLoading(false);
    }
  };

  // Save / Update My Bank Details
  const handleSaveMyBankModal = async (e) => {
    e.preventDefault();
    if (myBankForm.preferred_mode === "bank_account") {
      if (myBankForm.account_number !== myBankForm.confirm_account_number) {
        showAlert(
          "Account numbers do not match. Please verify and re-enter.",
          "Validation Error",
        );
        return;
      }
      if (!myBankForm.account_number || !myBankForm.ifsc_code) {
        showAlert(
          "Account Number and IFSC Code are required for bank transfers.",
          "Validation Error",
        );
        return;
      }
    }
    if (myBankForm.preferred_mode === "upi" && !myBankForm.upi_id) {
      showAlert(
        "Please enter a valid UPI ID (e.g. yourname@okhdfcbank).",
        "Validation Error",
      );
      return;
    }

    try {
      setBankSaving(true);
      const res = await saveMyBankDetails(myBankForm);
      showToast(res.message || "Payout details saved successfully! 🏦");
      setSavedBankData(res.details);
      setIsEditingBankDetails(false); // Return to view mode after saving
    } catch (err) {
      showAlert(
        err.response?.data?.message ||
          err.message ||
          "Failed to save bank details.",
        "Save Error",
      );
    } finally {
      setBankSaving(false);
    }
  };

  // Open Settlement Modal
  const handleOpenSettle = async (claim) => {
    if (!isGeneralAdmin) {
      showAlert(
        "Only General Admins have permission to settle and reimburse claims.",
        "Permission Denied",
      );
      return;
    }
    const defaultMode = "NEFT / IMPS";
    setActiveClaim(claim);
    setSettleForm({
      settlement_mode: defaultMode,
      transaction_ref: generateTransactionRef(defaultMode),
      notes: "",
    });
    setSettleMethodType("instant");
    setQuickAddBankMode(false);

    // Initialize quick add form
    setQuickBankForm({
      account_holder_name: claim.employee_name || "",
      account_number: "",
      ifsc_code: "",
      bank_name: "",
      upi_id: "",
      preferred_mode: "bank_account",
    });

    if (
      claim.employee_bank_details &&
      (claim.employee_bank_details.account_number ||
        claim.employee_bank_details.upi_id)
    ) {
      setActiveEmpBank(claim.employee_bank_details);
      setInstantPayoutMode(
        claim.employee_bank_details.preferred_mode === "upi" ? "UPI" : "IMPS",
      );
    } else {
      setActiveEmpBank(null);
      setLoadingEmpBank(true);
      try {
        const res = await getEmployeeBankDetailsById(claim.employee_id);
        if (
          res.success &&
          res.details &&
          (res.details.account_number || res.details.upi_id)
        ) {
          setActiveEmpBank(res.details);
          setInstantPayoutMode(
            res.details.preferred_mode === "upi" ? "UPI" : "IMPS",
          );
        } else {
          setActiveEmpBank(null);
        }
      } catch (err) {
        console.warn("Could not load bank details:", err);
      } finally {
        setLoadingEmpBank(false);
      }
    }

    setShowSettleModal(true);
  };

  // Quick Save Bank Details for Employee from within Settlement Modal
  const handleQuickSaveEmployeeBank = async (e) => {
    e.preventDefault();
    if (!activeClaim) return;
    try {
      setBankSaving(true);
      const res = await saveMyBankDetails({
        ...quickBankForm,
        employee_id: activeClaim.employee_id,
      });
      showToast("Employee payout details saved successfully! 🏦");
      setActiveEmpBank(res.details);
      setQuickAddBankMode(false);
      setInstantPayoutMode(
        res.details.preferred_mode === "upi" ? "UPI" : "IMPS",
      );
    } catch (err) {
      showAlert(
        err.response?.data?.message ||
          err.message ||
          "Failed to save employee bank details.",
        "Save Error",
      );
    } finally {
      setBankSaving(false);
    }
  };

  // Submit Instant Automated Transfer via RazorpayX
  const handleInstantPayoutSubmit = async (e) => {
    e.preventDefault();
    if (!activeClaim) return;
    if (
      !activeEmpBank ||
      (!activeEmpBank.account_number && !activeEmpBank.upi_id)
    ) {
      showAlert(
        "The employee has not configured their Bank or UPI details yet. Please enter their bank details using 'Add Bank Details' or switch to Manual record.",
        "Bank Details Required",
      );
      return;
    }

    try {
      setSettleSubmitting(true);
      const res = await initiateInstantPayout(activeClaim.id, {
        payout_mode: instantPayoutMode,
        notes: settleForm.notes.trim(),
      });
      showToast(
        res.message || `Transfer completed for ${activeClaim.claim_code}! 💸`,
      );
      setShowSettleModal(false);
      loadClaims(pagination.page);
      loadStats();
    } catch (err) {
      showAlert(
        err.response?.data?.message ||
          err.message ||
          "Failed to process instant payout.",
        "Payout Error",
      );
    } finally {
      setSettleSubmitting(false);
    }
  };

  // Submit Manual Reimbursement Payout
  const handleSettleSubmit = async (e) => {
    e.preventDefault();
    if (!activeClaim) return;
    const finalRef =
      settleForm.transaction_ref.trim() ||
      generateTransactionRef(settleForm.settlement_mode);

    try {
      setSettleSubmitting(true);
      const res = await settleExpenseClaim(activeClaim.id, {
        settlement_mode: settleForm.settlement_mode,
        transaction_ref: finalRef,
        notes: settleForm.notes.trim(),
      });
      showToast(
        res.message ||
          `Claim ${activeClaim.claim_code} marked as reimbursed! 💸`,
      );
      setShowSettleModal(false);
      loadClaims(pagination.page);
      loadStats();
    } catch (err) {
      showAlert(
        err.response?.data?.message ||
          err.message ||
          "Failed to record settlement.",
        "Settlement Error",
      );
    } finally {
      setSettleSubmitting(false);
    }
  };

  // Delete / Cancel pending claim
  const handleDeleteClaim = (claim) => {
    setClaimToDelete(claim);
  };

  const handleConfirmDeleteClaim = async () => {
    if (!claimToDelete) return;
    try {
      setDeleteLoading(true);
      await deleteExpenseClaim(claimToDelete.id);
      showToast(`Claim ${claimToDelete.claim_code} cancelled and deleted.`);
      setClaimToDelete(null);
      loadClaims(pagination.page);
      loadStats();
    } catch (err) {
      showToast(
        err.response?.data?.message || err.message || "Failed to cancel claim.",
        "error",
      );
    } finally {
      setDeleteLoading(false);
    }
  };

  // Format Helper
  const formatCurrency = (val) => {
    const num = parseFloat(val);
    if (isNaN(num)) return "₹0.00";
    return `₹${num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatFileSize = (bytes) => {
    if (!bytes || isNaN(bytes) || bytes === 0) return "1.2 MB";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileTypeLabel = (fileName, fileType) => {
    if (fileName && fileName.includes(".")) {
      const ext = fileName.split(".").pop();
      if (ext && ext.length <= 5) return ext.toUpperCase();
    }
    if (fileType) {
      const parts = fileType.split("/");
      if (parts[1]) return parts[1].toUpperCase();
    }
    return "PNG";
  };

  return (
    <div className="expense-container">
      {/* Toast Notification */}
      {toastMessage && (
        <SuccessToast
          message={toastMessage}
          onClose={() => setToastMessage("")}
        />
      )}
      {/* Main Page Shell */}
      <div className="expense-shell">
        {/* 1. Header */}
        <div className="inbox-header-row">
          <div className="inbox-header-titles">
            <span className="inbox-eyebrow">
              • FINANCE &amp; EXPENSE WORKFLOW
            </span>
            <h1>Expense Reimbursement</h1>
            <p className="inbox-subtitle">
              Submit expense claims with receipts, monitor approval workflows,
              and manage reimbursement payouts.
            </p>
          </div>

          {/* Right Header Actions */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              flexWrap: "wrap",
            }}
          >
            {isGeneralAdmin && (
              <button
                type="button"
                className="btn-reset-filters"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  height: "38px",
                  padding: "0 14px",
                  fontWeight: 600,
                  fontSize: "12.5px",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
                onClick={() => setShowPolicyModal(true)}
                title="View and configure category policy limits"
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
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
                <span>Policy &amp; Limits</span>
              </button>
            )}

            {!isGeneralAdmin && (
              <button
                type="button"
                className="btn-reset-filters"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  height: "38px",
                  padding: "0 14px",
                  fontWeight: 600,
                  fontSize: "12.5px",
                  borderRadius: "6px",
                  cursor: "pointer",
                  background: "#f8fafc",
                  border: "1px solid #cbd5e1",
                  color: "#1e293b",
                }}
                onClick={handleOpenMyBankModal}
                title="Manage your Bank Account / UPI ID for automated reimbursements"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 21h18M3 10h18M5 10v11M9 10v11M15 10v11M19 10v11M12 2 2 7h20L12 2z" />
                </svg>
                <span>Payout Bank Details</span>
              </button>
            )}

            {!isGeneralAdmin && (
              <button
                type="button"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  height: "38px",
                  padding: "0 16px",
                  background: "#ea580c",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "6px",
                  fontWeight: 600,
                  fontSize: "13px",
                  cursor: "pointer",
                  boxShadow: "0 2px 6px rgba(234, 88, 12, 0.25)",
                }}
                onClick={() => setShowCreateModal(true)}
                title="Create and submit a new expense claim"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                <span>+ New Expense Claim</span>
              </button>
            )}
          </div>
        </div>

        {/* 2. KPI Metric Summary Cards */}
        <div className="inbox-stats-grid">
          {/* Card 1: Total Claimed (Amber / Gold) */}
          <div className="stat-card card-amber">
            <div className="stat-icon open">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <div className="stat-details">
              <span className="stat-label">Total Claimed</span>
              <span className="stat-value expense-stat-value">
                {formatCurrency(stats.totalClaimedAmount)}
              </span>
              <span className="stat-subtext-muted">
                {stats.totalCount} total claims
              </span>
            </div>
            <div className="stat-corner-chart amber">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <rect
                  x="2"
                  y="16"
                  width="3.5"
                  height="6"
                  rx="1"
                  opacity="0.6"
                />
                <rect
                  x="7.5"
                  y="11"
                  width="3.5"
                  height="11"
                  rx="1"
                  opacity="0.75"
                />
                <rect
                  x="13"
                  y="6"
                  width="3.5"
                  height="16"
                  rx="1"
                  opacity="0.9"
                />
                <rect
                  x="18.5"
                  y="2"
                  width="3.5"
                  height="20"
                  rx="1"
                  opacity="1"
                />
              </svg>
            </div>
          </div>

          {/* Card 2: Pending Approval (Blue) */}
          <div className="stat-card card-blue">
            <div className="stat-icon total">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <div className="stat-details">
              <span className="stat-label">Pending Approval</span>
              <span className="stat-value expense-stat-value">
                {formatCurrency(stats.pendingAmount)}
              </span>
              <span className="stat-subtext-muted">
                {stats.pendingCount} claims in review
              </span>
            </div>
            <div className="stat-corner-chart blue">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <rect
                  x="2"
                  y="16"
                  width="3.5"
                  height="6"
                  rx="1"
                  opacity="0.6"
                />
                <rect
                  x="7.5"
                  y="11"
                  width="3.5"
                  height="11"
                  rx="1"
                  opacity="0.75"
                />
                <rect
                  x="13"
                  y="6"
                  width="3.5"
                  height="16"
                  rx="1"
                  opacity="0.9"
                />
                <rect
                  x="18.5"
                  y="2"
                  width="3.5"
                  height="20"
                  rx="1"
                  opacity="1"
                />
              </svg>
            </div>
          </div>

          {/* Card 3: Approved & Queued (Green) */}
          <div className="stat-card card-green">
            <div className="stat-icon resolved">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div className="stat-details">
              <span className="stat-label">Approved &amp; Queued</span>
              <span className="stat-value expense-stat-value">
                {formatCurrency(stats.approvedAmount)}
              </span>
              <span className="stat-subtext-muted">
                {stats.approvedCount} awaiting payout
              </span>
            </div>
            <div className="stat-corner-chart green">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <rect
                  x="2"
                  y="16"
                  width="3.5"
                  height="6"
                  rx="1"
                  opacity="0.6"
                />
                <rect
                  x="7.5"
                  y="11"
                  width="3.5"
                  height="11"
                  rx="1"
                  opacity="0.75"
                />
                <rect
                  x="13"
                  y="6"
                  width="3.5"
                  height="16"
                  rx="1"
                  opacity="0.9"
                />
                <rect
                  x="18.5"
                  y="2"
                  width="3.5"
                  height="20"
                  rx="1"
                  opacity="1"
                />
              </svg>
            </div>
          </div>

          {/* Card 4: Reimbursed (Rose) */}
          <div className="stat-card card-rose">
            <div
              className="stat-icon"
              style={{
                background: "#fef2f2",
                color: "#e11d48",
                border: "1px solid #ffe4e6",
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </div>
            <div className="stat-details">
              <span className="stat-label">Reimbursed</span>
              <span className="stat-value expense-stat-value">
                {formatCurrency(stats.reimbursedAmount)}
              </span>
              <span className="stat-subtext-muted">
                {stats.reimbursedCount} settled to bank
              </span>
            </div>
            <div className="stat-corner-chart rose">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <rect
                  x="2"
                  y="16"
                  width="3.5"
                  height="6"
                  rx="1"
                  opacity="0.6"
                />
                <rect
                  x="7.5"
                  y="11"
                  width="3.5"
                  height="11"
                  rx="1"
                  opacity="0.75"
                />
                <rect
                  x="13"
                  y="6"
                  width="3.5"
                  height="16"
                  rx="1"
                  opacity="0.9"
                />
                <rect
                  x="18.5"
                  y="2"
                  width="3.5"
                  height="20"
                  rx="1"
                  opacity="1"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* 3. Navigation Tabs Bar (Flat on background like Approval Inbox) */}
        <div className="inbox-tabs-bar">
          {isGeneralAdmin && (
            <button
              type="button"
              className={`inbox-tab-btn ${activeTab === "pending" ? "active" : ""}`}
              onClick={() => {
                setActiveTab("pending");
                setSelectedStatus("all");
              }}
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span>Pending Approval</span>
              {stats.pendingCount > 0 && (
                <span className="inbox-tab-badge">{stats.pendingCount}</span>
              )}
            </button>
          )}

          {isGeneralAdmin && (
            <button
              type="button"
              className={`inbox-tab-btn ${activeTab === "reviewed" ? "active" : ""}`}
              onClick={() => {
                setActiveTab("reviewed");
                setSelectedStatus("all");
              }}
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M9 11l3 3L22 4" />
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
              <span>Approved &amp; Rejected</span>
            </button>
          )}

          {isGeneralAdmin && (
            <button
              type="button"
              className={`inbox-tab-btn ${activeTab === "reimbursed" ? "active" : ""}`}
              onClick={() => {
                setActiveTab("reimbursed");
                setSelectedStatus("all");
              }}
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
              <span>Reimbursed</span>
            </button>
          )}

          {isGeneralAdmin && (
            <button
              type="button"
              className={`inbox-tab-btn ${activeTab === "all_claims" ? "active" : ""}`}
              onClick={() => {
                setActiveTab("all_claims");
                setSelectedStatus("all");
              }}
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" />
                <line x1="3" y1="12" x2="3.01" y2="12" />
                <line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
              <span>All Company Ledger</span>
            </button>
          )}

          {!isGeneralAdmin && (
            <button
              type="button"
              className={`inbox-tab-btn ${activeTab === "my_claims" ? "active" : ""}`}
              onClick={() => {
                setActiveTab("my_claims");
                setSelectedStatus("all");
              }}
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <span>My Expense Claims</span>
            </button>
          )}
        </div>

        {/* 4. Controls Row (Search and CustomSelect Dropdowns flat on background) */}
        <div className="inbox-controls-row">
          <div className="inbox-search-wrapper">
            <span className="inbox-search-icon">
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#94a3b8"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input
              type="text"
              className="inbox-search-input"
              placeholder="Search by expense reason, merchant, claim code, employee..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="clear-search-btn"
                onClick={() => setSearchQuery("")}
                title="Clear search"
              >
                &times;
              </button>
            )}
          </div>

          <div className="inbox-filters-group">
            <CustomSelect
              value={pagination.limit}
              onChange={handlePageSizeChange}
              options={pageSizeOptions}
              minWidth="110px"
            />

            {activeTab === "reviewed" && (
              <CustomSelect
                value={selectedStatus}
                onChange={(valOrEvent) => {
                  const rawVal =
                    valOrEvent?.target?.value !== undefined
                      ? valOrEvent.target.value
                      : typeof valOrEvent === "object" &&
                          valOrEvent !== null &&
                          valOrEvent.value !== undefined
                        ? valOrEvent.value
                        : valOrEvent;
                  setSelectedStatus(rawVal || "all");
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                onClear={() => {
                  setSelectedStatus("all");
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                options={[
                  { value: "all", label: "All Statuses" },
                  { value: "Approved", label: "Approved" },
                  { value: "Rejected", label: "Rejected" },
                ]}
                placeholder="All Statuses"
                minWidth="140px"
                searchable={false}
                isClearable={true}
                includeAllInMenu={true}
              />
            )}

            {(activeTab === "all_claims" || activeTab === "my_claims") && (
              <div
                style={{
                  width: "150px",
                  minWidth: "150px",
                  maxWidth: "150px",
                  flexShrink: 0,
                }}
              >
                <SearchableDropdown
                  value={selectedStatus}
                  options={[
                    { id: "Pending", name: "Pending" },
                    { id: "Approved", name: "Approved" },
                    { id: "Reimbursed", name: "Reimbursed" },
                    { id: "Rejected", name: "Rejected" },
                  ]}
                  onChange={(val) => setSelectedStatus(val || "all")}
                  placeholder="All Statuses"
                  searchPlaceholder="Search status..."
                  allowAll={true}
                  getOptionValue={(s) => s.id}
                  getOptionLabel={(s) => s.name}
                />
              </div>
            )}
          </div>
        </div>

        {/* 5. Standalone Requests Table Container */}
        <div className="requests-table-container">
          <table className="requests-table">
            <thead>
              <tr>
                <th style={{ width: "40px", textAlign: "center" }}>#</th>
                <th style={{ width: "150px" }}>CLAIM ID</th>
                {activeTab !== "my_claims" && (
                  <th style={{ width: "18%" }}>EMPLOYEE</th>
                )}
                <th
                  style={{ width: activeTab !== "my_claims" ? "22%" : "35%" }}
                >
                  EXPENSE DETAILS
                </th>
                <th style={{ width: "15%" }}>CLAIM AMOUNT</th>
                <th style={{ width: "11%" }}>APPROVED</th>
                <th style={{ width: "11%" }}>STATUS</th>
                <th style={{ width: "10%" }}>RECEIPTS</th>
                <th style={{ width: "80px", textAlign: "center" }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={activeTab !== "my_claims" ? 9 : 8}
                    className="table-loading-cell"
                    style={{
                      textAlign: "center",
                      padding: "40px",
                      color: "#64748b",
                    }}
                  >
                    <span>Loading expense claims...</span>
                  </td>
                </tr>
              ) : displayedClaims.length === 0 ? (
                <tr>
                  <td
                    colSpan={activeTab !== "my_claims" ? 9 : 8}
                    className="table-empty-cell"
                  >
                    <div className="empty-box-icon">
                      <svg
                        width="34"
                        height="34"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                      </svg>
                    </div>
                    <h4>No Expense Claims Found</h4>
                    <p>
                      {activeTab === "my_claims"
                        ? "You haven't submitted any expense claims yet. Submit your first reimbursement request with receipts to get started."
                        : "No claims match your selected filter criteria. Try adjusting your search or filters."}
                    </p>
                    {activeTab === "my_claims" && !isGeneralAdmin && (
                      <button
                        type="button"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          marginTop: "12px",
                          height: "36px",
                          padding: "0 16px",
                          background: "#ea580c",
                          color: "#ffffff",
                          border: "none",
                          borderRadius: "6px",
                          fontWeight: 600,
                          fontSize: "13px",
                          cursor: "pointer",
                        }}
                        onClick={() => setShowCreateModal(true)}
                      >
                        + Submit New Claim
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                displayedClaims.map((claim, idx) => (
                  <tr key={claim.id}>
                    {/* Index */}
                    <td
                      style={{
                        textAlign: "center",
                        color: "#64748b",
                        fontWeight: 600,
                        fontSize: "12px",
                      }}
                    >
                      {(pagination.page - 1) * pagination.limit + idx + 1}
                    </td>

                    {/* Code Badge */}
                    <td>
                      <span className="request-code-badge">
                        {claim.claim_code}
                      </span>
                    </td>

                    {/* Requester / Employee */}
                    {activeTab !== "my_claims" && (
                      <td>
                        <div className="requester-col">
                          <div className="requester-info">
                            <span className="requester-name">
                              {claim.employee_name || "Employee"}
                            </span>
                            <span className="requester-role">
                              {claim.employee_email || "Employee"}
                            </span>
                          </div>
                        </div>
                      </td>
                    )}

                    {/* Expense Details */}
                    <td>
                      <div className="request-title-cell">
                        <div className="request-main-title">{claim.title}</div>
                        <div className="request-desc-excerpt">
                          {claim.merchant_name
                            ? `${claim.merchant_name} • `
                            : ""}
                          {new Date(claim.expense_date).toLocaleDateString([], {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </div>
                      </div>
                    </td>

                    {/* Claim Amount */}
                    <td>
                      <span className="request-amount-cell">
                        {formatCurrency(claim.claim_amount)}
                      </span>
                      {claim.is_over_limit && (
                        <div
                          className="badge-over-limit"
                          style={{ marginTop: "3px" }}
                        >
                          ⚠️ Over Policy Limit
                        </div>
                      )}
                    </td>

                    {/* Approved Amount */}
                    <td>
                      <span
                        style={{
                          fontWeight: 600,
                          color: claim.approved_amount ? "#16a34a" : "#64748b",
                          fontSize: "13px",
                        }}
                      >
                        {claim.approved_amount
                          ? formatCurrency(claim.approved_amount)
                          : "—"}
                      </span>
                    </td>

                    {/* Status */}
                    <td>
                      <div
                        className={`status-pill-custom ${claim.status?.toLowerCase().replace(/\s+/g, "-")}`}
                      >
                        <span className="status-dot"></span>
                        <span>{claim.status}</span>
                      </div>
                    </td>

                    {/* Receipts */}
                    <td>
                      {claim.attachments && claim.attachments.length > 0 ? (
                        <span
                          style={{
                            fontSize: "12px",
                            color: "#2563eb",
                            fontWeight: 600,
                          }}
                        >
                          📎 {claim.attachments.length} file
                          {claim.attachments.length > 1 ? "s" : ""}
                        </span>
                      ) : (
                        <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                          No receipts
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td style={{ textAlign: "center" }}>
                      <div
                        className="action-menu-wrapper"
                        style={{ display: "flex", justifyContent: "center" }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          className="btn-three-dots"
                          title="Actions"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId((prev) =>
                              prev === claim.id ? null : claim.id,
                            );
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
                            <circle cx="12" cy="5" r="1.5" />
                            <circle cx="12" cy="12" r="1.5" />
                            <circle cx="12" cy="19" r="1.5" />
                          </svg>
                        </button>

                        {openMenuId === claim.id && (
                          <div
                            className="action-dropdown-menu"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              className="action-dropdown-item"
                              onClick={() => {
                                setOpenMenuId(null);
                                handleOpenDetail(claim);
                              }}
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
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                <circle cx="12" cy="12" r="3" />
                              </svg>
                              <span>View Details</span>
                            </button>

                            {isGeneralAdmin && claim.status === "Pending" && (
                              <button
                                type="button"
                                className="action-dropdown-item action-dropdown-review"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  handleOpenReview(claim);
                                }}
                              >
                                <svg
                                  width="14"
                                  height="14"
                                  viewBox="0 0 24 24"
                                  fill="currentColor"
                                >
                                  <polygon points="5 3 19 12 5 21 5 3" />
                                </svg>
                                <span>Review Claim</span>
                              </button>
                            )}

                            {isGeneralAdmin && claim.status === "Approved" && (
                              <button
                                type="button"
                                className="action-dropdown-item action-dropdown-approve"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  handleOpenSettle(claim);
                                }}
                              >
                                <svg
                                  width="14"
                                  height="14"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="#16a34a"
                                  strokeWidth="2.4"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                                <span>Settle &amp; Pay</span>
                              </button>
                            )}

                            {claim.status === "Pending" &&
                              (!isGeneralAdmin ||
                                String(claim.employee_id) ===
                                  String(user?.userId || user?.id)) && (
                                <button
                                  type="button"
                                  className="action-dropdown-item action-dropdown-delete"
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    handleDeleteClaim(claim);
                                  }}
                                >
                                  <svg
                                    width="14"
                                    height="14"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="#dc2626"
                                    strokeWidth="2.4"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                  </svg>
                                  <span>Cancel Claim</span>
                                </button>
                              )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Table Pagination Footer */}
          <div className="table-pagination-footer">
            <div className="pagination-info">
              Showing{" "}
              {displayedClaims.length > 0
                ? (pagination.page - 1) * pagination.limit + 1
                : 0}{" "}
              to{" "}
              {Math.min(
                pagination.page * pagination.limit,
                pagination.total || displayedClaims.length,
              )}{" "}
              of {pagination.total || displayedClaims.length} records
            </div>
            <div className="pagination-controls">
              <button
                type="button"
                className="btn-page-nav"
                disabled={pagination.page <= 1}
                onClick={() => loadClaims(pagination.page - 1)}
              >
                &lt;
              </button>
              {Array.from(
                { length: Math.max(1, pagination.totalPages) },
                (_, i) => i + 1,
              ).map((p) => (
                <button
                  key={p}
                  type="button"
                  className={`btn-page-num ${p === pagination.page ? "active" : ""}`}
                  onClick={() => loadClaims(p)}
                >
                  {p}
                </button>
              ))}
              <button
                type="button"
                className="btn-page-nav"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => loadClaims(pagination.page + 1)}
              >
                &gt;
              </button>
            </div>
          </div>
        </div>
      </div>{" "}
      {/* /expense-shell */}
      {/* ========================================================================= */}
      {/* 1. CREATE EXPENSE CLAIM MODAL */}
      {/* ========================================================================= */}
      {showCreateModal && (
        <div
          className="expense-modal-backdrop"
          onClick={(e) =>
            e.target === e.currentTarget && setShowCreateModal(false)
          }
        >
          <div
            className="create-expense-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="create-expense-header">
              <div className="create-expense-header-left">
                <div className="create-expense-icon-box">
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#ea580c"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <line x1="10" y1="9" x2="8" y2="9" />
                  </svg>
                </div>
                <div>
                  <h3 className="create-expense-title">New Expense Claim</h3>
                  <p className="create-expense-subtitle">
                    Create a new expense claim with details, receipt, and
                    justification.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="create-expense-close-btn"
                onClick={() => setShowCreateModal(false)}
                title="Close"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit}>
              <div className="create-expense-body">
                {/* 1. Company Policy Banner at top */}
                <div className="create-policy-banner">
                  <div className="create-policy-icon">
                    <svg
                      width="22"
                      height="22"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#ea580c"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="16" x2="12" y2="12" />
                      <line x1="12" y1="8" x2="12.01" y2="8" />
                    </svg>
                  </div>
                  <div className="create-policy-text">
                    <div className="create-policy-title">Company Policy</div>
                    <div className="create-policy-desc">
                      Maximum allowed per claim is{" "}
                      <strong>{formatCurrency(MAX_CLAIM_LIMIT)}</strong>.
                      Bills/receipts required for ₹500 or more.
                    </div>
                  </div>
                </div>

                {/* 2. Section: Claim Details */}
                <div className="create-section-title">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#ea580c"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polygon points="12 2 2 7 12 12 22 7 12 2" />
                    <polyline points="2 17 12 22 22 17" />
                    <polyline points="2 12 12 17 22 12" />
                  </svg>
                  <span>Claim Details</span>
                </div>

                {/* Expense Reason / Purpose */}
                <div className="create-field-group">
                  <label className="create-field-label">
                    Expense Reason / Purpose <span className="req">*</span>
                  </label>
                  <div className="create-input-with-icon">
                    <span className="create-field-left-icon">
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#64748b"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                      </svg>
                    </span>
                    <input
                      type="text"
                      className="create-field-input"
                      placeholder="e.g. Client lunch meeting, Flight for tech conference, Office supplies..."
                      value={createForm.title}
                      onChange={(e) =>
                        setCreateForm({ ...createForm, title: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>

                {/* Merchant & Payment Method Row */}
                <div className="create-fields-row">
                  <div className="create-field-group">
                    <label className="create-field-label">
                      Merchant / Vendor Name
                    </label>
                    <div className="create-input-with-icon">
                      <span className="create-field-left-icon">
                        <svg
                          width="15"
                          height="15"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#64748b"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                          <polyline points="9 22 9 12 15 12 15 22" />
                        </svg>
                      </span>
                      <input
                        type="text"
                        className="create-field-input"
                        placeholder="e.g. Uber, Amazon, Indigo, Local Cafe"
                        value={createForm.merchant_name}
                        onChange={(e) =>
                          setCreateForm({
                            ...createForm,
                            merchant_name: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="create-field-group">
                    <label className="create-field-label">
                      Payment Method Used
                    </label>
                    <SearchableDropdown
                      value={createForm.payment_method}
                      options={PAYMENT_METHODS.map((pm) => ({
                        id: pm,
                        name: pm,
                      }))}
                      onChange={(val) =>
                        setCreateForm({
                          ...createForm,
                          payment_method: val || "UPI",
                        })
                      }
                      placeholder="Select payment method..."
                      searchPlaceholder="Search payment method..."
                      icon={
                        <svg
                          width="15"
                          height="15"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#64748b"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <rect
                            x="1"
                            y="4"
                            width="22"
                            height="16"
                            rx="2"
                            ry="2"
                          />
                          <line x1="1" y1="10" x2="23" y2="10" />
                        </svg>
                      }
                    />
                  </div>
                </div>

                {/* Date & Claim Amount Row */}
                <div className="create-fields-row">
                  <div className="create-field-group">
                    <label className="create-field-label">
                      Date of Expense <span className="req">*</span>
                    </label>
                    <div className="create-input-with-icon">
                      <span className="create-field-left-icon">
                        <svg
                          width="15"
                          height="15"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#64748b"
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
                      </span>
                      <input
                        type="date"
                        className="create-field-input"
                        value={createForm.expense_date}
                        max={new Date().toISOString().slice(0, 10)}
                        onChange={(e) =>
                          setCreateForm((prev) => ({
                            ...prev,
                            expense_date: e.target.value,
                          }))
                        }
                        required
                      />
                    </div>
                  </div>

                  <div className="create-field-group">
                    <label className="create-field-label">
                      Claim Amount (₹) <span className="req">*</span>
                    </label>
                    <div className="create-input-with-icon">
                      <span className="create-field-left-icon">
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#64748b"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <circle cx="8" cy="8" r="6" />
                          <path d="M18.09 10.37A6 6 0 1 1 10.34 18" />
                          <path d="M7 6h2v4H7z" />
                        </svg>
                      </span>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        className="create-field-input"
                        placeholder="0.00"
                        value={createForm.claim_amount}
                        onChange={(e) =>
                          setCreateForm({
                            ...createForm,
                            claim_amount: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                    {isAmountOverLimit && (
                      <div
                        className="expense-limit-hint warning"
                        style={{ marginTop: "4px" }}
                      >
                        ⚠️ Warning: Exceeds company policy limit of{" "}
                        {formatCurrency(MAX_CLAIM_LIMIT)} per claim.
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. Section: Upload Bills / Receipts */}
                <div
                  className="create-section-title"
                  style={{ marginTop: "18px" }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#ea580c"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                  </svg>
                  <span>
                    Upload Bills / Receipts <span className="req">*</span>
                  </span>
                </div>

                <label className="create-upload-dropzone">
                  <input
                    type="file"
                    multiple
                    accept="image/*,.pdf,.doc,.docx"
                    style={{ display: "none" }}
                    onChange={handleFileSelect}
                  />
                  <div className="create-upload-cloud-icon">
                    <svg
                      width="34"
                      height="34"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#7e22ce"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
                      <path d="M12 12v9" />
                      <path d="m16 16-4-4-4 4" />
                    </svg>
                  </div>
                  <div className="create-upload-title">
                    Click to browse or drop tax invoices &amp; bills
                  </div>
                  <div className="create-upload-sub">
                    Supports JPG, PNG, PDF up to 10MB (max 5 receipts)
                  </div>
                  <div className="create-upload-btn-chip">
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    <span>Choose Files</span>
                  </div>
                </label>

                {/* Selected Receipts File List */}
                {selectedReceipts.length > 0 && (
                  <div
                    className="receipt-files-list"
                    style={{ marginTop: "10px" }}
                  >
                    {selectedReceipts.map((file, idx) => (
                      <div key={idx} className="receipt-pill">
                        <span>📎 {file.name}</span>
                        <span style={{ color: "#94a3b8", fontSize: "11px" }}>
                          ({(file.size / 1024).toFixed(0)} KB)
                        </span>
                        <button
                          type="button"
                          className="receipt-pill-remove"
                          onClick={() => handleRemoveReceipt(idx)}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* 4. Section: Business Justification / Notes */}
                <div
                  className="create-section-title"
                  style={{ marginTop: "18px" }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#ea580c"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  <span>Business Justification / Notes</span>
                </div>

                <textarea
                  className="create-textarea"
                  rows="3"
                  placeholder="e.g. Business context, meeting details, or additional notes..."
                  value={createForm.description}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      description: e.target.value,
                    })
                  }
                />
              </div>

              {/* Modal Footer */}
              <div className="create-expense-footer">
                <button
                  type="button"
                  className="create-cancel-btn"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="create-submit-btn"
                  disabled={createSubmitting}
                >
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
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                  <span>
                    {createSubmitting ? "Submitting..." : "Submit Claim"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ========================================================================= */}
      {/* 2. CLAIM DETAILS & RECEIPT INSPECTOR MODAL */}
      {/* ========================================================================= */}
      {showDetailModal && activeClaim && (
        <div
          className="expense-modal-backdrop"
          onClick={(e) =>
            e.target === e.currentTarget && setShowDetailModal(false)
          }
        >
          <div
            className="claim-detail-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="claim-detail-header">
              <div className="claim-detail-header-left">
                <div className="claim-detail-icon-box">
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <line x1="10" y1="9" x2="8" y2="9" />
                  </svg>
                </div>
                <div>
                  <h3 className="claim-detail-title">
                    Claim Details: {activeClaim.claim_code}
                  </h3>
                  <p className="claim-detail-subtitle">
                    View complete claim information, receipt, and status
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="claim-detail-close-btn"
                onClick={() => setShowDetailModal(false)}
                title="Close"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="claim-detail-body">
              <div className="claim-detail-grid">
                {/* Left Pane: Claim Information */}
                <div className="claim-info-card">
                  <div className="claim-section-banner">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#2563eb"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="16" x2="12" y2="12" />
                      <line x1="12" y1="8" x2="12.01" y2="8" />
                    </svg>
                    <span>Claim Information</span>
                  </div>

                  <div className="claim-info-rows">
                    {/* Title */}
                    <div className="claim-info-row">
                      <div className="claim-info-label-cell">
                        <span className="claim-info-icon">
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#64748b"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                            <line x1="16" y1="13" x2="8" y2="13" />
                            <line x1="16" y1="17" x2="8" y2="17" />
                          </svg>
                        </span>
                        <span className="claim-info-label">Title</span>
                      </div>
                      <div
                        className="claim-info-val claim-title-ellipsis"
                        title={activeClaim.title}
                      >
                        {activeClaim.title}
                      </div>
                    </div>

                    {/* Employee */}
                    <div className="claim-info-row">
                      <div className="claim-info-label-cell">
                        <span className="claim-info-icon">
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#64748b"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                          </svg>
                        </span>
                        <span className="claim-info-label">Employee</span>
                      </div>
                      <div className="claim-info-val">
                        {activeClaim.employee_name} (
                        {activeClaim.employee_email})
                      </div>
                    </div>

                    {/* Merchant */}
                    <div className="claim-info-row">
                      <div className="claim-info-label-cell">
                        <span className="claim-info-icon">
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#64748b"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                            <polyline points="9 22 9 12 15 12 15 22" />
                          </svg>
                        </span>
                        <span className="claim-info-label">Merchant</span>
                      </div>
                      <div className="claim-info-val">
                        {activeClaim.merchant_name || "—"}
                      </div>
                    </div>

                    {/* Date of Expense */}
                    <div className="claim-info-row">
                      <div className="claim-info-label-cell">
                        <span className="claim-info-icon">
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#64748b"
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
                        </span>
                        <span className="claim-info-label">
                          Date of Expense
                        </span>
                      </div>
                      <div className="claim-info-val">
                        {new Date(activeClaim.expense_date).toLocaleDateString(
                          "en-US",
                          {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          },
                        )}
                      </div>
                    </div>

                    {/* Payment Method */}
                    <div className="claim-info-row">
                      <div className="claim-info-label-cell">
                        <span className="claim-info-icon">
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#64748b"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <rect
                              x="1"
                              y="4"
                              width="22"
                              height="16"
                              rx="2"
                              ry="2"
                            />
                            <line x1="1" y1="10" x2="23" y2="10" />
                          </svg>
                        </span>
                        <span className="claim-info-label">Payment Method</span>
                      </div>
                      <div className="claim-info-val">
                        {activeClaim.payment_method}
                      </div>
                    </div>

                    {/* Peach Highlight Box for Claimed Amount */}
                    <div className="claim-amount-peach-box">
                      <div className="claim-amount-box-left">
                        <span className="claim-amount-icon">
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#ea580c"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <circle cx="8" cy="8" r="6" />
                            <path d="M18.09 10.37A6 6 0 1 1 10.34 18" />
                            <path d="M7 6h2v4H7z" />
                          </svg>
                        </span>
                        <span className="claim-amount-label">
                          Claimed Amount
                        </span>
                      </div>
                      <span className="claim-amount-num">
                        {formatCurrency(activeClaim.claim_amount)}
                      </span>
                    </div>

                    {/* Approved Amount (if partially/fully approved) */}
                    {activeClaim.approved_amount && (
                      <div className="claim-amount-peach-box approved">
                        <div className="claim-amount-box-left">
                          <span className="claim-amount-icon approved">
                            <svg
                              width="18"
                              height="18"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="#16a34a"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                              <polyline points="22 4 12 14.01 9 11.01" />
                            </svg>
                          </span>
                          <span className="claim-amount-label approved">
                            Approved Amount
                          </span>
                        </div>
                        <span className="claim-amount-num approved">
                          {formatCurrency(activeClaim.approved_amount)}
                        </span>
                      </div>
                    )}

                    {/* Status Row */}
                    <div className="claim-info-row">
                      <div className="claim-info-label-cell">
                        <span className="claim-info-icon status-green">
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#16a34a"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                          </svg>
                        </span>
                        <span className="claim-info-label">Status</span>
                      </div>
                      <div className="claim-info-val">
                        <span
                          className={`claim-status-badge ${activeClaim.status.toLowerCase()}`}
                        >
                          <span className="status-badge-dot" />
                          <span>{activeClaim.status}</span>
                        </span>
                      </div>
                    </div>

                    {/* Notes / Justification (if any) */}
                    {activeClaim.description && (
                      <div className="claim-info-row">
                        <div className="claim-info-label-cell">
                          <span className="claim-info-icon">
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="#64748b"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                              <polyline points="14 2 14 8 20 8" />
                            </svg>
                          </span>
                          <span className="claim-info-label">Notes</span>
                        </div>
                        <div
                          className="claim-info-val"
                          style={{ fontWeight: 400, color: "#475569" }}
                        >
                          {activeClaim.description}
                        </div>
                      </div>
                    )}

                    {/* Approval Remarks */}
                    {activeClaim.approval_notes && (
                      <div className="claim-info-row">
                        <div className="claim-info-label-cell">
                          <span className="claim-info-icon">
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="#2563eb"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                            </svg>
                          </span>
                          <span className="claim-info-label">Remarks</span>
                        </div>
                        <div
                          className="claim-info-val"
                          style={{ color: "#2563eb", fontWeight: 500 }}
                        >
                          {activeClaim.approval_notes} (by{" "}
                          {activeClaim.approver_name})
                        </div>
                      </div>
                    )}

                    {/* Rejection Reason */}
                    {activeClaim.rejection_reason && (
                      <div className="claim-info-row">
                        <div className="claim-info-label-cell">
                          <span className="claim-info-icon">
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="#dc2626"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <circle cx="12" cy="12" r="10" />
                              <line x1="15" y1="9" x2="9" y2="15" />
                              <line x1="9" y1="9" x2="15" y2="15" />
                            </svg>
                          </span>
                          <span className="claim-info-label">Rejection</span>
                        </div>
                        <div
                          className="claim-info-val"
                          style={{ color: "#dc2626", fontWeight: 500 }}
                        >
                          {activeClaim.rejection_reason}
                        </div>
                      </div>
                    )}

                    {/* Settlement Reference (UTR) */}
                    {activeClaim.transaction_ref && (
                      <div className="claim-info-row">
                        <div className="claim-info-label-cell">
                          <span className="claim-info-icon">
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="#9333ea"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <rect
                                x="2"
                                y="7"
                                width="20"
                                height="14"
                                rx="2"
                                ry="2"
                              />
                              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                            </svg>
                          </span>
                          <span className="claim-info-label">Settlement</span>
                        </div>
                        <div
                          className="claim-info-val"
                          style={{ color: "#9333ea", fontWeight: 600 }}
                        >
                          {activeClaim.transaction_ref} via{" "}
                          {activeClaim.settlement_mode}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Pane: Uploaded Receipts */}
                <div className="claim-receipts-card">
                  <div className="claim-section-banner">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#2563eb"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                    </svg>
                    <span>
                      Uploaded Receipts ({activeClaim.attachments?.length || 0})
                    </span>
                  </div>

                  <div className="claim-receipts-content">
                    {activeClaim.attachments &&
                    activeClaim.attachments.length > 0 ? (
                      activeClaim.attachments.map((att) => {
                        const isImg =
                          att.file_type?.startsWith("image/") ||
                          /\.(jpg|jpeg|png|webp|gif)$/i.test(att.file_name);
                        const fileUrl = `${API_URL}${att.file_path}`;
                        const ext = getFileTypeLabel(
                          att.original_name || att.file_name,
                          att.file_type,
                        );
                        const size = formatFileSize(att.file_size);

                        return (
                          <div
                            key={att.id}
                            className="claim-receipt-item-wrapper"
                          >
                            {/* Inner Preview Box */}
                            <div className="claim-receipt-preview-box">
                              <button
                                type="button"
                                className="claim-receipt-fullscreen-btn"
                                title="Open full size in new tab"
                                onClick={() => window.open(fileUrl, "_blank")}
                              >
                                <svg
                                  width="15"
                                  height="15"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="#64748b"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                                </svg>
                              </button>

                              {isImg ? (
                                <img
                                  src={fileUrl}
                                  alt={att.original_name}
                                  className="claim-receipt-preview-img"
                                />
                              ) : (
                                <div className="claim-receipt-doc-placeholder">
                                  <svg
                                    width="48"
                                    height="48"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="#64748b"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                    <polyline points="14 2 14 8 20 8" />
                                    <line x1="16" y1="13" x2="8" y2="13" />
                                    <line x1="16" y1="17" x2="8" y2="17" />
                                  </svg>
                                  <span
                                    style={{
                                      fontSize: "12px",
                                      color: "#64748b",
                                      marginTop: "6px",
                                    }}
                                  >
                                    {ext} File
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Meta Bar below preview */}
                            <div className="claim-receipt-meta-bar">
                              <div className="claim-receipt-meta-left">
                                <div className="claim-receipt-type-icon">
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
                                    <rect
                                      x="3"
                                      y="3"
                                      width="18"
                                      height="18"
                                      rx="2"
                                      ry="2"
                                    />
                                    <circle cx="8.5" cy="8.5" r="1.5" />
                                    <polyline points="21 15 16 10 5 21" />
                                  </svg>
                                </div>
                                <div className="claim-receipt-meta-text">
                                  <span
                                    className="claim-receipt-file-name"
                                    title={att.original_name}
                                  >
                                    {att.original_name}
                                  </span>
                                  <span className="claim-receipt-file-sub">
                                    {ext} • {size}
                                  </span>
                                </div>
                              </div>

                              <a
                                href={fileUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="claim-receipt-open-btn"
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
                                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                  <polyline points="15 3 21 3 21 9" />
                                  <line x1="10" y1="14" x2="21" y2="3" />
                                </svg>
                                <span>Open in New Tab</span>
                              </a>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="claim-receipt-empty-card">
                        <svg
                          width="40"
                          height="40"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#cbd5e1"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                        </svg>
                        <span
                          style={{
                            color: "#94a3b8",
                            fontSize: "13px",
                            marginTop: "8px",
                          }}
                        >
                          No receipts uploaded with this claim.
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="claim-detail-footer">
              <button
                type="button"
                className="claim-detail-close-btn-bottom"
                onClick={() => setShowDetailModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ========================================================================= */}
      {/* 3. ADMIN REVIEW & APPROVAL MODAL */}
      {/* ========================================================================= */}
      {showApprovalModal && activeClaim && (
        <div
          className="expense-modal-backdrop"
          onClick={(e) =>
            e.target === e.currentTarget && setShowApprovalModal(false)
          }
        >
          <div
            className="review-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="review-modal-header">
              <div className="review-modal-header-left">
                <div className="review-modal-icon-box">
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#ea580c"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M16 16l3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1z" />
                    <path d="M2 16l3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1z" />
                    <path d="M7 21h10" />
                    <path d="M12 3v18" />
                    <path d="M3 7h18" />
                  </svg>
                </div>
                <div>
                  <h3 className="review-modal-title">
                    Review Claim: {activeClaim.claim_code}
                  </h3>
                  <p className="review-modal-subtitle">
                    Evaluate the claim details and take an approval action.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="review-modal-close-btn"
                onClick={() => setShowApprovalModal(false)}
                title="Close"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleReviewSubmit}>
              <div className="review-modal-body">
                {/* 1. Claim Highlight Banner */}
                <div className="review-claim-banner">
                  <div className="review-banner-left">
                    <div className="review-banner-doc-icon">
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#ea580c"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                        <line x1="10" y1="9" x2="8" y2="9" />
                      </svg>
                    </div>
                    <div>
                      <div className="review-banner-title">
                        {activeClaim.title}
                      </div>
                      <div className="review-banner-meta">
                        Submitted by{" "}
                        <strong>{activeClaim.employee_name}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="review-banner-right">
                    <span className="review-amount-label">
                      Requested Amount
                    </span>
                    <span className="review-amount-val">
                      {formatCurrency(activeClaim.claim_amount)}
                    </span>
                  </div>
                </div>

                {/* 2. Three Info Chips (Employee, Merchant & Date, Payment Method) */}
                <div className="review-meta-chips-grid">
                  <div className="review-meta-chip">
                    <div className="review-chip-icon">
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#2563eb"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    </div>
                    <div className="review-chip-text">
                      <span className="review-chip-label">Employee</span>
                      <span
                        className="review-chip-val"
                        title={`${activeClaim.employee_name} (${activeClaim.employee_email})`}
                      >
                        {activeClaim.employee_name} (
                        {activeClaim.employee_email})
                      </span>
                    </div>
                  </div>

                  <div className="review-meta-chip">
                    <div className="review-chip-icon">
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#2563eb"
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
                    </div>
                    <div className="review-chip-text">
                      <span className="review-chip-label">
                        Merchant &amp; Date
                      </span>
                      <span className="review-chip-val">
                        {activeClaim.merchant_name || "N/A"} •{" "}
                        {new Date(activeClaim.expense_date).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          },
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="review-meta-chip">
                    <div className="review-chip-icon">
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#2563eb"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect
                          x="1"
                          y="4"
                          width="22"
                          height="16"
                          rx="2"
                          ry="2"
                        />
                        <line x1="1" y1="10" x2="23" y2="10" />
                      </svg>
                    </div>
                    <div className="review-chip-text">
                      <span className="review-chip-label">Payment Method</span>
                      <span className="review-chip-val">
                        {activeClaim.payment_method}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3. Approval Action Selection */}
                <div className="review-section-title">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#991b1b"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <polyline points="9 12 11 14 15 10" />
                  </svg>
                  <span>Approval Action</span>
                </div>

                <div className="review-action-grid">
                  {/* Approve Full Amount */}
                  <div
                    className={`review-action-card ${approvalDecision === "approve" ? "active-approve" : ""}`}
                    onClick={() => setApprovalDecision("approve")}
                  >
                    <div className="review-action-radio">
                      <span
                        className={`custom-radio-dot ${approvalDecision === "approve" ? "checked" : ""}`}
                      />
                    </div>
                    <div className="review-action-badge approve">
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#881337"
                        strokeWidth="2.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                    <div className="review-action-text">
                      <div className="review-action-name">
                        Approve Full Amount
                      </div>
                      <div className="review-action-desc">
                        Approve the entire claim amount of{" "}
                        {formatCurrency(activeClaim.claim_amount)}
                      </div>
                    </div>
                  </div>

                  {/* Partial Approve */}
                  <div
                    className={`review-action-card ${approvalDecision === "partial" ? "active-partial" : ""}`}
                    onClick={() => setApprovalDecision("partial")}
                  >
                    <div className="review-action-radio">
                      <span
                        className={`custom-radio-dot ${approvalDecision === "partial" ? "checked" : ""}`}
                      />
                    </div>
                    <div className="review-action-badge partial">
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#d97706"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="8" cy="8" r="6" />
                        <path d="M18.09 10.37A6 6 0 1 1 10.34 18" />
                        <path d="M7 6h2v4H7z" />
                      </svg>
                    </div>
                    <div className="review-action-text">
                      <div className="review-action-name">Partial Approve</div>
                      <div className="review-action-desc">
                        Approve a partial amount (less than{" "}
                        {formatCurrency(activeClaim.claim_amount)})
                      </div>
                    </div>
                  </div>

                  {/* Reject Claim */}
                  <div
                    className={`review-action-card ${approvalDecision === "reject" ? "active-reject" : ""}`}
                    onClick={() => setApprovalDecision("reject")}
                  >
                    <div className="review-action-radio">
                      <span
                        className={`custom-radio-dot ${approvalDecision === "reject" ? "checked" : ""}`}
                      />
                    </div>
                    <div className="review-action-badge reject">
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#dc2626"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </div>
                    <div className="review-action-text">
                      <div className="review-action-name reject">
                        Reject Claim
                      </div>
                      <div className="review-action-desc">
                        Decline this claim request
                      </div>
                    </div>
                  </div>
                </div>

                {/* Conditional Field: Modified Approved Amount */}
                {approvalDecision === "partial" && (
                  <div
                    className="review-input-group"
                    style={{ marginBottom: "16px" }}
                  >
                    <label className="review-input-label">
                      Modified Approved Amount (₹){" "}
                      <span className="req">*</span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      max={activeClaim.claim_amount}
                      className="review-text-input"
                      placeholder="0.00"
                      value={approvedAmountInput}
                      onChange={(e) => setApprovedAmountInput(e.target.value)}
                      required
                    />
                    <span
                      style={{
                        fontSize: "11.5px",
                        color: "#64748b",
                        marginTop: "4px",
                      }}
                    >
                      Enter approved amount (Max:{" "}
                      {formatCurrency(activeClaim.claim_amount)})
                    </span>
                  </div>
                )}

                {/* 4. Approval Remarks / Rejection Reason */}
                <div className="review-section-title">
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
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                  </svg>
                  <span>
                    {approvalDecision === "reject"
                      ? "Rejection Reason *"
                      : "Approval Remarks (Optional)"}
                  </span>
                </div>

                {approvalDecision === "reject" ? (
                  <textarea
                    className="review-textarea-input"
                    rows="3"
                    placeholder="Explain why this expense claim is rejected (e.g. invalid bill, personal expense)..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    required
                  />
                ) : (
                  <input
                    type="text"
                    className="review-text-input"
                    placeholder="e.g. Verified with travel policy."
                    value={approvalNotes}
                    onChange={(e) => setApprovalNotes(e.target.value)}
                  />
                )}
              </div>

              {/* Modal Footer */}
              <div className="review-modal-footer">
                <button
                  type="button"
                  className="review-cancel-btn"
                  onClick={() => setShowApprovalModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`review-confirm-btn ${approvalDecision === "reject" ? "reject-mode" : ""}`}
                  disabled={reviewSubmitting}
                >
                  {reviewSubmitting ? (
                    "Processing..."
                  ) : approvalDecision === "reject" ? (
                    <>
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                      <span>Confirm Rejection</span>
                    </>
                  ) : (
                    <>
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>Confirm Approval</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ========================================================================= */}
      {/* 4. SETTLEMENT / PAYOUT MODAL */}
      {/* ========================================================================= */}
      {showSettleModal && activeClaim && (
        <div
          className="expense-modal-backdrop"
          onClick={(e) =>
            e.target === e.currentTarget && setShowSettleModal(false)
          }
        >
          <div
            className="settle-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="settle-modal-header">
              <div className="settle-modal-header-left">
                <div className="settle-modal-icon-box">
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#16a34a"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
                    <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
                    <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
                  </svg>
                </div>
                <div>
                  <h3 className="settle-modal-title">
                    Record Reimbursement Payout
                  </h3>
                  <p className="settle-modal-subtitle">
                    Process and confirm the reimbursement disbursement.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="settle-modal-close-btn"
                onClick={() => setShowSettleModal(false)}
                title="Close"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={
                settleMethodType === "instant"
                  ? handleInstantPayoutSubmit
                  : handleSettleSubmit
              }
            >
              <div className="settle-modal-body">
                {/* 1. Disbursement Info Banner */}
                <div className="settle-info-banner">
                  {/* Left: Amount to Disburse */}
                  <div className="settle-banner-amount-block">
                    <div className="settle-banner-wallet-icon">
                      <svg
                        width="22"
                        height="22"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#16a34a"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
                        <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
                        <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
                      </svg>
                    </div>
                    <div>
                      <span className="settle-banner-amount-label">
                        Amount to Disburse
                      </span>
                      <span className="settle-banner-amount-val">
                        {formatCurrency(
                          activeClaim.approved_amount ||
                            activeClaim.claim_amount,
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Middle: Payee */}
                  <div className="settle-banner-item">
                    <div className="settle-banner-item-icon">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#16a34a"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    </div>
                    <div>
                      <span className="settle-banner-item-label">Payee</span>
                      <span className="settle-banner-item-val">
                        {activeClaim.employee_name}
                      </span>
                    </div>
                  </div>

                  {/* Right: Claim ID */}
                  <div className="settle-banner-item">
                    <div className="settle-banner-item-icon">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#16a34a"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                      </svg>
                    </div>
                    <div>
                      <span className="settle-banner-item-label">Claim ID</span>
                      <span className="settle-banner-item-val">
                        {activeClaim.claim_code}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Settlement Method Switcher (Automated vs Manual) */}
                <div className="settle-tab-switcher">
                  <button
                    type="button"
                    className={`settle-tab-btn ${settleMethodType === "instant" ? "active" : ""}`}
                    onClick={() => setSettleMethodType("instant")}
                  >
                    <span>⚡ Instant Payout (RazorpayX)</span>
                    <span className="settle-badge-recommended">AUTOMATED</span>
                  </button>
                  <button
                    type="button"
                    className={`settle-tab-btn ${settleMethodType === "manual" ? "active" : ""}`}
                    onClick={() => setSettleMethodType("manual")}
                  >
                    <span>📝 Manual Disbursement Record</span>
                  </button>
                </div>

                {/* TAB 1: INSTANT AUTOMATED PAYOUT VIA RAZORPAYX */}
                {settleMethodType === "instant" && (
                  <div>
                    {loadingEmpBank ? (
                      <div style={{ padding: "28px", textAlign: "center", color: "#64748b" }}>
                        Loading verified beneficiary account details...
                      </div>
                    ) : activeEmpBank && (activeEmpBank.account_number || activeEmpBank.upi_id) ? (
                      <>
                        {/* Beneficiary Card */}
                        <div className="payout-beneficiary-card">
                          <div className="payout-beneficiary-header">
                            <span className="payout-beneficiary-title">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 21h18M3 10h18M5 10v11M9 10v11M15 10v11M19 10v11M12 2 2 7h20L12 2z" />
                              </svg>
                              Beneficiary Account Details
                            </span>
                            <span className="payout-verified-tag">✓ Verified Beneficiary</span>
                          </div>

                          <div className="payout-beneficiary-grid">
                            <div className="payout-beneficiary-item">
                              <span className="payout-item-lbl">Account Holder</span>
                              <span className="payout-item-val">
                                {activeEmpBank.account_holder_name || activeClaim.employee_name}
                              </span>
                            </div>

                            <div className="payout-beneficiary-item">
                              <span className="payout-item-lbl">Bank Name</span>
                              <span className="payout-item-val">
                                {activeEmpBank.bank_name || "Bank Account"}
                              </span>
                            </div>

                            <div className="payout-beneficiary-item">
                              <span className="payout-item-lbl">Account Number</span>
                              <span className="payout-item-val">
                                {activeEmpBank.account_number_masked ||
                                  (activeEmpBank.account_number
                                    ? `•••• ${activeEmpBank.account_number.slice(-4)}`
                                    : "Not added")}
                              </span>
                            </div>

                            <div className="payout-beneficiary-item">
                              <span className="payout-item-lbl">IFSC Code</span>
                              <span className="payout-item-val">
                                {activeEmpBank.ifsc_code || "N/A"}
                              </span>
                            </div>

                            {activeEmpBank.upi_id && (
                              <div className="payout-beneficiary-item" style={{ gridColumn: "span 2" }}>
                                <span className="payout-item-lbl">UPI ID (VPA)</span>
                                <span className="payout-item-val">
                                  {activeEmpBank.upi_id}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Payout Transfer Mode Selector */}
                        <label className="settle-field-label" style={{ marginBottom: "8px" }}>
                          Select Transfer Mode
                        </label>
                        <div className="payout-mode-options">
                          <div
                            className={`payout-mode-card ${instantPayoutMode === "IMPS" ? "active" : ""}`}
                            onClick={() => setInstantPayoutMode("IMPS")}
                          >
                            <span className="payout-mode-title">IMPS</span>
                            <span className="payout-mode-desc">Instant 24x7 Bank Transfer</span>
                          </div>

                          <div
                            className={`payout-mode-card ${instantPayoutMode === "NEFT" ? "active" : ""}`}
                            onClick={() => setInstantPayoutMode("NEFT")}
                          >
                            <span className="payout-mode-title">NEFT</span>
                            <span className="payout-mode-desc">National Electronic Fund</span>
                          </div>

                          <div
                            className={`payout-mode-card ${!activeEmpBank.upi_id ? "disabled" : ""} ${instantPayoutMode === "UPI" ? "active" : ""}`}
                            style={{ opacity: !activeEmpBank.upi_id ? 0.5 : 1, cursor: !activeEmpBank.upi_id ? "not-allowed" : "pointer" }}
                            onClick={() => {
                              if (activeEmpBank.upi_id) setInstantPayoutMode("UPI");
                            }}
                          >
                            <span className="payout-mode-title">UPI</span>
                            <span className="payout-mode-desc">
                              {activeEmpBank.upi_id ? "Instant to VPA" : "No UPI on file"}
                            </span>
                          </div>
                        </div>

                        {/* Environment & Provider Banner */}
                        <div className="payout-env-banner">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="16" x2="12" y2="12" />
                            <line x1="12" y1="8" x2="12.01" y2="8" />
                          </svg>
                          <span>
                            <strong>RazorpayX Sandbox Mode:</strong> Safe test environment. Transfer will simulate live bank routing and return genuine reference/UTR codes.
                          </span>
                        </div>

                        {/* Payment Remarks */}
                        <div className="settle-section-title" style={{ marginTop: "12px" }}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                          </svg>
                          <span>Transfer Narration / Remarks</span>
                        </div>
                        <textarea
                          className="settle-textarea-input"
                          rows="2"
                          placeholder="e.g. Travel and client dinner expense reimbursement"
                          value={settleForm.notes}
                          onChange={(e) =>
                            setSettleForm({ ...settleForm, notes: e.target.value })
                          }
                        />
                      </>
                    ) : (
                      /* No Bank Details Found for Employee */
                      <div className="payout-warning-box">
                        <div className="payout-warning-title">
                          Employee Bank Details Not Configured
                        </div>
                        <div className="payout-warning-desc">
                          {activeClaim.employee_name} has not added their Bank Account or UPI details yet. For privacy and compliance, bank details must be configured by the employee directly. Please disburse this claim using Manual Disbursement Record.
                        </div>

                        <div style={{ display: "flex", gap: "10px", justifyContent: "center", marginTop: "12px" }}>
                          <button
                            type="button"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "7px",
                              padding: "8px 18px",
                              background: "#ea580c",
                              color: "#ffffff",
                              border: "none",
                              borderRadius: "7px",
                              fontSize: "12.5px",
                              fontWeight: 600,
                              cursor: "pointer",
                              boxShadow: "0 2px 6px rgba(234, 88, 12, 0.25)",
                              transition: "all 0.15s ease",
                            }}
                            onClick={() => setSettleMethodType("manual")}
                            title="Switch to Manual Disbursement Record tab"
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
                              <polyline points="10 9 9 9 8 9" />
                            </svg>
                            <span>Switch to Manual Record</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 2: MANUAL DISBURSEMENT RECORD */}
                {settleMethodType === "manual" && (
                  <div>
                    {/* 2. Disbursement Details Section Header */}
                    <div className="settle-section-title">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#16a34a"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polygon points="12 2 2 7 12 12 22 7 12 2" />
                        <polyline points="2 17 12 22 22 17" />
                        <polyline points="2 12 12 17 22 12" />
                      </svg>
                      <span>Disbursement Details</span>
                    </div>

                    {/* 3. Disbursement Form Grid */}
                    <div className="settle-form-grid">
                      {/* Disbursement Mode */}
                      <div className="settle-field-group">
                        <label className="settle-field-label">
                          Disbursement Mode
                        </label>
                        <div className="settle-mode-select-wrapper">
                          <span className="settle-mode-bank-icon">
                            <svg
                              width="15"
                              height="15"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="#475569"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M3 21h18M3 10h18M5 10v11M9 10v11M15 10v11M19 10v11M12 2 2 7h20L12 2z" />
                            </svg>
                          </span>
                          <select
                            className="settle-mode-select"
                            value={settleForm.settlement_mode}
                            onChange={(e) => {
                              const val = e.target.value;
                              setSettleForm({
                                ...settleForm,
                                settlement_mode: val,
                                transaction_ref: generateTransactionRef(val),
                              });
                            }}
                          >
                            {SETTLEMENT_MODES.map((sm) => (
                              <option key={sm} value={sm}>
                                {sm}
                              </option>
                            ))}
                          </select>
                          <span className="settle-select-arrow">⌄</span>
                        </div>
                      </div>

                      {/* Transaction / UTR Reference # */}
                      <div className="settle-field-group">
                        <label className="settle-field-label">
                          Transaction / UTR Reference #{" "}
                          <span className="req">*</span>
                        </label>
                        <div className="settle-ref-input-row">
                          <div className="settle-ref-input-box">
                            <span className="settle-barcode-icon">
                              <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="#64748b"
                                strokeWidth="2"
                                strokeLinecap="round"
                              >
                                <line x1="3" y1="5" x2="3" y2="19" />
                                <line x1="7" y1="5" x2="7" y2="19" />
                                <line x1="11" y1="5" x2="11" y2="19" />
                                <line x1="15" y1="5" x2="15" y2="19" />
                                <line x1="18" y1="5" x2="18" y2="19" />
                                <line x1="21" y1="5" x2="21" y2="19" />
                              </svg>
                            </span>
                            <input
                              type="text"
                              className="settle-ref-input"
                              placeholder="e.g. UTR102948294829 or UPI-9284920"
                              value={settleForm.transaction_ref}
                              onChange={(e) =>
                                setSettleForm({
                                  ...settleForm,
                                  transaction_ref: e.target.value,
                               Components: e.target.value,
                                })
                              }
                              required={settleMethodType === "manual"}
                            />
                          </div>
                          <button
                            type="button"
                            className="settle-btn-auto-generate"
                            onClick={() =>
                              setSettleForm((prev) => ({
                                ...prev,
                                transaction_ref: generateTransactionRef(
                                  prev.settlement_mode,
                                ),
                              }))
                            }
                            title="Generate new ID format for this mode"
                          >
                            <svg
                              width="13"
                              height="13"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="#15803d"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polyline points="23 4 23 10 17 10" />
                              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                            </svg>
                            <span>
                              Auto
                              <br />
                              Generate
                            </span>
                          </button>
                        </div>
                        <div className="settle-ref-hint">
                          <span className="settle-bolt-icon">⚡</span>
                          <span>
                            Auto-generated based on{" "}
                            <strong>{settleForm.settlement_mode}</strong>. You can
                            keep it, click Auto Generate, or edit manually.
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 4. Payment Remarks Section */}
                    <div
                      className="settle-section-title"
                      style={{ marginTop: "16px" }}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#16a34a"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                      <span>Payment Remarks</span>
                    </div>

                    <textarea
                      className="settle-textarea-input"
                      rows="2"
                      placeholder="e.g. Processed via HDFC Corporate Banking"
                      value={settleForm.notes}
                      onChange={(e) =>
                        setSettleForm({ ...settleForm, notes: e.target.value })
                      }
                    />
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="settle-modal-footer">
                <button
                  type="button"
                  className="settle-cancel-btn"
                  onClick={() => setShowSettleModal(false)}
                >
                  Cancel
                </button>

                {settleMethodType === "instant" ? (
                  <button
                    type="submit"
                    className="payout-instant-submit-btn"
                    disabled={
                      settleSubmitting ||
                      !activeEmpBank ||
                      (!activeEmpBank.account_number && !activeEmpBank.upi_id)
                    }
                  >
                    {settleSubmitting ? (
                      "Transferring..."
                    ) : (
                      <>
                        <span>⚡</span>
                        <span>
                          Transfer{" "}
                          {formatCurrency(
                            activeClaim.approved_amount || activeClaim.claim_amount,
                          )}{" "}
                          via RazorpayX
                        </span>
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="settle-confirm-btn"
                    disabled={settleSubmitting}
                  >
                    {settleSubmitting ? (
                      "Recording..."
                    ) : (
                      <>
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        <span>Confirm &amp; Mark Reimbursed</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ========================================================================= */}
      {/* 5. POLICY & SPENDING LIMITS MODAL (Admin) */}
      {/* ========================================================================= */}
      {showPolicyModal && (
        <div
          className="expense-modal-backdrop"
          onClick={(e) =>
            e.target === e.currentTarget && setShowPolicyModal(false)
          }
        >
          <div
            className="expense-modal-card large"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="expense-modal-header">
              <h3 className="expense-modal-title">
                <span>⚙️</span>
                <span>Expense Policy &amp; Category Limits</span>
              </h3>
              <button
                type="button"
                className="expense-modal-close"
                onClick={() => setShowPolicyModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="expense-modal-body">
              <div
                style={{
                  background: "#fff7ed",
                  border: "1px solid #fed7aa",
                  padding: "14px 18px",
                  borderRadius: "10px",
                  marginBottom: "16px",
                }}
              >
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: 700,
                    color: "#9a3412",
                  }}
                >
                  Corporate Expense &amp; Spending Policy
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    color: "#c2410c",
                    marginTop: "4px",
                  }}
                >
                  All company reimbursement claims operate under standardized
                  spending limits without requiring rigid category
                  classification.
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: "12px",
                  marginBottom: "18px",
                }}
              >
                <div
                  style={{
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    padding: "12px 14px",
                    borderRadius: "8px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      color: "#64748b",
                      textTransform: "uppercase",
                    }}
                  >
                    Single Claim Cap
                  </div>
                  <div
                    style={{
                      fontSize: "18px",
                      fontWeight: 800,
                      color: "#0f172a",
                      marginTop: "4px",
                    }}
                  >
                    ₹15,000.00
                  </div>
                  <div
                    style={{
                      fontSize: "11px",
                      color: "#94a3b8",
                      marginTop: "2px",
                    }}
                  >
                    Max allowed per expense submission
                  </div>
                </div>

                <div
                  style={{
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    padding: "12px 14px",
                    borderRadius: "8px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      color: "#64748b",
                      textTransform: "uppercase",
                    }}
                  >
                    Monthly Allowance
                  </div>
                  <div
                    style={{
                      fontSize: "18px",
                      fontWeight: 800,
                      color: "#0f172a",
                      marginTop: "4px",
                    }}
                  >
                    ₹40,000.00
                  </div>
                  <div
                    style={{
                      fontSize: "11px",
                      color: "#94a3b8",
                      marginTop: "2px",
                    }}
                  >
                    Cumulative monthly cap per employee
                  </div>
                </div>

                <div
                  style={{
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    padding: "12px 14px",
                    borderRadius: "8px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      color: "#64748b",
                      textTransform: "uppercase",
                    }}
                  >
                    Bill Verification
                  </div>
                  <div
                    style={{
                      fontSize: "18px",
                      fontWeight: 800,
                      color: "#0f172a",
                      marginTop: "4px",
                    }}
                  >
                    ≥ ₹500.00
                  </div>
                  <div
                    style={{
                      fontSize: "11px",
                      color: "#94a3b8",
                      marginTop: "2px",
                    }}
                  >
                    Mandatory invoice / receipt attachment
                  </div>
                </div>
              </div>

              <div
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#475569",
                  marginBottom: "8px",
                }}
              >
                Expense Guidelines &amp; Audit Rules
              </div>
              <ul
                style={{
                  fontSize: "12px",
                  color: "#64748b",
                  lineHeight: "1.6",
                  margin: 0,
                  paddingLeft: "18px",
                }}
              >
                <li>
                  Employees freely write the official business reason and
                  merchant name when submitting an expense claim.
                </li>
                <li>
                  Single expense claims exceeding ₹10,000.00 are blocked by
                  default to prevent unauthorized high-value spending.
                </li>
                <li>
                  Valid tax invoices, digital bills, or receipts must be
                  attached for all claims of ₹500 or higher.
                </li>
                <li>
                  All claims remain in Pending status until reviewed and
                  approved by an authorized General Admin.
                </li>
              </ul>
            </div>

            <div className="expense-modal-footer">
              <button
                type="button"
                className="btn-expense-secondary"
                onClick={() => setShowPolicyModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. BENEFICIARY BANK & PAYOUT DETAILS MODAL */}
      {showBankModal && (
        <div
          className="expense-modal-backdrop"
          onClick={(e) =>
            e.target === e.currentTarget && setShowBankModal(false)
          }
        >
          <div
            className="bank-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="settle-modal-header">
              <div className="settle-modal-header-left">
                <div
                  className="settle-modal-icon-box"
                  style={{ background: "#ffedd5" }}
                >
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#ea580c"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 21h18M3 10h18M5 10v11M9 10v11M15 10v11M19 10v11M12 2 2 7h20L12 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="settle-modal-title">
                    My Payout &amp; Bank Account
                  </h3>
                  <p className="settle-modal-subtitle">
                    Configure where your approved expense claims are paid via automatic bank transfer or UPI.
                  </p>
                </div>
              </div>
            </div>

            {/* Form & View/Edit Switcher */}
            {bankLoading ? (
              <div
                style={{
                  padding: "40px",
                  textAlign: "center",
                  color: "#64748b",
                }}
              >
                Loading your saved payout details...
              </div>
            ) : !isEditingBankDetails && savedBankData ? (
              /* VIEW MODE: When details already exist */
              <div className="bank-modal-content-wrap">
                <div className="settle-modal-body">
                  {/* Top Promo Banner */}
                  <div className="bank-promo-banner">
                    <div className="bank-promo-icon-box">
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#ea580c"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect x="2" y="5" width="20" height="14" rx="2" />
                        <line x1="2" y1="10" x2="22" y2="10" />
                      </svg>
                    </div>
                    <div className="bank-promo-content">
                      <span className="bank-promo-title">
                        Get Your Reimbursements Faster
                      </span>
                      <span className="bank-promo-desc">
                        Link your bank or UPI for fast, automated expense claim reimbursements powered by RazorpayX.
                      </span>
                    </div>
                  </div>

                  <div
                    className="payout-beneficiary-card"
                    style={{
                      background: "#ffffff",
                      border: "1.5px solid #fed7aa",
                    }}
                  >
                    <div className="payout-beneficiary-header">
                      <span
                        className="payout-beneficiary-title"
                        style={{ color: "#c2410c" }}
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#ea580c"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M3 21h18M3 10h18M5 10v11M9 10v11M15 10v11M19 10v11M12 2 2 7h20L12 2z" />
                        </svg>
                        Saved Payout Destination
                      </span>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <span className="payout-verified-tag">
                          ✓ Active &amp; Verified
                        </span>
                        <button
                          type="button"
                          className="bank-save-btn"
                          style={{
                            height: "30px",
                            padding: "0 12px",
                            fontSize: "12px",
                          }}
                          onClick={() => setIsEditingBankDetails(true)}
                          title="Edit your bank or UPI details"
                        >
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                          <span>Edit Details</span>
                        </button>
                      </div>
                    </div>

                    <div className="payout-beneficiary-grid">
                      <div className="payout-beneficiary-item">
                        <span className="payout-item-lbl">Payout Method</span>
                        <span
                          className="payout-item-val"
                          style={{ color: "#ea580c" }}
                        >
                          {savedBankData.preferred_mode === "upi"
                            ? "UPI ID (Instant VPA)"
                            : "Bank Account (IMPS / NEFT)"}
                        </span>
                      </div>

                      <div className="payout-beneficiary-item">
                        <span className="payout-item-lbl">Account Holder</span>
                        <span className="payout-item-val">
                          {savedBankData.account_holder_name ||
                            user?.name ||
                            "—"}
                        </span>
                      </div>

                      {savedBankData.preferred_mode !== "upi" && (
                        <>
                          <div className="payout-beneficiary-item">
                            <span className="payout-item-lbl">Bank Name</span>
                            <span className="payout-item-val">
                              {savedBankData.bank_name || "—"}
                            </span>
                          </div>

                          <div className="payout-beneficiary-item">
                            <span className="payout-item-lbl">
                              Account Number
                            </span>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                              }}
                            >
                              <span className="payout-item-val">
                                {savedBankData.account_number
                                  ? showFullAccount
                                    ? savedBankData.account_number
                                    : `•••• •••• ${savedBankData.account_number.slice(-4)}`
                                  : "—"}
                              </span>
                              {savedBankData.account_number && (
                                <button
                                  type="button"
                                  style={{
                                    border: "none",
                                    background: "transparent",
                                    color: "#ea580c",
                                    fontSize: "11px",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                    padding: "0 4px",
                                  }}
                                  onClick={() =>
                                    setShowFullAccount(!showFullAccount)
                                  }
                                >
                                  {showFullAccount ? "Hide" : "Show"}
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="payout-beneficiary-item">
                            <span className="payout-item-lbl">IFSC Code</span>
                            <span className="payout-item-val">
                              {savedBankData.ifsc_code || "—"}
                            </span>
                          </div>
                        </>
                      )}

                      {savedBankData.upi_id && (
                        <div
                          className="payout-beneficiary-item"
                          style={{
                            gridColumn:
                              savedBankData.preferred_mode === "upi"
                                ? "span 2"
                                : "auto",
                          }}
                        >
                          <span className="payout-item-lbl">UPI ID</span>
                          <span
                            className="payout-item-val"
                            style={{ color: "#16a34a" }}
                          >
                            {savedBankData.upi_id}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bank-security-notice">
                    <div className="bank-security-icon-box">
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
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    </div>
                    <p className="bank-security-text">
                      Your banking information is kept confidential and is solely utilized by Finance Admins for approved reimbursement disbursements.
                    </p>
                  </div>
                </div>

                <div className="settle-modal-footer">
                  <button
                    type="button"
                    className="settle-cancel-btn"
                    onClick={() => setShowBankModal(false)}
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    className="bank-save-btn"
                    onClick={() => setIsEditingBankDetails(true)}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                    <span>Edit Payout Details</span>
                  </button>
                </div>
              </div>
            ) : (
              /* EDIT MODE: Exact 1:1 Pixel-Perfect Target UI */
              <form
                className="bank-modal-content-wrap"
                onSubmit={handleSaveMyBankModal}
              >
                <div className="settle-modal-body">
                  {/* Top Promo Banner */}
                  <div className="bank-promo-banner">
                    <div className="bank-promo-icon-box">
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#ea580c"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect x="2" y="5" width="20" height="14" rx="2" />
                        <line x1="2" y1="10" x2="22" y2="10" />
                      </svg>
                    </div>
                    <div className="bank-promo-content">
                      <span className="bank-promo-title">
                        Get Your Reimbursements Faster
                      </span>
                      <span className="bank-promo-desc">
                        Link your bank or UPI for fast, automated expense claim reimbursements powered by RazorpayX.
                      </span>
                    </div>
                  </div>

                  {/* Section 1: Preferred Reimbursement Method */}
                  <div className="bank-section-heading">
                    <span className="bank-section-heading-icon">
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
                        <rect x="2" y="5" width="20" height="14" rx="2" />
                        <line x1="2" y1="10" x2="22" y2="10" />
                      </svg>
                    </span>
                    <span>Preferred Reimbursement Method</span>
                  </div>

                  <div className="bank-method-cards-grid">
                    {/* Bank Card */}
                    <div
                      className={`bank-method-card ${myBankForm.preferred_mode === "bank_account" ? "active" : ""}`}
                      onClick={() =>
                        setMyBankForm({
                          ...myBankForm,
                          preferred_mode: "bank_account",
                        })
                      }
                    >
                      <div className="bank-method-left">
                        <div className="bank-method-icon-box bank-icon">
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M3 21h18M3 10h18M5 10v11M9 10v11M15 10v11M19 10v11M12 2 2 7h20L12 2z" />
                          </svg>
                        </div>
                        <div className="bank-method-text">
                          <span className="bank-method-title">
                            Bank Account (IMPS / NEFT)
                          </span>
                          <span className="bank-method-desc">
                            Direct transfer to your bank account
                          </span>
                        </div>
                      </div>
                      <div className="bank-method-radio">
                        {myBankForm.preferred_mode === "bank_account" && "✓"}
                      </div>
                    </div>

                    {/* UPI Card */}
                    <div
                      className={`bank-method-card ${myBankForm.preferred_mode === "upi" ? "active" : ""}`}
                      onClick={() =>
                        setMyBankForm({
                          ...myBankForm,
                          preferred_mode: "upi",
                        })
                      }
                    >
                      <div className="bank-method-left">
                        <div className="bank-method-icon-box upi-icon">
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                          </svg>
                        </div>
                        <div className="bank-method-text">
                          <span className="bank-method-title">
                            UPI ID (Instant VPA)
                          </span>
                          <span className="bank-method-desc">
                            Fast disbursement via UPI / apps (GPay, PhonePe)
                          </span>
                        </div>
                      </div>
                      <div className="bank-method-radio">
                        {myBankForm.preferred_mode === "upi" && "✓"}
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Bank Account Details */}
                  <div className="bank-section-heading">
                    <span className="bank-section-heading-icon">
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
                        <path d="M3 21h18M3 10h18M5 10v11M9 10v11M15 10v11M19 10v11M12 2 2 7h20L12 2z" />
                      </svg>
                    </span>
                    <span>
                      {myBankForm.preferred_mode === "upi"
                        ? "UPI Details"
                        : "Bank Account Details"}
                    </span>
                  </div>

                  {/* Beneficiary Name with User Icon */}
                  <div
                    className="settle-field-group"
                    style={{ marginBottom: "8px" }}
                  >
                    <label className="settle-field-label">
                      Beneficiary / Account Holder Full Name{" "}
                      <span className="req">*</span>
                    </label>
                    <div className="bank-field-with-icon">
                      <span className="bank-field-icon">
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
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                      </span>
                      <input
                        type="text"
                        className="bank-input-styled"
                        placeholder="Nency"
                        value={myBankForm.account_holder_name}
                        onChange={(e) =>
                          setMyBankForm({
                            ...myBankForm,
                            account_holder_name: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                  </div>

                  {/* 2-Column: Bank Name & IFSC Code */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "9px",
                      marginBottom: "8px",
                    }}
                  >
                    <div className="settle-field-group">
                      <label className="settle-field-label">Bank Name</label>
                      <div className="bank-field-with-icon">
                        <span className="bank-field-icon">
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
                            <path d="M3 21h18M3 10h18M5 10v11M9 10v11M15 10v11M19 10v11M12 2 2 7h20L12 2z" />
                          </svg>
                        </span>
                        <input
                          type="text"
                          className="bank-input-styled"
                          placeholder="e.g. HDFC Bank, ICICI Bank, SBI"
                          value={myBankForm.bank_name}
                          onChange={(e) =>
                            setMyBankForm({
                              ...myBankForm,
                              bank_name: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>

                    <div className="settle-field-group">
                      <label className="settle-field-label">
                        IFSC Code{" "}
                        {myBankForm.preferred_mode === "bank_account" && (
                          <span className="req">*</span>
                        )}
                      </label>
                      <div className="bank-field-with-icon">
                        <span className="bank-field-icon">
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
                            <rect
                              x="3"
                              y="11"
                              width="18"
                              height="11"
                              rx="2"
                              ry="2"
                            />
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                          </svg>
                        </span>
                        <input
                          type="text"
                          className="bank-input-styled"
                          placeholder="e.g. HDFC0000128"
                          value={myBankForm.ifsc_code}
                          onChange={(e) =>
                            setMyBankForm({
                              ...myBankForm,
                              ifsc_code: e.target.value.toUpperCase().trim(),
                            })
                          }
                          maxLength={11}
                          required={
                            myBankForm.preferred_mode === "bank_account"
                          }
                        />
                      </div>
                    </div>
                  </div>

                  {/* 2-Column: Account Number & Confirm Account Number */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "9px",
                      marginBottom: "8px",
                    }}
                  >
                    <div className="settle-field-group">
                      <label className="settle-field-label">
                        Account Number{" "}
                        {myBankForm.preferred_mode === "bank_account" && (
                          <span className="req">*</span>
                        )}
                      </label>
                      <div className="bank-field-with-icon">
                        <span className="bank-field-icon">
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
                            <rect
                              x="1"
                              y="4"
                              width="22"
                              height="16"
                              rx="2"
                              ry="2"
                            />
                            <line x1="1" y1="10" x2="23" y2="10" />
                          </svg>
                        </span>
                        <input
                          type="text"
                          className="bank-input-styled"
                          placeholder="Enter bank account number"
                          value={myBankForm.account_number}
                          onChange={(e) =>
                            setMyBankForm({
                              ...myBankForm,
                              account_number: e.target.value.trim(),
                            })
                          }
                          required={
                            myBankForm.preferred_mode === "bank_account"
                          }
                        />
                      </div>
                    </div>

                    <div className="settle-field-group">
                      <label className="settle-field-label">
                        Confirm Account Number{" "}
                        {myBankForm.preferred_mode === "bank_account" && (
                          <span className="req">*</span>
                        )}
                      </label>
                      <div className="bank-field-with-icon">
                        <span className="bank-field-icon">
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
                            <rect
                              x="1"
                              y="4"
                              width="22"
                              height="16"
                              rx="2"
                              ry="2"
                            />
                            <line x1="1" y1="10" x2="23" y2="10" />
                          </svg>
                        </span>
                        <input
                          type="text"
                          className="bank-input-styled"
                          placeholder="Re-enter bank account number"
                          value={myBankForm.confirm_account_number}
                          onChange={(e) =>
                            setMyBankForm({
                              ...myBankForm,
                              confirm_account_number: e.target.value.trim(),
                            })
                          }
                          required={
                            myBankForm.preferred_mode === "bank_account"
                          }
                        />
                      </div>
                    </div>
                  </div>

                  {/* Full Width: UPI ID */}
                  <div
                    className="settle-field-group"
                    style={{ marginBottom: "6px" }}
                  >
                    <label className="settle-field-label">
                      UPI ID{" "}
                      {myBankForm.preferred_mode === "upi" ? (
                        <span className="req">*</span>
                      ) : (
                        "(Optional Backup)"
                      )}
                    </label>
                    <div className="bank-field-with-icon">
                      <span className="bank-field-icon">
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
                          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                        </svg>
                      </span>
                      <input
                        type="text"
                        className="bank-input-styled"
                        placeholder="e.g. yourname@okhdfcbank"
                        value={myBankForm.upi_id}
                        onChange={(e) =>
                          setMyBankForm({
                            ...myBankForm,
                            upi_id: e.target.value.trim(),
                          })
                        }
                        required={myBankForm.preferred_mode === "upi"}
                      />
                    </div>
                  </div>

                  {/* Security / Confidentiality Notice */}
                  <div className="bank-security-notice">
                    <div className="bank-security-icon-box">
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
                        <rect
                          x="3"
                          y="11"
                          width="18"
                          height="11"
                          rx="2"
                          ry="2"
                        />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    </div>
                    <p className="bank-security-text">
                      Your banking information is kept confidential and is solely utilized by Finance Admins for approved reimbursement disbursements.
                    </p>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="settle-modal-footer">
                  <button
                    type="button"
                    className="settle-cancel-btn"
                    onClick={() => {
                      if (savedBankData && isEditingBankDetails) {
                        setIsEditingBankDetails(false);
                      } else {
                        setShowBankModal(false);
                      }
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bank-save-btn"
                    disabled={bankSaving || bankLoading}
                  >
                    {bankSaving ? (
                      "Saving..."
                    ) : (
                      <>
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                        <span>
                          {savedBankData
                            ? "Update Payout Details"
                            : "Save Payout Details"}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
      {/* 6. CANCEL CLAIM CONFIRMATION POPUP */}
      {claimToDelete && (
        <ConfirmDialog
          title="Cancel Expense Claim"
          message={`Are you sure you want to cancel and delete claim ${claimToDelete.claim_code}? This action cannot be undone.`}
          confirmText={deleteLoading ? "Cancelling..." : "Yes, Cancel Claim"}
          cancelText="No, Keep It"
          onConfirm={handleConfirmDeleteClaim}
          onCancel={() => !deleteLoading && setClaimToDelete(null)}
        />
      )}
      {/* 7. CUSTOM ALERT / VALIDATION POPUP */}
      {alertModal.visible && (
        <div
          className="expense-modal-backdrop"
          style={{ zIndex: 1000000 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setAlertModal({ visible: false, title: "", message: "" });
            }
          }}
        >
          <div
            className="expense-alert-popup-card"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="expense-alert-close-btn"
              onClick={() =>
                setAlertModal({ visible: false, title: "", message: "" })
              }
              title="Close"
            >
              ✕
            </button>
            <div className="expense-alert-icon-box">
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
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h3 className="expense-alert-title">
              {alertModal.title || "Notice"}
            </h3>
            <p className="expense-alert-message">{alertModal.message}</p>
            <div className="expense-alert-actions">
              <button
                type="button"
                autoFocus
                className="expense-alert-btn"
                onClick={() =>
                  setAlertModal({ visible: false, title: "", message: "" })
                }
              >
                OK, Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ExpenseManagement;
