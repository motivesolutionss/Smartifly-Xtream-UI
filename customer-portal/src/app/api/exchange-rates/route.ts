import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { fetchWithRetry } from '@/lib/retry';

/**
 * API route to proxy exchange rate requests
 * This solves CORS issues by making the request server-side
 * 
 * GET /api/exchange-rates
 * Returns current exchange rates from USD
 */
export async function GET() {
  try {
    // Fetch from external API server-side (no CORS issues)
    const response = await fetchWithRetry(
      'https://api.exchangerate-api.com/v4/latest/USD',
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      },
      {
        maxRetries: 3,
        timeout: 10000, // 10 seconds
        retryableStatuses: [408, 429, 500, 502, 503, 504],
      }
    );

    const data = await response.json();

    // ExchangeRate-API returns rates in 'rates' object
    const rates = {
      USD: 1, // Base currency
      ...data.rates,
    };

    logger.log('Exchange rates fetched successfully');

    return NextResponse.json({ rates }, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400', // Cache for 1 hour
      },
    });
  } catch (error) {
    logger.error('Error fetching exchange rates in API route:', error);
    
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

    return NextResponse.json({ rates: fallbackRates }, {
      status: 200, // Still return 200 with fallback data
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600', // Cache fallback for 5 minutes
      },
    });
  }
}

