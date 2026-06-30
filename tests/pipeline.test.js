import test from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { parseRecruiterCSV, parseATSJson, parseGitHubProfile, parseRecruiterNotes } from '../src/engine/parser.js';
import { normalizePhone, normalizeDate, normalizeLocation, normalizeSkill } from '../src/engine/normalizer.js';
import { runPipeline } from '../src/engine/index.js';

test('Normalizer Tests', async (t) => {
  await t.test('Phone normalization to E.164', () => {
    assert.strictEqual(normalizePhone('(555) 019-8111'), '+15550198111');
    assert.strictEqual(normalizePhone('555-987-6543'), '+15559876543');
    assert.strictEqual(normalizePhone('+441234567890'), '+441234567890');
    assert.strictEqual(normalizePhone('1234567890'), '+11234567890');
  });

  await t.test('Date normalization to YYYY-MM', () => {
    assert.strictEqual(normalizeDate('2021-03'), '2021-03');
    assert.strictEqual(normalizeDate('2018'), '2018-01');
    assert.strictEqual(normalizeDate('January 2018'), '2018-01');
    assert.strictEqual(normalizeDate('Jan 2018'), '2018-01');
    assert.strictEqual(normalizeDate('present'), null);
  });

  await t.test('Location mapping to city, region, ISO country', () => {
    assert.deepStrictEqual(normalizeLocation('Seattle, WA'), { city: 'Seattle', region: 'WA', country: 'US' });
    assert.deepStrictEqual(normalizeLocation('San Francisco, CA, USA'), { city: 'San Francisco', region: 'CA', country: 'US' });
  });

  await t.test('Skill canonicalization mapping', () => {
    assert.strictEqual(normalizeSkill('js'), 'JavaScript');
    assert.strictEqual(normalizeSkill('javascript'), 'JavaScript');
    assert.strictEqual(normalizeSkill('typescript'), 'TypeScript');
    assert.strictEqual(normalizeSkill('nodejs'), 'Node.js');
    assert.strictEqual(normalizeSkill('pm'), 'Product Management');
  });
});

test('Pipeline Ingestion & Merging Tests', () => {
  const csvContent = `name,email,phone,current_company,title
Bob Jones,bob.jones@example.com,555-0198,Microsoft,Senior Developer`;

  const atsContent = [
    {
      candidateName: "Bob Jones",
      contactInfo: {
        emailAddress: "bob.jones@example.com",
        mobileNumber: "+1 (555) 019-8111"
      },
      history: [
        {
          companyName: "Microsoft",
          roleTitle: "Senior Software Engineer II",
          startDate: "2022-01",
          endDate: null,
          description: "Led migrations."
        }
      ],
      skillsList: ["React", "TypeScript", "NodeJS"]
    }
  ];

  const inputs = [
    { name: 'recruiter_export.csv', type: 'csv', content: csvContent },
    { name: 'ats_profile.json', type: 'ats_json', content: atsContent }
  ];

  const result = runPipeline(inputs);

  assert.strictEqual(result.errors.length, 0);
  assert.strictEqual(result.canonical.length, 1);

  const bob = result.canonical[0];
  assert.strictEqual(bob.full_name, 'Bob Jones');
  // Confirm email and multiple phone numbers merged correctly
  assert.ok(bob.emails.includes('bob.jones@example.com'));
  assert.ok(bob.phones.includes('+15550198111')); // From ATS JSON
  assert.ok(bob.phones.includes('+15550198')); // From Recruiter CSV
  
  // Skills canonicalized and sorted by confidence
  assert.strictEqual(bob.skills[0].name, 'React');
  assert.strictEqual(bob.skills[1].name, 'TypeScript');
  assert.strictEqual(bob.skills[2].name, 'Node.js');
});

test('Custom Projection Tests', () => {
  const csvContent = `name,email,phone,current_company,title
Alice Smith,alice.smith@example.com,+15550199,Google,Software Engineer`;

  const githubContent = {
    login: "alicesmith",
    name: "Alice M. Smith",
    bio: "Frontend Engineer at Google. Passionate about React, CSS, and open-source.",
    email: "alice.smith@example.com",
    html_url: "https://github.com/alicesmith",
    repos: [
      { name: "react-perf", language: "TypeScript" }
    ]
  };

  const config = {
    fields: [
      { path: 'full_name', type: 'string', required: true },
      { path: 'primary_email', from: 'emails[0]', type: 'string', required: true },
      { path: 'github_link', from: 'links[0].url', type: 'string' },
      { path: 'skills', from: 'skills[*].name', type: 'string[]', normalize: 'canonical' }
    ],
    include_confidence: true,
    on_missing: 'null'
  };

  const inputs = [
    { name: 'recruiter.csv', type: 'csv', content: csvContent },
    { name: 'github.json', type: 'github', content: githubContent }
  ];

  const result = runPipeline(inputs, config);

  assert.strictEqual(result.errors.length, 0);
  assert.strictEqual(result.projected.length, 1);

  const projectedAlice = result.projected[0];
  assert.strictEqual(projectedAlice.full_name, 'Alice Smith'); // Preempts from CSV (higher priority than github)
  assert.strictEqual(projectedAlice.primary_email, 'alice.smith@example.com');
  assert.strictEqual(projectedAlice.github_link, 'https://github.com/alicesmith');
  assert.ok(projectedAlice.skills.includes('TypeScript'));
  assert.ok(projectedAlice.overall_confidence > 0);
});
