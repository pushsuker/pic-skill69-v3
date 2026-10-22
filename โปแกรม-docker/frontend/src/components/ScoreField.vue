<template>
  <v-select
    label="คะแนน"
    :model-value="modelValue"
    :items="options"
    :disabled="disabled"
    item-title="title"
    item-value="value"
    @update:model-value="$emit('update:modelValue', $event)"
  />
</template>
<script>
export default {
  props: ['modelValue', 'type', 'disabled'],
  emits: ['update:modelValue'],
  computed: {
    options() {
      if (this.type === 'boolean')
        return [
          { title: 'ไม่มี (0)', value: 0 },
          { title: 'มี (1)', value: 1 },
        ];
      return [1, 2, 3, 4].map((value) => ({ title: String(value), value }));
    },
  },
};
</script>
