const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { query } = require('../db');
const { check, text, ok, route } = require('../helpers');
const { auth, role, token } = require('../auth');
const fields = 'id,username,full_name,department,position,role,active';
function password(value) {
  check(
    typeof value === 'string' && value.length >= 8 && Buffer.byteLength(value) <= 72,
    'รหัสผ่านอย่างน้อย 8 ตัวอักษร ไม่เกิน 72 ไบต์',
  );
  return value;
}
// POST /api/login — เข้าสู่ระบบ body: username, password → data.token (JWT)
router.post(
  '/login',
  route(async (req, res) => {
    const rows = await query('SELECT * FROM users WHERE username=?', [text(req.body.username, 50)]);
    const user = rows[0];
    check(
      user && user.active && (await bcrypt.compare(String(req.body.password || ''), user.password)),
      'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง',
      401,
    );
    ok(res, { token: token(user) });
  }),
);
// POST /api/register — สมัครผู้รับการประเมิน body: username, password, full_name
router.post(
  '/register',
  route(async (req, res) => {
    const b = req.body;
    await query('INSERT INTO users(username,password,full_name,role) VALUES(?,?,?,?)', [
      text(b.username, 50),
      await bcrypt.hash(password(b.password), 10),
      text(b.full_name),
      'evaluatee',
    ]);
    ok(res, null, 'สมัครแล้ว เข้าสู่ระบบได้');
  }),
);
// GET /api/me — ข้อมูลผู้ใช้ที่ login อยู่ (ต้องมี token)
router.get(
  '/me',
  auth,
  route(async (req, res) => ok(res, req.user)),
);
// PUT /api/me/password — เปลี่ยนรหัสผ่าน body: current_password, new_password, confirm_password
router.put(
  '/me/password',
  auth,
  route(async (req, res) => {
    const b = req.body;
    const next = password(b.new_password);
    check(next === b.confirm_password, 'ยืนยันรหัสผ่านไม่ตรงกัน');
    const [user] = await query('SELECT * FROM users WHERE id=?', [req.user.id]);
    check(
      await bcrypt.compare(String(b.current_password || ''), user.password),
      'รหัสผ่านปัจจุบันไม่ถูกต้อง',
      400,
    );
    check(next !== b.current_password, 'รหัสผ่านใหม่ต้องต่างจากรหัสเดิม');
    await query('UPDATE users SET password=?,must_change_password=0 WHERE id=?', [
      await bcrypt.hash(next, 10),
      user.id,
    ]);
    ok(res, null, 'เปลี่ยนรหัสผ่านแล้ว');
  }),
);
// PUT /api/me — แก้ข้อมูลส่วนตัว body: full_name, department, position
router.put(
  '/me',
  auth,
  route(async (req, res) => {
    const b = req.body;
    await query('UPDATE users SET full_name=?,department=?,position=? WHERE id=?', [
      text(b.full_name),
      text(b.department, 100, false),
      text(b.position, 100, false),
      req.user.id,
    ]);
    ok(res);
  }),
);
// GET /api/users — รายชื่อผู้ใช้ทั้งหมด (admin)
router.get(
  '/users',
  auth,
  role('admin'),
  route(async (req, res) => ok(res, await query(`SELECT ${fields} FROM users ORDER BY id`))),
);
// POST /api/users — เพิ่มผู้ใช้ body: username, password, full_name, department, position, role (admin)
router.post(
  '/users',
  auth,
  role('admin'),
  route(async (req, res) => {
    const b = req.body;
    check(['evaluatee', 'evaluator'].includes(b.role), 'เลือกบทบาทให้ถูกต้อง');
    await query(
      'INSERT INTO users(username,password,full_name,department,position,role) VALUES(?,?,?,?,?,?)',
      [
        text(b.username, 50),
        await bcrypt.hash(password(b.password), 10),
        text(b.full_name),
        text(b.department, 100, false),
        text(b.position, 100, false),
        b.role,
      ],
    );
    ok(res);
  }),
);
// PUT /api/users/:id — แก้ผู้ใช้ path: id body: full_name, department, position, active (admin)
router.put(
  '/users/:id',
  auth,
  role('admin'),
  route(async (req, res) => {
    const b = req.body;
    check(Number(req.params.id) !== req.user.id || b.active, 'ห้ามปิดบัญชีตนเอง');
    const result = await query(
      'UPDATE users SET full_name=?,department=?,position=?,active=? WHERE id=?',
      [
        text(b.full_name),
        text(b.department, 100, false),
        text(b.position, 100, false),
        b.active ? 1 : 0,
        req.params.id,
      ],
    );
    check(result.affectedRows, 'ไม่พบผู้ใช้', 404);
    ok(res);
  }),
);
module.exports = router;
