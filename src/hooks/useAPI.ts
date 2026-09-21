// src/hooks/useAPI.ts
import { useState } from 'react';
import { AppError } from '../models/AppError';

export default function useAPI<T, Args extends unknown[] = unknown[]>(
    apiFunction: (...args: Args) => Promise<T>
) {
    const [data, setData] = useState<T | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<AppError | null>(null);

    // The execution trigger passed to the component
    const execute = async (...args: Args): Promise<T | null> => {
        setIsLoading(true);
        setError(null);

        try {
            // 1. Run the async network function with whatever arguments were provided
            const responseData: T = await apiFunction(...args);
            setData(responseData);
            return responseData;
        } catch (err: unknown) {
            // 2. Capture our normalized AppError
            const appError = err instanceof AppError
                ? err
                : new AppError('An unexpected error occurred.', 500, 'SERVER');

            setError(appError);
            return null;
        } finally {
            // 3. Guarantee loading is turned off
            setIsLoading(false);
        }
    };

    // Returning an object allows components to destructure only what they need!
    return {
        data,
        isLoading,
        error,
        execute,
    };
}