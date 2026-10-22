const router = require('express').Router();
const { query } = require('../db');
const { role } = require('../auth');
const {
  check,
  ok,
  route,
  getPeriod,
  getParticipant,
  items,
  percentage,
  complete,
} = require('../helpers');
async function result(id) {
  const person = await getParticipant(id),
    period = await getPeriod(person.period_id),
    indicators = await items(period.id);
  const self = await query('SELECT * FROM self_scores WHERE participant_id=?', [id]);
  const committees = await query(
    'SELECT a.*,u.full_name FROM assignments a JOIN users u ON u.id=a.evaluator_id WHERE a.participant_id=? ORDER BY a.id',
    [id],
  );
  for (const c of committees) {
    c.scores = await query('SELECT * FROM scores WHERE assignment_id=?', [c.id]);
    c.percentage = percentage(indicators, c.scores);
  }
  const done =
    !!person.submitted &&
    committees.length > 0 &&
    committees.every((c) => c.submitted && c.percentage !== null);
  const total = done
    ? Math.round((committees.reduce((sum, c) => sum + c.percentage, 0) / committees.length) * 100) /
      100
    : null;
  return {
    person,
    period,
    indicators,
    self_scores: self,
    self_complete: indicators.filter((i) =>
      complete(
        i,
        self.find((s) => s.indicator_id === i.id),
      ),
    ).length,
    committees,
    total,
  };
}
// GET /api/my-results — ผลการประเมินของฉัน (evaluatee)
router.get(
  '/my-results',
  role('evaluatee'),
  route(async (req, res) => {
    const people = await query(
      'SELECT p.id, r.name, r.year, r.published FROM participants p JOIN periods r ON r.id=p.period_id WHERE p.user_id=? ORDER BY r.id DESC',
      [req.user.id],
    );
    const results = [];
    for (const p of people)
      results.push({ ...p, total: p.published ? (await result(p.id)).total : null });
    ok(res, results);
  }),
);
// GET /api/reports/:id — รายงานภาพรวมรอบ + ค่าเฉลี่ย path: id = period id (admin)
router.get(
  '/reports/:id',
  role('admin'),
  route(async (req, res) => {
    const period = await getPeriod(req.params.id),
      people = await query('SELECT id FROM participants WHERE period_id=?', [period.id]),
      results = [];
    for (const p of people) results.push(await result(p.id));
    const ready = results.filter((r) => r.total !== null);
    ok(res, {
      period,
      results,
      average: ready.length
        ? Math.round((ready.reduce((sum, r) => sum + r.total, 0) / ready.length) * 100) / 100
        : null,
    });
  }),
);
// GET /api/results/:id — ผลรายบุคคล path: id = participant id
router.get(
  '/results/:id',
  route(async (req, res) => {
    const person = await getParticipant(req.params.id),
      period = await getPeriod(person.period_id);
    check(
      req.user.role === 'admin' || (req.user.id === person.user_id && period.published),
      'ผลยังไม่เผยแพร่ หรือไม่มีสิทธิ์',
      403,
    );
    ok(res, await result(person.id));
  }),
);
// POST /api/periods/:id/publish — เผยแพร่ผล path: id (admin)
router.post(
  '/periods/:id/publish',
  role('admin'),
  route(async (req, res) => {
    const period = await getPeriod(req.params.id);
    check(period.status !== 'draft', 'รอบยังไม่เปิด');
    const people = await query('SELECT id FROM participants WHERE period_id=?', [period.id]);
    check(people.length, 'ไม่มีผู้รับ');
    for (const person of people)
      check((await result(person.id)).total !== null, 'ต้องส่งครบทุกคนและทุกกรรมการก่อนเผยแพร่');
    await query('UPDATE periods SET published=1 WHERE id=?', [period.id]);
    ok(res);
  }),
);
module.exports = router;
