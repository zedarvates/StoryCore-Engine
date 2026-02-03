graph TB
    subgraph "Frontend Layer"
        A[Web App] --> B[API Gateway]
        C[Mobile App] --> B
        D[Desktop App] --> B
        E[Third-party API] --> B
    end
    
    subgraph "API Gateway"
        B --> F[Auth Service]
        B --> G[Subscription Service]
        B --> H[Asset Service]
        B --> I[Usage Service]
        B --> J[Notification Service]
        B --> K[Rate Limiter]
        B --> L[CORS Middleware]
        B --> M[Validation Middleware]
    end
    
    subgraph "Services Layer"
        F --> N[PostgreSQL Users]
        F --> O[Redis Sessions]
        G --> N
        G --> O
        G --> P[Stripe Webhooks]
        H --> Q[PostgreSQL Assets]
        H --> O
        I --> R[PostgreSQL Usage]
        I --> O
        J --> S[PostgreSQL Notifications]
        J --> T[SendGrid]
        K --> U[Redis Rate Limiting]
        L --> V[CORS Config]
        M --> W[Validation Rules]
    end
    
    subgraph "External Services"
        P --> X[Stripe API]
        T --> Y[Email Service]
        Z[Cloudflare] --> B
        AA[AWS/GCP] --> N,Q,R,S,O,U
    end
    
    subgraph "Monitoring"
        BB[Datadog] --> B,F,G,H,I,J,K,L,M
        CC[New Relic] --> B,F,G,H,I,J,K,L,M
        DD[Prometheus] --> B,F,G,H,I,J,K,L,M
    end
    
    subgraph "Security"
        EE[WAF] --> B
        FF[DDoS Protection] --> B
        GG[SSL/TLS] --> B
    end
    
    style A fill:#e1f5fe
    style B fill:#f3e5f5
    style C fill:#e1f5fe
    style D fill:#e1f5fe
    style E fill:#e1f5fe
    style F fill:#fce4ec
    style G fill:#fff3e0
    style H fill:#e8f5e8
    style I fill:#f3e5f5
    style J fill:#e0f2f1
    style K fill:#fff3e0
    style L fill:#e0f2f1
    style M fill:#e8f5e8
    style N fill:#f3e5f5
    style O fill:#e0f2f1
    style P fill:#fff3e0
    style Q fill:#e8f5e8
    style R fill:#f3e5f5
    style S fill:#e0f2f1
    style T fill:#e0f2f1
    style U fill:#e0f2f1
    style V fill:#e0f2f1
    style W fill:#e8f5e8
    style X fill:#fff3e0
    style Y fill:#e0f2f1
    style Z fill:#e8f5e8
    style AA fill:#fff3e0
    style BB fill:#f3e5f5
    style CC fill:#e0f2f1
    style DD fill:#e8f5e8
    style EE fill:#f3e5f5
    style FF fill:#e0f2f1
    style GG fill:#e8f5e8