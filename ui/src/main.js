/*jshint esversion: 6 */

import Vue from 'vue';
import App from './App.vue';
import { store } from './store/store';

Vue.config.productionTip = false;

// Create grpc client object
// Get mempool info from grpc client
// this.store.commit("setMempoolInfo");

new Vue({
    el: "#app",
    store: store,
    render: h => h(App)
});