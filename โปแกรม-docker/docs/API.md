# เอกสารออกแบบ RESTful API — ระบบประเมินบุคลากร

## 1. หลักการออกแบบ (เกณฑ์ 4.1, 4.2)

- ทุก API ขึ้นต้นด้วย `/api` ชื่อ endpoint เป็นคำนามพหูพจน์ภาษาอังกฤษ เช่น `/api/users`, `/api/periods/{id}`
- ใช้ HTTP Method ตามหน้าที่: `GET` อ่าน, `POST` เพิ่มหรือสั่งงาน, `PUT` แก้ไข, `DELETE` ลบ
- รับ-ส่งข้อมูลเป็น JSON ยกเว้นการอัปโหลดไฟล์ใช้ `multipart/form-data` ช่องชื่อ `file`
- Parameter มี 3 แบบ: **path** เช่น `{id}` ใน `/api/periods/{id}`, **query** เช่น `?year=2026`, **body** คือ JSON ที่ส่งมากับ POST/PUT

## 2. รูปแบบ Response (เกณฑ์ 4.3, 6.6)

ทุก API ตอบรูปแบบเดียวกัน มี `status`, `message`, `data`

สำเร็จ — HTTP 200

```json
{ "status": "success", "message": "สำเร็จ", "data": { "token": "eyJhbGciOi..." } }
```

ผิดพลาด — HTTP 400 / 401 / 403 / 404 / 500

```json
{ "status": "error", "message": "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง", "data": null }
```

## 3. รหัสสถานะและกรณี Error (เกณฑ์ 4.4, 6.5)

| HTTP Status | ความหมาย | ตัวอย่างเมื่อไร |
|---|---|---|
| 200 OK | สำเร็จ | login ถูก, บันทึกสำเร็จ |
| 400 Bad Request | ข้อมูลไม่ครบหรือผิดรูปแบบ | ชื่อว่าง, รหัสผ่านสั้นกว่า 8 ตัว, ชื่อผู้ใช้ซ้ำ, ไฟล์เกิน 5 MB |
| 401 Unauthorized | ยังไม่ login / token ผิดหรือหมดอายุ | ไม่ส่ง token, รหัสผ่านผิด |
| 403 Forbidden | login แล้วแต่ไม่มีสิทธิ์ | ผู้รับเรียก `/api/users`, รอบยังไม่เปิด |
| 404 Not Found | ไม่พบข้อมูลหรือ API | `/api/periods/999`, พิมพ์ endpoint ผิด |
| 500 Internal Server Error | ระบบขัดข้อง | ฐานข้อมูลล่ม (ดู log ของ backend) |

## 4. ความปลอดภัย (เกณฑ์ 4.5, 6.4, 6.10)

1. `POST /api/login` ตรวจรหัสผ่านด้วย bcrypt แล้วสร้าง **JWT** ที่ลงนาม (sign) ด้วย `JWT_SECRET` อายุ 8 ชั่วโมง
2. หน้าเว็บส่ง token ทุกครั้งใน header: `Authorization: Bearer <token>`
3. middleware `auth` ตรวจลายเซ็น token ก่อนถึง API ทุกตัว ยกเว้น `/login`, `/register`, `/health`
4. middleware `role('admin')` ตรวจบทบาท คนผิดบทบาทได้ 403
5. รหัสผ่านเก็บแบบ hash (bcrypt) ไม่เก็บตัวจริง, ทุกคำสั่ง SQL ใช้ `?` กัน SQL Injection
6. ไฟล์อัปโหลดตรวจชนิดจากเนื้อไฟล์จริง (PDF/PNG/JPEG) จำกัด 5 MB และเปิดได้เฉพาะผู้มีสิทธิ์
7. บัญชีใหม่ต้องเปลี่ยนรหัสผ่านครั้งแรกก่อน (must_change_password) ไม่อย่างนั้นได้ 403

## 5. รายการ API ทั้งหมด (เกณฑ์ 6.7, 6.8)

| Method | Endpoint | คำอธิบาย |
|---|---|---|
| GET | `/api/health` | ตรวจว่า API ต่อฐานข้อมูลได้ (ไม่ต้อง login) |

### ผู้ใช้และการเข้าสู่ระบบ

| Method | Endpoint | คำอธิบายและ parameter |
|---|---|---|
| POST | `/api/login` | เข้าสู่ระบบ body: username, password → data.token (JWT) |
| POST | `/api/register` | สมัครผู้รับการประเมิน body: username, password, full_name |
| GET | `/api/me` | ข้อมูลผู้ใช้ที่ login อยู่ (ต้องมี token) |
| PUT | `/api/me/password` | เปลี่ยนรหัสผ่าน body: current_password, new_password, confirm_password |
| PUT | `/api/me` | แก้ข้อมูลส่วนตัว body: full_name, department, position |
| GET | `/api/users` | รายชื่อผู้ใช้ทั้งหมด (admin) |
| POST | `/api/users` | เพิ่มผู้ใช้ body: username, password, full_name, department, position, role (admin) |
| PUT | `/api/users/{id}` | แก้ผู้ใช้ path: id body: full_name, department, position, active (admin) |

### รอบประเมิน หัวข้อ ตัวชี้วัด (ฝ่ายบุคลากร)

| Method | Endpoint | คำอธิบายและ parameter |
|---|---|---|
| GET | `/api/periods` | รายการรอบ query: year (ไม่บังคับ) (admin) |
| POST | `/api/periods` | สร้างรอบ body: name, year, start_date, end_date (admin) |
| PUT | `/api/periods/{id}` | แก้รอบที่ยังเป็นฉบับร่าง path: id (admin) |
| GET | `/api/periods/{id}` | รายละเอียดรอบ หัวข้อ ตัวชี้วัด ผู้รับ กรรมการ path: id (admin) |
| POST | `/api/periods/{id}/topics` | เพิ่มหัวข้อ path: id body: name (admin) |
| PUT | `/api/topics/{id}` | แก้ชื่อหัวข้อ path: id body: name (admin) |
| POST | `/api/indicators` | เพิ่มตัวชี้วัด body: topic_id, name, detail, weight, score_type, evidence_type, evidence_required (admin) |
| PUT | `/api/indicators/{id}` | แก้ตัวชี้วัด path: id (admin) |
| DELETE | `/api/indicators/{id}` | ลบตัวชี้วัด path: id (admin) |
| POST | `/api/periods/{id}/participants` | เพิ่มผู้รับเข้ารอบ path: id body: user_id (admin) |
| POST | `/api/assignments` | มอบหมายกรรมการ body: participant_id, evaluator_id, committee_role (admin) |
| DELETE | `/api/assignments/{id}` | ถอนการมอบหมาย path: id (admin) |
| POST | `/api/periods/{id}/open` | เปิดรอบ path: id (admin) |
| POST | `/api/periods/{id}/close` | ปิดรอบ path: id (admin) |

### ผู้รับการประเมิน

| Method | Endpoint | คำอธิบายและ parameter |
|---|---|---|
| GET | `/api/my-periods` | รอบของผู้รับที่ login อยู่ (evaluatee) |
| GET | `/api/self/{id}` | ข้อมูลประเมินตนเอง path: id = participant id (evaluatee) |
| PUT | `/api/self/{id}/scores/{indicatorId}` | บันทึกคะแนนตนเอง path: id, indicatorId body: score, description, evidence_url (evaluatee) |
| POST | `/api/self/{id}/files/{indicatorId}` | อัปโหลดไฟล์หลักฐาน form-data: file (evaluatee) |
| POST | `/api/self/{id}/submit` | ส่งการประเมินตนเอง path: id (evaluatee) |

### ไฟล์

| Method | Endpoint | คำอธิบายและ parameter |
|---|---|---|
| GET | `/api/files/{id}` | เปิดไฟล์หลักฐาน (ตรวจสิทธิ์ก่อน) path: id = self_scores id |
| GET | `/api/signatures/{id}` | เปิดภาพลายเซ็น path: id = assignment id |

### กรรมการผู้ประเมิน

| Method | Endpoint | คำอธิบายและ parameter |
|---|---|---|
| GET | `/api/my-assignments` | งานที่กรรมการได้รับมอบหมาย (evaluator) |
| GET | `/api/evaluate/{id}` | ข้อมูลสำหรับให้คะแนน path: id = assignment id (evaluator) |
| PUT | `/api/evaluate/{id}/scores/{indicatorId}` | ให้คะแนน path: id, indicatorId body: score (evaluator) |
| PUT | `/api/evaluate/{id}/comment` | บันทึกความเห็น body: comment (evaluator) |
| POST | `/api/evaluate/{id}/signature` | อัปโหลดลายเซ็น form-data: file PNG/JPEG (evaluator) |
| POST | `/api/evaluate/{id}/submit` | ยืนยันและส่งผล path: id (evaluator) |

### รายงาน

| Method | Endpoint | คำอธิบายและ parameter |
|---|---|---|
| GET | `/api/my-results` | ผลการประเมินของฉัน (evaluatee) |
| GET | `/api/reports/{id}` | รายงานภาพรวมรอบ + ค่าเฉลี่ย path: id = period id (admin) |
| GET | `/api/results/{id}` | ผลรายบุคคล path: id = participant id |
| POST | `/api/periods/{id}/publish` | เผยแพร่ผล path: id (admin) |

## 6. ตัวอย่างการเรียก

**Login** — `POST /api/login`

```json
// body
{ "username": "admin", "password": "Admin1234!" }
// 200
{ "status": "success", "message": "สำเร็จ", "data": { "token": "eyJhbGciOiJIUzI1NiIs..." } }
// 401
{ "status": "error", "message": "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง", "data": null }
```

**ค้นหารอบตามปี** — `GET /api/periods?year=2026` (header `Authorization: Bearer <token>`)

```json
// 200
{ "status": "success", "message": "สำเร็จ", "data": [ { "id": 1, "name": "รอบ 1/2569", "year": 2026, "status": "draft" } ] }
// 403 (ไม่ใช่ admin)
{ "status": "error", "message": "ไม่มีสิทธิ์", "data": null }
```

**ไม่พบรอบ** — `GET /api/periods/999`

```json
// 404
{ "status": "error", "message": "ไม่พบรอบ", "data": null }
```
