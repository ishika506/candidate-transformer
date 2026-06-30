import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure names for output
const candidateName = 'Candidate';
const candidateEmail = 'candidate@eightfold.ai';
const pdfFileName = `${candidateName}_${candidateEmail}_Eightfold.pdf`;
const htmlFileName = `${candidateName}_${candidateEmail}_Eightfold.html`;
const pdfPath = path.join(__dirname, '..', pdfFileName);
const htmlPath = path.join(__dirname, '..', htmlFileName);

// HTML Design Document Content (Premium Styled HTML representation)
const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Multi-Source Candidate Data Transformer - Technical Design</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary: #4f46e5;
      --text: #1f2937;
      --text-light: #4b5563;
      --bg: #f9fafb;
      --panel: #ffffff;
      --border: #e5e7eb;
    }
    body {
      font-family: 'Inter', sans-serif;
      color: var(--text);
      background-color: var(--bg);
      line-height: 1.6;
      padding: 2rem;
      max-width: 800px;
      margin: 0 auto;
    }
    .design-card {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 2.5rem;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
    }
    h1 {
      font-family: 'Outfit', sans-serif;
      font-size: 2rem;
      color: var(--primary);
      text-align: center;
      margin-bottom: 0.5rem;
    }
    .subtitle {
      font-style: italic;
      font-size: 0.9rem;
      color: var(--text-light);
      text-align: center;
      margin-bottom: 2rem;
      border-bottom: 2px solid var(--border);
      padding-bottom: 1.5rem;
    }
    h2 {
      font-family: 'Outfit', sans-serif;
      font-size: 1.25rem;
      color: var(--primary);
      margin-top: 1.5rem;
      margin-bottom: 0.5rem;
      border-bottom: 1px solid var(--border);
      padding-bottom: 4px;
    }
    p, li {
      font-size: 0.95rem;
      color: var(--text);
      margin-bottom: 0.5rem;
    }
    ul {
      padding-left: 1.5rem;
      margin-bottom: 1rem;
    }
    strong {
      font-weight: 600;
    }
    .badge {
      background: rgba(79, 70, 229, 0.1);
      color: var(--primary);
      padding: 2px 6px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 0.85rem;
    }
  </style>
</head>
<body>
  <div class="design-card">
    <h1>Multi-Source Candidate Data Transformer</h1>
    <div class="subtitle">Technical Design Document - Prepared by ${candidateName} (${candidateEmail})</div>

    <h2>1. Pipeline / Step Breakdown</h2>
    <p>The transformer executes an asynchronous 5-stage pipeline designed for throughput, robustness, and auditability:</p>
    <ul>
      <li><strong>A. Ingest & Parse:</strong> Accept raw inputs. Features independent parsers for CSV sheets, ATS JSON records, GitHub API profile outputs, and unstructured text files (using regex heuristics).</li>
      <li><strong>B. Normalize & Clean:</strong> Standardize disparate fields: phones mapped to E.164; partial/full dates parsed to YYYY-MM; cities mapped to ISO-3166 alpha-2 country codes; raw skills normalized to standard dictionary spellings.</li>
      <li><strong>C. Deduplicate & Merge:</strong> Match candidate profiles by email keys (primary) or name+phone (secondary). Combine attributes based on source weight policies. Aggregate skills using a probabilistic OR union.</li>
      <li><strong>D. Project Output:</strong> Execute custom schemas in real-time. Dynamically filter fields, paths, and arrays (e.g. wildcard selectors), map new keys, override-normalize, and handle missing fields.</li>
      <li><strong>E. Validate Schema:</strong> Final stage validating the integrity of output datasets (both default canonical schema and custom config projections).</li>
    </ul>

    <h2>2. Canonical Output Schema & Standardized Formats</h2>
    <p>We define a strict, typed internal schema to prevent data pollution downstream:</p>
    <ul>
      <li><strong>phones:</strong> <span class="badge">E.164</span> format (e.g., +12025550143). Cleans spaces, punctuation, and brackets, adding default country codes.</li>
      <li><strong>experience.start/end:</strong> <span class="badge">YYYY-MM</span> format (e.g. 2018-01). Partial years default to -01. Present/Current jobs default to null.</li>
      <li><strong>location:</strong> Structured object: <span class="badge">{ city, region, country }</span>, mapping regions and resolving to ISO-3166-1 alpha-2 codes.</li>
      <li><strong>skills:</strong> Canonicalized terms (e.g. JS -> JavaScript, node -> Node.js) with associated source arrays and confidence score.</li>
    </ul>

    <h2>3. Merge / Conflict-Resolution & Confidence Policy</h2>
    <p>To resolve duplicate/conflicting records when merging multiple files for a candidate, the system uses source weights:</p>
    <p><strong>Source Reliability Weights:</strong> ATS JSON (0.95) &gt; Recruiter CSV (0.85) &gt; GitHub Profile (0.75) &gt; Recruiter Notes (0.60).</p>
    <ul>
      <li><strong>Conflict Winner:</strong> For single-value fields (name, headline, location), the value from the source with the highest reliability score is selected. For lists, a union is performed.</li>
      <li><strong>Probabilistic Skill Confidence:</strong> When skills are mentioned across multiple sources, we calculate a boosted confidence score using the complement probability formula: <span class="badge">Confidence = 1 - &prod;(1 - R_i)</span>. This mathematically models that independent multiple confirmations increase confidence.</li>
      <li><strong>Audit Provenance:</strong> Every single field is linked to an array showing where the value was acquired (source file) and the ingestion mechanism (direct mapping or regex heuristic).</li>
    </ul>

    <h2>4. Runtime Custom-Output Projection & Validation</h2>
    <p>The projection layer uses a runtime configuration file to map the internal schema without code changes:</p>
    <ul>
      <li><strong>Path Remapping:</strong> Supports extracting array indices (e.g. <span class="badge">emails[0]</span>), wildcards (e.g. <span class="badge">skills[*].name</span>), and deep paths.</li>
      <li><strong>Normalization Overrides:</strong> Allows re-applying normalizers (E.164 or canonical) to fields at projection.</li>
      <li><strong>Missing Fields Policy:</strong> Handled by "on_missing" configuration: null (sets value to null), omit (excludes field), or error (stops execution).</li>
    </ul>

    <h2>5. Edge Case Strategies & Exclusions</h2>
    <ul>
      <li><strong>A. Missing Emails / IDs:</strong> We fall back to matching Name + Phone combinations to avoid duplicating candidates who lack email addresses.</li>
      <li><strong>B. Timeline Overlaps:</strong> When calculating years of experience, overlapping work periods are merged as single intervals to prevent inflating years of experience.</li>
      <li><strong>C. Garbage / Malformed Data:</strong> Invalid values degrade gracefully into null. Fields with failed regex parsing are omitted or defaulted rather than causing crashes.</li>
      <li><strong>D. Time-Pressure Exclusion:</strong> Under strict constraints, we deliberately omit full parsing of binary .docx/.pdf resumes in-house, opting instead to ingest pre-parsed plain text recruiter notes or public JSON representations.</li>
    </ul>
  </div>
</body>
</html>`;

function generateHTML() {
  fs.writeFileSync(htmlPath, htmlContent, 'utf-8');
  console.log(`Technical Design HTML successfully generated at: ${htmlPath}`);
}

async function generatePDF() {
  try {
    const PDFDocument = (await import('pdfkit')).default;
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const writeStream = fs.createWriteStream(pdfPath);
    doc.pipe(writeStream);

    const primaryColor = '#4f46e5';
    const textColor = '#1f2937';
    const headingFont = 'Helvetica-Bold';
    const bodyFont = 'Helvetica';

    doc.fillColor(primaryColor).font(headingFont).fontSize(22).text('Multi-Source Candidate Data Transformer', { align: 'center' });
    doc.moveDown(0.5);
    doc.fillColor(textColor).font('Helvetica-Oblique').fontSize(10).text(`Technical Design Document - Prepared by ${candidateName} (${candidateEmail})`, { align: 'center' });
    doc.moveDown(1.5);

    doc.strokeColor(primaryColor).lineWidth(1.5).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(1);

    doc.fillColor(primaryColor).font(headingFont).fontSize(14).text('1. Pipeline / Step Breakdown');
    doc.moveDown(0.4);
    doc.fillColor(textColor).font(bodyFont).fontSize(10).text('The transformer executes an asynchronous 5-stage pipeline designed for throughput, robustness, and auditability:', { lineGap: 3 });
    doc.moveDown(0.4);
    
    const steps = [
      { name: 'A. Ingest & Parse', desc: 'Accepts raw inputs. Features independent parsers for CSV sheets, ATS JSON records, GitHub API profile outputs, and unstructured text files (using regex heuristics).' },
      { name: 'B. Normalize & Clean', desc: 'Standardizes disparate fields: phones mapped to E.164; partial/full dates parsed to YYYY-MM; cities mapped to ISO-3166 alpha-2 country codes; raw skills normalized to standard dictionary spellings.' },
      { name: 'C. Deduplicate & Merge', desc: 'Matches candidate profiles by email keys (primary) or name+phone (secondary). Combines attributes based on source weight policies. Aggregates skills using a probabilistic OR union.' },
      { name: 'D. Project Output', desc: 'Executes custom schemas in real-time. Dynamically filters fields, paths, and arrays (e.g. wildcard selectors), maps new keys, override-normalizes, and handles missing fields.' },
      { name: 'E. Validate Schema', desc: 'Final stage validating the integrity of output datasets (both default canonical schema and custom config projections).' }
    ];

    steps.forEach(step => {
      doc.fillColor(primaryColor).font(headingFont).fontSize(10).text(`   • ${step.name}: `, { continued: true });
      doc.fillColor(textColor).font(bodyFont).fontSize(10).text(step.desc, { lineGap: 2 });
    });

    doc.moveDown(1);

    doc.fillColor(primaryColor).font(headingFont).fontSize(14).text('2. Canonical Output Schema & Standardized Formats');
    doc.moveDown(0.4);
    doc.fillColor(textColor).font(bodyFont).fontSize(10).text('We define a strict, typed internal schema to prevent data pollution downstream:', { lineGap: 3 });
    doc.moveDown(0.4);

    const formats = [
      { field: 'phones', format: 'E.164 standard (e.g. +12025550143). Cleans spaces, punctuation, and brackets, adding default country codes.' },
      { field: 'experience.start/end', format: 'YYYY-MM format (e.g. 2018-01). Partial years default to -01. Present/Current jobs default to null.' },
      { field: 'location', format: 'Structured object: { city, region, country }, mapping regions and resolving to ISO-3166-1 alpha-2 codes.' },
      { field: 'skills', format: 'Canonicalized terms (e.g. JS -> JavaScript, node -> Node.js) with associated source arrays and confidence score.' }
    ];

    formats.forEach(f => {
      doc.fillColor(primaryColor).font(headingFont).fontSize(10).text(`   • ${f.field}: `, { continued: true });
      doc.fillColor(textColor).font(bodyFont).fontSize(10).text(f.format, { lineGap: 2 });
    });

    doc.moveDown(1.5);

    doc.fillColor(primaryColor).font(headingFont).fontSize(14).text('3. Merge / Conflict-Resolution & Confidence Policy');
    doc.moveDown(0.4);
    doc.fillColor(textColor).font(bodyFont).fontSize(10).text('To resolve duplicate/conflicting records when merging multiple files for a candidate, the system uses source weights:', { lineGap: 3 });
    doc.moveDown(0.4);

    doc.font(headingFont).fontSize(10).text('   Source Reliability Weights: ', { continued: true });
    doc.font(bodyFont).text('ATS JSON (0.95) > Recruiter CSV (0.85) > GitHub Profile (0.75) > Recruiter Notes (0.60).');
    
    doc.moveDown(0.4);
    doc.text('   • Conflict Winner: For single-value fields (name, headline, location), the value from the source with the highest reliability score is selected. For lists, a union is performed.', { lineGap: 2 });
    doc.text('   • Probabilistic Skill Confidence: When skills are mentioned across multiple sources, we calculate a boosted confidence score using the complement probability formula: Confidence = 1 - ∏(1 - R_i). This mathematically models that independent multiple confirmations increase confidence.', { lineGap: 2 });
    doc.text('   • Audit Provenance: Every single field is linked to an array showing where the value was acquired (source file) and the ingestion mechanism (direct mapping or regex heuristic).', { lineGap: 2 });

    doc.moveDown(1);

    doc.fillColor(primaryColor).font(headingFont).fontSize(14).text('4. Runtime Custom-Output Projection & Validation');
    doc.moveDown(0.4);
    doc.fillColor(textColor).font(bodyFont).fontSize(10).text('The projection layer uses a runtime configuration file to map the internal schema without code changes:', { lineGap: 3 });
    doc.moveDown(0.4);
    doc.text('   • Path Remapping: Supports extracting array indices (e.g. emails[0]), wildcards (e.g. skills[*].name), and deep paths.', { lineGap: 2 });
    doc.text('   • Normalization Overrides: Allows re-applying normalizers (E.164 or canonical) to fields at projection.', { lineGap: 2 });
    doc.text('   • Missing Fields Policy: Handled by "on_missing" configuration: null (sets value to null), omit (excludes field), or error (stops execution).', { lineGap: 2 });

    doc.moveDown(1);

    doc.fillColor(primaryColor).font(headingFont).fontSize(14).text('5. Edge Case Strategies & Exclusions');
    doc.moveDown(0.4);
    
    const cases = [
      { title: 'A. Missing Emails / IDs: ', desc: 'We fall back to matching Name + Phone combinations to avoid duplicating candidates who lack email addresses.' },
      { title: 'B. Timeline Overlaps: ', desc: 'When calculating years of experience, overlapping work periods are merged as single intervals to prevent inflating years of experience.' },
      { title: 'C. Garbage / Malformed Data: ', desc: 'Invalid values degrade gracefully into null. Fields with failed regex parsing are omitted or defaulted rather than causing crashes.' },
      { title: 'D. Time-Pressure Exclusion: ', desc: 'Under strict constraints, we deliberately omit full parsing of binary .docx/.pdf resumes in-house, opting instead to ingest pre-parsed plain text recruiter notes or public JSON representations.' }
    ];

    cases.forEach(c => {
      doc.fillColor(primaryColor).font(headingFont).fontSize(10).text(`   • ${c.title}`, { continued: true });
      doc.fillColor(textColor).font(bodyFont).fontSize(10).text(c.desc, { lineGap: 2 });
    });

    doc.end();
    console.log(`Technical Design PDF successfully generated at: ${pdfPath}`);
  } catch (err) {
    console.warn(`\nPDFKit is not installed. Skipping PDF generation. Only HTML version generated.`);
    console.warn(`To generate the PDF version, run 'npm install' and then run this script again.\n`);
  }
}

generateHTML();
generatePDF();

