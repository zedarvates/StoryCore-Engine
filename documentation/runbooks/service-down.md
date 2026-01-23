# Runbook: Service Down Incident

## Overview
This runbook covers the response procedure when the StoryCore Engine service goes down or becomes unresponsive.

## Alert Criteria
- Alert: `ServiceDown`
- Expression: `up == 0`
- Duration: 1 minute
- Severity: Critical

## Initial Assessment (Triage - 5 minutes)

### Step 1: Confirm the Alert
```bash
# Check service status
curl -f http://localhost:8080/health

# Check Docker container status
docker ps | grep advanced-workflows

# Check system resources
top -b -n 1 | head -20
```

### Step 2: Check Logs
```bash
# Application logs
docker logs advanced-comfyui-workflows --tail 100

# System logs
journalctl -u docker -n 50 --no-pager

# Check for OOM kills
dmesg | grep -i "oom\|kill"
```

## Diagnosis (Investigation - 10 minutes)

### Common Causes & Solutions

#### 1. Container Crash
**Symptoms:** Container not running
**Solution:**
```bash
# Restart container
docker restart advanced-comfyui-workflows

# Check if restart fixes the issue
sleep 30
curl -f http://localhost:8080/health
```

#### 2. Out of Memory (OOM)
**Symptoms:** System log shows OOM killer
**Solution:**
```bash
# Check memory usage
free -h

# Increase container memory limit if needed
docker update --memory=128g advanced-comfyui-workflows

# Restart with higher limits
docker restart advanced-comfyui-workflows
```

#### 3. GPU Issues
**Symptoms:** GPU-related errors in logs
**Solution:**
```bash
# Check GPU status
nvidia-smi

# Reset GPU if needed
nvidia-smi --gpu-reset

# Check GPU memory
nvidia-smi --query-gpu=memory.used,memory.total --format=csv
```

#### 4. Network Issues
**Symptoms:** Container running but not accessible
**Solution:**
```bash
# Check network connectivity
docker network ls
docker network inspect bridge

# Restart networking
sudo systemctl restart docker
```

## Escalation

### If Issue Persists (15 minutes)
1. **Escalate to Platform Team** - Infrastructure issues
2. **Escalate to DevOps Lead** - Complex system issues
3. **Escalate to Engineering Manager** - Code-level issues

### Communication
- Update incident channel: `#incidents`
- Notify stakeholders if downtime > 30 minutes
- Update status page if SLA-impacting

## Recovery

### Rollback Procedure
```bash
# Stop current container
docker stop advanced-comfyui-workflows

# Start previous version (if using image tags)
docker run -d --name advanced-comfyui-workflows-rollback \
  -p 8080:8080 \
  storycore/advanced-workflows:v1.0.0

# Verify rollback success
curl -f http://localhost:8080/health
```

### Full Recovery
```bash
# Clean restart
docker stop advanced-comfyui-workflows
docker rm advanced-comfyui-workflows

# Start fresh
docker run -d --name advanced-comfyui-workflows \
  --restart unless-stopped \
  -p 8080:8080 \
  -e ENVIRONMENT=production \
  storycore/advanced-workflows:latest
```

## Post-Incident

### Retrospective Required If:
- Downtime > 15 minutes
- Multiple services affected
- Root cause unknown
- Same issue occurred before

### Documentation Updates:
- Update this runbook if new failure modes discovered
- Add monitoring for new failure patterns
- Update alerting rules if thresholds need adjustment

## Prevention

### Monitoring Improvements:
- Add heartbeat checks every 30 seconds
- Monitor error rates and latency trends
- Alert on resource usage trends before failure

### Capacity Planning:
- Monitor resource usage patterns
- Plan scaling events based on usage trends
- Implement auto-scaling where appropriate

---

**Last Updated:** 2026-01-15
**Owner:** DevOps Team
**Review Cycle:** Monthly