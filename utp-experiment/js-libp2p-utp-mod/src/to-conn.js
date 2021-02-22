'use strict'

const abortable = require('abortable-iterator')
const log = require('debug')('libp2p:tcp:socket')
const toPull = require('stream-to-pull-stream')
const toIterable = require('stream-to-it')
const pipe = require('it-pipe')
const toMultiaddr = require('libp2p-utils/src/ip-port-to-multiaddr')
const { CLOSE_TIMEOUT } = 2000

// Convert a stream into a MultiaddrConnection
// https://github.com/libp2p/interface-transport#multiaddrconnection
module.exports = (stream, options = {}) => {
  const maConn = {
    async sink (source) {
      if (options.signal) {
        source = abortable(source, options.signal)
      }

      try {
        await stream.sink((async function * () {
          for await (const chunk of source) {
            // Convert BufferList to Buffer
            yield chunk instanceof Uint8Array ? chunk : chunk.slice()
          }
        })())
      } catch (err) {
        if (err.type !== 'aborted') {
          log.error(err)
        }
      }
    },

    source: stream.source,

    conn: stream,

    localAddr: options.localAddr,

    // If the remote address was passed, use it - it may have the peer ID encapsulated
    remoteAddr: options.remoteAddr, 

    timeline: { open: Date.now() },

    async close () {
      const start = Date.now()

      try {
        await pTimeout(stream.close(), CLOSE_TIMEOUT)
      } catch (err) {
        const { host, port } = maConn.remoteAddr.toOptions()
        log('timeout closing stream to %s:%s after %dms, destroying it manually',
          host, port, Date.now() - start)

        stream.destroy()
      } finally {
        maConn.timeline.close = Date.now()
      }
    }
  }

  stream.once && stream.once('close', () => {
    // In instances where `close` was not explicitly called,
    // such as an iterable stream ending, ensure we have set the close
    // timeline
    if (!maConn.timeline.close) {
      maConn.timeline.close = Date.now()
    }
  })

  return maConn
}
