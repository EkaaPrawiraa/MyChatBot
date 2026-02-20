"use client";

import React from "react";

const STORAGE_KEY = "axis.sidebar.visible";

type SidebarVisibilityContextValue = {
  isSidebarVisible: boolean;
  setSidebarVisible: (visible: boolean) => void;
  toggleSidebar: () => void;
};

const SidebarVisibilityContext =
  React.createContext<SidebarVisibilityContextValue | null>(null);

export function SidebarVisibilityProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarVisible, setIsSidebarVisible] = React.useState(true);

  React.useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === null) return;
      setIsSidebarVisible(stored === "true");
    } catch {
      // ignore
    }
  }, []);

  const setSidebarVisible = React.useCallback((visible: boolean) => {
    setIsSidebarVisible(visible);
    try {
      window.localStorage.setItem(STORAGE_KEY, String(visible));
    } catch {
      // ignore
    }
  }, []);

  const toggleSidebar = React.useCallback(() => {
    setSidebarVisible(!isSidebarVisible);
  }, [isSidebarVisible, setSidebarVisible]);

  const value = React.useMemo(
    () => ({ isSidebarVisible, setSidebarVisible, toggleSidebar }),
    [isSidebarVisible, setSidebarVisible, toggleSidebar],
  );

  return (
    <SidebarVisibilityContext.Provider value={value}>
      {children}
    </SidebarVisibilityContext.Provider>
  );
}

export function useSidebarVisibility() {
  const ctx = React.useContext(SidebarVisibilityContext);
  if (!ctx) {
    throw new Error(
      "useSidebarVisibility must be used within SidebarVisibilityProvider",
    );
  }
  return ctx;
}
