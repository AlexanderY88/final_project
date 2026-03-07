import jwt from 'jsonwebtoken';
import { IUser } from '../models/User';

interface JwtPayload {
  userId: string;
  email: string;
  role: string;
}

export const generateToken = (user: IUser): string => {
  const payload: JwtPayload = {
    userId: user._id.toString(),
    email: user.email,
    role: user.role
  };

  const secret = process.env.JWT_SECRET || 'your-fallback-secret-key';
  const expiresIn = process.env.JWT_EXPIRES_IN || '4h';
  
  return jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions);
};

export const verifyToken = (token: string): JwtPayload => {
  const secret = process.env.JWT_SECRET || 'your-fallback-secret-key';
  return jwt.verify(token, secret) as JwtPayload;
};