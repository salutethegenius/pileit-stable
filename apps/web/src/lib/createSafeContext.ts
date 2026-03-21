import React from "react";

export default function createSafeContext<TValue extends object | null>() {
  const context = React.createContext<TValue | undefined>(undefined);

  function useContext() {
    const value = React.useContext(context);
    if (value === undefined) {
      throw new Error("useContext must be used within Provider");
    }
    return value;
  }

  return [useContext, context.Provider] as const;
}
