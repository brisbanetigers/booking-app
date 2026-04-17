import nodemailer from 'nodemailer';

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.ethereal.email',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  /**
   * Send a generic email.
   * This is abstracted so you could easily swap out `this.transporter.sendMail`
   * with e.g. `sgMail.send(msg)` for SendGrid, or `client.sendEmail()` for Postmark.
   */
  async sendEmail({ to, subject, html }) {
    try {
      const info = await this.transporter.sendMail({
        from: '"The Author Forestville" <no-reply@theauthor.local>',
        to,
        subject,
        html,
      });
      console.log(`Email sent: ${info.messageId}`);
      return true;
    } catch (error) {
      console.error('Error sending email:', error);
      // Depending on requirements, we don't necessarily want this to fail the parent request
      return false;
    }
  }

  async sendBookingConfirmation(email, name, bookingDetails) {
    await this.sendEmail({
      to: email,
      subject: 'Table Booking Confirmation',
      html: `
        <h2>Hi ${name},</h2>
        <p>Your booking for a table is confirmed!</p>
        <p><strong>Date & Time:</strong> ${new Date(bookingDetails.booking_slot).toLocaleString()}</p>
        <p><strong>Party Size:</strong> ${bookingDetails.party_size}</p>
        <br />
        <p>We look forward to seeing you.</p>
        <p>Best,<br>The Author Forestville Team</p>
      `,
    });
  }
}

export const emailService = new EmailService();
