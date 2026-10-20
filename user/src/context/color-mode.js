import { createContext, useContext } from "react";

export const ColorModeContext = createContext();

// Custom hook with error handling
export const useThemeSwitch = () => {
  const context = useContext(ColorModeContext);

  if (context === undefined) {
    throw new Error("useThemeSwitch must be used within a ColorModeProvider");
  }

  return context;
};

// Additional utility hooks
export const useTheme = () => {
  const { theme } = useThemeSwitch();
  return theme;
};

export const useIsDark = () => {
  const { isDark } = useThemeSwitch();
  return isDark;
};
