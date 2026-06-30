import { parseRecruiterCSV, parseATSJson, parseGitHubProfile, parseRecruiterNotes } from './parser.js';
import { mergeCandidates } from './merger.js';
import { projectProfile } from './projector.js';
import { validateCanonicalProfile, validateProjectedProfile } from './validator.js';

/**
 * Runs the Multi-Source Candidate Data Transformer pipeline on multiple inputs.
 * @param {Array<Object>} inputs Array of { name, type, content }
 * @param {Object} [customConfig] Optional custom projection configuration
 * @returns {Object} { canonical: Array, projected: Array, errors: Array }
 */
export function runPipeline(inputs, customConfig = null) {
  const intermediateRecords = [];
  const pipelineErrors = [];

  // 1. Ingestion & Parsing
  inputs.forEach(input => {
    try {
      const name = input.name || '';
      const content = input.content;

      if (!content) {
        pipelineErrors.push(`Input "${name}" is empty, skipping.`);
        return;
      }

      if (name.endsWith('.csv') || input.type === 'csv') {
        const text = typeof content === 'string' ? content : String(content);
        const parsed = parseRecruiterCSV(text);
        intermediateRecords.push(...parsed);
      } else if (name.endsWith('ats_profile.json') || input.type === 'ats_json') {
        const data = typeof content === 'string' ? JSON.parse(content) : content;
        const parsed = parseATSJson(data);
        intermediateRecords.push(...parsed);
      } else if (name.endsWith('github_profile.json') || input.type === 'github') {
        const data = typeof content === 'string' ? JSON.parse(content) : content;
        const parsed = parseGitHubProfile(data);
        if (parsed) intermediateRecords.push(parsed);
      } else if (name.endsWith('.txt') || input.type === 'notes') {
        const text = typeof content === 'string' ? content : String(content);
        const parsed = parseRecruiterNotes(text);
        if (parsed) intermediateRecords.push(parsed);
      } else {
        // Fallback guess: if string, treat as notes, if object, check fields
        if (typeof content === 'string') {
          if (content.startsWith('name,email')) {
            intermediateRecords.push(...parseRecruiterCSV(content));
          } else {
            const parsed = parseRecruiterNotes(content);
            if (parsed) intermediateRecords.push(parsed);
          }
        } else if (typeof content === 'object') {
          if (Array.isArray(content)) {
            intermediateRecords.push(...parseATSJson(content));
          } else {
            const parsed = parseGitHubProfile(content);
            if (parsed) intermediateRecords.push(parsed);
          }
        }
      }
    } catch (err) {
      pipelineErrors.push(`Error parsing input "${input.name}": ${err.message}`);
    }
  });

  // 2. Merging & Conflict Resolution
  let canonicalProfiles = [];
  try {
    canonicalProfiles = mergeCandidates(intermediateRecords);
  } catch (err) {
    pipelineErrors.push(`Error merging candidates: ${err.message}`);
    return { canonical: [], projected: [], errors: pipelineErrors };
  }

  // 3. Validation & Projection
  const finalCanonical = [];
  const finalProjected = [];

  canonicalProfiles.forEach((profile, index) => {
    // Validate canonical
    const canonicalVal = validateCanonicalProfile(profile);
    if (!canonicalVal.valid) {
      pipelineErrors.push(`Canonical Profile [${index}] (${profile.full_name}) failed validation: ${canonicalVal.errors.join(', ')}`);
    }
    finalCanonical.push(profile);

    // Project if custom configuration provided
    if (customConfig) {
      try {
        const projected = projectProfile(profile, customConfig);
        
        // Validate projected
        const projectedVal = validateProjectedProfile(projected, customConfig);
        if (!projectedVal.valid) {
          pipelineErrors.push(`Projected Profile [${index}] failed validation: ${projectedVal.errors.join(', ')}`);
        }
        
        finalProjected.push(projected);
      } catch (err) {
        pipelineErrors.push(`Error projecting candidate "${profile.full_name}": ${err.message}`);
      }
    }
  });

  return {
    canonical: finalCanonical,
    projected: customConfig ? finalProjected : null,
    errors: pipelineErrors
  };
}
