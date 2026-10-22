# ขั้น 0 — เตรียมเครื่อง สร้างโปรเจกต์ และเปิดฐานข้อมูลด้วย Docker

**ใครทำ:** คนที่ 1 พิมพ์ คนที่ 2 ช่วยดู คนที่ 3 เปิด Draw.io เริ่มผังงานได้เลย (ดู [คนที่3-งานออกแบบDrawio.md](คนที่3-งานออกแบบDrawio.md))
**เวลา:** 20 นาที
**ได้อะไร:** MySQL + phpMyAdmin รันอยู่ใน Docker พร้อมให้ขั้นต่อไปสร้างตาราง

## 0.1 ตรวจโปรแกรม (ทุกเครื่อง)

เปิด PowerShell แล้วพิมพ์ทีละบรรทัด ทุกบรรทัดต้องขึ้นเลขเวอร์ชัน ไม่ใช่ error

```powershell
docker --version
docker compose version
git --version
code --version
```

- Docker Desktop ต้อง **เปิดอยู่** (ไอคอนวาฬที่มุมขวาล่างนิ่ง ไม่กระพริบ)
- ไม่ต้องติดตั้ง Node.js หรือ MySQL บนเครื่อง เพราะทั้งหมดรันใน Docker

## 0.2 สร้างโฟลเดอร์โปรเจกต์ (เครื่องหลัก)

> **วันแข่งที่ผู้จัดมี Git server:** ใช้ `git clone` แทน `git init` ตามหน้า [01-ส่งไฟล์กันด้วยGit.md](01-ส่งไฟล์กันด้วยGit.md) ข้อ 2 ส่วนตอนซ้อมที่บ้านใช้คำสั่งด้านล่างได้เลย

```powershell
mkdir C:\bpes
cd C:\bpes
mkdir backend, backend\routes, backend\tests, frontend, frontend\src, frontend\src\pages, frontend\src\components, docs, backups
git init
git config user.name "ทีม"
git config user.email "team@example.com"
code .
```

โครงสร้างที่จะได้เมื่อจบทุกขั้น:

```text
bpes/
├── docker-compose.yml      ← สั่งรันทุกอย่าง
├── .gitignore
├── backups/                ← ไฟล์สำรองฐานข้อมูล (ขั้น 8)
├── docs/                   ← งานคนที่ 3: drawio, API.md, ผลทดสอบ
├── backend/                ← งานคนที่ 1 (Express API)
│   ├── package.json
│   ├── server.js  db.js  helpers.js  auth.js  uploads.js  seed.js  schema.sql
│   ├── routes/   users.js periods.js self.js files.js evaluate.js reports.js
│   └── tests/    score.test.js api.test.js
└── frontend/               ← งานคนที่ 2 (Vue + Vuetify)
    ├── package.json  vite.config.js  index.html
    └── src/  main.js api.js style.css App.vue
        ├── components/ScoreField.vue CriteriaBox.vue PeopleBox.vue
        └── pages/ LoginPage PasswordPage ProfilePage NotReady UsersPage PeriodsPage
                   SelfPage EvaluatePage ReportsPage MyResultsPage (.vue)
```

## 0.3 ไฟล์ Docker Compose (คนที่ 1)

สร้างไฟล์ที่โฟลเดอร์บนสุด `C:\bpes\docker-compose.yml`

📄 **`docker-compose.yml`**

```yaml
# รันทั้งระบบด้วยคำสั่งเดียว: docker compose up
# db = MySQL, phpmyadmin = ดูตาราง, backend = Express API, frontend = Vue (Vite)
services:
  db:
    image: mysql:8.4
    environment:
      MYSQL_ROOT_PASSWORD: root1234
      MYSQL_DATABASE: bpes
    command: --character-set-server=utf8mb4 --collation-server=utf8mb4_unicode_ci
    ports:
      - "3307:3306"
    volumes:
      - db_data:/var/lib/mysql
      - ./backups:/backup
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "127.0.0.1", "-proot1234"]
      interval: 5s
      retries: 30

  phpmyadmin:
    image: phpmyadmin:5
    environment:
      PMA_HOST: db
      PMA_USER: root
      PMA_PASSWORD: root1234
    ports:
      - "8080:80"
    depends_on:
      - db

  backend:
    image: node:22-alpine
    working_dir: /app
    command: sh -c "npm install && npm run seed && npm run dev"
    environment:
      DB_HOST: db
      DB_PORT: 3306
      DB_USER: root
      DB_PASSWORD: root1234
      DB_NAME: bpes
      PORT: 3301
      JWT_SECRET: bpes-2568-change-this-to-a-long-random-secret-key
    ports:
      - "3301:3301"
    volumes:
      - ./backend:/app
      - /app/node_modules
    depends_on:
      db:
        condition: service_healthy

  frontend:
    image: node:22-alpine
    working_dir: /app
    command: sh -c "npm install && npm run dev"
    environment:
      API_URL: http://backend:3301
    ports:
      - "5175:5175"
    volumes:
      - ./frontend:/app
      - /app/node_modules
    depends_on:
      - backend

volumes:
  db_data:
```

**เข้าใจโค้ด**

- `services` คือโปรแกรม 4 ตัวที่จะรัน แต่ละตัวอยู่ใน container ของตัวเอง
- `db` ใช้ MySQL 8.4 รหัส root คือ `root1234` สร้างฐานชื่อ `bpes` ให้อัตโนมัติ `utf8mb4` ทำให้เก็บภาษาไทยได้
- `ports: "3307:3306"` แปลว่า เครื่องเราพอร์ต 3307 → MySQL ใน container พอร์ต 3306 (ใช้ 3307 เพื่อไม่ชนกับ MySQL ที่อาจลงไว้ในเครื่อง) ใช้กับ HeidiSQL/DBeaver ได้
- `volumes: db_data` เก็บข้อมูลไว้ ปิดเครื่องแล้วข้อมูลไม่หาย
- `backend` และ `frontend` ใช้ image `node:22-alpine` แล้วเอาโฟลเดอร์ของเรา `./backend` ไปวางที่ `/app` ใน container แก้ไฟล์ในเครื่องแล้ว container เห็นทันที
- `/app/node_modules` แยกไว้ใน container เพราะไลบรารีที่ลงบน Linux ใช้กับ Windows ไม่ได้
- `command` ของ backend: ติดตั้งไลบรารี → สร้างตาราง/บัญชี (`seed`) → รันแบบรีสตาร์ตเองเมื่อแก้ไฟล์ (`dev`)
- `JWT_SECRET` คือกุญแจลงนาม token **วันแข่งให้เปลี่ยนเป็นข้อความยาวของทีมเอง** (อย่างน้อย 32 ตัวอักษร ภาษาอังกฤษ/ตัวเลข)
- `depends_on ... service_healthy` ให้ backend รอจน MySQL พร้อมก่อน

## 0.4 ไฟล์ `.gitignore`

📄 **`.gitignore`**

```
node_modules/
dist/
backend/uploads/
backups/*.sql
```

สร้างไฟล์ `backups/README.txt` ใส่ข้อความอะไรก็ได้ เพื่อให้ git เก็บโฟลเดอร์นี้ไว้

## 0.5 เปิดฐานข้อมูล

```powershell
docker compose up -d db phpmyadmin
docker compose ps
```

ครั้งแรกจะดาวน์โหลด image นานหน่อย

## ✅ จุดเช็กขั้น 0

| ตรวจ | ผลที่ต้องเห็น |
|---|---|
| `docker compose ps` | `db` สถานะ `healthy`, `phpmyadmin` สถานะ `Up` |
| เปิด http://localhost:8080 | หน้า phpMyAdmin ซ้ายมือมีฐาน `bpes` (ยังว่าง) |

## 💾 บันทึก

```powershell
git add -A
git commit -m "ขั้น 0 ผ่าน: docker db + phpmyadmin"
git push        # ถ้าใช้ Git server ของผู้จัด
```

หลัง push แล้ว แจ้งคนที่ 2 และ 3 ให้ `git clone` ลงเครื่องตัวเอง

## ❌ ถ้าไม่ผ่าน

- `docker: command not found` / `error during connect` → ยังไม่ได้เปิด Docker Desktop ให้เปิดแล้วรอ 1 นาที
- `port is already allocated` → มีโปรแกรมใช้พอร์ต 3307 หรือ 8080 อยู่ แก้เลขซ้ายใน `ports` เช่น `"8081:80"` แล้วเปิด http://localhost:8081
- `yaml: line X` → ย่อหน้าผิด YAML ใช้ **ช่องว่าง 2 ช่อง** ห้ามใช้ Tab ตรวจบรรทัดที่บอก
