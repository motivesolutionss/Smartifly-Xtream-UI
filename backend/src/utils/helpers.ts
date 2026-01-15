// Generate random ticket number like TKT-XXXXXX
export const generateTicketNo = (): string => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = 'TKT-';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

// API Response helpers
export const successResponse = <T>(data: T, message?: string) => ({
    success: true,
    data,
    ...(message && { message }),
});

export const errorResponse = (error: string, details?: unknown) => {
    const response: { success: false; error: string; details?: unknown } = {
        success: false,
        error,
    };
    if (details) response.details = details;
    return response;
};
