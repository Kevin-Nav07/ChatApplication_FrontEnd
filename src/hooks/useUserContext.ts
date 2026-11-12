import { useContext } from "react";
import { UserContext } from "../features/auth/context/UserContext";

// Returns the logged in user and auth actions, and fails loudly if used outside UserContextProvider
export const useUserContext = () => {
    const context = useContext(UserContext);
    if (!context) {
        throw new Error('useUserContext must be used within a UserContextProvider');
    }
    return context;
}
