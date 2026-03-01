import React, { useState } from 'react';
import { ColorWheels } from './ColorWheels';
import { CurvesEditor } from './CurvesEditor';
import { VideoScopes } from './VideoScopes';
import { LUTBrowser } from './LUTBrowser';
import { QualifierPanel } from './QualifierPanel';
import { PowerWindowsPanel } from './PowerWindowsPanel';
import styles from './ColorCorrectionPanel.module.css';

export const ColorPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'wheels' | 'curves' | 'scopes' | 'lut' | 'qualifier' | 'powerWindows'>('wheels');

  return (
    <div className={styles.colorPage}>
      <div className={styles.pageHeader}>
        <h2>DaVinci Resolve Color Page</h2>
        <div className={styles.pageTabs}>
          <button
            className={`${styles.tabBtn} ${activeTab === 'wheels' ? styles.active : ''}`}
            onClick={() => setActiveTab('wheels')}
          >
            Color Wheels
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === 'curves' ? styles.active : ''}`}
            onClick={() => setActiveTab('curves')}
          >
            Curves
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === 'scopes' ? styles.active : ''}`}
            onClick={() => setActiveTab('scopes')}
          >
            Scopes
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === 'lut' ? styles.active : ''}`}
            onClick={() => setActiveTab('lut')}
          >
            LUTs
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === 'qualifier' ? styles.active : ''}`}
            onClick={() => setActiveTab('qualifier')}
          >
            Qualifier
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === 'powerWindows' ? styles.active : ''}`}
            onClick={() => setActiveTab('powerWindows')}
          >
            Power Windows
          </button>
        </div>
      </div>

      <div className={styles.pageContent}>
        {activeTab === 'wheels' && <ColorWheels />}
        {activeTab === 'curves' && <CurvesEditor />}
        {activeTab === 'scopes' && <VideoScopes />}
        {activeTab === 'lut' && <LUTBrowser />}
        {activeTab === 'qualifier' && <QualifierPanel />}
        {activeTab === 'powerWindows' && <PowerWindowsPanel />}
      </div>

      <div className={styles.pageFooter}>
        <div className={styles.globalControls}>
          <label className={styles.toggleLabel}>
            <input type="checkbox" />
            <span>Color Correction ON</span>
          </label>
        </div>

        <div className={styles.pageActions}>
          <button className={styles.primaryBtn}>Apply Grade</button>
          <button className={styles.secondaryBtn}>Reset Grade</button>
          <button className={styles.compareBtn}>Compare</button>
        </div>
      </div>
    </div>
  );
};