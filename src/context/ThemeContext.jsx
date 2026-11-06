import { createContext, useContext } from "react";

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const theme = "light";

  return (
    <ThemeContext.Provider value={{ theme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}