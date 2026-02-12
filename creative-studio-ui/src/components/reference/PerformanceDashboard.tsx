/**
 * PerformanceDashboard Component
 * Real-time performance monitoring dashboard for Continuous Creation feature
 * 
 * Features:
 * - Real-time metrics display
 * - Memory usage gauge
 * - Performance trend charts
 * - Operation history table
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  getPerformanceMonitoringService,
  PerformanceReport,
  formatBytes,
  formatDuration,
  PerformanceMonitoringService,
} from '../../services/performanceMonitoringService';
import {
  referenceImageCache,
  referenceMetadataCache,
  videoFrameCache,
  CacheStats,
} from '../../utils/memoryMonitor';

// ============================================================================
// Styles
// ============================================================================

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '20px',
    backgroundColor: '#1a1a2e',
    color: '#eaeaea',
    borderRadius: '8px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    paddingBottom: '10px',
    borderBottom: '1px solid #333',
  },
  title: {
    fontSize: '24px',
    fontWeight: '600',
    margin: 0,
  },
  controls: {
    display: 'flex',
    gap: '10px',
  },
  button: {
    padding: '8px 16px',
    borderRadius: '4px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'background-color 0.2s',
  },
  primaryButton: {
    backgroundColor: '#4a90d9',
    color: 'white',
  },
  secondaryButton: {
    backgroundColor: '#444',
    color: 'white',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '20px',
    marginBottom: '20px',
  },
  card: {
    backgroundColor: '#16213e',
    borderRadius: '8px',
    padding: '16px',
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: '600',
    marginBottom: '12px',
    color: '#8892b0',
  },
  metric: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 0',
    borderBottom: '1px solid #2a3a5e',
  },
  metricLabel: {
    fontSize: '14px',
    color: '#8892b0',
  },
  metricValue: {
    fontSize: '14px',
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  gaugeContainer: {
    height: '20px',
    backgroundColor: '#2a3a5e',
    borderRadius: '10px',
    overflow: 'hidden',
    marginTop: '8px',
  },
  gaugeFill: {
    height: '100%',
    transition: 'width 0.3s ease',
    borderRadius: '10px',
  },
  memorySection: {
    marginBottom: '20px',
  },
  tableContainer: {
    overflowX: 'auto',
    marginTop: '10px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '13px',
  },
  th: {
    textAlign: 'left',
    padding: '10px',
    backgroundColor: '#2a3a5e',
    color: '#8892b0',
    fontWeight: '600',
  },
  td: {
    padding: '10px',
    borderBottom: '1px solid #2a3a5e',
  },
  statusGood: {
    color: '#4ade80',
  },
  statusWarning: {
    color: '#fbbf24',
  },
  statusCritical: {
    color: '#f87171',
  },
  tabs: {
    display: 'flex',
    gap: '5px',
    marginBottom: '15px',
  },
  tab: {
    padding: '8px 16px',
    borderRadius: '4px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    backgroundColor: 'transparent',
    color: '#8892b0',
  },
  tabActive: {
    backgroundColor: '#4a90d9',
    color: 'white',
  },
  chartContainer: {
    height: '200px',
    backgroundColor: '#0f1629',
    borderRadius: '8px',
    padding: '10px',
    marginTop: '10px',
  },
  barChart: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: '4px',
    height: '100%',
    padding: '10px 0',
  },
  bar: {
    flex: 1,
    backgroundColor: '#4a90d9',
    borderRadius: '2px 2px 0 0',
    minWidth: '8px',
    transition: 'height 0.3s ease',
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px',
    color: '#8892b0',
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

function getMemoryUsagePercent(used: number, total: number): number {
  if (total === 0) return 0;
  return Math.min((used / total) * 100, 100);
}

function getGaugeColor(percent: number): string {
  if (percent >= 90) return '#f87171';
  if (percent >= 75) return '#fbbf24';
  return '#4ade80';
}

function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString();
}

// ============================================================================
// Sub-Components
// ============================================================================

interface MetricCardProps {
  title: string;
  children: React.ReactNode;
}

function MetricCard({ title, children }: MetricCardProps) {
  return (
    <div style={styles.card}>
      <div style={styles.cardTitle}>{title}</div>
      {children}
    </div>
  );
}

interface MemoryGaugeProps {
  used: number;
  limit: number;
  label: string;
}

function MemoryGauge({ used, limit, label }: MemoryGaugeProps) {
  const percent = getMemoryUsagePercent(used, limit);
  const color = getGaugeColor(percent);

  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={styles.metricLabel}>{label}</span>
        <span style={{ ...styles.metricValue, color }}>
          {percent.toFixed(1)}%
        </span>
      </div>
      <div style={styles.gaugeContainer}>
        <div
          style={{
            ...styles.gaugeFill,
            width: `${percent}%`,
            backgroundColor: color,
          }}
        />
      </div>
      <div style={{ fontSize: '12px', color: '#8892b0', marginTop: '4px' }}>
        {formatBytes(used)} / {formatBytes(limit)}
      </div>
    </div>
  );
}

interface BarChartProps {
  data: number[];
  maxValue?: number;
  height?: number;
}

function BarChart({ data, maxValue, height = 150 }: BarChartProps) {
  const max = maxValue || Math.max(...data, 1);
  
  return (
    <div style={{ ...styles.chartContainer, height: `${height + 30}px` }}>
      <div style={{ ...styles.barChart, height }}>
        {data.map((value, index) => (
          <div
            key={index}
            style={{
              ...styles.bar,
              height: `${(value / max) * 100}%`,
              opacity: 0.5 + (index / data.length) * 0.5,
            }}
            title={`${formatDuration(value)}`}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

type TabType = 'overview' | 'memory' | 'inheritance' | 'replication' | 'consistency';

export function PerformanceDashboard(): React.ReactElement {
  const [service] = useState<PerformanceMonitoringService>(
    () => getPerformanceMonitoringService()
  );
  const [report, setReport] = useState<PerformanceReport | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [isMonitoring, setIsMonitoring] = useState(true);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState(2000);
  
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const performanceHistoryRef = useRef<number[]>([]);
  const memoryHistoryRef = useRef<number[]>([]);
  const inheritanceHistoryRef = useRef<{ depth: number; duration: number }[]>([]);

  // Fetch report
  const fetchReport = useCallback(() => {
    const newReport = service.getPerformanceReport();
    setReport(newReport);

    // Update history for charts
    const recentDuration = newReport.summary.averageDuration || 0;
    performanceHistoryRef.current.push(recentDuration);
    if (performanceHistoryRef.current.length > 30) {
      performanceHistoryRef.current.shift();
    }

    const memoryUsage = newReport.memory.currentHeapUsed || 0;
    memoryHistoryRef.current.push(memoryUsage);
    if (memoryHistoryRef.current.length > 30) {
      memoryHistoryRef.current.shift();
    }

    if (newReport.inheritance.totalInheritances > inheritanceHistoryRef.current.length) {
      inheritanceHistoryRef.current.push({
        depth: newReport.inheritance.averageDepth,
        duration: newReport.inheritance.averageDuration,
      });
      if (inheritanceHistoryRef.current.length > 20) {
        inheritanceHistoryRef.current.shift();
      }
    }
  }, [service]);

  // Setup auto-refresh
  useEffect(() => {
    if (isMonitoring) {
      fetchReport();
      refreshTimerRef.current = setInterval(fetchReport, autoRefreshInterval);
    } else {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    }

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, [isMonitoring, autoRefreshInterval, fetchReport]);

  // Initial fetch
  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // Get cache stats
  const getCacheStats = (): { name: string; stats: CacheStats }[] => {
    return [
      { name: 'Reference Images', stats: referenceImageCache.getStats() },
      { name: 'Reference Metadata', stats: referenceMetadataCache.getStats() },
      { name: 'Video Frames', stats: videoFrameCache.getStats() },
    ];
  };

  // Format operation duration with color
  const formatDurationWithColor = (ms: number): React.ReactElement => {
    let color: string;
    if (ms < 100) color = '#4ade80';
    else if (ms < 500) color = '#fbbf24';
    else color = '#f87171';
    
    return <span style={{ ...styles.metricValue, color }}>{formatDuration(ms)}</span>;
  };

  // Render overview tab
  const renderOverview = () => (
    <div style={styles.grid}>
      <MetricCard title="Summary">
        <div style={styles.metric}>
          <span style={styles.metricLabel}>Total Operations</span>
          <span style={styles.metricValue}>{report?.summary.totalOperations || 0}</span>
        </div>
        <div style={styles.metric}>
          <span style={styles.metricLabel}>Avg Duration</span>
          {report ? formatDurationWithColor(report.summary.averageDuration) : <span style={styles.metricValue}>-</span>}
        </div>
        <div style={styles.metric}>
          <span style={styles.metricLabel}>P95 Duration</span>
          {report ? formatDurationWithColor(report.summary.p95Duration) : <span style={styles.metricValue}>-</span>}
        </div>
        <div style={styles.metric}>
          <span style={styles.metricLabel}>P99 Duration</span>
          {report ? formatDurationWithColor(report.summary.p99Duration) : <span style={styles.metricValue}>-</span>}
        </div>
      </MetricCard>

      <MetricCard title="Performance Trend">
        <BarChart data={performanceHistoryRef.current} height={180} />
        <div style={{ fontSize: '12px', color: '#8892b0', marginTop: '8px', textAlign: 'center' }}>
          Last 30 operations (duration)
        </div>
      </MetricCard>

      <MetricCard title="Memory Usage">
        <MemoryGauge
          used={report?.memory.currentHeapUsed || 0}
          limit={100 * 1024 * 1024}
          label="Heap Memory"
        />
        <div style={styles.metric}>
          <span style={styles.metricLabel}>Peak Usage</span>
          <span style={styles.metricValue}>{formatBytes(report?.memory.peakHeapUsed || 0)}</span>
        </div>
        <BarChart data={memoryHistoryRef.current} height={100} maxValue={150 * 1024 * 1024} />
      </MetricCard>

      <MetricCard title="Feature Metrics">
        <div style={styles.metric}>
          <span style={styles.metricLabel}>Inheritances</span>
          <span style={styles.metricValue}>{report?.inheritance.totalInheritances || 0}</span>
        </div>
        <div style={styles.metric}>
          <span style={styles.metricLabel}>Avg Depth</span>
          <span style={styles.metricValue}>{report?.inheritance.averageDepth.toFixed(1) || '0.0'}</span>
        </div>
        <div style={styles.metric}>
          <span style={styles.metricLabel}>Replications</span>
          <span style={styles.metricValue}>{report?.replication.totalReplications || 0}</span>
        </div>
        <div style={styles.metric}>
          <span style={styles.metricLabel}>Consistency Checks</span>
          <span style={styles.metricValue}>{report?.consistency.totalChecks || 0}</span>
        </div>
      </MetricCard>
    </div>
  );

  // Render memory tab
  const renderMemory = () => {
    const caches = getCacheStats();

    return (
      <div>
        <div style={styles.grid}>
          {caches.map((cache) => (
            <MetricCard key={cache.name} title={`${cache.name} Cache`}>
              <MemoryGauge
                used={cache.stats.currentMemoryUsage}
                limit={100 * 1024 * 1024}
                label="Memory Usage"
              />
              <div style={styles.metric}>
                <span style={styles.metricLabel}>Size</span>
                <span style={styles.metricValue}>{cache.stats.currentSize} items</span>
              </div>
              <div style={styles.metric}>
                <span style={styles.metricLabel}>Hits</span>
                <span style={{ ...styles.metricValue, color: '#4ade80' }}>{cache.stats.hits}</span>
              </div>
              <div style={styles.metric}>
                <span style={styles.metricLabel}>Misses</span>
                <span style={{ ...styles.metricValue, color: '#f87171' }}>{cache.stats.misses}</span>
              </div>
              <div style={styles.metric}>
                <span style={styles.metricLabel}>Hit Rate</span>
                <span style={styles.metricValue}>{(cache.stats.hitRate * 100).toFixed(1)}%</span>
              </div>
              <div style={styles.metric}>
                <span style={styles.metricLabel}>Evictions</span>
                <span style={styles.metricValue}>{cache.stats.evictions}</span>
              </div>
            </MetricCard>
          ))}
        </div>
      </div>
    );
  };

  // Render inheritance tab
  const renderInheritance = () => (
    <div style={styles.grid}>
      <MetricCard title="Inheritance Performance">
        <div style={styles.metric}>
          <span style={styles.metricLabel}>Total Inheritances</span>
          <span style={styles.metricValue}>{report?.inheritance.totalInheritances || 0}</span>
        </div>
        <div style={styles.metric}>
          <span style={styles.metricLabel}>Average Depth</span>
          <span style={styles.metricValue}>{report?.inheritance.averageDepth.toFixed(2) || '0.00'}</span>
        </div>
        <div style={styles.metric}>
          <span style={styles.metricLabel}>Max Depth</span>
          <span style={styles.metricValue}>{report?.inheritance.maxDepth || 0}</span>
        </div>
        <div style={styles.metric}>
          <span style={styles.metricLabel}>Average Duration</span>
          {report ? formatDurationWithColor(report.inheritance.averageDuration) : <span style={styles.metricValue}>-</span>}
        </div>
      </MetricCard>

      <MetricCard title="Depth vs Duration Trend">
        <BarChart
          data={inheritanceHistoryRef.current.map((d) => d.duration)}
          height={180}
        />
        <div style={{ fontSize: '12px', color: '#8892b0', marginTop: '8px', textAlign: 'center' }}>
          Duration by inheritance depth
        </div>
      </MetricCard>
    </div>
  );

  // Render replication tab
  const renderReplication = () => (
    <div style={styles.grid}>
      <MetricCard title="Video Replication">
        <div style={styles.metric}>
          <span style={styles.metricLabel}>Total Replications</span>
          <span style={styles.metricValue}>{report?.replication.totalReplications || 0}</span>
        </div>
        <div style={styles.metric}>
          <span style={styles.metricLabel}>Avg Progress Rate</span>
          <span style={styles.metricValue}>{(report?.replication.averageProgressRate || 0).toFixed(1)}%</span>
        </div>
        <div style={styles.metric}>
          <span style={styles.metricLabel}>Avg Duration</span>
          {report ? formatDurationWithColor(report.replication.averageDuration) : <span style={styles.metricValue}>-</span>}
        </div>
      </MetricCard>
    </div>
  );

  // Render consistency tab
  const renderConsistency = () => (
    <div style={styles.grid}>
      <MetricCard title="Visual Consistency">
        <div style={styles.metric}>
          <span style={styles.metricLabel}>Total Checks</span>
          <span style={styles.metricValue}>{report?.consistency.totalChecks || 0}</span>
        </div>
        <div style={styles.metric}>
          <span style={styles.metricLabel}>Avg Duration</span>
          {report ? formatDurationWithColor(report.consistency.averageDuration) : <span style={styles.metricValue}>-</span>}
        </div>
        <div style={styles.metric}>
          <span style={styles.metricLabel}>Avg Shot Count</span>
          <span style={styles.metricValue}>{report?.consistency.averageShotCount.toFixed(1) || '0.0'}</span>
        </div>
      </MetricCard>
    </div>
  );

  // Render operation history table
  const renderOperationHistory = () => {
    const operations = report?.recentOperations || [];

    if (operations.length === 0) {
      return (
        <div style={styles.emptyState}>
          <p>No operations recorded yet</p>
        </div>
      );
    }

    return (
      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Operation</th>
              <th style={styles.th}>Duration</th>
              <th style={styles.th}>Timestamp</th>
              <th style={styles.th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {operations.slice(-20).reverse().map((op) => (
              <tr key={op.id}>
                <td style={styles.td}>{op.operation}</td>
                <td style={styles.td}>
                  {op.duration ? formatDurationWithColor(op.duration) : '-'}
                </td>
                <td style={styles.td}>
                  {formatTimestamp(op.startTime)}
                </td>
                <td style={styles.td}>
                  <span style={{
                    ...styles.metricValue,
                    color: op.duration && op.duration < 500 ? '#4ade80' : 
                           op.duration && op.duration < 1000 ? '#fbbf24' : '#f87171'
                  }}>
                    {op.duration && op.duration < 500 ? 'Fast' : 
                     op.duration && op.duration < 1000 ? 'Normal' : 'Slow'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // Tab configuration
  const tabs: { id: TabType; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'memory', label: 'Memory' },
    { id: 'inheritance', label: 'Inheritance' },
    { id: 'replication', label: 'Replication' },
    { id: 'consistency', label: 'Consistency' },
  ];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Performance Dashboard</h2>
        <div style={styles.controls}>
          <button
            style={{
              ...styles.button,
              ...(isMonitoring ? styles.secondaryButton : styles.primaryButton),
            }}
            onClick={() => setIsMonitoring(!isMonitoring)}
          >
            {isMonitoring ? 'Pause' : 'Resume'}
          </button>
          <button
            style={{ ...styles.button, ...styles.secondaryButton }}
            onClick={() => {
              service.clear();
              performanceHistoryRef.current = [];
              memoryHistoryRef.current = [];
              inheritanceHistoryRef.current = [];
              fetchReport();
            }}
          >
            Clear Data
          </button>
          <select
            style={{ ...styles.button, ...styles.secondaryButton }}
            value={autoRefreshInterval}
            onChange={(e) => setAutoRefreshInterval(Number(e.target.value))}
          >
            <option value={1000}>1s</option>
            <option value={2000}>2s</option>
            <option value={5000}>5s</option>
          </select>
        </div>
      </div>

      <div style={styles.tabs}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            style={{
              ...styles.tab,
              ...(activeTab === tab.id ? styles.tabActive : {}),
            }}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'memory' && renderMemory()}
      {activeTab === 'inheritance' && renderInheritance()}
      {activeTab === 'replication' && renderReplication()}
      {activeTab === 'consistency' && renderConsistency()}

      <div style={{ marginTop: '20px' }}>
        <MetricCard title="Recent Operations">
          {renderOperationHistory()}
        </MetricCard>
      </div>
    </div>
  );
}

export default PerformanceDashboard;
