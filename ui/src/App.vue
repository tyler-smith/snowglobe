<template>
  <div id="app">
    <Header />
    <Explorer />
  </div>
</template>

<script>
import Header from "./components/Header.vue";
import Explorer from "./components/Explorer.vue";

export default {
  name: "app",
  components: { Header, Explorer }
};
</script>

<style>
  #app {
    font-family: "Avenir", Helvetica, Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  .code {
    font-family: "Source Code Pro", monospace, sans-serif;
  }

  #app ul {
    margin: 0;
  }

  div.card-content {
    padding: .75rem;
  }
</style>
