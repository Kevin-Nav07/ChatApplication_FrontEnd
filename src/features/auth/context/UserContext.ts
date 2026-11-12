import { createContext } from "react";
import type { User } from "../../../models/User";

// The data and actions UserContext gives to every component inside UserContextProvider
export interface UserContextType {
    user: User | null; // holds the profile data of the currently authenticated user
    isAuthenticated: boolean; // convenience boolean indicating if a user session is active
    loading: boolean; // true while the session check on page load is in flight
    error: string | null; // message for an unexpected failure, such as the server being unreachable or logout failing
    logoutFn: () => Promise<void>; // logs out on the server, then leaves the dashboard; on failure it sets error and stays
    clearError: () => void; // hides the current error message
}

// Creates the context object with null as the initial default value, so useUserContext can detect a missing provider
export const UserContext = createContext<UserContextType | null>(null);
