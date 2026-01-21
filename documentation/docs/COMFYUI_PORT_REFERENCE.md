# ComfyUI Port Reference Guide

Quick reference for ComfyUI port configurations to avoid common connection issues.

## Default Ports by Installation Type

| Installation Type | Default Port | Configuration Location |
|------------------|--------------|------------------------|
| **ComfyUI Desktop** | `8000` | Settings → Server Port |
| **Manual Installation** | `8188` | Command line argument or config |
| **StabilityMatrix** | `8188` | Package settings |
| **Docker/Portainer** | `8188` | Container port mapping |

## Why Different Ports?

ComfyUI Desktop uses a different default port (8000) to avoid conflicts with manual installations that typically use port 8188. This allows users to run both versions simultaneously if needed.

## Quick Connection Test

Test which port your ComfyUI instance is using:

```bash
# Test ComfyUI Desktop (port 8000)
curl http://localhost:8000/system_stats

# Test Manual ComfyUI (port 8188)
curl http://localhost:8188/system_stats

# Check which ports are in use
# Windows
netstat -ano | findstr :8000
netstat -ano | findstr :8188

# Linux/Mac
lsof -i :8000
lsof -i :8188
```

## Common Configuration Scenarios

### Scenario 1: ComfyUI Desktop Only

**ComfyUI Desktop Configuration**:
- Port: `8000` (default)
- CORS: `http://localhost:5173` or `*`

**Creative Studio UI Configuration**:
- Host: `localhost`
- Port: `8000`

### Scenario 2: Manual ComfyUI Only

**ComfyUI Startup**:
```bash
python main.py --enable-cors-header --cors-header-value=http://localhost:5173
```
- Port: `8188` (default)

**Creative Studio UI Configuration**:
- Host: `localhost`
- Port: `8188`

### Scenario 3: Both Versions Running

**ComfyUI Desktop**:
- Port: `8000`
- CORS: `http://localhost:5173`

**Manual ComfyUI**:
- Port: `8188`
- CORS: `http://localhost:5173`

**Creative Studio UI**:
- Instance 1: `localhost:8000` (Desktop)
- Instance 2: `localhost:8188` (Manual)

## Troubleshooting Port Issues

### Issue: Connection Refused

**Check if ComfyUI is running on the expected port**:

```bash
# Windows
netstat -ano | findstr :8000
netstat -ano | findstr :8188

# Linux/Mac
lsof -i :8000
lsof -i :8188

# Or use curl to test
curl http://localhost:8000/system_stats
curl http://localhost:8188/system_stats
```

**Solution**: Update your Creative Studio UI instance configuration to use the correct port.

### Issue: Port Already in Use

**Symptoms**:
```
Error: Port 8000 is already in use
```

**Solutions**:

1. **Find what's using the port**:
   ```bash
   # Windows
   netstat -ano | findstr :8000
   
   # Linux/Mac
   lsof -i :8000
   ```

2. **Change ComfyUI port**:
   - **Desktop**: Settings → Server Port → Change to `8001` or `8188`
   - **Manual**: `python main.py --port 8001`

3. **Stop conflicting service**:
   - Identify the process using the port
   - Stop it if not needed
   - Or use a different port

### Issue: Wrong Port in Configuration

**Symptoms**:
- Connection works in browser but not in Creative Studio UI
- CORS errors despite correct configuration
- Intermittent connection failures

**Solution**:
1. Verify ComfyUI's actual port:
   ```bash
   curl http://localhost:8000/system_stats
   curl http://localhost:8188/system_stats
   ```

2. Update Creative Studio UI instance configuration to match

3. Update CORS configuration if needed

## Port Configuration Examples

### ComfyUI Desktop Settings

```
Server Settings:
├── Listen Address: 127.0.0.1
├── Server Port: 8000
└── Enable CORS header: http://localhost:5173
```

### Manual ComfyUI Command Line

```bash
# Default port (8188)
python main.py --enable-cors-header --cors-header-value=http://localhost:5173

# Custom port
python main.py --port 8001 --enable-cors-header --cors-header-value=http://localhost:5173

# Listen on all interfaces (network access)
python main.py --listen 0.0.0.0 --port 8188 --enable-cors-header
```

### Docker Configuration

```yaml
services:
  comfyui:
    ports:
      - "8188:8188"  # host:container
    command: >
      python main.py 
      --listen 0.0.0.0 
      --port 8188
      --enable-cors-header 
      --cors-header-value=http://localhost:5173
```

## Creative Studio UI Instance Configuration

### Adding a ComfyUI Desktop Instance

```json
{
  "name": "ComfyUI Desktop",
  "host": "localhost",
  "port": 8000,
  "gpuDevice": "auto",
  "enabled": true
}
```

### Adding a Manual ComfyUI Instance

```json
{
  "name": "ComfyUI Manual",
  "host": "localhost",
  "port": 8188,
  "gpuDevice": "cuda:0",
  "enabled": true
}
```

### Adding a Remote Instance

```json
{
  "name": "ComfyUI Server",
  "host": "192.168.1.100",
  "port": 8188,
  "gpuDevice": "auto",
  "enabled": true
}
```

## Network Access Considerations

### Local Access Only (Default)

- Listen Address: `127.0.0.1` or `localhost`
- Only accessible from the same machine
- Most secure configuration

### Network Access (Remote Connections)

- Listen Address: `0.0.0.0`
- Accessible from other devices on the network
- Requires firewall configuration
- Update CORS to include network origins

**Example CORS for network access**:
```
http://localhost:5173,http://192.168.1.100:5173,http://192.168.1.101:5173
```

## Best Practices

1. **Use Default Ports When Possible**
   - Desktop: 8000
   - Manual: 8188
   - Reduces confusion and configuration errors

2. **Document Custom Ports**
   - If you change ports, document it
   - Update all configurations consistently
   - Share with team members

3. **Test After Configuration**
   - Always test with curl first
   - Verify in browser console
   - Then test from Creative Studio UI

4. **Firewall Configuration**
   - Allow ports through firewall if needed
   - Only open ports on trusted networks
   - Use VPN for remote access when possible

5. **CORS Configuration**
   - Match CORS origins to actual frontend URLs
   - Include port numbers in origins
   - Use specific origins in production

## Quick Troubleshooting Checklist

- [ ] Verify ComfyUI is running
- [ ] Check which port ComfyUI is using (8000 or 8188)
- [ ] Test connection with curl
- [ ] Verify Creative Studio UI instance configuration matches
- [ ] Check CORS configuration includes correct origin
- [ ] Verify no firewall blocking
- [ ] Check browser console for specific errors
- [ ] Restart ComfyUI after configuration changes

## Related Documentation

- [ComfyUI Desktop Setup Guide](COMFYUI_DESKTOP_SETUP.md)
- [ComfyUI Instance Troubleshooting](comfyui-instance-troubleshooting.md)
- [ComfyUI Multi-Instance User Guide](comfyui-multi-instance-user-guide.md)

---

**Remember**: ComfyUI Desktop = Port 8000 | Manual ComfyUI = Port 8188

When in doubt, test both ports with curl to see which one responds!
