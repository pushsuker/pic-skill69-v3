# ส่งไฟล์กันในทีมด้วย Git ของผู้จัด (ไม่ต้องใช้อินเทอร์เน็ต)

วันแข่ง ผู้จัดเตรียม **Git server ในวง LAN** ไว้ให้ (เช่น Gitea / GitLab) ทุกเครื่องในห้องต่อถึงกันได้ แม้จะออกอินเทอร์เน็ตไม่ได้ ทีมใช้ server นี้เป็น "กล่องกลาง" ส่งโค้ดให้กัน ทุกคนทำงานบนเครื่องตัวเอง แล้วส่งขึ้น (push) และดึงลง (pull) ผ่าน server

```text
  เครื่องคนที่ 1 ──push/pull──┐
  เครื่องคนที่ 2 ──push/pull──┼──  Git server ของผู้จัด (repo ของทีม)
  เครื่องคนที่ 3 ──push/pull──┘
```

## 1. กติกาสำคัญ: แต่ละคนแก้เฉพาะโฟลเดอร์ของตัวเอง

ถ้าไม่มีใครแก้ไฟล์เดียวกัน git จะรวมงานให้เองทุกครั้ง **ไม่มี conflict**

| ผู้รับผิดชอบ | แก้ได้เฉพาะ | ห้ามแตะ |
|---|---|---|
| Backend | `docker-compose.yml`, `.gitignore`, `backend/` ทั้งหมด (รวม `server.js`, `tests/`) | `frontend/`, `docs/` |
| Frontend | `frontend/` ทั้งหมด (รวม `App.vue`) | `backend/`, `docs/`, `docker-compose.yml` |
| ออกแบบ/ทดสอบ | `docs/` ทั้งหมด (drawio, API.md, ผลทดสอบ, ภาพหน้าจอ) | `backend/`, `frontend/` |

ไฟล์ที่ทุกขั้นต้องแก้ คือ `server.js` (เจ้าของคือ Backend) และ `App.vue` (เจ้าของคือ Frontend) มีเจ้าของคนเดียว จึงไม่ชนกัน ถ้าเห็นบั๊กในโฟลเดอร์ของคนอื่น **บอกเจ้าของให้แก้** อย่าแก้เอง

## 2. ตั้งค่าครั้งแรก (ทุกเครื่อง ทำวันตรวจเครื่อง)

ขอจากผู้จัด: ที่อยู่ repo ของทีม (เช่น `http://192.168.1.10:3000/team07/bpes.git`) ชื่อผู้ใช้ และรหัสผ่าน

```powershell
git config --global user.name "ชื่อของตัวเอง"
git config --global user.email "ชื่อ@team.local"
git config --global pull.rebase false
```

บรรทัดสุดท้ายสำคัญ ถ้าไม่ตั้ง `git pull` จะถามว่าจะรวมงานแบบไหนแล้วหยุด

### คนที่ทำ Backend: สร้างโครงโปรเจกต์ แล้วส่งขึ้นก่อน (ขั้น 0)

```powershell
cd C:\
git clone http://192.168.1.10:3000/team07/bpes.git bpes
cd bpes
mkdir backend, backend\routes, backend\tests, frontend, frontend\src, frontend\src\pages, frontend\src\components, docs, backups
```

สร้าง `docker-compose.yml`, `.gitignore`, `backups/README.txt` ตามขั้น 0 แล้ว:

```powershell
git add -A
git commit -m "ขั้น 0: โครงโปรเจกต์ + docker-compose"
git push
```

ครั้งแรกจะถามชื่อผู้ใช้/รหัสผ่านของ server (Windows จำให้)

### คนที่ทำ Frontend และ ออกแบบ: ดึงโปรเจกต์ลงเครื่อง

รอ Backend push เสร็จ แล้ว:

```powershell
cd C:\
git clone http://192.168.1.10:3000/team07/bpes.git bpes
cd bpes
code .
```

> git ไม่เก็บโฟลเดอร์ว่าง ถ้าโฟลเดอร์ `frontend\src\pages` ไม่มา ให้สร้างเองด้วย `mkdir`

## 3. รอบทำงาน: ทำซ้ำทุกครั้งที่ผ่านจุดเช็ก

```powershell
# 1) บันทึกงานตัวเอง
git add -A
git commit -m "ขั้น 3B ผ่าน: หน้าผู้ใช้ + หน้ารอบ"

# 2) ดึงงานของเพื่อนมารวม
git pull

# 3) ส่งงานรวมขึ้น server
git push
```

ลำดับต้องเป็น **commit → pull → push** เสมอ ถ้า push ก่อน pull แล้วเพื่อนส่งขึ้นไปก่อน จะขึ้น `rejected ... fetch first` ให้ `git pull` แล้ว `git push` ใหม่

**จังหวะส่งงานในแต่ละขั้น**

1. Backend ผ่าน 2A → commit/pull/push → บอกทีม "API ขั้น 2 ขึ้นแล้ว"
2. Frontend `git pull` เพื่อเอา backend ล่าสุด แล้วรัน `docker compose up -d` บนเครื่องตัวเอง ทดสอบหน้าเว็บกับ API จริง
3. Frontend ผ่านจุดเช็ก → commit/pull/push → บอกทีม
4. ออกแบบ `git pull` แล้วทดสอบบนเครื่องตัวเอง จับภาพลง `docs/` → commit/pull/push
5. Backend `git pull` เพื่อให้เครื่องหลักมีงานครบ ก่อนเริ่มขั้นถัดไป

แต่ละเครื่องมีฐานข้อมูลของตัวเอง (อยู่ใน Docker ของเครื่องนั้น) ข้อมูลทดสอบไม่ปนกัน ไฟล์ที่ไม่ต้องส่ง (`node_modules`, `backend/uploads`, ไฟล์สำรอง) ถูกกันไว้แล้วใน `.gitignore`

**เครื่องที่ใช้โชว์กรรมการ** คือเครื่องของ Backend ก่อนหมดเวลา 15 นาที ทุกคน push ให้ครบ แล้วเครื่องหลัก `git pull` ครั้งสุดท้าย และรัน `docker compose up -d`

## 4. ถ้าเกิด conflict (ชนกัน)

เกิดเมื่อสองคนแก้บรรทัดเดียวกันในไฟล์เดียวกัน ถ้าทำตามข้อ 1 แทบไม่เกิด ถ้าเกิด `git pull` จะขึ้น:

```text
CONFLICT (content): Merge conflict in backend/server.js
Automatic merge failed; fix conflicts and then commit the result.
```

วิธีแก้:

1. เปิดไฟล์ที่บอกใน VS Code จะเห็นแถบสี `<<<<<<<` (ของเรา) และ `>>>>>>>` (ของเพื่อน)
2. กดปุ่มด้านบนแถบ: **Accept Current Change** (เก็บของเรา) / **Accept Incoming Change** (เก็บของเพื่อน) / **Accept Both Changes** (เก็บทั้งคู่) ให้ **เจ้าของไฟล์** เป็นคนตัดสิน
3. บันทึกไฟล์ ตรวจว่าไม่มี `<<<<<<<` หลงเหลือ แล้ว:

```powershell
git add -A
git commit -m "รวมงาน แก้ conflict"
git push
```

แก้ไม่เป็น หรือกลัวพัง: `git merge --abort` จะกลับไปสภาพก่อน pull แล้วไปถามเจ้าของไฟล์

## 5. คำสั่งช่วยชีวิต

| ต้องการ | คำสั่ง |
|---|---|
| ดูว่าแก้ไฟล์อะไรไปบ้าง | `git status` |
| ดูประวัติงานทั้งทีม | `git log --oneline -10` |
| ทิ้งงานที่ยังไม่ commit กลับจุดเช็กล่าสุด | `git restore .` |
| ยกเลิกการ pull ที่ conflict | `git merge --abort` |
| เอาไฟล์เดียวกลับเป็นแบบล่าสุดบน server | `git checkout origin/main -- frontend/src/App.vue` (ชื่อ branch อาจเป็น `master` ดูจาก `git branch -a`) |

## 6. เตรียมของที่ต้องใช้แบบไม่มีอินเทอร์เน็ต (ครูต้องคุยกับผู้จัดล่วงหน้า)

ในห้องแข่งออกเน็ตไม่ได้ และห้ามนำอุปกรณ์เก็บข้อมูลเข้า สิ่งที่ปกติดาวน์โหลดจากเน็ตจึงต้องมีอยู่ในเครื่องก่อน

**Docker images ที่ compose ใช้:** `mysql:8.4`, `phpmyadmin:5`, `node:22-alpine`
ถ้าผู้จัดเตรียม image รุ่นอื่น (เช่น `mysql:8.0`, `node:20`) ให้แก้บรรทัด `image:` ใน `docker-compose.yml` ให้ตรงกับที่มี ดูรายการที่มีด้วย `docker images` (ระบบนี้ใช้ได้กับ MySQL 8 ทุกรุ่น และ Node 20.19 ขึ้นไป)

**ไลบรารี npm ที่ระบบนี้ต้องใช้** (ตอน `docker compose up` จะสั่ง `npm install` ซึ่งต้องใช้เน็ต)

| ฝั่ง | แพ็กเกจ | อยู่ใน Template ของผู้จัดตามเกณฑ์ข้อ 3.4.2.9–10 ไหม |
|---|---|---|
| backend | `express`, `jsonwebtoken`, `multer` | มี |
| backend | `mysql2`, `bcryptjs`, `nodemon` | ไม่ได้ระบุ ต้องถามผู้จัด |
| frontend | `vue`, `vuetify`, `@mdi/font`, `vite` | มี |
| frontend | `@vitejs/plugin-vue` | ไม่ได้ระบุ ต้องถามผู้จัด |

ทางเลือก ถ้าผู้จัดไม่มีให้ครบ:

1. **ดีที่สุด:** ขอให้ผู้จัดมี npm mirror ในวง LAN (เช่น Verdaccio) แล้วตั้ง `npm config set registry http://ที่อยู่ที่ผู้จัดให้` บนทุกเครื่อง
2. **วันตรวจเครื่อง (วันแรก) ถ้ายังมีเน็ต:** รัน `docker compose up -d` ให้ครบทุกเครื่องหนึ่งครั้ง ไลบรารีจะถูกเก็บใน volume ของ Docker ใช้ต่อได้แม้ไม่มีเน็ต **ห้ามใช้ `docker compose down -v`** หลังจากนั้น (จะลบไลบรารีทิ้ง)
3. **ถ้าใช้ได้เฉพาะไลบรารีของผู้จัด:** ใช้ `node_modules` จาก Template ของผู้จัด แล้วรัน backend/frontend ด้วย Node บนเครื่อง (ดูแผนสำรองใน [แก้ปัญหาที่พบบ่อย.md](แก้ปัญหาที่พบบ่อย.md)) ถ้าขาด `bcryptjs` ใช้ `bcrypt` แทนได้ (เปลี่ยน `require('bcryptjs')` เป็น `require('bcrypt')`) ถ้าขาด `nodemon` ให้เปลี่ยน script `dev` เป็น `node --watch server.js`

## ✅ จุดเช็ก (ซ้อมก่อนวันแข่ง)

| ตรวจ | ผลที่ต้องเห็น |
|---|---|
| ทุกเครื่อง `git clone` ได้ | มีโฟลเดอร์ `C:\bpes` ที่มี `docker-compose.yml` |
| Frontend แก้ `frontend/src/style.css` → commit/pull/push | Backend `git pull` แล้วเห็นการแก้ |
| ออกแบบ push ไฟล์ใน `docs/` | อีกสองเครื่อง `git pull` แล้วเห็นไฟล์ |
| สองคน push พร้อมกัน (คนละโฟลเดอร์) | คนที่ช้ากว่าได้ `rejected` → `git pull` → `git push` ผ่าน ไม่มี conflict |
| ซ้อม conflict: สองคนแก้บรรทัดเดียวกันใน `docs/test.md` | แก้ด้วยปุ่ม Accept ใน VS Code แล้ว push ได้ |
