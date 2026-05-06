import { LegacyAny } from '@/types/legacy';
import React, { useState } from 'react';
import styles from './FusionPanel.module.css';

interface FusionPageProps {}

export const FusionPage: React.FC<FusionPageProps> = () => {
  const [activeTab, setActiveTab] = useState<'nodeEditor' | 'nodeLibrary' | 'inspector' | 'splineEditor'>('nodeEditor');
  const [nodes, setNodes] = useState<LegacyAny[]>([
    {
      id: 'node_1',
      type: 'mediaIn',
      name: 'MediaIn',
      position: { x: 100, y: 100 },
      inputs: {},
      outputs: { output: 'image' },
      enabled: true
    },
    {
      id: 'node_2',
      type: 'colorCorrect',
      name: 'ColorCorrect',
      position: { x: 300, y: 100 },
      inputs: { input: 'image' },
      outputs: { output: 'image' },
      enabled: true
    },
    {
      id: 'node_3',
      type: 'blur',
      name: 'Blur',
      position: { x: 500, y: 100 },
      inputs: { input: 'image' },
      outputs: { output: 'image' },
      enabled: true
    },
    {
      id: 'node_4',
      type: 'merge',
      name: 'Merge',
      position: { x: 700, y: 100 },
      inputs: { foreground: 'image', background: 'image' },
      outputs: { output: 'image' },
      enabled: true
    },
    {
      id: 'node_5',
      type: 'mediaOut',
      name: 'MediaOut',
      position: { x: 900, y: 100 },
      inputs: { input: 'image' },
      outputs: {},
      enabled: true
    }
  ]);
  const [connections, setConnections] = useState<LegacyAny[]>([
    { from: 'node_1', output: 'output', to: 'node_2', input: 'input' },
    { from: 'node_2', output: 'output', to: 'node_3', input: 'input' },
    { from: 'node_3', output: 'output', to: 'node_4', input: 'foreground' },
    { from: 'node_4', output: 'output', to: 'node_5', input: 'input' }
  ]);

  const handleNodeMove = (nodeId: string, newPosition: LegacyAny) => {
    setNodes(nodes.map(node =>
      node.id === nodeId ? { ...node, position: newPosition } : node
    ));
  };

  const handleAddNode = (nodeType: string) => {
    const newNode = {
      id: `node_${Date.now()}`,
      type: nodeType,
      name: nodeType.charAt(0).toUpperCase() + nodeType.slice(1),
      position: { x: 200, y: 200 },
      inputs: {},
      outputs: { output: 'image' },
      enabled: true
    };
    setNodes([...nodes, newNode]);
  };

  const handleConnect = (fromNode: string, fromOutput: string, toNode: string, toInput: string) => {
    setConnections([...connections, { from: fromNode, output: fromOutput, to: toNode, input: toInput }]);
  };

  const handleDisconnect = (connection: LegacyAny) => {
    setConnections(connections.filter(conn => 
      conn.from !== connection.from || conn.output !== connection.output ||
      conn.to !== connection.to || conn.input !== connection.input
    ));
  };

  return (
    <div className={styles.fusionPage}>
      <div className={styles.pageHeader}>
        <h2>Fusion VFX Page</h2>
        <div className={styles.pageTabs}>
          <button
            className={`${styles.tabBtn} ${activeTab === 'nodeEditor' ? styles.active : ''}`}
            onClick={() => setActiveTab('nodeEditor')}
          >
            Node Editor
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === 'nodeLibrary' ? styles.active : ''}`}
            onClick={() => setActiveTab('nodeLibrary')}
          >
            Node Library
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === 'inspector' ? styles.active : ''}`}
            onClick={() => setActiveTab('inspector')}
          >
            Inspector
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === 'splineEditor' ? styles.active : ''}`}
            onClick={() => setActiveTab('splineEditor')}
          >
            Spline Editor
          </button>
        </div>
      </div>

      <div className={styles.pageContent}>
        {activeTab === 'nodeEditor' && (
          <div className={styles.nodeEditorView}>
            <div className={styles.nodeCanvas}>
              {nodes.map((node) => (
                <div
                  key={node.id}
                  className={`${styles.node} ${node.enabled ? '' : styles.disabled}`}
                  style={{ left: node.position.x, top: node.position.y }}
                  onDrag={(e) => handleNodeMove(node.id, { x: e.clientX, y: e.clientY })}
                >
                  <div className={styles.nodeHeader}>
                    <span className={styles.nodeType}>{node.type}</span>
                    <span className={styles.nodeName}>{node.name}</span>
                    <button
                      className={styles.nodeToggle}
                      onClick={() => handleNodeChange(node.id, { enabled: !node.enabled })}
                    >
                      {node.enabled ? 'ON' : 'OFF'}
                    </button>
                  </div>
                  <div className={styles.nodeInputs}>
                    {Object.keys(node.inputs).map((input) => (
                      <div key={input} className={styles.nodeInput}>
                        {input}
                        <div className={styles.connectionPoint} />
                      </div>
                    ))}
                  </div>
                  <div className={styles.nodeOutputs}>
                    {Object.keys(node.outputs).map((output) => (
                      <div key={output} className={styles.nodeOutput}>
                        <div className={styles.connectionPoint} />
                        {output}
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {connections.map((conn) => (
                <div key={`${conn.from}-${conn.output}-${conn.to}-${conn.input}`} className={styles.connectionLine}>
                  {/* Connection line rendering */}
                </div>
              ))}
            </div>

            <div className={styles.nodeToolbar}>
              <button onClick={() => handleAddNode('mediaIn')}>Add MediaIn</button>
              <button onClick={() => handleAddNode('colorCorrect')}>Add ColorCorrect</button>
              <button onClick={() => handleAddNode('blur')}>Add Blur</button>
              <button onClick={() => handleAddNode('merge')}>Add Merge</button>
              <button onClick={() => handleAddNode('mediaOut')}>Add MediaOut</button>
            </div>
          </div>
        )}

        {activeTab === 'nodeLibrary' && (
          <div className={styles.nodeLibraryView}>
            <h3>Node Library</h3>
            <div className={styles.libraryCategories}>
              <button className={styles.categoryBtn}>Transform</button>
              <button className={styles.categoryBtn}>Color</button>
              <button className={styles.categoryBtn}>Filter</button>
              <button className={styles.categoryBtn}>Keyer</button>
              <button className={styles.categoryBtn}>Merge</button>
              <button className={styles.categoryBtn}>Generate</button>
              <button className={styles.categoryBtn}>Tracking</button>
            </div>

            <div className={styles.libraryGrid}>
              <div className={styles.nodeCard}>
                <h4>Transform</h4>
                <p>Geometric transformations</p>
                <button className={styles.addNodeBtn}>Add</button>
              </div>
              <div className={styles.nodeCard}>
                <h4>ColorCorrect</h4>
                <p>Color correction</p>
                <button className={styles.addNodeBtn}>Add</button>
              </div>
              <div className={styles.nodeCard}>
                <h4>Blur</h4>
                <p>Blur effects</p>
                <button className={styles.addNodeBtn}>Add</button>
              </div>
              <div className={styles.nodeCard}>
                <h4>Merge</h4>
                <p>Compositing</p>
                <button className={styles.addNodeBtn}>Add</button>
              </div>
              <div className={styles.nodeCard}>
                <h4>ChromaKey</h4>
                <p>Green screen</p>
                <button className={styles.addNodeBtn}>Add</button>
              </div>
              <div className={styles.nodeCard}>
                <h4>Text</h4>
                <p>Text generation</p>
                <button className={styles.addNodeBtn}>Add</button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'inspector' && (
          <div className={styles.inspectorView}>
            <h3>Inspector</h3>
            <p>Node properties and parameters will be displayed here.</p>
          </div>
        )}

        {activeTab === 'splineEditor' && (
          <div className={styles.splineEditorView}>
            <h3>Spline Editor</h3>
            <p>Keyframe and spline editing will be implemented in a future phase.</p>
          </div>
        )}
      </div>

      <div className={styles.pageFooter}>
        <div className={styles.globalControls}>
          <label className={styles.toggleLabel}>
            <input type="checkbox" />
            <span>VFX Processing ON</span>
          </label>
        </div>

        <div className={styles.pageActions}>
          <button className={styles.primaryBtn}>Render</button>
          <button className={styles.secondaryBtn}>Reset</button>
          <button className={styles.compareBtn}>Compare</button>
        </div>
      </div>
    </div>
  );
};