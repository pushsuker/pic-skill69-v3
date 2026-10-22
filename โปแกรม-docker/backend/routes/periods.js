const router = require('express').Router();
const { query } = require('../db');
const { role } = require('../auth');
const { check, text, ok, route, getPeriod, items, draft } = require('../helpers');
function dates(b) {
  check(/^\d{4}-\d{2}-\d{2}$/.test(b.start_date), 'กรอกวันเริ่ม');
  check(/^\d{4}-\d{2}-\d{2}$/.test(b.end_date), 'กรอกวันสิ้นสุด');
  check(b.start_date <= b.end_date, 'วันสิ้นสุดต้องไม่ก่อนวันเริ่ม');
  check(Number(b.year) >= 2000 && Number(b.year) <= 2100, 'ใช้ปี ค.ศ. 2000–2100');
}
// GET /api/periods — รายการรอบ query: year (ไม่บังคับ) (admin)
router.get(
  '/periods',
  role('admin'),
  route(async (req, res) => {
    ok(
      res,
      req.query.year
        ? await query('SELECT * FROM periods WHERE year=? ORDER BY id DESC', [req.query.year])
        : await query('SELECT * FROM periods ORDER BY id DESC'),
    );
  }),
);
// POST /api/periods — สร้างรอบ body: name, year, start_date, end_date (admin)
router.post(
  '/periods',
  role('admin'),
  route(async (req, res) => {
    const b = req.body;
    dates(b);
    const r = await query('INSERT INTO periods(name,year,start_date,end_date) VALUES(?,?,?,?)', [
      text(b.name),
      Number(b.year),
      b.start_date,
      b.end_date,
    ]);
    ok(res, { id: r.insertId });
  }),
);
// PUT /api/periods/:id — แก้รอบที่ยังเป็นฉบับร่าง path: id (admin)
router.put(
  '/periods/:id',
  role('admin'),
  route(async (req, res) => {
    draft(await getPeriod(req.params.id));
    const b = req.body;
    dates(b);
    await query('UPDATE periods SET name=?,year=?,start_date=?,end_date=? WHERE id=?', [
      text(b.name),
      Number(b.year),
      b.start_date,
      b.end_date,
      req.params.id,
    ]);
    ok(res);
  }),
);
// GET /api/periods/:id — รายละเอียดรอบ หัวข้อ ตัวชี้วัด ผู้รับ กรรมการ path: id (admin)
router.get(
  '/periods/:id',
  role('admin'),
  route(async (req, res) => {
    const period = await getPeriod(req.params.id);
    const topics = await query('SELECT * FROM topics WHERE period_id=?', [period.id]);
    const participants = await query(
      'SELECT p.*,u.full_name FROM participants p JOIN users u ON u.id=p.user_id WHERE period_id=?',
      [period.id],
    );
    const assignments = await query(
      'SELECT a.*,u.full_name AS evaluator_name,v.full_name AS evaluatee_name FROM assignments a JOIN users u ON u.id=a.evaluator_id JOIN participants p ON p.id=a.participant_id JOIN users v ON v.id=p.user_id WHERE p.period_id=?',
      [period.id],
    );
    ok(res, { period, topics, indicators: await items(period.id), participants, assignments });
  }),
);
// POST /api/periods/:id/topics — เพิ่มหัวข้อ path: id body: name (admin)
router.post(
  '/periods/:id/topics',
  role('admin'),
  route(async (req, res) => {
    draft(await getPeriod(req.params.id));
    await query('INSERT INTO topics(period_id,name) VALUES(?,?)', [
      req.params.id,
      text(req.body.name),
    ]);
    ok(res);
  }),
);
// PUT /api/topics/:id — แก้ชื่อหัวข้อ path: id body: name (admin)
router.put(
  '/topics/:id',
  role('admin'),
  route(async (req, res) => {
    const rows = await query('SELECT * FROM topics WHERE id=?', [req.params.id]);
    check(rows.length, 'ไม่พบหัวข้อ', 404);
    draft(await getPeriod(rows[0].period_id));
    await query('UPDATE topics SET name=? WHERE id=?', [text(req.body.name), req.params.id]);
    ok(res);
  }),
);
async function indicatorData(b) {
  const topics = await query('SELECT * FROM topics WHERE id=?', [b.topic_id]);
  check(topics.length, 'เลือกหัวข้อ');
  draft(await getPeriod(topics[0].period_id));
  check(
    Number.isFinite(Number(b.weight)) && Number(b.weight) > 0 && Number(b.weight) <= 10000,
    'น้ำหนักต้องมากกว่า 0 และไม่เกิน 10000',
  );
  check(['scale4', 'boolean'].includes(b.score_type), 'ชนิดคะแนนไม่ถูกต้อง');
  check(['none', 'file', 'url'].includes(b.evidence_type), 'ชนิดหลักฐานไม่ถูกต้อง');
  check(b.evidence_type !== 'none' || !b.evidence_required, 'ไม่ใช้หลักฐานต้องไม่บังคับแนบ');
  return [
    b.topic_id,
    text(b.name, 150),
    text(b.detail, 2000, false),
    Number(b.weight),
    b.score_type,
    b.evidence_type,
    b.evidence_required ? 1 : 0,
  ];
}
// POST /api/indicators — เพิ่มตัวชี้วัด body: topic_id, name, detail, weight, score_type, evidence_type, evidence_required (admin)
router.post(
  '/indicators',
  role('admin'),
  route(async (req, res) => {
    await query(
      'INSERT INTO indicators(topic_id,name,detail,weight,score_type,evidence_type,evidence_required) VALUES(?,?,?,?,?,?,?)',
      await indicatorData(req.body),
    );
    ok(res);
  }),
);
// PUT /api/indicators/:id — แก้ตัวชี้วัด path: id (admin)
router.put(
  '/indicators/:id',
  role('admin'),
  route(async (req, res) => {
    const old = await query('SELECT * FROM indicators WHERE id=?', [req.params.id]);
    check(old.length, 'ไม่พบตัวชี้วัด', 404);
    check(Number(req.body.topic_id) === old[0].topic_id, 'ฉบับพื้นฐานไม่ย้ายตัวชี้วัดข้ามหัวข้อ');
    await query(
      'UPDATE indicators SET topic_id=?,name=?,detail=?,weight=?,score_type=?,evidence_type=?,evidence_required=? WHERE id=?',
      [...(await indicatorData(req.body)), req.params.id],
    );
    ok(res);
  }),
);
// DELETE /api/indicators/:id — ลบตัวชี้วัด path: id (admin)
router.delete(
  '/indicators/:id',
  role('admin'),
  route(async (req, res) => {
    const rows = await query(
      'SELECT t.period_id FROM indicators i JOIN topics t ON t.id=i.topic_id WHERE i.id=?',
      [req.params.id],
    );
    check(rows.length, 'ไม่พบตัวชี้วัด', 404);
    draft(await getPeriod(rows[0].period_id));
    await query('DELETE FROM indicators WHERE id=?', [req.params.id]);
    ok(res);
  }),
);
// POST /api/periods/:id/participants — เพิ่มผู้รับเข้ารอบ path: id body: user_id (admin)
router.post(
  '/periods/:id/participants',
  role('admin'),
  route(async (req, res) => {
    draft(await getPeriod(req.params.id));
    const users = await query("SELECT id FROM users WHERE id=? AND role='evaluatee' AND active=1", [
      req.body.user_id,
    ]);
    check(users.length, 'เลือกผู้รับที่เปิดใช้งาน');
    await query('INSERT INTO participants(period_id,user_id) VALUES(?,?)', [
      req.params.id,
      req.body.user_id,
    ]);
    ok(res);
  }),
);
// POST /api/assignments — มอบหมายกรรมการ body: participant_id, evaluator_id, committee_role (admin)
router.post(
  '/assignments',
  role('admin'),
  route(async (req, res) => {
    const b = req.body;
    const people = await query('SELECT * FROM participants WHERE id=?', [b.participant_id]);
    check(people.length, 'เลือกผู้รับในรอบ');
    draft(await getPeriod(people[0].period_id));
    const users = await query("SELECT id FROM users WHERE id=? AND role='evaluator' AND active=1", [
      b.evaluator_id,
    ]);
    check(users.length, 'เลือกกรรมการที่เปิดใช้งาน');
    check(['chair', 'member'].includes(b.committee_role), 'เลือกหน้าที่');
    if (b.committee_role === 'chair')
      check(
        !(
          await query(
            "SELECT id FROM assignments WHERE participant_id=? AND committee_role='chair'",
            [b.participant_id],
          )
        ).length,
        'มีประธานแล้ว',
      );
    await query(
      'INSERT INTO assignments(participant_id,evaluator_id,committee_role) VALUES(?,?,?)',
      [b.participant_id, b.evaluator_id, b.committee_role],
    );
    ok(res);
  }),
);
// DELETE /api/assignments/:id — ถอนการมอบหมาย path: id (admin)
router.delete(
  '/assignments/:id',
  role('admin'),
  route(async (req, res) => {
    const rows = await query(
      'SELECT p.period_id FROM assignments a JOIN participants p ON p.id=a.participant_id WHERE a.id=?',
      [req.params.id],
    );
    check(rows.length, 'ไม่พบงาน', 404);
    draft(await getPeriod(rows[0].period_id));
    await query('DELETE FROM assignments WHERE id=?', [req.params.id]);
    ok(res);
  }),
);
// POST /api/periods/:id/open — เปิดรอบ path: id (admin)
router.post(
  '/periods/:id/open',
  role('admin'),
  route(async (req, res) => {
    const p = await getPeriod(req.params.id);
    draft(p);
    check((await items(p.id)).length, 'เพิ่มตัวชี้วัดก่อน');
    const people = await query('SELECT id FROM participants WHERE period_id=?', [p.id]);
    check(people.length, 'เพิ่มผู้รับก่อน');
    for (const person of people) {
      const a = await query('SELECT * FROM assignments WHERE participant_id=?', [person.id]);
      check(
        a.filter((x) => x.committee_role === 'chair').length === 1,
        'ผู้รับทุกคนต้องมีประธานหนึ่งคน',
      );
    }
    await query("UPDATE periods SET status='open' WHERE id=?", [p.id]);
    ok(res);
  }),
);
// POST /api/periods/:id/close — ปิดรอบ path: id (admin)
router.post(
  '/periods/:id/close',
  role('admin'),
  route(async (req, res) => {
    check((await getPeriod(req.params.id)).status === 'open', 'รอบต้องเปิดอยู่');
    await query("UPDATE periods SET status='closed' WHERE id=?", [req.params.id]);
    ok(res);
  }),
);
module.exports = router;
