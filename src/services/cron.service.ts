import cron from 'node-cron';
import { ReservaModel } from '../models/reserva.model';
import { BusinessConfigModel } from '../models/config.model';
import { sendCancellationEmail } from './email.service';

export const startReservationCleanupJob = () => {
  cron.schedule('* * * * *', async () => { // Runs every minute
    const now = new Date();

    try {
      const expiredReservations = await ReservaModel.find({
        estado: 'pendiente_email',
        expiresAt: { $lt: now },
      });

      for (const reserva of expiredReservations) {
        // Update reservation status to cancelled
        reserva.estado = 'cancelada';
        await reserva.save();

        // Get business name for email
        let businessName = 'Tu Negocio'; // Default name
        let serviceNameForEmail = reserva.servicio; // Default to service ID

        let businessConfig = null;
        if (reserva.idNegocio) {
          businessConfig = await BusinessConfigModel.findOne({ idNegocio: reserva.idNegocio });
          if (businessConfig) {
            businessName = businessConfig.nombre;
            const foundService = businessConfig.servicios.find(s => s.id === reserva.servicio);
            if (foundService) {
              serviceNameForEmail = foundService.nombre;
            }
          }
        }

        // Send cancellation email
        try {
          await sendCancellationEmail({
            user_name: reserva.usuario.nombre,
            to_email: reserva.usuario.email,
            booking_date: reserva.fechaInicio.toLocaleDateString('es-ES'),
            booking_time: reserva.fechaInicio.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
            service_name: serviceNameForEmail,
            business_name: businessName,
            business_id: reserva.idNegocio,
          });
        } catch (emailError) {
          console.error(`Failed to send cancellation email for reservation ${reserva._id}:`, emailError);
        }
      }
    } catch (error) {
      console.error('Error in reservation cleanup job:', error);
    }
  });
};