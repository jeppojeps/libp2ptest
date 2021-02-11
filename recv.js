/* eslint-disable no-console */
'use strict'


const Libp2p = require('../..')
const TCP = require('libp2p-tcp')
const { NOISE } = require('libp2p-noise')
const MPLEX = require('libp2p-mplex')

const pipe = require('it-pipe')
const concat = require('it-concat')

const createNode = async () => {
  const node = await Libp2p.create({
    addresses: {
      // To signal the addresses we want to be available, we use
      // the multiaddr format, a self describable address
      listen: ['/ip4/0.0.0.0/tcp/2002']
    },
    modules: {
      transport: [TCP],
      connEncryption: [NOISE],
      streamMuxer: [MPLEX]
    }
  })

  await node.start()
  return node
}

function printAddrs (node, number) {
  console.log('node %s is listening on:', number)
  node.multiaddrs.forEach((ma) => console.log(`${ma.toString()}/p2p/${node.peerId.toB58String()}`))
}


;(async () => {
  const [node1, node2] = await Promise.all([
    createNode(),
  ])

  printAddrs(node1, '1')

  node1.handle('/print', async ({ stream }) => {
  const result = await pipe(
    stream,
    concat
  )
  console.log(result.toString())
  })


})();
