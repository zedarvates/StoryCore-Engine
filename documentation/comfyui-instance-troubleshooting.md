# ComfyUI Instance Troubleshooting Guide

This guide helps you diagnose and resolve common issues with the multi-instance ComfyUI feature. Issues are organized by category with step-by-step solutions.

## Table of Contents

- [Quick Diagnosis](#quick-diagnosis)
- [Connection Issues](#connection-issues)
- [Configuration Problems](#configuration-problems)
- [GPU and Hardware Issues](#gpu-and-hardware-issues)
- [Performance Problems](#performance-problems)
- [Migration Issues](#migration-issues)
- [Health Monitoring Issues](#health-monitoring-issues)
- [Load Balancing Problems](#load-balancing-problems)
- [Advanced Diagnostics](#advanced-diagnostics)

## Quick Diagnosis

### Instance Status Overview

Check the instance status indicators:
- **🟢 Healthy**: Instance is running and responding normally
- **🟡 Degraded**: Instance has intermittent issues but is operational
- **🔴 Unhealthy**: Instance has critical problems and needs attention
- **⚫ Stopped**: Instance is configured but not running
- **🟠 Error**: Instance failed to start or encountered a fatal error

### Health Check Results

Each instance shows health metrics:
- **Response Time**: Time to respond to health checks (< 1 second is good)
- **CPU Usage**: System processor utilization
- **Memory Usage**: RAM consumption percentage
- **GPU Usage**: GPU utilization (if applicable)
- **Active Workflows**: Number of running workflows
- **Queue Size**: Pending workflow queue length

## Connection Issues

### Instance Won't Start

**Symptoms**: Instance shows "Error" status immediately after clicking Start

**Possible Causes & Solutions**:

1. **Port Already in Use**
   ```
   Error: Port 8188 is already used by instance "Other Instance"
   ```
   - **Solution**: Change the port number in instance configuration
   - **Prevention**: Use "Test Connection" before saving to check port availability

2. **ComfyUI Not Installed or Not Found**
   ```
   Error: Cannot start ComfyUI instance: command not found
   ```
   - **Solution**: Verify ComfyUI installation path
   - **Check**: Run `comfyui --version` in terminal to confirm installation

3. **Permission Issues**
   ```
   Error: Permission denied when starting ComfyUI
   ```
   - **Solution**: Check file permissions on ComfyUI directory
   - **Fix**: Run `chmod +x` on ComfyUI executable or use proper user account

### Connection Refused

**Symptoms**: Instance starts but shows unhealthy status with connection errors

**Error Messages**:
```
Connection failed: ECONNREFUSED
HTTP GET /system_stats failed: Network error
```

**Solutions**:

1. **Wrong Port Configuration**
   - Check if ComfyUI is actually running on the configured port
   - Use `netstat -tulpn | grep <port>` to verify port binding
   - Update instance configuration with correct port

2. **Host Address Issues**
   - Verify the host address is correct (usually "localhost" or "127.0.0.1")
   - For remote instances, ensure network connectivity
   - Check firewall settings blocking the port

3. **ComfyUI Startup Delay**
   - Wait longer for ComfyUI to fully initialize
   - Check ComfyUI logs for startup progress
   - Some GPUs may take longer to initialize

### CORS (Cross-Origin) Errors

**Symptoms**: Connection attempts return 403 errors with CORS warnings

**Error Messages**:
```
WARNING: request with non matching host and origin localhost:8000 != localhost:5173, returning 403
```
or
```
WARNING: request with non matching host and origin localhost:8188 != localhost:5173, returning 403
```

**Cause**: ComfyUI blocks requests from different origins (ports/domains) for security reasons. This commonly occurs when:
- Creative Studio UI runs on `localhost:5173` (Vite dev server)
- ComfyUI Desktop runs on `localhost:8000` (default port)
- Manual ComfyUI runs on `localhost:8188` (default port)
- The browser blocks cross-origin requests

> **Note**: ComfyUI Desktop uses port **8000** by default, while manual installations use port **8188**.

**Solutions**:

1. **Enable CORS in ComfyUI (Recommended for Development)**
   
   **For ComfyUI Desktop Users**:
   - Open ComfyUI Desktop application
   - Go to Settings (gear icon)
   - Find the CORS configuration section
   - In the field **"Enable CORS header"**, enter:
     - `*` for all origins (development/testing)
     - Or specify your domain: `http://localhost:5173`
   - Save settings and restart ComfyUI Desktop
   
   **For StabilityMatrix Users**:
   - Open StabilityMatrix
   - Go to ComfyUI package settings
   - Add launch arguments:
     ```
     --enable-cors-header --cors-header-value=http://localhost:5173
     ```
   - Restart ComfyUI instance

   **For Manual ComfyUI Installation**:
   - Add arguments when starting ComfyUI:
     ```bash
     python main.py --enable-cors-header --cors-header-value=http://localhost:5173
     ```
   - Or for all origins (less secure):
     ```bash
     python main.py --enable-cors-header --cors-header-value=*
     ```

2. **Configure Multiple Origins**
   
   If you need to allow multiple frontend ports:
   ```bash
   --enable-cors-header --cors-header-value="http://localhost:5173,http://localhost:3000"
   ```

3. **Production Configuration**
   
   For production deployments, use specific domain names:
   ```bash
   --enable-cors-header --cors-header-value=https://yourdomain.com
   ```

4. **Docker/Portainer Configuration (Linux Ubuntu 24)**

   **Method 1: Docker Compose**
   
   Edit your `docker-compose.yml`:
   ```yaml
   version: '3.8'
   services:
     comfyui:
       image: comfyui/comfyui:latest
       container_name: comfyui
       command: >
         python main.py 
         --listen 0.0.0.0 
         --port 8188
         --enable-cors-header 
         --cors-header-value=http://localhost:5173
       ports:
         - "8188:8188"
       volumes:
         - ./models:/app/models
         - ./output:/app/output
       environment:
         - NVIDIA_VISIBLE_DEVICES=all
       deploy:
         resources:
           reservations:
             devices:
               - driver: nvidia
                 count: 1
                 capabilities: [gpu]
   ```

   **Method 2: Portainer Stack**
   
   In Portainer UI:
   1. Go to **Stacks** → **Add Stack**
   2. Name your stack (e.g., "comfyui")
   3. Paste the docker-compose configuration above
   4. Adjust `--cors-header-value` to match your frontend URL
   5. Click **Deploy the stack**

   **Method 3: Portainer Container Settings**
   
   For existing containers:
   1. Go to **Containers** → Select your ComfyUI container
   2. Click **Duplicate/Edit**
   3. Under **Command & logging** → **Command**:
      ```
      python main.py --listen 0.0.0.0 --port 8188 --enable-cors-header --cors-header-value=http://localhost:5173
      ```
   4. Click **Deploy the container**

   **Method 4: Environment Variables (Alternative)**
   
   Some ComfyUI Docker images support environment variables:
   ```yaml
   environment:
     - COMFYUI_ARGS=--enable-cors-header --cors-header-value=http://localhost:5173
   ```

   **Network Configuration for Docker**:
   
   If your frontend runs on the host and ComfyUI in Docker:
   ```yaml
   # Use host network mode (simplest but less isolated)
   network_mode: host
   
   # OR use bridge network with proper CORS
   networks:
     - comfyui-network
   
   networks:
     comfyui-network:
       driver: bridge
   ```

   **For Multiple Frontend Origins**:
   ```bash
   --cors-header-value="http://localhost:5173,http://192.168.1.100:5173,http://your-server-ip:5173"
   ```

   **Ubuntu 24 Specific Notes**:
   - Ensure Docker and NVIDIA Container Toolkit are installed:
     ```bash
     sudo apt update
     sudo apt install docker.io docker-compose nvidia-container-toolkit
     sudo systemctl restart docker
     ```
   - Check firewall rules:
     ```bash
     sudo ufw allow 8188/tcp
     sudo ufw status
     ```
   - Verify container logs:
     ```bash
     docker logs comfyui
     # or in Portainer: Containers → comfyui → Logs
     ```

**Verification**:
- Check ComfyUI console logs for CORS warnings
- Open browser DevTools Network tab to see 403 responses
- After applying fix, requests should return 200 status codes
- Test from your frontend:
  ```bash
  # For ComfyUI Desktop (port 8000)
  curl -H "Origin: http://localhost:5173" http://localhost:8000/system_stats
  
  # For Manual ComfyUI (port 8188)
  curl -H "Origin: http://localhost:5173" http://localhost:8188/system_stats
  ```

**Security Note**: Only enable CORS for trusted origins. Using `*` (all origins) is convenient for development but should never be used in production environments.

### Intermittent Connection Failures

**Symptoms**: Instance works sometimes but fails periodically

**Possible Causes**:

1. **Resource Exhaustion**
   - Monitor system resources during failures
   - Check for memory or GPU memory leaks
   - Reduce concurrent workflow limits

2. **Network Instability**
   - Test network stability between application and ComfyUI
   - Use `ping` to check connectivity
   - Consider using local sockets instead of network ports

## Configuration Problems

### Invalid Configuration Errors

**Common Validation Errors**:

1. **Port Range Error**
   ```
   Port must be between 1 and 65535
   ```
   - **Solution**: Choose a valid port number (recommended: 8188-8199)

2. **GPU Device Not Found**
   ```
   GPU device 'cuda:2' not available on this system
   ```
   - **Solution**: Check available GPUs with `nvidia-smi`
   - Use "auto" for automatic GPU selection
   - Update configuration to use available device

3. **Path Validation Errors**
   ```
   Custom nodes path does not exist or is not accessible
   ```
   - **Solution**: Verify the directory path exists
   - Check read/write permissions
   - Use absolute paths when possible

### Environment Variable Issues

**Symptoms**: Instance starts but workflows fail with environment-related errors

**Common Problems**:

1. **CUDA_VISIBLE_DEVICES Mismatch**
   ```bash
   # Check current CUDA devices
   nvidia-smi --list-gpus

   # Verify environment variable
   echo $CUDA_VISIBLE_DEVICES
   ```

2. **Python Path Issues**
   - Ensure ComfyUI can find required Python packages
   - Check PYTHONPATH environment variable
   - Verify virtual environment activation

3. **Custom Node Path Problems**
   - Confirm custom nodes directory structure
   - Check for missing dependencies in custom nodes
   - Update custom node paths in configuration

## GPU and Hardware Issues

### GPU Not Detected

**Symptoms**: Instance shows GPU usage as 0% or "N/A"

**Diagnostic Steps**:

1. **Verify GPU Availability**
   ```bash
   # List available GPUs
   nvidia-smi --list-gpus

   # Check CUDA installation
   nvcc --version

   # Test GPU with simple command
   python -c "import torch; print(torch.cuda.is_available())"
   ```

2. **Configuration Fixes**
   - Set GPU device to "auto" for automatic detection
   - Specify correct CUDA device ID (cuda:0, cuda:1, etc.)
   - Check GPU driver versions match CUDA toolkit

3. **Environment Variables**
   ```json
   {
     "CUDA_VISIBLE_DEVICES": "0",
     "TORCH_USE_CUDA_DSA": "1"
   }
   ```

### Out of Memory Errors

**Symptoms**: Workflows fail with CUDA out of memory or similar errors

**Solutions**:

1. **Reduce Batch Size**
   - Lower batch sizes in workflows
   - Process images individually instead of batches
   - Use smaller model variants

2. **Memory Optimization**
   ```json
   {
     "PYTORCH_CUDA_ALLOC_CONF": "max_split_size_mb:512",
     "CUDA_LAUNCH_BLOCKING": "1"
   }
   ```

3. **Resource Limits**
   - Reduce max concurrent workflows to 1
   - Add delays between workflow executions
   - Monitor VRAM usage and set appropriate limits

### CPU Fallback Issues

**Symptoms**: GPU instance falls back to CPU processing

**Diagnostic Steps**:

1. **Check GPU Status**
   ```bash
   # Monitor GPU processes
   nvidia-smi

   # Check for GPU memory leaks
   fuser -v /dev/nvidia*
   ```

2. **Restart GPU Services**
   - Restart ComfyUI instance
   - Reset GPU memory if possible
   - Check for conflicting GPU processes

## Performance Problems

### Slow Response Times

**Symptoms**: Health checks show high response times (>5 seconds)

**Optimization Steps**:

1. **System Resources**
   - Monitor CPU, memory, and disk I/O
   - Close unnecessary applications
   - Check for background processes consuming resources

2. **Network Latency**
   - Test local vs. network latency
   - Use localhost instead of IP addresses
   - Consider Unix domain sockets for local communication

3. **ComfyUI Configuration**
   - Adjust ComfyUI performance settings
   - Enable/disable GPU optimizations
   - Configure appropriate thread pools

### Workflow Queue Backlog

**Symptoms**: Queue size grows continuously

**Solutions**:

1. **Load Balancing**
   - Add more instances to distribute load
   - Switch to least-loaded balancing strategy
   - Implement workflow prioritization

2. **Resource Optimization**
   - Increase concurrent workflow limits if hardware allows
   - Optimize workflow configurations for speed
   - Cache frequently used models

3. **Monitoring**
   - Monitor queue size trends
   - Identify bottleneck workflows
   - Implement automatic scaling if needed

## Migration Issues

### Legacy Configuration Problems

**Symptoms**: Migration fails or creates incorrect instance configuration

**Recovery Steps**:

1. **Manual Migration**
   - Locate original ComfyUI configuration files
   - Create new instance with original settings
   - Test workflows with new configuration

2. **Configuration Backup**
   - Export instance configurations before changes
   - Keep backup of original single-instance setup
   - Document custom settings and paths

### Compatibility Issues

**Symptoms**: Existing workflows fail with new instance system

**Solutions**:

1. **API Compatibility**
   - Verify workflow JSON format is valid
   - Check for deprecated node usage
   - Update workflows to use current ComfyUI version

2. **Path Resolution**
   - Update model paths in workflows
   - Verify custom node references
   - Check output directory permissions

## Health Monitoring Issues

### False Positive Health Checks

**Symptoms**: Instance marked unhealthy despite being functional

**Configuration Fixes**:

1. **Health Check Parameters**
   - Adjust health check intervals (default: 30 seconds)
   - Modify consecutive failure thresholds (default: 3)
   - Configure appropriate timeout values

2. **Endpoint Validation**
   - Verify `/system_stats` endpoint is accessible
   - Check for custom ComfyUI installations
   - Confirm API compatibility

### Missing Health Metrics

**Symptoms**: Health checks succeed but metrics are incomplete

**Diagnostic Steps**:

1. **System Stats Access**
   - Check ComfyUI version supports system stats
   - Verify GPU monitoring capabilities
   - Review ComfyUI configuration for stats collection

2. **Permission Issues**
   - Ensure ComfyUI has permission to read system stats
   - Check for SELinux or AppArmor restrictions
   - Verify user privileges for hardware monitoring

## Load Balancing Problems

### Uneven Load Distribution

**Symptoms**: Some instances overloaded while others are idle

**Solutions**:

1. **Strategy Selection**
   - Use "least-loaded" for optimal distribution
   - Switch to "round-robin" for predictable allocation
   - Implement custom load balancing logic

2. **Instance Configuration**
   - Balance resource allocations across instances
   - Configure appropriate concurrent limits
   - Monitor actual vs. configured capacities

### Load Balancer Not Working

**Symptoms**: All requests go to one instance despite multiple healthy instances

**Diagnostic Steps**:

1. **Active Instance Check**
   - Verify no active instance is manually selected
   - Check load balancer configuration
   - Review instance health status

2. **Load Balancing Logic**
   - Confirm healthy instances are available
   - Check for instance capacity limits
   - Verify load balancing strategy implementation

## Advanced Diagnostics

### Log Analysis

**Accessing Logs**:

1. **Application Logs**
   - Check main application log files
   - Look for ComfyUI-related error messages
   - Review instance manager logs

2. **ComfyUI Logs**
   - Locate ComfyUI log files per instance
   - Check for startup errors or warnings
   - Monitor workflow execution logs

### Debug Mode

**Enable Debug Logging**:

```typescript
// Enable detailed logging
const logger = getLogger();
logger.setLevel('debug');

// Instance manager debug
instanceManager.setDebugMode(true);
```

### Network Diagnostics

**Testing Connectivity**:

```bash
# Test basic connectivity
# For ComfyUI Desktop (port 8000)
curl -X GET http://localhost:8000/system_stats

# For Manual ComfyUI (port 8188)
curl -X GET http://localhost:8188/system_stats

# Check port binding
netstat -tulpn | grep 8000  # ComfyUI Desktop
netstat -tulpn | grep 8188  # Manual ComfyUI

# Test with timeout
curl --connect-timeout 5 http://localhost:8000/  # Desktop
curl --connect-timeout 5 http://localhost:8188/  # Manual
```

### Performance Profiling

**System Monitoring**:

```bash
# Monitor system resources
top -p $(pgrep -f comfyui)

# GPU monitoring
nvidia-smi --query-gpu=utilization.gpu,utilization.memory,memory.used,memory.free --format=csv

# Memory usage
free -h
vmstat 1
```

### Configuration Validation

**Verify Configuration Files**:

1. **Instance Config File**: `comfyui_instances.json`
   - Check JSON syntax validity
   - Verify all required fields present
   - Validate port and path configurations

2. **Backup and Restore**
   - Create configuration backups before changes
   - Test configuration restoration
   - Validate migrated configurations

---

## Getting Help

If these troubleshooting steps don't resolve your issue:

1. **Collect Diagnostic Information**
   - Instance configuration files
   - Application and ComfyUI log files
   - System information (OS, GPU, memory)
   - Error messages and screenshots

2. **Check Community Resources**
   - Review GitHub issues for similar problems
   - Check ComfyUI documentation and forums
   - Search existing troubleshooting discussions

3. **Contact Support**
   - Include diagnostic information
   - Describe exact symptoms and reproduction steps
   - Mention ComfyUI and system versions

For feature documentation, see the [ComfyUI Multi-Instance User Guide](comfyui-multi-instance-user-guide.md).