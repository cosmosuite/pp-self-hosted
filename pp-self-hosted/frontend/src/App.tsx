import React, { useState, useEffect } from 'react';
import './App.css';
import { UploadArea } from './components/UploadArea';
import { Controls } from './components/Controls';
import { Canvas } from './components/Canvas';
import { Queue } from './components/Queue';
import { api } from './services/api';
import { BlurRules, BlurSettings, FileQueueItem, ProcessResult } from './types';

function App() {
  const [backendStatus, setBackendStatus] = useState<'online' | 'offline'>('offline');
  const [queue, setQueue] = useState<FileQueueItem[]>([]);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [currentResult, setCurrentResult] = useState<ProcessResult | null>(null);
  const [censoredImageUrl, setCensoredImageUrl] = useState<string | null>(null);
  
  const [blurRules, setBlurRules] = useState<BlurRules>({
    FEMALE_GENITALIA_EXPOSED: true,
    MALE_GENITALIA_EXPOSED: true,
    FEMALE_BREAST_EXPOSED: true,
    ANUS_EXPOSED: true,
    BUTTOCKS_EXPOSED: true,
    FACE_FEMALE: false,
    FACE_MALE: false,
  });

  const [blurSettings, setBlurSettings] = useState<BlurSettings>({
    type: 'blur',
    intensity: 50,
    size: 50,
    useFaceLandmarks: true
  });

  useEffect(() => {
    checkHealth();
  }, []);

  const checkHealth = async () => {
    try {
      const health = await api.healthCheck();
      setBackendStatus(health.runpod?.status === 'online' ? 'online' : 'offline');
    } catch {
      setBackendStatus('offline');
    }
  };

  const handleFileSelect = async (files: File[]) => {
    const newItems: FileQueueItem[] = files.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      status: 'pending'
    }));

    setQueue(prev => [...prev, ...newItems]);

    for (const item of newItems) {
      await processFile(item);
    }
  };

  const processFile = async (item: FileQueueItem) => {
    setQueue(prev => prev.map(q => 
      q.id === item.id ? { ...q, status: 'processing' } : q
    ));

    const imageUrl = URL.createObjectURL(item.file);
    setCurrentImage(imageUrl);

    try {
      const result = await api.processImage(
        item.file,
        true,
        0.25,
        blurRules,
        blurSettings.useFaceLandmarks
      );

      setCurrentResult(result);
      
      if (result.censored_image) {
        const censoredUrl = api.getCensoredImageUrl(result.censored_image);
        setCensoredImageUrl(censoredUrl);
      }

      setQueue(prev => prev.map(q => 
        q.id === item.id ? { ...q, status: 'completed', result } : q
      ));
    } catch (error: any) {
      setQueue(prev => prev.map(q => 
        q.id === item.id ? { 
          ...q, 
          status: 'error', 
          error: error.message || 'Processing failed' 
        } : q
      ));
    }
  };

  return (
    <div className="app">
      <header className="header">
        <div className="logo">🔒 Peep Peep</div>
        <div className="header-actions">
          <div className="status-indicator">
            <div className={`status-dot status-${backendStatus}`}></div>
            <span>RunPod: {backendStatus}</span>
          </div>
        </div>
      </header>

      <div className="main-content">
        <Controls
          blurRules={blurRules}
          blurSettings={blurSettings}
          onBlurRulesChange={setBlurRules}
          onBlurSettingsChange={setBlurSettings}
        />

        {currentImage ? (
          <Canvas
            imageUrl={currentImage}
            result={currentResult}
            censoredImageUrl={censoredImageUrl}
          />
        ) : (
          <div className="canvas-area">
            <UploadArea onFileSelect={handleFileSelect} />
          </div>
        )}

        <Queue queue={queue} />
      </div>
    </div>
  );
}

export default App;
