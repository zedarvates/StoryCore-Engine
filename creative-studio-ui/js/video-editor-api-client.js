/**
 * Video Editor API Client
 * 
 * JavaScript client for communicating with the Video Editor Wizard backend API.
 * Supports all endpoints: Auth, Projects, Media, Export, and AI services.
 * 
 * Author: StoryCore Team
 * Version: 1.0.0
 */

class VideoEditorAPIClient {
    constructor(options = {}) {
        this.baseUrl = options.baseUrl || '/api/video-editor';
        this.accessToken = options.accessToken || localStorage.getItem('ve_access_token');
        this.refreshToken = options.refreshToken || localStorage.getItem('ve_refresh_token');
        this.onTokenRefreshed = options.onTokenRefreshed || null;
        
        // Request queue for token refresh
        this.requestQueue = [];
        this.isRefreshing = false;
    }
    
    // =========================================================================
    // Token Management
    // =========================================================================
    
    setTokens(accessToken, refreshToken) {
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        localStorage.setItem('ve_access_token', accessToken);
        localStorage.setItem('ve_refresh_token', refreshToken);
    }
    
    clearTokens() {
        this.accessToken = null;
        this.refreshToken = null;
        localStorage.removeItem('ve_access_token');
        localStorage.removeItem('ve_refresh_token');
    }
    
    getAuthHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };
        if (this.accessToken) {
            headers['Authorization'] = `Bearer ${this.accessToken}`;
        }
        return headers;
    }
    
    // =========================================================================
    // HTTP Methods
    // =========================================================================
    
    async request(method, endpoint, data = null, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const headers = { ...this.getAuthHeaders() };
        
        // Handle FormData (for file uploads)
        if (data instanceof FormData) {
            delete headers['Content-Type'];
        } else if (data) {
            data = JSON.stringify(data);
        }
        
        const config = {
            method,
            headers,
            ...options
        };
        
        if (data && !(data instanceof FormData)) {
            config.body = data;
        }
        
        try {
            const response = await fetch(url, config);
            
            // Handle 401 - Unauthorized
            if (response.status === 401 && this.refreshToken && !options._noRetry) {
                return this.handleUnauthorized(method, endpoint, data, options);
            }
            
            if (!response.ok) {
                const error = await response.json().catch(() => ({ detail: 'Request failed' }));
                throw new APIError(error.detail || 'Request failed', response.status);
            }
            
            // Return empty object for 204 No Content
            if (response.status === 204) {
                return null;
            }
            
            return response.json();
            
        } catch (error) {
            if (error instanceof APIError) throw error;
            throw new APIError(error.message, 0);
        }
    }
    
    async handleUnauthorized(method, endpoint, data, options) {
        // Check if already refreshing
        if (this.isRefreshing) {
            return new Promise((resolve) => {
                this.requestQueue.push({ method, endpoint, data, options, resolve });
            });
        }
        
        this.isRefreshing = true;
        
        try {
            // Try to refresh token
            await this.refreshAccessToken();
            
            // Retry the original request
            return this.request(method, endpoint, data, { ...options, _noRetry: true });
            
        } catch (refreshError) {
            // Refresh failed - clear tokens and redirect to login
            this.clearTokens();
            window.location.href = '/login?reason=session_expired';
            throw refreshError;
            
        } finally {
            this.isRefreshing = false;
            this.processQueue();
        }
    }
    
    processQueue() {
        this.requestQueue.forEach(({ resolve }) => resolve());
        this.requestQueue = [];
    }
    
    // Convenience methods
    get(endpoint, options) {
        return this.request('GET', endpoint, null, options);
    }
    
    post(endpoint, data, options) {
        return this.request('POST', endpoint, data, options);
    }
    
    put(endpoint, data, options) {
        return this.request('PUT', endpoint, data, options);
    }
    
    patch(endpoint, data, options) {
        return this.request('PATCH', endpoint, data, options);
    }
    
    delete(endpoint, options) {
        return this.request('DELETE', endpoint, null, options);
    }
    
    // =========================================================================
    // Authentication
    // =========================================================================
    
    async register(email, password, name) {
        const response = await this.post('/auth/register', { email, password, name });
        return response;
    }
    
    async login(email, password) {
        const response = await this.post('/auth/login', { email, password });
        this.setTokens(response.access_token, response.refresh_token);
        return response;
    }
    
    async logout() {
        this.clearTokens();
        // Optionally call backend logout endpoint
        // await this.post('/auth/logout');
    }
    
    async refreshAccessToken() {
        const response = await this.post('/auth/refresh', this.refreshToken);
        this.setTokens(response.access_token, response.refresh_token);
        
        if (this.onTokenRefreshed) {
            this.onTokenRefreshed(response.access_token);
        }
        
        return response;
    }
    
    async getProfile() {
        return this.get('/auth/me');
    }
    
    async updateProfile(data) {
        return this.put('/auth/me', data);
    }
    
    // =========================================================================
    // Projects
    // =========================================================================
    
    async createProject(data) {
        const payload = {
            name: data.name,
            description: data.description || null,
            aspect_ratio: data.aspectRatio || '16:9',
            resolution: data.resolution || '1920x1080',
            frame_rate: data.frameRate || 30.0
        };
        return this.post('/projects', payload);
    }
    
    async getProjects() {
        return this.get('/projects');
    }
    
    async getProject(projectId) {
        return this.get(`/projects/${projectId}`);
    }
    
    async updateProject(projectId, data) {
        const payload = {};
        if (data.name !== undefined) payload.name = data.name;
        if (data.description !== undefined) payload.description = data.description;
        if (data.aspectRatio !== undefined) payload.aspect_ratio = data.aspectRatio;
        if (data.resolution !== undefined) payload.resolution = data.resolution;
        if (data.frameRate !== undefined) payload.frame_rate = data.frameRate;
        
        return this.put(`/projects/${projectId}`, payload);
    }
    
    async deleteProject(projectId) {
        return this.delete(`/projects/${projectId}`);
    }
    
    async duplicateProject(projectId, newName) {
        const project = await this.getProject(projectId);
        return this.createProject({
            ...project,
            name: newName || `${project.name} (copie)`
        });
    }
    
    // =========================================================================
    // Media
    // =========================================================================
    
    async uploadMedia(file, projectId, options = {}) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('project_id', projectId);
        formData.append('media_type', options.mediaType || 'video');
        if (options.name) {
            formData.append('name', options.name);
        }
        
        return fetch(`${this.baseUrl}/media/upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`
            },
            body: formData
        }).then(r => r.json());
    }
    
    async getMedia(mediaId) {
        return this.get(`/media/${mediaId}`);
    }
    
    async deleteMedia(mediaId) {
        return this.delete(`/media/${mediaId}`);
    }
    
    async getMediaThumbnail(mediaId) {
        return `${this.baseUrl}/media/${mediaId}/thumbnail`;
    }
    
    // =========================================================================
    // Export
    // =========================================================================
    
    async startExport(projectId, options = {}) {
        const payload = {
            project_id: projectId,
            format: options.format || 'mp4',
            preset: options.preset || 'custom',
            resolution: options.resolution || null,
            quality: options.quality || 'high'
        };
        return this.post('/export', payload);
    }
    
    async getExportStatus(jobId) {
        return this.get(`/export/${jobId}/status`);
    }
    
    async downloadExport(jobId) {
        const response = await fetch(`${this.baseUrl}/export/${jobId}/download`, {
            headers: this.getAuthHeaders()
        });
        
        if (!response.ok) {
            throw new APIError('Export not ready', 400);
        }
        
        const blob = await response.blob();
        return URL.createObjectURL(blob);
    }
    
    /**
     * Poll export status until completion
     * @param {string} jobId - Export job ID
     * @param {Function} onProgress - Callback with progress updates
     * @param {number} interval - Poll interval in ms (default: 1000)
     * @returns {Promise<Object>} Final export status
     */
    async pollExport(jobId, onProgress = null, interval = 1000) {
        return new Promise((resolve, reject) => {
            const poll = async () => {
                try {
                    const status = await this.getExportStatus(jobId);
                    
                    if (onProgress) {
                        onProgress(status);
                    }
                    
                    if (status.status === 'completed') {
                        resolve(status);
                    } else if (status.status === 'failed') {
                        reject(new APIError(status.error || 'Export failed', 500));
                    } else {
                        setTimeout(poll, interval);
                    }
                } catch (error) {
                    reject(error);
                }
            };
            
            poll();
        });
    }
    
    // =========================================================================
    // AI Services
    // =========================================================================
    
    // Transcription
    async transcribe(mediaId, options = {}) {
        const payload = {
            media_id: mediaId,
            language: options.language || null,
            enable_speakers: options.enableSpeakers || false
        };
        return this.post('/ai/transcribe', payload);
    }
    
    async getTranscription(jobId) {
        return this.get(`/ai/transcribe/${jobId}`);
    }
    
    async pollTranscription(jobId, onProgress = null, interval = 1000) {
        return new Promise((resolve, reject) => {
            const poll = async () => {
                try {
                    const result = await this.getTranscription(jobId);
                    
                    if (onProgress) {
                        onProgress(result);
                    }
                    
                    if (result.status === 'completed') {
                        resolve(result);
                    } else if (result.status === 'failed') {
                        reject(new APIError(result.error || 'Transcription failed', 500));
                    } else {
                        setTimeout(poll, interval);
                    }
                } catch (error) {
                    reject(error);
                }
            };
            
            poll();
        });
    }
    
    // Translation
    async translate(text, sourceLanguage, targetLanguage) {
        return this.post('/ai/translate', {
            text,
            source_language: sourceLanguage,
            target_language: targetLanguage
        });
    }
    
    // Text-to-Speech
    async textToSpeech(text, options = {}) {
        const payload = {
            text,
            voice: options.voice || 'fr-FR-Denise',
            speed: options.speed || 1.0,
            pitch: options.pitch || 1.0
        };
        return this.post('/ai/tts', payload);
    }
    
    async getTTSResult(jobId) {
        return this.get(`/ai/tts/${jobId}`);
    }
    
    async pollTTS(jobId, onProgress = null, interval = 1000) {
        return new Promise((resolve, reject) => {
            const poll = async () => {
                try {
                    const result = await this.getTTSResult(jobId);
                    
                    if (onProgress) {
                        onProgress(result);
                    }
                    
                    if (result.status === 'completed') {
                        resolve(result);
                    } else if (result.status === 'failed') {
                        reject(new APIError(result.error || 'TTS failed', 500));
                    } else {
                        setTimeout(poll, interval);
                    }
                } catch (error) {
                    reject(error);
                }
            };
            
            poll();
        });
    }
    
    // Smart Crop
    async smartCrop(mediaId, options = {}) {
        const payload = {
            media_id: mediaId,
            target_ratio: options.targetRatio || '9:16',
            focus_mode: options.focusMode || 'auto'
        };
        return this.post('/ai/smart-crop', payload);
    }
    
    async getSmartCropResult(jobId) {
        return this.get(`/ai/smart-crop/${jobId}`);
    }
    
    // =========================================================================
    // Utilities
    // =========================================================================
    
    async getPresets() {
        return this.get('/presets');
    }
    
    async getAspectRatios() {
        return this.get('/aspect-ratios');
    }
    
    async healthCheck() {
        return this.get('/health');
    }
}


// ============================================================================
// API Error Class
// ============================================================================

class APIError extends Error {
    constructor(message, statusCode = 0, details = null) {
        super(message);
        this.name = 'APIError';
        this.statusCode = statusCode;
        this.details = details;
    }
    
    toJSON() {
        return {
            error: this.message,
            statusCode: this.statusCode,
            details: this.details
        };
    }
}


// ============================================================================
// Singleton Instance
// ============================================================================

const apiClient = new VideoEditorAPIClient();


// ============================================================================
// Export
// ============================================================================

export { VideoEditorAPIClient, APIError };
export default apiClient;
