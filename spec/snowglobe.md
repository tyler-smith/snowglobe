**NOTE: This document is an unfinished work in progress, working toward v0.1.0!**

<pre>
  Title: Active local state reconcilation using Avalanche
  Author: Tyler Smith (tcrypt) <tylersmith.me@gmail.com>
  Status: Draft
  Created: 2019-10-01
  License: MIT
</pre>

<!-- AUTO TOC -->
- [Abstract](#abstract)
- [Motivation](#motivation)
- [Goals](#goals)
- [Protocol Overview](#protocol-overview)
- [Specification](#specification)
  - [Support signaling](#support-signaling)
  - [Security Parameters](#security-parameters)
  - [Acceptance Depth](#acceptance-depth)
  - [Sybil resistance via coin age](#sybil-resistance-via-coin-age)
  - [DAG and conflict-set Formation](#dag-and-conflict-set-formation)
  - [Sampling Lopp](#sampling-lopp)
  - [Vote Accumulation](#vote-accumulation)
  - [Post-finalization Mempool Update](#post-finalization-mempool-update)
  - [New p2p messages](#new-p2p-messages)
    - [Join](#join)
    - [Query](#query)
    - [QueryResponse](#queryresponse)
  - [Joining Full Consensus](#joining-full-consensus)
  - [Maintaining Consensus](#maintaining-consensus)
- [Future Improvements](#future-improvements)
  - [Deduplicated UTXO signatures](#deduplicated-utxo-signatures)
  - [Short IDs](#short-ids)
  - [Noise authenticated tunnel](#noise-authenticated-tunnel)
- [Implementations](#implementations)
- [Acknowledgments](#acknowledgments)
- [References](#references)
- [Copyright](#copyright)
<!-- END AUTO TOC -->

# Abstract

This document specifies a propogation protocol for nodes of a Nakamoto Consensus network in which participants actively work to reconcile their local states against each other. It enables nodes to sample each others' state in order to determine which item of a conflict set is currently chosen by the most nodes, and to work toward a super majority of nodes chosing the same set of items. An Avalanche-based consensus algorithm is used for this process affording the protocol asyncrony, metastability, and quiescent finality.

This document will not go into the details of the Avalanche algorithms and knowledge of them is assumed of the reader.

# Motivation

The benefits of reducing inter-node entropy on the Bitcoin Cash network has been widely discussed, some of which include increased propogation performance([[1]](#References), faster tranasaction finality/double spend protection[[2]](#References), and stronger Byzantine resistance against chain short to medium term reorganization attacks[[3]](#References).

Nakamoto Concensus has the proptery of objectivity which is required for nodes wishing to join the consensus trustlessly, and it's acheived using proof of work to give every state a real-world weight. Unfortunately this imposes some non-ideal requirements on the system such syncrony, artificial latency, and indefinite continued maintance of the consensus, i.e. a state change is never 100% finalized.

By recognizing that the vast majority of nodes making up the mining and large payment infrastructures are always online and very rarely need to join consensus, we can design a protocol that allows them to very quickly come to aggreement on a shared, although subjective, view of the network state. The miners of the network continue their task of solidifying their local states into the canonical global state which enables new nodes to join the consensus trustlessly. This protocol seeks to begin the process of utilizing pre-concensus techniques in order to create a faster, more scalable, and more secure Bitcoin Cash.

# Goals

We will outline some goals for our protocol:

- Prove out the viability of a pre-consensus system on Bitcoin Cash
- Uncover areas that need more research or may present issues
- Provide a working pre-consensus system that any node may join and participate in, which can be used for experimentation and information gathering

Additionally, the protocol must have the following properties:


- Permissionless: Anybody should be able to offer or perform sampling.
- Low finality latency: On the order of 1 second.
- Metastability: Participants quickly collapse toward a single decision and resist tipping backwards.
- Quiescent: once a decision has been reached it is unreversable and no more work needs to be done to maintain the finalized state.
- Scalable membership set: We want anybody who is interested to join.
- Scalable resource usage: We need to scale to global cash levels.
- Byzantine fault tolerant: We can't assume that all participants will be honest and need to tolerate malicious behaviors.

# Protocol Overview

We consider every block and transaction to be a member in conflict set of 1 or more items, based on points of mutual exclusion, e.g. spending the same UTXO. We use the Avalanche algorithm to resolve each set into exactly 1 item and the set of all items chosen by the network for their respective conflict sets is used by participants as their local states, giving all participating nodes a shared local state.

Each client maintains a Snowball-based vote accumulator for every unfinalized item it has seen. As soon as an item is seen an accumulator is created and the finalization process begins. For as long as there are unresolved conflict sets a client will pick a random peer, ask them to vote for the items of each set, and feed those votes into the items' vote accumulators. Once the acceptance confidence of an item reaches a threshold its conflict set is resolved; this item is accepted an all conflicting items are rejected. This process continues any time there are unresolved conflicts sets and works constantly until there are no more sets to resolve.

By replacing any rejected items in the mempool with their accepted counterpart, participants in the network should now have nearly identical local states. Combined with the existing canonical ordering rules these clients can now see nearly identity blocks.

# Specification

## Support signaling

The follow serivce bit should be used by clients to signal to that they
understand the protocol:

```c
NODE_SNOWGLOBE = (1 << 26)
```

## Security Parameters

n
k
alpha
epsilon

## Acceptance Depth

In order to stay in sync with the NC in the long term participants should recognize a particular Acceptance Depth ("AD") which is the number of blocks they're willing to remain behind the NC tip. When seeing a block >= the AD particants should collapse back to the PoW tip. Determining an ideal AD will require further research. A large AD could greatly increase resistance to chain reorganization attacks but means spending more time on the weakly subjective tip in cases of absolute failure.

For now Snowglobe recommends using and AD of 0 while the protocol matures.

## Sybil resistance via coin age

Sybil resistance is provided by requiring peers offering the Query service to
commit to a set of UTXOs that have a sufficient coin amount times block age,
which we denote with the unit "Coin Blocks", or CB. If a Join message
received by a Query peer does not meet the sufficient Coin Blocks threshold that
peer must not be added to the Snowglobe Pool and should be banned.

The initial temporary amount required is 1440 Coin Blocks.

## DAG and conflict-set Formation

The heart of Avalanche's efficiency is in the DAG that allows us to accept or
reject entire chains of states with a single Snowball instance. The more
connected the graph is the fewer Snowball instances need to be performed to
finalize all states, however if forming the graph is too complex much or all of
these gains will be used up constructing graph edges.

The solution is to use all naturally forming, objective edges already present in
the chain already and no more. We define the edges of the graph recursively by
defining the incoming edges for a given vertex. The edges for a vertex depends
on its type and are as follows:

TODO: finish

- **Transactions:** A transaction has incoming edges from each parent transaction.

These are:

1) The flow of UTXOS, i.e. When transaction B spends a UTXO created by
   transaction A then there is a single edge going from A to B.
2) The chain of blocks, i.e. There is edge going from a blocks' parent to the
   block.

## Sampling Lopp

Each client should continuously perform a sampling loop for all outstanding items, up to a limit of 4096 per request. Each iteration they should choose a random queriable peer, send them a request for the items, and process the returned votes by sending them through the vote accumulators. In pseudo code this looks like:

```pseudo
while unfinalizedCount > 0:
  peer = getRandomPeer()
  items = getItemsToSample()
  votes = query(peer, items)
  accumulateVotes(votes)
```

## Vote Accumulation

Votes may be one of 3 values: no (0), yes (1), or abstain (2). They are processed by putting them into a Snowball vote accumulator that maintains the last k votes, acceptance state, and the confidence in that state as described by the Avalanche paper. The parameters chosen are k = 8 and 𝛼 = 0.75 (6). Votes are tallied on a rolling basis every vote until the confidence hits 128 at which point the item is finalized in its current state and no more votes shall be processed.

## Post-finalization Mempool Update

When an item is finalized as accepted all conflicting items are automatically, implicitly, finalized as rejected. Nodes must ensure of their mempools the absense of any rejected items and presense of any accepted items as they finalize in order to mimic the other participants that have finalized those items.

## New p2p messages

### Join

When a node wants to advertise to a protocol-aware client that it is offering
its local state for sampling, it should send them a Join message built as
follows:

| **Size** |     **Name**      |  **Type**   |                                                                **Description**                                                                 |
| :------: | :---------------: | :---------: | :--------------------------------------------------------------------------------------------------------------------------------------------: |
|    1     |      version      |    uint8    |                                              The version of the protocol supported by this peer.                                               |
|    8     |     sequence      |   uint16    |                                 The sequence of this Join message. Used to invalidate pervious Join messages.                                  |
|    33    |  identityPubkey   |  [33]uint8  |                                                         The identity key of this peer.                                                         |
|   []36   |     outpoints     | [][36]uint8 |                                                   A list of outpoints for sybil resistance.                                                    |
|    32    | identitySignature |    uint8    |                                  A signature for this message, without signatures, signed by identityPubkey.                                   |
|   []32   |     outpoints     | [][32]uint8 | A list of signatures for this message, without signatures, signed by the pubkey with control over the outpoint at the same index of outpoints. |

### Query

When a client wants to sample a node for a set of vertices it should send them
a Query message build as follows:

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

## Joining Full Consensus

When a client first starts up it should refresh its pool of nodes available for
sampling. It can do this with a combination of checking nodes they know with the
appropriate service bit set, a domain-specific DNS seed, and other standard
techniques for finding peers on a p2p network.

Next a client must sync to the tip block; the one with the most proof of work
visible to the client. From here the client should begin iteratively checking
blocks backwards, from tip to Genesis, until it finds a block that has been
accepted by the client's queriable peers. They now know that block, all of its
ancestors, and every transaction contained within those blocks have been
finalized as accepted by the network.

This is a best case and average case of 1 Snowball execution, and worst case of AD executions.

## Maintaining Consensus

TODO:

# Future Improvements

The following items are things that would improve the protocol but have been
omitted for now to keep the protocol simple.

## Deduplicated UTXO signatures

Currently ever UTXO in a Join message must have a matching signature, however
each signature covers the same data and many UTXOs may be controlled by a single
pubkey. In this case it would be acceptable to have only one signature for all
of these UTXOs.

## Short IDs

Query requests currently use full 32 byte transaction and block identifiers but
this can be reduced significantly using various "short ID" mechanisms. This is a
clear improvement to be made on memory and bandwidth consumption.

## Noise authenticated tunnel

The current protocol requires signing every query response to validate its
authenticity which is likely to become a bottleneck at scale. We can improve
this situation by having peers connect using an authenticated communication
tunnel.

Using a protocol conforming to the Noise<sup>[[5]](#References)</sup> framework using QUIC for transport
is under development by Bitcoin ABC.

# Implementations

There is a WIP implementation in Go based on the bchd full node: <https://github.com/gcash/bchd/tree/snowglobe/>

Bitcoin ABC's WIP implementation that this protocol was largely developed around is available here: <https://reviews.bitcoinabc.org/source/bitcoin-abc>

# Acknowledgments

Thanks to [Amaury Séchet (deadalnix)](https://keybase.io/deadalnix) for the base idea of pre-concensus and using Avalanche to implement it, as well as the intial vote accumulator logic and code.

Thanks to [Chris Pacia (cpacia)](https://keybase.io/chrispacia) for wiring the initial Avalanche code into bchd as a base for pre-consensus.

Thanks to [Emin Gün Sirer](https://keybase.io/egs) and [Colin Cusce](https://twitter.com/collincusce) for helping me understand various
aspects of the Avalanche family of algorithms.

# References

1. ["Snowflake to Avalanche"](https://ipfs.io/ipfs/QmUy4jh5mGNZvLkjies1RWM4YuvJh5o2FYopNPVYwrRVGV) by Team Rocket
2. ["On markets and pre-consensus"](https://www.yours.org/content/on-markets-and-pre-consensus-4454add1bfbe) by [Amaury Séchet (deadalnix)](https://keybase.io/deadalnix) ([Archive](http://archive.is/Zl5hu))
3. ["Avalanche Post-Consensus: Making Bitcoin Cash Indestructible"](https://www.yours.org/content/on-markets-and-pre-consensus-4454add1bfbe) by [Antony Zegers (Mengerian)](https://twitter.com/antonyzegers) ([Archive](http://archive.is/jYPkm))
4. ["The Problems Solved By Avalanche"](https://medium.com/@chrispacia/the-problems-solved-by-avalanche-5575a1b0d7bc) by [Chris Pacia (cpacia)](https://keybase.io/chrispacia) ([Archive](http://archive.is/3ZlKC))
5. [Noise Protocol](http://www.noiseprotocol.org/)

Embrace the DAG: http://archive.is/S5LiB, https://www.youtube.com/watch?v=9PygO-B1o6w

# Copyright

This document is placed in the public domain.
