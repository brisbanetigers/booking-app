import { google } from 'googleapis';

export class GoogleSheetsService {
  constructor() {
    this.sheetId = process.env.GOOGLE_SHEET_ID;
    this.clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
    // Replace literal \n with actual newlines to fix escaped string parsing from docker/env files
    this.privateKey = process.env.GOOGLE_PRIVATE_KEY ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n') : null;
    
    this.auth = null;
    if (this.sheetId && this.clientEmail && this.privateKey) {
      try {
        this.auth = new google.auth.GoogleAuth({
          credentials: {
            client_email: this.clientEmail,
            private_key: this.privateKey,
          },
          scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
        this.sheets = google.sheets({ version: 'v4', auth: this.auth });
      } catch (err) {
        console.error('Failed to initialize Google Sheets Auth:', err);
      }
    } else {
      console.warn('Google Sheets integration is disabled. Missing ENV configurations.');
    }
  }

  async appendBooking(bookingData) {
    if (!this.sheets || !this.sheetId) {
      return; 
    }

    try {
      const { customer_name, email, mobile_number, booking_slot, party_size } = bookingData;
      
      const localString = new Date(booking_slot).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });

      const request = {
        spreadsheetId: this.sheetId,
        range: 'Sheet1!A:F', // Assumes a generic Sheet1 name
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        resource: {
          values: [
            [
              localString,
              customer_name,
              email,
              mobile_number || 'Not Provided',
              party_size,
              'Pending'
            ],
          ],
        },
      };

      await this.sheets.spreadsheets.values.append(request);
      console.log('Successfully piped booking to Google Sheets.');
    } catch (error) {
      // We explicitly catch and swallow this so it doesn't break the user's booking flow
      console.error('Failed to pipe booking to Google Sheets:', error.message);
    }
  }
}

export const googleSheetsService = new GoogleSheetsService();
