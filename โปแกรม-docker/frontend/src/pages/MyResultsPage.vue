<template>
  <section>
    <h1>ผลการประเมินของฉัน</h1>
    <p>เลือกดูผลรวม คะแนนและความเห็นจากกรรมการ เมื่อฝ่ายบุคลากรเผยแพร่ผลแล้ว</p>
    <p v-if="!rows.length">ยังไม่มีรอบการประเมิน</p>
    <article class="box" v-for="r in rows" :key="r.id">
      <h2>{{ r.name }} · ปี {{ r.year }}</h2>
      <p class="big-number">
        {{ r.published ? (r.total === null ? 'ผลยังไม่ครบ' : r.total + '%') : 'รอประกาศผล' }}
      </p>
      <v-btn v-if="r.published" color="primary" @click="$emit('result', r.id)"
        >ดูคะแนนกรรมการ / พิมพ์ PDF</v-btn
      >
    </article>
  </section>
</template>
<script>
import { api } from '../api';
export default {
  data() {
    return { rows: [] };
  },
  async mounted() {
    this.rows = await api('/my-results');
  },
};
</script>
