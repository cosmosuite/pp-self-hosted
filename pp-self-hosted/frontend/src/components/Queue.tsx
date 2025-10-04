import React from 'react';
import { FileQueueItem } from '../types';

interface QueueProps {
  queue: FileQueueItem[];
}

export const Queue: React.FC<QueueProps> = ({ queue }) => {
  return (
    <div className="queue-sidebar">
      <div className="section">
        <h3 className="section-title">Processing Queue</h3>
        
        {queue.length === 0 ? (
          <div style={{ color: '#9ca3af', fontSize: '0.875rem', textAlign: 'center', padding: '2rem 0' }}>
            No files in queue
          </div>
        ) : (
          <div>
            {queue.map((item) => (
              <div key={item.id} className="queue-item">
                <div className="queue-item-header">
                  <span className="queue-item-name">{item.file.name}</span>
                  <span className={`queue-status status-${item.status}`}>
                    {item.status}
                  </span>
                </div>
                {item.error && (
                  <div style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.5rem' }}>
                    {item.error}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
