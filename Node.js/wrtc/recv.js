'use strict'

const libp2p = require('libp2p')
const wrtc = require('wrtc')
const MPLEX = require('libp2p-mplex')
const NOISE = require('libp2p-noise')
const PeerInfo = require('peer-info')
const defaultsDeep = require('@nodeutils/defaults-deep')
const waterfall = require('async/waterfall')
const WebRTCDirect = require('libp2p-webrtc-direct')
const fs = require('fs');
const pipe = require('it-pipe')
const { collect } = require('streaming-iterables')
const multiaddr = require('multiaddr')
const time = Date
const mockUpgrader = {
upgradeInbound: maConn => maConn,
upgradeOutbound: maConn => maConn
}

let WS = new WebRTCDirect({wrtc: wrtc, upgrader: mockUpgrader, ICEServers: ["stun:stun.l.google.com:19302"] })
;(async () => {

const addr = multiaddr('/ip4/80.30.43.66/tcp/7788/http/p2p-webrtc-direct')


const conn = await WS.dial(addr)
let start = time.now()
const values = await pipe(
  conn,
  collect
)
let end = time.now() - start

let str = values.toString()
console.log("Received: ", str.length, " in ", end/1000)
//FIXME:segfault otherwise
process.exit()
})();
