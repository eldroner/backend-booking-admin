import { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      idNegocio?: string;
      file?: {
        fieldname: string;
        originalname: string;
        encoding: string;
        mimetype: string;
        destination: string;
        filename: string;
        path: string;
        size: number;
      };
    }
  }
}
