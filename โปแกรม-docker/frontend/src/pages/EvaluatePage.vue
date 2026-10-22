<template>
  <section>
    <h1>งานกรรมการ</h1>
    <p v-if="!list.length">ยังไม่มีงานที่ได้รับมอบหมาย</p>
    <div class="actions">
      <v-btn v-for="a in list" :key="a.id" @click="select(a.id)">
        {{ a.name }} / {{ a.full_name }}
      </v-btn>
    </div>
    <template v-if="data">
      <div class="box">
        <h2>{{ data.person.full_name }} · {{ data.period.name }}</h2>
        <p>
          ผู้รับ: {{ data.person.submitted ? 'ส่งแล้ว' : 'ยังไม่ส่ง' }} · กรรมการ:
          {{ data.assignment.submitted ? 'ส่งแล้ว' : 'ยังไม่ส่ง' }}
        </p>
        <p class="big-number">
          {{ data.percentage === null ? 'ยังบันทึกคะแนนไม่ครบ' : data.percentage + '%' }}
        </p>
        <p v-if="!editable">
          ขณะนี้อ่านได้อย่างเดียว: ตรวจสถานะผู้รับ การส่งของกรรมการ และวันเปิดรอบ
        </p>
      </div>
      <article class="box" v-for="i in data.indicators" :key="i.id">
        <h2>{{ i.topic }} / {{ i.name }}</h2>
        <p>{{ i.detail }} · น้ำหนัก {{ i.weight }}</p>
        <p>คะแนนตนเอง: {{ self(i).score ?? 'ยังไม่กรอก' }} · {{ self(i).description }}</p>
        <div class="actions">
          <v-btn v-if="self(i).evidence_file" @click="evidence(i)">เปิดหลักฐาน</v-btn>
          <a
            v-if="self(i).evidence_url"
            :href="self(i).evidence_url"
            target="_blank"
            rel="noopener"
          >
            เปิด URL หลักฐาน
          </a>
        </div>
        <score-field
          v-model="values[i.id]"
          :type="i.score_type"
          :disabled="!editable"
        ></score-field>
        <v-btn v-if="editable" color="primary" @click="save(i)">บันทึกคะแนนข้อนี้</v-btn>
      </article>
      <div class="box">
        <h2>ตรวจทานคะแนนที่บันทึก</h2>
        <v-table class="table-wrap">
          <thead>
            <tr>
              <th>ตัวชี้วัด</th>
              <th>น้ำหนัก</th>
              <th>คะแนนกรรมการ</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="i in data.indicators">
              <td>{{ i.name }}</td>
              <td>{{ i.weight }}</td>
              <td>{{ savedScore(i) ?? 'ยังไม่บันทึก' }}</td>
            </tr>
          </tbody>
        </v-table>
        <v-textarea
          v-model="comment"
          maxlength="3000"
          :disabled="!editable"
          label="ความเห็นภาพรวม"
        />
        <v-btn v-if="editable" @click="saveComment">บันทึกความเห็น</v-btn>
        <v-file-input
          v-if="editable"
          accept=".png,.jpg,.jpeg"
          v-model="file"
          label="ภาพลายเซ็น PNG / JPEG ไม่เกิน 512 KB"
        />
        <v-btn v-if="editable" @click="upload">บันทึกลายเซ็น</v-btn>
        <img v-if="signature" :src="signature" class="signature" alt="ลายเซ็นกรรมการ" />
        <div class="actions">
          <v-btn
            v-if="editable"
            color="primary"
            :disabled="
              data.percentage === null || !data.assignment.comment || !data.assignment.signature
            "
            @click="submit"
          >
            ยืนยันและส่งผล
          </v-btn>
        </div>
      </div>
    </template>
  </section>
</template>

<script>
import { api, mayEdit, fileBlob, openFile } from '../api';
import ScoreField from '../components/ScoreField.vue';
export default {
  components: { ScoreField },
  data() {
    return {
      list: [],
      data: null,
      values: {},
      comment: '',
      file: null,
      signature: '',
    };
  },
  async mounted() {
    this.list = await api('/my-assignments');
  },
  computed: {
    editable() {
      return (
        this.data &&
        !this.data.assignment.submitted &&
        this.data.person.submitted &&
        mayEdit(this.data.period)
      );
    },
  },
  methods: {
    async select(id) {
      this.data = await api('/evaluate/' + id);
      this.values = {};
      this.file = null;
      for (const i of this.data.indicators) {
        const s = this.data.scores.find((s) => s.indicator_id === i.id);
        this.values[i.id] = s ? s.score : null;
      }
      this.comment = this.data.assignment.comment || '';
      await this.showSignature();
    },
    async refresh() {
      this.data = await api('/evaluate/' + this.data.assignment.id);
    },
    savedScore(i) {
      const s = this.data.scores.find((s) => s.indicator_id === i.id);
      return s ? s.score : null;
    },
    self(i) {
      return this.data.self_scores.find((s) => s.indicator_id === i.id) || {};
    },
    async save(i) {
      await api('/evaluate/' + this.data.assignment.id + '/scores/' + i.id, 'PUT', {
        score: this.values[i.id],
      });
      await this.refresh();
      this.$root.message = 'บันทึกคะแนนแล้ว';
    },
    async saveComment() {
      await api('/evaluate/' + this.data.assignment.id + '/comment', 'PUT', {
        comment: this.comment,
      });
      await this.refresh();
      this.$root.message = 'บันทึกความเห็นแล้ว';
    },
    async showSignature() {
      this.signature = this.data.assignment.signature
        ? await fileBlob('/signatures/' + this.data.assignment.id)
        : '';
    },
    async upload() {
      if (!this.file) throw Error('เลือกภาพลายเซ็นก่อน');
      const f = new FormData();
      f.append('file', Array.isArray(this.file) ? this.file[0] : this.file);
      await api('/evaluate/' + this.data.assignment.id + '/signature', 'POST', f);
      await this.refresh();
      await this.showSignature();
      this.$root.message = 'แนบลายเซ็นแล้ว';
    },
    async evidence(i) {
      await openFile('/files/' + this.self(i).id);
    },
    async submit() {
      if (confirm('ส่งแล้วแก้ไม่ได้ ยืนยัน?')) {
        await api('/evaluate/' + this.data.assignment.id + '/submit', 'POST');
        await this.refresh();
        this.$root.message = 'ส่งผลกรรมการแล้ว';
      }
    },
  },
};
</script>
