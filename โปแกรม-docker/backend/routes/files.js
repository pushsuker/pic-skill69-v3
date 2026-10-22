const router = require('express').Router();
const path = require('node:path');
const { query } = require('../db');
const { check, route } = require('../helpers');
const { folder } = require('../uploads');
// เปิดไฟล์ผ่าน API ที่ตรวจสิทธิ์ ไม่เปิด uploads เป็น public
// GET /api/files/:id — เปิดไฟล์หลักฐาน (ตรวจสิทธิ์ก่อน) path: id = self_scores id
router.get(
  '/files/:id',
  route(async (req, res) => {
    const rows = await query(
      'SELECT s.*,p.user_id FROM self_scores s JOIN participants p ON p.id=s.participant_id WHERE s.id=?',
      [req.params.id],
    );
    check(rows.length, 'ไม่พบหลักฐาน', 404);
    const row = rows[0],
      assigned = await query(
        'SELECT id FROM assignments WHERE participant_id=? AND evaluator_id=?',
        [row.participant_id, req.user.id],
      );
    check(
      req.user.role === 'admin' || row.user_id === req.user.id || assigned.length,
      'ไม่มีสิทธิ์เปิดไฟล์',
      403,
    );
    check(row.evidence_file, 'ยังไม่มีไฟล์', 404);
    res.sendFile(path.join(folder, row.evidence_file));
  }),
);
// GET /api/signatures/:id — เปิดภาพลายเซ็น path: id = assignment id
router.get(
  '/signatures/:id',
  route(async (req, res) => {
    const rows = await query(
      'SELECT a.*,p.user_id,r.published FROM assignments a JOIN participants p ON p.id=a.participant_id JOIN periods r ON r.id=p.period_id WHERE a.id=?',
      [req.params.id],
    );
    check(rows.length, 'ไม่พบงาน', 404);
    const a = rows[0];
    check(
      req.user.role === 'admin' ||
        a.evaluator_id === req.user.id ||
        (a.user_id === req.user.id && a.published),
      'ไม่มีสิทธิ์',
      403,
    );
    check(a.signature, 'ยังไม่มีลายเซ็น', 404);
    res.sendFile(path.join(folder, a.signature));
  }),
);
module.exports = router;
