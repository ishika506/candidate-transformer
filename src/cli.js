#!/usr/bin/env node

/**
 * CLI Tool for the Multi-Source Candidate Data Transformer
 * Usage:
 *   node src/cli.js --default
 *   node src/cli.js --csv <file.csv> --ats <file.json> --config <config.json> --out <output.json>
 */

import fs from 'fs';
import path from 'path';
import { runPipeline } from './engine/index.js';

// Parse command line arguments
const args = process.argv.slice(2);

function printUsage() {
  console.log(`
Multi-Source Candidate Data Transformer - CLI Tool

Usage Options:
  --default                               Run the pipeline with all sample inputs and the sample custom config.
  --csv <path>                            Path to Recruiter CSV export file.
  --ats <path>                            Path to ATS JSON profile file.
  --github <path>                         Path to GitHub profile JSON file.
  --notes <path>                          Path to Recruiter Notes text file.
  --config <path>                         Path to runtime custom schema configuration JSON file.
  --out <path>                            Path to output the final results (JSON file). If omitted, prints to console.
  --help                                  Show this usage guide.
`);
}

async function main() {
  if (args.includes('--help') || args.length === 0) {
    printUsage();
    return;
  }

  const inputs = [];
  let configPath = null;
  let outputPath = null;

  // Run with defaults if requested
  if (args.includes('--default')) {
    console.log('Running transformer pipeline with default sample inputs...');
    
    const sampleDir = path.resolve('samples');
    
    const csvPath = path.join(sampleDir, 'recruiter_export.csv');
    const atsPath = path.join(sampleDir, 'ats_profile.json');
    const ghPath = path.join(sampleDir, 'github_profile.json');
    const notesPath = path.join(sampleDir, 'recruiter_notes.txt');
    configPath = path.join(sampleDir, 'configs', 'custom_config.json');
    outputPath = path.resolve('output_results.json');

    if (fs.existsSync(csvPath)) {
      inputs.push({ name: 'recruiter_export.csv', type: 'csv', content: fs.readFileSync(csvPath, 'utf-8') });
    }
    if (fs.existsSync(atsPath)) {
      inputs.push({ name: 'ats_profile.json', type: 'ats_json', content: fs.readFileSync(atsPath, 'utf-8') });
    }
    if (fs.existsSync(ghPath)) {
      inputs.push({ name: 'github_profile.json', type: 'github', content: fs.readFileSync(ghPath, 'utf-8') });
    }
    if (fs.existsSync(notesPath)) {
      inputs.push({ name: 'recruiter_notes.txt', type: 'notes', content: fs.readFileSync(notesPath, 'utf-8') });
    }
  } else {
    // Custom arguments parsing
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--csv' && args[i + 1]) {
        const p = path.resolve(args[i + 1]);
        inputs.push({ name: path.basename(p), type: 'csv', content: fs.readFileSync(p, 'utf-8') });
        i++;
      } else if (args[i] === '--ats' && args[i + 1]) {
        const p = path.resolve(args[i + 1]);
        inputs.push({ name: path.basename(p), type: 'ats_json', content: fs.readFileSync(p, 'utf-8') });
        i++;
      } else if (args[i] === '--github' && args[i + 1]) {
        const p = path.resolve(args[i + 1]);
        inputs.push({ name: path.basename(p), type: 'github', content: fs.readFileSync(p, 'utf-8') });
        i++;
      } else if (args[i] === '--notes' && args[i + 1]) {
        const p = path.resolve(args[i + 1]);
        inputs.push({ name: path.basename(p), type: 'notes', content: fs.readFileSync(p, 'utf-8') });
        i++;
      } else if (args[i] === '--config' && args[i + 1]) {
        configPath = path.resolve(args[i + 1]);
        i++;
      } else if (args[i] === '--out' && args[i + 1]) {
        outputPath = path.resolve(args[i + 1]);
        i++;
      }
    }
  }

  if (inputs.length === 0) {
    console.error('Error: No input files provided.');
    printUsage();
    process.exit(1);
  }

  // Load configuration
  let customConfig = null;
  if (configPath && fs.existsSync(configPath)) {
    try {
      customConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      console.log(`Loaded custom configuration from: ${configPath}`);
    } catch (err) {
      console.error(`Error loading configuration file: ${err.message}`);
      process.exit(1);
    }
  }

  // Run the pipeline
  const result = runPipeline(inputs, customConfig);

  // Output formatting
  const responseData = {
    canonical_profiles: result.canonical,
    projected_profiles: result.projected,
    errors: result.errors
  };

  const outputJson = JSON.stringify(responseData, null, 2);

  if (outputPath) {
    try {
      fs.writeFileSync(outputPath, outputJson, 'utf-8');
      console.log(`\nSuccess! Results written to: ${outputPath}`);
      if (result.errors.length > 0) {
        console.warn(`\nWarnings/Errors encountered during execution:\n- ${result.errors.join('\n- ')}`);
      }
    } catch (err) {
      console.error(`Error writing output file: ${err.message}`);
      process.exit(1);
    }
  } else {
    console.log('\n--- Pipeline Output Results ---');
    console.log(outputJson);
  }
}

main().catch(err => {
  console.error(`Unhandled execution error: ${err.message}`);
  process.exit(1);
});
