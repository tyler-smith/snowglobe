/* eslint-disable */
import  Vue   from 'vue';
import Vuex from 'vuex';

Vue.use(Vuex);

export const store = new Vuex.Store({
  state: {
    bestBlockHeight: 0,

    mempoolSize: 0,
    mempoolBytes: 0,

    avalancheInfo: null,

    cumulativeFinalizationLatency: 0,
    finalizationCount: 0,

    peers: [
      // { pubKey: "pubkey1", state: 144 },
      // { pubKey: "pubkey2", state: 28 }
    ],

    // Vertices
    blocks: [
      { hash: "12345", finalizationLatency: 500 },
      { hash: "67890", finalizationLatency: 450 },
      { hash: "67890", finalizationLatency: 450 },
      { hash: "67890", finalizationLatency: 450 },
      { hash: "67890", finalizationLatency: 450 }
    ],
    transactions: [
      { hash: "12345", finalizationLatency: 500 },
      { hash: "67890", finalizationLatency: 450 }
    ],
    finalizations: [],

    // Alternatively to blocks and transactions
    // vertices: [],
    // getters: blocks(), transactions() which return vertices.filter(() -> isBlock()), etc
  },
  getters: {
    mempoolSize: (state) => { return state.mempoolSize; },
    mempoolBytes: (state) => { return state.mempoolBytes; },
    avalancheInfo: (state) => { return state.avalancheInfo || {}; },
    peers: (state) => { return state.peers || []; }
  },
  mutations: {
    setMempoolInfo: (state, data) => {
      console.log("Mempool Info:");
      console.log(data);
      console.log(data.getSize());
      console.log(data.getBytes());
      state.mempoolSize = data.getSize();
      state.mempoolBytes = data.getBytes();
    },
    setBlockchainInfo: (state, data) => {
      console.log("getBlockchainInfo data:");
      console.log(data);
      if (!data) {
        return;
      }
      state.bestBlockHeight = data.getBestHeight();
    },
    setAvaInfo: (state, data) => {
      state.avalancheInfo = data;

      console.log("getAvalancheInfo data:");
      console.log(data);
      if (!data) {
        return;
      }
      console.log(data.getCurrentPeerCount());
      console.log(data.getSeenPeerCount());

      console.log(data.getPendingBlockCount());
      console.log(data.getFinalizedAcceptedBlockCount());
      console.log(data.getFinalizedRejectedBlockCount());

      console.log(data.getPendingTransactionCount());
      console.log(data.getFinalizedAcceptedTransactionCount());
      console.log(data.getFinalizedRejectedTransactionCount());

      var peers = data.getPeersList();
      for (var i in peers) {
        if (state.peers.length >= 20) {
          state.peers = state.peers.slice(0,20);
          return;
        }
        console.log("peer key:");
        console.log(formatHash(peers[i].getPublicKey()));
        state.peers.push({
          publicKey: formatHash(peers[i].getPublicKey()),
          sequence: peers[i].getSequence(),
          version: peers[i].getVersion(),
          outPoints:  peers[i].getOutPointsList(),
          outPointSignatures: peers[i].getOutPointSignaturesList_asU8(),
          identitySignature: peers[i].getIdentitySignature_asU8().toString('hex')
        });
      }
    },
    addNewBlock: (state, data) => {
      console.log('addNewBlock');
      var info = data.getBlockInfo();

      if (info.getHeight() <= state.bestBlockHeight) {
        // return;
      }
      console.log("hash2:", info.getHash());
      state.blocks.unshift({ hash: info.getHash(), finalizationLatency: 500 })
      console.log("addNewBlock: " + data.getBlockInfo().getHeight());
    },
    addNewTx: (state, data) => {
      console.log("addNewTx data:")
      console.log(data);
    },
    addNewAvaPeer: (state, data) => {
      console.log("addNewAvaPeer data:")
      console.log(data);
    },
    addNewAvaFinalization: (state, data) => {
      console.log("addNewAvaFinalization data:")
      console.log(data);
    }
  }
});

var formatHash = (hash) => {
  var s = '0x';
  hash.forEach(function(byte) {
    s += ('0' + (byte & 0xFF).toString(16)).slice(-2);
    console.log(s);
  });

  // for (var i = s.length; s.length < 68; i++){
  //   s += '0';
  // }
  return s;
};
