# StoryCore AI Assistant API Documentation

Welcome to the StoryCore AI Assistant API documentation. This directory contains comprehensive guides for integrating with and using the API.

## Documentation Index

### 📘 [API Documentation](./API_DOCUMENTATION.md)
Complete API reference with all endpoints, request/response formats, and examples.

**Contents**:
- Authentication flow
- Rate limiting policy
- Error handling
- All API endpoints with examples
- OpenAPI/Swagger documentation links

**Use this when**: You need detailed information about specific endpoints or want a complete API reference.

---

### 🔐 [Authentication Guide](./AUTHENTICATION_GUIDE.md)
In-depth guide to JWT-based authentication, token management, and security best practices.

**Contents**:
- Authentication architecture
- Token types (access & refresh)
- Authentication flow diagrams
- Implementation examples (Python, JavaScript, cURL)
- Token refresh strategies
- Security best practices
- Troubleshooting

**Use this when**: You're implementing authentication in your application or troubleshooting auth issues.

---

### ⏱️ [Rate Limiting Guide](./RATE_LIMITING_GUIDE.md)
Comprehensive guide to understanding and handling API rate limits.

**Contents**:
- Rate limiting policy (100 req/min)
- Sliding window algorithm explanation
- Rate limit headers
- Handling strategies (throttling, backoff, queuing)
- Implementation examples
- Best practices
- Troubleshooting

**Use this when**: You need to handle high-volume requests or are encountering rate limit errors.

---

### 🚀 [API Usage Guide](./API_USAGE_GUIDE.md)
Practical examples and workflows for common use cases.

**Contents**:
- Quick start (5-minute example)
- Common workflows
- Language-specific examples (Python, JavaScript, cURL)
- Advanced usage (concurrent requests, streaming, retries)
- Error handling patterns
- Performance optimization

**Use this when**: You want practical, copy-paste examples for common tasks.

---

## Quick Start

### 1. Get Access

Obtain API credentials from your administrator or create an account.

### 2. Authenticate

```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"user@example.com","password":"password"}'
```

### 3. Make Your First Request

```bash
TOKEN="your_access_token_here"

curl -X POST http://localhost:8000/api/v1/generate/project \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Create a mystery thriller in a haunted mansion"}'
```

### 4. Explore Interactive Docs

Visit the interactive API documentation:
- **Swagger UI**: http://localhost:8000/api/docs
- **ReDoc**: http://localhost:8000/api/redoc

---

## Common Use Cases

### Generate a Project

```python
import requests

BASE_URL = "http://localhost:8000/api/v1"
headers = {"Authorization": f"Bearer {token}"}

# Generate
response = requests.post(f"{BASE_URL}/generate/project", headers=headers, json={
    "prompt": "A sci-fi adventure about space explorers",
    "language": "en"
})
preview = response.json()

# Finalize
response = requests.post(f"{BASE_URL}/generate/finalize", headers=headers, json={
    "preview_id": preview["preview_id"]
})
project = response.json()
print(f"Created: {project['project_name']}")
```

### List Projects

```python
response = requests.get(f"{BASE_URL}/projects/list", headers=headers)
projects = response.json()["projects"]
print(f"Projects: {projects}")
```

### Modify a Scene

```python
# Open project
requests.post(f"{BASE_URL}/projects/open", headers=headers, json={
    "project_name": "my-project"
})

# Modify scene
requests.patch(
    f"{BASE_URL}/projects/my-project/scenes/scene_1",
    headers=headers,
    json={"description": "Updated description", "duration": 20.0}
)

# Close and save
requests.post(f"{BASE_URL}/projects/close", headers=headers, json={"save": True})
```

---

## API Limits and Quotas

| Resource | Limit | Notes |
|----------|-------|-------|
| Request Rate | 100 req/min | Per authenticated user |
| Storage | 50 GB | Per project directory |
| File Count | 248 files | Per project directory |
| Token Lifetime | 1 hour | Access tokens |
| Refresh Token | 7 days | Refresh tokens |

---

## Error Codes Reference

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `AUTHENTICATION_ERROR` | 401 | Invalid or missing authentication |
| `AUTHORIZATION_ERROR` | 403 | Insufficient permissions |
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `RESOURCE_NOT_FOUND` | 404 | Resource doesn't exist |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `STORAGE_LIMIT_EXCEEDED` | 507 | Storage quota exceeded |
| `PROJECT_ERROR` | 400 | Project-specific error |
| `INTERNAL_SERVER_ERROR` | 500 | Server error |

---

## Client Libraries

### Python

```bash
pip install requests
```

See [API Usage Guide](./API_USAGE_GUIDE.md#python-with-requests) for examples.

### JavaScript/TypeScript

```bash
npm install node-fetch
# or use built-in fetch in modern browsers
```

See [API Usage Guide](./API_USAGE_GUIDE.md#javascripttypescript-with-fetch) for examples.

### cURL

Available on most systems. See [API Usage Guide](./API_USAGE_GUIDE.md#curl-examples) for examples.

---

## Support and Resources

### Documentation
- [API Documentation](./API_DOCUMENTATION.md) - Complete API reference
- [Authentication Guide](./AUTHENTICATION_GUIDE.md) - Auth implementation
- [Rate Limiting Guide](./RATE_LIMITING_GUIDE.md) - Rate limit handling
- [API Usage Guide](./API_USAGE_GUIDE.md) - Practical examples

### Interactive Tools
- [Swagger UI](http://localhost:8000/api/docs) - Interactive API testing
- [ReDoc](http://localhost:8000/api/redoc) - Alternative API documentation

### Community
- GitHub Repository: [StoryCore-Engine](https://github.com/your-org/storycore-engine)
- Issue Tracker: Report bugs and request features
- Discussions: Ask questions and share ideas

---

## API Versioning

**Current Version**: v1.0.0

The API uses URL-based versioning (`/api/v1/`). Breaking changes will result in a new version (`/api/v2/`).

**Deprecation Policy**: Deprecated endpoints will be supported for at least 6 months after deprecation notice.

---

## Security

### Best Practices

1. **Never commit tokens** to version control
2. **Use HTTPS** in production
3. **Rotate tokens** regularly
4. **Implement token refresh** before expiration
5. **Handle errors** gracefully
6. **Monitor rate limits** proactively
7. **Validate responses** before using data

### Reporting Security Issues

If you discover a security vulnerability, please email security@storycore.example.com. Do not create public GitHub issues for security vulnerabilities.

---

## Changelog

### v1.0.0 (2026-01-25)

**Initial Release**

- JWT-based authentication
- Project generation from natural language prompts
- Project management (open, close, list, delete)
- Project modifications (scenes, characters, sequences)
- Storage monitoring and limits
- Rate limiting (100 req/min)
- Usage tracking and analytics
- Comprehensive API documentation

---

## License

This API is part of the StoryCore-Engine project and is licensed under the MIT License.

---

## Getting Help

1. **Check the documentation** - Most questions are answered in the guides above
2. **Try the interactive docs** - Test endpoints at http://localhost:8000/api/docs
3. **Search existing issues** - Someone may have had the same problem
4. **Create an issue** - If you can't find an answer, open a GitHub issue
5. **Contact support** - For urgent issues, email support@storycore.example.com

---

**Happy coding! 🚀**
