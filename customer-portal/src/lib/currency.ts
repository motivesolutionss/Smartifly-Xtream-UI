// Currency utilities and API integration
import { logger } from './logger';
import { fetchWithRetry } from './retry';

export interface Currency {
    code: string;
    symbol: string;
    name: string;
}

export const CURRENCIES: Currency[] = [
    // Major Currencies
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'GBP', symbol: '£', name: 'British Pound' },

    // South Asia
    { code: 'PKR', symbol: '₨', name: 'Pakistani Rupee' },
    { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
    { code: 'BDT', symbol: '৳', name: 'Bangladeshi Taka' },

    // Middle East
    { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
    { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal' },
    { code: 'QAR', symbol: 'ر.ق', name: 'Qatari Riyal' },
    { code: 'KWD', symbol: 'د.ك', name: 'Kuwaiti Dinar' },

    // Asia Pacific
    { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
    { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
    { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
    { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit' },
    { code: 'THB', symbol: '฿', name: 'Thai Baht' },

    // Americas
    { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
    { code: 'MXN', symbol: 'MX$', name: 'Mexican Peso' },
    { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },

    // Others
    { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
    { code: 'TRY', symbol: '₺', name: 'Turkish Lira' },
];

export interface ExchangeRates {
    [key: string]: number;
}

// Cache exchange rates in memory
let ratesCache: { data: ExchangeRates | null; timestamp: number } = {
    data: null,
    timestamp: 0,
};

const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

/**
 * Fetch exchange rates via Next.js API route (solves CORS issues)
 * The API route proxies the request to ExchangeRate-API server-side
 * 1,500 requests/month free tier
 */
export async function fetchExchangeRates(): Promise<ExchangeRates> {
    const now = Date.now();

    // Return cached rates if still valid
    if (ratesCache.data && now - ratesCache.timestamp < CACHE_DURATION) {
        logger.log('Using cached exchange rates:', ratesCache.data);
        return ratesCache.data;
    }

    logger.log('Fetching fresh exchange rates via API route...');

    try {
        // Call our Next.js API route which proxies the external API (no CORS issues)
        const response = await fetchWithRetry(
            '/api/exchange-rates',
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            },
            {
                maxRetries: 3,
                timeout: 15000, // 15 seconds (includes API route processing time)
                retryableStatuses: [408, 429, 500, 502, 503, 504],
            }
        );

        const data = await response.json();
        logger.log('API Response:', data);

        // Extract rates from API response
        const rates: ExchangeRates = data.rates || data;

        logger.log('Processed exchange rates:', rates);
        logger.log('PKR Rate:', rates.PKR);

        // Update cache
        ratesCache = {
            data: rates,
            timestamp: now,
        };

        return rates;
    } catch (error) {
        logger.error('Error fetching exchange rates after retries:', error);
        logger.warn('Using fallback exchange rates');

        // Return fallback rates if API fails
        const fallbackRates = {
            USD: 1,
            EUR: 0.91,
            GBP: 0.79,
            PKR: 278.5,
            INR: 83.2,
            AED: 3.67,
            CAD: 1.34,
            AUD: 1.49,
            CNY: 7.12,
            JPY: 151.4,
            TRY: 32.1,
            SAR: 3.75,
        };

        // Cache fallback rates too (optional, but prevents spamming broken API)
        ratesCache = {
            data: fallbackRates,
            timestamp: now,
        };

        return fallbackRates;
    }
}

/**
 * Converts a price amount from one currency to another using exchange rates.
 * 
 * The conversion process:
 * 1. Validates input parameters
 * 2. Converts source currency to USD (base currency)
 * 3. Converts USD to target currency
 * 4. Returns original amount if conversion fails or rates are missing
 * 
 * @param amount - The amount to convert (must be a positive number)
 * @param fromCurrency - Source currency code (e.g., 'USD', 'EUR', 'PKR')
 * @param toCurrency - Target currency code (e.g., 'USD', 'EUR', 'PKR')
 * @param rates - Exchange rates object with currency codes as keys and rates as values
 * 
 * @returns The converted amount, or the original amount if conversion fails
 * 
 * @example
 * ```ts
 * const rates = { USD: 1, EUR: 0.91, PKR: 278.5 };
 * const converted = convertPrice(100, 'USD', 'PKR', rates);
 * // Returns: 27850
 * ```
 */
export function convertPrice(
    amount: number,
    fromCurrency: string,
    toCurrency: string,
    rates: ExchangeRates
): number {
    if (fromCurrency === toCurrency) {
        return amount;
    }

    // Validate input
    if (!amount || isNaN(amount) || amount < 0) {
        logger.warn('Invalid amount for currency conversion:', amount);
        return amount; // Return original amount on invalid input
    }

    // Check if rates are available
    if (!rates || Object.keys(rates).length === 0) {
        logger.warn('Exchange rates not available, returning original amount');
        return amount;
    }

    // Validate currency codes
    if (!fromCurrency || !toCurrency) {
        logger.warn('Invalid currency codes for conversion');
        return amount;
    }

    logger.log(`Converting ${amount} ${fromCurrency} to ${toCurrency}`);
    logger.log('Available rates:', rates);

    try {
        // Get exchange rates with validation
        const fromRate = rates[fromCurrency];
        const toRate = rates[toCurrency];

        // If rates are missing, log warning and return original amount
        if (!fromRate || fromRate <= 0) {
            logger.warn(`Exchange rate not available for ${fromCurrency}, returning original amount`);
            return amount;
        }

        if (!toRate || toRate <= 0) {
            logger.warn(`Exchange rate not available for ${toCurrency}, returning original amount`);
            return amount;
        }

        // Convert to USD first, then to target currency
        const amountInUSD = fromCurrency === 'USD'
            ? amount
            : amount / fromRate;

        const convertedAmount = toCurrency === 'USD'
            ? amountInUSD
            : amountInUSD * toRate;

        // Validate result
        if (isNaN(convertedAmount) || !isFinite(convertedAmount)) {
            logger.warn('Currency conversion resulted in invalid number, returning original amount');
            return amount;
        }

        logger.log(`Result: ${amount} ${fromCurrency} = ${convertedAmount} ${toCurrency}`);

        return convertedAmount;
    } catch (error) {
        logger.error('Error during currency conversion:', error);
        // Return original amount on error
        return amount;
    }
}

/**
 * Formats a price amount with the appropriate currency symbol.
 * 
 * @param amount - The numeric amount to format
 * @param currencyCode - ISO currency code (e.g., 'USD', 'EUR', 'PKR')
 * 
 * @returns Formatted string with currency symbol and formatted number
 * 
 * @example
 * ```ts
 * formatPrice(1234.56, 'USD'); // Returns: "$1,234.56"
 * formatPrice(50000, 'PKR');   // Returns: "₨50,000"
 * ```
 */
export function formatPrice(amount: number, currencyCode: string): string {
    const currency = CURRENCIES.find(c => c.code === currencyCode);

    if (!currency) {
        return `${amount.toFixed(2)}`;
    }

    // Format based on currency
    const formatter = new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    });

    return `${currency.symbol}${formatter.format(amount)}`;
}

/**
 * Retrieves the currency symbol for a given currency code.
 * 
 * @param code - ISO currency code (e.g., 'USD', 'EUR', 'PKR')
 * 
 * @returns The currency symbol, or the code itself if not found
 * 
 * @example
 * ```ts
 * getCurrencySymbol('USD'); // Returns: "$"
 * getCurrencySymbol('PKR'); // Returns: "₨"
 * getCurrencySymbol('XXX'); // Returns: "XXX" (not found)
 * ```
 */
export function getCurrencySymbol(code: string): string {
    return CURRENCIES.find(c => c.code === code)?.symbol || code;
}
