import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { BlurRules, BlurSettings } from '../types';

interface ControlsProps {
  blurRules: BlurRules;
  blurSettings: BlurSettings;
  onBlurRulesChange: (rules: BlurRules) => void;
  onBlurSettingsChange: (settings: BlurSettings) => void;
}

export const Controls: React.FC<ControlsProps> = ({
  blurRules,
  blurSettings,
  onBlurRulesChange,
  onBlurSettingsChange
}) => {
  const [expandedSections, setExpandedSections] = useState({
    detections: true,
    blur: true,
    advanced: false
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const toggleRule = (key: keyof BlurRules) => {
    onBlurRulesChange({ ...blurRules, [key]: !blurRules[key] });
  };

  const applyPreset = (preset: 'face' | 'nudity' | 'both') => {
    const faceControls = {
      FACE_FEMALE: true,
      FACE_MALE: true
    };

    const nudityControls = {
      FEMALE_GENITALIA_EXPOSED: true,
      MALE_GENITALIA_EXPOSED: true,
      FEMALE_BREAST_EXPOSED: true,
      ANUS_EXPOSED: true,
      BUTTOCKS_EXPOSED: true,
      MALE_BREAST_EXPOSED: true,
      BELLY_EXPOSED: true,
      FEET_EXPOSED: true,
      ARMPITS_EXPOSED: true
    };

    if (preset === 'face') {
      onBlurRulesChange({ ...faceControls, ...Object.fromEntries(Object.keys(nudityControls).map(k => [k, false])) });
    } else if (preset === 'nudity') {
      onBlurRulesChange({ ...nudityControls, ...Object.fromEntries(Object.keys(faceControls).map(k => [k, false])) });
    } else {
      onBlurRulesChange({ ...faceControls, ...nudityControls });
    }
  };

  const allControls = [
    { key: 'FACE_FEMALE' as keyof BlurRules, label: 'Female Face', category: 'face' },
    { key: 'FACE_MALE' as keyof BlurRules, label: 'Male Face', category: 'face' },
    { key: 'FEMALE_GENITALIA_EXPOSED' as keyof BlurRules, label: 'Female Genitalia', category: 'nudity' },
    { key: 'MALE_GENITALIA_EXPOSED' as keyof BlurRules, label: 'Male Genitalia', category: 'nudity' },
    { key: 'FEMALE_BREAST_EXPOSED' as keyof BlurRules, label: 'Female Breasts', category: 'nudity' },
    { key: 'ANUS_EXPOSED' as keyof BlurRules, label: 'Anus', category: 'nudity' },
    { key: 'BUTTOCKS_EXPOSED' as keyof BlurRules, label: 'Buttocks', category: 'nudity' },
    { key: 'MALE_BREAST_EXPOSED' as keyof BlurRules, label: 'Male Chest', category: 'nudity' },
    { key: 'BELLY_EXPOSED' as keyof BlurRules, label: 'Belly', category: 'nudity' },
    { key: 'FEET_EXPOSED' as keyof BlurRules, label: 'Feet', category: 'nudity' },
    { key: 'ARMPITS_EXPOSED' as keyof BlurRules, label: 'Armpits', category: 'nudity' }
  ];

  return (
    <div className="sidebar">
      <div className="section">
        <h3 className="section-title">Quick Presets</h3>
        <div className="preset-buttons">
          <button className="preset-btn" onClick={() => applyPreset('face')}>
            Face
          </button>
          <button className="preset-btn" onClick={() => applyPreset('nudity')}>
            Nudity
          </button>
          <button className="preset-btn" onClick={() => applyPreset('both')}>
            Both
          </button>
        </div>
      </div>

      <div className="section">
        <div className="accordion-item">
          <div className="accordion-header" onClick={() => toggleSection('detections')}>
            {expandedSections.detections ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            <span>Detections</span>
            <span className="badge">{allControls.filter(c => blurRules[c.key]).length}/{allControls.length}</span>
          </div>
          {expandedSections.detections && (
            <div className="accordion-content">
              <div className="detection-grid">
                {allControls.map(({ key, label }) => (
                  <label key={key} className="detection-checkbox">
                    <input
                      type="checkbox"
                      checked={blurRules[key] || false}
                      onChange={() => toggleRule(key)}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="section">
        <div className="accordion-item">
          <div className="accordion-header" onClick={() => toggleSection('blur')}>
            {expandedSections.blur ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            <span>Blur Settings</span>
          </div>
          {expandedSections.blur && (
            <div className="accordion-content">
              <div className="blur-type-selector">
                {['blur', 'pixelation', 'color'].map(type => (
                  <button
                    key={type}
                    className={`blur-type-btn ${blurSettings.type === type ? 'active' : ''}`}
                    onClick={() => onBlurSettingsChange({ ...blurSettings, type: type as any })}
                  >
                    {type === 'blur' ? 'Blur' : type === 'pixelation' ? 'Pixel' : 'Color'}
                  </button>
                ))}
              </div>

              <div className="compact-slider">
                <label className="compact-slider-label">Intensity</label>
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={blurSettings.intensity}
                  onChange={(e) => 
                    onBlurSettingsChange({ ...blurSettings, intensity: parseInt(e.target.value) })
                  }
                  className="slider-input"
                />
                <span className="slider-value-inline">{blurSettings.intensity}%</span>
              </div>

              <div className="compact-slider">
                <label className="compact-slider-label">Size</label>
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={blurSettings.size}
                  onChange={(e) => 
                    onBlurSettingsChange({ ...blurSettings, size: parseInt(e.target.value) })
                  }
                  className="slider-input"
                />
                <span className="slider-value-inline">{blurSettings.size}%</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="section">
        <div className="accordion-item">
          <div className="accordion-header" onClick={() => toggleSection('advanced')}>
            {expandedSections.advanced ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            <span>Advanced</span>
          </div>
          {expandedSections.advanced && (
            <div className="accordion-content">
              <label className="detection-checkbox">
                <input
                  type="checkbox"
                  checked={blurSettings.useFaceLandmarks}
                  onChange={(e) => 
                    onBlurSettingsChange({ ...blurSettings, useFaceLandmarks: e.target.checked })
                  }
                />
                <span>⭐ Face Landmarks (68-point)</span>
              </label>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
