<template>
  <section class="box login">
    <h1>เปลี่ยนรหัสผ่าน</h1>
    <p v-if="$root.user.must_change_password">
      เข้าใช้ครั้งแรก กรุณาตั้งรหัสผ่านใหม่ก่อนใช้งานระบบ
    </p>
    <form @submit.prevent="save">
      <v-text-field
        v-model="form.current_password"
        label="รหัสผ่านปัจจุบัน"
        type="password"
        autocomplete="current-password"
        required
      />
      <v-text-field
        v-model="form.new_password"
        label="รหัสผ่านใหม่"
        type="password"
        autocomplete="new-password"
        minlength="8"
        required
      />
      <v-text-field
        v-model="form.confirm_password"
        label="ยืนยันรหัสผ่านใหม่"
        type="password"
        autocomplete="new-password"
        minlength="8"
        required
      />
      <p>อย่างน้อย 8 ตัวอักษร และต้องต่างจากรหัสเดิม</p>
      <v-btn type="submit" color="primary" :loading="saving">บันทึกรหัสผ่านใหม่</v-btn>
    </form>
  </section>
</template>
<script>
import { api } from '../api';
export default {
  data() {
    return {
      form: { current_password: '', new_password: '', confirm_password: '' },
      saving: false,
    };
  },
  methods: {
    async save() {
      if (this.saving) return;
      this.saving = true;
      try {
        await api('/me/password', 'PUT', this.form);
        await this.$root.login();
        this.$root.message = 'เปลี่ยนรหัสผ่านแล้ว กรุณาใช้รหัสใหม่ในการเข้าสู่ระบบครั้งต่อไป';
      } finally {
        this.saving = false;
      }
    },
  },
};
</script>
