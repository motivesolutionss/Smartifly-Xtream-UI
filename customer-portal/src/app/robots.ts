import { MetadataRoute } from 'next';

/**
 * Generates the robots.txt for the application
 * https://nextjs.org/docs/app/api-reference/file-conventions/metadata/robots
 */
export default function robots(): MetadataRoute.Robots {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://smartifly.com';

    return {
        rules: [
            {
                userAgent: '*',
                allow: '/',
                disallow: [
                    '/api/',
                    '/subscription/request/',
                    '/subscription/verify/',
                ],
            },
        ],
        sitemap: `${baseUrl}/sitemap.xml`,
    };
}
