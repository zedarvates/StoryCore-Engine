# Runbook: High CPU Usage Incident

## Overview
This runbook covers response procedures for high CPU usage incidents that may impact system performance.

## Alert Criteria
- Alert: `HighCPUUsage` or `CriticalCPUUsage`
- Expression: `cpu_usage_percent > 85` (warning) or `> 95` (critical)
- Severity: Warning/Critical

## Assessment

### Step 1: Verify Current Usage
```bash
# Check current CPU usage
top -b -n 1 | head -10

# Per-process CPU usage
ps aux --sort=-%cpu | head -10

# System load average
uptime
```

### Step 2: Identify Top CPU Consumers
```bash
# Docker container CPU usage
docker stats --no-stream

# GPU usage (if applicable)
nvidia-smi --query-gpu=utilization.gpu --format=csv

# Check for runaway processes
ps aux | awk '$3 > 50 {print $0}'
```

## Diagnosis

### Common Causes

#### 1. Video Processing Workload
**Symptoms:** High GPU + CPU usage during video generation
**Assessment:**
```bash
# Check active workflows
curl http://localhost:8080/system_stats

# Check queue length
curl http://localhost:8081/metrics | grep queued_requests
```

**Mitigation:**
- Implement request throttling
- Add workload prioritization
- Scale horizontally if possible

#### 2. Memory Pressure
**Symptoms:** High CPU from memory management
**Assessment:**
```bash
# Check memory pressure
vmstat 1 5

# Check swap usage
free -h
```

#### 3. Background Processes
**Symptoms:** Non-application processes consuming CPU
**Solutions:**
```bash
# Kill problematic processes (CAUTION)
kill -15 <PID>

# Or restart services
sudo systemctl restart docker
```

## Immediate Actions

### For Critical CPU (>95%)
1. **Enable Request Throttling**
   ```bash
   # Add rate limiting
   docker exec advanced-workflows sed -i 's/requests_per_minute: 60/requests_per_minute: 10/' config.yml
   docker restart advanced-workflows
   ```

2. **Scale Resources (if available)**
   ```bash
   # Increase CPU limits
   docker update --cpus=8 advanced-workflows
   ```

### For High CPU (85-95%)
1. **Monitor Trends**
   ```bash
   # Check if usage is increasing
   sar -u 1 10
   ```

2. **Optimize Current Workload**
   ```bash
   # Reduce concurrent processing
   docker exec advanced-workflows sed -i 's/max_concurrent: 4/max_concurrent: 2/' config.yml
   ```

## Long-term Solutions

### Capacity Planning
- Monitor usage patterns over time
- Implement auto-scaling policies
- Plan infrastructure upgrades

### Application Optimization
- Profile CPU-intensive operations
- Optimize algorithms and data structures
- Implement caching strategies

### Monitoring Improvements
- Add CPU usage trend alerts
- Implement predictive scaling
- Monitor per-endpoint CPU usage

## Escalation

### When to Escalate
- CPU > 95% for > 30 minutes
- Impact on SLA/SLO
- Multiple services affected

### Communication
- Update `#incidents` channel
- Notify engineering team for optimization
- Update stakeholders for SLA impacts

---

**Last Updated:** 2026-01-15
**Owner:** DevOps Team