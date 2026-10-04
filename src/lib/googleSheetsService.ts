/**
 * Google Sheets & Drive API Integration for VoxClone Voice Lab
 */

export interface GoogleDriveSheet {
  id: string;
  name: string;
  modifiedTime: string;
  webViewLink?: string;
}

export interface SheetRowData {
  timestamp: string;
  text: string;
  voiceName: string;
  style?: string;
  speed?: number;
  pitch?: number;
  charactersUsed: number;
  format?: string;
}

/**
 * Lists Google Spreadsheets accessible by the user via Google Drive API
 */
export async function listGoogleSheets(accessToken: string): Promise<GoogleDriveSheet[]> {
  const query = encodeURIComponent("mimeType='application/vnd.google-apps.spreadsheet' and trashed=false");
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,modifiedTime,webViewLink)&orderBy=modifiedTime desc&pageSize=25`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Failed to list spreadsheets (Status ${res.status})`);
  }

  const data = await res.json();
  return data.files || [];
}

/**
 * Creates a new Google Spreadsheet with default VoxClone Voice Lab columns
 */
export async function createVoxCloneSpreadsheet(
  accessToken: string,
  title: string = 'VoxClone Voice Lab - Speech Production Logs'
): Promise<{ id: string; url: string; title: string }> {
  const res = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title,
      },
      sheets: [
        {
          properties: {
            title: 'Speech Logs',
            gridProperties: {
              frozenRowCount: 1,
            },
          },
          data: [
            {
              startRow: 0,
              startColumn: 0,
              rowData: [
                {
                  values: [
                    { userEnteredValue: { stringValue: 'Timestamp' } },
                    { userEnteredValue: { stringValue: 'Script / Prompt Text' } },
                    { userEnteredValue: { stringValue: 'Voice Name' } },
                    { userEnteredValue: { stringValue: 'Emotion / Nuance' } },
                    { userEnteredValue: { stringValue: 'Speed' } },
                    { userEnteredValue: { stringValue: 'Pitch Shift' } },
                    { userEnteredValue: { stringValue: 'Characters' } },
                    { userEnteredValue: { stringValue: 'Format' } },
                    { userEnteredValue: { stringValue: 'Status' } },
                  ],
                },
              ],
            },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Failed to create spreadsheet (Status ${res.status})`);
  }

  const data = await res.json();
  return {
    id: data.spreadsheetId,
    url: data.spreadsheetUrl,
    title: data.properties?.title || title,
  };
}

/**
 * Appends rows to a spreadsheet
 */
export async function appendSpeechLogsToSheet(
  accessToken: string,
  spreadsheetId: string,
  logs: SheetRowData[]
): Promise<{ updatedRows: number }> {
  const range = 'Speech Logs!A:H';
  const values = logs.map((log) => [
    log.timestamp,
    log.text,
    log.voiceName,
    log.style || 'Default',
    log.speed ? `${log.speed}x` : '1.0x',
    log.pitch ? `${log.pitch > 0 ? '+' : ''}${log.pitch} semitones` : 'Standard',
    log.charactersUsed,
    (log.format || 'mp3').toUpperCase(),
    'Synthesized (MP3)',
  ]);

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
    range
  )}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      values,
    }),
  });

  if (!res.ok) {
    // If 'Speech Logs' sheet doesn't exist, try appending to default Sheet1
    const fallbackRange = 'Sheet1!A:H';
    const fallbackUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
      fallbackRange
    )}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

    const fallbackRes = await fetch(fallbackUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values,
      }),
    });

    if (!fallbackRes.ok) {
      const errorData = await fallbackRes.json().catch(() => ({}));
      throw new Error(errorData.error?.message || 'Failed to append rows to sheet');
    }

    const data = await fallbackRes.json();
    return { updatedRows: data.updates?.updatedRows || values.length };
  }

  const data = await res.json();
  return { updatedRows: data.updates?.updatedRows || values.length };
}

/**
 * Reads voiceover script rows from a Google Sheet
 * Expects columns: Column A: Text/Script, Column B (optional): Voice, Column C (optional): Emotion
 */
export async function readScriptsFromSheet(
  accessToken: string,
  spreadsheetId: string,
  range: string = 'A2:D50'
): Promise<Array<{ text: string; voiceName?: string; style?: string; speed?: number }>> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'Failed to read script data from spreadsheet');
  }

  const data = await res.json();
  const rows: any[][] = data.values || [];

  return rows
    .filter((row) => row && row[0] && String(row[0]).trim().length > 0)
    .map((row) => ({
      text: String(row[0]).trim(),
      voiceName: row[1] ? String(row[1]).trim() : undefined,
      style: row[2] ? String(row[2]).trim() : undefined,
      speed: row[3] && !isNaN(Number(row[3])) ? Number(row[3]) : 1.0,
    }));
}
