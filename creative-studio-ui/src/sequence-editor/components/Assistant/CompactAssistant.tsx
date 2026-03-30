import React, { useState } from 'react';
import { Sparkles, Send, X, Shrink, Maximize2 } from 'lucide-react';

import { useAppDispatch, useAppSelector } from '../../store';
import { 
  addMessage, 
  setIsOpen, 
  setIsMinimized, 
  setIsThinking 
} from '../../store/slices/chatSlice';

export const CompactAssistant: React.FC = () => {
  const dispatch = useAppDispatch();
  const { messages, isOpen, isMinimized, isThinking } = useAppSelector(state => state.chat);
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input.trim() || isThinking) return;
    
    dispatch(addMessage({ role: 'user', content: input }));
    setInput('');
    dispatch(setIsThinking(true));
    
    // Simulate thinking...
    setTimeout(() => {
      dispatch(addMessage({ 
        role: 'assistant', 
        content: "I'm analyzing your request. Shall I generate a few environment variations for you?" 
      }));
      dispatch(setIsThinking(false));
    }, 1500);
  };

  if (!isOpen) {
    return (
      <button 
        className="assistant-footer-trigger"
        onClick={() => dispatch(setIsOpen(true))}
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
             <Sparkles className={`w-4 h-4 text-indigo-400 ${isThinking ? 'animate-pulse' : ''}`} />
          </div>
          <div>
            <h4 className="text-xs font-black uppercase tracking-widest text-white/90 m-0">Assistant</h4>
            <div className="flex items-center gap-1.5">
               <span className={`w-1.5 h-1.5 ${isThinking ? 'bg-amber-500' : 'bg-emerald-500'} rounded-full ${isThinking ? 'animate-pulse' : ''}`} />
               <span className={`text-[9px] font-bold ${isThinking ? 'text-amber-500/80' : 'text-emerald-500/80'} uppercase`}>
                 {isThinking ? 'Thinking...' : 'Active'}
               </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button 
            className="p-1.5 hover:bg-white/5 rounded-md text-white/40" 
            onClick={() => dispatch(setIsMinimized(!isMinimized))}
            title={isMinimized ? "Maximize Assistant" : "Minimize Assistant"}
          >
            {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Shrink className="w-3.5 h-3.5" />}
          </button>
          <button 
            className="p-1.5 hover:bg-red-500/20 rounded-md text-white/40 hover:text-red-400" 
            onClick={() => dispatch(setIsOpen(false))}
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
            {isThinking && (
              <div className="message-row assistant">
                <div className="message-bubble glassmorphic-dark opacity-50">
                  <span className="dot-flashing" />
                </div>
              </div>
            )}
          </div>

          <div className="assistant-footer">
            <div className="message-input-container glassmorphic-dark">
              <input 
                type="text" 
                placeholder="Ask me anything..." 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                disabled={isThinking}
              />
              <button 
                className={`send-btn ${input.trim() && !isThinking ? 'active' : ''}`}
                onClick={handleSend}
                disabled={!input.trim() || isThinking}
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
