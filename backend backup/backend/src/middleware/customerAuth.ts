import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';

export interface CustomerAuthRequest extends Request {
    customerId?: string;
}

export const customerAuthMiddleware = (req: CustomerAuthRequest, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, config.jwtSecret) as { 
            customerId?: string; 
            role?: string;
            tokenType?: string 
        };

        if (!decoded?.customerId || decoded.role !== 'customer' || decoded.tokenType !== 'access') {
            return res.status(401).json({ error: 'Invalid session' });
        }

        req.customerId = decoded.customerId;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Session expired' });
    }
};
