# Which ComfyUI Do I Have?

**Quick identification guide - 30 seconds**

## 🔍 Visual Identification

### ComfyUI Desktop 🖥️

**You have ComfyUI Desktop if**:
- ✅ You downloaded and installed a standalone application
- ✅ You have a desktop icon or app launcher for "ComfyUI Desktop"
- ✅ The interface has a modern, polished look with a settings gear icon
- ✅ You can access settings through a GUI (not command line)
- ✅ It's a self-contained application (not a Python script)

**Your Port**: **8000**  
**Your Guide**: [Desktop Setup](docs/COMFYUI_DESKTOP_SETUP.md)  
**CORS Setup**: Settings → Enable CORS header → `*`

---

### Manual ComfyUI 📦

**You have Manual ComfyUI if**:
- ✅ You cloned a GitHub repository
- ✅ You start it with `python main.py` or similar command
- ✅ You installed Python dependencies manually
- ✅ You see command line output when running
- ✅ No standalone application or installer

**Your Port**: **8188**  
**Your Guide**: [Quick Start](docs/COMFYUI_QUICK_START.md)  
**CORS Setup**: `python main.py --enable-cors-header --cors-header-value=*`

---

### StabilityMatrix 🔧

**You have StabilityMatrix if**:
- ✅ You installed ComfyUI through StabilityMatrix application
- ✅ You manage ComfyUI from StabilityMatrix interface
- ✅ You can see ComfyUI in StabilityMatrix's package list
- ✅ You configure launch arguments in StabilityMatrix

**Your Port**: **8188**  
**Your Guide**: [Quick Start](docs/COMFYUI_QUICK_START.md)  
**CORS Setup**: StabilityMatrix → ComfyUI Settings → Launch Arguments → Add `--enable-cors-header --cors-header-value=*`

---

### Docker/Portainer 🐳

**You have Docker ComfyUI if**:
- ✅ You run ComfyUI in a Docker container
- ✅ You manage it through Portainer or docker-compose
- ✅ You see it in `docker ps` output
- ✅ You configured it with a docker-compose.yml file

**Your Port**: **8188** (or custom if you changed it)  
**Your Guide**: [Troubleshooting](docs/comfyui-instance-troubleshooting.md#docker-portainer-configuration-linux-ubuntu-24)  
**CORS Setup**: Add to docker command: `--enable-cors-header --cors-header-value=*`

---

## 🧪 Quick Test Method

**Still not sure? Test both ports!**

```bash
# Test Desktop port (8000)
curl http://localhost:8000/system_stats

# Test Manual port (8188)
curl http://localhost:8188/system_stats
```

**Whichever responds with JSON data = your port!**

Example response:
```json
{
  "system": {
    "os": "Windows",
    "python_version": "3.10.0"
  }
}
```

## 📊 Quick Comparison Table

| Feature | Desktop 🖥️ | Manual 📦 | StabilityMatrix 🔧 | Docker 🐳 |
|---------|-----------|-----------|-------------------|-----------|
| **Port** | 8000 | 8188 | 8188 | 8188 |
| **Start Method** | Click app | `python main.py` | StabilityMatrix | `docker start` |
| **CORS Config** | Settings GUI | Command line | Launch args | Docker command |
| **Settings** | GUI | Config files | StabilityMatrix | Environment vars |
| **Updates** | Auto/Manual | Git pull | StabilityMatrix | Image update |

## 🎯 What To Do Next

### If You Have Desktop (Port 8000)
1. Read: [Desktop Setup Guide](docs/COMFYUI_DESKTOP_SETUP.md)
2. Configure CORS: Settings → Enable CORS header → `*`
3. Configure Creative Studio UI: localhost:8000
4. Test connection

### If You Have Manual/StabilityMatrix/Docker (Port 8188)
1. Read: [Quick Start Guide](docs/COMFYUI_QUICK_START.md)
2. Configure CORS: Add `--enable-cors-header` when starting
3. Configure Creative Studio UI: localhost:8188
4. Test connection

### If Still Unsure
1. Read: [Port Reference Guide](docs/COMFYUI_PORT_REFERENCE.md)
2. Test both ports with curl
3. Use the port that responds
4. Follow the appropriate guide

## 🆘 Common Confusion Points

### "I have a GUI but it's not Desktop"
- If you start it with `python main.py`, it's **Manual** (port 8188)
- If you click an app icon, it's **Desktop** (port 8000)

### "I installed through a package manager"
- StabilityMatrix = **Manual** setup (port 8188)
- Standalone installer = **Desktop** (port 8000)

### "I'm using WSL or Linux"
- Check how you start it:
  - Command line = **Manual** (port 8188)
  - App launcher = **Desktop** (port 8000)

### "I changed the port"
- Use whatever port you configured
- Document it for future reference
- Update Creative Studio UI accordingly

## 📚 Full Documentation

- [⚡ Setup Cheatsheet](COMFYUI_SETUP_CHEATSHEET.md) - Ultra-quick reference
- [🚀 Quick Start](docs/COMFYUI_QUICK_START.md) - 2-minute setup
- [🖥️ Desktop Setup](docs/COMFYUI_DESKTOP_SETUP.md) - Complete Desktop guide
- [🔧 Port Reference](docs/COMFYUI_PORT_REFERENCE.md) - Port troubleshooting
- [📖 All Docs](docs/COMFYUI_DOCS_INDEX.md) - Documentation index

---

**Quick Answer**:
- Desktop app with settings GUI = Port **8000**
- Command line with `python main.py` = Port **8188**
- When in doubt, test both ports!
