/* eslint-disable */
import { GrpcClient } from "/Users/tyler/dev/grpc-bchrpc-web";

export const sync = (store) => {
  const syncEndpoint = "https://grpc2.snowglobe.cash";
  // const syncEndpoint = "https://grpc.snowglobe.cash";
  const logArgs = function(){ console.log(arguments); };
  const updateState = (s) => { return (data) => {
    if (!data) return;
    store.commit(s, data);
  }; };
  const client = new GrpcClient({ url: syncEndpoint, debug: true });

  // Load overview information
  client
    .getAvalancheInfo()
    .catch(logArgs)
    .then(updateState("setAvaInfo"));

  client
    .getBlockchainInfo()
    .catch(logArgs)
    .then(updateState("setBlockchainInfo"));


  // Setup streams for blocks, transactions, peers, and finalizations
  client.subscribeBlocks()
    .on("end", logArgs)
    .on("status", logArgs)
    .on("data", updateState("addNewBlock"));
    // .on("data", function(data){
    //   console.log("subscrbieBlocks data:");
    //   console.log(arguments);
    //   if (data.getBlockInfo().getHeight() % 10000 === 0) {
    //     console.log(data.getBlockInfo().getHeight());
    //   }
    // });

  client.subscribeTransactions()
    .on("end", logArgs)
    .on("status", logArgs)
    .on("data", updateState("addNewTx"));

  // client.subscribeAvalanchePeers()
  //   .on("end", logArgs)
  //   .on("status", logArgs)
  //   .on("data", updateState("addNewAvaPeer"));
  //
  // client.subscribeAvalancheFinalizations()
  //   .on("end", logArgs)
  //   .on("status", logArgs)
  //   .on("data", updateState("addNewAvaFinalization"));
};
