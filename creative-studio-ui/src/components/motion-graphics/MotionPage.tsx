import { LegacyAny } from '@/types/legacy';
import React, { useState } from 'react';
import styles from './MotionPanel.module.css';

interface MotionPageProps {}

export const MotionPage: React.FC<MotionPageProps> = () => {
  const [activeTab, _setActiveTab] = useState<'templates' | 'keyframing' | 'animation' | 'export'>('templates');
  const [templates, setTemplates] = useState<LegacyAny[]>([
    {
      id: 'template_1',
      name: 'Lower Third',
      type: 'title',
      preview: 'https://via.placeholder.com/300x200',
      duration: '5s',
      resolution: '1920x1080'
    },
    {
      id: 'template_2',
      name: 'Call Out',
      type: 'annotation',
      preview: 'https://via.placeholder.com/300x200',
      duration: '3s',
      resolution: '1920x1080'
    },
    {
      id: 'template_3',
      name: 'Transition',
      type: 'transition',
      preview: 'https://via.placeholder.com/300x200',
      duration: '1s',
      resolution: '1920x1080'
    }
  ]);
  const [keyframes, setKeyframes] = useState<LegacyAny[]>([
    {
      id: 'keyframe_1',
      name: 'Position',
      property: 'position',
      values: [
        { time: 0, value: { x: 0, y: 0 } },
        { time: 50, value: { x: 100, y: 100 } },
        { time: 100, value: { x: 200, y: 200 } }
      ],
      easing: 'linear'
    },
    {
      id: 'keyframe_2',
      name: 'Scale',
      property: 'scale',
      values: [
        { time: 0, value: 1.0 },
        { time: 50, value: 1.5 },
        { time: 100, value: 1.0 }
      ],
      easing: 'easeInOut'
    }
  ]);

  const handleTemplateClick = (templateId: string) => {
    // Open template logic
  };

  const handleAddKeyframe = () => {
    const newKeyframe = {
      id: `keyframe_${Date.now()}`,
      name: 'New Property',
      property: 'opacity',
      values: [
        { time: 0, value: 1.0 },
        { time: 100, value: 0.0 }
      ],
      easing: 'linear'
    };
    setKeyframes([...keyframes, newKeyframe]);
  };

  return (
    <div className={styles.motionPage}>
      <div className={styles.pageHeader}>
        <h2>Motion Graphics Page</h2>
        <div className={styles.pageTabs}>
          <button
            className={`${styles.tabBtn} ${activeTab === 'templates' ? styles.active : ''}`}
            onClick={() => setActiveTab('templates')}
          >
            Templates
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === 'keyframing' ? styles.active : ''}`}
            onClick={() => setActiveTab('keyframing')}
          >
            Keyframing
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === 'animation' ? styles.active : ''}`}
            onClick={() => setActiveTab('animation')}
          >
            Animation
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === 'export' ? styles.active : ''}`}
            onClick={() => setActiveTab('export')}
          >
            Export
          </button>
        </div>
      </div>

      <div className={styles.pageContent}>
        {activeTab === 'templates' && (
          <div className={styles.templatesView}>
            <h3>Templates Library</h3>
            <div className={styles.templatesGrid}>
              {templates.map((template) => (
                <div key={template.id} className={styles.templateCard}>
                  <div className={styles.templatePreview}>
                    <img src={template.preview} alt={template.name} />
                    <span className={styles.templateDuration}>{template.duration}</span>
                  </div>
                  <div className={styles.templateInfo}>
                    <h4>{template.name}</h4>
                    <p className={styles.templateType}>{template.type}</p>
                    <p className={styles.templateResolution}>{template.resolution}</p>
                  </div>
                  <div className={styles.templateActions}>
                    <button onClick={() => handleTemplateClick(template.id)}>Use Template</button>
                  </div>
                </div>
              ))}
            </div>
            <button className={styles.addTemplateBtn}>+ New Template</button>
          </div>
        )}

        {activeTab === 'keyframing' && (
          <div className={styles.keyframingView}>
            <h3>Keyframe Editor</h3>
            <div className={styles.keyframesList}>
              {keyframes.map((keyframe) => (
                <div key={keyframe.id} className={styles.keyframeCard}>
                  <div className={styles.keyframeHeader}>
                    <h4>{keyframe.name}</h4>
                    <span className={styles.keyframeProperty}>{keyframe.property}</span>
                  </div>
                  <div className={styles.keyframeEasing}>
                    <label>Easing:</label>
                    <select value={keyframe.easing}>
                      <option value="linear">Linear</option>
                      <option value="easeIn">Ease In</option>
                      <option value="easeOut">Ease Out</option>
                      <option value="easeInOut">Ease In Out</option>
                    </select>
                  </div>
                  <div className={styles.keyframeValues}>
                    {keyframe.values.map((value: LegacyAny, index: number) => (
                      <div key={index} className={styles.keyframeValue}>
                        <label>Time: {value.time}%</label>
                        <input
                          type="text"
                          value={JSON.stringify(value.value)}
                          readOnly
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <button className={styles.addKeyframeBtn} onClick={handleAddKeyframe}>
              + Add Keyframe
            </button>
          </div>
        )}

        {activeTab === 'animation' && (
          <div className={styles.animationView}>
            <h3>Animation Tools</h3>
            <p>Animation features will be implemented in a future phase.</p>
          </div>
        )}

        {activeTab === 'export' && (
          <div className={styles.exportView}>
            <h3>Export</h3>
            <p>Export features will be implemented in a future phase.</p>
          </div>
        )}
      </div>

      <div className={styles.pageFooter}>
        <div className={styles.globalControls}>
          <label className={styles.toggleLabel}>
            <input type="checkbox" />
            <span>Motion Processing ON</span>
          </label>
        </div>

        <div className={styles.pageActions}>
          <button className={styles.primaryBtn}>Apply Animation</button>
          <button className={styles.secondaryBtn}>Reset Animation</button>
          <button className={styles.compareBtn}>Preview</button>
        </div>
      </div>
    </div>
  );
};