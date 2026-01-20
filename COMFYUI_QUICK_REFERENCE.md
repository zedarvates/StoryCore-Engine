# ComfyUI Quick Reference Card

**Bookmark this page!**

## 🔑 Essential Info

### Ports
- **Desktop**: 8000
- **Manual**: 8188

### CORS
- **Desktop**: Settings → Enable CORS header → `*`
- **Manual**: `--enable-cors-header --cors-header-value=*`

## ⚡ Quick Commands

```bash
# Test ports
curl http://localhost:8000/system_stats  # Desktop
curl http://localhost:8188/system_stats  # Manual

# Check port usage
netstat -ano | findstr :8000  # Windows Desktop
netstat -ano | findstr :8188  # Windows Manual
lsof -i :8000                 # Mac/Linux Desktop
lsof -i :8188                 # Mac/Linux Manual
```

## 📋 Setup Steps

1. **Identify**: Test both ports, use the one that responds
2. **CORS**: Enable in settings (Desktop) or command line (Manual)
3. **Configure**: Creative Studio UI → localhost:8000 or 8188
4. **Test**: Should show ✅ Connected

## 🆘 Quick Fixes

| Issue | Fix |
|-------|-----|
| Connection Refused | Check port with curl |
| CORS Error | Enable CORS, restart |
| Wrong Port | Test both 8000 and 8188 |
| Can't Find Settings | Desktop = GUI, Manual = CLI |

## 📚 Documentation

| Need | Link | Time |
|------|------|------|
| Fastest | [30 Seconds](COMFYUI_30_SECONDS.md) | 30 sec |
| Quick | [Cheatsheet](COMFYUI_SETUP_CHEATSHEET.md) | 2 min |
| Identify | [Which ComfyUI?](WHICH_COMFYUI_DO_I_HAVE.md) | 30 sec |
| Setup | [Quick Start](docs/COMFYUI_QUICK_START.md) | 5 min |
| Desktop | [Desktop Guide](docs/COMFYUI_DESKTOP_SETUP.md) | 10 min |
| Ports | [Port Reference](docs/COMFYUI_PORT_REFERENCE.md) | 5 min |
| All Docs | [Index](COMFYUI_DOCUMENTATION_INDEX.md) | - |

---

**Remember**: Desktop = 8000 | Manual = 8188
