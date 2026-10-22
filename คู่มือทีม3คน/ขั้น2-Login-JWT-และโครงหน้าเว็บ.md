# ขั้น 2 — Login ด้วย JWT และโครงหน้าเว็บ

**ใครทำ:** คนที่ 1 ทำ 2A (API) · คนที่ 2 ทำ 2B (หน้าเว็บ) พร้อมกัน · คนที่ 3 วาด ER แล้วทดสอบ Login ด้วย Thunder Client
**เวลา:** 45 นาที
**คะแนนที่ได้เมื่อผ่าน:** 6.2 POST รับ body · 6.4 Login JWT · 6.5 จัดการ error · 6.6 รูปแบบ JSON · 6.9 แยกไฟล์/router/async · 6.10 ตรวจสิทธิ์ · 5.2.1 สมัครใช้งาน · 5.2.2 แก้ข้อมูลส่วนตัว (รวม 8 คะแนน)

---

## 2A — คนที่ 1: API เข้าสู่ระบบและผู้ใช้

### `backend/auth.js` — ตรวจ token และบทบาท

📄 **`backend/auth.js`**

```js
const jwt = require('jsonwebtoken');
const { query } = require('./db');
const { check, route } = require('./helpers');
const secret = process.env.JWT_SECRET;
if (!secret || secret.length < 32) throw Error('ตั้ง JWT_SECRET ใน docker-compose.yml ให้ยาวอย่างน้อย 32 ตัวอักษร');
const auth = route(async (req, res, next) => {
  let payload;
  try {
    payload = jwt.verify((req.headers.authorization || '').replace('Bearer ', ''), secret);
  } catch {
    check(false, 'กรุณาเข้าสู่ระบบ', 401);
  }
  const rows = await query(
    'SELECT id,username,full_name,department,position,role,active,must_change_password FROM users WHERE id=?',
    [payload.id],
  );
  check(rows.length && rows[0].active, 'บัญชีถูกปิดหรือไม่พบผู้ใช้', 401);
  req.user = rows[0];
  // บัญชีที่ยังไม่เปลี่ยนรหัสครั้งแรก ใช้ได้แค่ดูข้อมูลตัวเองกับเปลี่ยนรหัส
  check(
    !req.user.must_change_password ||
      (req.method === 'GET' && req.path === '/me') ||
      (req.method === 'PUT' && req.path === '/me/password'),
    'กรุณาเปลี่ยนรหัสผ่านครั้งแรกก่อนใช้งาน',
    403,
  );
  next();
});
function role(name) {
  return (req, res, next) =>
    req.user.role === name
      ? next()
      : res.status(403).json({ status: 'error', message: 'ไม่มีสิทธิ์', data: null });
}
function token(user) {
  return jwt.sign({ id: user.id }, secret, { expiresIn: '8h' });
}
module.exports = { auth, role, token };
```

**เข้าใจโค้ด**

- `jwt.sign({id}, secret, {expiresIn:'8h'})` สร้าง token ที่ **ลงนาม** ด้วย `JWT_SECRET` ใครแก้ token เองลายเซ็นจะไม่ตรง
- `auth` อ่าน header `Authorization: Bearer <token>` → `jwt.verify` → หา user ในฐาน → เก็บไว้ที่ `req.user` ถ้าผิดตอบ 401
- ถ้า `must_change_password` ยังเป็น 1 จะใช้ได้แค่ `GET /me` กับ `PUT /me/password` (บังคับเปลี่ยนรหัสครั้งแรก) ตอบ 403
- `role('admin')` กันคนผิดบทบาท ตอบ 403
- เปลี่ยนรหัสสำเร็จ → `must_change_password` เป็น 0 → token เดิมใช้ทุก API ได้ทันที ไม่ต้อง login ใหม่

### `backend/routes/users.js` — login, สมัคร, ข้อมูลส่วนตัว, จัดการผู้ใช้

📄 **`backend/routes/users.js`**

```js
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
```

- `/login` และ `/register` ไม่ต้องมี token ส่วนอื่นใส่ `auth` ไว้ในบรรทัดของตัวเอง
- `bcrypt.compare` เทียบรหัสที่พิมพ์กับ hash ในฐาน
- คอมเมนต์ `// POST /api/login — ...` เหนือทุก route คือคำอธิบาย API และ parameter (เกณฑ์ 6.7, 6.8)

### เปิดใช้ใน `server.js`

เปิด `backend/server.js` แล้ว **ลบ `// ` หน้าบรรทัดที่ลงท้าย `// ขั้น 2` ทั้ง 3 บรรทัด** ให้เป็นแบบนี้

```js
const { auth } = require('./auth'); // ขั้น 2
...
app.use('/api', require('./routes/users')); // ขั้น 2
app.use('/api', auth); // ขั้น 2
```

nodemon จะรีสตาร์ตเอง ดู log ด้วย `docker compose logs -f backend`

### ✅ จุดเช็ก 2A (คนที่ 1 หรือคนที่ 3 ใช้ Thunder Client ใน VS Code)

| คำขอ | ผลที่ต้องเห็น |
|---|---|
| `POST http://localhost:3301/api/login` Body → JSON `{"username":"admin","password":"Admin1234!"}` | 200 และ `data.token` เป็นข้อความยาว |
| ซ้ำแต่รหัสผิด `"password":"ผิด"` | 401 `ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง` |
| `GET http://localhost:3301/api/me` ไม่ใส่ token | 401 `กรุณาเข้าสู่ระบบ` |
| `GET .../api/me` แท็บ Auth → Bearer ใส่ token | 200 ได้ข้อมูล admin `must_change_password: 1` |
| `GET .../api/users` ใส่ token เดิม | 403 `กรุณาเปลี่ยนรหัสผ่านครั้งแรกก่อนใช้งาน` (ถูกต้อง) |
| `GET .../api/ไม่มี` | 404 `ไม่พบ API` |

คนที่ 3 จับภาพหน้าจอ Thunder Client ทุกข้อเก็บไว้ใน `docs/ทดสอบ/` ใช้เป็นหลักฐานส่วน 7

💾 `git add -A` แล้ว `git commit -m "ขั้น 2A ผ่าน: login JWT"`

---

## 2B — คนที่ 2: โครงหน้าเว็บ Vue + Vuetify

### `frontend/package.json`

📄 **`frontend/package.json`**

```json
{
  "name": "bpes-web",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build"
  },
  "dependencies": {
    "@mdi/font": "^7.4.47",
    "vue": "^3.4.29",
    "vuetify": "^3.13.5"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^6.0.9",
    "vite": "^7.3.6"
  }
}
```

### `frontend/vite.config.js`

📄 **`frontend/vite.config.js`**

```js
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// หน้าเว็บเรียก /api แล้ว Vite ส่งต่อไป backend (ชื่อ service ใน docker-compose)
const target = process.env.API_URL || 'http://localhost:3301';
export default defineConfig({
  plugins: [vue()],
  server: {
    host: '0.0.0.0',
    port: 5175,
    strictPort: true,
    proxy: { '/api': target },
    watch: { usePolling: true }, // Windows + Docker ต้องใช้ polling ถึงจะเห็นไฟล์ที่แก้
  },
});
```

- `proxy: { '/api': target }` หน้าเว็บเรียก `/api/...` แล้ว Vite ส่งต่อไป backend ทำให้ไม่ต้องตั้ง CORS
- `API_URL` มาจาก `docker-compose.yml` คือ `http://backend:3301`

### `frontend/index.html`

📄 **`frontend/index.html`**

```html
<!doctype html>
<html lang="th">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>ประเมินบุคลากร • Vue / API</title>
  </head>
  <body><div id="app"></div><script type="module" src="/src/main.js"></script></body>
</html>
```

`meta viewport` สำคัญสำหรับการแสดงผลบนมือถือ (เกณฑ์ 7.8)

### `frontend/src/main.js`

📄 **`frontend/src/main.js`**

```js
import { createApp } from 'vue';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';
import 'vuetify/styles';
import '@mdi/font/css/materialdesignicons.css';
import './style.css';
import App from './App.vue';

const vuetify = createVuetify({
  components,
  directives,
  defaults: {
    VTextField: { variant: 'outlined' },
    VTextarea: { variant: 'outlined', rows: 3 },
    VSelect: { variant: 'outlined' },
    VFileInput: { variant: 'outlined' },
  },
});
const app = createApp(App);
app.use(vuetify);
let screen;
app.config.errorHandler = (error) => {
  if (screen) screen.error = error.message;
};
screen = app.mount('#app');
```

- ลงทะเบียน Vuetify ทั้งชุด จึงใช้ `<v-btn>`, `<v-text-field>` ได้ทุกหน้า
- `app.config.errorHandler` จับ error ทุกหน้าแล้วแสดงในกล่องแดงด้านบน ไม่ต้องเขียน try/catch ทุกปุ่ม

### `frontend/src/api.js` — ทุกหน้าเรียก API ผ่านไฟล์นี้

📄 **`frontend/src/api.js`**

```js
// หน้าจอทุกหน้าใช้รูปแบบเดียวกัน: api(พาธ, วิธีส่ง, ข้อมูล)
export async function api(url, method = 'GET', data) {
  const headers = { Authorization: 'Bearer ' + (localStorage.getItem('split_token') || '') };
  const options = { method, headers };
  if (data instanceof FormData) options.body = data;
  else if (data !== undefined) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(data);
  }
  const response = await fetch('/api' + url, options);
  let result;
  try {
    result = await response.json();
  } catch {
    throw Error('เชื่อมต่อ API ไม่ได้ ตรวจว่า backend เปิดพอร์ต 3301 อยู่');
  }
  if (!response.ok) throw Error(result.message);
  return result.data;
}
export async function fileBlob(url) {
  const response = await fetch('/api' + url, {
    headers: { Authorization: 'Bearer ' + localStorage.getItem('split_token') },
  });
  if (!response.ok) {
    const data = await response.json();
    throw Error(data.message);
  }
  return URL.createObjectURL(await response.blob());
}
export async function openFile(url) {
  const blob = await fileBlob(url);
  const a = document.createElement('a');
  a.href = blob;
  a.target = '_blank';
  a.rel = 'noopener';
  a.click();
  setTimeout(() => URL.revokeObjectURL(blob), 60000);
}
export function mayEdit(period) {
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' });
  return period.status === 'open' && today >= period.start_date && today <= period.end_date;
}
```

- `api('/login', 'POST', {...})` แนบ token จาก `localStorage` ให้อัตโนมัติ
- ถ้า API ตอบไม่ใช่ 2xx จะโยน error ข้อความจาก backend ไปแสดงในกล่องแดง

### `frontend/src/style.css`

📄 **`frontend/src/style.css`**

```css
[v-cloak] {
  display: none;
}
body {
  font-family: Tahoma, 'Leelawadee UI', sans-serif;
  color: #243648;
  background: #f2f5f8;
}
header {
  padding: 18px 24px;
  background: #164d72;
  color: white;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}
header strong {
  font-size: 22px;
}
header small {
  display: block;
}
nav {
  padding: 12px 24px;
  background: white;
  border-bottom: 1px solid #d5e0e8;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
main {
  max-width: 1120px;
  width: 100%;
  margin: 24px auto;
  padding: 0 20px 50px;
}
h1 {
  font-size: 26px;
  margin: 12px 0 20px;
}
h2 {
  font-size: 21px;
  margin: 20px 0 14px;
}
h3 {
  font-size: 18px;
  margin: 8px 0;
}
p {
  margin: 10px 0;
  line-height: 1.8;
}
.v-input {
  margin: 12px 0;
}
.box {
  background: white;
  padding: 22px;
  border: 1px solid #d2dfe8;
  border-radius: 8px;
  margin-bottom: 20px;
}
.login {
  max-width: 460px;
  margin: 35px auto;
}
.grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 20px;
}
.actions {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
  margin: 16px 0;
}
.table-wrap {
  overflow: auto;
  margin: 18px 0;
}
table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  font-size: 15px;
}
th,
td {
  border: 1px solid #d2dfe8;
  padding: 12px;
  text-align: left;
  vertical-align: top;
}
th {
  background: #e8f1f7;
  white-space: nowrap;
}
td {
  overflow-wrap: anywhere;
}
.muted {
  color: #526a7c;
}
.progress {
  font-weight: bold;
  color: #145743;
}
.signature {
  display: block;
  max-width: 200px;
  max-height: 90px;
  margin: 12px 0;
}
.big-number {
  font-size: 30px;
  font-weight: bold;
  color: #164d72;
}
a {
  color: #155c8d;
  overflow-wrap: anywhere;
}
.v-btn {
  text-transform: none;
  letter-spacing: 0;
}
.v-alert {
  margin-bottom: 16px;
}
.v-btn__content {
  white-space: normal;
}
hr {
  border: 0;
  border-top: 1px solid #d2dfe8;
  margin: 24px 0;
}
@media (max-width: 650px) {
  main {
    padding: 0 12px;
    margin-top: 14px;
  }
  .grid {
    grid-template-columns: 1fr;
  }
  .box {
    padding: 16px;
  }
  header {
    padding: 16px;
  }
  header strong {
    font-size: 19px;
  }
  nav {
    padding: 10px;
  }
  h1 {
    font-size: 23px;
  }
  th,
  td {
    padding: 9px;
    min-width: 92px;
  }
}
@media print {
  @page {
    size: A4;
    margin: 15mm;
  }
  header,
  nav,
  .no-print,
  .v-alert {
    display: none !important;
  }
  main {
    margin: 0;
    max-width: none;
    padding: 0;
  }
  .box {
    border: 0;
    padding: 0;
    box-shadow: none;
  }
  body {
    background: white;
    color: black;
    font-size: 11pt;
  }
  .table-wrap {
    overflow: visible;
  }
  table {
    table-layout: fixed;
    font-size: 10pt;
  }
  thead {
    display: table-header-group;
  }
  th,
  td {
    min-width: 0;
    white-space: normal;
    overflow-wrap: anywhere;
  }
  tr,
  .committee {
    break-inside: avoid;
  }
  h1,
  h2,
  h3 {
    break-after: avoid;
  }
  .signature {
    max-height: 65px;
  }
}

@media print {
  .v-table__wrapper {
    overflow: visible !important;
    height: auto !important;
  }
}
```

`@media (max-width: 650px)` ปรับหน้าจอมือถือ · `@media print` ใช้ตอนพิมพ์รายงาน

### `frontend/src/App.vue` — โครงหลัก เมนู และสลับหน้า

พิมพ์ตามนี้ หน้าที่ยังไม่ถึงขั้นจะ import จาก `NotReady.vue` ไว้ก่อน

📄 **`frontend/src/App.vue`**

```vue
<template>
  <v-app>
    <header>
      <div>
        <strong>PIC • ประเมินบุคลากร</strong>
        <small>ฉบับแยก Vue / API</small>
      </div>
      <div v-if="user">
        {{ user.full_name }}
        <v-btn variant="outlined" color="white" @click="logout">ออกจากระบบ</v-btn>
      </div>
    </header>
    <nav v-if="user && !user.must_change_password">
      <template v-if="user.role === 'admin'">
        <v-btn :variant="page === 'periods' ? 'tonal' : 'text'" @click="go('periods')">
          รอบประเมิน
        </v-btn>
        <v-btn :variant="page === 'users' ? 'tonal' : 'text'" @click="go('users')"> ผู้ใช้ </v-btn>
      </template>
      <v-btn v-if="user.role === 'evaluatee'" @click="go('self')">ประเมินตนเอง</v-btn>
      <v-btn v-if="user.role === 'evaluatee'" @click="go('my-results')">ผลการประเมินของฉัน</v-btn>
      <v-btn v-if="user.role === 'evaluator'" @click="go('evaluate')">งานกรรมการ</v-btn>
      <v-btn @click="go('profile')">ข้อมูลส่วนตัว</v-btn>
      <v-btn @click="go('password')">เปลี่ยนรหัสผ่าน</v-btn>
    </nav>
    <main>
      <v-alert v-if="error" type="error" closable @click:close="error = ''">
        {{ error }}
      </v-alert>
      <v-alert v-if="message" type="success" closable @click:close="message = ''">
        {{ message }}
      </v-alert>
      <login-page v-if="!user" @logged-in="login"></login-page>
      <template v-else>
        <password-page v-if="page === 'password'"></password-page>
        <my-results-page v-if="page === 'my-results'" @result="result"></my-results-page>
        <profile-page v-if="page === 'profile'"></profile-page>
        <users-page v-if="page === 'users'"></users-page>
        <periods-page v-if="page === 'periods'" @report="report"></periods-page>
        <self-page v-if="page === 'self'" @result="result"></self-page>
        <evaluate-page v-if="page === 'evaluate'"></evaluate-page>
        <reports-page
          v-if="page === 'reports'"
          :key="periodId + '-' + participantId"
          :period-id="periodId"
          :participant-id="participantId"
        ></reports-page>
      </template>
    </main>
  </v-app>
</template>

<script>
import { api } from './api';
import LoginPage from './pages/LoginPage.vue';
import ProfilePage from './pages/ProfilePage.vue';
import UsersPage from './pages/NotReady.vue'; // ขั้น 3 เปลี่ยนเป็น './pages/UsersPage.vue'
import PeriodsPage from './pages/NotReady.vue'; // ขั้น 3 เปลี่ยนเป็น './pages/PeriodsPage.vue'
import SelfPage from './pages/NotReady.vue'; // ขั้น 4 เปลี่ยนเป็น './pages/SelfPage.vue'
import EvaluatePage from './pages/NotReady.vue'; // ขั้น 5 เปลี่ยนเป็น './pages/EvaluatePage.vue'
import ReportsPage from './pages/NotReady.vue'; // ขั้น 6 เปลี่ยนเป็น './pages/ReportsPage.vue'
import PasswordPage from './pages/PasswordPage.vue';
import MyResultsPage from './pages/NotReady.vue'; // ขั้น 6 เปลี่ยนเป็น './pages/MyResultsPage.vue'
export default {
  components: {
    LoginPage,
    ProfilePage,
    UsersPage,
    PeriodsPage,
    SelfPage,
    EvaluatePage,
    ReportsPage,
    PasswordPage,
    MyResultsPage,
  },
  data() {
    return { user: null, page: '', error: '', message: '', periodId: null, participantId: null };
  },
  async mounted() {
    if (localStorage.getItem('split_token')) {
      try {
        await this.login();
      } catch {
        this.logout();
      }
    }
  },
  methods: {
    async login() {
      this.user = await api('/me');
      this.go(
        this.user.role === 'admin'
          ? 'periods'
          : this.user.role === 'evaluatee'
            ? 'self'
            : 'evaluate',
      );
    },
    logout() {
      localStorage.removeItem('split_token');
      this.user = null;
      this.page = '';
      this.error = '';
      this.message = '';
    },
    go(page) {
      this.page = this.user?.must_change_password ? 'password' : page;
      this.error = '';
      this.message = '';
    },
    report(id) {
      this.periodId = id;
      this.participantId = null;
      this.go('reports');
    },
    result(id) {
      this.participantId = id;
      this.periodId = null;
      this.go('reports');
    },
  },
};
</script>
```

- ไม่มี Router: ใช้ตัวแปร `page` เลือกว่าจะแสดงหน้าไหน (`v-if`)
- เมนูแสดงตามบทบาท `user.role`
- หน้าลูกเรียก `this.$root.message = '...'` เพื่อแสดงข้อความสำเร็จสีเขียว

### `frontend/src/pages/NotReady.vue`

📄 **`frontend/src/pages/NotReady.vue`**

```vue
<template><p>ส่วนนี้อยู่ในบทถัดไป ให้ตรวจระบบที่ทำแล้วก่อน</p></template>
```

### `frontend/src/pages/LoginPage.vue` — เข้าสู่ระบบ / สมัครผู้รับ

📄 **`frontend/src/pages/LoginPage.vue`**

```vue
<template>
  <section class="box login">
    <h1>{{ register ? 'สมัครผู้รับการประเมิน' : 'เข้าสู่ระบบ' }}</h1>
    <p class="muted">ระบบประเมินบุคลากร • ฉบับพื้นฐาน</p>
    <form @submit.prevent="submit">
      <v-text-field
        v-if="register"
        v-model="form.full_name"
        required
        maxlength="100"
        label="ชื่อ–นามสกุล"
      />
      <v-text-field
        v-model="form.username"
        required
        maxlength="50"
        autocomplete="username"
        label="ชื่อผู้ใช้"
      />
      <v-text-field
        v-model="form.password"
        type="password"
        required
        :minlength="register ? 8 : 1"
        autocomplete="current-password"
        label="รหัสผ่าน"
      />
      <div class="actions">
        <v-btn color="primary" type="submit">
          {{ register ? 'สมัครสมาชิก' : 'เข้าสู่ระบบ' }}
        </v-btn>
        <v-btn variant="text" @click="register = !register">
          {{ register ? 'กลับหน้าเข้าสู่ระบบ' : 'สมัครผู้รับ' }}
        </v-btn>
      </div>
    </form>
  </section>
</template>

<script>
import { api } from '../api';

export default {
  data() {
    return { register: false, form: { username: '', password: '', full_name: '' } };
  },
  methods: {
    async submit() {
      if (this.register) {
        await api('/register', 'POST', this.form);
        this.register = false;
        this.$root.message = 'สมัครสำเร็จ กดเข้าสู่ระบบ';
      } else {
        const result = await api('/login', 'POST', this.form);
        localStorage.setItem('split_token', result.token);
        this.$emit('logged-in');
      }
    },
  },
};
</script>
```

### `frontend/src/pages/PasswordPage.vue` — เปลี่ยนรหัสผ่าน

📄 **`frontend/src/pages/PasswordPage.vue`**

```vue
<template>
  <section class="box login">
    <h1>เปลี่ยนรหัสผ่าน</h1>
    <p v-if="$root.user.must_change_password">
      เข้าใช้ครั้งแรก กรุณาตั้งรหัสผ่านใหม่ก่อนใช้งานระบบ
    </p>
    <form @submit.prevent="save">
      <v-text-field
        v-model="form.current_password"
        label="รหัสผ่านปัจจุบัน"
        type="password"
        autocomplete="current-password"
        required
      />
      <v-text-field
        v-model="form.new_password"
        label="รหัสผ่านใหม่"
        type="password"
        autocomplete="new-password"
        minlength="8"
        required
      />
      <v-text-field
        v-model="form.confirm_password"
        label="ยืนยันรหัสผ่านใหม่"
        type="password"
        autocomplete="new-password"
        minlength="8"
        required
      />
      <p>อย่างน้อย 8 ตัวอักษร และต้องต่างจากรหัสเดิม</p>
      <v-btn type="submit" color="primary" :loading="saving">บันทึกรหัสผ่านใหม่</v-btn>
    </form>
  </section>
</template>
<script>
import { api } from '../api';
export default {
  data() {
    return {
      form: { current_password: '', new_password: '', confirm_password: '' },
      saving: false,
    };
  },
  methods: {
    async save() {
      if (this.saving) return;
      this.saving = true;
      try {
        await api('/me/password', 'PUT', this.form);
        await this.$root.login();
        this.$root.message = 'เปลี่ยนรหัสผ่านแล้ว กรุณาใช้รหัสใหม่ในการเข้าสู่ระบบครั้งต่อไป';
      } finally {
        this.saving = false;
      }
    },
  },
};
</script>
```

### `frontend/src/pages/ProfilePage.vue` — ข้อมูลส่วนตัว

📄 **`frontend/src/pages/ProfilePage.vue`**

```vue
<template>
  <section class="box" v-if="form">
    <h1>ข้อมูลส่วนตัว</h1>
    <p>ชื่อผู้ใช้: {{ form.username }}</p>
    <form @submit.prevent="save">
      <v-text-field v-model="form.full_name" required maxlength="100" label="ชื่อ–นามสกุล" />
      <div class="grid">
        <v-text-field v-model="form.department" maxlength="100" label="แผนก" />
        <v-text-field v-model="form.position" maxlength="100" label="ตำแหน่ง" />
      </div>
      <v-btn color="primary" type="submit">บันทึกข้อมูล</v-btn>
    </form>
  </section>
</template>

<script>
import { api } from '../api';

export default {
  data() {
    return { form: null };
  },
  async mounted() {
    this.form = await api('/me');
  },
  methods: {
    async save() {
      await api('/me', 'PUT', this.form);
      this.$root.user = await api('/me');
      this.$root.message = 'บันทึกข้อมูลส่วนตัวแล้ว';
    },
  },
};
</script>
```

### รันหน้าเว็บ

```powershell
docker compose up -d
docker compose logs -f frontend
```

ครั้งแรกติดตั้งไลบรารี 1–3 นาที รอจนเห็น `Local: http://localhost:5175/` แล้ว `Ctrl+C`

---

## ✅ จุดเช็กขั้น 2 (ทั้งทีม)

| ตรวจ | ผลที่ต้องเห็น |
|---|---|
| เปิด http://localhost:5175 | หน้า "เข้าสู่ระบบ" |
| login `admin` / `Admin1234!` | เด้งไปหน้า "เปลี่ยนรหัสผ่าน" เมนูอื่นยังไม่ขึ้น |
| เปลี่ยนรหัสเป็น `Admin1234!x` | ข้อความเขียว เมนูขึ้น: รอบประเมิน, ผู้ใช้, ข้อมูลส่วนตัว, เปลี่ยนรหัสผ่าน |
| กด "รอบประเมิน" หรือ "ผู้ใช้" | ข้อความ "ส่วนนี้อยู่ในบทถัดไป" (ถูกต้อง ยังไม่ถึงขั้น) |
| ข้อมูลส่วนตัว → แก้แผนก → บันทึก | ข้อความเขียว "บันทึกข้อมูลส่วนตัวแล้ว" |
| ออกจากระบบ → "สมัครผู้รับ" → สมัคร `emp003` รหัส 8 ตัว | "สมัครสำเร็จ กดเข้าสู่ระบบ" |
| สมัครชื่อเดิมซ้ำ | กล่องแดง "ข้อมูลซ้ำ..." |
| กด F12 → Console | ไม่มีข้อความสีแดง |

## 💾 บันทึก

```powershell
git add -A
git commit -m "ขั้น 2 ผ่าน: login + หน้าเว็บโครงหลัก"
```

## ❌ ถ้าไม่ผ่าน

- หน้าเว็บกล่องแดง "เชื่อมต่อ API ไม่ได้" → backend ล่ม ดู `docker compose logs backend`
- log backend `ตั้ง JWT_SECRET ใน docker-compose.yml...` → `JWT_SECRET` สั้นกว่า 32 ตัว แก้แล้ว `docker compose up -d`
- หน้าเว็บขาวทั้งหน้า → F12 → Console ดูชื่อไฟล์ที่ error มักเป็นพิมพ์ชื่อ import ผิด หรือ `<template>` ปิดแท็กไม่ครบ
- แก้ไฟล์แล้วหน้าเว็บไม่เปลี่ยน → ตรวจว่ามี `watch: { usePolling: true }` แล้ว `docker compose restart frontend`
- **แก้ไม่ทันจริง ๆ:** `git restore .` กลับไปขั้น 1 แล้วไปช่วยงานส่วนอื่น
