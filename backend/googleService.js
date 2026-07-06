const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive'
];

const CREDENTIALS_PATH = path.join(__dirname, 'credentials.json');

let authClient = null;

async function getAuth() {
  if (authClient) return authClient;
  if (!fs.existsSync(CREDENTIALS_PATH)) {
    throw new Error("credentials.json not found!");
  }
  const auth = new google.auth.GoogleAuth({
    keyFile: CREDENTIALS_PATH,
    scopes: SCOPES,
  });
  authClient = await auth.getClient();
  return authClient;
}

async function getSheets() {
  const auth = await getAuth();
  return google.sheets({ version: 'v4', auth });
}

async function getDrive() {
  const auth = await getAuth();
  return google.drive({ version: 'v3', auth });
}

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

// GET Sheet Names
async function getSheetNames() {
  const sheets = await getSheets();
  const res = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
  });
  return res.data.sheets.map(s => s.properties.title);
}

// READ from Sheet
async function readSheet(sheetName) {
  const sheets = await getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: sheetName + '!A1:Z1000',
  });
  return res.data.values || [];
}

// APPEND to Sheet
async function appendToSheet(sheetName, values) {
  const sheets = await getSheets();
  const res = await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: sheetName + '!A1',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [values]
    }
  });
  return res.data;
}

// UPDATE Cell in Sheet
async function updateCell(sheetName, cell, value) {
  const sheets = await getSheets();
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: sheetName + '!' + cell,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[value]]
    }
  });
}

// CREATE Folder in Drive
async function createFolder(folderName, parentFolderId) {
  const drive = await getDrive();
  const fileMetadata = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
    parents: [parentFolderId]
  };
  const folder = await drive.files.create({
    resource: fileMetadata,
    fields: 'id'
  });
  
  // Set permissions so anyone with link can view
  await drive.permissions.create({
    fileId: folder.data.id,
    requestBody: {
      role: 'reader',
      type: 'anyone'
    }
  });
  return folder.data.id;
}

// UPLOAD File to Drive
async function uploadFileToDrive(filePath, fileName, mimeType, parentFolderId) {
  const drive = await getDrive();
  const fileMetadata = {
    name: fileName,
    parents: [parentFolderId]
  };
  const media = {
    mimeType: mimeType,
    body: fs.createReadStream(filePath)
  };
  const file = await drive.files.create({
    resource: fileMetadata,
    media: media,
    fields: 'id, webViewLink'
  });
  
  // Set permissions
  await drive.permissions.create({
    fileId: file.data.id,
    requestBody: {
      role: 'reader',
      type: 'anyone'
    }
  });
  
  return file.data.webViewLink;
}

module.exports = {
  readSheet,
  getSheetNames,
  appendToSheet,
  updateCell,
  createFolder,
  uploadFileToDrive
};
