import React from 'react';
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
  const toggleRule = (key: keyof BlurRules) => {
    onBlurRulesChange({ ...blurRules, [key]: !blurRules[key] });
  };

  const categoryGroups = {
    'Face Controls': [
      { key: 'FACE_FEMALE' as keyof BlurRules, label: 'Female Faces' },
      { key: 'FACE_MALE' as keyof BlurRules, label: 'Male Faces' }
    ],
    'NSFW - Critical': [
      { key: 'FEMALE_GENITALIA_EXPOSED' as keyof BlurRules, label: 'Female Genitalia' },
      { key: 'MALE_GENITALIA_EXPOSED' as keyof BlurRules, label: 'Male Genitalia' }
    ],
    'NSFW - High': [
      { key: 'FEMALE_BREAST_EXPOSED' as keyof BlurRules, label: 'Female Breasts' },
      { key: 'ANUS_EXPOSED' as keyof BlurRules, label: 'Anus' }
    ],
    'NSFW - Moderate': [
      { key: 'BUTTOCKS_EXPOSED' as keyof BlurRules, label: 'Buttocks' }
    ],
    'NSFW - Low': [
      { key: 'MALE_BREAST_EXPOSED' as keyof BlurRules, label: 'Male Breasts' },
      { key: 'BELLY_EXPOSED' as keyof BlurRules, label: 'Belly' },
      { key: 'FEET_EXPOSED' as keyof BlurRules, label: 'Feet' },
      { key: 'ARMPITS_EXPOSED' as keyof BlurRules, label: 'Armpits' }
    ]
  };

  return (
    <div className="sidebar">
      <div className="section">
        <h3 className="section-title">Detection Categories</h3>
        
        {Object.entries(categoryGroups).map(([groupName, items]) => (
          <div key={groupName} className="control-group">
            <div className="control-label">{groupName}</div>
            <div className="toggle-group">
              {items.map(({ key, label }) => (
                <div key={key} className="toggle-item">
                  <span className="toggle-label">{label}</span>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={blurRules[key] || false}
                      onChange={() => toggleRule(key)}
                    />
                    <span className="slider"></span>
                  </label>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="control-group">
          <div className="control-label">Advanced Options</div>
          <div className="toggle-group">
            <div className="toggle-item">
              <span className="toggle-label">⭐ Use Face Landmarks</span>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={blurSettings.useFaceLandmarks}
                  onChange={(e) => 
                    onBlurSettingsChange({ ...blurSettings, useFaceLandmarks: e.target.checked })
                  }
                />
                <span className="slider"></span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <div className="section">
        <h3 className="section-title">Blur Settings</h3>
        
        <div className="control-group">
          <div className="control-label">Blur Type</div>
          <div className="toggle-group">
            {['blur', 'pixelation', 'color'].map(type => (
              <div
                key={type}
                className="toggle-item"
                style={{ 
                  background: blurSettings.type === type ? '#667eea' : '#2a2a2a',
                  cursor: 'pointer'
                }}
                onClick={() => onBlurSettingsChange({ ...blurSettings, type: type as any })}
              >
                <span className="toggle-label" style={{ textTransform: 'capitalize' }}>
                  {type}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="control-group">
          <div className="control-label">Intensity</div>
          <div className="slider-control">
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
            <div className="slider-value">
              <span>Light</span>
              <span>{blurSettings.intensity}</span>
              <span>Heavy</span>
            </div>
          </div>
        </div>

        <div className="control-group">
          <div className="control-label">Size</div>
          <div className="slider-control">
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
            <div className="slider-value">
              <span>Small</span>
              <span>{blurSettings.size}</span>
              <span>Large</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
