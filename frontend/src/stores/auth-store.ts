import { create } from "zustand";

interface AuthState {
  /** User profile loaded from backend (optional enrichment) */
  userProfile: {
    id: string;
    email?: string;
    full_name?: string;
    business_name?: string;
  } | null;
  setUserProfile: (profile: AuthState["userProfile"]) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  userProfile: null,
  setUserProfile: (userProfile) => set({ userProfile }),
  logout: () => set({ userProfile: null }),
}));
