# คนที่ 3 — งานออกแบบ (ทำคู่ขนานตั้งแต่ 09:00)

**คะแนนที่ดูแล:** ส่วน 1 ผังงาน (5) · 2.4 ER-Diagram (1) · ส่วน 3 Layout หน้าจอ (5) · ส่วน 4 ออกแบบ API (5) · 6.7, 6.8 เอกสาร API (2) · ส่วน 7 ทดสอบ (10 ร่วมกับทีม) · ส่วน 9 นำเสนอ (10)

งานส่วนนี้ **ไม่ต้องรอโค้ด** ทำเสร็จเมื่อไรได้คะแนนเมื่อนั้น แม้โปรแกรมจะพังทั้งหมดก็ยังได้

## ลำดับงานและเวลา

| เวลา | งาน | ไฟล์ที่บันทึก |
|---|---|---|
| 09:00–10:00 | ผังงาน 5 แผ่น | `docs/1-ผังงาน.drawio` (5 หน้าในไฟล์เดียว) |
| 10:00–10:30 | ER-Diagram (หลังคนที่ 1 ผ่านขั้น 1) | `docs/2-ER.drawio` |
| 10:30–10:45 | ทดสอบ Login ด้วย Thunder Client | `docs/ทดสอบ/*.png` |
| 10:45–11:45 | Layout หน้าจอ 5 แผ่น | `docs/3-หน้าจอ.drawio` |
| 12:15–13:00 | เอกสาร API | `docs/API.md` |
| 13:00–14:40 | ทดสอบตามขั้น และกรอกผล | `docs/ผลการทดสอบ.md` |
| 14:40–15:00 | สไลด์นำเสนอ | `docs/นำเสนอ.pptx` |

ทุกแผ่นใน Draw.io ให้ **File → Export as → PNG** เก็บไว้ด้วย เผื่อเปิดไฟล์ drawio ไม่ได้ตอนนำเสนอ และบอกคนที่ 1 ให้ `git commit` หลังบันทึกแต่ละไฟล์

---

## ส่วน 1 — ผังงาน (Flow Diagram) 5 แผ่น

ใช้สัญลักษณ์มาตรฐาน: วงรี = เริ่ม/จบ · สี่เหลี่ยม = การทำงาน · ข้าวหลามตัด = ตัดสินใจ (มีเส้น ใช่/ไม่ใช่) · สี่เหลี่ยมด้านขนาน = รับ/แสดงข้อมูล · ทรงกระบอก = ฐานข้อมูล

### 1.1 ผังงานการเข้าสู่ระบบ (Login Flow)

```text
(เริ่ม) → /กรอกชื่อผู้ใช้ รหัสผ่าน/ → [ส่ง POST /api/login]
→ <ชื่อผู้ใช้และรหัสถูกต้อง และบัญชีเปิดใช้?>
     ไม่ใช่ → /แสดง "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง"/ → กลับไปกรอก
     ใช่ → [สร้าง JWT token] → [เก็บ token ในเบราว์เซอร์]
→ <ต้องเปลี่ยนรหัสผ่านครั้งแรก?>
     ใช่ → [หน้าเปลี่ยนรหัสผ่าน] → [บันทึกรหัสใหม่ ได้ token ใหม่]
→ <บทบาท?>
     admin → [หน้ารอบประเมิน]
     ผู้รับ → [หน้าประเมินตนเอง]
     กรรมการ → [หน้างานกรรมการ]
→ (จบ)
```

### 1.2 ผังงานฝ่ายบุคลากร

```text
(เริ่ม) → [Login admin] → [จัดการผู้ใช้: เพิ่มผู้รับ/กรรมการ]
→ [สร้างรอบ: ชื่อ ปี วันเริ่ม วันสิ้นสุด] → [เพิ่มหัวข้อ]
→ [เพิ่มตัวชี้วัด: ชื่อ รายละเอียด น้ำหนัก ชนิดคะแนน 1–4 หรือ มี/ไม่มี ชนิดหลักฐาน]
→ [เพิ่มผู้รับเข้ารอบ] → [มอบหมายกรรมการ: ประธาน/กรรมการร่วม]
→ <ผู้รับทุกคนมีประธาน 1 คน?> ไม่ใช่ → กลับไปมอบหมาย
→ [เปิดรอบ] → [ติดตามสถานะผู้รับและกรรมการ]
→ <ส่งครบทุกคน?> ไม่ใช่ → [ติดตามต่อ]
→ [เผยแพร่ผล] → [ดูรายงาน / พิมพ์ PDF] → (จบ)
```

### 1.3 ผังงานผู้รับการประเมิน

```text
(เริ่ม) → <มีบัญชี?> ไม่ใช่ → [สมัครสมาชิก] 
→ [Login] → [แก้ข้อมูลส่วนตัว] → [เลือกรอบที่ได้รับ]
→ <รอบเปิดและอยู่ในช่วงวัน?> ไม่ใช่ → /แสดงอ่านอย่างเดียว/ → (จบ)
→ วนทุกตัวชี้วัด: [เลือกคะแนนตนเอง] → [กรอกรายละเอียด] → [บันทึก] → [แนบไฟล์หรือ URL]
→ /แสดงความคืบหน้า x / y ข้อ/
→ <ครบทุกข้อ?> ไม่ใช่ → กลับไปกรอก
→ [ส่งการประเมินตนเอง] → <เผยแพร่ผลแล้ว?> ใช่ → [ดูผลและความเห็นกรรมการ / บันทึก PDF] → (จบ)
```

### 1.4 ผังงานกรรมการผู้ประเมิน

```text
(เริ่ม) → [Login] → /แสดงรายชื่อผู้รับที่ต้องประเมิน/ → [เลือกผู้รับ]
→ <ผู้รับส่งแล้ว และรอบเปิด?> ไม่ใช่ → /อ่านอย่างเดียว/ → (จบ)
→ /แสดงหัวข้อ ตัวชี้วัด คะแนนตนเอง หลักฐาน/
→ วนทุกตัวชี้วัด: [ให้คะแนน] → [บันทึก]
→ [เขียนความเห็นภาพรวม] → [แนบภาพลายเซ็น]
→ /ตารางสรุปคะแนน + ร้อยละ/
→ <คะแนนครบ มีความเห็น มีลายเซ็น?> ไม่ใช่ → กลับไปแก้
→ [ยืนยันและส่งผล] → (จบ)
```

### 1.5 ผังงานภาพรวมระบบ (System Flow Overview)

วาดเป็น 3 ช่องแนวตั้ง (Swimlane) ชื่อ ฝ่ายบุคลากร | ผู้รับการประเมิน | กรรมการ และทรงกระบอก "ฐานข้อมูล MySQL" ด้านล่าง

```text
ฝ่ายบุคลากร: ตั้งรอบ/เกณฑ์/มอบหมาย → เปิดรอบ ─────────────────────────────→ เผยแพร่ผล → รายงาน
ผู้รับ:                         └→ ประเมินตนเอง + หลักฐาน → ส่ง ─┐              └→ ดูผล/PDF
กรรมการ:                                                     └→ ให้คะแนน + ความเห็น + ลายเซ็น → ส่ง ─┘
ทุกขั้นอ่าน/เขียน ↔ [Backend API (Express + JWT)] ↔ (ฐานข้อมูล MySQL)
```

---

## 2.4 ER-Diagram

รอคนที่ 1 ผ่านขั้น 1 แล้วดูตารางจริงใน phpMyAdmin (http://localhost:8080 → `bpes` → Designer)

**ทางลัด:** ใน Draw.io เลือก **Arrange → Insert → Advanced → SQL** วางเนื้อหา `backend/schema.sql` (ตัดบรรทัด FOREIGN KEY ออกถ้า error) จะได้กล่องตารางทั้ง 8 อัตโนมัติ แล้วลากเส้นความสัมพันธ์เอง ถ้าไม่มีเมนูนี้ ใช้ shape หมวด **Entity Relation → Table** ทำเอง

เส้นความสัมพันธ์ (ใช้หัวลูกศรแบบ Crow's foot: ฝั่ง 1 = ขีดเดียว ฝั่ง N = ตีนกา)

| จาก (1) | ไป (N) | ผ่านฟิลด์ | อ่านว่า |
|---|---|---|---|
| periods | topics | `topics.period_id` | 1 รอบ มีหลายหัวข้อ |
| topics | indicators | `indicators.topic_id` | 1 หัวข้อ มีหลายตัวชี้วัด |
| periods | participants | `participants.period_id` | 1 รอบ มีผู้รับหลายคน |
| users | participants | `participants.user_id` | ผู้ใช้ 1 คน อยู่ได้หลายรอบ |
| participants | assignments | `assignments.participant_id` | ผู้รับ 1 คน มีกรรมการหลายคน |
| users | assignments | `assignments.evaluator_id` | กรรมการ 1 คน ได้หลายงาน |
| participants | self_scores | `self_scores.participant_id` | ผู้รับ 1 คน มีคะแนนตนเองหลายข้อ |
| indicators | self_scores | `self_scores.indicator_id` | |
| assignments | scores | `scores.assignment_id` | งานกรรมการ 1 งาน มีคะแนนหลายข้อ |
| indicators | scores | `scores.indicator_id` | |

ในกล่องตารางให้เขียน `PK` หน้าฟิลด์ `id` และ `FK` หน้าฟิลด์ที่ลงท้าย `_id` พร้อมชนิดข้อมูล

---

## ส่วน 3 — Layout หน้าจอ 5 แผ่น

ใช้ shape หมวด **Mockups** (เปิดได้ที่ More Shapes → ติ๊ก Mockups) ทุกแผ่นวาดกรอบเบราว์เซอร์ กว้าง 1280 และมุมขวาวาดกรอบมือถือเล็ก ๆ แสดงว่ารองรับ Responsive

| แผ่น | ส่วนประกอบ (เหมือนหน้าเว็บจริง) |
|---|---|
| 3.1 Login | แถบหัวสีน้ำเงิน "PIC • ประเมินบุคลากร" · กล่องกลางจอ: หัวข้อ "เข้าสู่ระบบ", ช่องชื่อผู้ใช้, ช่องรหัสผ่าน, ปุ่ม "เข้าสู่ระบบ", ลิงก์ "สมัครผู้รับ" |
| 3.2 Dashboard / Overview | แถบหัว + ชื่อผู้ใช้ + ปุ่มออก · แถบเมนูตามบทบาท · การ์ดสรุป: ผู้รับทั้งหมด, ผลครบ, ค่าเฉลี่ย (ตัวเลขใหญ่) · ตารางผู้รับ + สถานะกรรมการ |
| 3.3 ฝ่ายบุคลากร | ช่องกรองปี + ปุ่มค้นหา + ปุ่มสร้างรอบ · ตารางรอบ · กล่อง 1 หัวข้อ/ตัวชี้วัด (ฟอร์ม + ตาราง) · กล่อง 2 ผู้รับ · กล่อง 3 มอบหมายกรรมการ · กล่อง 4 ปุ่มเปิดรอบ/เผยแพร่/ปิดรอบ |
| 3.4 ผู้รับการประเมิน | ปุ่มเลือกรอบ · กล่องสรุป "บันทึกครบ x / y ข้อ" · การ์ดตัวชี้วัดละ 1 ใบ: ช่องคะแนน, รายละเอียด, ช่องไฟล์/URL, ปุ่มบันทึก · ปุ่ม "ส่งการประเมินตนเอง" |
| 3.5 กรรมการ | ปุ่มเลือกผู้รับ · ร้อยละตัวใหญ่ · การ์ดตัวชี้วัด: คะแนนตนเองของผู้รับ, ปุ่มเปิดหลักฐาน, ช่องให้คะแนน · ตารางตรวจทาน · ช่องความเห็น · ช่องลายเซ็น · ปุ่ม "ยืนยันและส่งผล" |

---

## ส่วน 4 + 6.7 + 6.8 — เอกสารออกแบบ API `docs/API.md`

พิมพ์ไฟล์นี้ (ตาราง API ทั้งหมดตรงกับโค้ดจริง) ถ้าเวลาน้อย ให้ทำหัวข้อ 1–4 ก่อน เพราะตรงกับเกณฑ์ 4.1–4.5 ทั้งหมด ตาราง API ข้อ 5 ทำทีหลัง

📄 **`docs/API.md`**

````markdown
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
````

---

## งานทดสอบและนำเสนอ

- ระหว่างวัน: ทุกครั้งที่คนที่ 1 หรือ 2 บอกว่าผ่านจุดเช็ก ให้ทดสอบซ้ำด้วยตัวเองและจับภาพลง `docs/ทดสอบ/` ตั้งชื่อตามข้อเกณฑ์ เช่น `7.1-login-ผิด.png`
- ตารางผลการทดสอบ และขั้นตอน DevTools อยู่ใน [ขั้น7-ทดสอบระบบ.md](ขั้น7-ทดสอบระบบ.md)
- โครงการนำเสนอและคำถามที่ต้องเตรียม อยู่ใน [ขั้น8-โจทย์พิเศษและนำเสนอ.md](ขั้น8-โจทย์พิเศษและนำเสนอ.md)
