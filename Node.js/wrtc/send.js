const WebRTCDirect = require('libp2p-webrtc-direct')
const multiaddr = require('multiaddr')
const pipe = require('it-pipe')

var args = process.argv.slice(2);
if (args.length < 1) {console.log('args: nbytestosend');process.exit(-1)
;}

const addr = multiaddr('/ip4/0.0.0.0/tcp/7788/http/p2p-webrtc-direct')

const Upgrader = {
upgradeInbound: maConn => maConn,
upgradeOutbound: maConn => maConn
}

bytes = Number(args[0])

//fixing iterator commas wrt nbytes

let out = []

//FIXME:OK this is a bit ugly

//this calculus of size is due to the fact that the it-pipe sends the commas between the array, buffer are not Iterable, FIXME:stream.Passthrough maybe
if (bytes == 1)
  datal = 1
else if (bytes % 2 != 0) {
  datal = (bytes - 1) / 2
  // this below is a padding due to the fact that it-pipe adds a comma for every element that sends
  out = Array(1).fill("A")
}
else{
  datal = (bytes / 2) - 1
  // this below is a padding due to the fact that it-pipe adds a comma for every element that sends
  out = Array(1).fill("AA")
}

out = out.concat(Array(datal).fill("A"))
//TODO End of ugliness

const webRTCDirect = new WebRTCDirect({upgrader: Upgrader})
;(async () => {
const listener = await webRTCDirect.createListener((socket) => {
  console.log('new connection opened')
  pipe(
    out.toString(),
    socket
  )
})

await listener.listen(addr)
console.log('listening')

})();
