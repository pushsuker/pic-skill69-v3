<!-- ส่วนที่ 2–3 ของหน้ารอบ: ผู้รับการประเมิน และมอบหมายกรรมการ -->
<template>
  <div>
    <div class="box">
      <h2>2. ผู้รับการประเมิน</h2>
      <form v-if="draft" @submit.prevent="addPerson">
        <v-select
          v-model="person"
          required
          :items="users.filter((u) => u.role === 'evaluatee' && u.active)"
          item-title="full_name"
          item-value="id"
          label="ผู้รับ"
        />
        <v-btn type="submit">เพิ่มเข้ารอบ</v-btn>
      </form>
      <p v-for="p in data.participants">
        {{ p.full_name }} — {{ p.submitted ? 'ส่งแล้ว' : 'ยังไม่ส่ง' }}
      </p>
    </div>
    <div class="box">
      <h2>3. มอบหมายกรรมการ</h2>
      <form v-if="draft" @submit.prevent="assign">
        <div class="grid">
          <v-select
            v-model="assignment.participant_id"
            required
            :items="data.participants"
            item-title="full_name"
            item-value="id"
            label="ผู้รับในรอบ"
          />
          <v-select
            v-model="assignment.evaluator_id"
            required
            :items="users.filter((u) => u.role === 'evaluator' && u.active)"
            item-title="full_name"
            item-value="id"
            label="กรรมการ"
          />
          <v-select
            v-model="assignment.committee_role"
            :items="[
              { title: 'ประธาน', value: 'chair' },
              { title: 'กรรมการร่วม', value: 'member' },
            ]"
            label="หน้าที่"
          />
        </div>
        <v-btn type="submit">มอบหมาย</v-btn>
      </form>
      <v-table class="table-wrap">
        <thead>
          <tr>
            <th>ผู้รับ</th>
            <th>กรรมการ</th>
            <th>หน้าที่</th>
            <th>สถานะ</th>
            <th v-if="draft">จัดการ</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="a in data.assignments">
            <td>{{ a.evaluatee_name }}</td>
            <td>{{ a.evaluator_name }}</td>
            <td>{{ a.committee_role === 'chair' ? 'ประธาน' : 'กรรมการร่วม' }}</td>
            <td>{{ a.submitted ? 'ส่งแล้ว' : 'ยังไม่ส่ง' }}</td>
            <td v-if="draft">
              <v-btn size="small" @click="unassign(a.id)">ถอนมอบหมาย</v-btn>
            </td>
          </tr>
        </tbody>
      </v-table>
    </div>
  </div>
</template>

<script>
import { api } from '../api';
export default {
  props: ['data', 'draft', 'users'],
  emits: ['changed'],
  data() {
    return {
      person: '',
      assignment: { participant_id: '', evaluator_id: '', committee_role: 'chair' },
    };
  },
  methods: {
    async addPerson() {
      await api('/periods/' + this.data.period.id + '/participants', 'POST', {
        user_id: this.person,
      });
      this.person = '';
      this.$emit('changed');
    },
    async assign() {
      await api('/assignments', 'POST', this.assignment);
      this.assignment = { participant_id: '', evaluator_id: '', committee_role: 'chair' };
      this.$emit('changed');
    },
    async unassign(id) {
      await api('/assignments/' + id, 'DELETE');
      this.$emit('changed');
    },
  },
};
</script>
