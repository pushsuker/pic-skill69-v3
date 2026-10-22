# ขั้น 6 — รายงาน ติดตามสถานะ เผยแพร่ผล และ Export PDF

**ใครทำ:** คนที่ 1 ทำ 6A · คนที่ 2 ทำ 6B · คนที่ 3 ทดสอบขั้น 5 และจับภาพหน้าจอ
**เวลา:** 30 นาที
**คะแนนที่ได้เมื่อผ่าน:** 5.1.10 สรุปผลรายกรรมการ · 5.1.11 ติดตามสถานะกรรมการ · 5.1.12 ติดตามสถานะผู้รับ · 5.1.13 รายงานรายบุคคล · 5.2.7 Export PDF · 5.2.8 ผู้รับดูความเห็นกรรมการ (รวม 6 คะแนน) และเป็นฐานของโจทย์พิเศษ 8.1, 8.5

---

## 6A — คนที่ 1: `backend/routes/reports.js`

📄 **`backend/routes/reports.js`**

```js
const router = require('express').Router();
const { query } = require('../db');
const { role } = require('../auth');
const {
  check,
  ok,
  route,
  getPeriod,
  getParticipant,
  items,
  percentage,
  complete,
} = require('../helpers');
async function result(id) {
  const person = await getParticipant(id),
    period = await getPeriod(person.period_id),
    indicators = await items(period.id);
  const self = await query('SELECT * FROM self_scores WHERE participant_id=?', [id]);
  const committees = await query(
    'SELECT a.*,u.full_name FROM assignments a JOIN users u ON u.id=a.evaluator_id WHERE a.participant_id=? ORDER BY a.id',
    [id],
  );
  for (const c of committees) {
    c.scores = await query('SELECT * FROM scores WHERE assignment_id=?', [c.id]);
    c.percentage = percentage(indicators, c.scores);
  }
  const done =
    !!person.submitted &&
    committees.length > 0 &&
    committees.every((c) => c.submitted && c.percentage !== null);
  const total = done
    ? Math.round((committees.reduce((sum, c) => sum + c.percentage, 0) / committees.length) * 100) /
      100
    : null;
  return {
    person,
    period,
    indicators,
    self_scores: self,
    self_complete: indicators.filter((i) =>
      complete(
        i,
        self.find((s) => s.indicator_id === i.id),
      ),
    ).length,
    committees,
    total,
  };
}
// GET /api/my-results — ผลการประเมินของฉัน (evaluatee)
router.get(
  '/my-results',
  role('evaluatee'),
  route(async (req, res) => {
    const people = await query(
      'SELECT p.id, r.name, r.year, r.published FROM participants p JOIN periods r ON r.id=p.period_id WHERE p.user_id=? ORDER BY r.id DESC',
      [req.user.id],
    );
    const results = [];
    for (const p of people)
      results.push({ ...p, total: p.published ? (await result(p.id)).total : null });
    ok(res, results);
  }),
);
// GET /api/reports/:id — รายงานภาพรวมรอบ + ค่าเฉลี่ย path: id = period id (admin)
router.get(
  '/reports/:id',
  role('admin'),
  route(async (req, res) => {
    const period = await getPeriod(req.params.id),
      people = await query('SELECT id FROM participants WHERE period_id=?', [period.id]),
      results = [];
    for (const p of people) results.push(await result(p.id));
    const ready = results.filter((r) => r.total !== null);
    ok(res, {
      period,
      results,
      average: ready.length
        ? Math.round((ready.reduce((sum, r) => sum + r.total, 0) / ready.length) * 100) / 100
        : null,
    });
  }),
);
// GET /api/results/:id — ผลรายบุคคล path: id = participant id
router.get(
  '/results/:id',
  route(async (req, res) => {
    const person = await getParticipant(req.params.id),
      period = await getPeriod(person.period_id);
    check(
      req.user.role === 'admin' || (req.user.id === person.user_id && period.published),
      'ผลยังไม่เผยแพร่ หรือไม่มีสิทธิ์',
      403,
    );
    ok(res, await result(person.id));
  }),
);
// POST /api/periods/:id/publish — เผยแพร่ผล path: id (admin)
router.post(
  '/periods/:id/publish',
  role('admin'),
  route(async (req, res) => {
    const period = await getPeriod(req.params.id);
    check(period.status !== 'draft', 'รอบยังไม่เปิด');
    const people = await query('SELECT id FROM participants WHERE period_id=?', [period.id]);
    check(people.length, 'ไม่มีผู้รับ');
    for (const person of people)
      check((await result(person.id)).total !== null, 'ต้องส่งครบทุกคนและทุกกรรมการก่อนเผยแพร่');
    await query('UPDATE periods SET published=1 WHERE id=?', [period.id]);
    ok(res);
  }),
);
module.exports = router;
```

**เข้าใจโค้ด**

- `result(id)` รวบรวมผลของผู้รับ 1 คน: คะแนนตนเอง จำนวนข้อที่ครบ (`self_complete`) กรรมการแต่ละคนพร้อมร้อยละ
- ผลรวม (`total`) = ค่าเฉลี่ยร้อยละของกรรมการทุกคน คิดเมื่อผู้รับและกรรมการทุกคนส่งแล้วเท่านั้น
- `GET /reports/:id` ภาพรวมทั้งรอบ + `average` ค่าเฉลี่ยของผู้ที่ผลครบ (สถิติภาพรวม)
- `GET /results/:id` ผู้รับดูได้เฉพาะของตัวเอง และเฉพาะเมื่อเผยแพร่แล้ว
- `POST /periods/:id/publish` เผยแพร่ได้เมื่อทุกคนส่งครบ

**เปิดใช้ใน `server.js`:**

```js
app.use('/api', require('./routes/reports')); // ขั้น 6
```

ตอนนี้ `server.js` ต้องไม่มีบรรทัดไหนขึ้นต้นด้วย `// app.use` แล้ว

💾 `git add -A` แล้ว `git commit -m "ขั้น 6A ผ่าน: API รายงาน"`

---

## 6B — คนที่ 2

### `frontend/src/pages/ReportsPage.vue` — รายงานภาพรวม รายบุคคล พิมพ์ และ PDF

📄 **`frontend/src/pages/ReportsPage.vue`**

```vue
<template>
  <section>
    <h1>รายงานผลประเมิน</h1>
    <div class="actions no-print">
      <!-- หน้าต่างพิมพ์ เลือกเครื่องพิมพ์ "บันทึกเป็น PDF" (Save as PDF) ได้ไฟล์ PDF -->
      <v-btn color="primary" @click="print">พิมพ์ / บันทึก PDF</v-btn>
      <v-btn v-if="report && result" @click="result = null">กลับภาพรวม</v-btn>
    </div>
    <div>
      <h2>รายงานผลการประเมินบุคลากร</h2>
      <template v-if="report && !result">
        <div class="box">
          <h2>{{ report.period.name }}</h2>
          <p>
            ผู้รับทั้งหมด {{ report.results.length }} คน · ผลครบ
            {{ report.results.filter((r) => r.total !== null).length }} คน
          </p>
          <p class="big-number">
            เฉลี่ยเฉพาะผู้ที่ผลครบ:
            {{ report.average === null ? 'ยังไม่มีผล' : report.average + '%' }}
          </p>
        </div>
        <article class="box" v-for="r in report.results" :key="r.person.id">
          <h2>{{ r.person.full_name }}</h2>
          <p>
            ผู้รับ: บันทึกครบ {{ r.self_complete }}/{{ r.indicators.length }} ข้อ ·
            {{ r.person.submitted ? 'ส่งแล้ว' : 'ยังไม่ส่ง' }}
          </p>
          <p>ผลรวม: {{ r.total === null ? 'ยังไม่ครบ' : r.total + '%' }}</p>
          <v-table class="table-wrap">
            <thead>
              <tr>
                <th>กรรมการ</th>
                <th>ความคืบหน้า</th>
                <th>ส่งผล</th>
                <th>คะแนน</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="c in r.committees">
                <td>{{ c.full_name }}</td>
                <td>{{ c.scores.length }}/{{ r.indicators.length }}</td>
                <td>{{ c.submitted ? 'ส่งแล้ว' : 'ยังไม่ส่ง' }}</td>
                <td>
                  {{
                    c.percentage === null
                      ? 'ยังไม่ครบ'
                      : c.percentage + '%' + (c.submitted ? '' : ' (ร่าง)')
                  }}
                </td>
              </tr>
            </tbody>
          </v-table>
          <v-btn class="no-print" @click="select(r.person.id)">ดูรายบุคคล</v-btn>
        </article>
      </template>
      <template v-if="result">
        <div class="box">
          <h2>{{ result.person.full_name }}</h2>
          <p>{{ result.period.name }} · ปี {{ result.period.year }}</p>
          <p class="big-number">
            ผลรวม: {{ result.total === null ? 'ยังไม่ครบ' : result.total + '%' }}
          </p>
          <p>ค่าเฉลี่ยคะแนนกรรมการน้ำหนักเท่ากันทุกคน</p>
        </div>
        <article class="box committee" v-for="c in result.committees" :key="c.id">
          <h2>
            {{ c.full_name }} —
            {{ c.committee_role === 'chair' ? 'ประธาน' : 'กรรมการร่วม' }}
          </h2>
          <p>
            ผล: {{ c.percentage === null ? 'ยังไม่ครบ' : c.percentage + '%' }} ·
            {{ c.submitted ? 'ส่งแล้ว' : 'ร่าง ยังไม่ใช่ผลสุดท้าย' }}
          </p>
          <v-table class="table-wrap">
            <thead>
              <tr>
                <th>หัวข้อ / ตัวชี้วัด</th>
                <th>น้ำหนัก</th>
                <th>คะแนน</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="i in result.indicators">
                <td>{{ i.topic }} / {{ i.name }}</td>
                <td>{{ i.weight }}</td>
                <td>{{ score(c, i) }}</td>
              </tr>
            </tbody>
          </v-table>
          <p>ความเห็น: {{ c.comment || 'ยังไม่มี' }}</p>
          <img
            v-if="signatures[c.id]"
            class="signature"
            :src="signatures[c.id]"
            alt="ลายเซ็นกรรมการ"
          />
        </article>
      </template>
    </div>
  </section>
</template>

<script>
import { api, fileBlob } from '../api';

export default {
  props: ['periodId', 'participantId'],
  data() {
    return { report: null, result: null, signatures: {} };
  },
  async mounted() {
    if (this.participantId) await this.select(this.participantId);
    else this.report = await api('/reports/' + this.periodId);
  },
  methods: {
    async select(id) {
      this.result = await api('/results/' + id);
      this.signatures = {};
      for (const c of this.result.committees)
        if (c.signature) this.signatures[c.id] = await fileBlob('/signatures/' + c.id);
    },
    score(c, i) {
      const s = c.scores.find((s) => s.indicator_id === i.id);
      return s ? s.score : 'ยังไม่กรอก';
    },
    print() {
      window.print();
    },
  },
};
</script>
```

- ปุ่ม "พิมพ์ / บันทึก PDF" ใช้ `window.print()` เปิดหน้าต่างพิมพ์ของเบราว์เซอร์ เลือกเครื่องพิมพ์ **Save as PDF / บันทึกเป็น PDF** จะได้ไฟล์ PDF ภาษาไทยถูกต้อง ไม่ต้องลงไลบรารีเพิ่ม
- CSS `@media print` ใน `style.css` ซ่อนเมนูและปุ่ม (`no-print`) ตอนพิมพ์

### `frontend/src/pages/MyResultsPage.vue` — ผลการประเมินของฉัน (ผู้รับ)

📄 **`frontend/src/pages/MyResultsPage.vue`**

```vue
<template>
  <section>
    <h1>ผลการประเมินของฉัน</h1>
    <p>เลือกดูผลรวม คะแนนและความเห็นจากกรรมการ เมื่อฝ่ายบุคลากรเผยแพร่ผลแล้ว</p>
    <p v-if="!rows.length">ยังไม่มีรอบการประเมิน</p>
    <article class="box" v-for="r in rows" :key="r.id">
      <h2>{{ r.name }} · ปี {{ r.year }}</h2>
      <p class="big-number">
        {{ r.published ? (r.total === null ? 'ผลยังไม่ครบ' : r.total + '%') : 'รอประกาศผล' }}
      </p>
      <v-btn v-if="r.published" color="primary" @click="$emit('result', r.id)"
        >ดูคะแนนกรรมการ / พิมพ์ PDF</v-btn
      >
    </article>
  </section>
</template>
<script>
import { api } from '../api';
export default {
  data() {
    return { rows: [] };
  },
  async mounted() {
    this.rows = await api('/my-results');
  },
};
</script>
```

### เปิดใช้ใน `App.vue`

```js
import ReportsPage from './pages/ReportsPage.vue'; // ขั้น 6
import MyResultsPage from './pages/MyResultsPage.vue'; // ขั้น 6
```

ตอนนี้ `App.vue` ต้องไม่มี `NotReady.vue` เหลือแล้ว

---

## ✅ จุดเช็กขั้น 6

ด้วย **admin**

1. รอบประเมิน → ปุ่ม **รายงาน** ของรอบ → เห็นผู้รับทั้งหมด จำนวนผลครบ และค่าเฉลี่ย (5.1.12, สถิติ)
2. ตารางกรรมการของแต่ละคน: ความคืบหน้า x/y ส่งแล้ว/ยังไม่ส่ง คะแนน (5.1.10, 5.1.11)
3. กด **ดูรายบุคคล** → ตารางคะแนนทุกตัวชี้วัดของกรรมการแต่ละคน ความเห็น ลายเซ็น (5.1.13)
4. กด **พิมพ์ / บันทึก PDF** → ช่องเครื่องพิมพ์เลือก "Save as PDF" → บันทึก → ได้ไฟล์ PDF ภาษาไทยอ่านได้ ไม่มีเมนูและปุ่มติดมา
5. กลับไปหน้าจัดการรอบ → **เผยแพร่ผล** → ขึ้น "เผยแพร่แล้ว"

ด้วย **emp001**

6. เมนู **ผลการประเมินของฉัน** → เห็นร้อยละรวม → กด "ดูคะแนนกรรมการ / พิมพ์ PDF" → เห็นความเห็นและลายเซ็นกรรมการ (5.2.8) → กดพิมพ์ เลือก Save as PDF ได้ไฟล์ (5.2.7)

## 💾 บันทึก

```powershell
git add -A
git commit -m "ขั้น 6 ผ่าน: รายงาน + PDF ระบบครบทุกหน้า"
```

🎉 ถึงตรงนี้ระบบทำงานครบตามโจทย์ส่วน 5 แล้ว

## ❌ ถ้าไม่ผ่าน

- เผยแพร่ไม่ได้ "ต้องส่งครบทุกคนและทุกกรรมการก่อนเผยแพร่" → กรรมการคนที่สองยังไม่ส่ง
- ผู้รับขึ้น "รอประกาศผล" → admin ยังไม่กดเผยแพร่
- PDF มีเมนูหรือปุ่มติดมา → ตรวจว่า `style.css` มีส่วน `@media print` ครบ และปุ่มอยู่ใน `div class="actions no-print"`
- ลายเซ็นไม่ขึ้นในรายงาน → ไฟล์ใน `backend/uploads` ถูกลบ ให้กรรมการเซ็นใหม่ในรอบใหม่
