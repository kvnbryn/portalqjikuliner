const { readSheet, getSheetNames } = require('./googleService');
const db = require('./db');

// helper function to simulate parseTimMissions
function parseTimMissions(row, headers) {
  const missions = {};
  for (let c = 4; c < headers.length; c++) {
    const colName = headers[c];
    if (colName && colName.includes("(ID: ")) {
      const idMatch = colName.match(/\(ID: (.*?)\)/);
      if (idMatch && idMatch[1]) {
        const misiId = idMatch[1];
        const cellContent = row[c] ? row[c].toString() : "";
        
        missions[misiId] = { status: "Belum", folderUrl: "", submittedMembers: [], rawContent: cellContent };
        
        if (cellContent) {
           missions[misiId].status = "Selesai";
           const urlMatch = cellContent.match(/(https:\/\/drive\.google\.com[^\s]+)/);
           if (urlMatch) missions[misiId].folderUrl = urlMatch[0];
           
           const memberRegex = /\[Pengumpul:\s*(.*?)(?:\s*\(.*?\))?\]/g;
           let match;
           while ((match = memberRegex.exec(cellContent)) !== null) {
             if (match[1]) missions[misiId].submittedMembers.push(match[1].trim());
           }
           missions[misiId].submittedMembers = [...new Set(missions[misiId].submittedMembers)];
        }
      }
    }
  }
  return missions;
}

async function syncAllData() {
  try {
    console.log('🔄 Polling Data from Google Sheets...');
    
    // 1. Sync Data Tim
    const timData = await readSheet('Data Tim');
    if (timData.length > 1) {
      const headers = timData[0];
      const participants = [];
      for (let i = 1; i < timData.length; i++) {
        participants.push({
          "Timestamp": timData[i][0],
          "Nama Tim": timData[i][1],
          "Folder ID Tim": timData[i][2],
          "Email Akses": timData[i][3],
          "missions": parseTimMissions(timData[i], headers)
        });
      }
      
      // Update SQLite
      db.prepare('DELETE FROM teams').run(); // clear old data
      const insertTeam = db.prepare('INSERT INTO teams (name, data_json) VALUES (?, ?)');
      for (const p of participants) {
        insertTeam.run(p["Nama Tim"], JSON.stringify(p));
      }
    }

    // 2. Sync Pengaturan Misi
    const misiDataRaw = await readSheet('Pengaturan Misi');
    if (misiDataRaw.length > 1) {
      const settings = [];
      for (let i = 1; i < misiDataRaw.length; i++) {
        settings.push({
          id: misiDataRaw[i][0],
          kategori: misiDataRaw[i][1],
          deskripsi: misiDataRaw[i][2],
          deadline: misiDataRaw[i][3],
          statusManual: misiDataRaw[i][4],
          formSchema: misiDataRaw[i][5],
          visibility: misiDataRaw[i][6],
          requiresForm: misiDataRaw[i][7]
        });
      }
      db.prepare('DELETE FROM mission_settings').run();
      db.prepare('INSERT INTO mission_settings (data_json) VALUES (?)').run(JSON.stringify(settings));
    }

    // 3. Sync Data PeKA (Form Responses)
    const sheetNames = await getSheetNames();
    let formSheetName = null;
    for (const name of sheetNames) {
      const lower = name.toLowerCase();
      if (lower.includes("form responses") || lower.includes("form tanggapan") || lower.includes("jawaban form")) {
        formSheetName = name;
        break;
      }
    }

    if (formSheetName) {
      const formData = await readSheet(formSheetName);
      if (formData.length > 1) {
        const headers = formData[0];
        let timCol = -1, namaCol = -1, skorCol = -1;
        
        for (let c = 0; c < headers.length; c++) {
          const h = headers[c] ? headers[c].toString().toLowerCase() : "";
          if (h !== "timestamp" && (h.includes("tim") || h.includes("team")) && timCol === -1) timCol = c;
          else if (h !== "timestamp" && (h.includes("nama") || h.includes("name")) && namaCol === -1) namaCol = c;
          else if ((h.includes("skor") || h.includes("score")) && skorCol === -1) skorCol = c;
        }
        
        if (timCol === -1) timCol = 1;
        if (namaCol === -1) namaCol = 2;

        let photoMap = {};
        const pekaData = await readSheet("Data PeKA").catch(() => []);
        if (pekaData && pekaData.length > 1) {
          for (let i = 1; i < pekaData.length; i++) {
            if (pekaData[i][0] && pekaData[i][2]) {
              const key = pekaData[i][0] + "_" + pekaData[i][2];
              photoMap[key] = pekaData[i][3] || "";
            }
          }
        }

        const responses = [];
        for (let i = 1; i < formData.length; i++) {
          const rowTeamName = formData[i][timCol] ? formData[i][timCol].toString().trim() : "";
          if (rowTeamName) {
            let resJSON = [];
            for (let c = 0; c < headers.length; c++) {
              if (c !== timCol && c !== namaCol && c !== 0) {
                resJSON.push({ question: headers[c], answer: formData[i][c] });
              }
            }
            const timestampStr = formData[i][0] ? formData[i][0].toString() : "";
            const namaWargaStr = formData[i][namaCol] ? formData[i][namaCol].toString() : "Responden";
            const key = timestampStr + "_" + namaWargaStr;
            const skorStr = skorCol !== -1 && formData[i][skorCol] ? formData[i][skorCol].toString() : "";

            responses.push({
              timestamp: timestampStr,
              teamName: rowTeamName,
              namaWarga: namaWargaStr,
              responseId: key,
              responsesJSON: resJSON,
              photoUrl: photoMap[key] || "",
              skor: skorStr
            });
          }
        }

        db.prepare('DELETE FROM peka_responses').run();
        const insertPeka = db.prepare('INSERT INTO peka_responses (team_name, response_id, data_json) VALUES (?, ?, ?)');
        for (const res of responses) {
          try {
            insertPeka.run(res.teamName, res.responseId, JSON.stringify(res));
          } catch(e) {} // ignore duplicate response_ids
        }
      }
    }
    
    console.log('✅ Polling Complete');
  } catch (error) {
    console.error('❌ Poller Error:', error.message);
  }
}

// Run every 30 seconds to prevent Google Apps Script quota limits
setInterval(syncAllData, 30000);

// Run once immediately on start
syncAllData();

module.exports = { syncAllData };
