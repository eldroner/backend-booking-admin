import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export const superAdminAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Acceso no autorizado: No se proporcionó token.' });
  }

  const token = authHeader.split(' ')[1];
  const jwtSecret = process.env.SUPER_ADMIN_JWT_SECRET;

  if (!jwtSecret) {
    return res.status(500).json({ message: 'La configuración de seguridad de super-administrador no está definida en el servidor.' });
  }

  try {
    const decoded = jwt.verify(token, jwtSecret) as { role: string };

    if (decoded.role === 'super-admin') {
      next();
    } else {
      return res.status(403).json({ message: 'Acceso denegado: Token no válido para esta operación.' });
    }
  } catch (error) {
    return res.status(401).json({ message: 'Token inválido o expirado.' });
  }
};
