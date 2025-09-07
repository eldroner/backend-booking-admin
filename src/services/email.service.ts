import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SENDER_EMAIL = process.env.SENDER_EMAIL;

interface CancellationEmailData {
  user_name: string;
  to_email: string;
  booking_date: string;
  booking_time: string;
  service_name: string;
  business_name: string;
  business_id?: string;
}

interface WelcomeEmailData {
  to_email: string;
  business_id: string;
}

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465,
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});

export const sendCancellationEmail = async (data: CancellationEmailData) => {
  if (!SENDER_EMAIL || !SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.error('SMTP environment variables are not fully set.');
    throw new Error('SMTP configuration missing.');
  }

  const emailContent = `
  <div style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 30px;">
    <div style="max-width: 600px; margin: auto; background-color: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.05);">
      
      <h2 style="color: #d32f2f; text-align: center;">Cancelación de cita</h2>
      
      <p>Hola <strong>${data.user_name}</strong>,</p>
      
      <p>Lamentamos informarte que tu reserva para el siguiente servicio ha sido cancelada debido a que no fue verificada en el tiempo establecido:</p>
      
      <p style="font-size: 18px; font-weight: bold; color: #333;">${data.service_name}</p>

      <p>La cita estaba programada para:</p>

      <p style="font-size: 16px; font-weight: bold;">
        📅 <span style="color: #444;">${data.booking_date}</span><br>
        🕓 <span style="color: #444;">${data.booking_time}</span>
      </p>

      <p>Si todavía deseas realizar este servicio, puedes crear una nueva reserva haciendo clic en el siguiente botón:</p>

      <div style="text-align: center; margin: 30px 0;">
        <a href="https://reservas.pixelnova.es/${data.business_id}" style="background-color: #d32f2f; color: white; text-decoration: none; padding: 12px 25px; border-radius: 5px; font-weight: bold;">
          Crear nueva reserva
        </a>
      </div>

      <p>Te invitamos a reservar de nuevo en el horario que mejor se adapte a ti.<br>Si necesitas ayuda, no dudes en contactarnos.</p>
      
      <p style="margin-top: 40px;">Saludos cordiales,<br>
      El equipo de <strong>${data.business_name}</strong></p>

      <p style="font-size: 11px; color: #888; margin-top: 40px; text-align: center; line-height: 1.5;">
        Este mensaje ha sido enviado por Pixelnova Digital Services.<br>
        Dirección: Calle de Andalucía 9 · Email: <a href="mailto:info@pixelnova.es" style="color: #888;">info@pixelnova.es</a> · 
        Tel: <a href="https://wa.me/34633703882" style="color: #888; text-decoration: none;">633703882</a><br>
        Los datos personales serán tratados conforme al RGPD y la LOPDGDD. Más información en nuestra
        <a href="https://pixelnova.es/privacy-policy" style="color: #d32f2f; text-decoration: none;">política de privacidad</a>.
      </p>

      <div style="text-align: center; margin-top: 20px;">
        <a href="https://pixelnova.es/" target="_blank" rel="noopener">
          <img src="https://raw.githubusercontent.com/eldroner/mis-assets/main/pixelnova-logo-gris-rojo-sin-fondo.png" alt="Logo Pixelnova" style="max-height: 40px; opacity: 0.8;">
        </a>
      </div>

    </div>
  </div>
  `;

  const mailOptions = {
    from: SENDER_EMAIL,
    to: data.to_email,
    subject: `Reserva cancelada en ${data.business_name}`,
    html: emailContent,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email de cancelación enviado:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error al enviar email de cancelación con Nodemailer:', error);
    throw error;
  }
};

export const sendWelcomeEmail = async (data: WelcomeEmailData) => {
  if (!SENDER_EMAIL || !SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.error('SMTP environment variables are not fully set.');
    throw new Error('SMTP configuration missing.');
  }

  const adminUrl = `https://reservas.pixelnova.es/${data.business_id}/admin`;

  const emailContent = `
  <div style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 30px;">
    <div style="max-width: 600px; margin: auto; background-color: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.05);">
      
      <h2 style="color: #28a745; text-align: center;">¡Bienvenido a tu nuevo sistema de reservas!</h2>
      
      <p>Hola,</p>
      
      <p>¡Gracias por registrarte! Tu espacio de reservas ya está casi listo. Aquí tienes el enlace para acceder a tu panel de administración y terminar la configuración:</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${adminUrl}" style="background-color: #007bff; color: white; text-decoration: none; padding: 12px 25px; border-radius: 5px; font-weight: bold;">
          Acceder a mi panel de admin
        </a>
      </div>

      <p>Tu URL para que los clientes reserven es:</p>
      <p style="text-align: center; font-size: 16px; font-weight: bold;">
        <a href="https://reservas.pixelnova.es/${data.business_id}" style="color: #007bff;">https://reservas.pixelnova.es/${data.business_id}</a>
      </p>

      <p><strong>Primeros pasos recomendados:</strong></p>
      <ol>
        <li>Accede a tu panel de administración.</li>
        <li>Establece tu horario de trabajo.</li>
        <li>Configura los servicios que ofreces.</li>
        <li>¡Comparte tu enlace de reservas!</li>
      </ol>
      
      <p style="margin-top: 40px;">Saludos cordiales,<br>
      El equipo de <strong>Pixelnova</strong></p>

      <p style="font-size: 11px; color: #888; margin-top: 40px; text-align: center; line-height: 1.5;">
        Este mensaje ha sido enviado por Pixelnova Digital Services.<br>
        Dirección: Calle de Andalucía 9 · Email: <a href="mailto:info@pixelnova.es" style="color: #888;">info@pixelnova.es</a> · 
        Tel: <a href="https://wa.me/34633703882" style="color: #888; text-decoration: none;">633703882</a><br>
        Los datos personales serán tratados conforme al RGPD y la LOPDGDD. Más información en nuestra
        <a href="https://pixelnova.es/privacy-policy" style="color: #d32f2f; text-decoration: none;">política de privacidad</a>.
      </p>

      <div style="text-align: center; margin-top: 20px;">
        <a href="https://pixelnova.es/" target="_blank" rel="noopener">
          <img src="https://raw.githubusercontent.com/eldroner/mis-assets/main/pixelnova-logo-gris-rojo-sin-fondo.png" alt="Logo Pixelnova" style="max-height: 40px; opacity: 0.8;">
        </a>
      </div>

    </div>
  </div>
  `;

  const mailOptions = {
    from: SENDER_EMAIL,
    to: data.to_email,
    subject: '¡Bienvenido! Comienza a gestionar tus reservas',
    html: emailContent,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email de bienvenida enviado:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error al enviar email de bienvenida con Nodemailer:', error);
    throw error;
  }
};
