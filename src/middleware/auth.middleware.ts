import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface AuthRequest extends Request {
  idNegocio?: string;
}

export const authenticateAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No autorizado: Token no proporcionado o formato incorrecto' });
  }

  const token = authHeader.split(' ')[1];

  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET no está configurado en las variables de entorno');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as { idNegocio: string };
    req.idNegocio = decoded.idNegocio;
    next();
  } catch (error: any) {
    console.error('Error de autenticación:', error);
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'No autorizado: Token expirado', code: 'TOKEN_EXPIRED' });
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'No autorizado: Token inválido', code: 'TOKEN_INVALID' });
    } else {
      // Para cualquier otro error inesperado en el middleware
      return res.status(401).json({ message: 'No autorizado: Error desconocido de autenticación', code: 'UNKNOWN_AUTH_ERROR' });
    }
  }
};
