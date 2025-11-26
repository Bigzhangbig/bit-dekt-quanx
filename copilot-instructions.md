# Copilot Workspace Instructions

本文件用于指导 GitHub Copilot / Copilot Chat 在本仓库中的行为与风格，帮助其更贴合本项目需求生成代码与解释。

## 项目概览
- 项目：北理工第二课堂 & 校园卡 Quantumult X 脚本 + 本地调试工具
- 语言：JavaScript (Node.js / CommonJS)、少量 Python
- 运行环境：
  - Quantumult X 运行脚本（`*.js`）
  - 本地 Node.js 18+ 运行 `local_*.js`
- 依赖：`qrcode`

## 开发与代码风格
- 语法：ES2020+，优先使用 `async/await`
- 模块：`type: commonjs`，使用 `require` / `module.exports`
- 命名：使用有意义的名字，避免单字符变量
- 结构：
  - 尽量保持函数小而单一职责
  - 把“环境相关逻辑”（Quantumult X vs 本地 Node）做适配封装
- 注释：用简洁中文注释关键业务/边界条件
- 日志：
  - QX 环境使用 `$notify` / `$message`（若适用）
  - 本地环境使用 `console.log`，避免过量输出

## 约束与安全
- 不得泄露 Token、Cookie、OpenID 等敏感信息
- 读取配置优先：BoxJS > `.env`（本地）
- 网络请求注意 gzip、超时与重试策略
- 生成/修改脚本需避免破坏 Quantumult X 计划任务格式

## 常用约定
- 第二课堂 API 域名：`qcbldekt.bit.edu.cn`
- 校园卡域名：`dkykt.info.bit.edu.cn`
- 功能脚本前缀：
  - 第二课堂：`dekt_*`
  - 校园卡：`card_*`
  - 本地调试：`local_*`
- 典型文件：
  - Cookie/Token 捕获：`*_cookie.js`
  - 定时监控：`*_monitor.js`
  - 我的活动提醒：`dekt_my_activities.js`
  - 余额监控：`card_balance.js`

## 期望的 Copilot 行为
- 首先使用unpack_capture.py脚本获取抓包内容，明确请求 URL、方法、Headers、Body 结构
- 在生成代码前，先给出简短方案（输入/输出、边界、错误处理）
- 生成 JS 默认 CommonJS，具备 QX 与本地双环境兼容（若相关）
- 请求代码中：
  - 明确 headers 来源（BoxJS / 捕获脚本持久化）
  - 处理 gzip、超时、重试、非 2xx 响应
- 生成的计划任务/重写片段应遵循现有 `*.snippet` 风格
- 提供最小化变更方案，避免影响无关文件

## 回答/解释输出偏好
- 优先中文，分点、简洁
- 所有脚本/命令/路径使用反引号包裹
- 给出可复制的最小示例与落地步骤

## 示例提示（可复用）
- 生成 QX 任务：
  - “请基于 `dekt_monitor.js` 的风格，新增一个每 5 分钟拉取活动列表并筛选学院为‘计算机学院’的任务片段（`*.snippet`），保持与现有 tag 命名一致。”
- 本地工具增强：
  - “为 `local_dekt_debug.js` 添加命令行参数解析，支持 `--college`、`--grade`，并给出示例运行命令。”
- 安全修复：
  - “审查 `card_cookie.js` 的持久化逻辑，确保不会把敏感字段打到日志里，并添加掩码处理。”

## 非目标
- 不引入重量级框架
- 不改变 CommonJS 模块风格
- 不输出真实敏感数据或伪造接口

---
把本文件视为仓库级“工作说明”。当需要偏离时，请在回答前明确说明理由与影响。