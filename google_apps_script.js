/**
 * GOOGLE APPS SCRIPT - QRIS QJI BACKEND (COMPACT HORIZONTAL DB)
 */

const MAIN_FOLDER_ID = "1dZglLSvYvSmrIoPSj5hNFzLlP3n9A4T4"; 

function setupSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  let sheetTim = ss.getSheetByName("Data Tim");
  if (!sheetTim) {
    sheetTim = ss.insertSheet("Data Tim", 0);
  }
  if (sheetTim.getLastRow() === 0) {
    sheetTim.appendRow(["Timestamp Registrasi", "Nama Tim", "Folder ID Tim", "Email Akses"]);
    sheetTim.getRange("A1:D1").setFontWeight("bold");
    sheetTim.getRange("A1:D1").setBackground("#4f46e5").setFontColor("white");
  }

  let sheetMisi = ss.getSheetByName("Pengaturan Misi");
  if (!sheetMisi) {
    sheetMisi = ss.insertSheet("Pengaturan Misi", 1);
    sheetMisi.appendRow(["Misi ID", "Kategori", "Deskripsi", "Deadline", "Status Manual", "Form Schema", "Visibility", "Requires Form"]);
    sheetMisi.getRange("A1:H1").setFontWeight("bold");
    sheetMisi.getRange("A1:H1").setBackground("#10b981").setFontColor("white");
    sheetMisi.hideSheet(); // Sembunyikan dari pandangan user
  }

  let sheetPeka = ss.getSheetByName("Data PeKA");
  if (!sheetPeka) {
    sheetPeka = ss.insertSheet("Data PeKA", 2);
    sheetPeka.appendRow(["Form Timestamp", "Nama Tim", "Nama Warga", "Photo URL"]);
    sheetPeka.getRange("A1:D1").setFontWeight("bold");
    sheetPeka.getRange("A1:D1").setBackground("#3b82f6").setFontColor("white");
  } else {
    // Pastikan header
    sheetPeka.getRange("A1:D1").setValues([["Form Timestamp", "Nama Tim", "Nama Warga", "Photo URL"]]);
  }
}

/**
 * JALANKAN FUNGSI INI DARI EDITOR APPS SCRIPT UNTUK RESET TOTAL DATABASE
 * WARNING: SEMUA DATA TIM DAN MISI AKAN DIHAPUS.
 */
function resetDatabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  let sheetTim = ss.getSheetByName("Data Tim");
  if (sheetTim) {
    sheetTim.clear();
  } else {
    sheetTim = ss.insertSheet("Data Tim", 0);
  }
  
  let sheetMisi = ss.getSheetByName("Pengaturan Misi");
  if (sheetMisi) {
    sheetMisi.clear();
    sheetMisi.hideSheet(); // Pastikan tetap tersembunyi
  } else {
    sheetMisi = ss.insertSheet("Pengaturan Misi", 1);
    sheetMisi.hideSheet();
  }
  
  const sheets = ss.getSheets();
  sheets.forEach(sheet => {
    const name = sheet.getName();
    if (name !== "Data Tim" && name !== "Pengaturan Misi") {
      try { ss.deleteSheet(sheet); } catch(e) {}
    }
  });
  
  setupSheet();
}

function doOptions(e) {
  return respondSuccess("CORS OK");
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;

    if (action === "register") return registerUser(data.nama);
    if (action === "loginWithEmail") return loginWithEmail(data.email);
    if (action === "upload") return handleUpload(data);
    if (action === "getParticipantData") return getParticipantData(data.nama);
    if (action === "getAllData") return getAllData();
    if (action === "getMissionFiles") return getMissionFiles(data.folderUrl);
    if (action === "deleteParticipant") return deleteParticipant(data.nama);
    if (action === "editParticipant") return editParticipant(data.oldNama, data.newNama, data.emails);
    if (action === "getMissionSettings") return getMissionSettings();
    if (action === "updateMissionSetting") return updateMissionSetting(data);
    if (action === "createMission") return createMission(data);
    if (action === "createTeam") return createTeam(data.nama, data.emails);
    if (action === "deleteMission") return deleteMission(data.missionId);
    if (action === "getPekaStats") return getPekaStats(data.missionId);
    if (action === "getPekaResponses") return getPekaResponses(data.teamName);
    if (action === "uploadPekaPhoto") return uploadPekaPhoto(data);

    return respondError("Action not found");
  } catch (error) {
    return respondError(error.toString());
  }
}

function doGet(e) {
  try {
    const action = e.parameter.action;
    if (action === "getParticipantData") return getParticipantData(e.parameter.nama);
    if (action === "getAllData") return getAllData();
    if (action === "getMissionSettings") return getMissionSettings();
    return respondSuccess("GAS Server is Running. Compact Horizontal DB Active.");
  } catch (error) {
    return respondError(error.toString());
  }
}

function registerUser(nama) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("Data Tim");
  if (!sheet) {
    setupSheet();
    sheet = ss.getSheetByName("Data Tim");
  }
  
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === nama) {
      return respondSuccess({ message: "Login berhasil", folderId: data[i][2] });
    }
  }

  const mainFolder = DriveApp.getFolderById(MAIN_FOLDER_ID);
  const participantFolder = mainFolder.createFolder(nama);
  const folderId = participantFolder.getId();
  participantFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  const newRow = [new Date(), nama, folderId, ""];
  const lastRow = sheet.getLastRow() + 1;
  sheet.getRange(lastRow, 1, 1, 4).setValues([newRow]);

  return respondSuccess({ message: "Registrasi berhasil", folderId: folderId });
}

function loginWithEmail(email) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetTim = ss.getSheetByName("Data Tim");
  if (!sheetTim) return respondError("Data kosong");

  const data = sheetTim.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    const emailsString = data[i][3] ? data[i][3].toString() : "";
    const pairs = emailsString.split(",").map(e => e.trim());
    
    for (const pair of pairs) {
      if (!pair) continue;
      // Format: "Nama Anggota:email@domain.com"
      const parts = pair.split(":");
      if (parts.length === 2) {
        const memberName = parts[0].trim();
        const memberEmail = parts[1].trim().toLowerCase();
        if (memberEmail === email.toLowerCase()) {
          return respondSuccess({ 
            message: "Login berhasil", 
            namaTim: data[i][1], 
            memberName: memberName,
            folderId: data[i][2] 
          });
        }
      } else {
        // Fallback for old format if it was just email
        if (pair.toLowerCase() === email.toLowerCase()) {
           return respondSuccess({ 
            message: "Login berhasil", 
            namaTim: data[i][1], 
            memberName: "Anggota",
            folderId: data[i][2] 
          });
        }
      }
    }
  }
  return respondError("Email belum terdaftar pada tim manapun. Hubungi Admin.");
}

function createTeam(nama, emails) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("Data Tim");
  if (!sheet) {
    setupSheet();
    sheet = ss.getSheetByName("Data Tim");
  }
  
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === nama) {
      return respondError("Tim dengan nama tersebut sudah ada.");
    }
  }

  const mainFolder = DriveApp.getFolderById(MAIN_FOLDER_ID);
  const participantFolder = mainFolder.createFolder(nama);
  const folderId = participantFolder.getId();
  participantFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  const newRow = [new Date(), nama, folderId, emails];
  const lastRow = sheet.getLastRow() + 1;
  sheet.getRange(lastRow, 1, 1, 4).setValues([newRow]);

  return respondSuccess({ message: "Tim berhasil dibuat", folderId: folderId });
}

function handleUpload(data) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000); 
  
  try {
    const { nama, missionId, fileData, fileName, mimeType, description, memberName, formResponses } = data;
    
    // VALIDASI MISI
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheetMisi = ss.getSheetByName("Pengaturan Misi");
    if (!sheetMisi) return respondError("Pengaturan Misi tidak ditemukan");
    
    const misiData = sheetMisi.getDataRange().getValues();
    let missionFound = false;
    let category = "Unknown";
    
    for (let j = 1; j < misiData.length; j++) {
      if (misiData[j][0] == missionId) {
        missionFound = true;
        category = misiData[j][1];
        const deadline = misiData[j][3];
        const status = misiData[j][4];
        
        if (status === "Closed") return respondError(`Misi telah ditutup secara manual.`);
        if (deadline && new Date() > new Date(deadline)) return respondError(`Batas waktu Misi telah berakhir.`);
        break;
      }
    }
    
    if (!missionFound) return respondError("Misi tidak valid");
    
    // CARI KOLOM DI DATA TIM (Nyari ID Misi di Header)
    let sheetTim = ss.getSheetByName("Data Tim");
    const headers = sheetTim.getRange(1, 1, 1, sheetTim.getLastColumn()).getValues()[0];
    let colIndex = -1;
    
    for (let c = 0; c < headers.length; c++) {
      if (headers[c] && headers[c].toString().includes(`(ID: ${missionId})`)) {
        colIndex = c + 1;
        break;
      }
    }
    
    if (colIndex === -1) {
       // Fallback kalau kolom misinya ilang
       colIndex = Math.max(sheetTim.getLastColumn() + 1, 5); // Pastikan misi mulai dari kolom E (5) ke atas
       sheetTim.getRange(1, colIndex).setValue(`Misi - ${category} (ID: ${missionId})`);
       sheetTim.getRange(1, colIndex).setFontWeight("bold").setBackground("#f59e0b").setFontColor("white");
    }
    
    // CARI BARIS TIM
    const sheetTimData = sheetTim.getDataRange().getValues();
    let folderId = "";
    let rowIndex = -1;
    let existingContent = "";
    
    for (let i = 1; i < sheetTimData.length; i++) {
      if (sheetTimData[i][1] === nama) {
        rowIndex = i + 1;
        folderId = sheetTimData[i][2];
        if (sheetTimData[i][colIndex - 1]) existingContent = sheetTimData[i][colIndex - 1];
        break;
      }
    }
    
    if (!folderId || rowIndex === -1) return respondError("Tim tidak ditemukan");
    
    // EKSTRAK LINK FOLDER DARI KONTEN LAMA JIKA ADA
    let missionFolder;
    let existingFolderUrl = "";
    const urlMatch = existingContent.toString().match(/(https:\/\/drive\.google\.com[^\s]+)/);
    if (urlMatch) existingFolderUrl = urlMatch[0];
    
    if (existingFolderUrl) {
      try {
        let extractedId = existingFolderUrl.split("/").pop();
        if (extractedId.includes("?")) extractedId = extractedId.split("?")[0];
        missionFolder = DriveApp.getFolderById(extractedId);
      } catch (e) {}
    }
    
    let folderUrl = existingFolderUrl;
    
    // SIMPAN FILE JIKA ADA
    if (fileData) {
      // BUAT FOLDER BARU JIKA BELUM ADA
      if (!missionFolder) {
        const participantFolder = DriveApp.getFolderById(folderId);
        let categoryFolder = (participantFolder.getFoldersByName(category).hasNext()) ? 
          participantFolder.getFoldersByName(category).next() : participantFolder.createFolder(category);
        
        const folderName = "Misi " + missionId;
        missionFolder = (categoryFolder.getFoldersByName(folderName).hasNext()) ? 
          categoryFolder.getFoldersByName(folderName).next() : categoryFolder.createFolder(folderName);
      }
      
      const byteCharacters = Utilities.base64Decode(fileData);
      const blob = Utilities.newBlob(byteCharacters, mimeType, fileName);
      const file = missionFolder.createFile(blob);
      if (description) file.setDescription(description);
      
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      missionFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      
      folderUrl = missionFolder.getUrl();
    }
    
    // FORMAT CELL SATU KOTAK
    const timestampStr = Utilities.formatDate(new Date(), "Asia/Jakarta", "dd/MM/yyyy HH:mm:ss");
    
    let newSubmission = `[Pengumpul: ${memberName || "Anggota"}]\nWaktu: ${timestampStr}`;
    if (fileData) {
      newSubmission += `\nLink: ${folderUrl}\n\nDeskripsi:\n${description || "-"}`;
    } else {
      newSubmission += `\n(Hanya Jawaban Form)`;
    }
    
    if (formResponses && Array.isArray(formResponses) && formResponses.length > 0) {
       newSubmission += `\n\n--- JAWABAN FORM ---\n`;
       formResponses.forEach(r => {
          newSubmission += `Q: ${r.question}\nA: ${r.answer}\n\n`;
       });
    }
    
    let cellValue = newSubmission.trim();
    if (existingContent) {
       // Append below existing content
       cellValue = existingContent + "\n\n====================\n\n" + cellValue;
    }
    
    const cell = sheetTim.getRange(rowIndex, colIndex);
    cell.setValue(cellValue);
    cell.setWrap(true);
    cell.setVerticalAlignment("top");
    
    return respondSuccess({ message: "File berhasil diupload", folderUrl: folderUrl });
  } catch (error) {
    return respondError(error.toString());
  } finally {
    lock.releaseLock();
  }
}

function parseTimMissions(row, headers) {
  const missions = {};
  for (let c = 0; c < headers.length; c++) {
    const colName = headers[c];
    if (colName && colName.toString().includes("(ID: ")) {
      const idMatch = colName.toString().match(/\(ID: (.*?)\)/);
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
           // Remove duplicates
           missions[misiId].submittedMembers = [...new Set(missions[misiId].submittedMembers)];
        }
      }
    }
  }
  return missions;
}

function getParticipantData(nama) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetTim = ss.getSheetByName("Data Tim");
  if(!sheetTim) return respondError("Sheet Data Tim tidak ditemukan");
  
  const timData = sheetTim.getDataRange().getValues();
  if (timData.length < 1) return respondError("Data kosong");
  
  const headers = timData[0];
  let emailCol = 3;
  for (let c=0; c<headers.length; c++) {
    if (headers[c].toString().toLowerCase().includes("email")) emailCol = c;
  }
  
  for (let i = 1; i < timData.length; i++) {
    if (timData[i][1] === nama) {
      return respondSuccess({
        "Timestamp": timData[i][0],
        "Nama Tim": timData[i][1],
        "Folder ID Tim": timData[i][2],
        "Email Akses": timData[i][emailCol],
        "missions": parseTimMissions(timData[i], headers)
      });
    }
  }
  return respondError("Tim tidak ditemukan");
}

function getAllData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetTim = ss.getSheetByName("Data Tim");
  if(!sheetTim) return respondSuccess([]);
  
  const timData = sheetTim.getDataRange().getValues();
  if (timData.length < 2) return respondSuccess([]);
  
  const headers = timData[0];
  const participants = [];
  
  let emailCol = 3;
  for (let c=0; c<headers.length; c++) {
    if (headers[c].toString().toLowerCase().includes("email")) emailCol = c;
  }
  
  for (let i = 1; i < timData.length; i++) {
    participants.push({
      "Timestamp": timData[i][0],
      "Nama Tim": timData[i][1],
      "Folder ID Tim": timData[i][2],
      "Email Akses": timData[i][emailCol],
      "missions": parseTimMissions(timData[i], headers)
    });
  }
  
  return respondSuccess(participants);
}

function getMissionFiles(folderUrl) {
  try {
    if (!folderUrl) return respondError("Folder URL kosong");
    let folderId = "";
    const match = folderUrl.match(/[-\w]{25,}/);
    if (match) folderId = match[0];
    else return respondError("Folder ID tidak ditemukan");
    
    const folder = DriveApp.getFolderById(folderId);
    const filesIter = folder.getFiles();
    const files = [];
    
    while (filesIter.hasNext()) {
      const file = filesIter.next();
      files.push({
        id: file.getId(),
        name: file.getName(),
        mimeType: file.getMimeType(),
        url: file.getUrl(),
        downloadUrl: `https://lh3.googleusercontent.com/d/${file.getId()}`,
        description: file.getDescription() || ""
      });
    }
    return respondSuccess(files);
  } catch (e) {
    return respondError(e.toString());
  }
}

function deleteParticipant(nama) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheetTim = ss.getSheetByName("Data Tim");
    const timData = sheetTim.getDataRange().getValues();
    
    for (let i = 1; i < timData.length; i++) {
      if (timData[i][1] === nama) {
        const folderId = timData[i][2];
        sheetTim.deleteRow(i + 1);
        if (folderId) try { DriveApp.getFolderById(folderId).setTrashed(true); } catch(e) {}
        return respondSuccess("Tim dihapus");
      }
    }
    return respondError("Tim tidak ditemukan");
  } catch (error) {
    return respondError(error.toString());
  } finally {
    lock.releaseLock();
  }
}

function editParticipant(oldNama, newNama, emails) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Data Tim");
  if (!sheet) return respondError("Database tidak ditemukan");

  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === oldNama) {
      sheet.getRange(i + 1, 2).setValue(newNama);
      if (emails !== undefined) {
        sheet.getRange(i + 1, 4).setValue(emails);
      }
      
      try {
        const folderId = data[i][2];
        if (folderId) {
          const folder = DriveApp.getFolderById(folderId);
          folder.setName(newNama);
        }
      } catch (e) {}

      return respondSuccess("Data tim berhasil diupdate");
    }
  }
  return respondError("Tim tidak ditemukan");
}


function getMissionSettings() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheetMisi = ss.getSheetByName("Pengaturan Misi");
    if (!sheetMisi) {
      setupSheet();
      sheetMisi = ss.getSheetByName("Pengaturan Misi");
    }
    const data = sheetMisi.getDataRange().getValues();
    const settings = [];
    for (let i = 1; i < data.length; i++) {
      settings.push({
        id: data[i][0],
        kategori: data[i][1],
        deskripsi: data[i][2],
        deadline: data[i][3],
        statusManual: data[i][4],
        formSchema: data[i][5] || "[]",
        visibility: data[i][6] !== undefined && data[i][6] !== "" ? data[i][6] : true,
        requiresForm: data[i][7] !== undefined && data[i][7] !== "" ? data[i][7] : true
      });
    }
    return respondSuccess(settings);
  } catch (e) {
    return respondError(e.toString());
  }
}

function updateMissionSetting(data) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheetMisi = ss.getSheetByName("Pengaturan Misi");
    const sheetData = sheetMisi.getDataRange().getValues();
    
    for (let i = 1; i < sheetData.length; i++) {
      if (sheetData[i][0] == data.missionId) {
        if(data.kategori) sheetMisi.getRange(i + 1, 2).setValue(data.kategori);
        sheetMisi.getRange(i + 1, 3).setValue(data.deskripsi);
        sheetMisi.getRange(i + 1, 4).setValue(data.deadline);
        sheetMisi.getRange(i + 1, 5).setValue(data.statusManual);
        if(data.formSchema !== undefined) sheetMisi.getRange(i + 1, 6).setValue(data.formSchema);
        if(data.visibility !== undefined) sheetMisi.getRange(i + 1, 7).setValue(data.visibility);
        if(data.requiresForm !== undefined) sheetMisi.getRange(i + 1, 8).setValue(data.requiresForm);
        
        // Coba update header Data Tim kalau kategorinya ganti
        if (data.kategori) {
           const sheetTim = ss.getSheetByName("Data Tim");
           if (sheetTim) {
              const headers = sheetTim.getRange(1, 1, 1, sheetTim.getLastColumn()).getValues()[0];
              for (let c = 0; c < headers.length; c++) {
                 if (headers[c].includes(`(ID: ${data.missionId})`)) {
                    // Update kategori name in header
                    const numMatch = headers[c].match(/Misi (\d+)/);
                    const num = numMatch ? numMatch[1] : (c-2);
                    sheetTim.getRange(1, c + 1).setValue(`Misi ${num} - ${data.kategori} (ID: ${data.missionId})`);
                 }
              }
           }
        }
        
        return respondSuccess("Berhasil disimpan");
      }
    }
    return respondError("Misi tidak ditemukan");
  } catch (e) {
    return respondError(e.toString());
  } finally {
    lock.releaseLock();
  }
}

function createMission(data) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheetMisi = ss.getSheetByName("Pengaturan Misi");
    const sheetTim = ss.getSheetByName("Data Tim");
    
    const newId = Utilities.getUuid().substring(0,8);
    const deadline = data.deadline || new Date(Date.now() + 24*3600*1000).toISOString();
    
    const visibility = data.visibility !== undefined ? data.visibility : true;
    const requiresForm = data.requiresForm !== undefined ? data.requiresForm : true;
    
    sheetMisi.appendRow([newId, data.kategori, data.deskripsi, deadline, "Open", data.formSchema || "[]", visibility, requiresForm]);
    
    // Auto-create SINGLE column in Data Tim
    if (sheetTim) {
      const lastCol = sheetTim.getLastColumn();
      // count existing missions to assign a nice number
      const headers = sheetTim.getRange(1, 1, 1, lastCol).getValues()[0];
      let missionCount = 0;
      headers.forEach(h => { if(h.includes("(ID:")) missionCount++; });
      const nextNum = missionCount + 1;
      
      const newHeaderCell = sheetTim.getRange(1, lastCol + 1);
      newHeaderCell.setValue(`Misi ${nextNum} - ${data.kategori} (ID: ${newId})`);
      newHeaderCell.setFontWeight("bold");
      newHeaderCell.setBackground("#f59e0b");
      newHeaderCell.setFontColor("white");
      
      // Kasih lebar kolom sedikit lebih besar biar deskripsi enak dibaca
      sheetTim.setColumnWidth(lastCol + 1, 250);
    }
    
    return respondSuccess({ id: newId, message: "Misi berhasil dibuat" });
  } catch(e) {
    return respondError(e.toString());
  } finally {
    lock.releaseLock();
  }
}

function deleteMission(missionId) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheetMisi = ss.getSheetByName("Pengaturan Misi");
    const sheetTim = ss.getSheetByName("Data Tim");
    
    const data = sheetMisi.getDataRange().getValues();
    let deleted = false;
    for(let i = 1; i < data.length; i++) {
      if (data[i][0] == missionId) {
        sheetMisi.deleteRow(i + 1);
        deleted = true;
        break;
      }
    }
    
    if (deleted && sheetTim) {
       const headers = sheetTim.getRange(1, 1, 1, sheetTim.getLastColumn()).getValues()[0];
       for (let c = headers.length - 1; c >= 0; c--) {
         if (headers[c].includes(`(ID: ${missionId})`)) {
           sheetTim.deleteColumn(c + 1);
         }
       }
    }
    
    return respondSuccess("Misi dihapus");
  } catch (e) {
    return respondError(e.toString());
  } finally {
    lock.releaseLock();
  }
}

function respondSuccess(data) {
  return ContentService.createTextOutput(JSON.stringify({ status: "success", data: data }))
    .setMimeType(ContentService.MimeType.JSON);
}

function respondError(msg) {
  return ContentService.createTextOutput(JSON.stringify({ status: "error", message: msg }))
    .setMimeType(ContentService.MimeType.JSON);
}

// === FUNGSI KHUSUS PEKA ===

// Helper: Cari Sheet "Form Responses"
function getFormResponsesSheet(ss) {
  const sheets = ss.getSheets();
  for (let i = 0; i < sheets.length; i++) {
    const name = sheets[i].getName().toLowerCase();
    if (name.includes("form responses") || name.includes("form tanggapan") || name.includes("jawaban form")) {
      return sheets[i];
    }
  }
  return null;
}

function getPekaResponses(teamName) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const formSheet = getFormResponsesSheet(ss);
    if (!formSheet) return respondSuccess([]);
    
    const formData = formSheet.getDataRange().getValues();
    if (formData.length < 2) return respondSuccess([]);
    
    const headers = formData[0];
    let timCol = -1;
    let namaCol = -1;
    let skorCol = -1;
    
    for (let c = 0; c < headers.length; c++) {
      const h = headers[c].toString().toLowerCase();
      if (h !== "timestamp" && (h.includes("tim") || h.includes("team")) && timCol === -1) {
        timCol = c;
      } else if (h !== "timestamp" && (h.includes("nama") || h.includes("name")) && namaCol === -1) {
        namaCol = c;
      } else if ((h.includes("skor") || h.includes("score")) && skorCol === -1) {
        skorCol = c;
      }
    }
    
    if (timCol === -1) timCol = 1;
    if (namaCol === -1) namaCol = 2;
    
    // Read Data PeKA (Photo table)
    let photoMap = {};
    const sheetPeka = ss.getSheetByName("Data PeKA");
    if (sheetPeka) {
      const pekaData = sheetPeka.getDataRange().getValues();
      for (let i = 1; i < pekaData.length; i++) {
        const key = pekaData[i][0] + "_" + pekaData[i][2]; // Timestamp + Nama Warga
        photoMap[key] = pekaData[i][3]; // URL
      }
    }
    
    const responses = [];
    
    for (let i = 1; i < formData.length; i++) {
      const rowTeamName = formData[i][timCol] ? formData[i][timCol].toString().trim() : "";
      if (!teamName || rowTeamName === teamName) {
        
        // Build responses JSON for mini preview
        let resJSON = [];
        for (let c = 0; c < headers.length; c++) {
          if (c !== timCol && c !== namaCol && c !== 0) { // 0 is Timestamp
            resJSON.push({ question: headers[c], answer: formData[i][c] });
          }
        }
        
        const timestampStr = formData[i][0] instanceof Date ? Utilities.formatDate(formData[i][0], "Asia/Jakarta", "dd/MM/yyyy HH:mm:ss") : formData[i][0].toString();
        const namaWargaStr = formData[i][namaCol] ? formData[i][namaCol].toString() : "Responden";
        const key = timestampStr + "_" + namaWargaStr;
        
        const skorStr = skorCol !== -1 ? formData[i][skorCol].toString() : "";
        
        responses.push({
          timestamp: timestampStr,
          teamName: rowTeamName,
          namaWarga: namaWargaStr,
          responseId: key, // Use key as ID
          responsesJSON: resJSON,
          photoUrl: photoMap[key] || "",
          skor: skorStr
        });
      }
    }
    
    return respondSuccess(responses.reverse()); // Terbaru di atas
  } catch (error) {
    return respondError(error.toString());
  }
}

function uploadPekaPhoto(data) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000); 
  try {
    const { timestamp, teamName, namaWarga, fileData, fileName, mimeType } = data;
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheetPeka = ss.getSheetByName("Data PeKA");
    if (!sheetPeka) {
       setupSheet();
       sheetPeka = ss.getSheetByName("Data PeKA");
    }
    
    // Cari index baris di Data PeKA berdasarkan timestamp dan namaWarga
    const pekaData = sheetPeka.getDataRange().getValues();
    let rowIndex = -1;
    for (let i = 1; i < pekaData.length; i++) {
      if (pekaData[i][0] === timestamp && pekaData[i][2] === namaWarga) {
        rowIndex = i + 1;
        break;
      }
    }
    
    // Upload ke folder tim
    const sheetTim = ss.getSheetByName("Data Tim");
    const timData = sheetTim.getDataRange().getValues();
    let folderId = "";
    for (let i = 1; i < timData.length; i++) {
      if (timData[i][1] === teamName) {
        folderId = timData[i][2];
        break;
      }
    }
    
    if (!folderId) return respondError("Folder Tim tidak ditemukan");
    
    const participantFolder = DriveApp.getFolderById(folderId);
    let pekaFolder = (participantFolder.getFoldersByName("Dokumentasi PeKA").hasNext()) ? 
          participantFolder.getFoldersByName("Dokumentasi PeKA").next() : participantFolder.createFolder("Dokumentasi PeKA");
    
    const byteCharacters = Utilities.base64Decode(fileData);
    const blob = Utilities.newBlob(byteCharacters, mimeType, fileName);
    const file = pekaFolder.createFile(blob);
    
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    pekaFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    const fileUrl = file.getUrl();
    
    // Update atau Append Data PeKA
    if (rowIndex !== -1) {
      sheetPeka.getRange(rowIndex, 4).setValue(fileUrl);
    } else {
      sheetPeka.appendRow([timestamp, teamName, namaWarga, fileUrl]);
    }
    
    return respondSuccess({ message: "Foto berhasil diupload", photoUrl: fileUrl });
  } catch (error) {
    return respondError(error.toString());
  } finally {
    lock.releaseLock();
  }
}

function getPekaStats(missionId) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // Ambil semua tim dari Data Tim
    const sheetTim = ss.getSheetByName("Data Tim");
    const timData = sheetTim ? sheetTim.getDataRange().getValues() : [];
    
    const stats = [];
    const teamMap = {};
    
    for (let i = 1; i < timData.length; i++) {
      const teamName = timData[i][1];
      teamMap[teamName] = { formCount: 0, docCount: 0 };
    }
    
    // Hitung jumlah form dari Form Responses Google Form
    const formSheet = getFormResponsesSheet(ss);
    if (formSheet) {
      const formData = formSheet.getDataRange().getValues();
      if (formData.length > 1) {
        const headers = formData[0];
        let timCol = -1;
        for (let c = 0; c < headers.length; c++) {
          const h = headers[c].toString().toLowerCase();
          if (h !== "timestamp" && (h.includes("tim") || h.includes("team") || h.includes("nama tim"))) {
            timCol = c; break;
          }
        }
        if (timCol === -1) timCol = 1;
        
        for (let i = 1; i < formData.length; i++) {
          const tName = formData[i][timCol] ? formData[i][timCol].toString().trim() : "";
          if (tName) {
            if (!teamMap[tName]) teamMap[tName] = { formCount: 0, docCount: 0 };
            teamMap[tName].formCount++;
          }
        }
      }
    }
    
    // Hitung jumlah dokumentasi (foto) dari Data PeKA
    const sheetPeka = ss.getSheetByName("Data PeKA");
    if (sheetPeka) {
      const pekaData = sheetPeka.getDataRange().getValues();
      for (let i = 1; i < pekaData.length; i++) {
         const tName = pekaData[i][1] ? pekaData[i][1].toString().trim() : "";
         if (tName && pekaData[i][3]) {
           if (!teamMap[tName]) teamMap[tName] = { formCount: 0, docCount: 0 };
           teamMap[tName].docCount++;
         }
      }
    }
    
    for (const teamName in teamMap) {
      stats.push({
        teamName: teamName,
        formCount: teamMap[teamName].formCount,
        docCount: teamMap[teamName].docCount
      });
    }
    
    return respondSuccess(stats);
  } catch (error) {
    return respondError(error.toString());
  }
}
