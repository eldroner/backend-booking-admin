import cron from 'node-cron';
import { ReservaModel } from '../models/reserva.model';
import { BusinessConfigModel } from '../models/config.model';
import { StaffModel } from '../models/staff.model';
import { sendCancellationEmail, sendRatingRequestEmail } from './email.service';

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

export const startRatingRequestJob = () => {
  cron.schedule('*/30 * * * *', async () => { // Cada 30 minutos
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);

    try {
      const finishedReservations = await ReservaModel.find({
        estado: 'confirmada',
        ratingRequestSent: { $ne: true },
        staffId: { $exists: true, $ne: null },
        fechaInicio: { $lt: oneHourAgo, $gt: threeHoursAgo }
      });

      for (const reserva of finishedReservations) {
        const staff = await StaffModel.findById(reserva.staffId);
        const config = await BusinessConfigModel.findOne({ idNegocio: reserva.idNegocio });

        if (staff && config) {
          const ratingLink = `https://bookiss.es/valorar/${reserva.ratingToken}`;

          try {
            await sendRatingRequestEmail({
              to_email: reserva.usuario.email,
              user_name: reserva.usuario.nombre,
              staff_name: staff.nombre,
              business_name: config.nombre,
              rating_link: ratingLink
            });

            reserva.ratingRequestSent = true;
            await reserva.save();
            console.log(`Rating request sent for reservation ${reserva._id}`);
          } catch (error) {
            console.error(`Error sending rating request for reservation ${reserva._id}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('Error in rating request job:', error);
    }
  });
};