// 启动 electron 前显式删除 ELECTRON_RUN_AS_NODE 环境变量
// （Claude Code 沙箱会预置这个变量使 electron 退化为纯 node，GUI API 不可用）
const { spawn } = require('child_process');
const electronPath = require('electron');

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
delete env.HTTPS_PROXY;
delete env.HTTP_PROXY;
env.NODE_ENV = 'development';

const child = spawn(electronPath, ['.'], { stdio: 'inherit', env });
child.on('exit', (code) => process.exit(code ?? 0));
child.on('error', (e) => { console.error(e); process.exit(1); });
