const { readSheet, getSheetNames } = require('./googleService');
const db = require('./db');

function buildQrisMap(qrisData) {
  const qrisMap = {};
  if (!qrisData || qrisData.length < 2) return qrisMap;
  
  for (let i = 1; i < qrisData.length; i++) {
    const namaTim = qrisData[i][1];
    const misiId = qrisData[i][2];
    const member = qrisData[i][3];
    const folderUrl = qrisData[i][7] || qrisData[i][4];
    
    if (!qrisMap[namaTim]) qrisMap[namaTim] = {};
    if (!qrisMap[namaTim][misiId]) {
      qrisMap[namaTim][misiId] = { status: "Selesai", folderUrl: folderUrl || "", submittedMembers: [], rawContent: "Disubmit via Data QRIS" };
    }
    
    if (member && !qrisMap[namaTim][misiId].submittedMembers.includes(member)) {
      qrisMap[namaTim][misiId].submittedMembers.push(member);
    }
    if (folderUrl && !qrisMap[namaTim][misiId].folderUrl) {
      qrisMap[namaTim][misiId].folderUrl = folderUrl;
    }
  }
  return qrisMap;
}

function getBaseMissions(misiData) {
  const baseMissions = {};
  if (!misiData || misiData.length < 2) return baseMissions;
  
  for (let i = 1; i < misiData.length; i++) {
    const misiId = misiData[i][0];
    if (misiId) {
      baseMissions[misiId] = { status: "Belum", folderUrl: "", submittedMembers: [], rawContent: "" };
    }
  }
  return baseMissions;
}

async function syncAllData() {
  try {
    console.log('🔄 Polling Data from Google Sheets...');
    
    const qrisData = await readSheet('Data QRIS').catch(() => []);
    const misiData = await readSheet('Pengaturan Misi').catch(() => []);
    
    const qrisMap = buildQrisMap(qrisData);
    const baseMissions = getBaseMissions(misiData);

    // 1. Sync Data Tim
    const timData = await readSheet('Data Tim');
    if (timData.length > 1) {
      const headers = timData[0];
      let emailCol = 3;
      for (let c = 0; c < headers.length; c++) {
        if (headers[c].toString().toLowerCase().includes("email")) emailCol = c;
      }

      const participants = [];
      for (let i = 1; i < timData.length; i++) {
        const namaTim = timData[i][1];
        const teamMissions = JSON.parse(JSON.stringify(baseMissions));
        
        const teamQris = qrisMap[namaTim] || {};
        for (const misiId in teamQris) {
          teamMissions[misiId] = teamQris[misiId];
        }

        participants.push({
          "Timestamp": timData[i][0],
          "Nama Tim": namaTim,
          "Folder ID Tim": timData[i][2],
          "Email Akses": timData[i][emailCol],
          "missions": teamMissions
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

        // Include loose photos from Data PeKA (like Bulk Upload)
        if (pekaData && pekaData.length > 1) {
          for (let i = 1; i < pekaData.length; i++) {
            const timestampStr = pekaData[i][0] ? pekaData[i][0].toString() : "";
            const teamNameStr = pekaData[i][1] ? pekaData[i][1].toString() : "";
            const namaWargaStr = pekaData[i][2] ? pekaData[i][2].toString() : "";
            const photoUrlStr = pekaData[i][3] ? pekaData[i][3].toString() : "";
            
            if (timestampStr && namaWargaStr) {
              const key = timestampStr + "_" + namaWargaStr;
              // Check if it's already in responses
              const exists = responses.some(r => r.responseId === key);
              if (!exists && photoUrlStr) {
                responses.push({
                  timestamp: timestampStr,
                  teamName: teamNameStr,
                  namaWarga: namaWargaStr,
                  responseId: key,
                  responsesJSON: [],
                  photoUrl: photoUrlStr,
                  skor: null
                });
              }
            }
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
