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
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    'NSFW - Critical': true,
    'NSFW - High': true,
    'NSFW - Moderate': false,
    'NSFW - Low': false,
    'Face Controls': false,
    'Advanced': false,
    'Blur Settings': true
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const toggleRule = (key: keyof BlurRules) => {
    onBlurRulesChange({ ...blurRules, [key]: !blurRules[key] });
  };

  const categoryGroups = {
    'NSFW - Critical': [
      { key: 'FEMALE_GENITALIA_EXPOSED' as keyof BlurRules, label: 'Female' },
      { key: 'MALE_GENITALIA_EXPOSED' as keyof BlurRules, label: 'Male' }
    ],
    'NSFW - High': [
      { key: 'FEMALE_BREAST_EXPOSED' as keyof BlurRules, label: 'Breasts' },
      { key: 'ANUS_EXPOSED' as keyof BlurRules, label: 'Anus' }
    ],
    'NSFW - Moderate': [
      { key: 'BUTTOCKS_EXPOSED' as keyof BlurRules, label: 'Buttocks' }
    ],
    'NSFW - Low': [
      { key: 'MALE_BREAST_EXPOSED' as keyof BlurRules, label: 'M. Chest' },
      { key: 'BELLY_EXPOSED' as keyof BlurRules, label: 'Belly' },
      { key: 'FEET_EXPOSED' as keyof BlurRules, label: 'Feet' },
      { key: 'ARMPITS_EXPOSED' as keyof BlurRules, label: 'Armpits' }
    ],
    'Face Controls': [
      { key: 'FACE_FEMALE' as keyof BlurRules, label: 'Female' },
      { key: 'FACE_MALE' as keyof BlurRules, label: 'Male' }
    ]
  };

  return (
    <div className="sidebar">
      <div className="section">
        <h3 className="section-title">Detection Categories</h3>
        
        {Object.entries(categoryGroups).map(([groupName, items]) => (
          <div key={groupName} className="accordion-item">
            <div className="accordion-header" onClick={() => toggleSection(groupName)}>
              {expandedSections[groupName] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              <span>{groupName}</span>
              <span className="badge">{items.filter(i => blurRules[i.key]).length}/{items.length}</span>
            </div>
            {expandedSections[groupName] && (
              <div className="accordion-content">
                <div className="compact-toggle-grid">
                  {items.map(({ key, label }) => (
                    <div key={key} className="compact-toggle">
                      <label className="compact-toggle-label">
                        <input
                          type="checkbox"
                          checked={blurRules[key] || false}
                          onChange={() => toggleRule(key)}
                        />
                        <span>{label}</span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}

        <div className="accordion-item">
          <div className="accordion-header" onClick={() => toggleSection('Advanced')}>
            {expandedSections['Advanced'] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            <span>Advanced Options</span>
          </div>
          {expandedSections['Advanced'] && (
            <div className="accordion-content">
              <div className="compact-toggle">
                <label className="compact-toggle-label">
                  <input
                    type="checkbox"
                    checked={blurSettings.useFaceLandmarks}
                    onChange={(e) => 
                      onBlurSettingsChange({ ...blurSettings, useFaceLandmarks: e.target.checked })
                    }
                  />
                  <span>⭐ Face Landmarks</span>
                </label>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="section">
        <div className="accordion-item">
          <div className="accordion-header" onClick={() => toggleSection('Blur Settings')}>
            {expandedSections['Blur Settings'] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            <span>Blur Settings</span>
          </div>
          {expandedSections['Blur Settings'] && (
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
    </div>
  );
};
