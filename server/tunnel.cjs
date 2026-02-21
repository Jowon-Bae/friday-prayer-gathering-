const localtunnel = require('localtunnel');

(async () => {
  const tunnel = await localtunnel({ port: 3001 });
  console.log(`SERVER_TUNNEL_URL=${tunnel.url}`);

  tunnel.on('close', () => {
    console.log('Server tunnel closed');
  });
})();
