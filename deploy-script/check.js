const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
async function check() {
  await ssh.connect({ host: '98.142.245.190', username: 'root', password: '123321123' });
  const res = await ssh.execCommand('head -n 20 /var/www/qji-backend/poller.js');
  console.log('OUT:', res.stdout);
  console.log('ERR:', res.stderr);
  ssh.dispose();
}
check();
