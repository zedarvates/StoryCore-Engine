# ComfyUI Quick Start Guide

**Get connected in 2 minutes!**

## 🚀 Quick Setup

### Step 1: Identify Your ComfyUI Type

| You Have | Default Port | Setup Guide |
|----------|--------------|-------------|
| 🖥️ **ComfyUI Desktop** | **8000** | [Desktop Setup](COMFYUI_DESKTOP_SETUP.md) |
| 📦 **Manual Installation** | **8188** | [Manual Setup](comfyui-instance-troubleshooting.md) |
| 🔧 **StabilityMatrix** | **8188** | [Manual Setup](comfyui-instance-troubleshooting.md) |
| 🐳 **Docker** | **8188** | [Manual Setup](comfyui-instance-troubleshooting.md) |

### Step 2: Quick Port Test

```bash
# Test ComfyUI Desktop (port 8000)
curl http://localhost:8000/system_stats

# Test Manual ComfyUI (port 8188)
curl http://localhost:8188/system_stats
```

**✅ If you get a response**: That's your port!  
**❌ If connection refused**: Try the other port

### Step 3: Configure CORS

#### For ComfyUI Desktop:
1. Open ComfyUI Desktop
2. Click Settings (⚙️)
3. Find "Enable CORS header"
4. Enter: `*` or `http://localhost:5173`
5. Save and restart

#### For Manual ComfyUI:
```bash
python main.py --enable-cors-header --cors-header-value=http://localhost:5173
```

### Step 4: Configure Creative Studio UI

1. Open Creative Studio UI
2. Go to Settings → ComfyUI Instances
3. Add new instance:
   - **Name**: My ComfyUI
   - **Host**: localhost
   - **Port**: `8000` (Desktop) or `8188` (Manual)
   - **GPU**: auto
4. Click "Test Connection"
5. Should show ✅ Connected!

## 🎯 Common Issues

### Issue: "comfyui-frontend-package not found" Warning

**Symptoms**: Message répété au démarrage de ComfyUI Desktop
```
comfyui-frontend-package not found in requirements.txt
```

**Fix**: **Ignorer ce message** - c'est un avertissement bénin
- ComfyUI Desktop fonctionne normalement
- Le package frontend est déjà intégré
- Aucune action requise

**Optionnel**: Créer `requirements.txt` avec `comfyui-frontend-package` pour supprimer le message

### Issue: Connection Refused

**Cause**: Wrong port  
**Fix**: Try the other port (8000 ↔ 8188)

```bash
# Check which port is in use
netstat -ano | findstr :8000  # Windows
netstat -ano | findstr :8188  # Windows

lsof -i :8000  # Linux/Mac
lsof -i :8188  # Linux/Mac
```

### Issue: CORS Error (403)

**Cause**: CORS not configured  
**Fix**: 
- **Desktop**: Settings → Enable CORS header → `*`
- **Manual**: Add `--enable-cors-header` when starting

### Issue: Can't Find Settings

**Desktop**: Look for ⚙️ icon in ComfyUI Desktop interface  
**Manual**: No settings UI, use command line arguments

## 📋 Quick Reference

### ComfyUI Desktop
```
Port: 8000
CORS: Settings → Enable CORS header → *
URL: http://localhost:8000
```

### Manual ComfyUI
```
Port: 8188
CORS: --enable-cors-header --cors-header-value=*
URL: http://localhost:8188
```

### Creative Studio UI
```
Port: 5173 (Vite dev server)
URL: http://localhost:5173
```

## 🔗 Need More Help?

- **Port Issues**: [Port Reference Guide](COMFYUI_PORT_REFERENCE.md)
- **Desktop Setup**: [Desktop Setup Guide](COMFYUI_DESKTOP_SETUP.md)
- **Troubleshooting**: [Troubleshooting Guide](comfyui-instance-troubleshooting.md)

## ⚡ Pro Tips

1. **Use `*` for CORS during development** (easier)
2. **Test with curl first** (faster than UI)
3. **Check both ports** if unsure which you have
4. **Restart after CORS changes** (required)
5. **Document your port** if you change it

---

**Remember**: Desktop = 8000 | Manual = 8188

Still stuck? Check the [full troubleshooting guide](comfyui-instance-troubleshooting.md)!
