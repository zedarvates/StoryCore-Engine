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
    end
    
    subgraph "Services Layer"
        F --> K[PostgreSQL]
        F --> L[Redis]
        G --> K
        G --> L
        H --> K
        H --> L
        I --> K
        I --> L
        J --> K
        J --> L
    end
    
    subgraph "External Services"
        M[Stripe] --> G
        N[SendGrid] --> J
        O[Cloudflare] --> B
        P[AWS/GCP] --> K,L
    end
    
    subgraph "Monitoring"
        Q[Datadog] --> B,F,G,H,I,J
        R[New Relic] --> B,F,G,H,I,J
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
    style K fill:#f3e5f5
    style L fill:#e0f2f1
    style M fill:#fff3e0
    style N fill:#e0f2f1
    style O fill:#e8f5e8
    style P fill:#fff3e0
    style Q fill:#f3e5f5
    style R fill:#e0f2f1