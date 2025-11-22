# 北理工 Quantumult X 脚本合集

本项目包含用于北理工**第二课堂**（微信小程序）和**校园卡**的 Quantumult X 脚本，支持自动获取 Token、监控新活动、自动报名、活动签到提醒、校园卡余额监控等功能。

## 脚本列表

### 1. 第二课堂 (Second Classroom)

前缀: `dekt_`

*   **`dekt_cookie.js` (获取 Token)**
    *   **功能**: 监听第二课堂小程序的网络请求，自动提取并保存 Token 和 Headers。
    *   **使用**: 配置 Rewrite 规则，进入小程序刷新列表即可触发。
    *   **Gist 同步**: 支持将 Token 同步到 GitHub Gist。

*   **`dekt_monitor.js` (监控与报名)**
    *   **功能**: 定时监控第二课堂的新活动。
    *   **特性**: 支持按学院/年级筛选、捡漏模式、指定 ID 报名。

*   **`dekt_my_activities.js` (我的活动)**
    *   **功能**: 定时检查“我的活动”列表，在签到/签退时间内发送通知并提供二维码链接。

*   **`dekt_signup.js` (手动报名)**
    *   **功能**: 单次运行脚本，对指定的课程 ID 进行报名。

*   **`dekt_signin.js` (自动签到)**
    *   **功能**: 自动检查已报名课程并进行签到/签退（需配合 BoxJS 配置）。

### 2. 校园卡 (Campus Card)

前缀: `card_`

*   **`card_cookie.js` (获取 Cookie)**
    *   **功能**: 监听校园卡查询页面的请求，获取 Session ID 和 OpenID。
    *   **使用**: 进入“北理工校园卡”微信公众号 -> 账单查询，触发重写。

*   **`card_balance.js` (余额监控)**
    *   **功能**: 定时查询校园卡余额，低于设定值时发送通知。

*   **`card_query_trade.py` (交易查询)**
    *   **功能**: Python 脚本，用于查询校园卡交易流水（需本地运行）。

### 3. 本地调试工具 (Node.js)

前缀: `local_`

*   **`local_dekt_debug.js`**: 本地运行 `dekt_monitor.js` 的封装。
*   **`local_dekt_signin.js`**: 本地签到工具，支持虚拟定位。
*   **`local_dekt_get_qr.js`**: 获取活动二维码（依赖 `unpack_capture.py`）。
*   **`local_sync_gist.js`**: 从 Gist 同步配置到本地 `.env`。
*   **`unpack_capture.py`**: 抓包解包工具。

## 使用说明

### 1. Quantumult X 配置

**Rewrite (重写):**
请参考 `dekt_rewrite.snippet` (第二课堂) 和 `card_rewrite.snippet` (校园卡)。

```conf
# 第二课堂 Cookie
^https:\/\/qcbldekt\.bit\.edu\.cn\/api\/course\/list url script-request-header https://raw.githubusercontent.com/Bigzhangbig/bit-dekt-quanx/main/dekt_cookie.js

# 校园卡 Cookie
^https:\/\/dkykt\.info\.bit\.edu\.cn\/selftrade\/.* url script-request-header https://raw.githubusercontent.com/Bigzhangbig/bit-dekt-quanx/main/card_cookie.js
```

**Task (定时任务):**
请参考 `dekt_task.json`。

```conf
# 第二课堂监控 (建议 2 分钟一次)
*/2 8-22 * * * https://raw.githubusercontent.com/Bigzhangbig/bit-dekt-quanx/main/dekt_monitor.js, tag=第二课堂监控, enabled=true

# 第二课堂提醒
0 8-22 * * * https://raw.githubusercontent.com/Bigzhangbig/bit-dekt-quanx/main/dekt_my_activities.js, tag=第二课堂提醒, enabled=true

# 校园卡余额监控 (每天中午 12 点)
0 12 * * * https://raw.githubusercontent.com/Bigzhangbig/bit-dekt-quanx/main/card_balance.js, tag=校园卡余额监控, enabled=true
```

### 2. BoxJS 配置

订阅地址: `https://raw.githubusercontent.com/Bigzhangbig/bit-dekt-quanx/main/boxjs.json`

### 3. 本地调试

1.  安装依赖: `npm install`
2.  配置 `.env` (或通过 `local_sync_gist.js` 同步)。
3.  运行对应脚本，例如 `node local_dekt_debug.js`。

## 注意事项

*   **Token/Cookie 有效期**: 需定期进入相应的小程序/页面刷新以更新 Token。
*   **Gzip**: 本地脚本需注意处理 Gzip 压缩的响应。

## 声明

仅供学习交流使用，请勿用于非法用途。
