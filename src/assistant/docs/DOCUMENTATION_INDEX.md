# StoryCore AI Assistant - Documentation Index

## 📚 Complete Documentation Suite

This directory contains comprehensive documentation for the StoryCore AI Assistant API, including API reference, authentication guides, rate limiting documentation, and practical usage examples.

---

## 📖 Documentation Files

### 1. **README.md** - Documentation Hub
**Purpose**: Central hub for all documentation with quick links and overview

**Key Sections**:
- Documentation index with descriptions
- Quick start guide
- Common use cases
- API limits and quotas
- Error codes reference
- Support resources

**Start here if**: You're new to the API and want an overview

---

### 2. **API_DOCUMENTATION.md** - Complete API Reference
**Purpose**: Comprehensive reference for all API endpoints

**Contents**:
- Authentication flow overview
- Rate limiting policy
- Error handling and status codes
- All API endpoints with:
  - Request/response formats
  - Parameters and body schemas
  - Example requests and responses
  - Error scenarios
- Complete workflow examples (Python, JavaScript, cURL)
- Best practices

**File Size**: ~500 lines  
**Use this when**: You need detailed information about specific endpoints

---

### 3. **AUTHENTICATION_GUIDE.md** - Authentication Deep Dive
**Purpose**: In-depth guide to JWT authentication implementation

**Contents**:
- Authentication architecture diagrams
- Token types (access & refresh tokens)
- Complete authentication flow
- Implementation examples:
  - Python with automatic token refresh
  - JavaScript/TypeScript with token management
  - cURL examples
- Token refresh strategies:
  - Proactive refresh
  - Reactive refresh
  - Background refresh
- Security best practices
- Troubleshooting common auth issues

**File Size**: ~600 lines  
**Use this when**: Implementing authentication or debugging auth issues

---

### 4. **RATE_LIMITING_GUIDE.md** - Rate Limit Management
**Purpose**: Understanding and handling API rate limits

**Contents**:
- Rate limiting policy (100 req/min)
- Sliding window algorithm explanation
- Rate limit headers reference
- Handling strategies:
  - Monitor and throttle
  - Exponential backoff
  - Request queuing
  - Adaptive rate limiting
- Implementation examples:
  - Python rate-limited client
  - JavaScript rate limiter
  - Request queue implementation
- Best practices for high-volume usage
- Troubleshooting rate limit issues

**File Size**: ~700 lines  
**Use this when**: Handling high-volume requests or encountering 429 errors

---

### 5. **API_USAGE_GUIDE.md** - Practical Examples
**Purpose**: Copy-paste examples for common workflows

**Contents**:
- Quick start (5-minute example)
- Common workflows:
  - Create and customize project
  - Batch project generation
  - Project modification pipeline
- Language-specific examples:
  - Python with requests
  - JavaScript/TypeScript with fetch
  - cURL commands
- Advanced usage:
  - Concurrent requests with rate limiting
  - Streaming progress updates
  - Retry logic with exponential backoff
- Error handling patterns
- Performance optimization techniques

**File Size**: ~400 lines  
**Use this when**: You want practical, ready-to-use code examples

---

### 6. **openapi.json** - OpenAPI Specification
**Purpose**: Machine-readable API specification

**Contents**:
- OpenAPI 3.1.0 specification
- All endpoints with schemas
- Request/response models
- Authentication schemes
- Error responses

**File Size**: ~2000 lines (JSON)  
**Use this when**: 
- Generating API clients
- Importing into API testing tools (Postman, Insomnia)
- Validating requests/responses
- Generating documentation

**Tools that use this**:
- Swagger UI (http://localhost:8000/api/docs)
- ReDoc (http://localhost:8000/api/redoc)
- OpenAPI Generator
- Postman
- Insomnia

---

## 🚀 Quick Navigation

### By Task

| Task | Documentation |
|------|---------------|
| Getting started | [README.md](./README.md#quick-start) |
| Authenticate | [AUTHENTICATION_GUIDE.md](./AUTHENTICATION_GUIDE.md#authentication-flow) |
| Generate project | [API_DOCUMENTATION.md](./API_DOCUMENTATION.md#post-generateproject) |
| Handle rate limits | [RATE_LIMITING_GUIDE.md](./RATE_LIMITING_GUIDE.md#handling-rate-limits) |
| Error handling | [API_USAGE_GUIDE.md](./API_USAGE_GUIDE.md#error-handling) |
| Code examples | [API_USAGE_GUIDE.md](./API_USAGE_GUIDE.md#language-specific-examples) |

### By Language

| Language | Examples |
|----------|----------|
| Python | [API_USAGE_GUIDE.md](./API_USAGE_GUIDE.md#python-with-requests) |
| JavaScript | [API_USAGE_GUIDE.md](./API_USAGE_GUIDE.md#javascripttypescript-with-fetch) |
| cURL | [API_USAGE_GUIDE.md](./API_USAGE_GUIDE.md#curl-examples) |

### By Topic

| Topic | Documentation |
|-------|---------------|
| Authentication | [AUTHENTICATION_GUIDE.md](./AUTHENTICATION_GUIDE.md) |
| Rate Limiting | [RATE_LIMITING_GUIDE.md](./RATE_LIMITING_GUIDE.md) |
| Error Codes | [API_DOCUMENTATION.md](./API_DOCUMENTATION.md#error-handling) |
| Security | [AUTHENTICATION_GUIDE.md](./AUTHENTICATION_GUIDE.md#security-best-practices) |
| Performance | [API_USAGE_GUIDE.md](./API_USAGE_GUIDE.md#performance-optimization) |

---

## 🔧 Interactive Tools

### Swagger UI
**URL**: http://localhost:8000/api/docs

**Features**:
- Interactive API testing
- Try endpoints directly in browser
- View request/response schemas
- Authentication configuration
- Example requests

**Best for**: Testing endpoints and exploring the API

---

### ReDoc
**URL**: http://localhost:8000/api/redoc

**Features**:
- Clean, readable documentation
- Searchable endpoint list
- Detailed schema documentation
- Code samples
- Download OpenAPI spec

**Best for**: Reading documentation and understanding schemas

---

## 📊 Documentation Statistics

| Document | Lines | Topics | Examples |
|----------|-------|--------|----------|
| API_DOCUMENTATION.md | ~500 | 20+ endpoints | 15+ |
| AUTHENTICATION_GUIDE.md | ~600 | 7 sections | 10+ |
| RATE_LIMITING_GUIDE.md | ~700 | 6 sections | 12+ |
| API_USAGE_GUIDE.md | ~400 | 6 sections | 20+ |
| **Total** | **~2200** | **40+** | **57+** |

---

## 🎯 Learning Path

### Beginner Path
1. Read [README.md](./README.md) - Get overview
2. Try [Quick Start](./README.md#quick-start) - Make first request
3. Explore [Swagger UI](http://localhost:8000/api/docs) - Test endpoints
4. Review [API_USAGE_GUIDE.md](./API_USAGE_GUIDE.md) - Copy examples

### Intermediate Path
1. Study [AUTHENTICATION_GUIDE.md](./AUTHENTICATION_GUIDE.md) - Implement auth
2. Review [RATE_LIMITING_GUIDE.md](./RATE_LIMITING_GUIDE.md) - Handle limits
3. Read [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) - Learn all endpoints
4. Practice [Common Workflows](./API_USAGE_GUIDE.md#common-workflows)

### Advanced Path
1. Implement [Concurrent Requests](./API_USAGE_GUIDE.md#concurrent-requests-with-rate-limiting)
2. Build [Adaptive Rate Limiter](./RATE_LIMITING_GUIDE.md#strategy-4-adaptive-rate-limiting)
3. Create [Custom Client Library](./API_USAGE_GUIDE.md#language-specific-examples)
4. Optimize [Performance](./API_USAGE_GUIDE.md#performance-optimization)

---

## 🔍 Search Tips

### Finding Information

**By Endpoint**:
- Search for endpoint path (e.g., `/generate/project`)
- Look in [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)

**By Error Code**:
- Search for error code (e.g., `RATE_LIMIT_EXCEEDED`)
- Check [API_DOCUMENTATION.md](./API_DOCUMENTATION.md#error-handling)

**By Language**:
- Search for language name (e.g., "Python", "JavaScript")
- Look in [API_USAGE_GUIDE.md](./API_USAGE_GUIDE.md)

**By Concept**:
- Search for concept (e.g., "token refresh", "backoff")
- Check relevant guide (auth, rate limiting, etc.)

---

## 📝 Documentation Maintenance

### Generating OpenAPI Spec

```bash
python src/assistant/scripts/generate_openapi_spec.py
```

This generates `openapi.json` from the FastAPI application.

### Updating Documentation

When updating the API:
1. Update endpoint docstrings in code
2. Regenerate OpenAPI spec
3. Update relevant markdown files
4. Test examples in documentation
5. Update version numbers

---

## 🆘 Getting Help

### Documentation Issues
- **Unclear documentation**: Open GitHub issue with "docs" label
- **Missing examples**: Request in GitHub discussions
- **Broken links**: Report in issue tracker

### API Issues
- **Authentication problems**: See [AUTHENTICATION_GUIDE.md](./AUTHENTICATION_GUIDE.md#troubleshooting)
- **Rate limit issues**: See [RATE_LIMITING_GUIDE.md](./RATE_LIMITING_GUIDE.md#troubleshooting)
- **General errors**: See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md#error-handling)

### Support Channels
1. **Documentation** - Check guides first
2. **Interactive Docs** - Test at http://localhost:8000/api/docs
3. **GitHub Issues** - Search existing issues
4. **GitHub Discussions** - Ask questions
5. **Email Support** - support@storycore.example.com

---

## 📄 License

This documentation is part of the StoryCore-Engine project and is licensed under the MIT License.

---

## 🎉 Contributing

Found an error or want to improve the documentation?

1. Fork the repository
2. Make your changes
3. Submit a pull request
4. Include "docs:" prefix in commit message

Example: `docs: Add Python async example to usage guide`

---

**Last Updated**: 2026-01-25  
**API Version**: 1.0.0  
**Documentation Version**: 1.0.0
