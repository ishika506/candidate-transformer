/**
 * Validator module for validating candidate profiles against both the default canonical schema
 * and custom runtime config schemas.
 */

/**
 * Validates a profile against the default canonical schema.
 * @param {Object} profile 
 * @returns {{valid: boolean, errors: string[]}}
 */
export function validateCanonicalProfile(profile) {
  const errors = [];

  if (!profile || typeof profile !== 'object') {
    return { valid: false, errors: ['Profile is not an object or is empty'] };
  }

  // Helper validation functions
  const isString = (val) => typeof val === 'string';
  const isNumber = (val) => typeof val === 'number' && !isNaN(val);
  const isArray = (val) => Array.isArray(val);
  
  // Required fields
  if (!isString(profile.candidate_id)) errors.push('candidate_id must be a string');
  if (!isString(profile.full_name)) errors.push('full_name must be a string');
  if (!isNumber(profile.overall_confidence)) errors.push('overall_confidence must be a number');

  // emails (string[])
  if (!isArray(profile.emails) || !profile.emails.every(isString)) {
    errors.push('emails must be an array of strings');
  }

  // phones (string[])
  if (!isArray(profile.phones) || !profile.phones.every(isString)) {
    errors.push('phones must be an array of strings');
  }

  // location ({ city, region, country })
  if (profile.location !== null && profile.location !== undefined) {
    if (typeof profile.location !== 'object') {
      errors.push('location must be an object or null');
    } else {
      const { city, region, country } = profile.location;
      if (city !== null && !isString(city)) errors.push('location.city must be a string or null');
      if (region !== null && !isString(region)) errors.push('location.region must be a string or null');
      if (country !== null && !isString(country)) errors.push('location.country must be a string or null');
    }
  }

  // links ({ type, url }[])
  if (!isArray(profile.links)) {
    errors.push('links must be an array');
  } else {
    profile.links.forEach((link, idx) => {
      if (typeof link !== 'object' || !isString(link.type) || !isString(link.url)) {
        errors.push(`links[${idx}] must be an object with string fields "type" and "url"`);
      }
    });
  }

  // headline (string | null)
  if (profile.headline !== null && profile.headline !== undefined && !isString(profile.headline)) {
    errors.push('headline must be a string or null');
  }

  // years_experience (number | null)
  if (profile.years_experience !== null && profile.years_experience !== undefined && !isNumber(profile.years_experience)) {
    errors.push('years_experience must be a number or null');
  }

  // skills ({ name, confidence, sources }[])
  if (!isArray(profile.skills)) {
    errors.push('skills must be an array');
  } else {
    profile.skills.forEach((skill, idx) => {
      if (typeof skill !== 'object') {
        errors.push(`skills[${idx}] must be an object`);
      } else {
        if (!isString(skill.name)) errors.push(`skills[${idx}].name must be a string`);
        if (!isNumber(skill.confidence)) errors.push(`skills[${idx}].confidence must be a number`);
        if (!isArray(skill.sources) || !skill.sources.every(isString)) {
          errors.push(`skills[${idx}].sources must be an array of strings`);
        }
      }
    });
  }

  // experience ({ company, title, start, end, summary }[])
  if (!isArray(profile.experience)) {
    errors.push('experience must be an array');
  } else {
    profile.experience.forEach((exp, idx) => {
      if (typeof exp !== 'object') {
        errors.push(`experience[${idx}] must be an object`);
      } else {
        if (!isString(exp.company)) errors.push(`experience[${idx}].company must be a string`);
        if (exp.title !== null && exp.title !== undefined && !isString(exp.title)) {
          errors.push(`experience[${idx}].title must be a string or null`);
        }
        if (exp.start !== null && exp.start !== undefined && !isString(exp.start)) {
          errors.push(`experience[${idx}].start must be a YYYY-MM string or null`);
        }
        if (exp.end !== null && exp.end !== undefined && !isString(exp.end)) {
          errors.push(`experience[${idx}].end must be a YYYY-MM string or null`);
        }
        if (exp.summary !== null && exp.summary !== undefined && !isString(exp.summary)) {
          errors.push(`experience[${idx}].summary must be a string or null`);
        }
      }
    });
  }

  // education ({ institution, degree, field, end_year }[])
  if (!isArray(profile.education)) {
    errors.push('education must be an array');
  } else {
    profile.education.forEach((edu, idx) => {
      if (typeof edu !== 'object') {
        errors.push(`education[${idx}] must be an object`);
      } else {
        if (!isString(edu.institution)) errors.push(`education[${idx}].institution must be a string`);
        if (edu.degree !== null && edu.degree !== undefined && !isString(edu.degree)) {
          errors.push(`education[${idx}].degree must be a string or null`);
        }
        if (edu.field !== null && edu.field !== undefined && !isString(edu.field)) {
          errors.push(`education[${idx}].field must be a string or null`);
        }
        if (edu.end_year !== null && edu.end_year !== undefined && !isNumber(edu.end_year)) {
          errors.push(`education[${idx}].end_year must be a number or null`);
        }
      }
    });
  }

  // provenance ({ field, source, method }[])
  if (!isArray(profile.provenance)) {
    errors.push('provenance must be an array');
  } else {
    profile.provenance.forEach((prov, idx) => {
      if (typeof prov !== 'object' || !isString(prov.field) || !isString(prov.source) || !isString(prov.method)) {
        errors.push(`provenance[${idx}] must be an object with string fields "field", "source", and "method"`);
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates a projected profile against a custom configuration schema.
 * @param {Object} projectedProfile 
 * @param {Object} config 
 * @returns {{valid: boolean, errors: string[]}}
 */
export function validateProjectedProfile(projectedProfile, config) {
  const errors = [];
  
  if (!projectedProfile || typeof projectedProfile !== 'object') {
    return { valid: false, errors: ['Projected profile is empty or invalid'] };
  }

  const fields = config.fields || [];

  fields.forEach(fieldDef => {
    const path = fieldDef.path;
    // For nested fields, traverse the projected object to find it
    const parts = path.split('.');
    let val = projectedProfile;
    for (const part of parts) {
      if (val === null || val === undefined) {
        val = undefined;
        break;
      }
      val = val[part];
    }

    // Check required
    if (fieldDef.required && (val === undefined || val === null || (Array.isArray(val) && val.length === 0))) {
      errors.push(`Required field "${path}" is missing or empty`);
      return;
    }

    if (val === undefined || val === null) return; // Optional missing is ok

    // Check type
    if (fieldDef.type === 'string' && typeof val !== 'string') {
      errors.push(`Field "${path}" must be a string, got ${typeof val}`);
    } else if (fieldDef.type === 'string[]') {
      if (!Array.isArray(val) || !val.every(v => typeof v === 'string')) {
        errors.push(`Field "${path}" must be an array of strings`);
      }
    } else if (fieldDef.type === 'number' && typeof val !== 'number') {
      errors.push(`Field "${path}" must be a number, got ${typeof val}`);
    } else if (fieldDef.type === 'boolean' && typeof val !== 'boolean') {
      errors.push(`Field "${path}" must be a boolean, got ${typeof val}`);
    }
  });

  return {
    valid: errors.length === 0,
    errors
  };
}
