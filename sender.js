/* eslint-disable no-console */
'use strict'

//fix for versions of node 10.8.0
//It looks like globalThis is supported by v8 7.0 and introduced from Node v11 .
//https://github.com/jsdom/jsdom/issues/2795
global.globalThis=global;
//it should work with node v13

const Libp2p = require('../..')
const TCP = require('libp2p-tcp')
const { NOISE } = require('libp2p-noise')
const Bootstrap = require('libp2p-bootstrap')
const MPLEX = require('libp2p-mplex')

const pipe = require('it-pipe')
const concat = require('it-concat')
const bootstrapers = [
'/ip4/2.229.132.52/tcp/2002/p2p/QmXa4CvVtpHWQ2JNFDWaa1ZnwiDXEusn6HhV33Pk5QzRmi'
]

;(async () => {
  const node = await Libp2p.create({
    addresses: {
      listen: ['/ip4/0.0.0.0/tcp/0']
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
      }
    }
  })

  node.connectionManager.on('peer:connect', (connection) => {
    console.log('Connection established to:', connection.remotePeer.toB58String())  // Emitted when a peer has been found
  
    ;(async () => {
      const { stream } = await node.dialProtocol(connection.remotePeer, '/print')
      await pipe(
      ['Hello', ' ', 'p2p', ' ', 'world', '!'],
      stream
      )


    })();
  })

  node.on('peer:discovery', (peerId) => {
    // No need to dial, autoDial is on
    console.log('Discovered:', peerId.toB58String())
  })

  await node.start()
})();
