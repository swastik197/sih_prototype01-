/**
 * Keyword-based intent detection supporting Hindi + English keywords.
 */

const intents = [
  { intent: 'weather', keywords: ['mausam', 'weather', 'barish', 'rain', 'tapman', 'temperature', 'mausam kaisa', 'garmi', 'thand', 'toofan', 'storm'] },
  { intent: 'price', keywords: ['bhav', 'price', 'rate', 'mandi', 'daam', 'kimat', 'bazaar'] },
  { intent: 'advisory', keywords: ['salah', 'advisory', 'advice', 'kya karun', 'crop', 'fasal', 'kheti'] },
  { intent: 'risk', keywords: ['jokhim', 'risk', 'khatara', 'danger', 'score', 'khatre'] },
  { intent: 'register', keywords: ['register', 'naam likho', 'shuru', 'start', 'panjikaran'] },
  { intent: 'help', keywords: ['madad', 'help', 'sahayata', 'menu', 'hi', 'hello', 'namaste'] },
  { intent: 'scheme', keywords: ['yojana', 'scheme', 'sarkar', 'government', 'sarkari'] }
];

const cropMap = {
  'tamatar': 'tomato',
  'gehun': 'wheat',
  'dhan': 'rice',
  'chawal': 'rice',
  'pyaz': 'onion',
  'aloo': 'potato',
  'kapas': 'cotton',
  'makka': 'maize',
  'sarson': 'mustard',
  'chana': 'chickpea',
  'moong': 'moong'
};

function parseIntent(messageBody) {
  if (!messageBody) return { intent: 'help', params: {} };
  
  const text = messageBody.toLowerCase().trim();
  let matchedIntent = 'help';
  let params = {};

  for (const intentObj of intents) {
    if (intentObj.keywords.some(kw => text.includes(kw))) {
      matchedIntent = intentObj.intent;
      break;
    }
  }

  if (matchedIntent === 'price') {
    for (const [hiCrop, enCrop] of Object.entries(cropMap)) {
      if (text.includes(hiCrop) || text.includes(enCrop)) {
        params.crop = enCrop;
        break;
      }
    }
  }

  return { intent: matchedIntent, params };
}

module.exports = { parseIntent };
