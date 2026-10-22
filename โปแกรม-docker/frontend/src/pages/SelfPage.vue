<template>
  <section>
    <h1>ประเมินตนเอง</h1>
    <p v-if="!list.length">ยังไม่มีรอบที่ได้รับมอบหมาย</p>
    <div class="actions">
      <v-btn v-for="p in list" :key="p.id" @click="select(p.id)">{{ p.name }}</v-btn>
    </div>
    <template v-if="data">
      <div class="box">
        <h2>{{ data.period.name }}</h2>
        <p>
          ช่วงวันที่ {{ data.period.start_date }} ถึง {{ data.period.end_date }} ·
          {{ data.period.status }}
        </p>
        <p class="progress">
          ข้อมูลที่บันทึกครบ {{ completed }} / {{ data.indicators.length }} ข้อ ·
          {{ data.person.submitted ? 'ส่งแล้ว' : 'ยังไม่ส่ง' }}
        </p>
        <p v-if="!editable">ขณะนี้แก้ไขไม่ได้: ส่งแล้ว หรือรอบยังไม่เปิด/พ้นกำหนด</p>
        <v-btn v-if="data.period.published" @click="$emit('result', data.person.id)">
          ดูผล / PDF
        </v-btn>
      </div>
      <article class="box" v-for="i in data.indicators" :key="i.id">
        <h2>{{ i.topic }} / {{ i.name }}</h2>
        <p>{{ i.detail }} · น้ำหนัก {{ i.weight }}</p>
        <p>
          หลักฐาน: {{ i.evidence_type }} {{ i.evidence_required ? '(บังคับ)' : '(ไม่บังคับ)' }} ·
          {{ ready(i) ? 'บันทึกครบแล้ว' : 'ยังไม่ครบ' }}
        </p>
        <score-field
          v-model="rows[i.id].score"
          :type="i.score_type"
          :disabled="!editable"
        ></score-field>
        <v-textarea
          v-model="rows[i.id].description"
          maxlength="3000"
          :disabled="!editable"
          label="รายละเอียดผลงาน"
        />
        <v-text-field
          v-if="i.evidence_type === 'url'"
          v-model="rows[i.id].evidence_url"
          type="url"
          maxlength="1000"
          :disabled="!editable"
          label="URL หลักฐาน"
        />
        <v-btn v-if="editable" color="primary" @click="save(i)">บันทึกข้อนี้</v-btn>
        <template v-if="i.evidence_type === 'file'">
          <v-file-input
            v-if="editable"
            accept=".pdf,.png,.jpg,.jpeg"
            v-model="files[i.id]"
            label="ไฟล์ PDF / PNG / JPEG ไม่เกิน 5 MB"
          />
          <div class="actions">
            <v-btn v-if="editable" @click="upload(i)">แนบไฟล์</v-btn>
            <v-btn v-if="savedRow(i) && savedRow(i).evidence_file" @click="evidence(i)">
              เปิดไฟล์หลักฐาน
            </v-btn>
          </div>
          <p class="muted">บันทึกคะแนนก่อนแนบ หนึ่งข้อต่อหนึ่งไฟล์ แนบใหม่ใช้ไฟล์ล่าสุด</p>
        </template>
        <a
          v-if="savedRow(i) && savedRow(i).evidence_url"
          :href="savedRow(i).evidence_url"
          target="_blank"
          rel="noopener"
        >
          เปิด URL ที่บันทึก
        </a>
      </article>
      <v-btn
        v-if="editable"
        color="primary"
        :disabled="completed !== data.indicators.length"
        @click="submit"
      >
        ส่งการประเมินตนเอง
      </v-btn>
    </template>
  </section>
</template>

<script>
import { api, mayEdit, openFile } from '../api';
import ScoreField from '../components/ScoreField.vue';
export default {
  components: { ScoreField },
  data() {
    return { list: [], data: null, rows: {}, files: {} };
  },
  async mounted() {
    this.list = await api('/my-periods');
  },
  computed: {
    editable() {
      return this.data && !this.data.person.submitted && mayEdit(this.data.period);
    },
    completed() {
      return this.data ? this.data.indicators.filter((i) => this.ready(i)).length : 0;
    },
  },
  methods: {
    async select(id) {
      this.data = await api('/self/' + id);
      this.rows = {};
      this.files = {};
      for (const i of this.data.indicators) {
        const old = this.data.scores.find((s) => s.indicator_id === i.id);
        this.rows[i.id] = {
          score: old ? old.score : null,
          description: old ? old.description : '',
          evidence_url: old ? old.evidence_url : '',
        };
      }
    },
    ready(i) {
      const s = this.data.scores.find((s) => s.indicator_id === i.id);
      return (
        s &&
        s.description.trim() &&
        (!i.evidence_required || (i.evidence_type === 'file' ? s.evidence_file : s.evidence_url))
      );
    },
    savedRow(i) {
      return this.data.scores.find((s) => s.indicator_id === i.id);
    },
    async refresh() {
      this.data = await api('/self/' + this.data.person.id);
    },
    async save(i) {
      await api('/self/' + this.data.person.id + '/scores/' + i.id, 'PUT', this.rows[i.id]);
      await this.refresh();
      this.$root.message = 'บันทึก ' + i.name + ' แล้ว';
    },
    async upload(i) {
      if (!this.files[i.id]) throw Error('เลือกไฟล์ก่อน');
      const form = new FormData();
      form.append('file', Array.isArray(this.files[i.id]) ? this.files[i.id][0] : this.files[i.id]);
      await api('/self/' + this.data.person.id + '/files/' + i.id, 'POST', form);
      await this.refresh();
      this.$root.message = 'แนบไฟล์แล้ว';
    },
    async evidence(i) {
      await openFile('/files/' + this.savedRow(i).id);
    },
    async submit() {
      if (confirm('ส่งแล้วแก้ไม่ได้ ยืนยันส่ง?')) {
        await api('/self/' + this.data.person.id + '/submit', 'POST');
        await this.refresh();
        this.$root.message = 'ส่งการประเมินตนเองแล้ว';
      }
    },
  },
};
</script>
