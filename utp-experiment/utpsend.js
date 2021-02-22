const pull = require('pull-stream')
const multiaddr = require('multiaddr')
const UTP = require('./js-libp2p-utp/src')
const Libp2p = require('libp2p')
const { NOISE } = require('libp2p-noise')
const MPLEX = require('libp2p-mplex')
const pipe = require('it-pipe')
const concat = require('it-concat')


const upgrader = {
  upgradeInbound: maConn => maConn,
  upgradeOutbound: maConn => maConn
}


let log = console.log
const transportKey = UTP.prototype[Symbol.toStringTag]
const createNode = async (port) => {
  const node = await Libp2p.create({
    addresses: {
      // To signal the addresses we want to be available, we use
      // the multiaddr format, a self describable address
      listen: ['/ip4/127.0.0.1/udp/'+port.toString()+'/utp']
    },
    modules: {
      transport: [UTP],
      connEncryption: [NOISE],
      streamMuxer: [MPLEX]
    },
    config: {
      transport: {
        [transportKey]: { // Transport properties -- Libp2p upgrader is automatically added
          upgrader: upgrader,
          local_ip: '127.0.0.1',
          local_port: port
        }
      }
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
    createNode(2002),
    createNode(2003)
  ])



  printAddrs(node1, '1')
  printAddrs(node2, '2')


  //asynch managing of call
  node2.on('/data', async ({ stream }) => {
  const result = await pipe(
    stream,
    concat
  )
  console.log(result.toString())
  })

  node1.peerStore.addressBook.set(node2.peerId, node2.multiaddrs)

  let bra = {signal:null, lma:node1}
  const conn = await node1.dialProtocol(node2.peerId, '/utp', bra)
  console.log(conn)
  // create a new stream within the connection

})();
