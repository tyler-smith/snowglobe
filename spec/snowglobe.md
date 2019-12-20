<pre>
  Title: Active local-state reconciliation using Avalanche
  Author: Tyler Smith (tcrypt) <tylersmith.me@gmail.com>
  Status: Draft
  Created: 2019-10-01
  License: Public Domain
</pre>

<!-- AUTO TOC -->
- [Abstract](#abstract)
- [Motivation](#motivation)
- [Goals](#goals)
- [Protocol Overview](#protocol-overview)
- [Specification](#specification)
  - [Support signaling](#support-signaling)
  - [Handshake](#handshake)
  - [Sybil resistance via coin age](#sybil-resistance-via-coin-age)
  - [Identity and Stake Signing and Validation](#identity-and-stake-signing-and-validation)
    - [Creating](#creating)
    - [Validating](#validating)
  - [Security Parameters](#security-parameters)
  - [Acceptance Depth](#acceptance-depth)
  - [DAG Formation](#dag-formation)
  - [Conflict Sets](#conflict-sets)
  - [Sampling Loop](#sampling-loop)
  - [Vote Accumulation](#vote-accumulation)
  - [Joining Consensus](#joining-consensus)
  - [Post-finalization Mempool Update](#post-finalization-mempool-update)
  - [New p2p messages](#new-p2p-messages)
    - [Join](#join)
    - [Query](#query)
    - [QueryResponse](#queryresponse)
- [Future Improvements](#future-improvements)
  - [Short IDs](#short-ids)
  - [Short Votes](#short-votes)
  - [Deduplicate UTXO signatures in Join messages](#deduplicate-utxo-signatures-in-join-messages)
  - [Noise authenticated tunnel](#noise-authenticated-tunnel)
  - [Increasing Acceptance Depth](#increasing-acceptance-depth)
- [Implementations](#implementations)
- [Acknowledgements](#acknowledgements)
- [References](#references)
- [Copyright](#copyright)
<!-- END AUTO TOC -->

# Abstract

This document specifies a propagation protocol for nodes of a Nakamoto Consensus network in which participants actively work to reconcile their local states against each other. It enables nodes to sample each others' state in order to determine which item of a conflict set is currently chosen by the most nodes, and to work toward a super majority of nodes choosing the same set of items. An Avalanche-based consensus algorithm is used for this process affording the protocol asynchrony, metastability, and quiescent finality.

This document will not go into the details of the Avalanche algorithms described in the white paper<sup>[[1]](#References)</sup> and knowledge of them is required of the reader. In depth understand of Nakamoto Concensus<sup>[[2]](#References)</sup> is also required.

# Motivation

The benefits of reducing inter-node entropy on the Bitcoin Cash network have been widely discussed, some of which include increased scalability by moving expensive work out of the critical path<sup>[[3]](#References)</sup>, faster transaction finality/double spend protection sup>[[4]](#References)</sup>, and stronger Byzantine resistance against chain short to medium term reorganization attacks<sup>[[5]](#References)<sup>.

Nakamoto Consensus (NC) has the property of objectivity which is required for nodes wishing to join the consensus trustlessly, and it's achieved using proof of work to give every state a real-world weight. Unfortunately this imposes some non-ideal requirements on the system such synchrony, artificial latency, and indefinite continued maintenance of the consensus, i.e. a state change is never 100% finalized.

By recognizing that the vast majority of nodes making up the mining and large payment infrastructures are always online and very rarely need to join consensus, we can design a protocol that allows them to very quickly come to agreement on a shared, although subjective, view of the network state. The miners of the network continue their task of solidifying their local states into the canonical global state which enables new nodes to join the consensus trustlessly. This protocol seeks to begin the process of utilizing pre-consensus techniques in order to create a faster, more scalable, and more secure Bitcoin Cash.

# Goals

We will outline some goals for our protocol:

- Prove out the viability of a pre-consensus system on Bitcoin Cash
- Uncover areas that need more research or may present issues
- Provide a working pre-consensus system that any node may join and participate in, which can be used for experimentation and information gathering

Additionally, the protocol must have the following properties:

- **Permissionlessness:** Anybody should be able to offer or perform sampling.
- **Low latency:** Decisions finalized on the order of seconds.
- **Metastability:** Participants actively work to collapse toward a single decision and resist tipping backwards.
- **Quiescence:** Once a decision has been reached it is irreversible and no more work needs to be done to maintain that finalized state.
- **Scalable Membership:** We want anybody who is interested to be able to join.
- **Scalable Resource Usage:** We need to scale to global cash levels.
- **Byzantine fault tolerance:** We can't assume that all participants will be honest and need to tolerate malicious behaviors.

# Protocol Overview

We consider every block and transaction to be a member in conflict set of 1 or more items, based on points of mutual exclusion, e.g. spending the same UTXO. We use the Avalanche algorithm to resolve each set into exactly 1 item and the set of all items chosen by the network for their respective conflict sets is used by participants as their local states, giving all participating nodes a shared local state.

Each client maintains a Snowball-based vote accumulator for every unfinalized item it has seen. As soon as an item is seen an accumulator is created and the finalization process begins. For as long as there are unresolved conflict sets a client will pick a random peer, ask them to vote for the items of each set, and feed those votes into the items' vote accumulators. Once the acceptance confidence of an item reaches a threshold its conflict set is resolved; this item is accepted an all conflicting items are rejected. This process continues any time there are unresolved conflicts sets and works constantly until there are no more sets to resolve.

By replacing any rejected items in the mempool with their accepted counterpart, participants in the network should now have nearly identical local states. Combined with the existing canonical ordering rules these clients can now see nearly identity blocks.

# Specification

## Support signaling

The follow service bit should be used by clients to signal to that they
understand the protocol:

```c
NODE_SNOWGLOBE = (1 << 26)
```

## Handshake

When nodes wishing to offer up their state for sampling they should send a Join message to peers with the appropriate service bit set upon connection. Protocol clients that receive a Join message should validate it and either:

1) Ban the peer if the Join message is invalid
2) Add the peer to their participant pool if the Join message is valid

## Sybil resistance via coin age

Sybil resistance is provided by requiring peers offering the Query service to commit to a set of UTXOs that have a sufficient coin amount times block age, which we denote with the unit "Coin Blocks". If a Join message received by a Query peer does not meet the sufficient Coin Blocks threshold, or the message is invalid, that peer must not be added to the Snowglobe Pool and should be banned.

The initial temporary amount required is 1440 Coin Blocks but further research is required to choose an appropriate value.

## Identity and Stake Signing and Validation

### Creating

Queryable nodes must all maintain an secp256k1 key pair which is used by queriers to authenticate messages against a stake. Staking is done by crafting and signing a [Join message](#Join) containing the Identity public key a list of outpoints controlled by the staker. This message is signed using ECDSA by the Identity private key and by the public key that controls each UTXO represented by the committed outpoint.

Only the following UTXO scriptPubkey types are supported:

- Pay-to-Pubkey
- Pay-to-PubkeyHash

In the future the following types could potentially be supported:

- Multisig
- P2SH for well-defined Script pre-images

### Validating

To validate a Join message and its stake a client must first generate the canonical serialized message by removing the signatures. Then it should check that the Identity signature correctly signs the canonical message. Next it needs to verify each outpoint signature against its matching committed outpoint, while simultaneously extracting the public key. Finally it load each of the committed UTXOs, check their type, check that the matching public key is correct, and ensure that Coin Blocks is sufficient.

## Security Parameters

The security parameters, as defined in the Avalanche paper, are set as follows in our protocol:

| **Name** |      **Value**      |                            **Description**                             |
| :------: | :-----------------: | :--------------------------------------------------------------------: |
|    n     | Variable, maximized |      The number of participants; we want to maximize this number.      |
|    k     |          8          |              The number of samples to consider per round.              |
|  𝛼, β   |       0.75, 6       | The percentage and absolute number of votes needed for a round quorum. |
|    ε     |   2<sup>-32</sub>   |         The probability that a finalized item can be reversed.         |

## Acceptance Depth

In order to stay in sync with the NC in the long term participants should recognize a particular Acceptance Depth ("AD") which is the number of blocks they're willing to remain behind the NC tip. When seeing a block >= the AD participants should collapse back to the PoW tip. Determining an ideal AD will require further research. A large AD could greatly increase resistance to chain reorganization attacks but means spending more time on the weakly subjective tip in cases of absolute failure.

For now Snowglobe recommends using and AD of 0 while the protocol matures.

## DAG Formation

The heart of Avalanche's efficiency is in the DAG that allows us to accept or reject entire chains of states with a single Snowball instance. The more connected the graph is the fewer Snowball instances need to be performed to finalize all states, however if forming the graph is too complex much or all of these gains will be used up constructing graph edges.

The solution is to use all naturally-forming objective edges present in the chain already and no artificially generated edges. We define the edges of the graph recursively by defining the incoming edges for a given vertex, depending on its type as follows:

- A transaction has incoming edges from each parent transaction.
- A block has an incoming edge from its parent block and has an incoming edge from each transaction committed to by the block.

## Conflict Sets

Every transaction in block exists in a conflict set based on points of mutex exclusion. These points are as follows:

- A transaction's conflict set is the set of all other transactions spending the same UTXOs.
- A block's conflict set is the set of all other blocks at the same height, committing to the same transactions, or committing to conflicting transactions.

Resolving a conflict set is the process of finalizing acceptance of 1 item, implicitly rejecting all the others.

## Sampling Loop

Each client should continuously perform a sampling loop for all outstanding items, up to a limit of 4096 per request. Each iteration they should choose a random queryable peer, send them a request for the items, and process the returned votes by sending them through the vote accumulators. In pseudo code this looks like:

```pseudo
while items = getItemsToSample():
  peer = getRandomPeer()
  votes = query(peer, items)
  accumulateVotes(votes)
```

## Vote Accumulation

Votes may be one of 3 values: no (0), yes (1), or abstain (2). They are processed by putting them into a Snowball vote accumulator that maintains the last k votes, acceptance state, and the confidence in that state as described by the Avalanche paper. The parameters chosen are k = 8 and 𝛼 = 0.75/β = 6. Votes are tallied on a rolling basis every vote until the confidence hits 128 at which point the item is finalized in its current state and no more votes shall be processed for this accumulator.

## Joining Consensus

When a client first starts up it should refresh its pool of nodes available for sampling. It can do this with a combination of checking nodes they know with the appropriate service bit set, a domain-specific DNS seed, and other standard techniques for finding peers on a p2p network.

Next a client must sync to the tip block; the one with the most proof of work visible to the client. From here the client should begin iteratively checking blocks backwards, from tip to Genesis, until it finds a block that has been accepted by the client's queryable peers. They now know that block, all of its ancestors, and every transaction contained within those blocks have been finalized as accepted by the network. From this point the node only needs to consider new items.

This is a best case and average case of 1 Snowball execution, and worst case of AD executions.

## Post-finalization Mempool Update

When an item is finalized as accepted all conflicting items are automatically, implicitly, finalized as rejected. Nodes must ensure of their mempools the absence of any rejected items and presence of any accepted items as they finalize in order to mimic the other participants that have finalized those items.

## New p2p messages

### Join

When a node wants to advertise to a protocol-aware client that it is offering its local state for sampling, it should send them a Join message built as follows:

| **Size** |     **Name**      |  **Type**   |                                                                **Description**                                                                 |
| :------: | :---------------: | :---------: | :--------------------------------------------------------------------------------------------------------------------------------------------: |
|    1     |      version      |    uint8    |                                              The version of the protocol supported by this peer.                                               |
|    8     |     sequence      |   uint16    |                                 The sequence of this Join message. Used to invalidate pervious Join messages.                                  |
|    33    |  identityPubkey   |  [33]uint8  |                                                         The identity key of this peer.                                                         |
|   []36   |     outpoints     | [][36]uint8 |                                                   A list of outpoints for sybil resistance.                                                    |
|    32    | identitySignature |    uint8    |                                  A signature for this message, without signatures, signed by identityPubkey.                                   |
|   []32   |     outpoints     | [][32]uint8 | A list of signatures for this message, without signatures, signed by the pubkey with control over the outpoint at the same index of outpoints. |

### Query

When a client wants to sample a node for a set of vertices it should send them a Query message build as follows:

| **Size** | **Name** |  **Type**   |                          **Description**                          |
| :------: | :------: | :---------: | :---------------------------------------------------------------: |
|    8     | queryID  |   uint64    | An identifier for the sender to use to relate answers to queries. |
|   []36   |   invs   | [][36]uint8 | A list of inventory vectors for the vertices being queried about. |

### QueryResponse

When a peer receives a query it should respond with a message built as follows:

| **Size** | **Name** | **Type** |                        **Description**                         |
| :------: | :------: | :------: | :------------------------------------------------------------: |
|    8     | queryID  |  uint64  | The queryID send in the request this message is responding to. |
|   []1    |  votes   | []uint8  |               A list of votes, 1 byte per vote.                |

# Future Improvements

The following items are things that would improve the protocol but have been omitted for now to keep the protocol simple.

## Short IDs

Query requests currently use full 32 byte transaction and block identifiers but this can be reduced significantly using various "short ID" mechanisms. This is a clear improvement to be made on memory and bandwidth consumption.

## Short Votes

Currently votes in a query response are an entire byte each even though they're only communication 1.5 bits of information (yes, no, or abstain). Two options for optimizing this are:

1) Packings 4 votes into a byte; 2 bits per vote.
2) Send a list of short IDs of no votes, then a bitmap of yes/abstain votes.

The latter is more complex than the former but it has the potential to be more optimal on average assuming a low ratio of no votes to yes and abstain votes.

## Deduplicate UTXO signatures in Join messages

Currently ever UTXO in a Join message must have a matching signature, however each signature covers the same data and many UTXOs may be controlled by a single pubkey. In this case it would be acceptable to have only one signature for all of these UTXOs.

## Noise authenticated tunnel

The current protocol requires signing every query response to validate its authenticity which is likely to become a bottleneck at scale. We can improve this situation by having peers connect using an authenticated communication tunnel.

Using a protocol conforming to the Noise<sup>[[6](#References)</sup> framework using QUIC for transport is under development by Bitcoin ABC.

## Increasing Acceptance Depth

The most obvious increase in usefulness would come from increasing the Acceptance Depth used by nodes. If a majority of miners use a large AD the network could be more resistant to reorganization attacks but the viability and security of doing this needs further research.

# Implementations

There is a WIP implementation in Go based on the bchd full node: <https://github.com/gcash/bchd/tree/snowglobe/>

Bitcoin ABC's WIP implementation that this protocol was largely developed around is available here: <https://reviews.bitcoinabc.org/source/bitcoin-abc>

# Acknowledgements

Thank you to the following people for helping make this protocol possible:

- [Amaury Séchet (deadalnix)](https://keybase.io/deadalnix) for the base idea of pre-consensus and using Avalanche to implement it, as well as the initial vote accumulator logic and code.

- [Chris Pacia (cpacia)](https://keybase.io/chrispacia) for wiring the initial Avalanche code into bchd as a base for pre-consensus.

- Amaury Sechet, Chris Pacia, and [Antony Zegers (Mengerian)](https://twitter.com/antonyzegers) for important articles on the subject.

- [Emin Gün Sirer](https://keybase.io/egs) and [Colin Cusce](https://twitter.com/collincusce) for helping me understand various aspects of the Avalanche family of algorithms.

# References

1. ["Snowflake to Avalanche"](https://ipfs.io/ipfs/QmUy4jh5mGNZvLkjies1RWM4YuvJh5o2FYopNPVYwrRVGV) by Team Rocket
2. ["Bitcoin: A Peer-to-Peer Electronic Cash System"](https://bitcoin.org/bitcoin.pdf) by Satoshi Nakamoto
3. ["Embrace the DAG"](https://www.youtube.com/watch?v=9PygO-B1o6w) by [Amaury Séchet (deadalnix)](https://keybase.io/deadalnix) ([Archive](http://archive.is/S5LiB,))
4. ["On markets and pre-consensus"](https://www.yours.org/content/on-markets-and-pre-consensus-4454add1bfbe) by Amaury Séchet ([Archive](http://archive.is/Zl5hu))
5. ["The Problems Solved By Avalanche"](https://medium.com/@chrispacia/the-problems-solved-by-avalanche-5575a1b0d7bc) by [Chris Pacia (cpacia)](https://keybase.io/chrispacia) ([Archive](http://archive.is/3ZlKC))
6. ["Avalanche Post-Consensus: Making Bitcoin Cash Indestructible"](https://www.yours.org/content/on-markets-and-pre-consensus-4454add1bfbe) by [Antony Zegers (Mengerian)](https://twitter.com/antonyzegers) ([Archive](http://archive.is/jYPkm))
7. [Noise Protocol](http://www.noiseprotocol.org/)

# Copyright

This document is placed in the public domain.
