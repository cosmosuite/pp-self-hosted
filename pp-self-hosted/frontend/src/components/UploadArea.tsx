import React, { useCallback } from 'react';
import { Upload } from 'lucide-react';

interface UploadAreaProps {
  onFileSelect: (files: File[]) => void;
}

export const UploadArea: React.FC<UploadAreaProps> = ({ onFileSelect }) => {
  const [isDragOver, setIsDragOver] = React.useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files).filter(file => 
      file.type.startsWith('image/')
    );
    
    if (files.length > 0) {
      onFileSelect(files);
    }
  }, [onFileSelect]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length > 0) {
      onFileSelect(files);
    }
  }, [onFileSelect]);

  return (
    <div
      className={`upload-area ${isDragOver ? 'dragover' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      onClick={() => document.getElementById('file-input')?.click()}
    >
      <Upload className="upload-icon" size={64} />
      <div className="upload-text">Upload Images or Videos</div>
      <div className="upload-hint">Drag and drop your files here, or click to upload</div>
      <input
        id="file-input"
        type="file"
        multiple
        accept="image/*"
        onChange={handleFileInput}
        style={{ display: 'none' }}
      />
    </div>
  );
};
