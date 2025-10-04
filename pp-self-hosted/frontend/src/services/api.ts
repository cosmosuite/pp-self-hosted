import axios from 'axios';
import { BlurRules, ProcessResult } from '../types';

const API_BASE = '/api';

export const api = {
  async healthCheck() {
    const response = await axios.get(`${API_BASE}/health`);
    return response.data;
  },

  async getLabels() {
    const response = await axios.get(`${API_BASE}/labels`);
    return response.data;
  },

  async processImage(
    file: File,
    blur: boolean = true,
    threshold: number = 0.25,
    blurRules?: BlurRules,
    useFaceLandmarks: boolean = true
  ): Promise<ProcessResult> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('blur', blur.toString());
    formData.append('threshold', threshold.toString());
    formData.append('use_face_landmarks', useFaceLandmarks.toString());
    
    if (blurRules) {
      formData.append('blur_rules', JSON.stringify(blurRules));
    }

    const response = await axios.post(`${API_BASE}/process`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 60000,
    });

    return response.data;
  },

  getCensoredImageUrl(imagePath: string) {
    return `${API_BASE}/download/${imagePath}`;
  }
};
