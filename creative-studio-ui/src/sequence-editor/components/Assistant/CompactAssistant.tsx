/**
 * Professional Compact AI Assistant (Image 3)
 * 
 * Floating overlay providing real-time AI guidance, prompt assistance,
 * and automated scene generation commands.
 */

import React, { useState } from 'react';
import { Sparkles, Send, X, Shrink, Maximize2 } from 'lucide-react';

import { useAppDispatch } from '../../store';
import { toggleCompactMode } from '../../store/slices/panelsSlice';

export const CompactAssistant: React.FC = () => {
  const dispatch = useAppDispatch();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([
    { role: 'assistant', content: "Hello! I'm your cinematic assistant. How can I help you refine your sequence today?" }
  ]);
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages([...messages, { role: 'user', content: input }]);
    setInput('');
    // Simulate thinking...
    setTimeout(() => {
      setMessages(prev => [...prev, { role: 'assistant', content: "I'm analyzing your request. Shall I generate a few environment variations for you?" }]);
    }, 1000);
  };

  if (!isOpen) {
    return (
      <button 
        className="assistant-footer-trigger"
        onClick={() => dispatch(toggleCompactMode())}
      >
        <Sparkles className="w-4 h-4 text-indigo-400" />
        <span className="text-[11px] font-black uppercase tracking-widest ml-2 text-white/90">Assistant LLM compact</span>
      </button>
    );
  }

  return (
    <div className={`assistant-overlay glassmorphic ${isMinimized ? 'minimized' : ''}`}>
      <header className="assistant-header">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600/20 rounded-lg">
             <Sparkles className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <h4 className="text-xs font-black uppercase tracking-widest text-white/90 m-0">Assistant</h4>
            <div className="flex items-center gap-1.5">
               <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
               <span className="text-[9px] font-bold text-emerald-500/80 uppercase">Active</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button 
            className="p-1.5 hover:bg-white/5 rounded-md text-white/40" 
            onClick={() => setIsMinimized(!isMinimized)}
            title={isMinimized ? "Maximize Assistant" : "Minimize Assistant"}
          >
            {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Shrink className="w-3.5 h-3.5" />}
          </button>
          <button 
            className="p-1.5 hover:bg-red-500/20 rounded-md text-white/40 hover:text-red-400" 
            onClick={() => setIsOpen(false)}
            title="Close Assistant"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {!isMinimized && (
        <>
          <div className="assistant-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`message-row ${msg.role}`}>
                <div className={`message-bubble ${msg.role === 'assistant' ? 'glassmorphic-dark' : 'bg-indigo-600/20'}`}>
                  {msg.content}
                </div>
              </div>
            ))}
          </div>

          <div className="assistant-footer">
            <div className="message-input-container glassmorphic-dark">
              <input 
                type="text" 
                placeholder="Ask me anything..." 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              />
              <button 
                className={`send-btn ${input.trim() ? 'active' : ''}`}
                onClick={handleSend}
                title="Send Message"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CompactAssistant;
