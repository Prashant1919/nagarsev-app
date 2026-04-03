// api/_sheets.js
// Shared helper – initialises the Google Sheets client from env vars.
// Import this in every serverless function.

const { google } = require('googleapis');

const SPREADSHEET_ID = '1nZjXop8q2K2JwayI84ANrFeM1Tq-3I2kgAz2NKdZtuM';

function getClient() {
  const credentials = {
    type: 'service_account',
    project_id: process.env.GCP_PROJECT_ID,
    private_key_id: process.env.GCP_PRIVATE_KEY_ID,
    // Vercel stores the key with literal \n – replace them so PEM is valid
    private_key: (process.env.GCP_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    client_email: process.env.GCP_CLIENT_EMAIL,
    client_id: process.env.GCP_CLIENT_ID,
    auth_uri: 'https://accounts.google.com/o/oauth2/auth',
    token_uri: 'https://oauth2.googleapis.com/token',
  };

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return { sheets: google.sheets({ version: 'v4', auth }), SPREADSHEET_ID };
}

module.exports = { getClient };
