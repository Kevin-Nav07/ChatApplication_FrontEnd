import type { AxiosResponse } from "axios";
import type { SignupForm } from "../features/auth/types/SignupForm";
import type { LoginForm } from "../features/auth/types/LoginForm";
import { api } from "./appService";
import { AppError } from "../models/AppError";

// Service function to submit user registration data to the backend API
export async function signup(formInputs: SignupForm): Promise<AxiosResponse> {
    const response: AxiosResponse = await api.post("/users", formInputs); // Sends POST request with registration payload
    return response; // Returns the response from the server
}

// Service function to check whether a username is already taken in the database
// Returns true if the user exists (200 OK), false if not found (404), or throws for server errors
export async function checkUsernameExists(username: string): Promise<boolean> {
    try {
        const response: AxiosResponse = await api.get(`/users/name/${username}`); // Sends GET request to check username
        return response.status === 200; // If status is 200, user exists in the database
    } catch (error: unknown) {
        // If our AppError interceptor captured a 404 Not Found response
        if (error instanceof AppError && error.statusCode === 404) {
            return false; // A 404 means the username does not exist and is available
        }
        // Rethrow server errors or connection failures so caller can handle them
        throw error;
    }
}

// Service function to authenticate a user with credentials
// Sends POST request with username and password, returning AxiosResponse on success
export async function login(credentials: LoginForm): Promise<AxiosResponse> {
    // Sends credentials securely in the request body to the backend login route
    const response: AxiosResponse = await api.post("/auth/login", credentials);
    return response; // Returns the server response containing authentication tokens or user info
}