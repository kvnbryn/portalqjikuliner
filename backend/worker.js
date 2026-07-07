const db = require('./db');
const axios = require('axios');
const path = require('path');
const fs = require('fs');

const GAS_URL = process.env.GAS_URL;

async function processQueue() {
  if (!GAS_URL) {
    console.error('[Worker] Error: GAS_URL is not set in .env');
    return;
  }

  try {
    // 1. Process Action Queue (General API Requests)
    const actionRow = db.prepare("SELECT * FROM action_queue WHERE status = 'pending' ORDER BY id ASC LIMIT 1").get();
    
    if (actionRow) {
      console.log(`[Worker] Processing action queue ID: ${actionRow.id} (Action: ${actionRow.action_name})`);
      db.prepare("UPDATE action_queue SET status = 'processing' WHERE id = ?").run(actionRow.id);
      
      try {
        const payload = JSON.parse(actionRow.payload_json);
        await axios.post(GAS_URL, payload, {
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          maxContentLength: Infinity,
          maxBodyLength: Infinity
        });
        
        db.prepare("UPDATE action_queue SET status = 'completed' WHERE id = ?").run(actionRow.id);
        console.log(`[Worker] Successfully sent action queue ID: ${actionRow.id}`);
      } catch (err) {
        console.error(`[Worker] Error sending action queue ID ${actionRow.id}:`, err.message);
        db.prepare("UPDATE action_queue SET status = 'pending', error_message = ? WHERE id = ?").run(err.message, actionRow.id);
      }
    }

    // 2. Process Photo Queue (Forward to GAS to bypass Service Account quota)
    const photoRow = db.prepare("SELECT * FROM photo_queue WHERE status = 'pending' ORDER BY id ASC LIMIT 1").get();
    
    if (photoRow) {
      console.log(`[Worker] Processing photo queue ID: ${photoRow.id} for team ${photoRow.team_name}`);
      db.prepare("UPDATE photo_queue SET status = 'processing' WHERE id = ?").run(photoRow.id);
      
      try {
        // Read file and convert to base64
        const fileData = fs.readFileSync(photoRow.local_file_path, { encoding: 'base64' });
        const fileName = `${photoRow.timestamp}_${photoRow.nama_warga}_${path.basename(photoRow.local_file_path)}`;

        const gasPayload = {
          action: "uploadPekaPhoto",
          timestamp: photoRow.timestamp,
          namaWarga: photoRow.nama_warga,
          teamName: photoRow.team_name,
          fileData: fileData,
          fileName: fileName,
          mimeType: photoRow.mime_type
        };

        // Send directly to GAS to use User's 15GB Quota instead of Service Account
        await axios.post(GAS_URL, gasPayload, {
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          maxContentLength: Infinity,
          maxBodyLength: Infinity
        });

        db.prepare("UPDATE photo_queue SET status = 'completed' WHERE id = ?").run(photoRow.id);
        console.log(`[Worker] Successfully forwarded photo queue ID: ${photoRow.id} to GAS`);
      } catch (uploadError) {
        console.error(`[Worker] Error uploading photo ID ${photoRow.id}:`, uploadError.message);
        db.prepare("UPDATE photo_queue SET status = 'pending', error_message = ? WHERE id = ?").run(uploadError.message, photoRow.id);
      }
    }
  } catch (err) {
    console.error('[Worker] Queue Check Error:', err.message);
  }
}

// Run queue worker every 2 seconds for faster processing of forms
setInterval(processQueue, 2000);

module.exports = { processQueue };
