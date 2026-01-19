# Incident Response Process

## Overview
Standardized incident response process for StoryCore Engine production incidents.

## Incident Severity Levels

### P1 - Critical (System Down)
- **Impact:** Complete service outage
- **Response:** Immediate (5 minutes)
- **Resolution:** 1 hour target
- **Communication:** Immediate to all stakeholders

### P2 - High (Degraded Service)
- **Impact:** Significant performance degradation
- **Response:** 15 minutes
- **Resolution:** 4 hours target
- **Communication:** Engineering team + management

### P3 - Medium (Partial Impact)
- **Impact:** Minor functionality affected
- **Response:** 1 hour
- **Resolution:** 24 hours target
- **Communication:** Engineering team

### P4 - Low (Monitoring Alert)
- **Impact:** No user impact
- **Response:** Next business day
- **Resolution:** 72 hours target
- **Communication:** Engineering team

## Response Process

### Phase 1: Detection & Triage (0-5 minutes)
1. **Alert Received**
   - Acknowledge alert in monitoring system
   - Create incident ticket if not auto-created
   - Assign initial responder

2. **Initial Assessment**
   ```bash
   # Quick health check
   curl -f http://localhost:8080/health

   # Check system resources
   uptime && free -h && df -h
   ```

3. **Determine Severity**
   - Check user impact
   - Assess blast radius
   - Assign P-level

### Phase 2: Investigation (5-30 minutes)
1. **Gather Information**
   - Check application logs
   - Review system metrics
   - Interview affected users if applicable

2. **Root Cause Analysis**
   - Use monitoring dashboards
   - Check recent deployments
   - Review configuration changes

3. **Communication**
   - Update incident channel
   - Notify stakeholders for P1/P2 incidents

### Phase 3: Resolution (30min - 4 hours)
1. **Implement Fix**
   - Follow relevant runbook
   - Test fix in staging if possible
   - Deploy fix with rollback plan

2. **Verify Resolution**
   ```bash
   # Confirm service health
   curl -f http://localhost:8080/health

   # Check monitoring alerts cleared
   # Verify in Grafana dashboards
   ```

### Phase 4: Post-Incident (After Resolution)

1. **Retrospective**
   - **When Required:**
     - P1 incidents
     - Incidents > 30 minutes resolution time
     - Same issue recurring
     - New failure modes discovered

   - **Timeline:** Within 48 hours
   - **Attendees:** Incident responders, team leads, stakeholders

2. **Action Items**
   - Update runbooks
   - Improve monitoring/alerting
   - Implement preventive measures
   - Update documentation

## Communication Guidelines

### Internal Communication
- **Primary Channel:** `#incidents` Slack channel
- **Updates:** Every 30 minutes for active incidents
- **Format:**
  ```
  🚨 INCIDENT UPDATE
  Status: Investigating
  Impact: P2 - High latency on video generation
  ETA: 2 hours
  Next Update: 14:30 UTC
  ```

### External Communication
- **When:** P1 incidents or > 30 minute downtime
- **Channels:** Status page, customer communications
- **Content:** Clear, factual, no speculation

## Escalation Matrix

| Time Since Alert | Action |
|------------------|--------|
| 15 minutes | Escalate to Team Lead |
| 1 hour | Escalate to Engineering Manager |
| 2 hours | Escalate to VP Engineering |
| 4 hours | Escalate to CEO (P1 only) |

## Tools & Resources

### Monitoring & Alerting
- **Grafana:** https://grafana.localhost
- **Prometheus:** https://prometheus.localhost
- **Alertmanager:** https://alertmanager.localhost

### Incident Management
- **Ticketing:** JIRA incidents project
- **Postmortems:** Confluence incident reports
- **Runbooks:** `/docs/runbooks/`

### Communication
- **Internal:** Slack #incidents
- **External:** Status page, email lists

---

**Last Updated:** 2026-01-15
**Review Frequency:** Monthly
**Owner:** Incident Response Team