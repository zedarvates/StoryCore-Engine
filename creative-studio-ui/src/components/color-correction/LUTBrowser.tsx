import React, { useState, _useEffect } from 'react';
import { useColorCorrectionStore } from '../../stores/colorCorrectionStore';
import { LUTConfig } from '../../types/lut';
import styles from './ColorCorrectionPanel.module.css';

interface LUTBrowserProps {}

export const LUTBrowser: React.FC<LUTBrowserProps> = () => {
  const { state, setPrimaryColorGrade } = useColorCorrectionStore();
  const [activeTab, setActiveTab] = useState<'builtIn' | 'custom' | 'recentlyUsed'>('builtIn');
  const [selectedLUT, setSelectedLUT] = useState<LUTConfig | null>(null);
  const [loading, setLoading] = useState(false);

  const builtInLUTs: LUTConfig[] = [
    {
      id: 'cine_vintage',
      name: 'Cine Vintage',
      type: '3d',
      strength: 1.0,
      description: 'Vintage film look with warm tones',
    },
    {
      id: 'cine_cool',
      name: 'Cine Cool',
      type: '3d',
      strength: 1.0,
      description: 'Cool cinematic look with blue tones',
    },
    {
      id: 'cine_warm',
      name: 'Cine Warm',
      type: '3d',
      strength: 1.0,
      description: 'Warm cinematic look with orange tones',
    },
    {
      id: 'cine_neutral',
      name: 'Cine Neutral',
      type: '3d',
      strength: 1.0,
      description: 'Neutral cinematic look',
    },
  ];

  const customLUTs: LUTConfig[] = [
    {
      id: 'custom_1',
      name: 'Custom LUT 1',
      type: '3d',
      strength: 0.8,
      description: 'Custom LUT created by user',
    },
  ];

  const recentlyUsedLUTs: LUTConfig[] = [
    {
      id: 'recent_1',
      name: 'Recent LUT',
      type: '3d',
      strength: 1.0,
      description: 'Recently used LUT',
    },
  ];

  const getLUTsForTab = () => {
    switch (activeTab) {
      case 'builtIn': return builtInLUTs;
      case 'custom': return customLUTs;
      case 'recentlyUsed': return recentlyUsedLUTs;
    }
  };

  const handleLUTClick = (lut: LUTConfig) => {
    setSelectedLUT(lut);
  };

  const handleApplyLUT = (lut: LUTConfig) => {
    setLoading(true);
    // Apply LUT logic here
    setTimeout(() => {
      setLoading(false);
      // Update state with applied LUT
      setPrimaryColorGrade({ ...state.primaryGrade, lut: lut });
    }, 500);
  };

  const getLUTPreview = (lut: LUTConfig) => {
    // Generate preview based on LUT type and strength
    const strength = lut.strength * 100;
    return `linear-gradient(135deg, #1a1a2e 0%, #16213e ${strength}%, #0f3460 100%)`;
  };

  return (
    <div className={styles.lutBrowser}>
      <div className={styles.lutHeader}>
        <h4>LUT Browser</h4>
        <div className={styles.lutTabs}>
          <button
            className={`${styles.tabBtn} ${activeTab === 'builtIn' ? styles.active : ''}`}
            onClick={() => setActiveTab('builtIn')}
          >
            Built-in
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === 'custom' ? styles.active : ''}`}
            onClick={() => setActiveTab('custom')}
          >
            Custom
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === 'recentlyUsed' ? styles.active : ''}`}
            onClick={() => setActiveTab('recentlyUsed')}
          >
            Recent
          </button>
        </div>
      </div>

      <div className={styles.lutContent}>
        <div className={styles.lutGrid}>
          {getLUTsForTab().map((lut) => (
            <div
              key={lut.id}
              className={`${styles.lutCard} ${selectedLUT?.id === lut.id ? styles.selected : ''}`}
              onClick={() => handleLUTClick(lut)}
            >
              <div
                className={styles.lutPreview}
                style={{ background: getLUTPreview(lut) }}
              >
                <span className={styles.lutBadge}>{lut.type}</span>
              </div>

              <div className={styles.lutInfo}>
                <h4 className={styles.lutName}>{lut.name}</h4>
                <p className={styles.lutDesc}>{lut.description}</p>
                <div className={styles.lutStrength}>
                  Strength: {Math.round(lut.strength * 100)}%
                </div>
              </div>

              <div className={styles.lutActions}>
                <button
                  className={styles.applyBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleApplyLUT(lut);
                  }}
                  disabled={loading}
                >
                  {loading ? 'Applying...' : 'Apply'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.lutFooter}>
        <button className={styles.importBtn}>Import LUT</button>
        <button className={styles.exportBtn}>Export LUT</button>
      </div>
    </div>
  );
};