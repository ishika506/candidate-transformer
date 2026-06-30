import { normalizePhone, normalizeDate, normalizeLocation, normalizeSkill } from './normalizer.js';

const SOURCE_RELIABILITY = {
  ats_json: 0.95,
  recruiter_csv: 0.85,
  github_profile: 0.75,
  recruiter_notes: 0.60
};

/**
 * Deterministically generates a candidate ID from email.
 * @param {string} email 
 * @returns {string}
 */
function generateCandidateId(email) {
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    const char = email.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  const cleanEmail = email.replace(/[^a-zA-Z0-9]/g, '').substring(0, 8);
  return `cand_${cleanEmail}_${Math.abs(hash).toString(36)}`;
}

/**
 * Calculates years of experience based on history items.
 * Accounts for overlapping dates.
 * @param {Array<Object>} experienceList 
 * @returns {number}
 */
function calculateYearsExperience(experienceList) {
  if (!experienceList || experienceList.length === 0) return 0;

  // Convert dates to timestamps to find intervals
  const intervals = [];
  const currentDate = new Date(2026, 5); // June 2026 (based on local time metadata)

  experienceList.forEach(exp => {
    let start = exp.start ? new Date(exp.start) : null;
    let end = exp.end ? new Date(exp.end) : currentDate;

    if (!start && exp.end) {
      // If start is missing but we have end, assume 1 year duration
      start = new Date(new Date(exp.end).getFullYear() - 1, new Date(exp.end).getMonth());
    }

    if (start && end && !isNaN(start.getTime()) && !isNaN(end.getTime())) {
      intervals.push({ start: start.getTime(), end: end.getTime() });
    }
  });

  if (intervals.length === 0) return 0;

  // Sort intervals by start time
  intervals.sort((a, b) => a.start - b.start);

  // Merge overlapping intervals
  const mergedIntervals = [intervals[0]];
  for (let i = 1; i < intervals.length; i++) {
    const last = mergedIntervals[mergedIntervals.length - 1];
    const current = intervals[i];

    if (current.start <= last.end) {
      // Overlap: extend end if current end is further
      last.end = Math.max(last.end, current.end);
    } else {
      mergedIntervals.push(current);
    }
  }

  // Calculate total duration in years
  let totalMs = 0;
  mergedIntervals.forEach(interval => {
    totalMs += (interval.end - interval.start);
  });

  const msPerYear = 365.25 * 24 * 60 * 60 * 1000;
  return parseFloat((totalMs / msPerYear).toFixed(1));
}

/**
 * Merges a list of raw records for the same candidate.
 * @param {Array<Object>} records 
 * @returns {Object} Canonical Candidate Profile
 */
function resolveCandidate(records) {
  if (records.length === 0) return null;

  // Sort records by source reliability descending to easily pick winners
  const sortedRecords = [...records].sort((a, b) => {
    const relA = SOURCE_RELIABILITY[a.source] || 0.50;
    const relB = SOURCE_RELIABILITY[b.source] || 0.50;
    return relB - relA;
  });

  const primaryRecord = sortedRecords[0];
  const primaryEmail = primaryRecord.emails[0] || 'unknown@example.com';
  const candidate_id = generateCandidateId(primaryEmail);

  // Initialize fields
  let full_name = null;
  const emailsSet = new Set();
  const phonesSet = new Set();
  let location = null;
  const linksMap = new Map(); // url -> link object
  let headline = null;
  const rawSkillsMap = new Map(); // canonicalSkillName -> { confidenceScoreParts: [], sources: Set }
  const rawExperiences = [];
  const rawEducations = [];
  const provenance = [];

  // Track sources of each value for provenance
  const fieldProvenance = {};

  sortedRecords.forEach(record => {
    const reliability = SOURCE_RELIABILITY[record.source] || 0.50;
    const method = record.sourceType === 'structured' ? 'direct_mapping' : 'heuristic_extraction';

    // 1. Full name
    if (record.full_name && !full_name) {
      full_name = record.full_name;
      fieldProvenance['full_name'] = { source: record.source, method };
    }

    // 2. Emails & Phones
    (record.emails || []).forEach(e => {
      if (e) {
        const norm = e.trim().toLowerCase();
        if (!emailsSet.has(norm)) {
          emailsSet.add(norm);
          provenance.push({ field: 'emails', source: record.source, method });
        }
      }
    });

    (record.phones || []).forEach(p => {
      if (p) {
        const norm = normalizePhone(p);
        if (norm && !phonesSet.has(norm)) {
          phonesSet.add(norm);
          provenance.push({ field: 'phones', source: record.source, method });
        }
      }
    });

    // 3. Location
    if (record.location && !location) {
      location = normalizeLocation(record.location);
      fieldProvenance['location'] = { source: record.source, method };
    }

    // 4. Links
    (record.links || []).forEach(link => {
      if (link.url && !linksMap.has(link.url)) {
        linksMap.set(link.url, link);
        provenance.push({ field: 'links', source: record.source, method });
      }
    });

    // 5. Headline
    if (record.headline && !headline) {
      headline = record.headline;
      fieldProvenance['headline'] = { source: record.source, method };
    }

    // 6. Skills
    (record.skills || []).forEach(skill => {
      if (skill.name) {
        const canonical = normalizeSkill(skill.name);
        if (!rawSkillsMap.has(canonical)) {
          rawSkillsMap.set(canonical, { reliabilities: [], sources: new Set() });
        }
        const data = rawSkillsMap.get(canonical);
        data.reliabilities.push(reliability);
        data.sources.add(record.source);
      }
    });

    // 7. Experience
    (record.experience || []).forEach(exp => {
      if (exp.company) {
        rawExperiences.push({
          company: exp.company,
          title: exp.title,
          start: normalizeDate(exp.start),
          end: normalizeDate(exp.end),
          summary: exp.summary,
          source: record.source
        });
      }
    });

    // 8. Education
    (record.education || []).forEach(edu => {
      if (edu.institution) {
        rawEducations.push({
          institution: edu.institution,
          degree: edu.degree,
          field: edu.field,
          end_year: edu.end_year ? parseInt(edu.end_year, 10) : null,
          source: record.source
        });
      }
    });
  });

  // Finalize full name and headline fallback if still empty
  if (!full_name) {
    full_name = 'Unknown Candidate';
    fieldProvenance['full_name'] = { source: 'system', method: 'default_fallback' };
  }

  // Populate single value provenance
  Object.keys(fieldProvenance).forEach(field => {
    provenance.push({
      field,
      source: fieldProvenance[field].source,
      method: fieldProvenance[field].method
    });
  });

  // Resolve skills confidence and sources
  const skills = Array.from(rawSkillsMap.entries()).map(([name, data]) => {
    // Probabilistic union: 1 - product(1 - R_i)
    let productOfComplements = 1;
    data.reliabilities.forEach(rel => {
      productOfComplements *= (1 - rel);
    });
    const confidence = parseFloat((1 - productOfComplements).toFixed(2));
    return {
      name,
      confidence,
      sources: Array.from(data.sources)
    };
  }).sort((a, b) => b.confidence - a.confidence);

  // Merge experience list (deduplicate overlapping jobs at same company)
  const experienceMerged = [];
  rawExperiences.forEach(exp => {
    const existing = experienceMerged.find(e => 
      e.company.toLowerCase() === exp.company.toLowerCase() && 
      (e.title || '').toLowerCase() === (exp.title || '').toLowerCase()
    );

    if (existing) {
      // Keep dates if they are better/more complete
      if (!existing.start && exp.start) existing.start = exp.start;
      if (!existing.end && exp.end) existing.end = exp.end;
      if ((existing.summary || '').length < (exp.summary || '').length) {
        existing.summary = exp.summary;
      }
    } else {
      experienceMerged.push({
        company: exp.company,
        title: exp.title,
        start: exp.start,
        end: exp.end,
        summary: exp.summary
      });
    }
  });

  // Sort experience by start date descending
  experienceMerged.sort((a, b) => {
    if (!a.start) return 1;
    if (!b.start) return -1;
    return b.start.localeCompare(a.start);
  });

  // Calculate years of experience
  const years_experience = calculateYearsExperience(experienceMerged);

  // Education deduplication
  const educationMerged = [];
  rawEducations.forEach(edu => {
    const existing = educationMerged.find(e => 
      e.institution.toLowerCase() === edu.institution.toLowerCase() &&
      (e.degree || '').toLowerCase() === (edu.degree || '').toLowerCase()
    );
    if (!existing) {
      educationMerged.push({
        institution: edu.institution,
        degree: edu.degree,
        field: edu.field,
        end_year: edu.end_year
      });
    }
  });

  // Calculate overall confidence score
  // Simple formula: weighted average of confidence in key fields
  // name (1.0 weight), emails (1.0 weight), phone (1.0 if exists, else 0.5),
  // skills (avg of top 3 skills, else 0.5), experience (0.9 if experience list not empty, else 0.4)
  const nameConf = SOURCE_RELIABILITY[fieldProvenance['full_name']?.source] || 0.5;
  const emailConf = sortedRecords.some(r => r.emails.length > 0) ? 0.95 : 0.2;
  const phoneConf = phonesSet.size > 0 ? 0.9 : 0.5;
  
  let skillsConf = 0.5;
  if (skills.length > 0) {
    const topSkills = skills.slice(0, 3);
    const sum = topSkills.reduce((acc, s) => acc + s.confidence, 0);
    skillsConf = sum / topSkills.length;
  }

  const expConf = experienceMerged.length > 0 ? 0.9 : 0.4;
  const overall_confidence = parseFloat(((nameConf + emailConf + phoneConf + skillsConf + expConf) / 5).toFixed(2));

  return {
    candidate_id,
    full_name,
    emails: Array.from(emailsSet),
    phones: Array.from(phonesSet),
    location,
    links: Array.from(linksMap.values()),
    headline,
    years_experience,
    skills,
    experience: experienceMerged,
    education: educationMerged,
    provenance,
    overall_confidence
  };
}

/**
 * Ingests intermediate records, groups them by candidate identity, and merges them.
 * Identity matching is done via emails (primary) and name + phone (secondary).
 * @param {Array<Object>} rawRecords 
 * @returns {Array<Object>}
 */
export function mergeCandidates(rawRecords) {
  const groups = [];

  rawRecords.forEach(record => {
    if (!record) return;
    
    // Find matching group
    let matchedGroupIdx = -1;
    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      
      // Email match
      const emailMatch = record.emails.some(email => 
        group.some(r => r.emails.some(ge => ge.toLowerCase() === email.toLowerCase()))
      );

      // Phone match (fallback)
      const phoneMatch = record.phones.length > 0 && record.phones.some(phone => {
        const normPhone = normalizePhone(phone);
        return normPhone && group.some(r => r.phones.some(gp => normalizePhone(gp) === normPhone));
      });

      // Name match with identical title/company (fallback for cases where emails/phones are missing)
      const nameMatch = record.full_name && group.some(r => 
        r.full_name && r.full_name.toLowerCase() === record.full_name.toLowerCase()
      );

      if (emailMatch || phoneMatch || (nameMatch && (emailMatch || phoneMatch || groups.length === 0))) {
        matchedGroupIdx = i;
        break;
      }
    }

    if (matchedGroupIdx !== -1) {
      groups[matchedGroupIdx].push(record);
    } else {
      groups.push([record]);
    }
  });

  return groups.map(group => resolveCandidate(group));
}
