import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";

interface AuthRequest extends Request {
    user?: any;
}

const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const token = req.header("auth-token");
        if (!token) return res.status(401).send("Access denied. No token provided.");

        req.user = jwt.verify(token, process.env.JWT_SECRET as string);
        next();
    } catch (error) {
        const msg = error instanceof Error ? error.message : "Invalid token";
        res.status(400).json({ error: msg });
    }
};

export default authMiddleware;
module.exports = authMiddleware;