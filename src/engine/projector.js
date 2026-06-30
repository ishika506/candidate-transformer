import { normalizePhone, normalizeSkill } from './normalizer.js';

/**
 * Resolves a deep path or expression from an object.
 * Supports:
 * - Simple keys: "full_name"
 * - Array indices: "emails[0]"
 * - Array projections: "skills[*].name"
 * - Nested properties: "location.city"
 * @param {Object} obj 
 * @param {string} path 
 * @returns {*}
 */
export function getValueByPath(obj, path) {
  if (!obj || !path) return undefined;

  // Handle skills[*].name
  if (path.includes('[*]')) {
    const [arrayKey, rest] = path.split('[*]');
    const arr = obj[arrayKey];
    if (!Array.isArray(arr)) return [];
    
    const propPath = rest.startsWith('.') ? rest.substring(1) : rest;
    
    // Map array and extract property
    return arr.map(item => {
      if (propPath === '') return item;
      return getValueByPath(item, propPath);
    }).filter(val => val !== undefined && val !== null);
  }

  // Handle array index at the root of path segment, e.g. emails[0]
  const rootIndexMatch = path.match(/^([^\[]+)\[(\d+)\]$/);
  if (rootIndexMatch) {
    const key = rootIndexMatch[1];
    const index = parseInt(rootIndexMatch[2], 10);
    const arr = obj[key];
    return Array.isArray(arr) ? arr[index] : undefined;
  }

  // Handle nested dot notation e.g. location.city or contact.phones[0]
  if (path.includes('.')) {
    const parts = path.split('.');
    let current = obj;
    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      
      const partIdxMatch = part.match(/^([^\[]+)\[(\d+)\]$/);
      if (partIdxMatch) {
        const key = partIdxMatch[1];
        const index = parseInt(partIdxMatch[2], 10);
        const arr = current[key];
        current = Array.isArray(arr) ? arr[index] : undefined;
      } else {
        current = current[part];
      }
    }
    return current;
  }

  return obj[path];
}

/**
 * Sets a value in an object at a deep path (creating sub-objects if necessary).
 * @param {Object} obj 
 * @param {string} path 
 * @param {*} value 
 */
function setValueByPath(obj, path, value) {
  const parts = path.split('.');
  let current = obj;
  
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!current[part] || typeof current[part] !== 'object') {
      current[part] = {};
    }
    current = current[part];
  }
  
  current[parts[parts.length - 1]] = value;
}

/**
 * Projects a canonical candidate profile into a custom schema shape based on config.
 * @param {Object} canonicalProfile 
 * @param {Object} config 
 * @returns {Object} Projected Profile
 */
export function projectProfile(canonicalProfile, config) {
  if (!canonicalProfile) return null;
  
  // Default config values
  const fields = config.fields || [];
  const includeConfidence = config.include_confidence !== false; // default true if not specified
  const includeProvenance = config.include_provenance === true; // default false
  const onMissing = config.on_missing || 'null'; // 'null', 'omit', 'error'
  
  const projected = {};

  fields.forEach(fieldDef => {
    const targetPath = fieldDef.path;
    const sourcePath = fieldDef.from || targetPath;
    
    let value = getValueByPath(canonicalProfile, sourcePath);
    
    // Check if value is missing
    const isMissing = value === undefined || value === null || (Array.isArray(value) && value.length === 0);
    
    if (isMissing) {
      if (fieldDef.required) {
        if (onMissing === 'error') {
          throw new Error(`Required field is missing: "${targetPath}" (from "${sourcePath}")`);
        } else if (onMissing === 'omit') {
          return; // skip setting this key
        } else {
          // 'null'
          setValueByPath(projected, targetPath, null);
          return;
        }
      } else {
        // Optional missing values
        if (onMissing === 'omit') return;
        setValueByPath(projected, targetPath, null);
        return;
      }
    }

    // Apply normalization if requested
    if (fieldDef.normalize === 'E164') {
      if (Array.isArray(value)) {
        value = value.map(normalizePhone).filter(Boolean);
      } else {
        value = normalizePhone(value);
      }
    } else if (fieldDef.normalize === 'canonical') {
      if (Array.isArray(value)) {
        value = value.map(normalizeSkill).filter(Boolean);
      } else {
        value = normalizeSkill(value);
      }
    }

    setValueByPath(projected, targetPath, value);
  });

  // Include overall confidence if toggled
  if (includeConfidence && canonicalProfile.overall_confidence !== undefined) {
    projected.overall_confidence = canonicalProfile.overall_confidence;
  }

  // Include provenance if toggled
  if (includeProvenance && canonicalProfile.provenance !== undefined) {
    projected.provenance = canonicalProfile.provenance;
  }

  return projected;
}
