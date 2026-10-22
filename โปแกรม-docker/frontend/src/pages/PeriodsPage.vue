<template>
  <section>
    <h1>รอบประเมินและเกณฑ์</h1>
    <div class="actions">
      <v-text-field v-model="year" type="number" label="กรองปี ค.ศ." />
      <v-btn @click="load">ค้นหา</v-btn>
      <v-btn @click="newPeriod">สร้างรอบใหม่</v-btn>
    </div>
    <v-table class="table-wrap">
      <thead>
        <tr>
          <th>รอบ</th>
          <th>ปี</th>
          <th>สถานะ</th>
          <th>เปิด</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="p in periods" :key="p.id">
          <td>{{ p.name }}</td>
          <td>{{ p.year }}</td>
          <td>{{ p.status }}</td>
          <td>
            <v-btn size="small" @click="select(p.id)">จัดการรอบ</v-btn>
            <v-btn size="small" variant="text" @click="$emit('report', p.id)"> รายงาน </v-btn>
          </td>
        </tr>
      </tbody>
    </v-table>
    <div class="box">
      <h2>{{ data ? 'ข้อมูลรอบที่เลือก' : 'สร้างรอบ' }}</h2>
      <form @submit.prevent="savePeriod">
        <div class="grid">
          <v-text-field
            v-model="form.name"
            required
            :disabled="data && !draft"
            maxlength="100"
            label="ชื่อรอบ"
          />
          <v-text-field
            v-model.number="form.year"
            type="number"
            min="2000"
            max="2100"
            required
            :disabled="data && !draft"
            label="ปี ค.ศ."
          />
          <v-text-field
            v-model="form.start_date"
            type="date"
            required
            :disabled="data && !draft"
            label="วันเริ่ม"
          />
          <v-text-field
            v-model="form.end_date"
            type="date"
            required
            :min="form.start_date"
            :disabled="data && !draft"
            label="วันสิ้นสุด"
          />
        </div>
        <v-btn v-if="!data || draft" type="submit" color="primary">บันทึกรอบ</v-btn>
      </form>
    </div>
    <template v-if="data">
      <criteria-box :data="data" :draft="draft" @changed="reload"></criteria-box>
      <people-box :data="data" :draft="draft" :users="users" @changed="reload"></people-box>
      <div class="box">
        <h2>4. เปิดรอบ / เผยแพร่ / ปิดรอบ</h2>
        <p>เปิดรอบเมื่อหัวข้อ ตัวชี้วัด ผู้รับ และประธานครบแล้ว เผยแพร่ได้เมื่อทุกคนส่งครบ</p>
        <div class="actions">
          <v-btn v-if="draft" color="primary" @click="action('open')">เปิดรอบ</v-btn>
          <v-btn v-if="!draft && !data.period.published" color="primary" @click="action('publish')">
            เผยแพร่ผล
          </v-btn>
          <v-btn v-if="data.period.status === 'open'" @click="action('close')"> ปิดรอบ </v-btn>
          <span v-if="data.period.published">เผยแพร่แล้ว</span>
        </div>
      </div>
    </template>
  </section>
</template>

<script>
import { api } from '../api';
import CriteriaBox from '../components/CriteriaBox.vue';
import PeopleBox from '../components/PeopleBox.vue';

export default {
  components: { CriteriaBox, PeopleBox },
  data() {
    return {
      periods: [],
      users: [],
      data: null,
      year: '',
      form: { name: '', year: new Date().getFullYear(), start_date: '', end_date: '' },
    };
  },
  async mounted() {
    await this.load();
    this.users = await api('/users');
  },
  computed: {
    draft() {
      return this.data && this.data.period.status === 'draft';
    },
  },
  methods: {
    async load() {
      this.periods = await api('/periods' + (this.year ? '?year=' + this.year : ''));
    },
    async select(id) {
      this.data = await api('/periods/' + id);
      this.form = { ...this.data.period };
    },
    newPeriod() {
      this.data = null;
      this.form = { name: '', year: new Date().getFullYear(), start_date: '', end_date: '' };
    },
    async savePeriod() {
      if (this.data) {
        await api('/periods/' + this.data.period.id, 'PUT', this.form);
        await this.select(this.data.period.id);
      } else {
        const r = await api('/periods', 'POST', this.form);
        await this.select(r.id);
      }
      await this.load();
      this.$root.message = 'บันทึกรอบแล้ว';
    },
    async reload() {
      await this.select(this.data.period.id);
      await this.load();
    },
    async action(name) {
      if (confirm('ยืนยัน ' + name + ' รอบนี้?')) {
        await api('/periods/' + this.data.period.id + '/' + name, 'POST');
        await this.reload();
        this.$root.message = 'เปลี่ยนสถานะแล้ว';
      }
    },
  },
};
</script>
