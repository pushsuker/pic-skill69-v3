<template>
  <section class="box" v-if="form">
    <h1>ข้อมูลส่วนตัว</h1>
    <p>ชื่อผู้ใช้: {{ form.username }}</p>
    <form @submit.prevent="save">
      <v-text-field v-model="form.full_name" required maxlength="100" label="ชื่อ–นามสกุล" />
      <div class="grid">
        <v-text-field v-model="form.department" maxlength="100" label="แผนก" />
        <v-text-field v-model="form.position" maxlength="100" label="ตำแหน่ง" />
      </div>
      <v-btn color="primary" type="submit">บันทึกข้อมูล</v-btn>
    </form>
  </section>
</template>

<script>
import { api } from '../api';

export default {
  data() {
    return { form: null };
  },
  async mounted() {
    this.form = await api('/me');
  },
  methods: {
    async save() {
      await api('/me', 'PUT', this.form);
      this.$root.user = await api('/me');
      this.$root.message = 'บันทึกข้อมูลส่วนตัวแล้ว';
    },
  },
};
</script>
