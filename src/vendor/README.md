# Socket.IO browser client

`socket.io.esm.min.js` is the unmodified official Socket.IO 4.8.4 ESM browser distribution, copied from the installed backend package at `backend/node_modules/socket.io/client-dist/socket.io.esm.min.js`. Only the source-map reference was removed because the map is not distributed here.

It is included locally so the browser needs no external CDN and the frontend uses the client already distributed with the backend. The original MIT license is included in `SOCKET.IO-LICENSE`.

The adjacent TypeScript declaration describes the client methods and events used by this application. When upgrading the backend Socket.IO version, update the browser bundle and this event contract together.
