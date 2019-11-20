<template>
  <div id="app">
    <Header />
    <Explorer />
  </div>
</template>

<script>
import Header from "./components/Header.vue";
import Explorer from "./components/Explorer.vue";

import { GrpcClient } from "grpc-bchrpc-web";
// var res = grpc.getMempoolInfo();

// res
//   .catch(function() {
//     // console.log("Rejection", arguments);
//   })
//   .then(function(data) {
//     this.$store.commit("setMempoolInfo", data);
//     // console.log("Success: " + data.toString());
//   });

export default {
  name: "app",
  components: { Header, Explorer },
  created() {
    const grpc = new GrpcClient("https://grpc.snowglobe.cash:8334");
    var res = grpc.getMempoolInfo();
    var store = this.$store;
    res
      .catch(function() {
        console.log("Rejection", arguments);
      })
      .then(function(data) {
        store.commit("setMempoolInfo", data);
        console.log("Success: " + data.getSize() + "  -  " + data.getBytes());
      });
  }
};
</script>

<style>
#app {
  font-family: "Avenir", Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  /* text-align: center; */
  /* color: #2c3e50; */
}
</style>
