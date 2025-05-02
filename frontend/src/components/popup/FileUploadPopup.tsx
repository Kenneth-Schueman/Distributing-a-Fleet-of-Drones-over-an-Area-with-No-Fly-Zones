import React, { useState, useRef } from 'react';
import './Popup.css';

interface FileUploadPopupProps {
  isOpen: boolean;
  onClose: (file?: File) => void;
}

const FileUploadPopup: React.FC<FileUploadPopupProps> = ({ isOpen, onClose }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files && event.target.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleSubmit = () => {
    if (selectedFile) {
      onClose(selectedFile);
    } else {
      alert('Please select a target file');
    }
  };

  const handleCancel = () => {
    onClose();
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="loading-overlay">
      <div className="loading-popup file-upload-popup">
        <h3 className="loading-title">Upload Target File</h3>
        <div className="file-upload-content">
          <p>Please upload a target file to continue with the operation.</p>
          <div className="file-input-container">
            <input
              data-testid="file-upload"
              id="file-upload"
              type="file"
              className="file-input"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".json"
              required
            />
            {selectedFile && <div className="file-name">Selected: {selectedFile.name}</div>}
          </div>
          <div className="file-upload-buttons">
            <button className="btn cancel" onClick={handleCancel}>Cancel</button>
            <button 
              className="btn primary" 
              onClick={handleSubmit}
              disabled={!selectedFile}
            >
              Continue
            </button>
          </div>
          <a href="/create-targets" className="doc-link">View documentation</a>
        </div>
      </div>
    </div>
  );
};

export default FileUploadPopup;
