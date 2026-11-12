import { createContext } from "react";
import type { User } from "../../../models/User";



export interface UserContextType {
    user: User | null; // holds the profile data of the currently authenticated user
    isAuthenticated: boolean; // convenience boolean indicating if a user session is active
    loading: boolean; // true while the session verification request is in flight
    error: string | null; // error message if an unexpected network or server failure occurred
    logoutFn: () => void
}

// Creates the context object with null as the initial default value


export const UserContext = createContext<UserContextType | null>(null);