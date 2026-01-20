# ComfyUI Desktop Setup Guide for StoryCore-Engine

This guide provides step-by-step instructions for configuring ComfyUI Desktop to work with StoryCore-Engine's Creative Studio UI.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [CORS Configuration](#cors-configuration)
- [Connection Testing](#connection-testing)
- [Troubleshooting](#troubleshooting)
- [Advanced Configuration](#advanced-configuration)

## Prerequisites

Before starting, ensure you have:

- **ComfyUI Desktop** installed and running
- **StoryCore-Engine** Creative Studio UI installed
- **Required Models** for FLUX.2 workflow:
  - `flux2_dev_fp8mixed.safetensors` (~3.5GB)
  - `mistral_3_small_flux2_bf16.safetensors` (~7.2GB)
  - `flux2-vae.safetensors` (~335MB)
- **Minimum Hardware**:
  - GPU: 12GB+ VRAM (16GB+ recommended)
  - RAM: 32GB+ system memory
  - Storage: SSD for optimal performance

> **⚠️ Important Port Information**:  
> ComfyUI Desktop uses **port 8000** by default, while manual ComfyUI installations use **port 8188**.  
> Make sure to use the correct port when configuring your instances!

## Installation

### 1. Install ComfyUI Desktop

Download and install ComfyUI Desktop from the official source:
- Visit the ComfyUI Desktop website
- Download the installer for your operating system
- Follow the installation wizard
- Launch ComfyUI Desktop

### 2. Verify Installation

1. Open ComfyUI Desktop
2. Check that the interface loads correctly
3. Verify the default port (ComfyUI Desktop uses **port 8000** by default)
4. Note the server URL (typically `http://localhost:8000`)

> **Important**: ComfyUI Desktop uses port **8000** by default, while manual ComfyUI installations typically use port **8188**. Make sure to use the correct port in your configuration.

## CORS Configuration

**CRITICAL**: ComfyUI Desktop must be configured to allow cross-origin requests from the Creative Studio UI.

### Step-by-Step CORS Setup

1. **Open ComfyUI Desktop Settings**
   - Launch ComfyUI Desktop
   - Click the **Settings** icon (gear icon) in the interface
   - Navigate to the server/network configuration section

2. **Configure CORS Header**
   - Locate the field labeled **"Enable CORS header"**
   - Enter one of the following values:

   **Option A: Allow All Origins (Development/Testing)**
   ```
   *
   ```
   - Use this for local development and testing
   - Simplest configuration
   - ⚠️ **Not recommended for production**

   **Option B: Specific Domain (Recommended)**
   ```
   http://localhost:5173
   ```
   - Use this if Creative Studio UI runs on port 5173 (Vite default)
   - More secure than wildcard
   - Recommended for regular use

   **Option C: Multiple Origins**
   ```
   http://localhost:5173,http://localhost:3000,http://192.168.1.100:5173
   ```
   - Use this if you access the UI from multiple locations
   - Separate origins with commas (no spaces)
   - Useful for network access

3. **Save and Restart**
   - Click **Save** or **Apply** to save the configuration
   - **Restart ComfyUI Desktop** for changes to take effect
   - Wait for the server to fully initialize

### Verification

After configuring CORS, verify the setup:

1. **Check ComfyUI Console**
   - Look for CORS-related messages in the console
   - Should show enabled CORS with your configured value

2. **Test from Browser**
   ```bash
   # Open browser console and run:
   fetch('http://localhost:8000/system_stats')
     .then(r => r.json())
     .then(console.log)
     .catch(console.error)
   ```
   - Should return system statistics without CORS errors
   - If you see 403 or CORS errors, restart ComfyUI Desktop
   - **Note**: Use port 8000 for ComfyUI Desktop (not 8188)

## Connection Testing

### Test Connection from Creative Studio UI

1. **Launch Creative Studio UI**
   ```bash
   cd creative-studio-ui
   npm run dev
   ```

2. **Open in Browser**
   - Navigate to `http://localhost:5173`
   - Open browser DevTools (F12)
   - Check the Console tab for errors

3. **Configure ComfyUI Instance**
   - In Creative Studio UI, go to Settings
   - Navigate to ComfyUI Instances
   - Add a new instance:
     - **Name**: ComfyUI Desktop
     - **Host**: localhost
     - **Port**: 8000 (ComfyUI Desktop default)
     - **GPU Device**: auto (or specific like cuda:0)

4. **Test Connection**
   - Click **Test Connection** button
   - Should show "✓ Connected" with green status
   - Health metrics should display (CPU, Memory, GPU usage)

### Manual Connection Test

Use curl to test the connection:

```bash
# Test basic connectivity (ComfyUI Desktop uses port 8000)
curl http://localhost:8000/system_stats

# Test with CORS headers
curl -H "Origin: http://localhost:5173" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     http://localhost:8000/system_stats
```

Expected response should include CORS headers:
```
Access-Control-Allow-Origin: http://localhost:5173
Access-Control-Allow-Methods: GET, POST, OPTIONS
```

## Troubleshooting

### Issue: "comfyui-frontend-package not found in requirements.txt" Warning

**Symptoms**:
```
[ComfyUI-Manager] All startup tasks have been completed.
comfyui-frontend-package not found in requirements.txt
comfyui-frontend-package not found in requirements.txt
comfyui-frontend-package not found in requirements.txt
comfyui-frontend-package not found in requirements.txt
```

**Explanation**:
- Ce message est un **avertissement bénin**, pas une erreur
- ComfyUI Desktop cherche le package frontend dans requirements.txt
- Le package frontend est déjà intégré dans ComfyUI Desktop
- **Aucune action requise** - ComfyUI fonctionne normalement

**Solutions (optionnelles)**:

1. **Ignorer le message** (Recommandé)
   - Le message n'affecte pas le fonctionnement
   - ComfyUI Desktop fonctionne correctement
   - Aucune action nécessaire

2. **Supprimer l'avertissement** (Avancé)
   - Créer un fichier `requirements.txt` dans le dossier ComfyUI:
   ```bash
   # Naviguer vers le dossier ComfyUI Desktop
   cd /path/to/ComfyUI
   
   # Créer requirements.txt avec le package
   echo "comfyui-frontend-package" > requirements.txt
   ```
   - Redémarrer ComfyUI Desktop
   - Le message ne devrait plus apparaître

3. **Vérifier que tout fonctionne**
   - Tester la connexion depuis Creative Studio UI
   - Vérifier que les workflows s'exécutent correctement
   - Si tout fonctionne, ignorer le message

> **Note**: Ce message apparaît uniquement au démarrage et n'indique pas un problème. ComfyUI Desktop inclut déjà tous les composants frontend nécessaires.

### Issue: CORS Errors Persist After Configuration

**Symptoms**:
```
Access to fetch at 'http://localhost:8000/system_stats' from origin 'http://localhost:5173' 
has been blocked by CORS policy
```

**Solutions**:

1. **Verify CORS Value**
   - Double-check the CORS header value in settings
   - Ensure no extra spaces or typos
   - Match the exact origin (including http:// and port)

2. **Restart ComfyUI Desktop**
   - Completely close ComfyUI Desktop
   - Wait 5 seconds
   - Relaunch the application
   - Wait for full initialization

3. **Check Port Mismatch**
   - Verify Creative Studio UI port: Check browser URL
   - Verify ComfyUI Desktop port: Check settings
   - Update CORS value if ports differ

4. **Clear Browser Cache**
   - Open DevTools (F12)
   - Right-click refresh button → "Empty Cache and Hard Reload"
   - Or use Ctrl+Shift+Delete to clear cache

### Issue: Connection Refused

**Symptoms**:
```
Failed to fetch
net::ERR_CONNECTION_REFUSED
```

**Solutions**:

1. **Verify ComfyUI is Running**
   - Check ComfyUI Desktop window is open
   - Look for "Server running on..." message
   - Verify no error messages in console

2. **Check Port Availability**
   ```bash
   # Windows (ComfyUI Desktop uses port 8000)
   netstat -ano | findstr :8000
   
   # Linux/Mac
   lsof -i :8000
   ```
   - Should show ComfyUI Desktop process listening
   - If port is used by another process, change ComfyUI port in settings

3. **Firewall Configuration**
   - Check Windows Firewall or antivirus
   - Allow ComfyUI Desktop through firewall
   - Test with firewall temporarily disabled

### Issue: Slow Response or Timeouts

**Symptoms**:
- Connection takes >5 seconds
- Intermittent timeouts
- Health checks fail randomly

**Solutions**:

1. **Check System Resources**
   - Monitor GPU usage (should be <90%)
   - Check RAM availability (need 4GB+ free)
   - Close unnecessary applications

2. **Optimize ComfyUI Settings**
   - Reduce concurrent workflow limit
   - Enable GPU memory optimization
   - Adjust batch sizes in workflows

3. **Network Configuration**
   - Use `localhost` instead of `127.0.0.1`
   - Disable VPN if active
   - Check for network monitoring software

### Issue: GPU Not Detected

**Symptoms**:
- GPU usage shows 0% or N/A
- Workflows run on CPU (very slow)
- CUDA errors in console

**Solutions**:

1. **Verify GPU Availability**
   ```bash
   # Check NVIDIA GPU
   nvidia-smi
   
   # Check CUDA
   nvcc --version
   ```

2. **Update GPU Drivers**
   - Download latest drivers from NVIDIA
   - Restart computer after installation
   - Verify with `nvidia-smi` again

3. **Configure GPU in ComfyUI**
   - Check ComfyUI Desktop GPU settings
   - Set to "auto" for automatic detection
   - Or specify device: `cuda:0`

## Advanced Configuration

### Custom Port Configuration

If port 8000 is already in use:

1. **Change ComfyUI Desktop Port**
   - Open Settings in ComfyUI Desktop
   - Find "Server Port" setting
   - Change to available port (e.g., 8001 or 8188)
   - Save and restart

> **Note**: ComfyUI Desktop defaults to port 8000, while manual ComfyUI installations use 8188. Choose a port that doesn't conflict with other services.

2. **Update Creative Studio UI**
   - Update instance configuration
   - Change port to match ComfyUI
   - Test connection

### Environment Variables

For advanced users, ComfyUI Desktop may support environment variables:

```bash
# Set custom port (if needed, default is 8000)
COMFYUI_PORT=8000

# Enable debug logging
COMFYUI_LOG_LEVEL=debug

# GPU configuration
CUDA_VISIBLE_DEVICES=0
```

### Network Access (Remote Connections)

To access ComfyUI Desktop from other devices:

1. **Configure ComfyUI to Listen on All Interfaces**
   - Check for "Listen Address" setting
   - Change from `127.0.0.1` to `0.0.0.0`
   - ⚠️ **Security Warning**: Only do this on trusted networks

2. **Update CORS Configuration**
   ```
   http://192.168.1.100:5173,http://localhost:5173
   ```
   - Include both local and network addresses

3. **Configure Firewall**
   - Allow incoming connections on port 8000 (ComfyUI Desktop default)
   - Test from remote device

### Performance Tuning

For optimal performance:

1. **GPU Memory Management**
   - Enable GPU memory optimization in settings
   - Set appropriate VRAM limits
   - Monitor with `nvidia-smi`

2. **Workflow Optimization**
   - Use FP8 models for lower VRAM usage
   - Reduce batch sizes if needed
   - Enable model caching

3. **System Configuration**
   - Close background applications
   - Disable Windows visual effects
   - Use high-performance power plan

## Security Considerations

### Development vs. Production

**Development (Local Testing)**:
- CORS: `*` is acceptable
- Listen: `127.0.0.1` (localhost only)
- No authentication needed

**Production (Deployed)**:
- CORS: Specific domain only
- Listen: Behind reverse proxy
- Enable authentication
- Use HTTPS

### Best Practices

1. **Never use `*` in production**
   - Always specify exact origins
   - Use HTTPS in production
   - Implement authentication

2. **Network Security**
   - Only expose on trusted networks
   - Use VPN for remote access
   - Monitor access logs

3. **Regular Updates**
   - Keep ComfyUI Desktop updated
   - Update GPU drivers regularly
   - Monitor security advisories

## Additional Resources

- [ComfyUI Port Reference Guide](COMFYUI_PORT_REFERENCE.md) - Quick reference for port configurations
- [ComfyUI Instance Troubleshooting](comfyui-instance-troubleshooting.md)
- [ComfyUI Multi-Instance User Guide](comfyui-multi-instance-user-guide.md)
- [StoryCore-Engine Documentation](../README.md)

## Getting Help

If you encounter issues not covered in this guide:

1. **Check Logs**
   - ComfyUI Desktop console output
   - Browser DevTools console
   - Creative Studio UI logs

2. **Collect Information**
   - ComfyUI Desktop version
   - Operating system and version
   - GPU model and driver version
   - Exact error messages

3. **Community Support**
   - Check GitHub issues
   - Review ComfyUI forums
   - Contact StoryCore-Engine support

---

**Quick Reference Card**

| Setting | Value | Purpose |
|---------|-------|---------|
| CORS Header | `*` | Allow all origins (dev) |
| CORS Header | `http://localhost:5173` | Specific origin (recommended) |
| ComfyUI Desktop Port | `8000` | Default port for Desktop version |
| Manual ComfyUI Port | `8188` | Default port for manual installation |
| UI Port | `5173` | Vite dev server default |
| Min VRAM | `12GB` | FLUX.2 minimum |
| Recommended VRAM | `16GB+` | Optimal performance |

**Common Commands**

```bash
# Test connection (ComfyUI Desktop uses port 8000)
curl http://localhost:8000/system_stats

# Check GPU
nvidia-smi

# Check port usage (ComfyUI Desktop)
netstat -ano | findstr :8000  # Windows
lsof -i :8000                 # Linux/Mac

# Check port usage (Manual ComfyUI)
netstat -ano | findstr :8188  # Windows
lsof -i :8188                 # Linux/Mac

# Start Creative Studio UI
cd creative-studio-ui && npm run dev
```
