<template>
  <v-app>
    <header>
      <div>
        <strong>PIC • ประเมินบุคลากร</strong>
        <small>ฉบับแยก Vue / API</small>
      </div>
      <div v-if="user">
        {{ user.full_name }}
        <v-btn variant="outlined" color="white" @click="logout">ออกจากระบบ</v-btn>
      </div>
    </header>
    <nav v-if="user && !user.must_change_password">
      <template v-if="user.role === 'admin'">
        <v-btn :variant="page === 'periods' ? 'tonal' : 'text'" @click="go('periods')">
          รอบประเมิน
        </v-btn>
        <v-btn :variant="page === 'users' ? 'tonal' : 'text'" @click="go('users')"> ผู้ใช้ </v-btn>
      </template>
      <v-btn v-if="user.role === 'evaluatee'" @click="go('self')">ประเมินตนเอง</v-btn>
      <v-btn v-if="user.role === 'evaluatee'" @click="go('my-results')">ผลการประเมินของฉัน</v-btn>
      <v-btn v-if="user.role === 'evaluator'" @click="go('evaluate')">งานกรรมการ</v-btn>
      <v-btn @click="go('profile')">ข้อมูลส่วนตัว</v-btn>
      <v-btn @click="go('password')">เปลี่ยนรหัสผ่าน</v-btn>
    </nav>
    <main>
      <v-alert v-if="error" type="error" closable @click:close="error = ''">
        {{ error }}
      </v-alert>
      <v-alert v-if="message" type="success" closable @click:close="message = ''">
        {{ message }}
      </v-alert>
      <login-page v-if="!user" @logged-in="login"></login-page>
      <template v-else>
        <password-page v-if="page === 'password'"></password-page>
        <my-results-page v-if="page === 'my-results'" @result="result"></my-results-page>
        <profile-page v-if="page === 'profile'"></profile-page>
        <users-page v-if="page === 'users'"></users-page>
        <periods-page v-if="page === 'periods'" @report="report"></periods-page>
        <self-page v-if="page === 'self'" @result="result"></self-page>
        <evaluate-page v-if="page === 'evaluate'"></evaluate-page>
        <reports-page
          v-if="page === 'reports'"
          :key="periodId + '-' + participantId"
          :period-id="periodId"
          :participant-id="participantId"
        ></reports-page>
      </template>
    </main>
  </v-app>
</template>

<script>
import { api } from './api';
import LoginPage from './pages/LoginPage.vue';
import ProfilePage from './pages/ProfilePage.vue';
import UsersPage from './pages/UsersPage.vue'; // ขั้น 3
import PeriodsPage from './pages/PeriodsPage.vue'; // ขั้น 3
import SelfPage from './pages/SelfPage.vue'; // ขั้น 4
import EvaluatePage from './pages/EvaluatePage.vue'; // ขั้น 5
import ReportsPage from './pages/ReportsPage.vue'; // ขั้น 6
import PasswordPage from './pages/PasswordPage.vue';
import MyResultsPage from './pages/MyResultsPage.vue'; // ขั้น 6
export default {
  components: {
    LoginPage,
    ProfilePage,
    UsersPage,
    PeriodsPage,
    SelfPage,
    EvaluatePage,
    ReportsPage,
    PasswordPage,
    MyResultsPage,
  },
  data() {
    return { user: null, page: '', error: '', message: '', periodId: null, participantId: null };
  },
  async mounted() {
    if (localStorage.getItem('split_token')) {
      try {
        await this.login();
      } catch {
        this.logout();
      }
    }
  },
  methods: {
    async login() {
      this.user = await api('/me');
      this.go(
        this.user.role === 'admin'
          ? 'periods'
          : this.user.role === 'evaluatee'
            ? 'self'
            : 'evaluate',
      );
    },
    logout() {
      localStorage.removeItem('split_token');
      this.user = null;
      this.page = '';
      this.error = '';
      this.message = '';
    },
    go(page) {
      this.page = this.user?.must_change_password ? 'password' : page;
      this.error = '';
      this.message = '';
    },
    report(id) {
      this.periodId = id;
      this.participantId = null;
      this.go('reports');
    },
    result(id) {
      this.participantId = id;
      this.periodId = null;
      this.go('reports');
    },
  },
};
</script>
