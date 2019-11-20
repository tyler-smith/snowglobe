import Vue from 'vue';
import Vuex from 'vuex';

Vue.use(Vuex);

export const store = new Vuex.Store({
    state: {
        mempoolSize: 0,
        mempoolBytes: 0,

        avalancheInfo: null,

        cumulativeFinalizationLatency: 0,
        finalizationCount: 0,

        peers: [
            { pubKey: "pubkey1", state: 144 },
            { pubKey: "pubkey2", state: 28 }
        ],

        // Vertices
        blocks: [
            { hash: "12345", finalizationLatency: 500 },
            { hash: "67890", finalizationLatency: 450 }
        ],
        transactions: [
            { hash: "12345", finalizationLatency: 500 },
            { hash: "67890", finalizationLatency: 450 }
        ]

        // Alternatively to blocks and transactions
        // vertices: [],
        // getters: blocks(), transactions() which return vertices.filter(() -> isBlock()), etc
    },
    getters: {
        mempoolSize: (state) => { return state.mempoolSize; },
        mempoolBytes: (state) => { return state.mempoolBytes; },
    },
    mutations: {
        setMempoolInfo: (state, data) => {
            state.mempoolSize = data.getSize();
            state.mempoolBytes = data.getBytes();
        },
        setAvalancheInfo: (state, data) => {
            state.avalancheInfo = data;
            console.log("!!!!!!!!!!!!!!!!!!");
            console.log(data);
        },
    }
});