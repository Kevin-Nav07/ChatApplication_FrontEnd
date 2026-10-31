
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

// Turns anything caught in a catch block into text that is safe to show the user
// An AppError already carries the server's message, anything else is a bug so a generic message is shown instead
export function getErrorMessage(error: unknown): string {
    return error instanceof AppError ? error.message : 'Something went wrong. Please try again.';
}
