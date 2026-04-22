// 在纯净环境（无 HTTPS_PROXY / ELECTRON_RUN_AS_NODE / CLAUDE_PROXY）下调 electron-builder 发布。
// 规避 Claude Code 沙箱带来的代理残留和 HttpsProxyAgent 空字符串解析失败。
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// 读 .env.local（不走 dotenv 依赖）
try {
  const envFile = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envFile)) {
    const content = fs.readFileSync(envFile, 'utf8');
    for (const line of content.split(/\r?\n/)) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (m) process.env[m[1]] = m[2];
    }
  }
} catch (e) { console.warn('env.local read skipped:', e.message); }

const env = { ...process.env };
delete env.HTTPS_PROXY;
delete env.HTTP_PROXY;
delete env.https_proxy;
delete env.http_proxy;
delete env.CLAUDE_PROXY;
delete env.ELECTRON_RUN_AS_NODE;
delete env.NO_PROXY;
env.npm_config_proxy = '';
env.npm_config_https_proxy = '';

// 步骤 1：先构建前端
console.log('[publish] building frontend...');
const buildFrontendArgs = ['run', 'build:frontend'];
const buildFrontendChild = spawn('npm', buildFrontendArgs, {
  cwd: path.join(__dirname, '..'),
  env,
  stdio: 'inherit',
  shell: true,
});

buildFrontendChild.on('exit', (code) => {
  if (code !== 0) {
    console.error('[publish] frontend build failed with exit code:', code);
    process.exit(code ?? 1);
  }

  // 步骤 2：前端构建成功，继续打包发布
  console.log('[publish] frontend build succeeded, starting electron-builder...');
  const args = ['electron-builder', '--win', '--publish', 'always', '--x64'];
  console.log('[publish] running:', args.join(' '));
  const child = spawn('npx', args, {
    cwd: path.join(__dirname, '..'),
    env,
    stdio: 'inherit',
    shell: true,
  });
  child.on('exit', (code) => process.exit(code ?? 0));
  child.on('error', (e) => { console.error(e); process.exit(1); });
});

buildFrontendChild.on('error', (e) => {
  console.error('[publish] frontend build error:', e);
  process.exit(1);
});
