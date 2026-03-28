import { Request, Response } from 'express';
import { RatingModel } from '../models/rating.model';
import { ReservaModel } from '../models/reserva.model';
import { StaffModel } from '../models/staff.model';

export const submitRating = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { puntuacion, comentario } = req.body;

    if (!puntuacion || puntuacion < 1 || puntuacion > 5) {
      return res.status(400).json({ error: 'La puntuación debe estar entre 1 y 5' });
    }

    // Buscar la reserva por el ratingToken
    const reserva = await ReservaModel.findOne({ ratingToken: token });
    if (!reserva) {
      return res.status(404).json({ error: 'Reserva no encontrada o token inválido' });
    }

    if (reserva.ratingSubmitted) {
      return res.status(400).json({ error: 'Esta reserva ya ha sido valorada' });
    }

    if (!reserva.staffId) {
      return res.status(400).json({ error: 'Esta reserva no tiene un miembro del equipo asociado' });
    }

    // Crear la valoración
    const newRating = new RatingModel({
      reservaId: reserva._id,
      staffId: reserva.staffId,
      puntuacion,
      comentario,
      nombreCliente: reserva.usuario.nombre
    });

    await newRating.save();

    // Actualizar la reserva
    reserva.ratingSubmitted = true;
    await reserva.save();

    // Actualizar las métricas del staff
    const staff = await StaffModel.findById(reserva.staffId);
    if (staff) {
      const totalRatings = staff.numRatings + 1;
      const newAverage = ((staff.rating * staff.numRatings) + puntuacion) / totalRatings;
      staff.rating = newAverage;
      staff.numRatings = totalRatings;
      await staff.save();
    }

    res.json({ message: 'Valoración enviada correctamente. ¡Gracias!' });
  } catch (error) {
    console.error('Error al enviar valoración:', error);
    res.status(500).json({ error: 'Error al enviar valoración' });
  }
};

export const getRatingInfo = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const reserva = await ReservaModel.findOne({ ratingToken: token });
    if (!reserva) {
      return res.status(404).json({ error: 'Token inválido' });
    }
    
    const staff = await StaffModel.findById(reserva.staffId);
    
    res.json({
      nombreCliente: reserva.usuario.nombre,
      staffNombre: staff?.nombre || 'Nuestro equipo',
      staffFoto: staff?.fotoUrl,
      servicio: reserva.servicio,
      yaValorado: reserva.ratingSubmitted
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener información de la valoración' });
  }
};
