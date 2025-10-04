import React from 'react';
import { ProcessResult } from '../types';
import { Download, Upload, RefreshCw } from 'lucide-react';

interface CanvasProps {
  imageUrl: string | null;
  result: ProcessResult | null;
  censoredImageUrl: string | null;
  onReprocess: () => void;
  onReset: () => void;
}

export const Canvas: React.FC<CanvasProps> = ({ imageUrl, result, censoredImageUrl, onReprocess, onReset }) => {
  const getRiskClass = (risk: string) => {
    switch (risk.toLowerCase()) {
      case 'critical': return 'risk-critical';
      case 'high': return 'risk-high';
      case 'moderate': return 'risk-moderate';
      case 'low': return 'risk-low';
      case 'safe': return 'risk-safe';
      default: return '';
    }
  };

  return (
    <div className="canvas-area">
      {imageUrl ? (
        <>
          <div className="preview-container">
            <img 
              src={censoredImageUrl || imageUrl} 
              alt="Preview" 
              className="preview-image"
            />
          </div>

          {result && result.status === 'success' && (
            <div className="detection-info">
              <div className="detection-stats">
                <div className="stat-item">
                  <span className="stat-label">Detections</span>
                  <span className="stat-value">{result.detections?.length || 0}</span>
                </div>
              </div>

              <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                {censoredImageUrl && (
                  <a 
                    href={censoredImageUrl} 
                    download 
                    className="btn btn-primary"
                  >
                    <Download size={18} />
                    Download Blurred Image
                  </a>
                )}
                <button 
                  onClick={onReprocess} 
                  className="btn btn-secondary"
                  title="Reprocess with current settings"
                >
                  <RefreshCw size={18} />
                  Reprocess
                </button>
                <button 
                  onClick={onReset} 
                  className="btn btn-secondary"
                  title="Upload a new image"
                >
                  <Upload size={18} />
                  New Image
                </button>
              </div>
            </div>
          )}
          
          {result && !result.data && result.status === 'error' && (
            <div className="error-message">
              Error: {result.error || 'Processing failed'}
            </div>
          )}
        </>
      ) : (
        <div className="preview-container">
          <div style={{ textAlign: 'center', color: '#9ca3af' }}>
            <p>No image selected</p>
            <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
              Upload an image to get started
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
