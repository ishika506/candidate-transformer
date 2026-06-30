/**
 * Parser module for candidate data ingestion.
 * Handles:
 * - Recruiter CSV exports (structured)
 * - ATS JSON blobs (semi-structured)
 * - GitHub JSON blobs (unstructured/API)
 * - Recruiter free-text notes (unstructured)
 */

/**
 * Parses Recruiter CSV text into standardized intermediate records.
 * CSV Header: name,email,phone,current_company,title
 * @param {string} csvText 
 * @returns {Array<Object>}
 */
export function parseRecruiterCSV(csvText) {
  if (!csvText || csvText.trim() === '') return [];
  const lines = csvText.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
  if (lines.length <= 1) return [];

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const nameIdx = headers.indexOf('name');
  const emailIdx = headers.indexOf('email');
  const phoneIdx = headers.indexOf('phone');
  const companyIdx = headers.indexOf('current_company');
  const titleIdx = headers.indexOf('title');

  const records = [];
  for (let i = 1; i < lines.length; i++) {
    // Simple CSV splitter that handles basic commas (we can expand if there are quotes)
    const cols = lines[i].split(',').map(c => c.trim());
    if (cols.length < headers.length) continue;

    const email = emailIdx !== -1 ? cols[emailIdx] : '';
    if (!email) continue; // Email is critical for indexing

    records.push({
      source: 'recruiter_csv',
      sourceType: 'structured',
      full_name: nameIdx !== -1 ? cols[nameIdx] : null,
      emails: [email],
      phones: phoneIdx !== -1 && cols[phoneIdx] ? [cols[phoneIdx]] : [],
      experience: companyIdx !== -1 && cols[companyIdx] ? [{
        company: cols[companyIdx],
        title: titleIdx !== -1 ? cols[titleIdx] : null,
        start: null,
        end: null,
        summary: 'Current position from recruiter CSV export.'
      }] : [],
      skills: [],
      education: [],
      location: null,
      links: [],
      headline: titleIdx !== -1 && cols[titleIdx] ? `${cols[titleIdx]} at ${cols[companyIdx] || 'current company'}` : null
    });
  }
  return records;
}

/**
 * Parses ATS JSON array into standardized intermediate records.
 * Expects ATS format as defined in samples/ats_profile.json
 * @param {Array<Object>} atsArray 
 * @returns {Array<Object>}
 */
export function parseATSJson(atsArray) {
  if (!Array.isArray(atsArray)) return [];
  
  return atsArray.map(cand => {
    const email = cand.contactInfo?.emailAddress || null;
    const phone = cand.contactInfo?.mobileNumber || null;
    
    return {
      source: 'ats_json',
      sourceType: 'structured',
      full_name: cand.candidateName || null,
      emails: email ? [email] : [],
      phones: phone ? [phone] : [],
      experience: (cand.history || []).map(exp => ({
        company: exp.companyName || null,
        title: exp.roleTitle || null,
        start: exp.startDate || null,
        end: exp.endDate || null,
        summary: exp.description || null
      })),
      skills: (cand.skillsList || []).map(skillName => ({ name: skillName })),
      education: [],
      location: null,
      links: [],
      headline: cand.history?.[0]?.roleTitle ? `${cand.history[0].roleTitle} at ${cand.history[0].companyName}` : null
    };
  }).filter(r => r.emails.length > 0 || r.full_name);
}

/**
 * Parses GitHub JSON profile (simulated API response).
 * @param {Object} githubData 
 * @returns {Object}
 */
export function parseGitHubProfile(githubData) {
  if (!githubData || typeof githubData !== 'object') return null;

  const email = githubData.email || null;
  const username = githubData.login || '';
  const repos = githubData.repos || [];

  // Extract skills from repos and bio
  const skillsDetected = new Set();
  const skillKeywords = ['JavaScript', 'TypeScript', 'React', 'NodeJS', 'Python', 'Java', 'Rust', 'Go', 'CSS', 'HTML'];
  
  // Check bio
  if (githubData.bio) {
    skillKeywords.forEach(skill => {
      if (new RegExp(`\\b${skill}\\b`, 'i').test(githubData.bio)) {
        skillsDetected.add(skill);
      }
    });
  }

  // Check repo languages
  repos.forEach(repo => {
    if (repo.language) {
      skillsDetected.add(repo.language);
    }
  });

  return {
    source: 'github_profile',
    sourceType: 'unstructured',
    full_name: githubData.name || null,
    emails: email ? [email] : [],
    phones: [],
    experience: githubData.bio ? [{
      company: githubData.bio.match(/at\s+([A-Z][a-zA-Z]+)/)?.[1] || null,
      title: githubData.bio.match(/([A-Z][a-zA-Z\s]+)\s+at/)?.[1]?.trim() || null,
      start: null,
      end: null,
      summary: githubData.bio
    }] : [],
    skills: Array.from(skillsDetected).map(s => ({ name: s })),
    education: [],
    location: githubData.location || null,
    links: [
      { type: 'github', url: githubData.html_url || `https://github.com/${username}` },
      ...(githubData.blog ? [{ type: 'portfolio', url: githubData.blog }] : [])
    ],
    headline: githubData.bio || null
  };
}

/**
 * Parses Recruiter Free-Text Notes.
 * Uses regular expressions and keyword matching.
 * @param {string} text 
 * @returns {Object}
 */
export function parseRecruiterNotes(text) {
  if (!text) return null;

  // 1. Email extraction
  const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
  const emails = Array.from(text.matchAll(emailRegex)).map(m => m[1]);

  // 2. Phone extraction
  const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
  const phones = Array.from(text.matchAll(phoneRegex)).map(m => m[0]);

  // 3. Name extraction
  let full_name = null;
  const candidateMatch = text.match(/(?:Candidate|Name):\s*([^\r\n]+)/i);
  if (candidateMatch) {
    full_name = candidateMatch[1].trim();
  }

  // 4. Location extraction
  let location = null;
  const locationMatch = text.match(/Location:\s*([^\r\n]+)/i);
  if (locationMatch) {
    location = locationMatch[1].trim();
  } else {
    // Look for City, State patterns e.g. Seattle, WA or San Francisco, CA
    const locPattern = /([A-Z][a-zA-Z\s]+),\s*([A-Z]{2})/g;
    const match = locPattern.exec(text);
    if (match) {
      location = `${match[1]}, ${match[2]}`;
    }
  }

  // 5. Skills extraction
  const skillKeywords = [
    { canonical: 'JavaScript', keywords: ['js', 'javascript', 'vanilla js'] },
    { canonical: 'TypeScript', keywords: ['ts', 'typescript'] },
    { canonical: 'React', keywords: ['react', 'reactjs'] },
    { canonical: 'Node.js', keywords: ['node', 'nodejs'] },
    { canonical: 'Python', keywords: ['python', 'py'] },
    { canonical: 'SQL', keywords: ['sql', 'postgres', 'mysql'] },
    { canonical: 'Product Management', keywords: ['product management', 'product strategy', 'roadmap planning'] },
    { canonical: 'Agile Methodologies', keywords: ['agile', 'scrum'] }
  ];
  
  const skillsDetected = [];
  skillKeywords.forEach(skillDef => {
    for (const kw of skillDef.keywords) {
      const rx = new RegExp(`\\b${kw.replace('.', '\\.')}\\b`, 'i');
      if (rx.test(text)) {
        skillsDetected.push({ name: skillDef.canonical });
        break;
      }
    }
  });

  // 6. Experience extraction (heuristics)
  // Look for: from YYYY-MM to YYYY-MM at Company as Role
  // Or: spent X years (from YYYY to YYYY) at Company as Role
  const expMatch = Array.from(text.matchAll(/(?:from\s+)?(\d{4}(?:-\d{2})?)\s+to\s+(\d{4}(?:-\d{2})?)\s+at\s+([A-Z][a-zA-Z0-9\s]+)\s+as\s+(?:a\s+)?([A-Z][a-zA-Z\s]+)/gi));
  const experience = expMatch.map(m => ({
    company: m[3].trim(),
    title: m[4].trim(),
    start: m[1],
    end: m[2],
    summary: `Extracted from text: ${m[0]}`
  }));

  // Also catch current position heuristics
  const currentMatch = text.match(/(?:currently working at|PM currently working at)\s+([A-Z][a-zA-Z]+)/i);
  if (currentMatch && experience.length === 0) {
    experience.push({
      company: currentMatch[1],
      title: text.match(/([A-Z][a-zA-Z\s]+)\s+currently working/i)?.[1]?.trim() || 'Product Manager',
      start: null,
      end: null,
      summary: 'Current job noted in recruiter notes.'
    });
  } else if (currentMatch && experience.length > 0 && !experience.some(e => e.company.toLowerCase() === currentMatch[1].toLowerCase())) {
    experience.push({
      company: currentMatch[1],
      title: 'Product Manager',
      start: null,
      end: null,
      summary: 'Current job noted in recruiter notes.'
    });
  }

  // 7. Links extraction
  const linkRegex = /(https?:\/\/[^\s]+)/g;
  const links = Array.from(text.matchAll(linkRegex)).map(m => {
    const url = m[1];
    let type = 'other';
    if (url.includes('linkedin.com')) type = 'linkedin';
    else if (url.includes('github.com')) type = 'github';
    return { type, url };
  });

  return {
    source: 'recruiter_notes',
    sourceType: 'unstructured',
    full_name,
    emails,
    phones,
    experience,
    skills: skillsDetected,
    education: [],
    location,
    links,
    headline: text.match(/(?:sharp|talented)\s+([A-Z][a-zA-Z\s]+)\s+currently/i)?.[1] || null
  };
}
