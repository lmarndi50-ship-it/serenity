import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export const WellnessTools = ({ type, onClose }) => {
  return (
    <div className="wellness-tool-container">
      <div className="glass-card" style={{ padding: '40px', position: 'relative' }}>
        <button 
          onClick={onClose} 
          style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}
        >
          <X size={24} />
        </button>
        
        {type === 'breathe' && <BreathingPacer />}
        {type === 'vent' && <VentMode />}
      </div>
    </div>
  );
};

const BreathingPacer = () => {
  const [phase, setPhase] = useState('Inhale');
  
  useEffect(() => {
    const cycle = async () => {
      while (true) {
        setPhase('Inhale');
        await new Promise(r => setTimeout(r, 4000));
        setPhase('Hold');
        await new Promise(r => setTimeout(r, 2000));
        setPhase('Exhale');
        await new Promise(r => setTimeout(r, 4000));
      }
    };
    cycle();
  }, []);

  return (
    <div style={{ textAlign: 'center' }}>
      <motion.div 
        className="breathe-circle"
        animate={{ 
          scale: phase === 'Inhale' ? [1, 1.5] : phase === 'Exhale' ? [1.5, 1] : 1.5,
        }}
        transition={{ duration: 4, ease: "easeInOut" }}
      />
      <h2 style={{ marginTop: '30px', fontWeight: '300', letterSpacing: '2px' }}>{phase}</h2>
      <p style={{ opacity: 0.6, marginTop: '10px' }}>Just follow the pulse...</p>
    </div>
  );
};

const VentMode = () => {
  const [text, setText] = useState('');
  
  return (
    <div className="vent-container">
      <h2 style={{ marginBottom: '20px', fontWeight: '300' }}>Let it go...</h2>
      <p style={{ opacity: 0.6, marginBottom: '20px', fontSize: '0.9rem' }}>The words will fade as you release them.</p>
      <textarea 
        className="vent-textarea"
        placeholder="Type whatever is on your mind..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        style={{
          opacity: text.length > 50 ? 0.3 : 1,
          transition: 'opacity 5s ease'
        }}
      />
      {text.length > 50 && (
        <motion.p 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }}
          style={{ fontSize: '0.8rem', color: 'var(--accent)', marginTop: '10px' }}
        >
          It's okay to let it fade.
        </motion.p>
      )}
    </div>
  );
};
