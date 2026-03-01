import axios from 'axios';

const API_BASE_URL = '/api/ai/pro';

export interface ColorGradeRequest {
    input_path: string;
    output_path?: string;
    preset?: string;
    lut_path?: string;
    contrast?: number;
    saturation?: number;
    brightness?: number;
    gamma?: number;
    temperature?: number;
    tint?: number;
}

export interface SpeedRampPoint {
    time: number;
    speed: number;
    curve?: 'linear' | 'ease_in' | 'ease_out' | 'ease_in_out' | 'exponential';
}

export interface SpeedRampRequest {
    input_path: string;
    output_path?: string;
    control_points: SpeedRampPoint[];
}

export interface SceneDetectRequest {
    input_path: string;
    method?: 'threshold' | 'content' | 'adaptive';
    threshold?: number;
}

export interface KeyframeAddRequest {
    property_name: string;
    time: number;
    value: number;
    easing?: 'linear' | 'ease_in' | 'ease_out' | 'ease_in_out' | 'bezier';
}

const aiProAPI = {
    // Color Grading
    applyColorGrade: async (request: ColorGradeRequest) => {
        const response = await axios.post(`${API_BASE_URL}/color-grade`, request);
        return response.data;
    },

    getColorGradePresets: async () => {
        const response = await axios.get(`${API_BASE_URL}/color-grade/presets`);
        return response.data;
    },

    getAvailableLUTs: async () => {
        const response = await axios.get(`${API_BASE_URL}/color-grade/luts`);
        return response.data;
    },

    // Speed Ramping
    applySpeedRamp: async (request: SpeedRampRequest) => {
        const response = await axios.post(`${API_BASE_URL}/speed-ramp`, request);
        return response.data;
    },

    getSpeedCurve: async (points: SpeedRampPoint[]) => {
        const response = await axios.post(`${API_BASE_URL}/speed-ramp/curve`, { control_points: points });
        return response.data;
    },

    // Scene Detection
    detectScenes: async (request: SceneDetectRequest) => {
        const response = await axios.post(`${API_BASE_URL}/scene-detect`, request);
        return response.data;
    },

    getSceneDetectionMethods: async () => {
        const response = await axios.get(`${API_BASE_URL}/scene-detect/methods`);
        return response.data;
    },

    // Keyframes
    addKeyframe: async (request: KeyframeAddRequest) => {
        const response = await axios.post(`${API_BASE_URL}/keyframes/add`, request);
        return response.data;
    },

    getInterpolatedValue: async (propertyName: string, time: number) => {
        const response = await axios.post(`${API_BASE_URL}/keyframes/value`, { property_name: propertyName, time });
        return response.data;
    },

    getTracks: async () => {
        const response = await axios.get(`${API_BASE_URL}/keyframes/tracks`);
        return response.data;
    },

    exportKeyframes: async () => {
        const response = await axios.post(`${API_BASE_URL}/keyframes/export`);
        return response.data;
    },

    importKeyframes: async (data: Record<string, unknown>) => {
        const response = await axios.post(`${API_BASE_URL}/keyframes/import`, data);
        return response.data;
    },

    clearTrack: async (propertyName: string) => {
        const response = await axios.delete(`${API_BASE_URL}/keyframes/tracks/${propertyName}`);
        return response.data;
    },

    // Health
    checkHealth: async () => {
        const response = await axios.get(`${API_BASE_URL}/health`);
        return response.data;
    }
};

export default aiProAPI;
