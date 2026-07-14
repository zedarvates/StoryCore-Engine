import { LegacyAny } from '@/types/legacy';
import React, { useState } from 'react';
import styles from './CollaborationPanel.module.css';

interface CollaborationPageProps {}

export const CollaborationPage: React.FC<CollaborationPageProps> = () => {
  const [activeTab, setActiveTab] = useState<'projects' | 'users' | 'sync' | 'version'>('projects');
  const [projects, setProjects] = useState<LegacyAny[]>([
    {
      id: 'project_1',
      name: 'My First Project',
      status: 'active',
      members: 3,
      lastModified: '2 hours ago'
    },
    {
      id: 'project_2',
      name: 'Commercial Shoot',
      status: 'active',
      members: 5,
      lastModified: '1 day ago'
    },
    {
      id: 'project_3',
      name: 'Personal Vlog',
      status: 'archived',
      members: 1,
      lastModified: '1 week ago'
    }
  ]);
  const [onlineUsers, setOnlineUsers] = useState<LegacyAny[]>([
    { id: 'user_1', name: 'John Doe', avatar: '👤', status: 'editing' },
    { id: 'user_2', name: 'Jane Smith', avatar: '👩‍💻', status: 'reviewing' },
    { id: 'user_3', name: 'Mike Johnson', avatar: '👨‍🎨', status: 'color' }
  ]);

  const handleProjectClick = (projectId: string) => {
    // Open project logic
  };

  const handleInviteUser = () => {
    // Invite user logic
  };

  const handleLeaveProject = (projectId: string) => {
    // Leave project logic
  };

  return (
    <div className={styles.collaborationPage}>
      <div className={styles.pageHeader}>
        <h2>Collaboration Page</h2>
        <div className={styles.pageTabs}>
          <button
            className={`${styles.tabBtn} ${activeTab === 'projects' ? styles.active : ''}`}
            onClick={() => setActiveTab('projects')}
          >
            Projects
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === 'users' ? styles.active : ''}`}
            onClick={() => setActiveTab('users')}
          >
            Users
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === 'sync' ? styles.active : ''}`}
            onClick={() => setActiveTab('sync')}
          >
            Sync
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === 'version' ? styles.active : ''}`}
            onClick={() => setActiveTab('version')}
          >
            Version
          </button>
        </div>
      </div>

      <div className={styles.pageContent}>
        {activeTab === 'projects' && (
          <div className={styles.projectsView}>
            <h3>My Projects</h3>
            <div className={styles.projectsGrid}>
              {projects.map((project) => (
                <div key={project.id} className={styles.projectCard}>
                  <div className={styles.projectHeader}>
                    <h4>{project.name}</h4>
                    <span className={styles.projectStatus}>{project.status}</span>
                  </div>
                  <div className={styles.projectInfo}>
                    <p>Members: {project.members}</p>
                    <p>Last modified: {project.lastModified}</p>
                  </div>
                  <div className={styles.projectActions}>
                    <button onClick={() => handleProjectClick(project.id)}>Open</button>
                    <button onClick={() => handleLeaveProject(project.id)}>Leave</button>
                  </div>
                </div>
              ))}
            </div>
            <button className={styles.addProjectBtn}>+ New Project</button>
          </div>
        )}

        {activeTab === 'users' && (
          <div className={styles.usersView}>
            <h3>Online Users</h3>
            <div className={styles.usersList}>
              {onlineUsers.map((user) => (
                <div key={user.id} className={styles.userCard}>
                  <div className={styles.userAvatar}>{user.avatar}</div>
                  <div className={styles.userInfo}>
                    <h4>{user.name}</h4>
                    <span className={styles.userStatus}>{user.status}</span>
                  </div>
                  <div className={styles.userActions}>
                    <button className={styles.messageBtn}>Message</button>
                    <button className={styles.inviteBtn} onClick={handleInviteUser}>Invite</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'sync' && (
          <div className={styles.syncView}>
            <h3>Real-time Sync</h3>
            <p>Real-time collaboration features will be implemented in a future phase.</p>
          </div>
        )}

        {activeTab === 'version' && (
          <div className={styles.versionView}>
            <h3>Version Control</h3>
            <p>Version control and history features will be implemented in a future phase.</p>
          </div>
        )}
      </div>

      <div className={styles.pageFooter}>
        <div className={styles.globalControls}>
          <label className={styles.toggleLabel}>
            <input type="checkbox" />
            <span>Collaboration ON</span>
          </label>
        </div>

        <div className={styles.pageActions}>
          <button className={styles.primaryBtn}>Share Project</button>
          <button className={styles.secondaryBtn}>Settings</button>
          <button className={styles.compareBtn}>Help</button>
        </div>
      </div>
    </div>
  );
};