package main

import (
	"bufio"
	"context"
	"crypto/rand"
	"flag"
	"fmt"
	"time"
	"strings"
	"io"
	"io/ioutil"
	"log"
	mrand "math/rand"

	"github.com/libp2p/go-libp2p"
	"github.com/libp2p/go-libp2p-core/crypto"
	"github.com/libp2p/go-libp2p-core/host"
	"github.com/libp2p/go-libp2p-core/network"
	"github.com/libp2p/go-libp2p-core/peer"
	"github.com/libp2p/go-libp2p-core/peerstore"
  libp2pquic "github.com/libp2p/go-libp2p-quic-transport"
  noise "github.com/libp2p/go-libp2p-noise"
	golog "github.com/ipfs/go-log/v2"
	ma "github.com/multiformats/go-multiaddr"
  ws "github.com/libp2p/go-ws-transport"
  tcp "github.com/libp2p/go-tcp-transport"
)

// makeBasicHost creates a LibP2P host with a random peer ID listening on the
// given multiaddress. It won't encrypt the connection if insecure is true.
func makeBasicHost(listenPort int, insecure bool, randseed int64, transport int) (host.Host, error) {

	// If the seed is zero, use real cryptographic randomness. Otherwise, use a
	// deterministic randomness source to make generated keys stay the same
	// across multiple runs
	var r io.Reader
	if randseed == 0 {
		r = rand.Reader
	} else {
		r = mrand.New(mrand.NewSource(randseed))
	}

	// Generate a key pair for this host. We will use it at least
	// to obtain a valid host ID.
	priv, _, err := crypto.GenerateKeyPairWithReader(crypto.RSA, 2048, r)
	if err != nil {
		return nil, err
	}

	opts := []libp2p.Option{
		libp2p.ListenAddrStrings(fmt.Sprintf("/ip4/0.0.0.0/tcp/%d", listenPort)),
		libp2p.ListenAddrStrings(fmt.Sprintf("/ip4/0.0.0.0/udp/%d/quic", listenPort+1)),
		libp2p.ListenAddrStrings(fmt.Sprintf("/ip4/0.0.0.0/tcp/%d/ws", listenPort+2)),
		libp2p.Identity(priv),
		libp2p.DisableRelay(),
    libp2p.Transport(libp2pquic.NewTransport),
    libp2p.Transport(ws.New),
    libp2p.Transport(tcp.NewTCPTransport),
    libp2p.Security(noise.ID, noise.New),
	}

	if insecure {
		opts = append(opts, libp2p.NoSecurity)
	}

	basicHost, err := libp2p.New(context.Background(), opts...)
	if err != nil {
		return nil, err
	}

	// Build host multiaddress
	hostAddr, _ := ma.NewMultiaddr(fmt.Sprintf("/ipfs/%s", basicHost.ID().Pretty()))

	// Now we can build a full multiaddress to reach this host
	// by encapsulating both addresses:
	addr := basicHost.Addrs()[transport]
	fullAddr := addr.Encapsulate(hostAddr)
	log.Printf("I am %s\n", fullAddr)
	if insecure {
		log.Printf("Now run \"./echo -l %d -d %s -insecure\" on a different terminal\n", listenPort+1, fullAddr)
	} else {
		log.Printf("Now run \"./echo -l %d -d %s\" on a different terminal\n", listenPort+1, fullAddr)
	}

	return basicHost, nil
}

func main() {
	// LibP2P code uses golog to log messages. They log with different
	// string IDs (i.e. "swarm"). We can control the verbosity level for
	// all loggers with:
	golog.SetAllLoggers(golog.LevelInfo) // Change to INFO for extra info

	// Parse options from the command line
	listenF := flag.Int("l", 0, "wait for incoming connections")
	target := flag.String("d", "", "target peer to dial")
	insecure := flag.Bool("insecure", false, "use an unencrypted connection")
	seed := flag.Int64("seed", 0, "set random seed for id generation")
  sfile := flag.Int("s", 2, "size to send")
  transport := flag.Int("t", 0, "transport to use 0 (tcp/noise) -  1 (udp/quic) - 2 (tcp/websocket)")
	flag.Parse()

	if *listenF == 0 {
		log.Fatal("USAGE:\n\t-l listening port\n\t-d target peer to dial\n\t-insecure use an unencrypted connection\n\t-seed set random seed for id generation\n\t-s size(bytes) to send\n\t-t transport to use 0 (tcp/noise) -  1 (udp/quic) - 2 (tcp/websocket)\n")
	}

	// Make a host that listens on the given multiaddress
	ha, err := makeBasicHost(*listenF, *insecure, *seed, *transport)
	if err != nil {
		log.Fatal(err)
	}

	// Set a stream handler on host A. /echo/1.0.0 is
	// a user-defined protocol name.
	ha.SetStreamHandler("/echo/1.0.0", func(s network.Stream) {
		log.Println("Got a new stream!")

		if err := doEcho(s, *listenF, *sfile); err != nil {
			log.Println(err)
			s.Reset()
		} else {
			s.Close()
		}
	})

	if *target == "" {
		log.Println("listening for connections")
		select {} // hang forever
	}
	/**** This is where the listener code ends ****/

	// The following code extracts target's the peer ID from the
	// given multiaddress
	ipfsaddr, err := ma.NewMultiaddr(*target)
	if err != nil {
		log.Fatalln(err)
	}

	pid, err := ipfsaddr.ValueForProtocol(ma.P_IPFS)
	if err != nil {
		log.Fatalln(err)
	}

	peerid, err := peer.IDB58Decode(pid)
	if err != nil {
		log.Fatalln(err)
	}

	// Decapsulate the /ipfs/<peerID> part from the target
	// /ip4/<a.b.c.d>/ipfs/<peer> becomes /ip4/<a.b.c.d>
	targetPeerAddr, _ := ma.NewMultiaddr(fmt.Sprintf("/ipfs/%s", pid))
	targetAddr := ipfsaddr.Decapsulate(targetPeerAddr)

	// We have a peer ID and a targetAddr so we add it to the peerstore
	// so LibP2P knows how to contact it
	ha.Peerstore().AddAddr(peerid, targetAddr, peerstore.PermanentAddrTTL)

	log.Println("opening stream")
	// make a new stream from host B to host A
	// it should be handled on host A by the handler we set above because
	// we use the same /echo/1.0.0 protocol
	s, err := ha.NewStream(context.Background(), peerid, "/echo/1.0.0")
	if err != nil {
		log.Fatalln(err)
	}
  var sb strings.Builder
  for i := 0; i < *sfile; i++ {
      sb.WriteString("a")
  }
  sb.WriteString("\n")

	_, err = s.Write([]byte(sb.String()))
	if err != nil {
		log.Fatalln(err)
	}

	out, err := ioutil.ReadAll(s)
	if err != nil {
		log.Fatalln(err)
	}

	log.Printf("read reply: %q\n", out)
}

// doEcho reads a line of data a stream and writes it back
func doEcho(s network.Stream, flag int, sz int) error {
  if (flag > 0) {
	  log.Printf("reading...")
	  buf := bufio.NewReader(s)
    start := time.Now()
	  str, err := buf.ReadBytes('\n')
    t := time.Now()
    elapsed := t.Sub(start)
	  if err != nil {
		  return err
	  }

	log.Printf("read: %d bytes in %g \n", len(str), elapsed.Seconds())
  }
  var sb strings.Builder
  for i := 0; i < sz; i++ {
      sb.WriteString("a")
  }
  sb.WriteString("\n")
  str := sb.String()
  log.Printf("sending %d bytes", len(str))
	_, err := s.Write([]byte(sb.String()))
	return err
}
