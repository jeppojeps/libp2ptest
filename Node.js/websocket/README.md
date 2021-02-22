The two program send.js and recv.js could be included in the same script and the switch of sending receiving could be move on cmd line. I preferred to separate the concept for having very small snippets to show.
The approach of sending data with concat probably causes the performance issues.



Example

in one terminal host run 
node examples/websocket/recv.js
node id is QmNgHhfXwSn552h1FV4HnnGTufadnr1hW5vbcvaTzmf6kX:

#### then copy the id above for the sender the node above will be used as a bootstrapper

in one terminal/host run

node examples/websocket/send.js QmNgHhfXwSn552h1FV4HnnGTufadnr1hW5vbcvaTzmf6kX /tmp/my_first.sh localhost


