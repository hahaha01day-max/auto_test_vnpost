'use strict';

/**
 * Cắt file spec Playwright theo từng `test(...)`.
 *
 * 🔴 Vì sao không cắt theo dòng: các spec trong repo có `test.describe` LỒNG NHAU
 * (`08-loyalty` có 3 tầng). Cắt theo dòng rồi ghép lại làm vỡ cân bằng ngoặc — file sinh ra
 * vẫn "trông đúng", nhưng Playwright báo `0 tests in 0 files` chứ không báo lỗi cú pháp,
 * nên nếu không đối chiếu số test thì tưởng là chuyển thành công.
 *
 * Cách làm an toàn: KHÔNG dựng lại file từ mảnh. Giữ nguyên file gốc rồi **xoá** các khối
 * `test(...)` không thuộc đích — header, describe lồng nhau và phần đóng tự khắc còn nguyên.
 */

/**
 * Ký tự có nghĩa đứng trước một dấu `/` quyết định nó mở REGEX hay là phép chia / comment.
 * 🔴 Không phân biệt được thì `toHaveURL(/\\/order\\/detail\\//)` sẽ vỡ: cặp `//` ở cuối regex
 * bị coi là comment dòng, nuốt luôn `)` đóng lời gọi `test(...)`, và khối test chạy tới hết file.
 * Triệu chứng ở file sinh ra là thiếu `});` cuối — Playwright báo `0 tests`, không báo lỗi cú pháp.
 */
const REGEX_CAN_FOLLOW = new Set(['(', ',', '=', ':', '[', '!', '&', '|', '?', '{', '}', ';', '+', '-', '*', '%', '~', '^', '<', '>', '\n', '']);

/** Quét qua chuỗi/template/comment/regex để không đếm nhầm ngoặc nằm trong đó. */
function skipNonCode(source, i, prevMeaningful = '') {
  const two = source.slice(i, i + 2);

  // `/` mở regex khi ký tự có nghĩa trước đó không phải toán hạng.
  if (source[i] === '/' && two !== '//' && two !== '/*' && REGEX_CAN_FOLLOW.has(prevMeaningful)) {
    let j = i + 1;
    let inClass = false;
    while (j < source.length) {
      if (source[j] === '\\') { j += 2; continue; }
      if (source[j] === '[') inClass = true;
      else if (source[j] === ']') inClass = false;
      else if (source[j] === '/' && !inClass) return j + 1;
      else if (source[j] === '\n') break; // regex không xuống dòng → đoán sai, bỏ qua
      j += 1;
    }
  }

  if (two === '//') {
    const end = source.indexOf('\n', i);
    return end === -1 ? source.length : end;
  }
  if (two === '/*') {
    const end = source.indexOf('*/', i + 2);
    return end === -1 ? source.length : end + 2;
  }

  const quote = source[i];
  if (quote !== '"' && quote !== "'" && quote !== '`') return i;

  let j = i + 1;
  while (j < source.length) {
    if (source[j] === '\\') {
      j += 2;
      continue;
    }
    if (source[j] === quote) return j + 1;
    // `${...}` trong template có thể chứa cả chuỗi lẫn ngoặc — đi xuyên qua bằng đệ quy.
    if (quote === '`' && source.slice(j, j + 2) === '${') {
      let depth = 1;
      j += 2;
      while (j < source.length && depth > 0) {
        const skipped = skipNonCode(source, j);
        if (skipped > j) {
          j = skipped;
          continue;
        }
        if (source[j] === '{') depth += 1;
        else if (source[j] === '}') depth -= 1;
        j += 1;
      }
      continue;
    }
    j += 1;
  }
  return source.length;
}

/**
 * @returns {Array<{start:number,end:number,title:string}>} các khối `test(...)` ở mọi cấp,
 * KHÔNG gồm `test.describe`, `test.beforeEach`, `test.afterEach`…
 */
function findTestBlocks(source) {
  const blocks = [];
  const re = /\btest\s*\(/g;
  let match;

  while ((match = re.exec(source)) !== null) {
    const before = source.slice(Math.max(0, match.index - 1), match.index);
    // `test(` phải đứng riêng, không phải `.test(` hay `mytest(`.
    if (/[\w.$]/.test(before)) continue;

    const openParen = match.index + match[0].length - 1;
    let i = openParen;
    let depth = 0;
    let prev = '';

    while (i < source.length) {
      const skipped = skipNonCode(source, i, prev);
      if (skipped > i) {
        prev = source[skipped - 1];
        i = skipped;
        continue;
      }
      if (!/\s/.test(source[i])) prev = source[i];
      else if (source[i] === '\n') prev = prev || '\n';
      if (source[i] === '(') depth += 1;
      else if (source[i] === ')') {
        depth -= 1;
        if (depth === 0) {
          i += 1;
          break;
        }
      }
      i += 1;
    }

    // Nuốt luôn dấu `;` và xuống dòng ngay sau, để xoá không để lại rác.
    while (i < source.length && (source[i] === ';' || source[i] === '\r')) i += 1;
    if (source[i] === '\n') i += 1;

    // Lùi đầu khối về đầu dòng để giữ thụt lề sạch.
    let start = match.index;
    while (start > 0 && (source[start - 1] === ' ' || source[start - 1] === '\t')) start -= 1;

    const title = (source.slice(match.index, i).match(/test\s*\(\s*(['"`])([\s\S]*?)\1/) || [])[2] || '';

    blocks.push({ start, end: i, title });
    re.lastIndex = i;
  }

  return blocks;
}

/**
 * Giữ lại những block mà `keep(title)` trả về chuỗi title mới; xoá phần còn lại.
 * @returns {string|null} null khi không giữ block nào.
 */
function keepOnly(source, keep) {
  const blocks = findTestBlocks(source);
  if (blocks.length === 0) return null;

  let out = '';
  let cursor = 0;
  let kept = 0;

  for (const block of blocks) {
    out += source.slice(cursor, block.start);
    const newTitle = keep(block.title);
    if (newTitle) {
      const body = source.slice(block.start, block.end);
      out += body.replace(/test\s*\(\s*(['"`])([\s\S]*?)\1/, (whole, quote) => `test(${quote}${newTitle}${quote}`);
      kept += 1;
    }
    cursor = block.end;
  }
  out += source.slice(cursor);

  return kept > 0 ? out : null;
}

module.exports = { findTestBlocks, keepOnly };
