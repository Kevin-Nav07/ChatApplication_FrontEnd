import React, { useEffect, useState } from "react";
import type { User } from "../../../models/User";
import { getUserMe, logout } from "../../../services/authService";
import type { AxiosResponse } from "axios";
import { AppError } from "../../../models/AppError";
import { useNavigate } from "react-router-dom";
import { UserContext } from "./UserContext";

// Defines the data contract exposed by UserContext to all child consumer components



// Props accepted by the UserContextProvider component
interface UserContextProviderProps {
    children: React.ReactNode; // child elements that will have access to the user context
}

// Provider component that checks session credentials on mount and provides user data to children
export function UserContextProvider({ children }: UserContextProviderProps): React.JSX.Element {
    const [user, setUser] = useState<User | null>(null); // stores authenticated user record in state
    const [loading, setLoading] = useState<boolean>(true); // starts as true so consumers know check is in progress
    const [error, setError] = useState<string | null>(null); // stores unexpected network or server errors
    const isAuthenticated = !!user; // derived boolean that is true when a user object exists

    const navigate = useNavigate();
    // Runs on initial mount to check if the browser has an active session cookie
    useEffect(() => {
        let isMounted = true; // tracks whether this component instance is still mounted on screen

        getUserMe()
            .then((response: AxiosResponse) => {
                if (!isMounted) return; // ignores response if component has unmounted
                setUser(response.data as User); // stores authenticated user record in state
            })
            .catch((reason: unknown) => {
                if (!isMounted) return; // ignores error if component has unmounted
                setUser(null); // ensures user state is wiped clean on failure

                // A 401 status indicates the visitor is simply not logged in
                if (reason instanceof AppError && reason.statusCode === 401) {
                    setError(null); // unauthenticated is a normal condition, not a system failure
                } else if (reason instanceof AppError) {
                    setError(reason.message); // captures backend error description
                } else {
                    setError("Unexpected error occurred while verifying session."); // fallback error message
                }
            })
            .finally(() => {
                if (isMounted) {
                    setLoading(false); // turns off spinner once request completes
                }
            });

        // Cleanup function executed when component unmounts or re-renders in StrictMode
        return () => {
            isMounted = false; // flags instance as unmounted to discard pending callbacks
        };
    }, []); // empty array ensures verification runs only once on mount

    const logoutFn = async () => {
        const isMounted = true;
        try {

            setLoading(true);
            await logout();
        }
        catch (error: unknown) {

            if (!isMounted) return; // ignores error if component has unmounted
            setUser(null); // ensures user state is wiped clean on failure

            // A 401 status indicates the visitor is simply not logged in
            if (error instanceof AppError && error.statusCode === 401) {
                setError(null); // unauthenticated is a normal condition, not a system failure
            } else if (error instanceof AppError) {
                setError(error.message); // captures backend error description
            } else {
                setError("Unexpected error occurred while verifying session."); // fallback error message
            }



        }
        finally {
            setUser(null);
            setLoading(false);
            navigate("/auth/login");
        }


    }

    return (
        <UserContext.Provider value={{ user, isAuthenticated, loading, error, logoutFn }}>
            {children}
        </UserContext.Provider>
    );
}

export { UserContext };

