const GAS_URL = import.meta.env.DEV ? "http://localhost:3001/api" : "/api";
const DIRECT_GAS_URL = "";

// Helper to safely parse JSON
const safeJson = async (response: Response) => {
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error(`Invalid JSON response: ${text.substring(0, 50)}...`);
  }
};

export async function registerParticipant(nama: string) {
  try {
    const response = await fetch(GAS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify({
        action: "register",
        nama: nama
      }),
    });
    return await safeJson(response);
  } catch (error) {
    console.error("Error registering:", error);
    throw error;
  }
}

export async function loginWithEmail(email: string) {
  try {
    const response = await fetch(GAS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify({
        action: "loginWithEmail",
        email: email
      }),
    });
    return await response.json();
  } catch (error) {
    console.error("Error logging in:", error);
    throw error;
  }
}

export async function createTeamAPI(nama: string, emails: string) {
  try {
    const response = await fetch(GAS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify({
        action: "createTeam",
        nama: nama,
        emails: emails
      }),
    });
    return await response.json();
  } catch (error) {
    console.error("Error creating team:", error);
    throw error;
  }
}

export async function getPekaFolderAPI(namaTim: string) {
  try {
    const response = await fetch(GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "getPekaFolder", namaTim })
    });
    return await safeJson(response);
  } catch (error) {
    console.error("Error getting PeKA folder:", error);
    throw error;
  }
}

export async function uploadMissionData(nama: string, missionId: string | number, fileBase64: string, fileName: string, mimeType: string, description: string = "", memberName: string = "", formResponses: any[] = []) {
  try {
    const response = await fetch(DIRECT_GAS_URL || GAS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify({
        action: "upload",
        nama: nama,
        missionId: missionId,
        fileData: fileBase64,
        fileName: fileName,
        mimeType: mimeType,
        description: description,
        memberName: memberName,
        formResponses: formResponses
      }),
    });
    return await response.json();
  } catch (error) {
    console.error("Error uploading:", error);
    throw error;
  }
}

export async function getAllAdminData() {
  try {
    const response = await fetch(GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "getAllData" })
    });
    return await response.json();
  } catch (error) {
    console.error("Error fetching admin data:", error);
    throw error;
  }
}

export async function getParticipantData(nama: string) {
  try {
    const response = await fetch(GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "getParticipantData", nama: nama })
    });
    return await response.json();
  } catch (error) {
    console.error("Error fetching participant data:", error);
    throw error;
  }
}

export async function getMissionFiles(folderUrl: string) {
  try {
    const response = await fetch(DIRECT_GAS_URL || GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "getMissionFiles", folderUrl: folderUrl })
    });
    return await safeJson(response);
  } catch (error) {
    console.error("Error fetching mission files:", error);
    throw error;
  }
}

export async function deleteParticipantAPI(nama: string) {
  try {
    const response = await fetch(GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "deleteParticipant", nama })
    });
    return await response.json();
  } catch (error) {
    console.error("Error deleting participant:", error);
    throw error;
  }
}

export async function editParticipantAPI(oldNama: string, newNama: string, emails: string) {
  try {
    const response = await fetch(GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "editParticipant", oldNama, newNama, emails })
    });
    return await response.json();
  } catch (error) {
    console.error("Error editing participant:", error);
    throw error;
  }
}

export async function getMissionSettingsAPI() {
  try {
    const response = await fetch(DIRECT_GAS_URL || GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "getMissionSettings" })
    });
    return await safeJson(response);
  } catch (error) {
    console.error("Error fetching mission settings:", error);
    throw error;
  }
}

export async function updateMissionSettingAPI(missionId: string | number, deskripsi: string, deadline: string, statusManual: string, kategori?: string, formSchema?: string, visibility?: boolean, requiresForm?: boolean) {
  try {
    const response = await fetch(DIRECT_GAS_URL || GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ 
        action: "updateMissionSetting", 
        missionId, 
        deskripsi, 
        deadline, 
        statusManual,
        kategori,
        formSchema,
        visibility,
        requiresForm
      })
    });
    return await safeJson(response);
  } catch (error) {
    console.error("Error updating mission setting:", error);
    throw error;
  }
}

export async function createMissionAPI(kategori: string, deskripsi: string, deadline?: string, formSchema?: string, visibility?: boolean, requiresForm?: boolean) {
  try {
    const response = await fetch(GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ 
        action: "createMission", 
        kategori, 
        deskripsi, 
        deadline,
        formSchema,
        visibility,
        requiresForm
      })
    });
    return await response.json();
  } catch (error) {
    console.error("Error creating mission:", error);
    throw error;
  }
}

export async function deleteMissionAPI(missionId: string | number) {
  try {
    const response = await fetch(GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ 
        action: "deleteMission", 
        missionId 
      })
    });
    return await response.json();
  } catch (error) {
    console.error("Error deleting mission:", error);
    throw error;
  }
}

export async function submitPekaFormAPI(missionId: string | number, teamName: string, responses: any[]) {
  try {
    const response = await fetch(GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ 
        action: "submitPekaForm", 
        missionId,
        teamName,
        responses
      })
    });
    return await response.json();
  } catch (error) {
    console.error("Error submitting PeKA form:", error);
    throw error;
  }
}

export async function getPekaStatsAPI(missionId: string | number) {
  try {
    const response = await fetch(GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ 
        action: "getPekaStats", 
        missionId 
      })
    });
    return await response.json();
  } catch (error) {
    console.error("Error fetching PeKA stats:", error);
    throw error;
  }
}

export async function getPekaResponsesAPI(teamName?: string) {
  try {
    const response = await fetch(GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ 
        action: "getPekaResponses", 
        teamName
      })
    });
    return await response.json();
  } catch (error) {
    console.error("Error fetching PeKA responses:", error);
    throw error;
  }
}

export async function uploadPekaPhotoAPI(timestamp: string, namaWarga: string, teamName: string, file: File) {
  try {
    const fileData = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split("base64,")[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
      reader.readAsDataURL(file);
    });

    const response = await fetch(DIRECT_GAS_URL || GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ 
        action: "uploadPekaPhoto", 
        timestamp,
        namaWarga,
        teamName,
        fileData,
        fileName: file.name,
        mimeType: file.type
      })
    });
    return await response.json();
  } catch (error) {
    console.error("Error uploading PeKA photo:", error);
    throw error;
  }
}
