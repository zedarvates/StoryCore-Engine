# Architecture Documentation

## 🏗️ System Overview

StoryCore Engine is a comprehensive story creation and video production platform built with a modern tech stack.

## 📐 High-Level Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Frontend      │────▶│   Backend API    │────▶│   Database      │
│   (React/TS)    │◄────│   (FastAPI)      │◄────│   (PostgreSQL)  │
└─────────────────┘     └──────────────────┘     └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Electron      │     │   AI Services    │     │   Storage       │
│   Desktop App   │     │   (LLM, GenAI)   │     │   (S3/Local)    │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

## 🎨 Frontend Architecture

### Technology Stack
- **React 19** with TypeScript
- **Zustand** for state management
- **Tailwind CSS** for styling
- **Vite** for build tooling

### Component Structure
```
src/
├── components/          # Reusable UI components
│   ├── ui/             # Design system components
│   ├── timeline/       # Timeline-related components
│   └── ...
├── hooks/              # Custom React hooks
├── stores/             # Zustand stores
│   └── optimized/      # Optimized store implementations
├── services/           # API and business logic services
│   └── security/       # Security services
├── utils/              # Utility functions
└── config/             # Configuration files
```

### State Management
- **Zustand** for global state
- **Immer** middleware for immutable updates
- **Persistence** middleware for localStorage
- **Memoized selectors** for performance

## ⚙️ Backend Architecture

### Technology Stack
- **Python 3.11+**
- **FastAPI** for REST API
- **SQLAlchemy** for ORM
- **PostgreSQL** for database
- **Pydantic** for data validation

### API Structure
```
src/
├── api/                # API routes
│   ├── v1/            # Version 1 endpoints
│   └── webhooks/      # Webhook handlers
├── services/          # Business logic
├── models/            # Database models
├── schemas/           # Pydantic schemas
└── utils/             # Utilities
```

### Security Layers
1. **Input Validation** - Pydantic models
2. **Rate Limiting** - Per-endpoint limits
3. **Authentication** - JWT tokens
4. **Authorization** - Role-based access
5. **CSP Headers** - XSS protection
6. **CORS** - Cross-origin control

## 🖥️ Electron Desktop Application

### Architecture
```
electron/
├── main/              # Main process
│   ├── UpdateManager.ts
│   ├── UpdateChecker.ts
│   └── ...
├── preload/           # Preload scripts
└── renderer/          # Renderer process (shared with web)
```

### Features
- Auto-update system
- Offline capability
- Native file system access
- System tray integration
- Global keyboard shortcuts

## 🔄 Data Flow

### Typical Request Flow
```
1. User Action (Frontend)
   ↓
2. API Request (Axios/Fetch)
   ↓
3. FastAPI Endpoint
   ↓
4. Validation (Pydantic)
   ↓
5. Business Logic (Services)
   ↓
6. Database (SQLAlchemy)
   ↓
7. Response
   ↓
8. State Update (Zustand)
   ↓
9. UI Re-render (React)
```

### State Update Flow
```
1. User Interaction
   ↓
2. Action Dispatched (Zustand)
   ↓
3. Immer Creates Draft
   ↓
4. State Mutated
   ↓
5. Immer Produces New State
   ↓
6. Persistence Middleware Saves
   ↓
7. Components Re-render (if subscribed)
```

## 🔒 Security Architecture

### Frontend Security
- **CSP Headers** - Script injection prevention
- **Input Sanitization** - Prompt cleaning
- **XSS Protection** - HTML escaping
- **Rate Limiting** - API abuse prevention

### Backend Security
- **SQL Injection Prevention** - ORM usage
- **XSS Prevention** - Input validation
- **CSRF Protection** - Token-based
- **Authentication** - JWT with refresh
- **Authorization** - RBAC system
- **Audit Logging** - Security events

### Data Security
- **Encryption at Rest** - Database encryption
- **Encryption in Transit** - TLS/SSL
- **Secret Management** - Environment variables
- **Access Control** - Principle of least privilege

## 🚀 Deployment Architecture

### Container Architecture
```
┌─────────────────┐
│   Load Balancer │
└────────┬────────┘
         │
┌────────┴────────┐
│   API Service   │
│   (FastAPI)     │
└────────┬────────┘
         │
┌────────┴────────┐
│   PostgreSQL    │
│   (Database)    │
└────────┬────────┘
         │
┌────────┴────────┐
│   Redis Cache   │
└─────────────────┘
```

### CI/CD Pipeline
1. **Code Commit** → GitHub
2. **Linting** → Ruff/ESLint
3. **Type Checking** → TypeScript/Pyright
4. **Testing** → pytest/Vitest
5. **Security Scan** → Trivy/Bandit
6. **Build** → Docker
7. **Deploy** → Staging/Production

## 📊 Performance Optimizations

### Frontend
- **Code Splitting** - Route-based lazy loading
- **Memoization** - React.memo, useMemo, useCallback
- **Virtual Scrolling** - Large list optimization
- **Image Optimization** - Lazy loading, compression
- **Bundle Analysis** - Tree shaking

### Backend
- **Database Indexing** - Query optimization
- **Caching** - Redis for frequent queries
- **Connection Pooling** - Database connections
- **Async Operations** - Non-blocking I/O
- **Query Optimization** - N+1 problem prevention

## 🔍 Monitoring & Observability

### Metrics
- Request latency
- Error rates
- Database query performance
- Cache hit rates
- System resource usage

### Logging
- Structured logging
- Request/response logging
- Error tracking
- Security event logging

### Alerts
- Performance degradation
- Error rate spikes
- Security incidents
- System health

## 📚 Key Design Decisions

### 1. Zustand over Redux
- **Why**: Simpler API, less boilerplate, better TypeScript support
- **Trade-off**: Less middleware ecosystem

### 2. FastAPI over Flask
- **Why**: Automatic docs, async support, type safety
- **Trade-off**: Less mature ecosystem

### 3. React over Vue
- **Why**: Larger ecosystem, better TypeScript integration
- **Trade-off**: More verbose

### 4. PostgreSQL over MongoDB
- **Why**: ACID compliance, better for relational data
- **Trade-off**: Less flexible schema

## 🎯 Scalability Considerations

### Horizontal Scaling
- Stateless API servers
- Load balancer distribution
- Database read replicas
- Redis for session storage

### Vertical Scaling
- Larger API instances
- More powerful database servers
- Increased memory allocation

### Caching Strategy
- CDN for static assets
- Redis for API responses
- Browser caching for immutable resources
- Database query caching

## 🔄 Migration Path

### Current → Future State
1. **Monolith → Microservices**
   - Separate AI services
   - Independent media processing
   
2. **REST → GraphQL**
   - More flexible queries
   - Reduced over-fetching

3. **PostgreSQL → Distributed SQL**
   - CockroachDB for global scale
   - Better horizontal scaling

## 📈 Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| API Response Time | <200ms | ~150ms |
| Frontend TTI | <3s | ~2.5s |
| Database Query Time | <50ms | ~30ms |
| Error Rate | <0.1% | ~0.05% |
| Availability | 99.9% | 99.5% |

## 🚨 Disaster Recovery

### Backup Strategy
- Daily database backups
- Weekly full system snapshots
- Off-site backup storage
- Point-in-time recovery

### Recovery Procedures
- Automated failover
- Database replication
- Health check monitoring
- Incident response plan

## 📝 Documentation Standards

### Code Documentation
- JSDoc for JavaScript/TypeScript
- Docstrings for Python
- README for each major component
- Architecture decision records (ADRs)

### API Documentation
- OpenAPI/Swagger specs
- Example requests/responses
- Error code documentation
- Rate limit information

## 🔗 Integration Points

### External Services
- **AI Providers**: OpenAI, Anthropic
- **Storage**: AWS S3, Cloud Storage
- **CDN**: CloudFlare, AWS CloudFront
- **Monitoring**: Sentry, DataDog
- **CI/CD**: GitHub Actions

## 🎓 Learning Resources

### For New Contributors
1. Start with [CONTRIBUTING.md](CONTRIBUTING.md)
2. Read [DEVELOPMENT.md](DEVELOPMENT.md)
3. Explore the codebase
4. Join community discussions
5. Start with "good first issue" labels

## 📞 Support

- **GitHub Issues**: Bug reports and feature requests
- **Discussions**: General questions and ideas
- **Discord**: Real-time chat and support
- **Email**: project@storycore.engine

---

*Last updated: 2026-05-05*
*Next review: 2026-08-05*