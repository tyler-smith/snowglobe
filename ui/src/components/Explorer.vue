<template>
  <div class="columns">
    <div class="column is-half">
      <div class="columns">
        <div class="column is-half">
          <section class="section">
            <div class="container content">
              <h1>Snowglobe Protocol</h1>
              <!-- <h1>Snowglobe Network</h1> -->
              The
              <strong>Snowglobe</strong> protocol enables
              <strong>
                <a href="#">Bitcoin Cash</a>
              </strong> nodes to actively reconcile their mempools using the
              <strong>
                <a href="#">Avalanche</a>
              </strong> concensus algorithm. It is a
              combination of concepts commonly referred to as
              <strong>pre and post concensus</strong>.
            </div>
          </section>
        </div>
        <div class="column is-half">
          <section class="section">
            <div class="container">
              <img src="images/bch-dark.png" id="bch-logo" class="logo" />
              <p class="plus-sign">+</p>
              <img src="images/avalanche.png" id="avalanche-logo" class="logo" />
            </div>
          </section>
        </div>
      </div>
      <div class="columns data-points">
        <div class="column is-one-third">
          <section class="section">
            <div class="container">
              <div class="card">
                <header class="card-header">
                  <p class="card-header-title">Peers Online</p>
                </header>
                <div class="card-content">
                  <div class="content">23</div>
                </div>
              </div>
            </div>
          </section>
        </div>
        <div class="column is-one-third">
          <section class="section">
            <div class="container">
              <div class="card">
                <header class="card-header">
                  <p class="card-header-title">Finalization Rate</p>
                </header>
                <div class="card-content">
                  <div class="content">{{ mempoolSize }} mempool count</div>
                </div>
              </div>
            </div>
          </section>
        </div>
        <div class="column is-one-third">
          <section class="section">
            <div class="container">
              <div class="card">
                <header class="card-header">
                  <p class="card-header-title">Finalization Rate</p>
                </header>
                <div class="card-content">
                  <div class="content">{{ mempoolBytes }} mempool bytes</div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
      <div class="columns">
        <div class="column">
          <section class="section">
            <div class="container">
              <div class="card">
                <header class="card-header">
                  <p class="card-header-title">Peers</p>
                </header>
                <div class="card-content">
                  <div class="content">
                    <ul id="peerList ">
                      <li>AABBCCDD</li>
                      <li>AABBCCDD</li>
                      <li>AABBCCDD</li>
                      <li>AABBCCDD</li>
                    </ul>
                  </div>
                </div>
                <footer class="card-footer">
                  <a class="card-footer-item">Save</a>
                  <a class="card-footer-item">Edit</a>
                  <a class="card-footer-item">Delete</a>
                </footer>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
    <div class="column is-half">
      <section class="section">
        <div class="container">
          <div class="card">
            <header class="card-header">
              <p class="card-header-title">Recent Blocks</p>
            </header>
            <div class="card-content">
              <div class="content">
                <ul id="blockList ">
                  <li v-for="(block, index) in blocks" v-bind:key="index">
                    <a :href="getBlockURLFromHash(block.hash)">{{ block.hash }}</a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section class="section">
        <div class="container">
          <div class="card">
            <header class="card-header">
              <p class="card-header-title">Recent Transactions</p>
            </header>
            <div class="card-content">
              <div class="content">
                <ul id="transactionList ">
                  <li>AABBCCDD</li>
                  <li>AABBCCDD</li>
                  <li>AABBCCDD</li>
                  <li>AABBCCDD</li>
                </ul>
              </div>
            </div>
            <footer class="card-footer">
              <a class="card-footer-item">Save</a>
              <a class="card-footer-item">Edit</a>
              <a class="card-footer-item">Delete</a>
            </footer>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script>
import { GrpcClient } from "grpc-bchrpc-web";

export default {
  computed: {
    blocks() {
      return this.$store.state.blocks;
    },
    mempoolSize() {
      return this.$store.state.mempoolSize;
    },
    mempoolBytes() {
      return this.$store.state.mempoolBytes;
    }
  },

  methods: {
    getBlockURLFromHash: hash => {
      return "https://explorer.bitcoin.com/bch/block/" + hash;
    }
  },

  created() {
    const grpc = new GrpcClient({ url: "https://grpc.snowglobe.cash" });
    const $this = this;
    var res = grpc.getMempoolInfo();
    res
      .catch(function() {
        // console.log("Rejection", arguments);
      })
      .then(function(data) {
        console.log("getMempoolInfo data:");
        $this.$store.commit("setMempoolInfo", data);
        // console.log("Success: " + data.toString());
      });

    console.log(grpc.getAvalancheInfo);
    res = grpc.getAvalancheInfo();
    res
      .catch(function() {
        // console.log("Rejection", arguments);
      })
      .then(function(data) {
        console.log("getAvalancheInfo data:");
        console.log(data);
        console.log(data.getCurrentPeerCount());
        console.log(data.getSeenPeerCount());

        console.log(data.getPendingBlockCount());
        console.log(data.getFinalizedAcceptedBlockCount());
        console.log(data.getFinalizedRejectedBlockCount());

        console.log(data.getPendingTransactionCount());
        console.log(data.getFinalizedAcceptedTransactionCount());
        console.log(data.getFinalizedRejectedTransactionCount());
        $this.$store.commit("setAvalancheInfo", data);
        // console.log("Success: " + data.toString());
      });
  }
};
</script>

<style scoped>
section.section {
  padding-bottom: 20px !important;
  padding-top: 20px !important;
}

section.section h1 {
  margin-top: -5px;
}

.plus-sign {
  text-align: center;
  font-weight: bolder;
  font-size: 28px;
}

li {
  background: white;
  list-style-type: none;
}

li:nth-child(odd) {
  background: #eff1f6;
}
</style>
