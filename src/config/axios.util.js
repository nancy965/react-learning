export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export const USER_API_URL = `${API_URL}/users`;
export const ADMIN_API_URL = `${API_URL}/admins`;
export const AUTH_API_URL = `${API_URL}/auth`;
export const TASK_API_URL = `${API_URL}/tasks`;
export const NOTIFICATION_API_URL = `${API_URL}/notifications`;
export const COUNTRY_API_URL = `${API_URL}/countries`;
export const STATE_API_URL = `${API_URL}/states`;
export const CITY_API_URL = `${API_URL}/cities`;
export const PINCODE_API_URL = `${API_URL}/pincodes`;
export const ACTIVITY_LOG_API_URL = `${API_URL}/activity-logs`;
export const ANALYTICS_API_URL = `${API_URL}/analytics`;
export const AD_PLATFORM_API_URL = `${API_URL}/ad-platforms`;
export const AD_CAMPAIGN_API_URL = `${API_URL}/ad-campaigns`;
export const COMMON_MASTER_API_URL = `${API_URL}/common-master`;
export const TICKET_API_URL = `${API_URL}/tickets`;
export const APPROVAL_API_URL = `${API_URL}/approvals`;
export const LIFECYCLE_API_URL = `${API_URL}/lifecycle`;
export const SEARCH_API_URL = `${API_URL}/search`;
export const DATABASE_APPROVAL_API_URL = `${API_URL}/database-approvals`;
export const EMAIL_API_URL = `${API_URL}/emails`;
export const LEAVE_API_URL = `${API_URL}/leaves`;

export default API_URL;
