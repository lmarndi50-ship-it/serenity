import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Sparkles } from 'lucide-react';
import { generateAIResponse, detectMood } from '../logic/MoodEngine';

export const ChatInterface = ({ onMoodChange, onToolOpen }) => {
  const [messages, setMessages] = useState([
    { id: 1, type: 'ai', text: "Hey... I'm here. How are you really feeling today?" }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { id: Date.now(), type: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    
    // Detect mood for theme change
    const detectedMood = detectMood(input);
    onMoodChange(detectedMood);

    setInput('');
    setIsTyping(true);

    // Simulate "human-like" delay
    setTimeout(() => {
      const response = generateAIResponse(input);
      setMessages(prev => [...prev, { id: Date.now() + 1, type: 'ai', text: response }]);
      setIsTyping(false);
      
      // If the response suggests a tool, maybe we highlight it?
      if (input.toLowerCase().includes('stressed') || input.toLowerCase().includes('anxious')) {
          // Future: Suggest breathing automatically?
      }
    }, 1500);
  };

  return (
    <div className="chat-container glass-card">
      <div className="messages" ref={scrollRef}>
        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={`message ${msg.type}`}
            >
              {msg.text}
            </motion.div>
          ))}
          {isTyping && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              className="message ai"
              style={{ padding: '10px 18px', display: 'flex', gap: '4px' }}
            >
              <div className="dot">.</div>
              <div className="dot">.</div>
              <div className="dot">.</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="input-area">
        <button className="send-btn" onClick={() => onToolOpen('breathe')} title="Breathe">
          <Sparkles size={20} />
        </button>
        <input 
          type="text" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Type whatever you're feeling..."
        />
        <button className="send-btn" onClick={handleSend}>
          <Send size={20} />
        </button>
      </div>
    </div>
  );
};
