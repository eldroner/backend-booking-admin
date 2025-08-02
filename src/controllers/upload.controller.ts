import { Request, Response } from 'express';
import { v2 as cloudinary } from 'cloudinary';

export const uploadImage = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se ha subido ningún archivo' });
    }

    // Subir la imagen a Cloudinary
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: 'booking-manager', // Carpeta en Cloudinary para organizar las imágenes
    });

    // Devolver la URL segura de la imagen
    res.json({ imageUrl: result.secure_url });

  } catch (error) {
    console.error('Error al subir la imagen:', error);
    res.status(500).json({ error: 'Error al subir la imagen' });
  }
};