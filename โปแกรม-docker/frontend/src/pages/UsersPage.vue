<template>
  <section>
    <h1>จัดการผู้ใช้</h1>
    <div class="box">
      <h2>{{ form.id ? 'แก้ไขผู้ใช้' : 'เพิ่มผู้ใช้' }}</h2>
      <form @submit.prevent="save">
        <div class="grid">
          <v-text-field
            v-model="form.username"
            required
            :disabled="!!form.id"
            maxlength="50"
            label="ชื่อผู้ใช้"
          />
          <v-text-field
            v-if="!form.id"
            v-model="form.password"
            type="password"
            required
            minlength="8"
            label="รหัสผ่าน"
          />
          <v-text-field v-model="form.full_name" required maxlength="100" label="ชื่อ–นามสกุล" />
          <v-select
            v-model="form.role"
            :disabled="!!form.id"
            :items="
              form.role === 'admin'
                ? [{ title: 'ฝ่ายบุคลากร', value: 'admin' }]
                : [
                    { title: 'ผู้รับการประเมิน', value: 'evaluatee' },
                    { title: 'กรรมการ', value: 'evaluator' },
                  ]
            "
            label="บทบาท"
          />
          <v-text-field v-model="form.department" maxlength="100" label="แผนก" />
          <v-text-field v-model="form.position" maxlength="100" label="ตำแหน่ง" />
        </div>
        <v-checkbox v-if="form.id" v-model="form.active" label="เปิดใช้งานบัญชี" />
        <div class="actions">
          <v-btn type="submit" color="primary">บันทึกผู้ใช้</v-btn>
          <v-btn @click="clear">ล้างฟอร์ม</v-btn>
        </div>
      </form>
    </div>
    <v-table class="table-wrap">
      <thead>
        <tr>
          <th>ชื่อผู้ใช้</th>
          <th>ชื่อ–นามสกุล</th>
          <th>บทบาท</th>
          <th>แผนก</th>
          <th>สถานะ</th>
          <th>จัดการ</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="u in users" :key="u.id">
          <td>{{ u.username }}</td>
          <td>{{ u.full_name }}</td>
          <td>{{ u.role }}</td>
          <td>{{ u.department }}</td>
          <td>{{ u.active ? 'เปิดใช้' : 'ปิดใช้' }}</td>
          <td><v-btn size="small" @click="edit(u)">แก้ไข</v-btn></td>
        </tr>
      </tbody>
    </v-table>
  </section>
</template>

<script>
import { api } from '../api';

export default {
  data() {
    return {
      users: [],
      form: {
        username: '',
        password: '',
        full_name: '',
        department: '',
        position: '',
        role: 'evaluatee',
        active: true,
      },
    };
  },
  async mounted() {
    await this.load();
  },
  methods: {
    async load() {
      this.users = await api('/users');
    },
    edit(user) {
      this.form = { ...user, active: Boolean(user.active) };
    },
    clear() {
      this.form = {
        username: '',
        password: '',
        full_name: '',
        department: '',
        position: '',
        role: 'evaluatee',
        active: true,
      };
    },
    async save() {
      if (this.form.id) await api('/users/' + this.form.id, 'PUT', this.form);
      else await api('/users', 'POST', this.form);
      this.clear();
      await this.load();
      this.$root.message = 'บันทึกผู้ใช้แล้ว';
    },
  },
};
</script>
