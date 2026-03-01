import React, { useState } from 'react';
import styles from './AudioPanel.module.css';

interface FairlightPageProps {}

export const FairlightPage: React.FC<FairlightPageProps> = () => {
  const [activeTab, setActiveTab] = useState<'mixer' | 'effects' | 'automation' | 'metering'>('mixer');
  const [tracks, setTracks] = useState<any[]>([
    {
      id: 'track_1',
      name: 'Dialogue',
      channels: 'stereo',
      volume: -3.0,
      pan: 0.0,
      muted: false,
      solo: false,
      bus: 'master',
      effects: [],
      automation: {}
    },
    {
      id: 'track_2',
      name: 'Music',
      channels: 'stereo',
      volume: -6.0,
      pan: 0.0,
      muted: false,
      solo: false,
      bus: 'master',
      effects: [],
      automation: {}
    },
    {
      id: 'track_3',
      name: 'SFX',
      channels: 'stereo',
      volume: -4.0,
      pan: 0.0,
      muted: false,
      solo: false,
      bus: 'master',
      effects: [],
      automation: {}
    }
  ]);
  const [busses, setBusses] = useState<any[]>([
    {
      id: 'master',
      name: 'Master',
      channels: 'stereo',
      volume: 0.0,
      effects: []
    },
    {
      id: 'music',
      name: 'Music Bus',
      channels: 'stereo',
      volume: 0.0,
      effects: []
    }
  ]);

  const handleTrackChange = (trackId: string, changes: any) => {
    setTracks(tracks.map(track => 
      track.id === trackId ? { ...track, ...changes } : track
    ));
  };

  const handleBusChange = (busId: string, changes: any) => {
    setBusses(busses.map(bus => 
      bus.id === busId ? { ...bus, ...changes } : bus
    ));
  };

  const addTrack = () => {
    const newTrack = {
      id: `track_${Date.now()}`,
      name: `Track ${tracks.length + 1}`,
      channels: 'stereo',
      volume: 0.0,
      pan: 0.0,
      muted: false,
      solo: false,
      bus: 'master',
      effects: [],
      automation: {}
    };
    setTracks([...tracks, newTrack]);
  };

  const addBus = () => {
    const newBus = {
      id: `bus_${Date.now()}`,
      name: `Bus ${busses.length + 1}`,
      channels: 'stereo',
      volume: 0.0,
      effects: []
    };
    setBusses([...busses, newBus]);
  };

  return (
    <div className={styles.fairlightPage}>
      <div className={styles.pageHeader}>
        <h2>Fairlight Audio Page</h2>
        <div className={styles.pageTabs}>
          <button
            className={`${styles.tabBtn} ${activeTab === 'mixer' ? styles.active : ''}`}
            onClick={() => setActiveTab('mixer')}
          >
            Mixer
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === 'effects' ? styles.active : ''}`}
            onClick={() => setActiveTab('effects')}
          >
            Effects
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === 'automation' ? styles.active : ''}`}
            onClick={() => setActiveTab('automation')}
          >
            Automation
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === 'metering' ? styles.active : ''}`}
            onClick={() => setActiveTab('metering')}
          >
            Metering
          </button>
        </div>
      </div>

      <div className={styles.pageContent}>
        {activeTab === 'mixer' && (
          <div className={styles.mixerView}>
            <div className={styles.trackList}>
              {tracks.map((track) => (
                <div key={track.id} className={styles.trackRow}>
                  <div className={styles.trackHeader}>
                    <div className={styles.trackName}>{track.name}</div>
                    <div className={styles.trackActions}>
                      <button
                        className={`${styles.muteBtn} ${track.muted ? styles.active : ''}`}
                        onClick={() => handleTrackChange(track.id, { muted: !track.muted })}
                        title={track.muted ? 'Unmute' : 'Mute'}
                      >
                        🔇
                      </button>
                      <button
                        className={`${styles.soloBtn} ${track.solo ? styles.active : ''}`}
                        onClick={() => handleTrackChange(track.id, { solo: !track.solo })}
                        title={track.solo ? 'Unsolo' : 'Solo'}
                      >
                        🔊
                      </button>
                      <select
                        value={track.bus}
                        onChange={(e) => handleTrackChange(track.id, { bus: e.target.value })}
                        className={styles.busSelect}
                      >
                        {busses.map((bus) => (
                          <option key={bus.id} value={bus.id}>{bus.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className={styles.trackControls}>
                    <div className={styles.sliderGroup}>
                      <label>Volume</label>
                      <input
                        type="range"
                        min={-60}
                        max={12}
                        step={0.1}
                        value={track.volume}
                        onChange={(e) => handleTrackChange(track.id, { volume: parseFloat(e.target.value) })}
                      />
                      <span>{track.volume} dB</span>
                    </div>

                    <div className={styles.sliderGroup}>
                      <label>Pan</label>
                      <input
                        type="range"
                        min={-1}
                        max={1}
                        step={0.01}
                        value={track.pan}
                        onChange={(e) => handleTrackChange(track.id, { pan: parseFloat(e.target.value) })}
                      />
                      <span>{(track.pan * 50).toFixed(0)}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className={styles.busList}>
              {busses.map((bus) => (
                <div key={bus.id} className={styles.busRow}>
                  <div className={styles.busHeader}>
                    <div className={styles.busName}>{bus.name}</div>
                  </div>

                  <div className={styles.busControls}>
                    <div className={styles.sliderGroup}>
                      <label>Volume</label>
                      <input
                        type="range"
                        min={-60}
                        max={12}
                        step={0.1}
                        value={bus.volume}
                        onChange={(e) => handleBusChange(bus.id, { volume: parseFloat(e.target.value) })}
                      />
                      <span>{bus.volume} dB</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'effects' && (
          <div className={styles.effectsView}>
            <h3>Audio Effects</h3>
            <div className={styles.effectsGrid}>
              <div className={styles.effectCard}>
                <h4>EQ Parametric</h4>
                <p>6-band parametric equalizer</p>
                <button className={styles.effectBtn}>Add to Track</button>
              </div>
              <div className={styles.effectCard}>
                <h4>Compressor</h4>
                <p>Dynamic range compression</p>
                <button className={styles.effectBtn}>Add to Track</button>
              </div>
              <div className={styles.effectCard}>
                <h4>Limiter</h4>
                <p>Peak limiting</p>
                <button className={styles.effectBtn}>Add to Track</button>
              </div>
              <div className={styles.effectCard}>
                <h4>De-Esser</h4>
                <p>Sibilance reduction</p>
                <button className={styles.effectBtn}>Add to Track</button>
              </div>
              <div className={styles.effectCard}>
                <h4>Noise Gate</h4>
                <p>Background noise removal</p>
                <button className={styles.effectBtn}>Add to Track</button>
              </div>
              <div className={styles.effectCard}>
                <h4>Reverb</h4>
                <p>Room simulation</p>
                <button className={styles.effectBtn}>Add to Track</button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'automation' && (
          <div className={styles.automationView}>
            <h3>Automation</h3>
            <p>Automation features will be implemented in a future phase.</p>
          </div>
        )}

        {activeTab === 'metering' && (
          <div className={styles.meteringView}>
            <h3>Audio Metering</h3>
            <p>Professional audio metering (LUFS, dBFS, phase correlation) will be implemented in a future phase.</p>
          </div>
        )}
      </div>

      <div className={styles.pageFooter}>
        <div className={styles.globalControls}>
          <label className={styles.toggleLabel}>
            <input type="checkbox" />
            <span>Audio Processing ON</span>
          </label>
        </div>

        <div className={styles.pageActions}>
          <button className={styles.primaryBtn}>Apply Mix</button>
          <button className={styles.secondaryBtn}>Reset Mix</button>
          <button className={styles.compareBtn}>Compare</button>
        </div>
      </div>
    </div>
  );
};