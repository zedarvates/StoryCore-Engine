# ComfyUI Documentation Index

**Quick navigation for all ComfyUI-related documentation**

## 🚀 Start Here

### First Time Setup?

**→ [⚡ Quick Start Guide](COMFYUI_QUICK_START.md)** - Get connected in 2 minutes!

This guide will:
- Help you identify your ComfyUI type
- Show you which port to use (8000 or 8188)
- Walk you through CORS configuration
- Get you connected to Creative Studio UI

## 📖 Complete Guides

### For ComfyUI Desktop Users

**→ [🖥️ Desktop Setup Guide](COMFYUI_DESKTOP_SETUP.md)**

Complete guide covering:
- Installation and verification
- CORS configuration (Enable CORS header field)
- Port 8000 configuration
- Connection testing
- Troubleshooting
- Security considerations
- Quick reference card

**Key Info**: ComfyUI Desktop uses **port 8000** by default

### For Manual/StabilityMatrix/Docker Users

**→ [🔧 Instance Troubleshooting](comfyui-instance-troubleshooting.md)**

Comprehensive troubleshooting for:
- Manual ComfyUI installations
- StabilityMatrix setups
- Docker/Portainer deployments
- CORS configuration via command line
- Port 8188 configuration

**Key Info**: Manual installations use **port 8188** by default

## 🔧 Reference Guides

### Port Configuration

**→ [📋 Port Reference Guide](COMFYUI_PORT_REFERENCE.md)**

Quick reference for:
- Port comparison table (Desktop vs Manual)
- Quick connection tests
- Configuration scenarios
- Troubleshooting port issues
- Best practices

**Use this when**: You're not sure which port to use or having connection issues

### Multi-Instance Setup

**→ [🔀 Multi-Instance User Guide](comfyui-multi-instance-user-guide.md)**

Advanced guide for:
- Running multiple ComfyUI instances
- Load balancing
- GPU allocation
- Instance management
- Health monitoring

**Use this when**: You want to run multiple ComfyUI instances simultaneously

## 🎯 Quick Decision Tree

```
┌─ Do you have ComfyUI Desktop?
│
├─ YES → Read Desktop Setup Guide
│         Port: 8000
│         CORS: Settings → Enable CORS header
│
└─ NO ─┬─ Manual installation?
       │
       ├─ YES → Read Quick Start + Troubleshooting
       │         Port: 8188
       │         CORS: --enable-cors-header
       │
       └─ NOT SURE → Read Quick Start Guide
                      Test both ports (8000 and 8188)
```

## 🆘 Common Issues

### Connection Refused

**Symptoms**: Can't connect to ComfyUI  
**Likely Cause**: Wrong port  
**Solution**: [Port Reference Guide](COMFYUI_PORT_REFERENCE.md)

### CORS Error (403)

**Symptoms**: "blocked by CORS policy"  
**Likely Cause**: CORS not configured  
**Solution**: 
- Desktop: [Desktop Setup Guide](COMFYUI_DESKTOP_SETUP.md#cors-configuration)
- Manual: [Troubleshooting Guide](comfyui-instance-troubleshooting.md#cors-cross-origin-errors)

### Wrong Port

**Symptoms**: Works in browser but not in Creative Studio UI  
**Likely Cause**: Port mismatch  
**Solution**: [Quick Start Guide](COMFYUI_QUICK_START.md#step-2-quick-port-test)

### Can't Find Settings

**Symptoms**: Don't see CORS settings  
**Likely Cause**: Different UI for Desktop vs Manual  
**Solution**: 
- Desktop: Look for ⚙️ icon in ComfyUI Desktop
- Manual: Use command line arguments

## 📊 Quick Reference

### Port Comparison

| Installation | Default Port | CORS Configuration |
|--------------|--------------|-------------------|
| ComfyUI Desktop | **8000** | Settings → Enable CORS header |
| Manual ComfyUI | **8188** | `--enable-cors-header` argument |
| StabilityMatrix | **8188** | Launch arguments |
| Docker | **8188** | Command arguments |

### Quick Tests

```bash
# Test ComfyUI Desktop (port 8000)
curl http://localhost:8000/system_stats

# Test Manual ComfyUI (port 8188)
curl http://localhost:8188/system_stats

# Check which ports are in use
netstat -ano | findstr :8000  # Windows
netstat -ano | findstr :8188  # Windows

lsof -i :8000  # Linux/Mac
lsof -i :8188  # Linux/Mac
```

### CORS Configuration

**ComfyUI Desktop**:
```
Settings → Enable CORS header → Enter:
- * (all origins - development)
- http://localhost:5173 (specific - recommended)
```

**Manual ComfyUI**:
```bash
python main.py --enable-cors-header --cors-header-value=http://localhost:5173
```

## 📚 All Documentation Files

### Setup & Configuration
- [⚡ Quick Start Guide](COMFYUI_QUICK_START.md) - 2-minute setup
- [🖥️ Desktop Setup Guide](COMFYUI_DESKTOP_SETUP.md) - Complete Desktop guide
- [📋 Port Reference](COMFYUI_PORT_REFERENCE.md) - Port configuration reference

### Troubleshooting & Advanced
- [🔧 Instance Troubleshooting](comfyui-instance-troubleshooting.md) - Comprehensive troubleshooting
- [🔀 Multi-Instance Guide](comfyui-multi-instance-user-guide.md) - Multiple instances setup

### Integration & Development
- [🔗 Integration Guide](INTEGRATION_GUIDE.md) - API integration
- [🛡️ Security Guide](SECURITY.md) - Security best practices
- [⚠️ Error Handling](ERROR_HANDLING.md) - Error handling overview

## 🎓 Learning Path

### Beginner
1. Start with [Quick Start Guide](COMFYUI_QUICK_START.md)
2. Follow your specific setup guide (Desktop or Manual)
3. Test connection
4. Start using Creative Studio UI

### Intermediate
1. Review [Port Reference Guide](COMFYUI_PORT_REFERENCE.md)
2. Learn about [Multi-Instance Setup](comfyui-multi-instance-user-guide.md)
3. Explore [Troubleshooting Guide](comfyui-instance-troubleshooting.md)

### Advanced
1. Study [Integration Guide](INTEGRATION_GUIDE.md)
2. Implement [Security Best Practices](SECURITY.md)
3. Set up multiple instances with load balancing
4. Configure network access and remote connections

## 💡 Pro Tips

1. **Always test with curl first** - Faster than UI testing
2. **Use `*` for CORS during development** - Easier setup
3. **Document your port if you change it** - Avoid confusion later
4. **Restart after CORS changes** - Required for changes to take effect
5. **Check both ports if unsure** - Quick way to identify your setup

## 🔗 External Resources

- [ComfyUI Official Documentation](https://github.com/comfyanonymous/ComfyUI)
- [ComfyUI Desktop](https://www.comfy.org/desktop)
- [StabilityMatrix](https://github.com/LykosAI/StabilityMatrix)

## 📞 Getting Help

### Documentation Issues
- Check the [Troubleshooting Guide](comfyui-instance-troubleshooting.md)
- Review [Common Issues](#-common-issues) above
- Search existing GitHub issues

### Still Stuck?
1. Collect diagnostic information:
   - ComfyUI version and type (Desktop/Manual)
   - Port being used (8000 or 8188)
   - Error messages from browser console
   - Output from curl tests
2. Check [GitHub Issues](https://github.com/your-repo/issues)
3. Create a new issue with diagnostic info

---

**Remember**: 
- ComfyUI Desktop = Port **8000**
- Manual ComfyUI = Port **8188**

When in doubt, test both ports with curl!

**Last Updated**: January 19, 2026
