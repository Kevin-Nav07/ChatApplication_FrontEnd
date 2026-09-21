import type { AxiosResponse } from "axios";
import type { SignupForm } from "../features/auth/types/SignupForm";
import { api } from "./appService";



export async function signup(formInputs: SignupForm): Promise<AxiosResponse> {
    const response: AxiosResponse = await api.post("/users", formInputs);
    console.log(response);
    return response
}