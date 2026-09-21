import axios, { AxiosError, type AxiosInstance, type CreateAxiosDefaults, type AxiosResponse } from "axios";
import { AppError } from "../models/AppError";

const config: ImportMetaEnv = import.meta.env;

/*
This is a base service which all services will import. This includes configuration options
that will be present in all api calls and headers present in all api calls
*/
const axiosOptions: CreateAxiosDefaults = {
    baseURL: config.VITE_API_BASE_URL,//base url
    headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Cache-Control": "no-cache",
    },
    timeout: 8000, //8 second timeout,
    withCredentials: true

};

//using Axios for retrieving data, and we create an AxiosInstance which will allow us 
//to call api requests with the config we specified here
export const api: AxiosInstance = axios.create(axiosOptions)


//response middleware
api.interceptors.response.use((response: AxiosResponse) => {//when the response has a 2xx status code
    return response;
},
    (error: AxiosError) => {//when the response encountered an error, we reformat the error to custom Error
        /// so our components can handle it properly
        const { status, message, code } = error;
        const appError: AppError = new AppError(message, status, code);
        return Promise.reject(appError);//always reject the promise with an error in the error clause
    });

