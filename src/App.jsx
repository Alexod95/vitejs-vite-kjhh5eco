import { useEffect, useRef, useState } from "react";
import "./styles.css";

const BACKEND_URL =
  "https://script.google.com/macros/s/AKfycbzhNwFScWUir9pbFgtg1cTJP2wz0lw5_McuV3gPJmkx20-FGCj1j1UiDz0WUF1mSuT-rw/exec";

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Could not read file"));
  });
}

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export default function App() {
  const fileInputRef = useRef(null);

  const [isUploading, setIsUploading] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [lastSaved, setLastSaved] = useState(null);

  const [folders, setFolders] = useState([]);
  const [selectedFolderId, setSelectedFolderId] = useState("");

  const [sheets, setSheets] = useState([]);
  const [selectedSheetId, setSelectedSheetId] = useState("");

  useEffect(() => {
    loadFolders();
    loadSheets();
  }, []);

  async function fetchJson(url, options = {}) {
    const response = await fetch(url, options);
    const text = await response.text();
    const data = safeJsonParse(text);

    if (!data) throw new Error("Invalid response from server");
    return data;
  }

  async function loadFolders() {
    try {
      const result = await fetchJson(`${BACKEND_URL}?action=folders`);
      setFolders(result.folders || []);
      if (result.folders?.length) {
        setSelectedFolderId(result.folders[0].id);
      }
    } catch (err) {
      setErrorMessage("Failed to load folders");
    }
  }

  async function loadSheets() {
    try {
      const result = await fetchJson(`${BACKEND_URL}?action=sheets`);
      setSheets(result.sheets || []);
      if (result.sheets?.length) {
        setSelectedSheetId(result.sheets[0].id);
      }
    } catch (err) {
      setErrorMessage("Failed to load sheets");
    }
  }

  function openCamera() {
    if (!selectedFolderId || !selectedSheetId) {
      setErrorMessage("Select folder and sheet first");
      return;
    }
    fileInputRef.current?.click();
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);

      const base64 = (await fileToBase64(file)).split(",")[1];

      const result = await fetchJson(BACKEND_URL, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=utf-8"
        },
        body: JSON.stringify({
          image: base64,
          fileName: file.name,
          mimeType: file.type,
          targetFolderId: selectedFolderId,
          targetSheetId: selectedSheetId
        })
      });

      const previewUrl = URL.createObjectURL(file);

      const newPhoto = {
        id: Date.now(),
        name: file.name,
        previewUrl,
        createdAt: new Date().toLocaleTimeString()
      };

      setPhotos((p) => [newPhoto, ...p]);
      setLastSaved(newPhoto);
    } catch (err) {
      setErrorMessage("Upload failed");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  }

  return (
    <div className="app">
      <div className="phone-shell">
        <h1>Mobile Photo App</h1>

        <p className="subtitle">
          Take a photo, upload it automatically, and log it to Google Sheets.
        </p>

        <div className="card">
          <label className="label">Select Spreadsheet</label>
          <select
            className="input"
            value={selectedSheetId}
            onChange={(e) => setSelectedSheetId(e.target.value)}
          >
            {sheets.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          <label className="label">Select Folder</label>
          <select
            className="input"
            value={selectedFolderId}
            onChange={(e) => setSelectedFolderId(e.target.value)}
          >
            {folders.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture
            hidden
            onChange={handleFileChange}
          />

          <button className="cameraButton" onClick={openCamera}>
            {isUploading ? "Uploading..." : "Take Photo"}
          </button>

          {errorMessage && <p className="error">{errorMessage}</p>}
        </div>

        {lastSaved && (
          <div className="success">
            <strong>Saved successfully</strong>
            <div>{lastSaved.name}</div>
          </div>
        )}

        <div className="card">
          <h2>Recent captures</h2>

          {photos.length === 0 ? (
            <p className="empty">No photos yet</p>
          ) : (
            <div className="photoList">
              {photos.map((p) => (
                <div key={p.id} className="photoItem">
                  <img src={p.previewUrl} />
                  <div className="photoMeta">
                    <div className="photoName">{p.name}</div>
                    <div className="photoSmall">{p.createdAt}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h2>Troubleshooting</h2>
          <p className="helper">
            If camera doesn’t open, your browser may show a file picker instead.
          </p>
        </div>
      </div>
    </div>
  );
}