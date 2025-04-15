import { Request, Response } from 'express';
import { ConfigModel } from '../models/config.model';

export const getConfig = async (req: Request, res: Response) => {
  try {
    const config = await ConfigModel.findOne();
    res.json(config || {});
  } catch (error) {
    res.status(500).json({ error: 'Error al cargar configuración' });
  }
};