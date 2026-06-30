// Pre-defined sample dataset

const MOCK_CSV = `name,email,phone,current_company,title
Alice Smith,alice.smith@example.com,+15550199,Google,Software Engineer
Bob Jones,bob.jones@example.com,555-0198,Microsoft,Senior Developer
Jane Doe,jane.doe@example.com,1234567890,Meta,Product Manager`;

const MOCK_ATS = `[
  {
    "candidateName": "Bob Jones",
    "contactInfo": {
      "emailAddress": "bob.jones@example.com",
      "mobileNumber": "+1 (555) 019-8111"
    },
    "history": [
      {
        "companyName": "Microsoft",
        "roleTitle": "Senior Software Engineer II",
        "startDate": "2022-01",
        "endDate": null,
        "description": "Led frontend architecture migrations."
      },
      {
        "companyName": "Amazon",
        "roleTitle": "Software Engineer",
        "startDate": "2019-06",
        "endDate": "2021-12",
        "description": "Worked on AWS DynamoDB console."
      }
    ],
    "skillsList": ["React", "TypeScript", "NodeJS", "AWS"]
  },
  {
    "candidateName": "Charlie Brown",
    "contactInfo": {
      "emailAddress": "charlie.brown@example.com",
      "mobileNumber": "555-987-6543"
    },
    "history": [
      {
        "companyName": "Netflix",
        "roleTitle": "Staff Engineer",
        "startDate": "2021-03",
        "endDate": null,
        "description": "High performance video rendering engines."
      }
    ],
    "skillsList": ["Java", "Rust", "Distributed Systems", "C++"]
  }
]`;

const MOCK_GITHUB = `{
  "login": "alicesmith",
  "name": "Alice M. Smith",
  "bio": "Frontend Engineer at Google. Passionate about React, CSS, and open-source. Coding in JavaScript and TypeScript.",
  "blog": "https://alice.dev",
  "location": "San Francisco, CA, USA",
  "email": "alice.smith@example.com",
  "html_url": "https://github.com/alicesmith",
  "public_repos": 42,
  "repos": [
    {
      "name": "react-perf-monitor",
      "language": "TypeScript",
      "stargazers_count": 120
    },
    {
      "name": "dotfiles",
      "language": "Shell",
      "stargazers_count": 5
    },
    {
      "name": "awesome-vanilla-js",
      "language": "JavaScript",
      "stargazers_count": 2300
    }
  ]
}`;

const MOCK_NOTES = `Recruiter Interview Notes
Candidate: Jane Doe
Email: jane.doe@example.com
Phone: +1 202 555 0143
Location: Seattle, WA

Jane is a sharp Product Manager currently working at Meta. She mentioned she has been there for about 2 years.
Previously, she spent 3 years (from 2018-01 to 2020-12) at Twitter as a Senior Product Analyst.
Her skills are highly aligned with product strategy, roadmap planning, SQL, and data analysis.
She also has some background in Python and Javascript, and is looking for a role in Seattle.
Profile Link: https://linkedin.com/in/janedoe-pm`;

const PRESET_CUSTOM = `{
  "fields": [
    {
      "path": "full_name",
      "type": "string",
      "required": true
    },
    {
      "path": "primary_email",
      "from": "emails[0]",
      "type": "string",
      "required": true
    },
    {
      "path": "phone",
      "from": "phones[0]",
      "type": "string",
      "normalize": "E164"
    },
    {
      "path": "skills",
      "from": "skills[*].name",
      "type": "string[]",
      "normalize": "canonical"
    }
  ],
  "include_confidence": true,
  "on_missing": "null"
}`;

const PRESET_MINIMAL = `{
  "fields": [
    {
      "path": "name",
      "from": "full_name",
      "type": "string",
      "required": true
    },
    {
      "path": "key_skills",
      "from": "skills[*].name",
      "type": "string[]"
    }
  ],
  "include_confidence": false,
  "on_missing": "omit"
}`;

// DOM Selection
const btnLoadSamples = document.getElementById('btn-load-samples');
const btnTransform = document.getElementById('btn-transform');
const spinner = document.getElementById('spinner');

const inputCsv = document.getElementById('input-csv');
const inputAts = document.getElementById('input-ats');
const inputGithub = document.getElementById('input-github');
const inputNotes = document.getElementById('input-notes');
const inputConfig = document.getElementById('input-config');

const presetCustom = document.getElementById('preset-custom');
const presetMinimal = document.getElementById('preset-minimal');

const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

const outputTabButtons = document.querySelectorAll('.output-tab-btn');
const outputTabContents = document.querySelectorAll('.output-tab-content');

const canonicalList = document.getElementById('canonical-list');
const projectedViewer = document.getElementById('projected-viewer');
const projectedCode = document.getElementById('projected-code');
const btnCopyProjected = document.getElementById('btn-copy-projected');

const validationLogs = document.getElementById('validation-logs');
const logsList = document.getElementById('logs-list');

// Setup Preset Configurations
inputConfig.value = PRESET_CUSTOM;

presetCustom.addEventListener('click', () => {
  presetCustom.classList.add('active');
  presetMinimal.classList.remove('active');
  inputConfig.value = PRESET_CUSTOM;
});

presetMinimal.addEventListener('click', () => {
  presetMinimal.classList.add('active');
  presetCustom.classList.remove('active');
  inputConfig.value = PRESET_MINIMAL;
});

// Tab Switching (Inputs)
tabButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    tabButtons.forEach(b => b.classList.remove('active'));
    tabContents.forEach(c => c.classList.remove('active'));

    btn.classList.add('active');
    const sourceId = btn.getAttribute('data-source');
    document.getElementById(`content-${sourceId}`).classList.add('active');
  });
});

// Tab Switching (Outputs)
outputTabButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    outputTabButtons.forEach(b => b.classList.remove('active'));
    outputTabContents.forEach(c => c.classList.remove('active'));

    btn.classList.add('active');
    const outputId = btn.getAttribute('data-output');
    document.getElementById(`output-${outputId}`).classList.add('active');
  });
});

// Load Sample Data
btnLoadSamples.addEventListener('click', () => {
  inputCsv.value = MOCK_CSV;
  inputAts.value = MOCK_ATS;
  inputGithub.value = MOCK_GITHUB;
  inputNotes.value = MOCK_NOTES;
  
  // Flash visual indicator
  [inputCsv, inputAts, inputGithub, inputNotes].forEach(el => {
    el.style.borderColor = 'var(--accent-cyan)';
    setTimeout(() => { el.style.borderColor = ''; }, 600);
  });
});

// Copy Output JSON
btnCopyProjected.addEventListener('click', () => {
  navigator.clipboard.writeText(projectedCode.textContent).then(() => {
    btnCopyProjected.textContent = 'Copied!';
    setTimeout(() => { btnCopyProjected.textContent = 'Copy JSON'; }, 1500);
  });
});

// Render Canonical Profiles to Web interface
function renderCanonicalProfiles(profiles) {
  if (!profiles || profiles.length === 0) {
    canonicalList.innerHTML = `<div class="empty-state"><p>No candidates merged.</p></div>`;
    return;
  }

  canonicalList.innerHTML = '';
  canonicalList.classList.remove('hidden');

  profiles.forEach(profile => {
    const card = document.createElement('div');
    card.className = 'profile-card';

    // Confidence Level Formatting
    const confVal = Math.round(profile.overall_confidence * 100);
    const confClass = profile.overall_confidence >= 0.8 ? 'confidence-green' : 'confidence-yellow';

    // Skills HTML
    const skillsHtml = (profile.skills || []).map(s => `
      <span class="skill-tag">
        ${s.name}
        <span class="skill-conf">${Math.round(s.confidence * 100)}%</span>
      </span>
    `).join('');

    // Experience HTML
    const expHtml = (profile.experience || []).map(exp => `
      <div class="exp-item">
        <div class="exp-item-header">
          <span><strong>${exp.title || 'Specialist'}</strong> at ${exp.company}</span>
          <span class="exp-dates">${exp.start || 'Unknown'} to ${exp.end || 'Present'}</span>
        </div>
        ${exp.summary ? `<p class="exp-summary">${exp.summary}</p>` : ''}
      </div>
    `).join('');

    // Location Formatting
    const locStr = profile.location 
      ? `${profile.location.city || ''}${profile.location.region ? `, ${profile.location.region}` : ''} (${profile.location.country})`
      : 'Not Specified';

    // Provenance List HTML
    const provHtml = (profile.provenance || []).map(p => `
      <li class="prov-item">Field <span>${p.field}</span> loaded from <span>${p.source}</span> using <span>${p.method}</span></li>
    `).join('');

    const randomId = Math.random().toString(36).substring(2, 7);

    card.innerHTML = `
      <div class="profile-header">
        <div class="profile-title-block">
          <h3>${profile.full_name}</h3>
          <p class="profile-headline">${profile.headline || 'Talent Professional'}</p>
        </div>
        <div class="confidence-container">
          <span class="confidence-label">Match Confidence: ${confVal}%</span>
          <div class="confidence-bar-outer">
            <div class="confidence-bar-inner ${confClass}" style="width: ${confVal}%"></div>
          </div>
        </div>
      </div>

      <div class="profile-meta-grid">
        <div class="meta-item">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          <span><strong>Email:</strong> ${profile.emails.join(', ') || 'N/A'}</span>
        </div>
        <div class="meta-item">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
          <span><strong>Phone:</strong> ${profile.phones.join(', ') || 'N/A'}</span>
        </div>
        <div class="meta-item">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="12" r="3"/></svg>
          <span><strong>Location:</strong> ${locStr}</span>
        </div>
        <div class="meta-item">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          <span><strong>Exp:</strong> ${profile.years_experience} Years</span>
        </div>
      </div>

      <div class="skills-block">
        <h4 class="skills-title">Skills & Confidence</h4>
        <div class="skills-cloud">
          ${skillsHtml || '<span class="text-muted" style="font-size:0.75rem">No skills parsed.</span>'}
        </div>
      </div>

      <div class="experience-block">
        <h4 class="exp-title">Employment History</h4>
        <div class="exp-list">
          ${expHtml || '<span class="text-muted" style="font-size:0.75rem">No experience found.</span>'}
        </div>
      </div>

      <div class="provenance-block">
        <button class="prov-toggle" onclick="document.getElementById('prov-list-${randomId}').classList.toggle('hidden')">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
          Toggle Source Provenance Data
        </button>
        <ul id="prov-list-${randomId}" class="prov-list hidden">
          ${provHtml}
        </ul>
      </div>
    `;

    canonicalList.appendChild(card);
  });
}

// Pipeline Steps Animation Orchestration
function animatePipelineSteps(callback) {
  const steps = ['ingest', 'normalize', 'merge', 'project', 'validate'];
  
  // Clear all previous classes
  steps.forEach(s => {
    const el = document.getElementById(`step-${s}`);
    el.classList.remove('active', 'success');
    el.querySelector('.step-status').textContent = 'Pending execution';
  });

  let index = 0;
  
  function runStep() {
    if (index > 0) {
      const prevEl = document.getElementById(`step-${steps[index - 1]}`);
      prevEl.classList.remove('active');
      prevEl.classList.add('success');
      prevEl.querySelector('.step-status').textContent = 'Completed';
    }

    if (index < steps.length) {
      const currentEl = document.getElementById(`step-${steps[index]}`);
      currentEl.classList.add('active');
      currentEl.querySelector('.step-status').textContent = 'Processing...';
      index++;
      setTimeout(runStep, 350); // Speed of animation steps
    } else {
      callback();
    }
  }

  runStep();
}

// Trigger Pipeline execution
btnTransform.addEventListener('click', () => {
  const inputs = [];
  
  if (inputCsv.value.trim()) {
    inputs.push({ name: 'recruiter_export.csv', type: 'csv', content: inputCsv.value });
  }
  if (inputAts.value.trim()) {
    inputs.push({ name: 'ats_profile.json', type: 'ats_json', content: inputAts.value });
  }
  if (inputGithub.value.trim()) {
    inputs.push({ name: 'github_profile.json', type: 'github', content: inputGithub.value });
  }
  if (inputNotes.value.trim()) {
    inputs.push({ name: 'recruiter_notes.txt', type: 'notes', content: inputNotes.value });
  }

  if (inputs.length === 0) {
    alert('Please enter or load some input candidate data first.');
    return;
  }

  let config = null;
  if (inputConfig.value.trim()) {
    try {
      config = JSON.parse(inputConfig.value);
    } catch (e) {
      alert('Error parsing custom config JSON: ' + e.message);
      return;
    }
  }

  btnTransform.disabled = true;
  spinner.classList.remove('hidden');

  animatePipelineSteps(async () => {
    try {
      // Query server execution API (avoids client-side file CORS/404 issues!)
      const response = await fetch('/api/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ inputs, config })
      });

      if (!response.ok) {
        throw new Error(`Server returned status code ${response.status}`);
      }

      const result = await response.json();

      // 1. Render Canonical
      document.querySelector('#output-canonical .empty-state').classList.add('hidden');
      renderCanonicalProfiles(result.canonical);

      // 2. Render Projected JSON
      if (result.projected) {
        document.querySelector('#output-projected .empty-state').classList.add('hidden');
        projectedViewer.classList.remove('hidden');
        projectedCode.textContent = JSON.stringify(result.projected, null, 2);
      } else {
        document.querySelector('#output-projected .empty-state').classList.remove('hidden');
        projectedViewer.classList.add('hidden');
      }

      // 3. Render Logs / Errors
      if (result.errors && result.errors.length > 0) {
        validationLogs.classList.remove('hidden');
        logsList.innerHTML = result.errors.map(err => `<li>${err}</li>`).join('');
      } else {
        validationLogs.classList.add('hidden');
      }

      // Switch view tab automatically to canonical profiles
      outputTabButtons[0].click();

    } catch (err) {
      console.error(err);
      alert('Pipeline execution failed: ' + err.message + '\nEnsure the server is running ("node src/server.js").');
    } finally {
      btnTransform.disabled = false;
      spinner.classList.add('hidden');
    }
  });
});
