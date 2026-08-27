const fs = require('fs');
const path = require('path');

const languages = {
  'en': 'English',
  'hi': 'Hindi',
  'ta': 'Tamil',
  'te': 'Telugu'
};

const templates = {};

function loadTemplates() {
  const dataDir = path.join(__dirname, '../data/templates');
  for (const lang of Object.keys(languages)) {
    try {
      const file = path.join(dataDir, `${lang}.json`);
      if (fs.existsSync(file)) {
        templates[lang] = require(file);
      } else {
        templates[lang] = {};
      }
    } catch (err) {
      console.warn(`Could not load templates for ${lang}`);
    }
  }
}
loadTemplates();

function getMessage(templateKey, language = 'en', variables = {}) {
  let langTemplates = templates[language];
  if (!langTemplates || !langTemplates[templateKey]) {
    langTemplates = templates['en'];
  }
  
  let template = langTemplates ? langTemplates[templateKey] : null;
  if (!template) return templateKey;
  
  for (const [key, value] of Object.entries(variables)) {
    template = template.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }
  
  return template;
}

function getAvailableLanguages() {
  return Object.keys(languages);
}

function getLanguageName(code) {
  return languages[code] || 'Unknown';
}

module.exports = {
  getMessage,
  getAvailableLanguages,
  getLanguageName
};
