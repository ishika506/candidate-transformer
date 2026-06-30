# Multi-Source Candidate Data Transformer

A robust JavaScript pipeline that merges, normalizes, and filters applicant profiles from multiple structured (CSV, JSON) and unstructured (GitHub, recruiter text notes) sources, outputting unified talent profiles traceable to their original inputs.

This project features:
1. **Core Processing Engine**: Isomorphic pipeline logic (Parsers, Normalizers, Merger, Projector, Validator) running in both Node.js and modern Web browsers.
2. **Interactive Web Dashboard**: A premium, dark-themed single-page visualizer built with Vanilla HTML/JS/CSS featuring real-time step-by-step pipeline animations, custom config previews, and error logs.
3. **Command Line Interface (CLI)**: Process files directly from the command line.
4. **Technical Design Doc Generator**: Script that compiles the technical design specifications to PDF and standalone HTML format.
5. **Testing Suite**: Automated unit tests for normalizers, merger logic, and dynamic custom projections.

---

## Technical Design Overview

The engine executes a **5-Stage Pipeline** to transform messy inputs into unified profiles:

```
Ingest & Parse ──> Normalize ──> Merge & Deduplicate ──> Project ──> Validate Schema
```

1. **Ingest & Parse**: Custom parsers ingest structured formats (CSV, ATS JSON) and extract entities (emails, phones, skills, names) from unstructured texts (GitHub profile JSONs, Recruiter free-text notes) using regex and dictionaries.
2. **Normalize**:
   - **Phones**: Formatted to `E.164` (e.g. `+15550198111`).
   - **Dates**: Standardized to `YYYY-MM` (e.g. `2022-01`).
   - **Location**: Mapped to standard `{ city, region, country }` objects with ISO-3166-1 alpha-2 codes.
   - **Skills**: Synonyms canonicalized via dictionary lookup (e.g., `js` & `javascript` &rarr; `JavaScript`).
3. **Deduplicate & Merge**: Group records by candidate using email (primary) or name+phone (secondary). Apply source weights (**ATS JSON (0.95)** > **Recruiter CSV (0.85)** > **GitHub (0.75)** > **Notes (0.60)**) to resolve conflicts. Combine skills using probabilistic union logic: $Confidence = 1 - \prod(1 - R_i)$. Record the **provenance** (origin and method) of every field.
4. **Project**: Apply a runtime config JSON to reshape outputs dynamically—selecting/renaming fields, re-normalizing, toggling confidence/provenance, and handling missing fields (`null`, `omit`, or `error`).
5. **Validate**: Enforce output schema contracts.

---

## File Structure

```
MERN/
├── package.json
├── README.md
├── Candidate_candidate@eightfold.ai_Eightfold.html   # Technical Design Document (HTML)
├── Candidate_candidate@eightfold.ai_Eightfold.pdf    # Technical Design Document (PDF, if built)
├── src/
│   ├── engine/
│   │   ├── index.js          # Pipeline orchestrator
│   │   ├── parser.js         # Input parsers (CSV, JSON, Notes)
│   │   ├── normalizer.js     # Phone, date, location, skill normalizers
│   │   ├── merger.js         # Deduplication & probabilistic merging
│   │   ├── projector.js      # Custom config schema projector
│   │   └── validator.js      # Canonical & custom schema validators
│   ├── cli.js                # Command line interface tool
│   ├── server.js             # Tiny Node static & API server
│   │   └── web/              # Premium Web Dashboard
│   │       ├── index.html    # Layout structure
│   │       ├── styles.css    # Premium CSS styles
│   │       └── app.js        # UI logic and pipeline visualizer
│   └── doc_generator.js      # Technical Design generator script
├── samples/                  # Mock testing inputs
│   ├── recruiter_export.csv  # Structured CSV input
│   ├── ats_profile.json      # Semi-structured JSON input
│   ├── github_profile.json   # Unstructured simulated GitHub JSON
│   ├── recruiter_notes.txt   # Unstructured free text notes
│   └── configs/
│       └── custom_config.json # Custom schema projection config
└── tests/
    └── pipeline.test.js      # Test suite
```

---

## Setup & Running the Project

Ensure you have [Node.js](https://nodejs.org/) (v18+) installed.

### 1. Install Dependencies
```bash
npm install
```

### 2. Run CLI Tool
You can run the pipeline on the sample dataset using the `--default` flag, which outputs results in `output_results.json`:
```bash
node src/cli.js --default
```

Or process specific custom files:
```bash
node src/cli.js --csv samples/recruiter_export.csv --ats samples/ats_profile.json --config samples/configs/custom_config.json --out my_merged_profiles.json
```

### 3. Launch the Interactive Dashboard
Start the local server:
```bash
node src/server.js
```
Open [http://localhost:3000](http://localhost:3000) in your browser. You can click **"Load Sample Dataset"** to populate inputs instantly, edit them in real-time, modify the projection schema, and click **"Execute Pipeline"** to watch the visualizer process the steps!

### 4. Run Tests
The codebase uses Node's native lightweight test runner:
```bash
npm test
```

### 5. Generate Technical Design Document
To build the HTML design doc and compile the PDF (requires `pdfkit` installed via `npm install`):
```bash
node src/doc_generator.js
```
This generates:
- `Candidate_candidate@eightfold.ai_Eightfold.html` (Standalone, zero-dependency premium design file)
- `Candidate_candidate@eightfold.ai_Eightfold.pdf`
