# ComfyUI Setup for StoryCore-Engine

**Get connected in 2 minutes!**

## 🎯 Start Here

### Step 1: Identify Your ComfyUI (30 seconds)

**[🔍 Which ComfyUI Do I Have?](WHICH_COMFYUI_DO_I_HAVE.md)**

Quick visual guide to identify if you have:
- 🖥️ ComfyUI Desktop (port 8000)
- 📦 Manual ComfyUI (port 8188)
- 🔧 StabilityMatrix (port 8188)
- 🐳 Docker (port 8188)

### Step 2: Quick Setup (2 minutes)

**[📋 Setup Cheatsheet](COMFYUI_SETUP_CHEATSHEET.md)**

Ultra-quick reference with:
- Port identification
- CORS configuration
- Creative Studio UI setup
- Quick fixes

### Step 3: Detailed Guide (5-10 minutes)

Choose your guide:
- **Desktop**: [🖥️ Desktop Setup Guide](docs/COMFYUI_DESKTOP_SETUP.md)
- **Manual/Other**: [⚡ Quick Start Guide](docs/COMFYUI_QUICK_START.md)

## 🆘 Having Issues?

### Connection Problems
**[🔧 Port Reference Guide](docs/COMFYUI_PORT_REFERENCE.md)**
- Port troubleshooting
- Connection tests
- Configuration scenarios

### Other Issues
**[🔍 Troubleshooting Guide](docs/comfyui-instance-troubleshooting.md)**
- CORS errors
- GPU problems
- Performance issues
- Docker setup

## 📚 All Documentation

**[📖 Complete Documentation Index](COMFYUI_DOCUMENTATION_INDEX.md)**

Access all 14 documentation files organized by:
- User guides
- Setup instructions
- Troubleshooting
- Advanced topics
- Change summaries

## 🔑 Key Information

### Ports
- **ComfyUI Desktop**: Port **8000**
- **Manual/StabilityMatrix/Docker**: Port **8188**

### CORS Configuration
**Desktop**: Settings → Enable CORS header → `*`  
**Manual**: `--enable-cors-header --cors-header-value=*`

### Quick Test
```bash
# Test Desktop
curl http://localhost:8000/system_stats

# Test Manual
curl http://localhost:8188/system_stats
```

## ⚡ Quick Links

| Need | Link | Time |
|------|------|------|
| Identify ComfyUI | [Which ComfyUI?](WHICH_COMFYUI_DO_I_HAVE.md) | 30 sec |
| Quick setup | [Cheatsheet](COMFYUI_SETUP_CHEATSHEET.md) | 2 min |
| Desktop guide | [Desktop Setup](docs/COMFYUI_DESKTOP_SETUP.md) | 10 min |
| Port issues | [Port Reference](docs/COMFYUI_PORT_REFERENCE.md) | 5 min |
| All docs | [Docs Index](COMFYUI_DOCUMENTATION_INDEX.md) | - |

## 💡 Pro Tips

1. **Test port first** - Saves time troubleshooting
2. **Use `*` for CORS** - Easier during development
3. **Restart after CORS** - Required for changes
4. **Bookmark cheatsheet** - Quick reference
5. **Check both ports** - If unsure which you have

## 📞 Getting Help

1. Check the [Cheatsheet](COMFYUI_SETUP_CHEATSHEET.md)
2. Review [Troubleshooting Guide](docs/comfyui-instance-troubleshooting.md)
3. Search [Documentation Index](COMFYUI_DOCUMENTATION_INDEX.md)
4. Open GitHub issue with diagnostic info

---

**Remember**: Desktop = 8000 | Manual = 8188

**Status**: Documentation complete and tested  
**Last Updated**: January 19, 2026
