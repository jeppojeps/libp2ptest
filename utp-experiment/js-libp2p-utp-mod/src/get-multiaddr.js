'use strict'

const multiaddr = require('multiaddr')
const Address6 = require('ip-address').Address6

module.exports = (socket) => {
  // utp-native does not pack the remoteAddress
  // TODO check if it is possible
  let ma

  if (socket.remoteFamily === 'IPv6') {
    const addr = new Address6(socket.remoteAddress)

    if (addr.v4) {
      const ip4 = addr.to4().correctForm()
      ma = multiaddr('/ip4/' + ip4 +
        '/udp/' + socket.remotePort
      )
    } else {
      ma = multiaddr('/ip6/' + socket.remoteAddress +
        '/udp/' + socket.remotePort
      )
    }
  } else {
    ma = multiaddr('/ip4/' + socket.remoteAddress +
      '/udp/' + socket.remotePort)
  }

  return ma
}
