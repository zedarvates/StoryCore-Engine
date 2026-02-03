# API Endpoints - StoryCore

This document provides detailed information about all available API endpoints in StoryCore, including request/response formats, authentication requirements, and example usage.

## Authentication Endpoints

### POST /api/auth/login

Authenticate user and return access token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "123",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "user",
      "plan": "premium"
    }
  },
  "message": "Login successful"
}
```

**Status Codes:**
- `200`: Login successful
- `400`: Invalid request data
- `401`: Invalid credentials
- `429`: Rate limit exceeded

---

### POST /api/auth/refresh

Refresh access token using refresh token.

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "Token refreshed successfully"
}
```

**Status Codes:**
- `200`: Token refreshed successfully
- `400`: Invalid request data
- `401`: Invalid refresh token
- `429`: Rate limit exceeded

---

### POST /api/auth/logout

Logout user and invalidate tokens.

**Request Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Logout successful"
}
```

**Status Codes:**
- `200`: Logout successful
- `401`: Unauthorized
- `429`: Rate limit exceeded

---

### POST /api/auth/register

Register new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "Password123!",
  "name": "John Doe",
  "plan": "free"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "123",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "user",
      "plan": "free"
    }
  },
  "message": "Registration successful"
}
```

**Status Codes:**
- `201`: Registration successful
- `400`: Invalid request data
- `409`: Email already exists
- `429`: Rate limit exceeded

---

### PUT /api/auth/password

Change user password.

**Request Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "currentPassword": "oldPassword123",
  "newPassword": "newPassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

**Status Codes:**
- `200`: Password changed successfully
- `400`: Invalid request data
- `401`: Invalid current password
- `429`: Rate limit exceeded

---

### POST /api/auth/forgot-password

Request password reset email.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password reset email sent"
}
```

**Status Codes:**
- `200`: Email sent successfully
- `400`: Invalid request data
- `404`: Email not found
- `429`: Rate limit exceeded

---

### POST /api/auth/reset-password

Reset password using reset token.

**Request Body:**
```json
{
  "token": "password_reset_token",
  "newPassword": "newPassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password reset successful"
}
```

**Status Codes:**
- `200`: Password reset successful
- `400`: Invalid request data
- `401`: Invalid or expired token
- `429`: Rate limit exceeded

## Project Management Endpoints

### GET /api/projects

List user projects with pagination.

**Request Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `page` (optional, default: 1): Page number
- `limit` (optional, default: 20, max: 100): Items per page
- `status` (optional): Filter by status (active, archived, deleted)
- `sort` (optional): Sort field (created_at, updated_at, name)
- `order` (optional): Sort direction (asc, desc)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "123",
      "name": "My Project",
      "description": "Project description",
      "status": "active",
      "createdAt": "2024-01-15T12:00:00Z",
      "updatedAt": "2024-01-15T12:00:00Z",
      "assetCount": 5,
      "jobCount": 3
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

**Status Codes:**
- `200`: Successful response
- `400`: Invalid query parameters
- `401`: Unauthorized
- `429`: Rate limit exceeded

---

### POST /api/projects

Create new project.

**Request Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "My New Project",
  "description": "Project description",
  "template": "basic_video",
  "settings": {
    "resolution": "1920x1080",
    "frameRate": 30,
    "duration": 60
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "123",
    "name": "My New Project",
    "description": "Project description",
    "status": "created",
    "template": "basic_video",
    "settings": {
      "resolution": "1920x1080",
      "frameRate": 30,
      "duration": 60
    },
    "createdAt": "2024-01-15T12:00:00Z",
    "updatedAt": "2024-01-15T12:00:00Z"
  },
  "message": "Project created successfully"
}
```

**Status Codes:**
- `201`: Project created successfully
- `400`: Invalid request data
- `401`: Unauthorized
- `429`: Rate limit exceeded

---

### GET /api/projects/{id}

Get project details.

**Request Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "123",
    "name": "My Project",
    "description": "Project description",
    "status": "active",
    "template": "basic_video",
    "settings": {
      "resolution": "1920x1080",
      "frameRate": 30,
      "duration": 60
    },
    "assets": [
      {
        "id": "456",
        "name": "video.mp4",
        "type": "video",
        "size": 10485760,
        "duration": 60,
        "createdAt": "2024-01-15T12:00:00Z"
      }
    ],
    "jobs": [
      {
        "id": "789",
        "type": "video_processing",
        "status": "completed",
        "createdAt": "2024-01-15T12:00:00Z",
        "completedAt": "2024-01-15T12:05:00Z"
      }
    ],
    "createdAt": "2024-01-15T12:00:00Z",
    "updatedAt": "2024-01-15T12:00:00Z"
  }
}
```

**Status Codes:**
- `200`: Successful response
- `401`: Unauthorized
- `404`: Project not found
- `429`: Rate limit exceeded

---

### PUT /api/projects/{id}

Update project details.

**Request Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Updated Project Name",
  "description": "Updated description",
  "settings": {
    "resolution": "1920x1080",
    "frameRate": 30,
    "duration": 90
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "123",
    "name": "Updated Project Name",
    "description": "Updated description",
    "status": "active",
    "template": "basic_video",
    "settings": {
      "resolution": "1920x1080",
      "frameRate": 30,
      "duration": 90
    },
    "updatedAt": "2024-01-15T12:00:00Z"
  },
  "message": "Project updated successfully"
}
```

**Status Codes:**
- `200`: Project updated successfully
- `400`: Invalid request data
- `401`: Unauthorized
- `404`: Project not found
- `429`: Rate limit exceeded

---

### DELETE /api/projects/{id}

Delete project.

**Request Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Project deleted successfully"
}
```

**Status Codes:**
- `200`: Project deleted successfully
- `401`: Unauthorized
- `404`: Project not found
- `429`: Rate limit exceeded

---

### POST /api/projects/{id}/duplicate

Duplicate project.

**Request Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "My Project Copy",
  "copyAssets": true,
  "copyJobs": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "456",
    "name": "My Project Copy",
    "originalProjectId": "123",
    "status": "created",
    "createdAt": "2024-01-15T12:00:00Z"
  },
  "message": "Project duplicated successfully"
}
```

**Status Codes:**
- `201`: Project duplicated successfully
- `400`: Invalid request data
- `401`: Unauthorized
- `404`: Project not found
- `429`: Rate limit exceeded

---

### GET /api/projects/{id}/assets

List project assets.

**Request Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `page` (optional, default: 1): Page number
- `limit` (optional, default: 20, max: 100): Items per page
- `type` (optional): Filter by type (video, image, audio, document)
- `sort` (optional): Sort field (created_at, updated_at, name, size)
- `order` (optional): Sort direction (asc, desc)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "456",
      "name": "video.mp4",
      "type": "video",
      "size": 10485760,
      "duration": 60,
      "metadata": {
        "resolution": "1920x1080",
        "frameRate": 30,
        "codec": "h264"
      },
      "createdAt": "2024-01-15T12:00:00Z",
      "updatedAt": "2024-01-15T12:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "totalPages": 1
  }
}
```

**Status Codes:**
- `200`: Successful response
- `400`: Invalid query parameters
- `401`: Unauthorized
- `404`: Project not found
- `429`: Rate limit exceeded

---

### POST /api/projects/{id}/assets

Upload asset to project.

**Request Headers:**
```
Authorization: Bearer <access_token>
Content-Type: multipart/form-data
```

**Request Body:**
```
file: <file>
name: <string>
type: <string>
metadata: <json>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "456",
    "name": "video.mp4",
    "type": "video",
    "size": 10485760,
    "duration": 60,
    "metadata": {
      "resolution": "1920x1080",
      "frameRate": 30,
      "codec": "h264"
    },
    "projectId": "123",
    "createdAt": "2024-01-15T12:00:00Z"
  },
  "message": "Asset uploaded successfully"
}
```

**Status Codes:**
- `201`: Asset uploaded successfully
- `400`: Invalid request data
- `401`: Unauthorized
- `404`: Project not found
- `413`: File too large
- `429`: Rate limit exceeded

---

### GET /api/projects/{id}/jobs

List project jobs.

**Request Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `page` (optional, default: 1): Page number
- `limit` (optional, default: 20, max: 100): Items per page
- `status` (optional): Filter by status (pending, running, completed, failed)
- `type` (optional): Filter by type (text_generation, image_generation, video_processing)
- `sort` (optional): Sort field (created_at, updated_at, status)
- `order` (optional): Sort direction (asc, desc)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "789",
      "type": "video_processing",
      "status": "completed",
      "parameters": {
        "inputPath": "/path/to/input.mp4",
        "outputPath": "/path/to/output.mp4",
        "settings": {
          "resolution": "1920x1080",
          "frameRate": 30
        }
      },
      "result": {
        "outputPath": "/path/to/output.mp4",
        "duration": 60,
        "size": 10485760
      },
      "progress": 100,
      "createdAt": "2024-01-15T12:00:00Z",
      "startedAt": "2024-01-15T12:00:00Z",
      "completedAt": "2024-01-15T12:05:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 3,
    "totalPages": 1
  }
}
```

**Status Codes:**
- `200`: Successful response
- `400`: Invalid query parameters
- `401`: Unauthorized
- `404`: Project not found
- `429`: Rate limit exceeded

---

### POST /api/projects/{id}/jobs

Create new job.

**Request Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "type": "video_processing",
  "parameters": {
    "inputPath": "/path/to/input.mp4",
    "outputPath": "/path/to/output.mp4",
    "settings": {
      "resolution": "1920x1080",
      "frameRate": 30,
      "codec": "h264"
    }
  },
  "priority": "normal"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "789",
    "type": "video_processing",
    "status": "pending",
    "parameters": {
      "inputPath": "/path/to/input.mp4",
      "outputPath": "/path/to/output.mp4",
      "settings": {
        "resolution": "1920x1080",
        "frameRate": 30,
        "codec": "h264"
      }
    },
    "priority": "normal",
    "projectId": "123",
    "createdAt": "2024-01-15T12:00:00Z"
  },
  "message": "Job created successfully"
}
```

**Status Codes:**
- `201`: Job created successfully
- `400`: Invalid request data
- `401`: Unauthorized
- `404`: Project not found
- `429`: Rate limit exceeded

## Asset Management Endpoints

### GET /api/assets

List all assets with pagination.

**Request Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `page` (optional, default: 1): Page number
- `limit` (optional, default: 20, max: 100): Items per page
- `type` (optional): Filter by type (video, image, audio, document)
- `projectId` (optional): Filter by project ID
- `sort` (optional): Sort field (created_at, updated_at, name, size)
- `order` (optional): Sort direction (asc, desc)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "456",
      "name": "video.mp4",
      "type": "video",
      "size": 10485760,
      "duration": 60,
      "metadata": {
        "resolution": "1920x1080",
        "frameRate": 30,
        "codec": "h264"
      },
      "projectId": "123",
      "projectName": "My Project",
      "createdAt": "2024-01-15T12:00:00Z",
      "updatedAt": "2024-01-15T12:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

**Status Codes:**
- `200`: Successful response
- `400`: Invalid query parameters
- `401`: Unauthorized
- `429`: Rate limit exceeded

---

### GET /api/assets/{id}

Get asset details.

**Request Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "456",
    "name": "video.mp4",
    "type": "video",
    "size": 10485760,
    "duration": 60,
    "metadata": {
      "resolution": "1920x1080",
      "frameRate": 30,
      "codec": "h264",
      "duration": 60,
      "bitrate": 5000000
    },
    "projectId": "123",
    "projectName": "My Project",
    "filePath": "/path/to/video.mp4",
    "createdAt": "2024-01-15T12:00:00Z",
    "updatedAt": "2024-01-15T12:00:00Z"
  }
}
```

**Status Codes:**
- `200`: Successful response
- `401`: Unauthorized
- `404`: Asset not found
- `429`: Rate limit exceeded

---

### PUT /api/assets/{id}

Update asset metadata.

**Request Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Updated Video Name",
  "metadata": {
    "resolution": "1920x1080",
    "frameRate": 30,
    "codec": "h264",
    "tags": ["updated", "video"]
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "456",
    "name": "Updated Video Name",
    "type": "video",
    "size": 10485760,
    "metadata": {
      "resolution": "1920x1080",
      "frameRate": 30,
      "codec": "h264",
      "tags": ["updated", "video"]
    },
    "updatedAt": "2024-01-15T12:00:00Z"
  },
  "message": "Asset updated successfully"
}
```

**Status Codes:**
- `200`: Asset updated successfully
- `400`: Invalid request data
- `401`: Unauthorized
- `404`: Asset not found
- `429`: Rate limit exceeded

---

### DELETE /api/assets/{id}

Delete asset.

**Request Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Asset deleted successfully"
}
```

**Status Codes:**
- `200`: Asset deleted successfully
- `401`: Unauthorized
- `404`: Asset not found
- `429`: Rate limit exceeded

---

### GET /api/assets/{id}/download

Download asset file.

**Request Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
- File download with appropriate content-type

**Status Codes:**
- `200`: File download successful
- `401`: Unauthorized
- `404`: Asset not found
- `429`: Rate limit exceeded

---

### POST /api/assets/upload

Upload asset file.

**Request Headers:**
```
Authorization: Bearer <access_token>
Content-Type: multipart/form-data
```

**Request Body:**
```
file: <file>
name: <string>
type: <string>
projectId: <string>
metadata: <json>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "456",
    "name": "video.mp4",
    "type": "video",
    "size": 10485760,
    "duration": 60,
    "metadata": {
      "resolution": "1920x1080",
      "frameRate": 30,
      "codec": "h264"
    },
    "projectId": "123",
    "createdAt": "2024-01-15T12:00:00Z"
  },
  "message": "Asset uploaded successfully"
}
```

**Status Codes:**
- `201`: Asset uploaded successfully
- `400`: Invalid request data
- `401`: Unauthorized
- `413`: File too large
- `429`: Rate limit exceeded

---

### GET /api/assets/search

Search assets with filters.

**Request Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `q` (required): Search query
- `type` (optional): Filter by type (video, image, audio, document)
- `projectId` (optional): Filter by project ID
- `page` (optional, default: 1): Page number
- `limit` (optional, default: 20, max: 100): Items per page

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "456",
      "name": "video.mp4",
      "type": "video",
      "size": 10485760,
      "duration": 60,
      "metadata": {
        "resolution": "1920x1080",
        "frameRate": 30,
        "codec": "h264"
      },
      "projectId": "123",
      "projectName": "My Project",
      "relevanceScore": 0.95,
      "createdAt": "2024-01-15T12:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "totalPages": 1
  }
}
```

**Status Codes:**
- `200`: Successful response
- `400`: Invalid query parameters
- `401`: Unauthorized
- `429`: Rate limit exceeded

## AI Processing Endpoints

### POST /api/ai/text

Generate text using AI.

**Request Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "prompt": "Write a story about a robot who learns to feel emotions",
  "model": "gemma3",
  "parameters": {
    "temperature": 0.7,
    "maxTokens": 1000,
    "topP": 0.9,
    "topK": 50
  },
  "context": {
    "genre": "science fiction",
    "length": "short story"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "789",
    "type": "text_generation",
    "model": "gemma3",
    "prompt": "Write a story about a robot who learns to feel emotions",
    "parameters": {
      "temperature": 0.7,
      "maxTokens": 1000,
      "topP": 0.9,
      "topK": 50
    },
    "context": {
      "genre": "science fiction",
      "length": "short story"
    },
    "result": {
      "text": "In a world where robots were designed to be purely logical...",
      "tokensUsed": 750,
      "completionTime": 2.5
    },
    "status": "completed",
    "createdAt": "2024-01-15T12:00:00Z",
    "completedAt": "2024-01-15T12:00:02Z"
  },
  "message": "Text generation completed"
}
```

**Status Codes:**
- `201`: Text generation job created
- `400`: Invalid request data
- `401`: Unauthorized
- `429`: Rate limit exceeded

---

### POST /api/ai/image

Generate image using AI.

**Request Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "prompt": "A beautiful landscape with mountains and a lake",
  "model": "stable_diffusion",
  "parameters": {
    "resolution": "512x512",
    "steps": 20,
    "guidanceScale": 7.5,
    "seed": 12345
  },
  "context": {
    "style": "realistic",
    "quality": "high"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "789",
    "type": "image_generation",
    "model": "stable_diffusion",
    "prompt": "A beautiful landscape with mountains and a lake",
    "parameters": {
      "resolution": "512x512",
      "steps": 20,
      "guidanceScale": 7.5,
      "seed": 12345
    },
    "context": {
      "style": "realistic",
      "quality": "high"
    },
    "result": {
      "imageUrl": "https://storage.storycore.com/images/789.jpg",
      "resolution": "512x512",
      "fileSize": 1048576,
      "generationTime": 15.2
    },
    "status": "completed",
    "createdAt": "2024-01-15T12:00:00Z",
    "completedAt": "2024-01-15T12:00:15Z"
  },
  "message": "Image generation completed"
}
```

**Status Codes:**
- `201`: Image generation job created
- `400`: Invalid request data
- `401`: Unauthorized
- `429`: Rate limit exceeded

---

### POST /api/ai/video

Process video using AI.

**Request Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "inputPath": "/path/to/input.mp4",
  "outputPath": "/path/to/output.mp4",
  "model": "llava",
  "parameters": {
    "resolution": "1920x1080",
    "frameRate": 30,
    "codec": "h264",
    "quality": "high"
  },
  "operations": [
    {
      "type": "enhancement",
      "parameters": {
        "brightness": 1.1,
        "contrast": 1.1,
        "saturation": 1.1
      }
    },
    {
      "type": "stabilization",
      "parameters": {
        "method": "optical_flow"
      }
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "789",
    "type": "video_processing",
    "model": "llava",
    "inputPath": "/path/to/input.mp4",
    "outputPath": "/path/to/output.mp4",
    "parameters": {
      "resolution": "1920x1080",
      "frameRate": 30,
      "codec": "h264",
      "quality": "high"
    },
    "operations": [
      {
        "type": "enhancement",
        "parameters": {
          "brightness": 1.1,
          "contrast": 1.1,
          "saturation": 1.1
        }
      },
      {
        "type": "stabilization",
        "parameters": {
          "method": "optical_flow"
        }
      }
    ],
    "result": {
      "outputPath": "/path/to/output.mp4",
      "resolution": "1920x1080",
      "duration": 60,
      "fileSize": 10485760,
      "processingTime": 120.5
    },
    "status": "completed",
    "createdAt": "2024-01-15T12:00:00Z",
    "startedAt": "2024-01-15T12:00:00Z",
    "completedAt": "2024-01-15T12:02:00Z"
  },
  "message": "Video processing completed"
}
```

**Status Codes:**
- `201`: Video processing job created
- `400`: Invalid request data
- `401`: Unauthorized
- `429`: Rate limit exceeded

---

### POST /api/ai/audio

Process audio using AI.

**Request Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "inputPath": "/path/to/input.wav",
  "outputPath": "/path/to/output.mp3",
  "model": "whisper",
  "parameters": {
    "codec": "mp3",
    "bitrate": 128,
    "sampleRate": 44100,
    "channels": 2
  },
  "operations": [
    {
      "type": "transcription",
      "parameters": {
        "language": "en",
        "model": "base"
      }
    },
    {
      "type": "noise_reduction",
      "parameters": {
        "level": "medium"
      }
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "789",
    "type": "audio_processing",
    "model": "whisper",
    "inputPath": "/path/to/input.wav",
    "outputPath": "/path/to/output.mp3",
    "parameters": {
      "codec": "mp3",
      "bitrate": 128,
      "sampleRate": 44100,
      "channels": 2
    },
    "operations": [
      {
        "type": "transcription",
        "parameters": {
          "language": "en",
          "model": "base"
        }
      },
      {
        "type": "noise_reduction",
        "parameters": {
          "level": "medium"
        }
      }
    ],
    "result": {
      "outputPath": "/path/to/output.mp3",
      "transcription": "This is the transcribed text...",
      "duration": 60,
      "fileSize": 1048576,
      "processingTime": 30.5
    },
    "status": "completed",
    "createdAt": "2024-01-15T12:00:00Z",
    "startedAt": "2024-01-15T12:00:00Z",
    "completedAt": "2024-01-15T12:00:30Z"
  },
  "message": "Audio processing completed"
}
```

**Status Codes:**
- `201`: Audio processing job created
- `400`: Invalid request data
- `401`: Unauthorized
- `429`: Rate limit exceeded

---

### GET /api/ai/models

List available AI models.

**Request Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `type` (optional): Filter by type (text, image, video, audio)
- `page` (optional, default: 1): Page number
- `limit` (optional, default: 20, max: 100): Items per page

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "model_1",
      "name": "Gemma 3",
      "type": "text",
      "description": "Advanced text generation model",
      "version": "1.0",
      "parameters": {
        "temperature": {
          "type": "number",
          "min": 0,
          "max": 1,
          "default": 0.7
        },
        "maxTokens": {
          "type": "integer",
          "min": 1,
          "max": 2000,
          "default": 1000
        }
      },
      "capabilities": ["text_generation", "summarization", "translation"],
      "performance": {
        "speed": "fast",
        "accuracy": "high",
        "cost": "medium"
      },
      "status": "active",
      "createdAt": "2024-01-15T12:00:00Z",
      "updatedAt": "2024-01-15T12:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 10,
    "totalPages": 1
  }
}
```

**Status Codes:**
- `200`: Successful response
- `400`: Invalid query parameters
- `401`: Unauthorized
- `429`: Rate limit exceeded

---

### GET /api/ai/models/{id}

Get AI model details.

**Request Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "model_1",
    "name": "Gemma 3",
    "type": "text",
    "description": "Advanced text generation model",
    "version": "1.0",
    "parameters": {
      "temperature": {
        "type": "number",
        "min": 0,
        "max": 1,
        "default": 0.7,
        "description": "Controls randomness of output"
      },
      "maxTokens": {
        "type": "integer",
        "min": 1,
        "max": 2000,
        "default": 1000,
        "description": "Maximum number of tokens to generate"
      }
    },
    "capabilities": ["text_generation", "summarization", "translation"],
    "performance": {
      "speed": "fast",
      "accuracy": "high",
      "cost": "medium"
    },
    "status": "active",
    "usage": {
      "totalRequests": 1000,
      "successRate": 0.95,
      "averageResponseTime": 2.5
    },
    "createdAt": "2024-01-15T12:00:00Z",
    "updatedAt": "2024-01-15T12:00:00Z"
  }
}
```

**Status Codes:**
- `200`: Successful response
- `401`: Unauthorized
- `404`: Model not found
- `429`: Rate limit exceeded

---

### POST /api/ai/models/{id}/optimize

Optimize AI model for specific task.

**Request Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "task": "text_generation",
  "parameters": {
    "temperature": 0.5,
    "maxTokens": 500,
    "topP": 0.8
  },
  "optimizationLevel": "balanced"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "model_1",
    "name": "Gemma 3",
    "type": "text",
    "task": "text_generation",
    "parameters": {
      "temperature": 0.5,
      "maxTokens": 500,
      "topP": 0.8
    },
    "optimizationLevel": "balanced",
    "optimizationResult": {
      "performanceImprovement": 0.15,
      "memoryReduction": 0.1,
      "speedImprovement": 0.2
    },
    "status": "optimized",
    "createdAt": "2024-01-15T12:00:00Z",
    "updatedAt": "2024-01-15T12:00:00Z"
  },
  "message": "Model optimized successfully"
}
```

**Status Codes:**
- `200`: Model optimized successfully
- `400`: Invalid request data
- `401`: Unauthorized
- `404`: Model not found
- `429`: Rate limit exceeded

## Job Management Endpoints

### GET /api/jobs

List all jobs with pagination.

**Request Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `page` (optional, default: 1): Page number
- `limit` (optional, default: 20, max: 100): Items per page
- `status` (optional): Filter by status (pending, running, completed, failed)
- `type` (optional): Filter by type (text_generation, image_generation, video_processing, audio_processing)
- `projectId` (optional): Filter by project ID
- `sort` (optional): Sort field (created_at, updated_at, status)
- `order` (optional): Sort direction (asc, desc)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "789",
      "type": "text_generation",
      "status": "completed",
      "parameters": {
        "prompt": "Write a story about a robot...",
        "model": "gemma3",
        "temperature": 0.7
      },
      "result": {
        "text": "In a world where robots were designed...",
        "tokensUsed": 750,
        "completionTime": 2.5
      },
      "progress": 100,
      "priority": "normal",
      "projectId": "123",
      "createdAt": "2024-01-15T12:00:00Z",
      "startedAt": "2024-01-15T12:00:00Z",
      "completedAt": "2024-01-15T12:00:02Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

**Status Codes:**
- `200`: Successful response
- `400`: Invalid query parameters
- `401`: Unauthorized
- `429`: Rate limit exceeded

---

### GET /api/jobs/{id}

Get job details.

**Request Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "789",
    "type": "text_generation",
    "status": "completed",
    "parameters": {
      "prompt": "Write a story about a robot...",
      "model": "gemma3",
      "temperature": 0.7
    },
    "result": {
      "text": "In a world where robots were designed...",
      "tokensUsed": 750,
      "completionTime": 2.5
    },
    "progress": 100,
    "priority": "normal",
    "projectId": "123",
    "projectName": "My Project",
    "createdAt": "2024-01-15T12:00:00Z",
    "startedAt": "2024-01-15T12:00:00Z",
    "completedAt": "2024-01-15T12:00:02Z",
    "logs": [
      {
        "timestamp": "2024-01-15T12:00:00Z",
        "level": "info",
        "message": "Job started"
      },
      {
        "timestamp": "2024-01-15T12:00:01Z",
        "level": "info",
        "message": "Processing text generation"
      },
      {
        "timestamp": "2024-01-15T12:00:02Z",
        "level": "info",
        "message": "Job completed successfully"
      }
    ]
  }
}
```

**Status Codes:**
- `200`: Successful response
- `401`: Unauthorized
- `404`: Job not found
- `429`: Rate limit exceeded

---

### POST /api/jobs/{id}/cancel

Cancel running job.

**Request Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "789",
    "status": "cancelled",
    "cancelledAt": "2024-01-15T12:00:00Z"
  },
  "message": "Job cancelled successfully"
}
```

**Status Codes:**
- `200`: Job cancelled successfully
- `400`: Job cannot be cancelled
- `401`: Unauthorized
- `404`: Job not found
- `429`: Rate limit exceeded

---

### GET /api/jobs/{id}/logs

Get job logs.

**Request Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `level` (optional): Filter by log level (debug, info, warn, error)
- `page` (optional, default: 1): Page number
- `limit` (optional, default: 50, max: 200): Items per page

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "timestamp": "2024-01-15T12:00:00Z",
      "level": "info",
      "message": "Job started",
      "details": {
        "jobId": "789",
        "type": "text_generation"
      }
    },
    {
      "timestamp": "2024-01-15T12:00:01Z",
      "level": "info",
      "message": "Processing text generation",
      "details": {
        "model": "gemma3",
        "tokensProcessed": 250
      }
    },
    {
      "timestamp": "2024-01-15T12:00:02Z",
      "level": "info",
      "message": "Job completed successfully",
      "details": {
        "result": "Generated text completed",
        "tokensUsed": 750
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 3,
    "totalPages": 1
  }
}
```

**Status Codes:**
- `200`: Successful response
- `400`: Invalid query parameters
- `401`: Unauthorized
- `404`: Job not found
- `429`: Rate limit exceeded

---

### POST /api/jobs/{id}/retry

Retry failed job.

**Request Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "retryParameters": {
    "temperature": 0.5,
    "maxTokens": 800
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "789",
    "status": "pending",
    "retryCount": 1,
    "originalJobId": "789",
    "createdAt": "2024-01-15T12:00:00Z"
  },
  "message": "Job retry initiated"
}
```

**Status Codes:**
- `201`: Job retry initiated
- `400`: Invalid request data or job cannot be retried
- `401`: Unauthorized
- `404`: Job not found
- `429`: Rate limit exceeded

## User Management Endpoints

### GET /api/users/profile

Get user profile.

**Request Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "123",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user",
    "plan": "premium",
    "settings": {
      "notifications": {
        "email": true,
        "push": false
      },
      "preferences": {
        "theme": "dark",
        "language": "en"
      }
    },
    "usage": {
      "storageUsed": 1048576000,
      "storageLimit": 10737418240,
      "projectsCreated": 5,
      "jobsCompleted": 100
    },
    "createdAt": "2024-01-15T12:00:00Z",
    "updatedAt": "2024-01-15T12:00:00Z"
  }
}
```

**Status Codes:**
- `200`: Successful response
- `401`: Unauthorized
- `429`: Rate limit exceeded

---

### PUT /api/users/profile

Update user profile.

**Request Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "John Updated Doe",
  "settings": {
    "notifications": {
      "email": true,
      "push": true
    },
    "preferences": {
      "theme": "light",
      "language": "en"
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "123",
    "email": "user@example.com",
    "name": "John Updated Doe",
    "role": "user",
    "plan": "premium",
    "settings": {
      "notifications": {
        "email": true,
        "push": true
      },
      "preferences": {
        "theme": "light",
        "language": "en"
      }
    },
    "updatedAt": "2024-01-15T12:00:00Z"
  },
  "message": "Profile updated successfully"
}
```

**Status Codes:**
- `200`: Profile updated successfully
- `400`: Invalid request data
- `401`: Unauthorized
- `429`: Rate limit exceeded

---

### GET /api/users/settings

Get user settings.

**Request Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "notifications": {
      "email": true,
      "push": false,
      "sms": false
    },
    "preferences": {
      "theme": "dark",
      "language": "en",
      "timezone": "UTC"
    },
    "privacy": {
      "profileVisibility": "public",
      "dataRetention": "30d"
    },
    "security": {
      "twoFactorAuth": true,
      "loginNotifications": true
    }
  }
}
```

**Status Codes:**
- `200`: Successful response
- `401`: Unauthorized
- `429`: Rate limit exceeded

---

### PUT /api/users/settings

Update user settings.

**Request Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "notifications": {
    "email": true,
    "push": true,
    "sms": false
  },
  "preferences": {
    "theme": "light",
    "language": "en",
    "timezone": "Europe/Paris"
  },
  "privacy": {
    "profileVisibility": "private",
    "dataRetention": "90d"
  },
  "security": {
    "twoFactorAuth": true,
    "loginNotifications": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "notifications": {
      "email": true,
      "push": true,
      "sms": false
    },
    "preferences": {
      "theme": "light",
      "language": "en",
      "timezone": "Europe/Paris"
    },
    "privacy": {
      "profileVisibility": "private",
      "dataRetention": "90d"
    },
    "security": {
      "twoFactorAuth": true,
      "loginNotifications": true
    }
  },
  "message": "Settings updated successfully"
}
```

**Status Codes:**
- `200`: Settings updated successfully
- `400`: Invalid request data
- `401`: Unauthorized
- `429`: Rate limit exceeded

---

### GET /api/users/organizations

List user organizations.

**Request Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `page` (optional, default: 1): Page number
- `limit` (optional, default: 20, max: 100): Items per page

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "org_1",
      "name": "My Company",
      "role": "admin",
      "memberCount": 10,
      "projectCount": 25,
      "createdAt": "2024-01-15T12:00:00Z",
      "updatedAt": "2024-01-15T12:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

**Status Codes:**
- `200`: Successful response
- `400`: Invalid query parameters
- `401`: Unauthorized
- `429`: Rate limit exceeded

---

### POST /api/users/organizations

Create new organization.

**Request Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "My New Organization",
  "description": "Organization description",
  "settings": {
    "plan": "business",
    "maxMembers": 50,
    "maxProjects": 100
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "org_1",
    "name": "My New Organization",
    "description": "Organization description",
    "settings": {
      "plan": "business",
      "maxMembers": 50,
      "maxProjects": 100
    },
    "role": "admin",
    "createdAt": "2024-01-15T12:00:00Z"
  },
  "message": "Organization created successfully"
}
```

**Status Codes:**
- `201`: Organization created successfully
- `400`: Invalid request data
- `401`: Unauthorized
- `429`: Rate limit exceeded

## System Management Endpoints

### GET /api/health

Health check endpoint.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-15T12:00:00Z",
    "version": "2.0.0",
    "checks": {
      "database": "healthy",
      "redis": "healthy",
      "storage": "healthy",
      "comfyui": "healthy"
    },
    "uptime": 86400,
    "memory": {
      "used": 512,
      "total": 2048,
      "percentage": 25
    },
    "cpu": {
      "usage": 15.5,
      "cores": 4
    }
  }
}
```

**Status Codes:**
- `200`: Healthy response
- `503`: Service unhealthy

---

### GET /api/metrics

System metrics.

**Request Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `type` (optional): Filter metrics type (system, api, jobs, storage)
- `timeRange` (optional): Time range (1h, 24h, 7d, 30d)

**Response:**
```json
{
  "success": true,
  "data": {
    "timestamp": "2024-01-15T12:00:00Z",
    "system": {
      "uptime": 86400,
      "memory": {
        "used": 512,
        "total": 2048,
        "percentage": 25
      },
      "cpu": {
        "usage": 15.5,
        "cores": 4
      },
      "disk": {
        "used": 10737418240,
        "total": 107374182400,
        "percentage": 10
      }
    },
    "api": {
      "requests": {
        "total": 10000,
        "successful": 9500,
        "failed": 500,
        "averageResponseTime": 150
      },
      "endpoints": {
        "/api/projects": 2000,
        "/api/assets": 3000,
        "/api/ai/text": 4000,
        "/api/ai/image": 1000
      }
    },
    "jobs": {
      "total": 5000,
      "completed": 4500,
      "failed": 500,
      "averageProcessingTime": 30,
      "queueLength": 10
    },
    "storage": {
      "total": 107374182400,
      "used": 10737418240,
      "available": 96636764160,
      "files": 10000
    }
  }
}
```

**Status Codes:**
- `200`: Successful response
- `401`: Unauthorized
- `429`: Rate limit exceeded

---

### GET /api/logs

System logs.

**Request Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `level` (optional): Filter by log level (debug, info, warn, error)
- `service` (optional): Filter by service (api, database, storage, ai)
- `timeRange` (optional): Time range (1h, 24h, 7d, 30d)
- `page` (optional, default: 1): Page number
- `limit` (optional, default: 50, max: 200): Items per page

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "timestamp": "2024-01-15T12:00:00Z",
      "level": "info",
      "service": "api",
      "message": "API request processed",
      "details": {
        "method": "GET",
        "endpoint": "/api/projects",
        "status": 200,
        "responseTime": 150
      }
    },
    {
      "timestamp": "2024-01-15T12:00:01Z",
      "level": "error",
      "service": "database",
      "message": "Database connection failed",
      "details": {
        "error": "Connection timeout",
        "retryCount": 3
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1000,
    "totalPages": 20
  }
}
```

**Status Codes:**
- `200`: Successful response
- `400`: Invalid query parameters
- `401`: Unauthorized
- `429`: Rate limit exceeded

---

### POST /api/admin/users

Admin: Create user (admin only).

**Request Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "newuser@example.com",
  "name": "New User",
  "password": "Password123!",
  "role": "user",
  "plan": "free"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "456",
    "email": "newuser@example.com",
    "name": "New User",
    "role": "user",
    "plan": "free",
    "status": "active",
    "createdAt": "2024-01-15T12:00:00Z"
  },
  "message": "User created successfully"
}
```

**Status Codes:**
- `201`: User created successfully
- `400`: Invalid request data
- `401`: Unauthorized
- `403`: Insufficient permissions
- `409`: Email already exists
- `429`: Rate limit exceeded

---

### PUT /api/admin/users/{id}

Admin: Update user (admin only).

**Request Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Updated User Name",
  "role": "editor",
  "plan": "premium",
  "status": "active"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "456",
    "email": "newuser@example.com",
    "name": "Updated User Name",
    "role": "editor",
    "plan": "premium",
    "status": "active",
    "updatedAt": "2024-01-15T12:00:00Z"
  },
  "message": "User updated successfully"
}
```

**Status Codes:**
- `200`: User updated successfully
- `400`: Invalid request data
- `401`: Unauthorized
- `403`: Insufficient permissions
- `404`: User not found
- `429`: Rate limit exceeded

---

### DELETE /api/admin/users/{id}

Admin: Delete user (admin only).

**Request Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

**Status Codes:**
- `200`: User deleted successfully
- `401`: Unauthorized
- `403`: Insufficient permissions
- `404`: User not found
- `429`: Rate limit exceeded

---

*For more information on API usage, see [OVERVIEW.md](OVERVIEW.md).*