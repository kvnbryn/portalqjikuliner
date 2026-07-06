require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const db = require('./db');
require('./poller'); // Start Background Poller
require('./worker'); // Start Queue Worker

const app = express();
// Increased limit for base64 file uploads
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
// To handle plain text JSON from old GAS client
app.use(express.text({ type: 'text/plain', limit: '50mb' }));

const GAS_URL = process.env.GAS_URL;

// --- API ENDPOINTS --- //

app.get('/', (req, res) => {
  res.json({ status: 'success', message: 'VPS Hybrid Backend is Running (Proxy & Cache)' });
});

// Single Unified Endpoint (Replicating GAS doPost)
app.post('/api', async (req, res) => {
  try {
    let data = req.body;
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch (e) {
        return res.status(400).json({ status: 'error', message: 'Invalid JSON payload' });
      }
    }

    const action = data.action;

    // --- 1. HIGH TRAFFIC CACHED READS (Served Instantly from SQLite) ---

    if (action === "getMissionSettings") {
      const row = db.prepare('SELECT data_json FROM mission_settings ORDER BY id DESC LIMIT 1').get();
      if (row) return res.json({ status: 'success', data: JSON.parse(row.data_json) });
      return res.json({ status: 'success', data: [] });
    }

    if (action === "getAllData") {
      const allRows = db.prepare('SELECT data_json FROM teams').all();
      return res.json({ status: 'success', data: allRows.map(r => JSON.parse(r.data_json)) });
    }

    if (action === "getParticipantData") {
      const { nama } = data;
      const row = db.prepare('SELECT data_json FROM teams WHERE name = ?').get(nama);
      if (row) return res.json({ status: 'success', data: JSON.parse(row.data_json) });
      return res.json({ status: 'error', message: 'Tim tidak ditemukan' });
    }

    if (action === "getPekaResponses") {
      const { teamName } = data;
      let rows;
      if (teamName) {
        rows = db.prepare('SELECT data_json FROM peka_responses WHERE team_name = ? ORDER BY id DESC').all(teamName);
      } else {
        rows = db.prepare('SELECT data_json FROM peka_responses ORDER BY id DESC').all();
      }
      return res.json({ status: 'success', data: rows.map(r => JSON.parse(r.data_json)) });
    }

    // --- 2. HIGH TRAFFIC WRITES (Queued to SQLite, Uploaded in Background) ---

    if (action === "uploadPekaPhoto") {
      const { timestamp, teamName, namaWarga, fileData, mimeType, fileName } = data;
      
      // Save base64 to local disk temporarily
      const base64Data = fileData.replace(/^data:image\/\\w+;base64,/, "");
      const safeName = Date.now() + "_" + fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
      const localPath = path.join(__dirname, 'uploads', safeName);
      
      if (!fs.existsSync(path.join(__dirname, 'uploads'))) {
        fs.mkdirSync(path.join(__dirname, 'uploads'));
      }
      
      fs.writeFileSync(localPath, base64Data, 'base64');
      
      // Insert into photo_queue
      const stmt = db.prepare(`
        INSERT INTO photo_queue (timestamp, team_name, nama_warga, local_file_path, mime_type)
        VALUES (?, ?, ?, ?, ?)
      `);
      stmt.run(timestamp, teamName, namaWarga, localPath, mimeType);
      
      return res.json({ status: 'success', message: 'Foto berhasil diupload dan masuk antrean VPS!' });
    }

    // --- 3. LOW TRAFFIC ADMIN WRITES (Proxy directly to GAS) ---
    // Actions like register, loginWithEmail, createTeam, upload, createMission, updateMissionSetting, etc.
    
    if (GAS_URL) {
      console.log("[Proxy] Forwarding action '" + action + "' to GAS...");
      const gasResponse = await axios.post(GAS_URL, data, {
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }
      });
      return res.json(gasResponse.data);
    } else {
      return res.status(500).json({ status: 'error', message: 'GAS_URL not configured for proxying' });
    }

  } catch (err) {
    console.error('[Server Error]:', err.message);
    res.status(500).json({ status: 'error', message: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log("Hybrid Backend listening on port " + PORT);
});
