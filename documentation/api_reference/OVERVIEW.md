# API Overview - StoryCore

This document provides an overview of the StoryCore API, including its architecture, key features, and capabilities.

## API Architecture

### Overview

The StoryCore API is built using Node.js and Express.js, providing a RESTful interface for managing projects, assets, AI processing, and user management. The API follows REST principles and uses JSON for data exchange.

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              Client Applications                              │
├─────────────────────────────────────────────────────────────────────────────────┤
│                               API Gateway                                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│                              Authentication                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│                              Business Logic                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│                              Data Access                                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│                              External Services                              │
├─────────────────────────────────────────────────────────────────────────────────┤
│                              ComfyAI Integration                            │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Key Components

#### 1. API Gateway

The API gateway handles request routing, rate limiting, and basic authentication:

```javascript
// Example API Gateway Configuration
const express = require('express');
const rateLimit = require('express-rate-limit');
const cors = require('cors');

const app = express();

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(limiter);

// Routes
app.use('/api/projects', require('./routes/projects'));
app.use('/api/assets', require('./routes/assets'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/users', require('./routes/users'));
```

#### 2. Authentication Layer

The authentication layer handles JWT-based authentication and authorization:

```javascript
// Authentication Middleware
const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Authorization Middleware
const authorize = (roles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};
```

#### 3. Business Logic Layer

The business logic layer contains the core application logic:

```javascript
// Project Service
const ProjectService = {
  async createProject(userId, projectData) {
    // Validate project data
    const validatedData = await this.validateProjectData(projectData);
    
    // Create project in database
    const project = await Project.create({
      ...validatedData,
      userId,
      status: 'created',
      createdAt: new Date()
    });

    // Trigger project creation event
    await this.triggerProjectCreatedEvent(project);

    return project;
  },

  async getProject(userId, projectId) {
    const project = await Project.findOne({
      where: { id: projectId, userId }
    });

    if (!project) {
      throw new Error('Project not found');
    }

    return project;
  },

  async updateProject(userId, projectId, updateData) {
    const project = await this.getProject(userId, projectId);
    
    // Update project
    const updatedProject = await project.update(updateData);
    
    // Trigger project updated event
    await this.triggerProjectUpdatedEvent(updatedProject);

    return updatedProject;
  },

  async deleteProject(userId, projectId) {
    const project = await this.getProject(userId, projectId);
    
    // Delete project assets
    await Asset.destroy({ where: { projectId } });
    
    // Delete project
    await project.destroy();
    
    // Trigger project deleted event
    await this.triggerProjectDeletedEvent(projectId);
  }
};
```

#### 4. Data Access Layer

The data access layer handles database operations:

```javascript
// Project Repository
const ProjectRepository = {
  async create(projectData) {
    return await Project.create(projectData);
  },

  async findById(id) {
    return await Project.findByPk(id);
  },

  async findOne(options) {
    return await Project.findOne(options);
  },

  async findAll(options = {}) {
    return await Project.findAll(options);
  },

  async update(id, updateData) {
    const project = await this.findById(id);
    if (!project) {
      throw new Error('Project not found');
    }
    
    return await project.update(updateData);
  },

  async delete(id) {
    const project = await this.findById(id);
    if (!project) {
      throw new Error('Project not found');
    }
    
    return await project.destroy();
  }
};

// Asset Repository
const AssetRepository = {
  async create(assetData) {
    return await Asset.create(assetData);
  },

  async findByProject(projectId) {
    return await Asset.findAll({
      where: { projectId },
      order: [['createdAt', 'DESC']]
    });
  },

  async findById(id) {
    return await Asset.findByPk(id);
  },

  async delete(id) {
    const asset = await this.findById(id);
    if (!asset) {
      throw new Error('Asset not found');
    }
    
    // Delete file from storage
    await this.deleteFile(asset.filePath);
    
    return await asset.destroy();
  },

  async deleteFile(filePath) {
    // Implementation for file deletion
    return true;
  }
};
```

#### 5. External Services Integration

The API integrates with various external services:

```javascript
// ComfyAI Service
const ComfyAIService = {
  async processVideo(projectId, videoPath, settings) {
    const workflow = {
      type: 'video_processing',
      model: 'llava',
      parameters: {
        video_path: videoPath,
        ...settings
      }
    };

    // Submit job to ComfyAI
    const job = await this.submitJob(workflow);
    
    // Monitor job progress
    const result = await this.monitorJob(job.id);
    
    return result;
  },

  async generateText(prompt, model = 'gemma3', settings = {}) {
    const workflow = {
      type: 'text_generation',
      model,
      parameters: {
        prompt,
        ...settings
      }
    };

    const job = await this.submitJob(workflow);
    const result = await this.monitorJob(job.id);
    
    return result;
  },

  async generateImage(prompt, model = 'stable_diffusion', settings = {}) {
    const workflow = {
      type: 'image_generation',
      model,
      parameters: {
        prompt,
        ...settings
      }
    };

    const job = await this.submitJob(workflow);
    const result = await this.monitorJob(job.id);
    
    return result;
  },

  async submitJob(workflow) {
    const response = await fetch(`${process.env.COMFYAI_URL}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.COMFYAI_API_KEY}`
      },
      body: JSON.stringify(workflow)
    });

    if (!response.ok) {
      throw new Error('Failed to submit job');
    }

    return await response.json();
  },

  async monitorJob(jobId) {
    const pollJob = async () => {
      const response = await fetch(`${process.env.COMFYAI_URL}/jobs/${jobId}`, {
        headers: {
          'Authorization': `Bearer ${process.env.COMFYAI_API_KEY}`
        }
      });

      const job = await response.json();
      
      if (job.status === 'completed') {
        return job.result;
      } else if (job.status === 'failed') {
        throw new Error(`Job failed: ${job.error}`);
      } else {
        // Wait and poll again
        await new Promise(resolve => setTimeout(resolve, 2000));
        return pollJob();
      }
    };

    return pollJob();
  }
};
```

## API Endpoints

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|---------|-------------|
| POST | `/api/auth/login` | User login |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/logout` | User logout |
| POST | `/api/auth/register` | User registration |
| PUT | `/api/auth/password` | Change password |
| POST | `/api/auth/forgot-password` | Request password reset |
| POST | `/api/auth/reset-password` | Reset password |

### Project Management

| Method | Endpoint | Description |
|--------|---------|-------------|
| GET | `/api/projects` | List user projects |
| POST | `/api/projects` | Create new project |
| GET | `/api/projects/:id` | Get project details |
| PUT | `/api/projects/:id` | Update project |
| DELETE | `/api/projects/:id` | Delete project |
| POST | `/api/projects/:id/duplicate` | Duplicate project |
| GET | `/api/projects/:id/assets` | List project assets |
| POST | `/api/projects/:id/assets` | Upload asset to project |
| GET | `/api/projects/:id/jobs` | List project jobs |
| POST | `/api/projects/:id/jobs` | Create new job |

### Asset Management

| Method | Endpoint | Description |
|--------|---------|-------------|
| GET | `/api/assets` | List all assets |
| GET | `/api/assets/:id` | Get asset details |
| PUT | `/api/assets/:id` | Update asset metadata |
| DELETE | `/api/assets/:id` | Delete asset |
| GET | `/api/assets/:id/download` | Download asset file |
| POST | `/api/assets/upload` | Upload asset file |
| GET | `/api/assets/search` | Search assets |

### AI Processing

| Method | Endpoint | Description |
|--------|---------|-------------|
| POST | `/api/ai/text` | Generate text |
| POST | `/api/ai/image` | Generate image |
| POST | `/api/ai/video` | Process video |
| POST | `/api/ai/audio` | Process audio |
| GET | `/api/ai/models` | List available models |
| GET | `/api/ai/models/:id` | Get model details |
| POST | `/api/ai/models/:id/optimize` | Optimize model |

### Job Management

| Method | Endpoint | Description |
|--------|---------|-------------|
| GET | `/api/jobs` | List all jobs |
| GET | `/api/jobs/:id` | Get job details |
| POST | `/api/jobs/:id/cancel` | Cancel job |
| GET | `/api/jobs/:id/logs` | Get job logs |
| POST | `/api/jobs/:id/retry` | Retry failed job |

### User Management

| Method | Endpoint | Description |
|--------|---------|-------------|
| GET | `/api/users/profile` | Get user profile |
| PUT | `/api/users/profile` | Update user profile |
| GET | `/api/users/settings` | Get user settings |
| PUT | `/api/users/settings` | Update user settings |
| GET | `/api/users/organizations` | List user organizations |
| POST | `/api/users/organizations` | Create organization |

### System Management

| Method | Endpoint | Description |
|--------|---------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/metrics` | System metrics |
| GET | `/api/logs` | System logs |
| POST | `/api/admin/users` | Admin: Create user |
| PUT | `/api/admin/users/:id` | Admin: Update user |
| DELETE | `/api/admin/users/:id` | Admin: Delete user |

## API Features

### 1. Authentication & Security

- **JWT-based authentication**: Stateless authentication using JSON Web Tokens
- **Role-based access control**: Granular permissions based on user roles
- **Rate limiting**: Protection against brute force attacks
- **Input validation**: Comprehensive input validation and sanitization
- **HTTPS support**: Secure communication with TLS encryption
- **CORS configuration**: Proper cross-origin resource sharing

### 2. Project Management

- **CRUD operations**: Complete project lifecycle management
- **Project templates**: Pre-configured project templates
- **Project sharing**: Share projects with other users
- **Version control**: Track project changes and versions
- **Project analytics**: Project usage and performance metrics

### 3. Asset Management

- **File upload**: Support for various file types and sizes
- **Metadata management**: Rich metadata for assets
- **Asset organization**: Organize assets into folders and categories
- **Search and filtering**: Advanced search capabilities
- **Asset processing**: Automatic asset processing and optimization

### 4. AI Processing

- **Multiple AI models**: Support for various AI models (Gemma3, Stable Diffusion, LLava)
- **Batch processing**: Process multiple items simultaneously
- **Job monitoring**: Real-time job status and progress tracking
- **Result caching**: Cache AI results for improved performance
- **Model optimization**: Optimize AI models for specific tasks

### 5. Job Management

- **Job queue**: Asynchronous job processing
- **Job monitoring**: Track job progress and status
- **Job cancellation**: Cancel running jobs
- **Job retry**: Retry failed jobs
- **Job logs**: Detailed job execution logs

### 6. User Management

- **User registration**: Complete user onboarding
- **Profile management**: User profile and settings
- **Organization management**: Multi-tenant support
- **Team collaboration**: Team-based access and sharing
- **Usage analytics**: User activity and usage patterns

## API Response Format

### Standard Response Format

All API responses follow a consistent format:

```json
{
  "success": true,
  "data": {
    // Response data
  },
  "message": "Success message",
  "timestamp": "2024-01-15T12:00:00Z"
}
```

### Error Response Format

Error responses include detailed error information:

```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "The requested resource was not found",
    "details": {
      "resource": "project",
      "id": "123"
    }
  },
  "timestamp": "2024-01-15T12:00:00Z"
}
```

### Pagination

List endpoints support pagination:

```json
{
  "success": true,
  "data": [
    // Array of items
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

## API Rate Limiting

### Rate Limit Configuration

The API implements rate limiting to prevent abuse:

```javascript
const rateLimitOptions = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per window
  message: {
    success: false,
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: "Too many requests, please try again later"
    }
  },
  standardHeaders: true,
  legacyHeaders: false
};
```

### Rate Limit Endpoints

Different endpoints have different rate limits:

| Endpoint Type | Requests per 15 minutes | Burst Limit |
|---------------|-------------------------|-------------|
| Authentication | 10 | 5 |
| Projects | 100 | 20 |
| Assets | 200 | 50 |
| AI Processing | 50 | 10 |
| Jobs | 100 | 25 |
| System | 20 | 5 |

## API Versioning

### Version Strategy

The API follows semantic versioning with backward compatibility:

- **Major version (X.0.0)**: Breaking changes
- **Minor version (0.Y.0)**: New features, backward compatible
- **Patch version (0.0.Z)**: Bug fixes, backward compatible

### Version Headers

Include version information in requests:

```http
Accept: application/vnd.storycore.v1+json
Content-Type: application/vnd.storycore.v1+json
```

### Version Endpoints

Endpoints are versioned in the URL:

```
/api/v1/projects
/api/v1/assets
/api/v1/ai/text
/api/v2/projects  # Future version
```

## API Documentation

### OpenAPI/Swagger

The API is documented using OpenAPI 3.0 specification:

```yaml
openapi: 3.0.0
info:
  title: StoryCore API
  version: 1.0.0
  description: API for StoryCore AI content creation platform
servers:
  - url: https://api.storycore.com
    description: Production server
  - url: https://staging-api.storycore.com
    description: Staging server
paths:
  /api/v1/projects:
    get:
      summary: List user projects
      description: Retrieve a list of projects for the authenticated user
      security:
        - bearerAuth: []
      parameters:
        - name: page
          in: query
          schema:
            type: integer
            default: 1
        - name: limit
          in: query
          schema:
            type: integer
            default: 20
            maximum: 100
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                    example: true
                  data:
                    type: array
                    items:
                      $ref: '#/components/schemas/Project'
                  pagination:
                    $ref: '#/components/schemas/Pagination'
```

### Interactive Documentation

Interactive API documentation is available at:
- **Production**: https://api.storycore.com/docs
- **Staging**: https://staging-api.storycore.com/docs

## API Monitoring

### Health Checks

The API provides health check endpoints:

```bash
# Health check
curl https://api.storycore.com/api/health

# Metrics
curl https://api.storycore.com/api/metrics

# Logs
curl https://api.storycore.com/api/logs
```

### Monitoring Metrics

Key metrics tracked:

- **Request count**: Total number of requests
- **Response time**: Average response time
- **Error rate**: Percentage of failed requests
- **Active connections**: Current active connections
- **Memory usage**: Application memory usage
- **CPU usage**: Application CPU usage

### Logging

Comprehensive logging is implemented:

```javascript
// Request logging
app.use((req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.info({
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });
  });
  
  next();
});
```

## API Best Practices

### 1. RESTful Design

- Use appropriate HTTP methods
- Use proper HTTP status codes
- Use resource-oriented URLs
- Use consistent naming conventions
- Use proper content negotiation

### 2. Security

- Always use HTTPS
- Implement proper authentication
- Validate all input
- Use parameterized queries
- Implement proper error handling
- Use secure headers

### 3. Performance

- Implement proper caching
- Use compression
- Optimize database queries
- Use pagination for large datasets
- Implement proper rate limiting

### 4. Documentation

- Provide comprehensive API documentation
- Use OpenAPI/Swagger specification
- Include examples
- Document error responses
- Keep documentation up to date

### 5. Testing

- Write comprehensive unit tests
- Write integration tests
- Test error scenarios
- Test edge cases
- Monitor test coverage

---

*For more information on API endpoints, see [ENDPOINTS.md](ENDPOINTS.md).*