import { createContext, useContext } from "react";

export interface Identity {
  fingerprint: string;
  displayName: string;
  displayColor: string;
}

export const FingerprintContext = createContext<Identity | null>(null);

export function useIdentity(): Identity {
  const ctx = useContext(FingerprintContext);
  if (!ctx) {
    throw new Error("useIdentity must be used within FingerprintProvider");
  }
  return ctx;
}
