/**
 * Export Queue Component
 * 
 * Displays and manages the queue of video export jobs.
 */

import React, { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../store';
import { 
  removeJob, 
  updateJobProgress, 
  setJobCompleted, 
  setJobFailed,
  clearCompletedJobs,
  ExportStatus
} from '../../store/slices/exportSlice';
import { PublishPanel } from './PublishPanel';
import './exportPanel.css';
export const ExportQueue: React.FC = () => {
  const dispatch = useAppDispatch();
  const jobs = useAppSelector((state) => state.export.jobs);
  const [publishId, setPublishId] = React.useState<string | null>(null);

  // Poll for progress of processing jobs
  useEffect(() => {
    const activeJobs = jobs.filter(job => job.status === 'processing' || job.status === 'pending');
    
    if (activeJobs.length === 0) return;

    const pollInterval = setInterval(async () => {
      for (const job of activeJobs) {
        try {
          const response = await fetch(`/api/video-editor/export/${job.id}/status`);
          if (response.ok) {
            const data = await response.json();
            
            if (data.status === 'completed') {
              dispatch(setJobCompleted({ id: job.id, downloadUrl: data.download_url }));
            } else if (data.status === 'failed') {
              dispatch(setJobFailed({ id: job.id, error: data.error || 'Unknown error' }));
            } else {
              dispatch(updateJobProgress({ 
                id: job.id, 
                progress: data.progress || 0,
                status: data.status as ExportStatus
              }));
            }
          }
        } catch (error) {
          console.error(`Failed to poll status for job ${job.id}:`, error);
        }
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [jobs, dispatch]);

  if (jobs.length === 0) {
    return (
      <div className="export-queue-empty">
        <p>No export jobs in queue.</p>
      </div>
    );
  }

  return (
    <div className="export-queue">
      <div className="queue-header">
        <h3>Export Queue ({jobs.length})</h3>
        <button 
          className="clear-completed-btn"
          onClick={() => dispatch(clearCompletedJobs())}
        >
          Clear Completed
        </button>
      </div>
      
      <div className="queue-list">
        {jobs.map((job) => (
          <div key={job.id} className={`queue-item ${job.status}`}>
            <div className="job-info">
              <div className="job-main">
                <span className="job-name">{job.presetName}</span>
                <span className="job-tags">
                  <span className="tag-resolution">{job.resolution}</span>
                  <span className="tag-format">{job.format}</span>
                </span>
              </div>
              <div className="job-meta">
                {new Date(job.createdAt).toLocaleTimeString()}
                {job.status === 'completed' && job.completedAt && (
                   <span className="job-duration">
                     • {Math.round((job.completedAt - job.createdAt) / 1000)}s
                   </span>
                )}
              </div>
            </div>

            <div className="job-status-container">
              {job.status === 'processing' || job.status === 'pending' ? (
                <div className="job-progress-mini">
                  <div className="progress-bar-mini">
                    <div 
                      className="progress-fill-mini" 
                      style={{ width: `${job.progress}%` }} 
                    />
                  </div>
                  <span className="progress-text-mini">{Math.round(job.progress)}%</span>
                </div>
              ) : (
                <span className={`status-badge ${job.status}`}>
                  {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                </span>
              )}
            </div>

            <div className="job-actions">
              {job.status === 'completed' && job.downloadUrl && (
                <>
                  <button 
                    className="job-action-btn publish"
                    onClick={() => setPublishId(job.id)}
                    title="Publish to Social Media"
                  >
                    🚀
                  </button>
                  <button 
                    className="job-action-btn download"
                    onClick={() => window.open(job.downloadUrl, '_blank')}
                    title="Download File"
                  >
                    📥
                  </button>
                </>
              )}
              <button 
                className="job-action-btn remove"
                onClick={() => dispatch(removeJob(job.id))}
                title="Remove from queue"
              >
                ×
              </button>
            </div>
            
            {job.error && (
              <div className="job-error-text">
                Error: {job.error}
              </div>
            )}
          </div>
        ))}
      </div>
      {publishId && (
        <PublishPanel 
          mediaId={publishId} 
          onClose={() => setPublishId(null)} 
        />
      )}
    </div>
  );
};
