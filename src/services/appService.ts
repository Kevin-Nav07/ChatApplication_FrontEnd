import axios, { AxiosError, type AxiosInstance, type CreateAxiosDefaults, type AxiosResponse, type InternalAxiosRequestConfig } from "axios";
import { AppError } from "../models/AppError";
import { API_BASE_URL } from "./apiConfig";

/*
This is a base service which all services will import. This includes configuration options
that will be present in all api calls and headers present in all api calls
*/
const axiosOptions: CreateAxiosDefaults = {
    baseURL: API_BASE_URL,//"/api" in production (same origin), the full backend address in development, see apiConfig.ts
    headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        // "Cache-Control": "no-cache",
    },
    timeout: 10000, //8 second timeout,
    withCredentials: true

};

//using Axios for retrieving data, and we create an AxiosInstance which will allow us
//to call api requests with the config we specified here
export const api: AxiosInstance = axios.create(axiosOptions)

//every error body from our server looks like { message: "..." }
type ServerErrorBody = { message?: string };

//the request config with a flag we add so a request is only ever retried once after a refresh
type RetryableRequestConfig = InternalAxiosRequestConfig & { _retried?: boolean };

//holds the refresh call that is currently running, or null when none is.
//the server rotates the refresh token on every refresh, so if two requests each started their own refresh
//the second one would send an already deleted token and fail. Sharing one promise means only one refresh ever runs at a time
let refreshPromise: Promise<void> | null = null;

//asks the server for a new access token using the refresh token cookie, reusing the in flight call if there is one
function refreshTokens(): Promise<void> {
    if (refreshPromise == null) {
        refreshPromise = api.post("/auth/refresh")
            .then(() => undefined)//callers only care that it finished, not what it returned
            .finally(() => { refreshPromise = null; });//clear it so the next expiry, an hour later, starts a fresh refresh
    }
    return refreshPromise;
}

//converts an axios error into our AppError, preferring the server's own message
//because it explains what went wrong (for example "No user found with the username alex") instead of "Request failed with status code 404"
function toAppError(error: AxiosError<ServerErrorBody>): AppError {
    const serverMessage = error.response?.data?.message;
    return new AppError(serverMessage ?? error.message, error.status, error.code);
}

//response middleware
api.interceptors.response.use((response: AxiosResponse) => {//when the response has a 2xx status code
    return response;
},
    async (error: AxiosError<ServerErrorBody>) => {//when the response encountered an error, we reformat the error to custom Error
        /// so our components can handle it properly
        const originalRequest = error.config as RetryableRequestConfig | undefined;
        //auth routes are skipped: a 401 from login means a wrong password, and a 401 from refresh means the session is over
        const isAuthRoute = originalRequest?.url?.startsWith("/auth/") ?? false;

        //any 401 counts, not only "Expired Token", because the access token cookie expires at the same time as the token
        //so the browser usually stops sending it and the server answers "token not found" instead
        if (error.response?.status === 401 && originalRequest && !originalRequest._retried && !isAuthRoute) {
            originalRequest._retried = true;//marks the request so a second 401 after refreshing does not loop forever
            try {
                await refreshTokens();
            }
            catch {
                //the refresh token is missing or expired, so the user has to log in again.
                //a full page load is used because this file lives outside React and cannot use useNavigate,
                //and it also wipes any data from the old session that is still in memory
                if (!window.location.pathname.startsWith("/auth/")) {
                    window.location.assign("/auth/login");
                }
                //a clear message instead of the original 401's text, which describes the access token and was confusing to read
                return Promise.reject(new AppError("Your session has expired. Please log in again.", 401, "SESSION_EXPIRED"));
            }
            return api(originalRequest);//replays the original request, the browser now sends the new access token cookie
        }

        return Promise.reject(toAppError(error));//always reject the promise with an error in the error clause
    });

