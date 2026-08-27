/**
 * Normalizes a phone number to standard E.164 format (+91...)
 * @param {string} phone 
 * @returns {string}
 */
const normalizePhone = (phone) => {
  if (!phone) return '';
  let normalized = phone.replace('whatsapp:', '').trim();
  if (!normalized.startsWith('+')) {
    // Assuming Indian numbers if no + prefix
    normalized = `+91${normalized}`;
  }
  return normalized;
};

/**
 * Formats a number to Indian currency format
 * @param {number} amount 
 * @returns {string}
 */
const formatCurrency = (amount) => {
  if (isNaN(amount)) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2
  }).format(amount);
};

/**
 * Formats a Date object to DD MMM YYYY
 * @param {Date} date 
 * @returns {string}
 */
const formatDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

/**
 * Determines the channel based on the prefix of the sender
 * @param {string} from 
 * @returns {string}
 */
const getChannel = (from) => {
  if (from && from.startsWith('whatsapp:')) {
    return 'whatsapp';
  }
  return 'sms';
};

/**
 * Truncates a message to fit Twilio's limits
 * @param {string} msg 
 * @param {number} maxLen 
 * @returns {string}
 */
const truncateMessage = (msg, maxLen = 1500) => {
  if (!msg) return '';
  if (msg.length <= maxLen) return msg;
  return msg.substring(0, maxLen - 3) + '...';
};

module.exports = {
  normalizePhone,
  formatCurrency,
  formatDate,
  getChannel,
  truncateMessage
};
