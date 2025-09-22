import { Request, Response } from 'express';
import { sendBookingConfirmationEmail, sendAdminNotificationEmail } from '../services/email.service';

export const sendBookingConfirmation = async (req: Request, res: Response) => {
  try {
    await sendBookingConfirmationEmail(req.body);
    res.status(200).json({ message: 'Booking confirmation email sent successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to send booking confirmation email.', error });
  }
};

export const sendAdminNotification = async (req: Request, res: Response) => {
  try {
    await sendAdminNotificationEmail(req.body);
    res.status(200).json({ message: 'Admin notification email sent successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to send admin notification email.', error });
  }
};
