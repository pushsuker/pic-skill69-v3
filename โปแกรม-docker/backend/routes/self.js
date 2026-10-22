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
  complete,
} = require('../helpers');
const { upload, saveFile } = require('../uploads');
async function own(id, user, editing = false) {
  const person = await getParticipant(id);
  check(person.user_id === user.id, 'ไม่ใช่งานของคุณ', 403);
  if (editing) {
    open(await getPeriod(person.period_id));
    check(!person.submitted, 'ส่งแล้ว แก้ไม่ได้');
  }
  return person;
}
// GET /api/my-periods — รอบของผู้รับที่ login อยู่ (evaluatee)
router.get(
  '/my-periods',
  role('evaluatee'),
  route(async (req, res) => {
    ok(
      res,
      await query(
        'SELECT p.id,p.submitted,r.name,r.status,r.start_date,r.end_date,r.published FROM participants p JOIN periods r ON r.id=p.period_id WHERE p.user_id=? ORDER BY p.id DESC',
        [req.user.id],
      ),
    );
  }),
);
// GET /api/self/:id — ข้อมูลประเมินตนเอง path: id = participant id (evaluatee)
router.get(
  '/self/:id',
  role('evaluatee'),
  route(async (req, res) => {
    const person = await own(req.params.id, req.user);
    ok(res, {
      person,
      period: await getPeriod(person.period_id),
      indicators: await items(person.period_id),
      scores: await query('SELECT * FROM self_scores WHERE participant_id=?', [person.id]),
    });
  }),
);
// PUT /api/self/:id/scores/:indicatorId — บันทึกคะแนนตนเอง path: id, indicatorId body: score, description, evidence_url (evaluatee)
router.put(
  '/self/:id/scores/:indicatorId',
  role('evaluatee'),
  route(async (req, res) => {
    const person = await own(req.params.id, req.user, true);
    const item = (await items(person.period_id)).find(
      (i) => i.id === Number(req.params.indicatorId),
    );
    check(item, 'ตัวชี้วัดไม่อยู่ในรอบ', 404);
    const b = req.body;
    check(scoreValid(item, b.score), 'เลือกคะแนนให้ถูกชนิด');
    const url = text(b.evidence_url, 1000, false);
    if (url) {
      let parsed;
      try {
        parsed = new URL(url);
      } catch {}
      check(
        parsed && ['http:', 'https:'].includes(parsed.protocol),
        'URL ต้องขึ้นต้น http:// หรือ https://',
      );
    }
    await query(
      'INSERT INTO self_scores(participant_id,indicator_id,score,description,evidence_url) VALUES(?,?,?,?,?) ON DUPLICATE KEY UPDATE score=VALUES(score),description=VALUES(description),evidence_url=VALUES(evidence_url)',
      [
        person.id,
        item.id,
        b.score,
        text(b.description, 3000, false),
        item.evidence_type === 'url' ? url : '',
      ],
    );
    ok(res);
  }),
);
// POST /api/self/:id/files/:indicatorId — อัปโหลดไฟล์หลักฐาน form-data: file (evaluatee)
router.post(
  '/self/:id/files/:indicatorId',
  role('evaluatee'),
  upload,
  route(async (req, res) => {
    const person = await own(req.params.id, req.user, true);
    const item = (await items(person.period_id)).find(
      (i) => i.id === Number(req.params.indicatorId),
    );
    check(item && item.evidence_type === 'file', 'ข้อนี้ไม่รับไฟล์');
    const rows = await query(
      'SELECT id FROM self_scores WHERE participant_id=? AND indicator_id=?',
      [person.id, item.id],
    );
    check(rows.length, 'บันทึกคะแนนข้อนี้ก่อนแนบไฟล์');
    await query('UPDATE self_scores SET evidence_file=? WHERE id=?', [
      saveFile(req.file),
      rows[0].id,
    ]);
    ok(res);
  }),
);
// POST /api/self/:id/submit — ส่งการประเมินตนเอง path: id (evaluatee)
router.post(
  '/self/:id/submit',
  role('evaluatee'),
  route(async (req, res) => {
    const person = await own(req.params.id, req.user, true);
    const list = await items(person.period_id),
      rows = await query('SELECT * FROM self_scores WHERE participant_id=?', [person.id]);
    check(
      list.length &&
        list.every((i) =>
          complete(
            i,
            rows.find((s) => s.indicator_id === i.id),
          ),
        ),
      'คะแนน รายละเอียด หรือหลักฐานยังไม่ครบ',
    );
    await query('UPDATE participants SET submitted=1 WHERE id=?', [person.id]);
    ok(res);
  }),
);
module.exports = router;
