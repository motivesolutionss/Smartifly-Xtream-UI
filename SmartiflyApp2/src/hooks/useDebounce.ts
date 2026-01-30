/**
 * useDebounce Hook
 * 
 * Debounces a value to prevent excessive updates.
 * Commonly used for search inputs to avoid filtering on every keystroke.
 */

import { useState, useEffect } from 'react';

/**
 * Returns a debounced version of the provided value.
 * The debounced value will only update after the specified delay
 * has passed without any new changes to the value.
 * 
 * @param value - The value to debounce
 * @param delay - The debounce delay in milliseconds (default: 300ms)
 * @returns The debounced value
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        // Set up a timer to update the debounced value after the delay
        const timer = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        // Clean up the timer if value changes before delay completes
        return () => {
            clearTimeout(timer);
        };
    }, [value, delay]);

    return debouncedValue;
}

export default useDebounce;
