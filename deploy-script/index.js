const { NodeSSH } = require('node-ssh');
const path = require('path');
const ssh = new NodeSSH();

async function deploy() {
  try {
    console.log('Connecting to VPS...');
    await ssh.connect({
      host: '98.142.245.190',
      username: 'root',
      password: '123321123',
      readyTimeout: 10000
    });
    console.log('Connected!');

    // Find where the backend is hosted
    console.log('Locating backend directory via PM2...');
    const pm2Result = await ssh.execCommand('pm2 jlist');
    
    let backendDir = '';
    if (pm2Result.stdout) {
      try {
        const processes = JSON.parse(pm2Result.stdout);
        const serverProc = processes.find(p => p.name === 'server' || p.name === 'backend' || p.pm2_env.pm_exec_path.includes('server.js'));
        if (serverProc) {
          backendDir = path.dirname(serverProc.pm2_env.pm_exec_path);
          // Fix path separator for linux
          backendDir = backendDir.replace(/\\/g, '/');
          console.log(`Found backend directory: ${backendDir}`);
        }
      } catch(e) {
         console.log('Could not parse pm2 list. Using fallback...');
      }
    }

    if (!backendDir) {
      console.log('Could not automatically determine backend dir. Checking common locations...');
      const fallbackDirs = ['/var/www/backend', '/root/backend', '/home/backend', '/var/www/html/backend', '/root/websiteQJI/backend'];
      for (const dir of fallbackDirs) {
        const check = await ssh.execCommand(`ls ${dir}/server.js`);
        if (check.code === 0) {
          backendDir = dir;
          break;
        }
      }
    }

    if (!backendDir) {
      throw new Error("Cannot find backend directory on VPS!");
    }

    console.log(`Target deployment directory: ${backendDir}`);

    const localZip = path.join(__dirname, '..', 'backend_final.zip');
    const remoteZip = '/root/backend_final.zip';

    console.log('Uploading backend_final.zip...');
    await ssh.putFile(localZip, remoteZip);
    console.log('Upload complete.');

    console.log('Extracting and replacing files...');
    await ssh.execCommand('apt-get update && apt-get install unzip -y || yum install unzip -y');
    const extractCmd = `unzip -o ${remoteZip} -d ${backendDir}`;
    const extractRes = await ssh.execCommand(extractCmd);
    console.log(extractRes.stdout);

    // Ensure qji_database.sqlite is deleted so WAL is recreated correctly
    console.log('Deleting old sqlite file to recreate with WAL...');
    await ssh.execCommand(`rm -f ${backendDir}/qji_database.sqlite`);

    console.log('Running npm install...');
    const installRes = await ssh.execCommand('npm install', { cwd: backendDir });
    console.log(installRes.stdout);
    
    console.log('Restarting PM2 processes...');
    const pm2Res = await ssh.execCommand('pm2 restart all', { cwd: backendDir });
    console.log(pm2Res.stdout);

    console.log('Deployment Successful!');
    ssh.dispose();

  } catch (error) {
    console.error('Deployment Failed:', error);
    ssh.dispose();
  }
}

deploy();
