/* eslint-disable no-console */
'use strict'

const fs = require('fs');
const Libp2p = require('../..')
const TCP = require('libp2p-tcp')
const { NOISE } = require('libp2p-noise')
const Bootstrap = require('libp2p-bootstrap')
const MPLEX = require('libp2p-mplex')
const filters = require('libp2p-websockets/src/filters')
const pipe = require('it-pipe')
const concat = require('it-concat')
var args = process.argv.slice(2);
if (args.length <= 3) {console.log('args: p2pid filetosend iptoconnect');process.exit(-1);}
const transportKey = TCP.prototype[Symbol.toStringTag]
const bootstrapers = [
'/ip4/'+args[1].toString()+'/tcp/2002/p2p/'+args[0].toString()
]

const fname = args[1].toString()



var data = fs.readFileSync(fname, (err, data) => {
        if (err) throw err;
        return data;
});

data = data.toString('base64')

console.log('read data: ', data.length, 'bytes from file ', fname)

;(async () => {
  const node = await Libp2p.create({
    addresses: {
      listen: ['/ip4/0.0.0.0/tcp/5555']
    },
    modules: {
      transport: [TCP],
      streamMuxer: [MPLEX],
      connEncryption: [NOISE],
      peerDiscovery: [Bootstrap]
    },
    config: {
      peerDiscovery: {
        bootstrap: {
          interval: 60e3,
          enabled: true,
          list: bootstrapers
        }
      },
    transport: {
      [transportKey]: { // Transport properties -- Libp2p upgrader is automatically added
        filter: filters.dnsWsOrWss
      }
    }

    }
  })

  node.connectionManager.on('peer:connect', (connection) => {
    console.log('Connection established to:', connection.remotePeer.toB58String())  // Emitted when a peer has been found
    var k = 100; 
    // create a new stream within the connection
    ;(async () => {
      while (k--) {         
        const {collect, take, stream } = await node.dialProtocol(connection.remotePeer, '/data')
        await pipe(
          Array.from(data),
          stream
          )
      }
    })();
  })

  node.on('peer:discovery', (peerId) => {
    // No need to dial, autoDial is on
    console.log('Discovered:', peerId.toB58String())

 })

  await node.start()
})();
