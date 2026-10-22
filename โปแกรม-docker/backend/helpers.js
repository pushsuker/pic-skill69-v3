// ตัวช่วยเล็ก ๆ ที่ทุกบทใช้ ไม่ต้องสร้าง class หรือ service หลายชั้น
const { query } = require('./db');
function check(condition, message, status = 400) {
  if (!condition) {
    const error = Error(message);
    error.status = status;
    throw error;
  }
}
function text(value, max = 100, required = true) {
  const result = String(value ?? '').trim();
  check((!required || result.length > 0) && result.length <= max, 'ข้อมูลว่างหรือยาวเกินกำหนด');
  return result;
}
function ok(res, data = null, message = 'สำเร็จ') {
  res.json({ status: 'success', message, data });
}
function route(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}
async function getPeriod(id) {
  const rows = await query('SELECT * FROM periods WHERE id=?', [id]);
  check(rows.length, 'ไม่พบรอบ', 404);
  return rows[0];
}
async function getParticipant(id) {
  const rows = await query(
    'SELECT p.*,u.full_name FROM participants p JOIN users u ON u.id=p.user_id WHERE p.id=?',
    [id],
  );
  check(rows.length, 'ไม่พบผู้รับในรอบ', 404);
  return rows[0];
}
async function items(periodId) {
  return query(
    'SELECT i.*,t.name AS topic FROM indicators i JOIN topics t ON t.id=i.topic_id WHERE t.period_id=? ORDER BY t.id,i.id',
    [periodId],
  );
}
function draft(period) {
  check(period.status === 'draft', 'แก้ได้เฉพาะรอบฉบับร่าง');
}
function open(period) {
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' });
  check(
    period.status === 'open' && today >= period.start_date && today <= period.end_date,
    'รอบยังไม่เปิด หรืออยู่นอกวันประเมิน',
    403,
  );
}
function scoreValid(item, score) {
  return (
    Number.isInteger(score) &&
    (item.score_type === 'boolean' ? [0, 1].includes(score) : [1, 2, 3, 4].includes(score))
  );
}
function percentage(indicators, scores) {
  if (!indicators.length) return null;
  let sum = 0,
    weight = 0;
  for (const item of indicators) {
    const row = scores.find((s) => s.indicator_id === item.id);
    if (!row || !scoreValid(item, row.score)) return null;
    const max = item.score_type === 'boolean' ? 1 : 4;
    sum += (row.score / max) * Number(item.weight);
    weight += Number(item.weight);
  }
  return Math.round((sum / weight) * 10000) / 100;
}
function complete(item, row) {
  if (!row || !scoreValid(item, row.score) || !row.description.trim()) return false;
  if (!item.evidence_required) return true;
  return item.evidence_type === 'file' ? !!row.evidence_file : !!row.evidence_url;
}
module.exports = {
  check,
  text,
  ok,
  route,
  getPeriod,
  getParticipant,
  items,
  draft,
  open,
  scoreValid,
  percentage,
  complete,
};
