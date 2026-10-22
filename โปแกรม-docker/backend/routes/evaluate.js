const router = require('express').Router();
const { query } = require('../db');
const { role } = require('../auth');
const {
  check,
  text,
  ok,
  route,
  getPeriod,
  getParticipant,
  items,
  open,
  scoreValid,
  percentage,
} = require('../helpers');
const { upload, saveFile } = require('../uploads');
async function own(id, user, editing = false) {
  const rows = await query('SELECT * FROM assignments WHERE id=?', [id]);
  check(rows.length, 'ไม่พบงาน', 404);
  const a = rows[0];
  check(a.evaluator_id === user.id, 'ไม่ใช่งานที่มอบหมายให้คุณ', 403);
  const person = await getParticipant(a.participant_id),
    period = await getPeriod(person.period_id);
  if (editing) {
    open(period);
    check(person.submitted, 'ผู้รับยังไม่ส่ง');
    check(!a.submitted, 'กรรมการส่งแล้ว แก้ไม่ได้');
  }
  return { assignment: a, person, period };
}
// GET /api/my-assignments — งานที่กรรมการได้รับมอบหมาย (evaluator)
router.get(
  '/my-assignments',
  role('evaluator'),
  route(async (req, res) => {
    ok(
      res,
      await query(
        'SELECT a.id,a.submitted,a.committee_role,u.full_name,r.name,p.submitted AS self_submitted FROM assignments a JOIN participants p ON p.id=a.participant_id JOIN users u ON u.id=p.user_id JOIN periods r ON r.id=p.period_id WHERE a.evaluator_id=? ORDER BY a.id DESC',
        [req.user.id],
      ),
    );
  }),
);
// GET /api/evaluate/:id — ข้อมูลสำหรับให้คะแนน path: id = assignment id (evaluator)
router.get(
  '/evaluate/:id',
  role('evaluator'),
  route(async (req, res) => {
    const data = await own(req.params.id, req.user);
    const indicators = await items(data.person.period_id);
    const scores = await query('SELECT * FROM scores WHERE assignment_id=?', [data.assignment.id]);
    ok(res, {
      ...data,
      indicators,
      scores,
      self_scores: await query('SELECT * FROM self_scores WHERE participant_id=?', [
        data.person.id,
      ]),
      percentage: percentage(indicators, scores),
    });
  }),
);
// PUT /api/evaluate/:id/scores/:indicatorId — ให้คะแนน path: id, indicatorId body: score (evaluator)
router.put(
  '/evaluate/:id/scores/:indicatorId',
  role('evaluator'),
  route(async (req, res) => {
    const data = await own(req.params.id, req.user, true);
    const item = (await items(data.person.period_id)).find(
      (i) => i.id === Number(req.params.indicatorId),
    );
    check(item, 'ตัวชี้วัดไม่อยู่ในรอบ', 404);
    check(scoreValid(item, req.body.score), 'คะแนนไม่ถูกชนิด');
    await query(
      'INSERT INTO scores(assignment_id,indicator_id,score) VALUES(?,?,?) ON DUPLICATE KEY UPDATE score=VALUES(score)',
      [data.assignment.id, item.id, req.body.score],
    );
    ok(res);
  }),
);
// PUT /api/evaluate/:id/comment — บันทึกความเห็น body: comment (evaluator)
router.put(
  '/evaluate/:id/comment',
  role('evaluator'),
  route(async (req, res) => {
    await own(req.params.id, req.user, true);
    await query('UPDATE assignments SET comment=? WHERE id=?', [
      text(req.body.comment, 3000),
      req.params.id,
    ]);
    ok(res);
  }),
);
// POST /api/evaluate/:id/signature — อัปโหลดลายเซ็น form-data: file PNG/JPEG (evaluator)
router.post(
  '/evaluate/:id/signature',
  role('evaluator'),
  upload,
  route(async (req, res) => {
    await own(req.params.id, req.user, true);
    await query('UPDATE assignments SET signature=? WHERE id=?', [
      saveFile(req.file, true),
      req.params.id,
    ]);
    ok(res);
  }),
);
// POST /api/evaluate/:id/submit — ยืนยันและส่งผล path: id (evaluator)
router.post(
  '/evaluate/:id/submit',
  role('evaluator'),
  route(async (req, res) => {
    const data = await own(req.params.id, req.user, true),
      a = data.assignment;
    const score = percentage(
      await items(data.person.period_id),
      await query('SELECT * FROM scores WHERE assignment_id=?', [a.id]),
    );
    check(score !== null && a.comment && a.signature, 'คะแนน ความเห็น หรือลายเซ็นยังไม่ครบ');
    await query('UPDATE assignments SET submitted=1 WHERE id=?', [a.id]);
    ok(res);
  }),
);
module.exports = router;
