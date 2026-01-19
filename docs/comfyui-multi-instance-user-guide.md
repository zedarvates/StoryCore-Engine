# ComfyUI Multi-Instance User Guide

This guide provides comprehensive instructions for using the multi-instance ComfyUI feature, which allows you to run and manage multiple ComfyUI servers simultaneously for improved performance, resource isolation, and workflow organization.

## Table of Contents

- [Overview](#overview)
- [Getting Started](#getting-started)
- [Creating Your First Instance](#creating-your-first-instance)
- [Managing Instances](#managing-instances)
- [Instance Configuration](#instance-configuration)
- [Active Instance Management](#active-instance-management)
- [Integration with Workflows](#integration-with-workflows)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Best Practices](#best-practices)
- [Performance Considerations](#performance-considerations)
- [Security Notes](#security-notes)
- [Migration from Single Instance](#migration-from-single-instance)

## Overview

The multi-instance ComfyUI feature enables you to:

- **Run Multiple Servers**: Manage several ComfyUI instances on different ports or GPUs
- **Resource Isolation**: Separate workflows by GPU, memory usage, or project requirements
- **Load Balancing**: Automatically distribute workload across healthy instances
- **Fault Tolerance**: Continue operation even if individual instances fail
- **Performance Optimization**: Allocate specific GPUs or resources to different workloads

### Key Concepts

- **Instance**: A single ComfyUI server with its own configuration and resources
- **Active Instance**: The currently selected instance for new workflows and operations
- **Health Monitoring**: Automatic checking of instance availability and performance
- **Load Balancing**: Smart distribution of work across running instances

## Getting Started

### Accessing the Instance Manager

1. Open the Creative Studio UI
2. Navigate to the "ComfyUI Instances" tab or panel
3. The instance overview panel displays all configured instances

UI Description: The main panel shows a grid of instance cards, each displaying the instance name, status indicator (green for running, yellow for degraded, red for unhealthy), port number, and quick action buttons.

## Creating Your First Instance

### Step-by-Step Instance Creation

1. **Click "New Instance"**: In the instance panel header, click the "+ New Instance" button
2. **Basic Settings**:
   - **Name**: Enter a descriptive name (e.g., "Character Generation GPU-0")
   - **Port**: Choose an available port (default suggestions: 8188, 8189, 8190, etc.)
   - **Host**: Usually "localhost" unless running remote instances
3. **Resource Configuration**:
   - **GPU Device**: Select from available GPUs (e.g., "cuda:0", "cuda:1") or "auto"
   - **Environment Variables**: Add custom environment variables if needed
   - **Custom Nodes Path**: Specify alternative custom nodes directory
   - **Max Concurrent Workflows**: Limit simultaneous workflows (default: 1)
4. **Runtime Settings**:
   - **Timeout**: Request timeout in milliseconds (default: 300,000ms = 5 minutes)
   - **Queue Monitoring**: Enable/disable queue status tracking
   - **Auto-start**: Automatically start this instance when the application launches
5. **Test & Save**:
   - Click "Test Connection" to verify the instance configuration
   - Review validation feedback for any issues
   - Click "Save" to create the instance

UI Description: A modal dialog appears with tabbed sections for different configuration categories. Each field has inline help text explaining its purpose and valid values.

### Example Configurations

**Basic Instance**:
- Name: "Default Instance"
- Port: 8188
- GPU Device: auto
- Auto-start: enabled

**Dedicated Character Generation**:
- Name: "Character Gen - RTX 4090"
- Port: 8189
- GPU Device: cuda:0
- Max Concurrent Workflows: 2
- Custom Nodes Path: /path/to/character/nodes

**Background Processing**:
- Name: "Batch Processing - RTX 3080"
- Port: 8190
- GPU Device: cuda:1
- Max Concurrent Workflows: 1
- Timeout: 600000 (10 minutes)

## Managing Instances

### Instance Status Overview

Each instance displays a status indicator:
- 🟢 **Running**: Instance is active and responding to requests
- 🟡 **Starting/Stopping**: Instance is transitioning between states
- 🔴 **Error**: Instance failed to start or encountered an error
- ⚫ **Stopped**: Instance is configured but not running
- 🟠 **Paused**: Instance is temporarily suspended

### Quick Actions

From the instance card, you can:
- **Start/Stop**: Control instance lifecycle
- **Edit**: Modify instance configuration
- **Delete**: Remove instance (requires confirmation)
- **Set Active**: Make this the active instance for new operations

### Filtering and Searching

Use the filter controls above the instance grid:
- **Status Filter**: Show only instances with specific statuses
- **Health Filter**: Filter by health status (healthy, degraded, unhealthy)
- **Search**: Find instances by name, ID, or description

## Instance Configuration

### Advanced Configuration Options

**Environment Variables**:
```json
{
  "CUDA_VISIBLE_DEVICES": "0",
  "COMFYUI_CUSTOM_NODES": "/custom/nodes/path",
  "PYTORCH_CUDA_ALLOC_CONF": "max_split_size_mb:512"
}
```

**GPU Device Selection**:
- `auto`: Let ComfyUI choose the best available GPU
- `cuda:0`: Specific CUDA device (NVIDIA GPUs)
- `cpu`: Force CPU-only operation
- Custom device strings for specialized hardware

**Performance Tuning**:
- **Max Concurrent Workflows**: Balance between throughput and stability
- **Timeout Settings**: Adjust based on your workflow complexity
- **Queue Monitoring**: Enable for real-time queue status updates

### Configuration Validation

The system automatically validates:
- Port availability and conflicts
- GPU device existence
- Path accessibility for custom nodes
- Environment variable format
- Network connectivity to specified host

## Active Instance Management

### Switching Active Instances

1. Click the "Set Active" button on any running instance card
2. Use the Active Instance Switcher in the toolbar
3. All new workflow operations will use the selected active instance

UI Description: The active instance switcher appears as a dropdown in the top toolbar, showing the current active instance name with a status indicator. The dropdown lists all running instances with their health status.

### Load Balancing

When no specific instance is selected, the system automatically:
- **Round-robin**: Cycles through healthy instances sequentially
- **Least-loaded**: Chooses the instance with fewest active workflows
- **Random**: Selects a random healthy instance

Configure load balancing strategy in advanced settings.

## Integration with Workflows

### Workflow Assignment

**Automatic Assignment**:
- Workflows use the currently active instance
- Load balancer selects healthy instances when none is active

**Manual Assignment**:
```typescript
// Explicit instance selection in code
const instance = instanceManager.getInstance('instance_001');
await wizardService.executeWorkflow(workflow, { instanceId: instance.id });
```

### Workflow Compatibility

All existing workflows remain compatible:
- No changes required to existing workflow JSON
- Same API endpoints and request formats
- Automatic fallback to active instance

### Instance-Specific Features

**Custom Nodes**: Each instance can have different custom node installations
**Models**: Instances can share or isolate model caches
**Outputs**: Separate output directories per instance configuration

## Keyboard Shortcuts

| Shortcut | Action | Context |
|----------|--------|---------|
| `Ctrl+I` | Open Instance Manager | Application-wide |
| `Ctrl+Shift+N` | Create New Instance | Instance Panel |
| `Ctrl+E` | Edit Selected Instance | Instance Card Focused |
| `Delete` | Delete Selected Instance | Instance Card Focused |
| `Ctrl+1-9` | Switch to Instance 1-9 | Instance Switcher |
| `Ctrl+0` | Clear Active Instance | Instance Switcher |
| `F5` | Refresh Instance Status | Instance Panel |

## Best Practices

### Instance Organization

**By GPU**:
- Dedicate instances to specific GPUs for predictable performance
- Reserve high-end GPUs for complex workflows
- Use CPU instances for lightweight tasks

**By Purpose**:
- Character generation instances
- Background processing instances
- Experimental/development instances
- Production/stable instances

**By Project**:
- Separate instances for different projects
- Maintain consistent configurations per project
- Backup instance configurations regularly

### Resource Management

**GPU Memory**:
- Monitor VRAM usage in instance health metrics
- Set appropriate concurrent workflow limits
- Use GPU-specific environment variables for optimization

**System Resources**:
- Balance CPU and memory usage across instances
- Configure appropriate timeouts for your hardware
- Monitor system temperature and power usage

### Maintenance

**Regular Monitoring**:
- Check instance health regularly
- Review performance metrics and error logs
- Update custom nodes and models periodically

**Backup Strategy**:
- Export instance configurations regularly
- Backup workflow outputs per instance
- Document custom configurations and settings

## Performance Considerations

### Hardware Optimization

**Multi-GPU Setup**:
- Use different CUDA_VISIBLE_DEVICES for each instance
- Balance workload based on GPU capabilities
- Monitor cross-GPU memory transfers

**Memory Management**:
- Configure PyTorch memory allocators appropriately
- Set max_split_size_mb for large model handling
- Use appropriate batch sizes for your GPU memory

### Workflow Optimization

**Concurrent Processing**:
- Start with 1 concurrent workflow per GPU
- Gradually increase based on monitoring
- Use queue monitoring for bottleneck identification

**Load Distribution**:
- Use least-loaded strategy for variable workloads
- Round-robin for consistent processing requirements
- Manual assignment for specialized workflows

## Security Notes

### Instance Isolation

**Network Security**:
- Instances run on separate ports for network isolation
- Use firewall rules to restrict access if needed
- Consider VPN or SSH tunneling for remote access

**File System Access**:
- Custom nodes paths should be properly secured
- Model directories should have appropriate permissions
- Output directories should be project-specific

### Environment Variables

**Sensitive Data**:
- Avoid storing sensitive information in environment variables
- Use secure credential management systems
- Regularly rotate API keys and access tokens

**Path Security**:
- Validate custom paths for directory traversal attempts
- Use absolute paths when possible
- Implement path sanitization for user input

## Migration from Single Instance

### Automatic Migration

The system automatically detects existing single-instance configurations and:
1. Creates a "Legacy Instance" with your previous settings
2. Sets it as the active instance by default
3. Preserves all existing workflow compatibility

### Manual Migration Steps

1. **Backup Current Configuration**: Save your existing ComfyUI settings
2. **Run Migration**: The system will detect and migrate automatically on first launch
3. **Verify Settings**: Check the migrated instance configuration
4. **Test Workflows**: Ensure existing workflows work with the new instance

### Post-Migration

**Configuration Review**:
- Update instance name and description
- Configure auto-start if desired
- Add resource limits as needed

**Workflow Testing**:
- Test critical workflows with the new instance
- Monitor performance and resource usage
- Adjust timeouts and concurrent limits

---

For troubleshooting specific issues, see the [ComfyUI Instance Troubleshooting Guide](comfyui-instance-troubleshooting.md).