const localtunnel = require('localtunnel');

(async () => {
  const tunnel = await localtunnel({ port: 5173 });
  console.log(`CLIENT_TUNNEL_URL=${tunnel.url}`);

  tunnel.on('close', () => {
    console.log('Client tunnel closed');
  });
})();
