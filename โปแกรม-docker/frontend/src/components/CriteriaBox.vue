<!-- ส่วนที่ 1 ของหน้ารอบ: หัวข้อและตัวชี้วัด รับ data กับ draft จาก PeriodsPage -->
<template>
  <div class="box">
    <h2>1. หัวข้อและตัวชี้วัด</h2>
    <p>สถานะ: {{ data.period.status }} — หลังเปิดรอบจะแก้เกณฑ์ไม่ได้</p>
    <form v-if="draft" @submit.prevent="saveTopic">
      <v-text-field v-model="topic" required maxlength="100" label="ชื่อหัวข้อ" />
      <v-btn type="submit">{{ topicId ? 'บันทึกชื่อหัวข้อ' : 'เพิ่มหัวข้อ' }}</v-btn>
    </form>
    <p v-for="t in data.topics" :key="t.id">
      {{ t.name }}
      <v-btn
        v-if="draft"
        size="small"
        variant="text"
        @click="
          topic = t.name;
          topicId = t.id;
        "
      >
        แก้ชื่อ
      </v-btn>
    </p>
    <hr />
    <form v-if="draft" @submit.prevent="saveIndicator">
      <h3>{{ indicator.id ? 'แก้ตัวชี้วัด' : 'เพิ่มตัวชี้วัด' }}</h3>
      <div class="grid">
        <v-select
          v-model="indicator.topic_id"
          required
          :disabled="!!indicator.id"
          :items="data.topics"
          item-title="name"
          item-value="id"
          label="หัวข้อ"
        />
        <v-text-field v-model="indicator.name" required maxlength="150" label="ชื่อตัวชี้วัด" />
      </div>
      <v-textarea
        v-model="indicator.detail"
        maxlength="2000"
        label="รายละเอียด / คำแนะนำหลักฐาน"
      />
      <div class="grid">
        <v-text-field
          v-model.number="indicator.weight"
          type="number"
          min="0.01"
          max="10000"
          step="0.01"
          required
          label="น้ำหนัก"
        />
        <v-select
          v-model="indicator.score_type"
          :items="[
            { title: 'ระดับ 1–4', value: 'scale4' },
            { title: 'มี / ไม่มี', value: 'boolean' },
          ]"
          label="ชนิดคะแนน"
        />
        <v-select
          v-model="indicator.evidence_type"
          @update:model-value="indicator.evidence_required = indicator.evidence_type !== 'none'"
          :items="[
            { title: 'ไม่ใช้', value: 'none' },
            { title: 'ไฟล์ PDF / รูปภาพ', value: 'file' },
            { title: 'URL', value: 'url' },
          ]"
          label="หลักฐาน"
        />
        <v-checkbox
          v-model="indicator.evidence_required"
          :disabled="indicator.evidence_type === 'none'"
          label="บังคับแนบหลักฐาน"
        />
      </div>
      <v-btn type="submit" color="primary">บันทึกตัวชี้วัด</v-btn>
    </form>
    <v-table class="table-wrap">
      <thead>
        <tr>
          <th>หัวข้อ / ตัวชี้วัด</th>
          <th>น้ำหนัก</th>
          <th>คะแนน / หลักฐาน</th>
          <th v-if="draft">จัดการ</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="i in data.indicators" :key="i.id">
          <td>
            {{ i.topic }} / {{ i.name }}
            <p>{{ i.detail }}</p>
          </td>
          <td>{{ i.weight }}</td>
          <td>
            {{ i.score_type }} / {{ i.evidence_type }}
            {{ i.evidence_required ? '(บังคับ)' : '' }}
          </td>
          <td v-if="draft">
            <v-btn
              size="small"
              @click="indicator = { ...i, evidence_required: Boolean(i.evidence_required) }"
              >แก้</v-btn
            >
            <v-btn size="small" @click="removeIndicator(i.id)">ลบ</v-btn>
          </td>
        </tr>
      </tbody>
    </v-table>
  </div>
</template>

<script>
import { api } from '../api';
function blank() {
  return {
    topic_id: '',
    name: '',
    detail: '',
    weight: 100,
    score_type: 'scale4',
    evidence_type: 'file',
    evidence_required: true,
  };
}
export default {
  props: ['data', 'draft'],
  emits: ['changed'],
  data() {
    return { topic: '', topicId: null, indicator: blank() };
  },
  methods: {
    async saveTopic() {
      await api(
        this.topicId ? '/topics/' + this.topicId : '/periods/' + this.data.period.id + '/topics',
        this.topicId ? 'PUT' : 'POST',
        { name: this.topic },
      );
      this.topic = '';
      this.topicId = null;
      this.$emit('changed');
    },
    async saveIndicator() {
      await api(
        '/indicators' + (this.indicator.id ? '/' + this.indicator.id : ''),
        this.indicator.id ? 'PUT' : 'POST',
        this.indicator,
      );
      this.indicator = blank();
      this.$emit('changed');
    },
    async removeIndicator(id) {
      if (confirm('ลบตัวชี้วัดนี้?')) {
        await api('/indicators/' + id, 'DELETE');
        this.$emit('changed');
      }
    },
  },
};
</script>
