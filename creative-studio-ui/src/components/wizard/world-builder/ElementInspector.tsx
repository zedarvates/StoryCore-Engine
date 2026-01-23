import React from 'react';

interface ElementInspectorProps {
  element: any;
  onClose: () => void;
}

export const ElementInspector: React.FC<ElementInspectorProps> = ({ element, onClose }) => {
  return (
    <div className="element-inspector">
      <div className="inspector-header">
        <h3>Element Inspector</h3>
        <button onClick={onClose} className="close-inspector">×</button>
      </div>
      <div className="inspector-content">
        <pre>{JSON.stringify(element, null, 2)}</pre>
      </div>
    </div>
  );
};