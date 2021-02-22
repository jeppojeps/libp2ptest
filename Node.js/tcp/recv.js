/* eslint-disable no-console */
'use strict'


const Libp2p = require('../..')
const TCP = require('libp2p-tcp')
const filters = require('libp2p-websockets/src/filters')
const { NOISE } = require('libp2p-noise')
const MPLEX = require('libp2p-mplex')
const fs = require('fs');
const pipe = require('it-pipe')
const concat = require('it-concat')
const transportKey = WS.prototype[Symbol.toStringTag]


const createNode = async () => {
  const node = await Libp2p.create({
  addresses: {
    // To signal the addresses we want to be available, we use
    // the multiaddr format, a self describable address
    listen: ['/ip4/0.0.0.0/tcp/2002']
  },
  modules: {
    transport: [TCP],
    streamMuxer: [MPLEX],
    connEncryption: [NOISE]
  }
  })
  node.start()
  return node
}
function printAddrs (node, number) {
  console.log('node %s is listening on:', node.peerId.toB58String())
  node.multiaddrs.forEach((ma) => console.log(`${ma.toString()}/p2p/${node.peerId.toB58String()}`))
}


;(async () => {
  const [node1] = await createNode()

  printAddrs(node1, '1')

  const fname = 'testdata'
  var calls = 0;
  var times = 0;
  node1.handle('/data', async ({ stream }) => {
    calls++;
    var start = new Date().getTime()
    var writeStream = fs.createWriteStream(fname);
    const result = await pipe(
      stream,
      concat)
    var tres = new Date().getTime() - start;
    times += tres
    console.log("Received ",result.toString().length, "Bytes in: ", tres/1000, " seconds", "avg:", times/calls/1000)
    var buf = new Buffer.alloc(result.toString().length, result.toString(), 'base64')
    writeStream.write(buf.toString('ascii'))
  })

})();
