import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [files, setFiles] = useState([]);
  const [currentPath, setCurrentPath] = useState('/');
  const [loading, setLoading] = useState(false);

  // Fetch files from backend
  const fetchFiles = async (path = '/') => {
    setLoading(true);
    try {
      // Adjusted to use your backend route
      const response = await fetch('https://file-access-from-cloud.onrender.com/files');
      const data = await response.json();
      // Fix: Handle the raw array returned by your backend
      setFiles(Array.isArray(data) ? data : []);
      setCurrentPath('/');
    } catch (error) {
      console.error('Error fetching files:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setLoading(true);
    try {
      const response = await fetch('https://file-access-from-cloud.onrender.com/upload', {
        method: 'POST',
        body: formData,
      });
      await response.json();
      fetchFiles(); // Refresh list after upload
    } catch (error) {
      console.error('Error uploading file:', error);
    }
    setLoading(false);
  };

  const getIcon = (fileName) => {
    const ext = fileName.split('.').pop().toLowerCase();
    const icons = {
      pdf: '📄',
      jpg: '🖼️',
      png: '🖼️',
      webp: '🖼️',
    };
    return icons[ext] || '📄';
  };

  return (
    <div className="App">
      <header className="header">
        <h1>📂 Cloud File Manager</h1>
        <p>Current Path: {currentPath}</p>
      </header>

      <div className="controls">
        <label className="upload-btn">
          ⬆️ Upload File
          <input type="file" onChange={handleUpload} disabled={loading} style={{ display: 'none' }} />
        </label>
      </div>

      <div className="file-list">
        {loading ? (
          <p className="loading">Loading...</p>
        ) : files.length === 0 ? (
          <p className="empty">No files yet. Upload one! 📤</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Size</th>
                <th>Uploaded</th>
              </tr>
            </thead>
            <tbody>
              {files.map((file, idx) => (
                <tr key={idx}>
                  <td className="name">
                    <a href={`https://file-access-from-cloud.onrender.com/download/${file.public_id}`} download>
                      {getIcon(file.name)} {file.name}
                    </a>
                  </td>
                  <td>{(file.bytes / 1024).toFixed(2)} KB</td>
                  <td>{new Date(file.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default App;