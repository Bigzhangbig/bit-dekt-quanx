/*
 * 脚本名称：北理工校园卡-获取Cookie
 * 作者：Copilot for User
 * 
 * [rewrite_local]
 * ^https:\/\/dkykt\.info\.bit\.edu\.cn\/selftrade\/.* url script-request-header https://raw.githubusercontent.com/Bigzhangbig/bit-dekt-quanx/main/card_cookie.js
 * 
 * [mitm]
 * hostname = dkykt.info.bit.edu.cn
 * */

const $ = new Env("北理工校园卡-获取Cookie");

const CONFIG = {
    // 复用第二课堂的 GitHub 配置
    githubTokenKey: "bit_sc_github_token",
    gistIdKey: "bit_sc_gist_id",
    // 校园卡专用的 Gist 文件名配置 key
    gistFileNameKey: "bit_card_gist_filename",
    // 默认文件名
    defaultFileName: "bit_card_cookies.json"
};

(async () => {
    if (typeof $request !== "undefined") {
        try {
            await getCookie();
        } catch (e) {
            console.log(`[${$.name}] 脚本执行异常: ${e}`);
        }
    }
    $done({});
})();

async function getCookie() {
    // 调试日志
    // console.log(`[${$.name}] 检测到请求: ${$request.url}`);
    
    if ($request.headers) {
        const cookie = $request.headers['Cookie'] || $request.headers['cookie'];
        const url = $request.url;
        
        // 提取 JSESSIONID
        let jsessionid = null;
        if (cookie) {
            const match = cookie.match(/JSESSIONID=([^;]+)/);
            if (match) {
                jsessionid = match[1];
            }
        }

        // 提取 OpenID (从 URL 参数)
        let openid = null;
        if (url.includes("openid=")) {
            const match = url.match(/openid=([^&]+)/);
            if (match) {
                openid = match[1];
            }
        }

        if (jsessionid && openid) {
            const oldJsessionid = $.getdata("bit_card_jsessionid");
            const oldOpenid = $.getdata("bit_card_openid");

            if (jsessionid !== oldJsessionid || openid !== oldOpenid) {
                // 更新本地数据
                $.setdata(jsessionid, "bit_card_jsessionid");
                $.setdata(openid, "bit_card_openid");
                
                console.log(`[${$.name}] 获取到新的凭证:\nJSESSIONID: ${jsessionid}\nOpenID: ${openid}`);
                $.msg($.name, "获取校园卡凭证成功", "正在同步到 Gist...");

                // 同步到 Gist
                await updateGist(jsessionid, openid);
            } else {
                // console.log(`[${$.name}] 凭证未变化`);
            }
        }
    }
}

async function updateGist(jsessionid, openid) {
    const githubToken = $.getdata(CONFIG.githubTokenKey);
    const gistId = $.getdata(CONFIG.gistIdKey);
    const filename = $.getdata(CONFIG.gistFileNameKey) || CONFIG.defaultFileName;

    if (!githubToken || !gistId) {
        console.log(`[${$.name}] 未配置 GitHub Token 或 Gist ID，跳过 Gist 同步`);
        $.msg($.name, "同步失败", "未配置 GitHub Token 或 Gist ID");
        return;
    }

    const content = JSON.stringify({
        jsessionid: jsessionid,
        openid: openid,
        updated_at: new Date().toISOString()
    }, null, 2);

    const url = `https://api.github.com/gists/${gistId}`;
    const method = "PATCH";
    const headers = {
        "Authorization": `token ${githubToken}`,
        "User-Agent": "BIT-Card-Script",
        "Accept": "application/vnd.github.v3+json",
        "Content-Type": "application/json"
    };
    
    const body = JSON.stringify({
        files: {
            [filename]: {
                content: content
            }
        }
    });

    const myRequest = {
        url: url,
        method: method,
        headers: headers,
        body: body
    };

    return new Promise((resolve) => {
        if ($.isQuanX) {
            $task.fetch(myRequest).then(
                response => {
                    if (response.statusCode >= 200 && response.statusCode < 300) {
                        console.log(`[${$.name}] Gist同步成功`);
                        $.msg($.name, "Gist同步成功", "校园卡凭证已同步到 GitHub Gist");
                    } else {
                        console.log(`[${$.name}] Gist同步失败: ${response.statusCode} ${response.body}`);
                        $.msg($.name, "Gist同步失败", `状态码: ${response.statusCode}`);
                    }
                    resolve();
                },
                reason => {
                    console.log(`[${$.name}] Gist同步出错: ${reason.error}`);
                    $.msg($.name, "Gist同步出错", reason.error);
                    resolve();
                }
            );
        } else {
            console.log(`[${$.name}] 非QuanX环境，暂不支持Gist同步`);
            resolve();
        }
    });
}

// --- Env Polyfill ---
function Env(t, e) { class s { constructor(t) { this.env = t } } return new class { constructor(t) { this.name = t, this.logs = [], this.isSurge = !1, this.isQuanX = "undefined" != typeof $task, this.isLoon = !1 } getdata(t) { let e = this.getval(t); if (/^@/.test(t)) { const [, s, i] = /^@(.*?)\.(.*?)$/.exec(t), r = s ? this.getval(s) : ""; if (r) try { const t = JSON.parse(r); e = t ? this.getval(i, t) : null } catch (t) { e = "" } } return e } setdata(t, e) { let s = !1; if (/^@/.test(e)) { const [, i, r] = /^@(.*?)\.(.*?)$/.exec(e), o = this.getval(i), h = i ? "null" === o ? null : o || "{}" : "{}"; try { const e = JSON.parse(h); this.setval(r, t, e), s = !0, this.setval(i, JSON.stringify(e)) } catch (e) { const o = {}; this.setval(r, t, o), s = !0, this.setval(i, JSON.stringify(o)) } } else s = this.setval(t, e); return s } getval(t) { return this.isQuanX ? $prefs.valueForKey(t) : "" } setval(t, e) { return this.isQuanX ? $prefs.setValueForKey(t, e) : "" } msg(e = t, s = "", i = "", r) { this.isQuanX && $notify(e, s, i, r) } get(t, e = (() => { })) { this.isQuanX && ("string" == typeof t && (t = { url: t }), t.method = "GET", $task.fetch(t).then(t => { e(null, t, t.body) }, t => e(t.error, null, null))) } done(t = {}) { this.isQuanX && $done(t) } }(t, e) }
