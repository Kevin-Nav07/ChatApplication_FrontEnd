
export class AppError extends Error {
    statusCode: number | undefined;
    errorType: string;
    fieldErrors?: Record<string, string>; // e.g. { email: "Email already taken" }
    constructor(message: string, statusCode: number | undefined, errorType: string | undefined, fieldErrors?: Record<string, string>) {
        super(message);
        this.name = 'AppError';
        this.statusCode = statusCode;
        this.errorType = errorType ?? 'UNKNOWN';
        this.fieldErrors = fieldErrors;
    }
}