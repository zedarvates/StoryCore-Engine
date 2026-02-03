graph TD
    A[Creative Studio UI] --> B[FastAPI Backend]
    B --> C[GitHub API]
    B --> D[Rate Limiter]
    B --> E[Payload Validator]
    B --> F[Size Validator]
    
    D --> G[IP Tracking]
    E --> H[JSON Schema]
    F --> I[Size Limits]
    
    C --> J[GitHub Issues]
    
    style A fill:#e1f5fe
    style B fill:#f3e5f5
    style C fill:#e8f5e8
    style D fill:#fff3e0
    style E fill:#fce4ec
    style F fill:#f1f8e9
    style G fill:#e0f2f1
    style H fill:#f3e5f5
    style I fill:#fff3e0
    style J fill:#e8f5e8