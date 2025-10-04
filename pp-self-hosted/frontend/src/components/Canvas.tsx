import React from 'react';
import { ProcessResult } from '../types';
import { Download } from 'lucide-react';

interface CanvasProps {
  imageUrl: string | null;
  result: ProcessResult | null;
  censoredImageUrl: string | null;
}

export const Canvas: React.FC<CanvasProps> = ({ imageUrl, result, censoredImageUrl }) => {
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

          {result && (
            <div className="detection-info">
              <div className="detection-stats">
                <div className="stat-item">
                  <span className="stat-label">Detections</span>
                  <span className="stat-value">{result.data.detections_count}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Risk Level</span>
                  <span className={`stat-value ${getRiskClass(result.data.risk_level)}`}>
                    {result.data.risk_level}
                  </span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Status</span>
                  <span className={`stat-value ${result.data.is_safe ? 'risk-safe' : 'risk-critical'}`}>
                    {result.data.is_safe ? 'Safe' : 'NSFW'}
                  </span>
                </div>
              </div>

              {censoredImageUrl && (
                <div style={{ marginTop: '1rem' }}>
                  <a 
                    href={censoredImageUrl} 
                    download 
                    className="btn btn-primary"
                  >
                    <Download size={18} />
                    Download Blurred Image
                  </a>
                </div>
              )}
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
