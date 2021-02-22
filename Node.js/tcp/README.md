The two program send.js and recv.js could be included in the same script and the switch of sending receiving could be move on cmd line. I preferred to separate the concept for having very small snippets to show.

FIXME: The approach of sending data with concat probably causes performance issues.


Example (our default port is 2002)

On one machine/terminal
node recv.js
node id is QmamYigQt7afw6U54QszAw8jKtMm6KpMLDy3izzuydVmvA

On another machine/terminal
node examples/tcp/send.js QmamYigQt7afw6U54QszAw8jKtMm6KpMLDy3izzuydVmvA /tmp/my_first.sh 192.168.1.206

