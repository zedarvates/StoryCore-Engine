# ComfyUI Setup Cheatsheet

**Ultra-quick reference - bookmark this page!**

## 🎯 Which Port Do I Use?

| You Have | Port | Guide |
|----------|------|-------|
| 🖥️ ComfyUI Desktop | **8000** | [Setup](docs/COMFYUI_DESKTOP_SETUP.md) |
| 📦 Manual/StabilityMatrix/Docker | **8188** | [Setup](docs/COMFYUI_QUICK_START.md) |
| ❓ Not sure | Test both | [Quick Start](docs/COMFYUI_QUICK_START.md) |

## ⚡ Quick Setup (2 minutes)

### 1. Test Your Port

```bash
# Try Desktop port
curl http://localhost:8000/system_stats

# Try Manual port
curl http://localhost:8188/system_stats

# Whichever responds = your port!
```

### 2. Configure CORS

**ComfyUI Desktop**:
- Open ComfyUI Desktop
- Click Settings (⚙️)
- Find "Enable CORS header"
- Enter: `*`
- Save & Restart

**Manual ComfyUI**:
```bash
python main.py --enable-cors-header --cors-header-value=*
```

### 3. Configure Creative Studio UI

- Settings → ComfyUI Instances → Add
- Host: `localhost`
- Port: `8000` (Desktop) or `8188` (Manual)
- GPU: `auto`
- Test Connection → Should show ✅

## 🆘 Quick Fixes

### Connection Refused
```bash
# Check if ComfyUI is running
netstat -ano | findstr :8000  # Windows Desktop
netstat -ano | findstr :8188  # Windows Manual
lsof -i :8000                 # Mac/Linux Desktop
lsof -i :8188                 # Mac/Linux Manual
```
**Fix**: Start ComfyUI or use correct port

### CORS Error (403)
**Desktop**: Settings → Enable CORS header → `*` → Restart  
**Manual**: Add `--enable-cors-header` when starting

### Wrong Port
**Test both**:
```bash
curl http://localhost:8000/system_stats
curl http://localhost:8188/system_stats
```
**Fix**: Use the port that responds

## 📚 Full Documentation

- [⚡ Quick Start (2 min)](docs/COMFYUI_QUICK_START.md)
- [🖥️ Desktop Setup](docs/COMFYUI_DESKTOP_SETUP.md)
- [📋 Port Reference](docs/COMFYUI_PORT_REFERENCE.md)
- [🔧 Troubleshooting](docs/comfyui-instance-troubleshooting.md)
- [📖 All Docs](docs/COMFYUI_DOCS_INDEX.md)

---

**Remember**: Desktop = 8000 | Manual = 8188
