/* eslint-disable no-console */
'use strict'

const fs = require('fs');
const Libp2p = require('../..')
const WS = require('libp2p-websockets')
const filters = require('libp2p-websockets/src/filters')
const { NOISE } = require('libp2p-noise')
const Bootstrap = require('libp2p-bootstrap')
const MPLEX = require('libp2p-mplex')

const pipe = require('it-pipe')
const concat = require('it-concat')
var args = process.argv.slice(2);
if (args.length <= 2) {console.log('args: p2pid filetosend hostname');process.exit(-1);}
const transportKey = WS.prototype[Symbol.toStringTag]
const bootstrapers = [
'/dns4/'+args[2]+'/tcp/2002/ws/p2p/'+args[0].toString()
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
      listen: ['/dns4/localhost/tcp/7788/ws']
    },
    modules: {
      transport: [WS],
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
    // create a new stream within the connection
  })

  await node.start()
})();
