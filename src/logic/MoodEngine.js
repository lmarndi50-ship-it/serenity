/**
 * MoodEngine.js
 * Implements the logic for Step 1 (Detect Mood), Step 2 (Response Style), 
 * and Step 4 (Mood Blending) as per the requirements.
 */

const MOODS = {
  POSITIVE: 'positive',
  NEGATIVE: 'negative',
  NEUTRAL: 'complex',
};

const keywords = {
  positive: ['happy', 'excited', 'peaceful', 'loved', 'motivated', 'good', 'great', 'amazing', 'wonderful'],
  negative: ['sad', 'angry', 'lonely', 'anxious', 'overthinking', 'stressed', 'tired', 'hurt', 'frustrated', 'bad', 'awful'],
  neutral: ['empty', 'confused', 'numb', 'lost', 'low', 'blah', 'okay', 'fine'],
};

export const detectMood = (text) => {
  const lowercaseText = text.toLowerCase();
  let scores = { positive: 0, negative: 0, neutral: 0 };

  Object.keys(keywords).forEach(mood => {
    keywords[mood].forEach(word => {
      if (lowercaseText.includes(word)) {
        scores[mood]++;
      }
    });
  });

  // Calculate blended mood logic
  const detectedMoods = Object.keys(scores).filter(m => scores[m] > 0);

  if (detectedMoods.length > 1) {
    if (scores.positive > 0 && scores.negative > 0) return 'blended';
    if (scores.negative > 0 && scores.neutral > 0) return 'complex';
  }

  if (detectedMoods.length === 1) return detectedMoods[0];

  return 'neutral'; // Fallback
};

export const getResponseStyle = (mood) => {
  switch (mood) {
    case 'positive':
      return {
        tone: 'Energetic, uplifting',
        encouragement: 'Share that warmth with someone today, or just hold onto it for a bit longer.'
      };
    case 'negative':
      return {
        tone: 'Calm, soft, comforting',
        presence: "I'm here with you. We don't have to fix anything right now… we can just be."
      };
    case 'blended':
      return {
        tone: 'Acknowledge both',
        insight: "It feels like you're holding a lot of different things right now… that's a heavy mix."
      };
    case 'complex':
    default:
      return {
        tone: 'Gentle, slow, non-intrusive',
        presence: "Sitting with you in the quiet. No rush to figure it all out."
      };
  }
};

export const generateAIResponse = (userText) => {
  const mood = detectMood(userText);
  const style = getResponseStyle(mood);
  
  // Simulations of "human-like" responses based on rules
  const greetings = ["Hey...", "Hey there.", "I'm listening.", "I'm right here."];
  const intro = greetings[Math.floor(Math.random() * greetings.length)];

  if (mood === 'negative') {
    return `${intro} It sounds like things are feeling really heavy... am I getting that right? I'm here. Do you wanna talk it out, or maybe just distract yourself for a bit?`;
  }
  
  if (mood === 'positive') {
    return `${intro} That's so wonderful to hear. I love that you're feeling this right now. Do you want to dive deeper into why, or just enjoy the moment?`;
  }

  if (mood === 'blended') {
    return `${intro} It feels like you're hurt but also trying to stay positive... that is a lot to carry at once. I'm sitting here with you. Do you want to vent, or maybe we could try a small breathing exercise together?`;
  }

  return `${intro} I hear you. Sometimes it's just hard to put into words, isn't it? I'm here whenever you're ready. What feels best for you right now?`;
};
