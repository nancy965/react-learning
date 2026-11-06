import { usePermission } from "../context/PermissionContext";
import PermissionGuard from "../components/PermissionGuard";

function PermissionRoute({ permission, children }) {
  if (!permission) {
    return children;
  }

  return (
    <PermissionGuard permission={permission}>
      {children}
    </PermissionGuard>
  );
}

export default PermissionRoute;