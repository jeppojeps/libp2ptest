'use strict'

const utp = require('utp-native')
const toPull = require('stream-to-pull-stream')
const toIterable = require('stream-to-it')
const mafmt = require('mafmt')
const withIs = require('class-is')
const includes = require('lodash.includes')
const isFunction = require('lodash.isfunction')
const Connection = require('interface-connection').Connection
const once = require('once')
const createListener = require('./create-listener.js')
const toConnection = require('./to-conn.js')
const debug = require('debug')
const log = debug('libp2p:utp')

function noop () {}

const mockUpgrader = {
  upgradeInbound: maConn => maConn,
  upgradeOutbound: maConn => maConn
}


class UTP {

  /**
   * @constructor
   * @param {object} options
   * @param {Upgrader} options.upgrader
   */
   constructor ({ upgrader=mockUpgrader, local_ip, local_port }) {
    if (!upgrader) {
      throw new Error('An upgrader must be provided. See https://github.com/libp2p/interface-transport#upgrader.')
    }
    this._upgrader = upgrader
    this._laddr = local_ip
    this._lport = local_port
   }

   async dial (ma, options, callback) {
    if (isFunction(options)) {
      callback = options
      options = {}
    }

    callback = once(callback || noop)

    const cOpts = ma.toOptions()
    log('Connecting (UTP) to %s %s', cOpts.port, cOpts.host)

    const rawSocket = await utp.connect(cOpts.port, cOpts.host)
    rawSocket.localAddr = this._laddr
    rawSocket.localPort = this._lport

    rawSocket.once('timeout', () => {
      log('timeout')
      rawSocket.emit('error', new Error('Timeout'))
    })

    rawSocket.once('error', callback)

    rawSocket.once('connect', () => {
      rawSocket.removeListener('error', callback)
      callback()
    })
    
    const maConn = toConnection(rawSocket, { localAddr: options.dclma.addrs[0], remoteAddr: ma, signal: options.signal})
    console.log('new outbound connection %s', maConn.remoteAddr)
    const conn = await this._upgrader.upgradeOutbound(maConn)
    console.log('outbound connection %s upgraded', maConn.remoteAddr)

    return conn
  }

  createListener (options, handler) {
    if (isFunction(options)) {
      handler = options
      options = {}
    }

    handler = handler || noop

    return createListener(handler)
  }

  filter (multiaddrs) {
    if (!Array.isArray(multiaddrs)) {
      multiaddrs = [multiaddrs]
    }

    return multiaddrs.filter((ma) => {
      if (includes(ma.protoNames(), 'p2p-circuit')) {
        return false
      }

      if (includes(ma.protoNames(), 'ipfs')) {
        ma = ma.decapsulate('ipfs')
      }

      if (includes(ma.protoNames(), 'p2p')) {
        ma = ma.decapsulate('p2p')
      }

      return mafmt.UTP.matches(ma)
    })
  }
}

module.exports = withIs(UTP, { className: 'UTP', symbolName: '@libp2p/js-libp2p-utp/utp' })
