import { useContext } from "react";
import { UserContext } from "../features/auth/context/UserContextProvider.tsx";

export const useUserContext = () => {
    const context = useContext(UserContext);
    if (!context) {
        throw new Error('useUserContext must be used within a UserContextProvider');
    }
    return context;
}