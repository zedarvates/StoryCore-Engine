import React, { useState } from 'react';

interface OnePromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (prompt: string) => void;
}

export function OnePromptModal({ isOpen, onClose, onConfirm }: OnePromptModalProps) {
  const [prompt, setPrompt] = useState('');

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onConfirm(prompt);
    onClose();
  };

  if (!isOpen) return null;

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
}
