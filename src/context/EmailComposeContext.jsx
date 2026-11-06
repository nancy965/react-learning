import { createContext, useContext, useState, useEffect } from "react";

const EmailComposeContext = createContext(null);
const COMPOSE_OPEN_STORAGE_KEY = "email_compose_open_state";

export const EmailComposeProvider = ({ children }) => {
  const [isComposeOpen, setIsComposeOpen] = useState(() => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return false;
      const saved = localStorage.getItem(COMPOSE_OPEN_STORAGE_KEY);
      return saved ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });
  const [composeInitialData, setComposeInitialData] = useState(null);
  const [expandTrigger, setExpandTrigger] = useState(0);

  useEffect(() => {
    try {
      localStorage.setItem(COMPOSE_OPEN_STORAGE_KEY, JSON.stringify(isComposeOpen));
    } catch (e) {
      console.warn("Could not save compose open state:", e);
    }
  }, [isComposeOpen]);

  const openCompose = (data = null) => {
    setComposeInitialData(data);
    setIsComposeOpen(true);
    setExpandTrigger((prev) => prev + 1);
  };

  const closeCompose = () => {
    setIsComposeOpen(false);
    setComposeInitialData(null);
    try {
      localStorage.removeItem(COMPOSE_OPEN_STORAGE_KEY);
      localStorage.removeItem("email_compose_draft_state");
    } catch (e) {
      console.warn("Could not clear compose storage:", e);
    }
  };

  useEffect(() => {
    const handleOpenEvent = (e) => {
      openCompose(e.detail || null);
    };
    const handleCloseEvent = () => {
      closeCompose();
    };
    window.addEventListener("open-compose-email", handleOpenEvent);
    window.addEventListener("close-compose-email", handleCloseEvent);
    return () => {
      window.removeEventListener("open-compose-email", handleOpenEvent);
      window.removeEventListener("close-compose-email", handleCloseEvent);
    };
  }, []);

  return (
    <EmailComposeContext.Provider
      value={{
        isComposeOpen,
        composeInitialData,
        expandTrigger,
        openCompose,
        closeCompose,
        setIsComposeOpen,
      }}
    >
      {children}
    </EmailComposeContext.Provider>
  );
};

export const useEmailCompose = () => {
  const context = useContext(EmailComposeContext);
  if (!context) {
    return {
      isComposeOpen: false,
      composeInitialData: null,
      expandTrigger: 0,
      openCompose: (data) => {
        window.dispatchEvent(new CustomEvent("open-compose-email", { detail: data }));
      },
      closeCompose: () => {},
      setIsComposeOpen: () => {},
    };
  }
  return context;
};

export default EmailComposeContext;
