<template>
  <section class="box login">
    <h1>{{ register ? 'สมัครผู้รับการประเมิน' : 'เข้าสู่ระบบ' }}</h1>
    <p class="muted">ระบบประเมินบุคลากร • ฉบับพื้นฐาน</p>
    <form @submit.prevent="submit">
      <v-text-field
        v-if="register"
        v-model="form.full_name"
        required
        maxlength="100"
        label="ชื่อ–นามสกุล"
      />
      <v-text-field
        v-model="form.username"
        required
        maxlength="50"
        autocomplete="username"
        label="ชื่อผู้ใช้"
      />
      <v-text-field
        v-model="form.password"
        type="password"
        required
        :minlength="register ? 8 : 1"
        autocomplete="current-password"
        label="รหัสผ่าน"
      />
      <div class="actions">
        <v-btn color="primary" type="submit">
          {{ register ? 'สมัครสมาชิก' : 'เข้าสู่ระบบ' }}
        </v-btn>
        <v-btn variant="text" @click="register = !register">
          {{ register ? 'กลับหน้าเข้าสู่ระบบ' : 'สมัครผู้รับ' }}
        </v-btn>
      </div>
    </form>
  </section>
</template>

<script>
import { api } from '../api';

export default {
  data() {
    return { register: false, form: { username: '', password: '', full_name: '' } };
  },
  methods: {
    async submit() {
      if (this.register) {
        await api('/register', 'POST', this.form);
        this.register = false;
        this.$root.message = 'สมัครสำเร็จ กดเข้าสู่ระบบ';
      } else {
        const result = await api('/login', 'POST', this.form);
        localStorage.setItem('split_token', result.token);
        this.$emit('logged-in');
      }
    },
  },
};
</script>
