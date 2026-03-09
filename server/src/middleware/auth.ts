/**
 * JWT Authentication Middleware
 * Verifies JSON Web Tokens and attaches user information to requests
 * 
 * Features:
 * - Extracts JWT token from 'auth-token' header
 * - Verifies token signature using environment JWT secret
 * - Attaches decoded user information to request object
 * - Provides detailed error handling for various token failure scenarios
 * - TypeScript interfaces for type safety
 */

import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";

/**
 * Extended Request Interface
 * Adds user property to Express Request for authenticated user data
 */
interface AuthRequest extends Request {
    user?: any; // Decoded JWT payload containing user ID, role, and email
}

/**
 * JWT Authentication Middleware Function
 * Validates JWT tokens and protects routes requiring authentication
 * 
 * @param {AuthRequest} req - Express request object with optional user property
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function to continue middleware chain
 */
const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        // Extract JWT token from 'auth-token' header
        const token = req.header("auth-token");
        
        // Return 401 if no token provided
        if (!token) return res.status(401).send("Access denied. No token provided.");
        
        // Verify token using JWT secret from environment variables
        // Decoded payload includes: _id, role, email from user registration/login
        req.user = jwt.verify(token, process.env.JWT_SECRET as string);
        
        // Continue to next middleware or route handler
        next();
    } catch (error) {
        // Handle JWT verification errors (expired, malformed, invalid signature)
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        res.status(400).json({ error: errorMessage });
    }
};

export default authMiddleware;
module.exports = authMiddleware;