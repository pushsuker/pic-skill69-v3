# ขั้น 1 — ตารางฐานข้อมูล และโครง Backend

**ใครทำ:** คนที่ 1 (Backend) · คนที่ 2 เริ่มพิมพ์ไฟล์ frontend ของขั้น 2 ล่วงหน้าได้ (ยังไม่ต้องรัน) · คนที่ 3 ทำผังงาน
**เวลา:** 40 นาที
**คะแนนที่ได้เมื่อผ่าน:** 2.1 มีอย่างน้อย 3 ตาราง · 2.2 ตารางสัมพันธ์กัน · 2.3 ชนิดข้อมูลเหมาะสม · 2.5 ตั้งชื่อตามมาตรฐาน (รวม 4 คะแนน)

## 1.1 ตารางฐานข้อมูล `backend/schema.sql`

📄 **`backend/schema.sql`**

```sql
-- 8 ตาราง อ่านจากบนลงล่าง ตารางลูกอ้างถึงตารางแม่ด้วย FOREIGN KEY
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  department VARCHAR(100) NOT NULL DEFAULT '',
  position VARCHAR(100) NOT NULL DEFAULT '',
  role ENUM('admin','evaluatee','evaluator') NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  must_change_password BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE TABLE IF NOT EXISTS periods (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  year INT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status ENUM('draft','open','closed') NOT NULL DEFAULT 'draft',
  published BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE TABLE IF NOT EXISTS topics (
  id INT AUTO_INCREMENT PRIMARY KEY,
  period_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  FOREIGN KEY (period_id) REFERENCES periods(id)
);
CREATE TABLE IF NOT EXISTS indicators (
  id INT AUTO_INCREMENT PRIMARY KEY,
  topic_id INT NOT NULL,
  name VARCHAR(150) NOT NULL,
  detail TEXT NOT NULL,
  weight DECIMAL(8,2) NOT NULL,
  score_type ENUM('scale4','boolean') NOT NULL,
  evidence_type ENUM('none','file','url') NOT NULL,
  evidence_required BOOLEAN NOT NULL DEFAULT FALSE,
  FOREIGN KEY (topic_id) REFERENCES topics(id)
);
CREATE TABLE IF NOT EXISTS participants (
  id INT AUTO_INCREMENT PRIMARY KEY,
  period_id INT NOT NULL,
  user_id INT NOT NULL,
  submitted BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (period_id,user_id),
  FOREIGN KEY (period_id) REFERENCES periods(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS assignments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  participant_id INT NOT NULL,
  evaluator_id INT NOT NULL,
  committee_role ENUM('chair','member') NOT NULL,
  comment TEXT,
  signature VARCHAR(100),
  submitted BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (participant_id,evaluator_id),
  FOREIGN KEY (participant_id) REFERENCES participants(id),
  FOREIGN KEY (evaluator_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS self_scores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  participant_id INT NOT NULL,
  indicator_id INT NOT NULL,
  score INT NOT NULL,
  description TEXT NOT NULL,
  evidence_url VARCHAR(1000) NOT NULL DEFAULT '',
  evidence_file VARCHAR(100),
  UNIQUE (participant_id,indicator_id),
  FOREIGN KEY (participant_id) REFERENCES participants(id),
  FOREIGN KEY (indicator_id) REFERENCES indicators(id)
);
CREATE TABLE IF NOT EXISTS scores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  assignment_id INT NOT NULL,
  indicator_id INT NOT NULL,
  score INT NOT NULL,
  UNIQUE (assignment_id,indicator_id),
  FOREIGN KEY (assignment_id) REFERENCES assignments(id),
  FOREIGN KEY (indicator_id) REFERENCES indicators(id)
);
```

**เข้าใจโค้ด (คนที่ 1 ต้องอธิบายกรรมการได้)**

| ตาราง | เก็บอะไร | สัมพันธ์กับ |
|---|---|---|
| `users` | ผู้ใช้ทุกบทบาท (`admin`, `evaluatee` ผู้รับ, `evaluator` กรรมการ) | — |
| `periods` | รอบประเมิน วันเริ่ม–สิ้นสุด สถานะ `draft/open/closed` | — |
| `topics` | หัวข้อการประเมินในแต่ละรอบ | `period_id` → `periods` |
| `indicators` | ตัวชี้วัด น้ำหนัก ชนิดคะแนน (`scale4` 1–4 หรือ `boolean` มี/ไม่มี) ชนิดหลักฐาน | `topic_id` → `topics` |
| `participants` | ผู้รับที่อยู่ในรอบ | `period_id` → `periods`, `user_id` → `users` |
| `assignments` | กรรมการที่ถูกมอบหมายให้ผู้รับ หน้าที่ประธาน/กรรมการร่วม ความเห็น ลายเซ็น | `participant_id` → `participants`, `evaluator_id` → `users` |
| `self_scores` | คะแนนที่ผู้รับประเมินตนเอง + หลักฐาน | `participant_id`, `indicator_id` |
| `scores` | คะแนนที่กรรมการให้ | `assignment_id`, `indicator_id` |

- ชนิดข้อมูล: `INT AUTO_INCREMENT` รหัส, `VARCHAR(n)` ข้อความสั้น, `TEXT` ข้อความยาว, `DATE` วันที่, `DECIMAL(8,2)` น้ำหนักทศนิยม, `ENUM` ค่าที่เลือกได้จำกัด, `BOOLEAN` ใช่/ไม่ใช่
- ชื่อตาราง/ฟิลด์เป็นภาษาอังกฤษตัวเล็ก คั่นด้วย `_` (snake_case) ตารางเป็นพหูพจน์ คีย์นอกลงท้าย `_id`
- `UNIQUE (period_id,user_id)` กันเพิ่มคนเดิมซ้ำในรอบเดียว

## 1.2 `backend/package.json`

📄 **`backend/package.json`**

```json
{
  "name": "bpes-api",
  "private": true,
  "version": "1.0.0",
  "scripts": {
    "seed": "node seed.js",
    "start": "node server.js",
    "dev": "nodemon -L server.js",
    "test": "node --test tests/score.test.js",
    "test:api": "node --test tests/api.test.js"
  },
  "dependencies": {
    "bcryptjs": "^2.4.3",
    "express": "^4.21.2",
    "jsonwebtoken": "^9.0.2",
    "multer": "^2.0.2",
    "mysql2": "^3.14.0"
  },
  "devDependencies": {
    "nodemon": "^3.1.10"
  }
}
```

- `nodemon -L` รีสตาร์ต server เองเมื่อแก้ไฟล์ (`-L` จำเป็นเมื่อรันบน Docker ใน Windows)

## 1.3 เชื่อมฐานข้อมูล `backend/db.js`

📄 **`backend/db.js`**

```js
// เชื่อมต่อ MySQL ค่าทั้งหมดมาจาก environment ใน docker-compose.yml
const mysql = require('mysql2/promise');
const settings = {
  host: process.env.DB_HOST || 'db',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'bpes',
  dateStrings: true,
};
const pool = mysql.createPool(settings);
async function query(sql, values = []) {
  const [rows] = await pool.execute(sql, values);
  return rows;
}
module.exports = { query, pool, settings };
```

- `process.env.DB_HOST` อ่านค่าจาก `environment` ใน `docker-compose.yml` ชื่อ `db` คือชื่อ service ของ MySQL
- `query(sql, values)` ใช้ `?` แทนค่าเสมอ ป้องกัน SQL Injection

## 1.4 ตัวช่วยที่ทุกไฟล์ใช้ `backend/helpers.js`

📄 **`backend/helpers.js`**

```js
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
```

ฟังก์ชันสำคัญ:

- `check(เงื่อนไข, ข้อความ, status)` ถ้าเงื่อนไขเป็นเท็จ จะโยน error พร้อมรหัส HTTP ไปให้ตัวจัดการ error ใน `server.js`
- `text(value, max, required)` ตัดช่องว่าง ตรวจว่าไม่ว่างและไม่ยาวเกิน (Validate)
- `ok(res, data, message)` ตอบ JSON รูปแบบเดียวกันทุก API `{status, message, data}`
- `route(fn)` ห่อฟังก์ชัน async ให้ error ไหลไปที่ตัวจัดการกลาง
- `percentage(...)` คำนวณคะแนนถ่วงน้ำหนักเป็นร้อยละ (ใช้ทดสอบ Unit Test ในขั้น 7)

## 1.5 สร้างตารางและบัญชีฝึก `backend/seed.js`

📄 **`backend/seed.js`**

```js
// รันทุกครั้งที่ backend เริ่ม: สร้างตารางจาก schema.sql และบัญชีฝึก ไม่ลบข้อมูลเดิม
const fs = require('node:fs');
const path = require('node:path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const { settings } = require('./db');
async function seed() {
  const db = await mysql.createConnection({ ...settings, multipleStatements: true });
  try {
    await db.query(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));
    const users = [
      ['admin', 'Admin1234!', 'ฝ่ายบุคลากร', 'admin'],
      ['emp001', 'Emp1234!', 'ผู้รับหนึ่ง', 'evaluatee'],
      ['emp002', 'Emp1234!', 'ผู้รับสอง', 'evaluatee'],
      ['eval01', 'Eval1234!', 'กรรมการหนึ่ง', 'evaluator'],
      ['eval02', 'Eval1234!', 'กรรมการสอง', 'evaluator'],
    ];
    for (const [username, password, name, role] of users) {
      await db.execute(
        'INSERT IGNORE INTO users(username,password,full_name,role) VALUES(?,?,?,?)',
        [username, await bcrypt.hash(password, 10), name, role],
      );
    }
    console.log('seed เสร็จ ฐานข้อมูล:', settings.database);
  } finally {
    await db.end();
  }
}
seed().catch((error) => {
  console.error('seed ไม่สำเร็จ:', error.code || error.message);
  process.exit(1);
});
```

- รันทุกครั้งที่ backend เริ่ม แต่ใช้ `CREATE TABLE IF NOT EXISTS` และ `INSERT IGNORE` จึงไม่ลบข้อมูลเดิม
- รหัสผ่านเก็บแบบ hash ด้วย `bcrypt` ไม่เก็บรหัสจริง

## 1.6 ตัวเซิร์ฟเวอร์ `backend/server.js`

พิมพ์ตามนี้ **รวมบรรทัดที่มี `//` นำหน้าด้วย** บรรทัดเหล่านั้นคือของขั้นต่อไป ตอนนี้ปิดไว้ก่อน

📄 **`backend/server.js`**

```js
// ลำดับสำคัญ: JSON → Login → ตรวจ token → API ตามระบบ → error (ไม่ส่งหน้าเว็บ)
const express = require('express');
const { query } = require('./db');
const { ok, route } = require('./helpers');
// const { auth } = require('./auth'); // ขั้น 2
const app = express();
app.use(express.json());

// GET /api/health ตรวจว่า API ต่อฐานข้อมูลได้
app.get(
  '/api/health',
  route(async (req, res) => {
    await query('SELECT 1 FROM users LIMIT 1');
    ok(res, { ready: true });
  }),
);
// app.use('/api', require('./routes/users')); // ขั้น 2
// app.use('/api', auth); // ขั้น 2
// app.use('/api', require('./routes/periods')); // ขั้น 3
// app.use('/api', require('./routes/self')); // ขั้น 4
// app.use('/api', require('./routes/files')); // ขั้น 4
// app.use('/api', require('./routes/evaluate')); // ขั้น 5
// app.use('/api', require('./routes/reports')); // ขั้น 6

// ไม่พบ API → 404
app.use('/api', (req, res) =>
  res.status(404).json({ status: 'error', message: 'ไม่พบ API', data: null }),
);
// จัดการ error ทุกชนิดที่เดียว (Exception Handling)
app.use((error, req, res, next) => {
  let message = error.message,
    status = error.status || 500;
  if (error.code === 'ER_DUP_ENTRY') {
    message = 'ข้อมูลซ้ำ กรุณาตรวจชื่อผู้ใช้หรือรายการที่เพิ่ม';
    status = 400;
  }
  if (error.code === 'LIMIT_FILE_SIZE') {
    message = 'ไฟล์เกิน 5 MB';
    status = 400;
  }
  if (error.type === 'entity.parse.failed') {
    message = 'รูปแบบ JSON ไม่ถูกต้อง';
    status = 400;
  }
  if (status === 500) {
    console.error(error);
    message = 'ระบบขัดข้อง (' + (error.code || error.message) + ') ตรวจ log ของ backend';
  }
  res.status(status).json({ status: 'error', message, data: null });
});
const port = Number(process.env.PORT || 3301);
// 0.0.0.0 = รับการเชื่อมต่อจากนอก container
app.listen(port, '0.0.0.0', () => console.log('API พร้อมที่ http://localhost:' + port));
```

- ลำดับ `app.use` สำคัญ: อ่าน JSON → API ที่ไม่ต้อง login → `auth` ตรวจ token → API ที่ต้อง login → 404 → ตัวจัดการ error
- `0.0.0.0` ทำให้เข้าจากนอก container ได้ ถ้าใส่ `127.0.0.1` จะเข้าจากเบราว์เซอร์ไม่ได้

## 1.7 รัน backend

```powershell
docker compose up -d db phpmyadmin backend
docker compose logs -f backend
```

รอจนเห็น `seed เสร็จ ฐานข้อมูล: bpes` และ `API พร้อมที่ http://localhost:3301` แล้วกด `Ctrl+C` เพื่อออกจากการดู log (backend ยังรันต่อ)

## ✅ จุดเช็กขั้น 1

| ตรวจ | ผลที่ต้องเห็น |
|---|---|
| เบราว์เซอร์เปิด http://localhost:3301/api/health | `{"status":"success","message":"สำเร็จ","data":{"ready":true}}` |
| phpMyAdmin → ฐาน `bpes` | มี 8 ตาราง: assignments, indicators, participants, periods, scores, self_scores, topics, users |
| ตาราง `users` → Browse | มี 5 แถว admin, emp001, emp002, eval01, eval02 รหัสผ่านเป็นตัวอักษรยาว ๆ (hash) |
| phpMyAdmin → `bpes` → แท็บ Designer | เห็นเส้นความสัมพันธ์ระหว่างตาราง (คนที่ 3 ใช้วาด ER) |

## 💾 บันทึก

```powershell
git add -A
git commit -m "ขั้น 1 ผ่าน: ตาราง 8 ตาราง + health"
```

**แจ้งคนที่ 3:** ตารางพร้อมแล้ว เริ่มวาด ER-Diagram ได้

## ❌ ถ้าไม่ผ่าน

- log ขึ้น `seed ไม่สำเร็จ: ER_PARSE_ERROR` → `schema.sql` พิมพ์ผิด (ลืม `,` หรือ `)`) ดูชื่อตารางที่ error แก้แล้ว `docker compose restart backend`
- log ขึ้น `ECONNREFUSED` → MySQL ยังไม่พร้อม รอแล้ว `docker compose restart backend`
- log ขึ้น `Cannot find module './xxx'` → ชื่อไฟล์ผิด หรือลืมใส่ `//` หน้าบรรทัดของขั้นต่อไปใน `server.js`
- log ขึ้น `SyntaxError` → ดูชื่อไฟล์และเลขบรรทัดใน log แล้วแก้ที่นั่น
- `/api/health` ขึ้น `ระบบขัดข้อง` → ตาราง `users` ยังไม่ถูกสร้าง ดู log ของ seed
