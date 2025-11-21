# 北理工第二课堂 Quantumult X 脚本

本项目包含一套用于北理工第二课堂（微信小程序）的 Quantumult X 脚本，支持自动获取 Token、监控新活动、自动报名（捡漏）、活动签到提醒以及本地调试工具。

## 脚本列表

### Quantumult X 脚本

1.  **`bit_cookie.js` (获取 Token)**
    *   **功能**: 监听第二课堂小程序的网络请求，自动提取并保存 Token 和 Headers。
    *   **使用**: 配置 Rewrite 规则，进入小程序刷新列表即可触发。
    *   **Gist 同步**: 支持将 Token 同步到 GitHub Gist，方便多设备或本地脚本共享。

2.  **`bit_monitor.js` (监控与报名)**
    *   **功能**: 定时监控第二课堂的新活动。
    *   **特性**:
        *   支持按学院、年级、学生类型筛选。
        *   支持“捡漏模式”：自动尝试报名“进行中”且有名额的活动。
        *   支持指定课程 ID 强制报名。
    *   **配置**: 需在 BoxJS 中配置筛选条件和开关。

3.  **`bit_my_activities.js` (我的活动)**
    *   **功能**: 定时检查“我的活动”列表。
    *   **特性**: 在活动签到/签退时间内发送通知，并自动复制二维码链接，点击通知即可跳转。

4.  **`bit_signup.js` (手动报名)**
    *   **功能**: 单次运行脚本，对指定的课程 ID 进行报名。
    *   **使用**: 适合在 BoxJS 中输入 ID 后手动点击运行。

### 本地调试工具 (Node.js)

这些脚本用于在电脑上进行调试或执行特定任务，依赖 `env.json` 配置文件。

1.  **`local_debug.js`**: 本地运行 `bit_monitor.js` 的封装，用于测试监控逻辑。
2.  **`local_signin.js`**: 本地签到工具，支持虚拟定位（随机偏移）。
3.  **`local_get_qr.js`**: 获取当前进行中或已结束但未签退的活动二维码。
    *   依赖 `unpack_capture.py` 进行响应解压。
4.  **`local_sync_gist.js`**: 从 GitHub Gist 拉取最新的 Token 到本地 `env.json`。
5.  **`unpack_capture.py`**: 通用抓包解包工具，支持 gzip 和 chunked 编码，也可用于 `local_get_qr.js` 的解压后端。

## 使用说明

### 1. Quantumult X 配置

请参考 `bit_rewrite.snippet` 和 `bit_task.json` 添加重写和定时任务。

**Rewrite:**
```conf
^https:\/\/qcbldekt\.bit\.edu\.cn\/api\/course\/list url script-request-header https://raw.githubusercontent.com/Bigzhangbig/bit-dekt-quanx/main/bit_cookie.js
```

**Task:**
```conf
# 监控脚本 (建议 2 分钟一次)
*/2 8-22 * * * https://raw.githubusercontent.com/Bigzhangbig/bit-dekt-quanx/main/bit_monitor.js, tag=第二课堂监控, img-url=https://raw.githubusercontent.com/Bigzhangbig/bit-dekt-quanx/main/icon.png, enabled=true

# 我的活动提醒
0 8-22 * * * https://raw.githubusercontent.com/Bigzhangbig/bit-dekt-quanx/main/bit_my_activities.js, tag=第二课堂提醒, enabled=true
```

### 2. BoxJS 配置

订阅地址: `https://raw.githubusercontent.com/Bigzhangbig/bit-dekt-quanx/main/bit_boxjs.json`

在 BoxJS 中可以设置：
*   `bit_sc_debug`: 开启调试日志
*   `bit_sc_pickup_mode`: 开启捡漏模式
*   `bit_sc_filter_college`: 筛选学院 (如 "计算机")
*   `bit_sc_filter_grade`: 筛选年级 (如 "2022级")
*   `bit_sc_gist_id` & `bit_sc_github_token`: Gist 同步配置

### 3. 本地调试

1.  安装依赖: `npm install` (需安装 `qrcode-terminal` 等)
2.  配置 `env.json`:
    ```json
    {
        "bit_sc_token": "你的Token",
        "bit_sc_headers": "{}",
        "bit_sc_github_token": "...",
        "bit_sc_gist_id": "..."
    }
    ```
    或者运行 `node local_sync_gist.js` 从 Gist 同步配置。
3.  运行脚本: `node local_get_qr.js`

## 注意事项

*   **Token 有效期**: Token 可能会过期，需要定期进入小程序刷新。
*   **Gzip 压缩**: `bit_cookie.js` 抓取的 Headers 包含 `Accept-Encoding: gzip`。本地脚本如果直接使用该 Headers，需要确保能够处理 gzip 响应（`local_get_qr.js` 已通过 Python 脚本处理，其他脚本通常会移除该 Header）。

## 声明

仅供学习交流使用，请勿用于非法用途。