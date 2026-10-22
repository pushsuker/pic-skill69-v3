// ทดสอบ API จริง (ต้องเปิด docker compose up ไว้ก่อน)
// รัน: docker compose exec backend npm run test:api
const test = require('node:test');
const assert = require('node:assert/strict');
const BASE = 'http://127.0.0.1:' + (process.env.PORT || 3301) + '/api';
async function call(path, method = 'GET', body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = 'Bearer ' + token;
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, body: await res.json() };
}
const username = 'test' + Date.now();
let token;

test('7.4 Validate: รหัสผ่านสั้นกว่า 8 ตัวต้องถูกปฏิเสธ', async () => {
  const r = await call('/register', 'POST', { username, password: '123', full_name: 'ทดสอบ' });
  assert.equal(r.status, 400);
  assert.equal(r.body.status, 'error');
});

test('7.4 Validate: ชื่อว่างต้องถูกปฏิเสธ', async () => {
  const r = await call('/register', 'POST', { username, password: 'Test1234!', full_name: '   ' });
  assert.equal(r.status, 400);
});

test('7.2 Insert: สมัครผู้ใช้ใหม่ได้ (POST)', async () => {
  const r = await call('/register', 'POST', { username, password: 'Test1234!', full_name: 'ทดสอบ' });
  assert.equal(r.status, 200);
  assert.equal(r.body.status, 'success');
});

test('7.1 Login: รหัสผิดต้องได้ 401', async () => {
  const r = await call('/login', 'POST', { username, password: 'ผิดแน่นอน' });
  assert.equal(r.status, 401);
});

test('7.1 Login: รหัสถูกต้องได้ token', async () => {
  const r = await call('/login', 'POST', { username, password: 'Test1234!' });
  assert.equal(r.status, 200);
  assert.ok(r.body.data.token);
  token = r.body.data.token;
});

test('6.10 ไม่มี token ต้องได้ 401', async () => {
  const r = await call('/me');
  assert.equal(r.status, 401);
});

test('7.6 GET /me ได้ข้อมูลตัวเอง', async () => {
  const r = await call('/me', 'GET', null, token);
  assert.equal(r.status, 200);
  assert.equal(r.body.data.username, username);
});

test('7.3 Update: เปลี่ยนรหัสผ่าน แล้วแก้ข้อมูลส่วนตัว (PUT)', async () => {
  const p = await call(
    '/me/password',
    'PUT',
    { current_password: 'Test1234!', new_password: 'New12345!', confirm_password: 'New12345!' },
    token,
  );
  assert.equal(p.status, 200);
  const u = await call('/me', 'PUT', { full_name: 'ชื่อใหม่', department: 'IT', position: 'ครู' }, token);
  assert.equal(u.status, 200);
  const me = await call('/me', 'GET', null, token);
  assert.equal(me.body.data.full_name, 'ชื่อใหม่');
  assert.equal(me.body.data.department, 'IT');
});

test('4.4 เรียก API ที่ไม่มีต้องได้ 404', async () => {
  const r = await call('/ไม่มีจริง', 'GET', null, token);
  assert.equal(r.status, 404);
});
