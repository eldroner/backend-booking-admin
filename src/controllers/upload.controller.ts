import { Request, Response } from 'express';
import { v2 as cloudinary } from 'cloudinary';

import { Readable } from 'stream';

export const uploadImage = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se ha subido ningún archivo' });
    }

    // Subir la imagen a Cloudinary desde el buffer
    const uploadPromise = new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: 'booking-manager' },
        (error, result) => {
          if (error) {
            return reject(error);
          }
          resolve(result);
        }
      );
      const readableStream = new Readable();
      readableStream.push(req.file!.buffer);
      readableStream.push(null);
      readableStream.pipe(uploadStream);
    });

    const result = await uploadPromise as any;

    // Devolver la URL segura de la imagen
    res.json({ imageUrl: result.secure_url });

  } catch (error) {
    console.error('Error al subir la imagen:', error);
    res.status(500).json({ error: 'Error al subir la imagen' });
  }
};

export const uploadImages = async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No se han subido archivos' });
    }

    const uploadPromises = files.map(file => {
      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder: 'booking-manager' },
          (error, result) => {
            if (error) {
              return reject(error);
            }
            resolve(result);
          }
        );
        const readableStream = new Readable();
        readableStream.push(file.buffer);
        readableStream.push(null);
        readableStream.pipe(uploadStream);
      });
    });

    const results = await Promise.all(uploadPromises) as any[];
    const imageUrls = results.map(result => result.secure_url);

    res.json({ imageUrls });

  } catch (error) {
    console.error('Error al subir las imágenes:', error);
    res.status(500).json({ error: 'Error al subir las imágenes' });
  }
};