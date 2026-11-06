import { useState, useEffect } from "react";
import { usePermission } from "../context/PermissionContext";
import { API_URL } from "../config/axios.util";

export function useRealtimePermission(permissionKey) {
  const { hasPermission } = usePermission();
  const [hasRealtimePerm, setHasRealtimePerm] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkPerm = async () => {
      // First check local token
      if (!hasPermission(permissionKey)) {
        setHasRealtimePerm(false);
        setLoading(false);
        return;
      }

      // If local token says true, verify with backend
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(
          `${API_URL}/auth/check-permission/${permissionKey}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        if (!res.ok) {
          setHasRealtimePerm(false);
        } else {
          setHasRealtimePerm(true);
        }
      } catch (err) {
        // Fallback to false if backend check fails
        setHasRealtimePerm(false);
      } finally {
        setLoading(false);
      }
    };

    checkPerm();
  }, [hasPermission, permissionKey]);

  return { hasRealtimePerm, loading };
}
