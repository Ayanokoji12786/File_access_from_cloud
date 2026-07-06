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
      const response = await fetch(`https://file-access-from-cloud.onrender.com/files?path=${path}`);
      const data = await response.json();
      setFiles(Array.isArray(data) ? data : []);
      setCurrentPath(data.currentPath || '/');
    } catch (error) {
      console.error('Error fetching files:', error);
    }
    setLoading(false);
  };

  // Load files on mount
  useEffect(() => {
    fetchFiles();
  }, []);

  // Handle file upload
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
      const data = await response.json();
      console.log('Upload successful:', data);
      fetchFiles(currentPath); // Refresh file list
    } catch (error) {
      console.error('Error uploading file:', error);
    }
    setLoading(false);
  };

  // Get icon based on file type
  const getIcon = (file) => {
    if (file.type === 'folder') return '📁';
    const ext = file.name.split('.').pop().toLowerCase();
    const icons = {
      pdf: '📄',
      doc: '📝',
      docx: '📝',
      txt: '📄',
      jpg: '🖼️',
      png: '🖼️',
      mp4: '🎬',
      mp3: '🎵',
      zip: '📦',
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
          <input
            type="file"
            onChange={handleUpload}
            disabled={loading}
            style={{ display: 'none' }}
          />
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
                <th>Type</th>
                <th>Size</th>
                <th>Modified</th>
              </tr>
            </thead>
            <tbody>
              {files.map((file, idx) => (
                <tr key={idx}>
                  <td className="name">
                    <span>{getIcon(file)}</span> {file.name}
                  </td>
                  <td>{file.type}</td>
                  <td>{(file.size / 1024).toFixed(2)} KB</td>
                  <td>{new Date(file.modified).toLocaleString()}</td>
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