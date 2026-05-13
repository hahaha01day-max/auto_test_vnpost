// Sinh HTML report đơn giản từ JSON smoke test của tài liệu 04.
const fs = require('node:fs');
const path = require('node:path');

const DOC_ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(DOC_ROOT, 'test-output/smoke');
const RESULT_FILE = path.join(OUT_DIR, 'product-category-smoke-result.json');
const REPORT_FILE = path.join(OUT_DIR, 'product-category-smoke-report.html');

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function relative(file) {
  return path.relative(OUT_DIR, file).replaceAll(path.sep, '/');
}

function statusClass(status) {
  if (status === 'PASS') return 'pass';
  if (status === 'FAIL') return 'fail';
  if (status === 'WARN') return 'warn';
  return 'other';
}

function main() {
  if (!fs.existsSync(RESULT_FILE)) {
    throw new Error(`Chưa có file kết quả: ${RESULT_FILE}`);
  }

  const data = JSON.parse(fs.readFileSync(RESULT_FILE, 'utf8'));
  const steps = data.steps || [];
  const screenshots = data.screenshots || [];
  const observations = data.observations || [];
  const issues = data.issues || [];

  const counts = steps.reduce((acc, step) => {
    acc[step.status || 'UNKNOWN'] = (acc[step.status || 'UNKNOWN'] || 0) + 1;
    return acc;
  }, {});

  const rows = steps.map((step) => `
    <tr>
      <td>${escapeHtml(step.id)}</td>
      <td>${escapeHtml(step.action)}</td>
      <td><span class="badge ${statusClass(step.status)}">${escapeHtml(step.status)}</span></td>
      <td>${escapeHtml(typeof step.value === 'object' ? JSON.stringify(step.value) : step.value || '')}</td>
    </tr>
  `).join('');

  const shotCards = screenshots.map((shot) => `
    <a class="shot" href="${escapeHtml(relative(shot))}" target="_blank">
      <img src="${escapeHtml(relative(shot))}" alt="${escapeHtml(path.basename(shot))}">
      <span>${escapeHtml(path.basename(shot))}</span>
    </a>
  `).join('');

  const issueItems = issues.length
    ? issues.map((issue) => `<li>${escapeHtml(issue)}</li>`).join('')
    : '<li>Không ghi nhận issue runtime.</li>';

  const observationItems = observations.map((obs) => `
    <details>
      <summary>${escapeHtml(obs.area)}</summary>
      <pre>${escapeHtml(obs.text)}</pre>
    </details>
  `).join('');

  const html = `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Report - Danh mục sản phẩm / Quản lý sản phẩm</title>
  <style>
    body { margin: 0; font-family: Arial, sans-serif; color: #1f2937; background: #f6f7f9; }
    header { padding: 28px 36px; background: #ffffff; border-bottom: 1px solid #e5e7eb; }
    main { padding: 24px 36px 40px; }
    h1 { margin: 0 0 8px; font-size: 24px; }
    h2 { margin: 28px 0 12px; font-size: 18px; }
    .meta { color: #6b7280; font-size: 13px; line-height: 1.6; }
    .summary { display: grid; grid-template-columns: repeat(4, minmax(120px, 1fr)); gap: 12px; margin-top: 18px; }
    .card { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px; }
    .num { font-size: 26px; font-weight: 700; margin-top: 6px; }
    table { width: 100%; border-collapse: collapse; background: #fff; border: 1px solid #e5e7eb; }
    th, td { padding: 10px 12px; border-bottom: 1px solid #e5e7eb; text-align: left; vertical-align: top; font-size: 13px; }
    th { background: #f9fafb; font-weight: 700; }
    .badge { display: inline-block; min-width: 52px; padding: 4px 8px; border-radius: 999px; font-size: 12px; font-weight: 700; text-align: center; }
    .pass { background: #dcfce7; color: #166534; }
    .warn { background: #fef3c7; color: #92400e; }
    .fail { background: #fee2e2; color: #991b1b; }
    .other { background: #e5e7eb; color: #374151; }
    .shots { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 14px; }
    .shot { display: block; background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; color: inherit; text-decoration: none; }
    .shot img { width: 100%; height: 150px; object-fit: cover; display: block; border-bottom: 1px solid #e5e7eb; }
    .shot span { display: block; padding: 10px; font-size: 12px; color: #4b5563; }
    details { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 10px; padding: 12px; }
    summary { cursor: pointer; font-weight: 700; }
    pre { white-space: pre-wrap; font-size: 12px; line-height: 1.5; color: #374151; }
    ul { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px 28px; }
  </style>
</head>
<body>
  <header>
    <h1>Danh mục sản phẩm / Quản lý sản phẩm</h1>
    <div class="meta">
      Source: ${escapeHtml(data.sourceDocument || '')}<br>
      Started: ${escapeHtml(data.startedAt || '')}<br>
      Finished: ${escapeHtml(data.finishedAt || '')}<br>
      Safety: ${escapeHtml(data.safety || '')}
    </div>
    <div class="summary">
      <div class="card">Total<div class="num">${steps.length}</div></div>
      <div class="card">PASS<div class="num">${counts.PASS || 0}</div></div>
      <div class="card">WARN<div class="num">${counts.WARN || 0}</div></div>
      <div class="card">FAIL<div class="num">${counts.FAIL || 0}</div></div>
    </div>
  </header>
  <main>
    <h2>Test Steps</h2>
    <table>
      <thead><tr><th>ID</th><th>Action</th><th>Status</th><th>Value</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <h2>Screenshots</h2>
    <div class="shots">${shotCards}</div>
    <h2>Issues</h2>
    <ul>${issueItems}</ul>
    <h2>Observations</h2>
    ${observationItems}
  </main>
</body>
</html>`;

  fs.writeFileSync(REPORT_FILE, html);
  console.log(REPORT_FILE);
}

main();
