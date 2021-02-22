const pull = require('pull-stream')
const multiaddr = require('multiaddr')
const UTP = require('libp2p-utp')

// logger reads a source and logs it.
let recv
let listener
function logger (read) {
  console.log('got conn')
  var start = new Date().getTime()
  read(null, function next(end, data) {
    if(end === true) {
      var end = new Date().getTime() - start;
      console.log("Received ", recv.toString().length, "Bytes in: ", end/1000, " seconds")
      recv = ''
      return
    }
    if(end) throw end
    recv += data
    console.log('acc data')
    read(null, next)
  })
}

let utp = new UTP()

const ma = multiaddr('/ip4/0.0.0.0/udp/2002/utp')
;(async () => {
  listener = utp.createListener((conn) => {
    pull(conn, logger)
  })
  await listener.listen(ma)
  console.log('listening')
})();
