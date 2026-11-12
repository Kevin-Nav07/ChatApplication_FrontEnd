import React, { useEffect, useState } from "react";
import type { User } from "../../../models/User";
import { getUserMe, logout } from "../../../services/authService";
import { AppError, getErrorMessage } from "../../../models/AppError";
import { useNavigate } from "react-router-dom";
import { UserContext } from "./UserContext";

// Props accepted by the UserContextProvider component
interface UserContextProviderProps {
    children: React.ReactNode; // child elements that will have access to the user context
}

// Provider component that checks the session on mount and shares the logged in user with its children
export function UserContextProvider({ children }: UserContextProviderProps): React.JSX.Element {
    const [user, setUser] = useState<User | null>(null); // stores authenticated user record in state
    const [loading, setLoading] = useState<boolean>(true); // starts as true so consumers know the check is in progress
    const [error, setError] = useState<string | null>(null); // stores unexpected network or server errors
    const isAuthenticated = !!user; // derived boolean that is true when a user object exists

    const navigate = useNavigate();

    // Runs on mount to find out who is logged in. The axios interceptor refreshes an expired access token on the way
    useEffect(() => {
        let isMounted = true; // set to false by cleanup so a late answer is ignored

        getUserMe()
            .then((response) => {
                if (isMounted) setUser(response.data as User);
            })
            .catch((reason: unknown) => {
                if (!isMounted) return;
                setUser(null);
                // 401 means not logged in, and 404 means the account behind a still valid token was deleted.
                // Both simply mean "logged out", which the dashboard handles by sending the person to the login page
                const isLoggedOut = reason instanceof AppError && (reason.statusCode === 401 || reason.statusCode === 404);
                setError(isLoggedOut ? null : getErrorMessage(reason));
            })
            .finally(() => {
                if (isMounted) setLoading(false);
            });

        return () => {
            isMounted = false;
        };
    }, []);

    // Logs out on the server first. Only when that worked are the cookies gone, so only then does the app leave the dashboard.
    // If it failed (for example the server is unreachable), the person is still logged in, so they stay and see why
    const logoutFn = async (): Promise<void> => {
        try {
            await logout();
        } catch (reason: unknown) {
            setError(`Could not log out: ${getErrorMessage(reason)}`);
            return;
        }
        setUser(null);
        setError(null);
        navigate("/auth/login");
    };

    // Hides the current error message
    const clearError = () => setError(null);

    return (
        <UserContext.Provider value={{ user, isAuthenticated, loading, error, logoutFn, clearError }}>
            {children}
        </UserContext.Provider>
    );
}
