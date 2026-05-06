## 📂 File Structure

```
StoryCore-Engine/
├── creative-studio-ui/      # Frontend (React + TypeScript)
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── App.tsx          # Main app wrapper (30 lines)
│   │   ├── AppProviders.tsx # Providers (React Query, Zustand, Router)
│   │   ├── AppRoutes.tsx    # Routing configuration
│   │   └── AppContent.tsx   # Main render logic
│   └── vite.config.ts
├── backend/                 # Backend (Python/Flask)
│   ├── api/                 # API endpoints
│   ├── services/            # Business logic
│   └── models/              # Database models
├── electron/                # Electron wrapper
├── cli/                     # CLI tools
├── docs/                    # Documentation (this folder)
├── AUDIT_200_TASKS.md       # Quality improvement roadmap
└── README.md
```

## 🔍 Key Files

- **AUDIT_200_TASKS.md** — Comprehensive 200-task quality audit and improvement plan
- **README.md** — Project overview and quick start
- **docs/DEVELOPMENT.md** — Development setup and contribution guide
- **docs/ARCHITECTURE.md** — System architecture details
- **docs/general/PROJECT_STATUS_LATEST.md** — Current project status
- **creative-studio-ui/src/App.tsx** — Main app entry point
- **creative-studio-ui/src/AppProviders.tsx** — Centralized providers
- **creative-studio-ui/src/AppRoutes.tsx** — Routing configuration
- **backend/main.py** — Backend entry point

## 🔄 Development Workflow

1. **Setup**: See [DEVELOPMENT.md](DEVELOPMENT.md) for environment setup
2. **Quality Checks**: Run `ruff check . --fix` before committing
3. **Type Check**: Run `npm run type-check` in creative-studio-ui
4. **Build**: Run `npm run build` to verify production build
5. **Tests**: Run `npm test` to execute test suite

## 🧪 Testing

- **Frontend**: Vitest (170 passing, 248 failing - pre-existing infrastructure gaps)
- **Backend**: pytest (see backend/ for details)
- **Type Checking**: TypeScript strict mode enabled

## 📦 Deployment

- **Frontend**: Vite build → static assets
- **Backend**: Flask application (WSGI)
- **Electron**: `tsc -p electron/tsconfig.json` → packaged app

## 🤝 Contributing

Please read [DEVELOPMENT.md](DEVELOPMENT.md) for details on our code of conduct and the process for submitting pull requests.

## 📄 License

This project is licensed under the ISC License - see the [LICENSE](../../LICENSE) file for details.

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/zedarvates/StoryCore-Engine/issues)
- **Documentation**: See `docs/` folder for comprehensive guides
- **Audit Roadmap**: [AUDIT_200_TASKS.md](../../AUDIT_200_TASKS.md)