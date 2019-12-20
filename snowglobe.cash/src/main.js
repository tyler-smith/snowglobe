/* eslint-disable */
import Vue from 'vue';
import App from './App.vue';
import { store } from './store';
import { sync } from './sync';

// TODO: Create an object that syncs data from the grpc server into the state.
sync(store);

new Vue({
  el: '#app',
  store: store,
  render: h => h(App)
});
