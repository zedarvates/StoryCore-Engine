import React, { useState } from'react';

const _OnePromptModal = ({ _isOpen, onClose, onConfirm }) => {
  const [prompt, setPrompt] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm(prompt);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Generate Prompt</h2>
        <form onSubmit={handleSubmit}>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Enter your prompt here..."
            rows={5}
            cols={50}
          />
          <button type="submit">Generate</button>
        </form>
      </div>
    </div>
  );
};

