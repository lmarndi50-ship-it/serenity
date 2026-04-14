import React, { useState } from 'react';
import { ChatInterface } from './components/ChatInterface';
import { WellnessTools } from './components/WellnessTools';
import { motion, AnimatePresence } from 'framer-motion';

function App() {
  const [mood, setMood] = useState('neutral');
  const [activeTool, setActiveTool] = useState(null);

  const handleMoodChange = (newMood) => {
    // If mood is 'blended', we might stick to complex for styling
    const themeMood = newMood === 'blended' ? 'complex' : newMood;
    setMood(themeMood);
  };

  return (
    <div className="app-root" data-mood={mood}>
      {/* Dynamic light effects */}
      <div className="glow-orb orb-1"></div>
      <div className="glow-orb orb-2"></div>

      <ChatInterface 
        onMoodChange={handleMoodChange} 
        onToolOpen={setActiveTool}
      />

      <AnimatePresence>
        {activeTool && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ 
              position: 'fixed', 
              top: 0, 
              left: 0, 
              right: 0, 
              bottom: 0, 
              backgroundColor: 'rgba(0,0,0,0.6)', 
              zIndex: 100 
            }}
          >
            <WellnessTools 
              type={activeTool} 
              onClose={() => setActiveTool(null)} 
            />
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .app-root {
          width: 100vw;
          height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
        }

        .glow-orb {
          position: absolute;
          width: 400px;
          height: 400px;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.3;
          z-index: 1;
          background: var(--accent);
          transition: all 2s ease;
        }

        .orb-1 { top: -100px; right: -100px; }
        .orb-2 { bottom: -100px; left: -100px; opacity: 0.2; }

        .dot {
          animation: blink 1.4s infinite both;
          font-size: 2rem;
          line-height: 0;
        }
        .dot:nth-child(2) { animation-delay: 0.2s; }
        .dot:nth-child(3) { animation-delay: 0.4s; }

        @keyframes blink {
          0% { opacity: 0.2; }
          20% { opacity: 1; }
          100% { opacity: 0.2; }
        }
      `}</style>
    </div>
  );
}

export default App;
