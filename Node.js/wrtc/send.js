const WebRTCDirect = require('libp2p-webrtc-direct')
const multiaddr = require('multiaddr')
const pipe = require('it-pipe')
const { collect } = require('streaming-iterables')

const addr = multiaddr('/ip4/0.0.0.0/tcp/7788/http/p2p-webrtc-direct')

const Upgrader = {
upgradeInbound: maConn => maConn,
upgradeOutbound: maConn => maConn
}

let out = Array(524288).fill("A")

const webRTCDirect = new WebRTCDirect({upgrader: Upgrader})
;(async () => {
const listener = await webRTCDirect.createListener((socket) => {
  console.log('new connection opened')
  pipe(
    out,
    socket
  )
})

await listener.listen(addr)
console.log('listening')

})();
