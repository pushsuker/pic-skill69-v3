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
