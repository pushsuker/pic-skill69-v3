import { createApp } from 'vue';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';
import 'vuetify/styles';
import '@mdi/font/css/materialdesignicons.css';
import './style.css';
import App from './App.vue';

const vuetify = createVuetify({
  components,
  directives,
  defaults: {
    VTextField: { variant: 'outlined' },
    VTextarea: { variant: 'outlined', rows: 3 },
    VSelect: { variant: 'outlined' },
    VFileInput: { variant: 'outlined' },
  },
});
const app = createApp(App);
app.use(vuetify);
let screen;
app.config.errorHandler = (error) => {
  if (screen) screen.error = error.message;
};
screen = app.mount('#app');
