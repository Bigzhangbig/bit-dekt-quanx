/*
 * 脚本名称：本地调试-第二课堂签到
 * 描述：在本地 Node.js 环境中运行 dekt_signin.js，支持虚拟定位签到。
 * 用法：node local_dekt_signin.js
 */
const fs = require('fs');
const path = require('path');
const Env = require('./local_env');

// Make Env available globally
global.Env = Env;
// Mock $done
global.$done = (val) => {
    console.log("[System] $done called with:", val);
};

const scriptPath = path.join(__dirname, 'dekt_signin.js');

if (!fs.existsSync(scriptPath)) {
    console.error(`Script not found: ${scriptPath}`);
    process.exit(1);
}

const scriptContent = fs.readFileSync(scriptPath, 'utf8');

// 获取命令行参数中的 course_id
const args = process.argv.slice(2);
if (args.length > 0) {
    global.DEKT_TARGET_IDS = args;
    console.log(`[Local Debug] 指定课程 ID: ${global.DEKT_TARGET_IDS.join(', ')}`);
} else {
    console.log(`[Local Debug] 未指定课程 ID，默认禁用批量签到 (防止误操作)`);
    global.DEKT_BLOCK_LIST_MODE = true;
}

// Remove the Env definition from the script content to avoid conflict and use our local Env
const cleanScriptContent = scriptContent.replace(/function Env\s*\(.*?\)\s*\{[\s\S]*\}/, '// Env definition removed');

console.log("=== Starting Local Debug: bit_signin.js ===");

try {
    // Execute the script content
    eval(cleanScriptContent);
} catch (e) {
    console.error("Runtime Error:", e);
}
