import { Request, Response } from 'express';
import { RatingModel } from '../models/rating.model';
import { ReservaModel } from '../models/reserva.model';
import { StaffModel } from '../models/staff.model';
import { AllowedBusinessModel } from '../models/allowed-business.model';
import { BusinessConfigModel } from '../models/config.model';

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

    // Resolver nombre del servicio si tenemos configuración del negocio.
    // `reserva.servicio` suele ser el id del servicio (string).
    let serviceName: string | undefined;
    if (reserva.idNegocio) {
      const config = await BusinessConfigModel.findOne({ idNegocio: reserva.idNegocio })
        .select('servicios')
        .lean();
      if (config?.servicios?.length) {
        const found = config.servicios.find(
          (s: any) => String(s.id) === String(reserva.servicio) || s.nombre === reserva.servicio
        );
        if (found?.nombre) serviceName = String(found.nombre);
      }
    }
    
    res.json({
      nombreCliente: reserva.usuario.nombre,
      staffNombre: staff?.nombre || 'Nuestro equipo',
      staffFoto: staff?.fotoUrl,
      servicioNombre: serviceName,
      yaValorado: reserva.ratingSubmitted
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener información de la valoración' });
  }
};

/** Listado público de reseñas de un profesional (para popup en la vista de usuario). */
export const getStaffRatings = async (req: Request, res: Response) => {
  try {
    const { idNegocio, staffId, limit } = req.query as {
      idNegocio?: string;
      staffId?: string;
      limit?: string;
    };

    if (!idNegocio || !staffId) {
      return res.status(400).json({ error: 'idNegocio y staffId son requeridos' });
    }

    // Verificar negocio existente (evita enumeración accidental de staffIds).
    const allowed = await AllowedBusinessModel.findOne({ idNegocio: String(idNegocio).toLowerCase().trim() })
      .select('_id')
      .lean();
    if (!allowed) {
      return res.status(404).json({ error: 'Negocio no encontrado' });
    }

    // Verificar que el staff pertenece al negocio.
    const staff = await StaffModel.findOne({ _id: staffId, idNegocio: String(idNegocio).toLowerCase().trim() })
      .select('_id')
      .lean();
    if (!staff) {
      return res.status(404).json({ error: 'Profesional no encontrado' });
    }

    const n = Math.max(1, Math.min(25, parseInt(limit || '6', 10) || 6));

    const ratings = await RatingModel.find({ staffId: String(staffId) })
      .sort({ fecha: -1, createdAt: -1 })
      .limit(n)
      .select('puntuacion comentario nombreCliente fecha createdAt')
      .lean();

    // Devolver solo reseñas con comentario para que el popup tenga “chicha”.
    const withText = ratings
      .filter(r => typeof r.comentario === 'string' && r.comentario.trim().length > 0)
      .map(r => ({
        puntuacion: r.puntuacion,
        comentario: String(r.comentario || '').trim(),
        nombreCliente: r.nombreCliente,
        fecha: (r.fecha || (r as any).createdAt || new Date()).toISOString(),
      }));

    res.json({ ratings: withText });
  } catch (error) {
    console.error('Error en getStaffRatings:', error);
    res.status(500).json({ error: 'Error al obtener reseñas' });
  }
};
