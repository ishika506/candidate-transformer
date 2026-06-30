/**
 * Normalizer module for normalizing phone numbers, dates, locations, and skills.
 */

/**
 * Normalizes phone numbers to E.164 format.
 * E.g., "(555) 019-8111" -> "+15550198111", "555-987-6543" -> "+15559876543"
 * @param {string} phone 
 * @returns {string}
 */
export function normalizePhone(phone) {
  if (!phone) return null;
  
  // Remove all characters except digits and '+'
  let cleaned = phone.replace(/[^\d+]/g, '');
  
  if (cleaned.startsWith('+')) {
    return cleaned;
  }
  
  // If it's a 7 digit number, add +1
  if (cleaned.length === 7) {
    return '+1' + cleaned;
  }

  // If it's a 10 digit US number, add +1
  if (cleaned.length === 10) {
    return '+1' + cleaned;
  }
  
  // If it's 11 digits and starts with 1, add +
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return '+' + cleaned;
  }
  
  // Standard fallback
  return '+' + cleaned;
}

/**
 * Normalizes date strings to YYYY-MM format.
 * E.g., "2021-03" -> "2021-03", "2018-01" -> "2018-01"
 * "2018" -> "2018-01"
 * "Jan 2018" -> "2018-01", "January 2018" -> "2018-01"
 * @param {string} dateStr 
 * @returns {string|null}
 */
export function normalizeDate(dateStr) {
  if (!dateStr) return null;
  const s = dateStr.trim().toLowerCase();
  if (s === 'present' || s === 'current' || s === 'now' || s === 'null') return null;

  // Pattern: YYYY-MM
  if (/^\d{4}-\d{2}$/.test(s)) return s;

  // Pattern: YYYY
  if (/^\d{4}$/.test(s)) return `${s}-01`;

  // Pattern: Month YYYY (e.g. Jan 2018, January 2018, 01/2018)
  const monthMap = {
    jan: '01', januray: '01', january: '01',
    feb: '02', february: '02',
    mar: '03', march: '03',
    apr: '04', april: '04',
    may: '05',
    jun: '06', june: '06',
    jul: '07', july: '07',
    aug: '08', august: '08',
    sep: '09', september: '09',
    oct: '10', october: '10',
    nov: '11', november: '11',
    dec: '12', december: '12'
  };

  // Try parsing month and year
  const parts = s.split(/[\s,/-]+/);
  if (parts.length === 2) {
    let month = null;
    let year = null;
    
    // Check if first is month and second is year
    if (monthMap[parts[0]]) {
      month = monthMap[parts[0]];
      year = parts[1];
    } else if (monthMap[parts[1]]) {
      month = monthMap[parts[1]];
      year = parts[0];
    } else if (/^\d{1,2}$/.test(parts[0]) && /^\d{4}$/.test(parts[1])) {
      // e.g. 01/2018
      month = parts[0].padStart(2, '0');
      year = parts[1];
    }
    
    if (year && /^\d{4}$/.test(year) && month) {
      return `${year}-${month}`;
    }
  }

  // Fallback to JS Date parsing
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  return null;
}

/**
 * Normalizes location strings to { city, region, country } with ISO country code.
 * E.g., "Seattle, WA" -> { city: "Seattle", region: "WA", country: "US" }
 * "San Francisco, CA, USA" -> { city: "San Francisco", region: "CA", country: "US" }
 * @param {string} locStr 
 * @returns {Object|null}
 */
export function normalizeLocation(locStr) {
  if (!locStr) return null;

  const parts = locStr.split(',').map(p => p.trim());
  let city = null;
  let region = null;
  let country = 'US'; // default if US state is detected

  const usStates = new Set([
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY',
    'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND',
    'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
  ]);

  if (parts.length === 1) {
    // Check if it's a country
    const p = parts[0].toUpperCase();
    if (p === 'USA' || p === 'UNITED STATES') return { city: null, region: null, country: 'US' };
    if (p === 'UK' || p === 'UNITED KINGDOM') return { city: null, region: null, country: 'GB' };
    return { city: parts[0], region: null, country: 'US' };
  } else if (parts.length === 2) {
    city = parts[0];
    const r = parts[1].toUpperCase();
    if (usStates.has(r)) {
      region = r;
      country = 'US';
    } else if (r === 'USA' || r === 'UNITED STATES') {
      region = null;
      country = 'US';
    } else {
      region = parts[1];
      country = 'US'; // default fallback
    }
  } else if (parts.length >= 3) {
    city = parts[0];
    region = parts[1];
    const c = parts[2].toUpperCase();
    if (c === 'USA' || c === 'UNITED STATES') {
      country = 'US';
    } else if (c === 'UK' || c === 'UNITED KINGDOM') {
      country = 'GB';
    } else {
      country = parts[2].substring(0, 2).toUpperCase();
    }
  }

  return { city, region, country };
}

/**
 * Normalizes skill names to canonical forms.
 * E.g., "js" -> "JavaScript", "reactjs" -> "React"
 * @param {string} skillName 
 * @returns {string}
 */
export function normalizeSkill(skillName) {
  if (!skillName) return '';
  const s = skillName.trim().toLowerCase();
  
  const skillMap = {
    'js': 'JavaScript',
    'javascript': 'JavaScript',
    'ts': 'TypeScript',
    'typescript': 'TypeScript',
    'react': 'React',
    'reactjs': 'React',
    'node': 'Node.js',
    'nodejs': 'Node.js',
    'node.js': 'Node.js',
    'python': 'Python',
    'py': 'Python',
    'sql': 'SQL',
    'mysql': 'SQL',
    'postgres': 'SQL',
    'postgresql': 'SQL',
    'java': 'Java',
    'rust': 'Rust',
    'go': 'Go',
    'golang': 'Go',
    'css': 'CSS',
    'html': 'HTML',
    'product management': 'Product Management',
    'pm': 'Product Management',
    'agile': 'Agile Methodologies',
    'scrum': 'Agile Methodologies',
    'c++': 'C++',
    'cpp': 'C++',
    'distributed systems': 'Distributed Systems'
  };

  return skillMap[s] || skillName;
}
