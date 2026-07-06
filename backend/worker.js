const db = require('./db');
const { uploadFileToDrive } = require('./googleService');
const path = require('path');

const MAIN_FOLDER_ID = process.env.MAIN_FOLDER_ID;

async function processQueue() {
  try {
    // Find one pending photo
    const row = db.prepare("SELECT * FROM photo_queue WHERE status = 'pending' ORDER BY id ASC LIMIT 1").get();

    if (row) {
      console.log(`[Worker] Processing upload queue ID: ${row.id} for team ${row.team_name}`);

      // Update status to processing
      db.prepare("UPDATE photo_queue SET status = 'processing' WHERE id = ?").run(row.id);

      try {
        // Upload to Drive
        // In a real scenario, we should find the team's specific folder ID from the 'teams' table
        // For simplicity, we'll just upload to the main folder for now, or find the team folder ID
        let targetFolderId = MAIN_FOLDER_ID;
        const teamRow = db.prepare("SELECT data_json FROM teams WHERE name = ?").get(row.team_name);
        if (teamRow) {
          const teamData = JSON.parse(teamRow.data_json);
          if (teamData['Folder ID Tim']) {
            targetFolderId = teamData['Folder ID Tim'];
          }
        }

        const fileName = `${row.timestamp}_${row.nama_warga}_${path.basename(row.local_file_path)}`;

        const url = await uploadFileToDrive(row.local_file_path, fileName, row.mime_type, targetFolderId);

        // Mark as completed
        db.prepare("UPDATE photo_queue SET status = 'completed' WHERE id = ?").run(row.id);
        console.log(`[Worker] Successfully uploaded queue ID: ${row.id}`);

        // Note: In full implementation, we also need to append this to Data PeKA sheet

      } catch (uploadError) {
        console.error(`[Worker] Error uploading ID ${row.id}:`, uploadError);
        // Revert to pending for retry later
        db.prepare("UPDATE photo_queue SET status = 'pending', error_message = ? WHERE id = ?").run(uploadError.message, row.id);
      }
    }
  } catch (err) {
    console.error('[Worker] Queue Error:', err.message);
  }
}

// Run queue worker every 5 seconds
setInterval(processQueue, 5000);

module.exports = { processQueue };
