/*
 * 脚本名称：北理工第二课堂-获取Token
 * 作者：Gemini for User
 * 描述：监听第二课堂小程序的网络请求，自动提取并保存 Token 和 Headers。
 * 
 * [rewrite_local]
 * ^https:\/\/qcbldekt\.bit\.edu\.cn\/api\/course\/list url script-request-header https://github.com/Bigzhangbig/bit-dekt-quanx/raw/refs/heads/main/dekt_cookie.js
 * 
 * [mitm]
 * hostname = qcbldekt.bit.edu.cn
 * */

const $ = new Env("北理工第二课堂-获取Token");

const CONFIG = {
    tokenKey: "bit_sc_token",
    headersKey: "bit_sc_headers",
    userIdKey: "bit_sc_user_id",
    debugKey: "bit_sc_debug",
    githubTokenKey: "bit_sc_github_token",
    gistIdKey: "bit_sc_gist_id",
    gistFileNameKey: "bit_sc_gist_filename"
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
    const isDebug = $.getdata(CONFIG.debugKey) === "true";
    
    // 调试日志，可以在 QX 日志中查看是否触发
    if (isDebug) console.log(`[${$.name}] 检测到请求: ${$request.url}`);
    
    if ($request.headers) {
        const auth = $request.headers['Authorization'] || $request.headers['authorization'];
        const referer = $request.headers['Referer'] || $request.headers['referer'];

        // 打印头部信息以便调试
        if (isDebug) console.log(`[Debug] Auth: ${auth ? '存在' : '缺失'}, Referer: ${referer ? '存在' : '缺失'}`);

        // 必须同时存在 Authorization 和 Referer 才认为是有效请求
        if (auth && referer) {
            const oldToken = $.getdata(CONFIG.tokenKey);
            const parsedUserId = deriveUserId(auth);
            
            if (oldToken !== auth) {
                // 检查 Gist 上的 Token
                const gistResult = await getGist();
                const gistToken = gistResult && gistResult.ok && gistResult.data ? gistResult.data.token : null;
                if (gistResult && gistResult.failed) {
                    $.msg($.name, "获取 Gist 失败", gistResult.message || "无法获取远端数据，请检查配置或网络");
                }

                const headersToSave = JSON.stringify({
                    'User-Agent': $request.headers['User-Agent'] || $request.headers['user-agent'],
                    'Referer': referer,
                    'Host': 'qcbldekt.bit.edu.cn',
                    'Connection': 'keep-alive',
                    'Accept-Encoding': 'gzip, deflate, br'
                });

                if (gistToken === auth) {
                    // Token 与 Gist 一致，仅更新本地
                    $.setdata(auth, CONFIG.tokenKey);
                    $.setdata(headersToSave, CONFIG.headersKey);
                    if (parsedUserId) $.setdata(parsedUserId, CONFIG.userIdKey);
                    console.log(`[${$.name}] Token与Gist一致，更新本地缓存，不发送通知`);
                } else {
                    // Token 不一致，更新本地和 Gist
                    $.setdata(auth, CONFIG.tokenKey);
                    $.setdata(headersToSave, CONFIG.headersKey);
                    if (parsedUserId) $.setdata(parsedUserId, CONFIG.userIdKey);
                    
                    // 同步到 Gist
                    const gistOk = await updateGist(auth, headersToSave, parsedUserId);
                    if (!gistOk) {
                        $.msg($.name, "Gist 同步失败", "Token 未能同步到 GitHub Gist，请查看日志");
                    }
                    console.log(`[${$.name}] Token 已更新`);
                }
            } else {
                if (isDebug) console.log(`[${$.name}] Token 未变化，跳过通知`);
            }
        } else {
            if (isDebug) console.log(`[${$.name}] 缺少必要Header，跳过`);
        }
    }
}

async function getGist() {
    const githubToken = $.getdata(CONFIG.githubTokenKey);
    const gistId = $.getdata(CONFIG.gistIdKey);
    const filename = $.getdata(CONFIG.gistFileNameKey) || "bit_cookies.json";

    if (!githubToken || !gistId) {
        return { ok: false, failed: true, message: "配置缺失：未设置 GitHub Token 或 Gist ID" };
    }

    const url = `https://api.github.com/gists/${gistId}`;
    const method = "GET";
    const headers = {
        "Authorization": `token ${githubToken}`,
        "User-Agent": "BIT-DEKT-Script",
        "Accept": "application/vnd.github.v3+json"
    };

    const myRequest = {
        url: url,
        method: method,
        headers: headers
    };

    return new Promise((resolve) => {
        if ($.isQuanX) {
            $task.fetch(myRequest).then(
                response => {
                    if (response.statusCode === 200) {
                        try {
                            const body = JSON.parse(response.body);
                            if (body.files && body.files[filename]) {
                                const content = JSON.parse(body.files[filename].content);
                                resolve({ ok: true, data: content });
                            } else {
                                resolve({ ok: true, data: null });
                            }
                        } catch (e) {
                            console.log(`[${$.name}] 解析Gist失败: ${e}`);
                            resolve({ ok: false, failed: true, message: `解析 Gist 失败: ${e}` });
                        }
                    } else {
                        resolve({ ok: false, failed: true, message: `获取 Gist 失败: ${response.statusCode}` });
                    }
                },
                reason => {
                    console.log(`[${$.name}] 获取Gist失败: ${reason.error}`);
                    resolve({ ok: false, failed: true, message: `获取 Gist 出错: ${reason.error}` });
                }
            );
        } else {
            resolve({ ok: false, failed: true, message: "当前环境不支持网络请求" });
        }
    });
}

async function updateGist(token, headers, userId) {
    const githubToken = $.getdata(CONFIG.githubTokenKey);
    const gistId = $.getdata(CONFIG.gistIdKey);
    const filename = $.getdata(CONFIG.gistFileNameKey) || "bit_cookies.json";

    if (!githubToken || !gistId) {
        console.log(`[${$.name}] 未配置 GitHub Token 或 Gist ID，跳过 Gist 同步`);
        $.msg($.name, "配置缺失", "请在 BoxJS 中配置 GitHub Token 和 Gist ID");
        return false;
    }

    // 读取BoxJS相关配置项
    const boxjsConfig = {
        blacklist: $.getdata("bit_sc_blacklist"),
        signup_list: $.getdata("bit_sc_signup_list"),
        pickup_mode: $.getdata("bit_sc_pickup_mode"),
        filter_college: $.getdata("bit_sc_filter_college"),
        filter_grade: $.getdata("bit_sc_filter_grade"),
        filter_type: $.getdata("bit_sc_filter_type"),
        auto_sign_all: $.getdata("bit_sc_auto_sign_all"),
        runtime_sign_ids: $.getdata("bit_sc_runtime_sign_ids")
    };

    const content = JSON.stringify({
        token: token,
        user_id: userId || null,
        headers: JSON.parse(headers),
        updated_at: new Date().toISOString(),
        boxjs: boxjsConfig
    }, null, 2);

    const url = `https://api.github.com/gists/${gistId}`;
    const method = "PATCH";
    const headers_req = {
        "Authorization": `token ${githubToken}`,
        "User-Agent": "BIT-DEKT-Script",
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
        headers: headers_req,
        body: body
    };

    return new Promise((resolve) => {
        if ($.isQuanX) {
            $task.fetch(myRequest).then(
                response => {
                    console.log(`[${$.name}] Gist同步响应: ${response.statusCode}`);
                    if (response.statusCode >= 200 && response.statusCode < 300) {
                        console.log(`[${$.name}] Gist 同步成功`);
                        resolve(true);
                    } else {
                        console.log(`[${$.name}] Gist 同步失败: ${response.body}`);
                        resolve(false);
                    }
                },
                reason => {
                    console.log(`[${$.name}] Gist同步出错: ${reason.error}`);
                    resolve(false);
                }
            );
        } else {
            console.log(`[${$.name}] 非QuanX环境，暂不支持Gist同步`);
            resolve(false);
        }
    });
}

function deriveUserId(authorizationHeader) {
    try {
        if (!authorizationHeader) return "";
        // 支持 "Bearer 611156|xxxx" 或 "611156|xxxx"
        let raw = String(authorizationHeader).trim();
        if (raw.toLowerCase().startsWith("bearer ")) raw = raw.slice(7).trim();
        const first = raw.split("|")[0].trim();
        return /^\d+$/.test(first) ? first : "";
    } catch (_) { return ""; }
}

// --- Env Polyfill ---
function Env(scriptName, options) {
    return new class {
        constructor(name) {
            this.name = name;
            this.logs = [];
            this.isSurge = false;
            this.isQuanX = typeof $task !== "undefined";
            this.isLoon = false;
        }
        getdata(key) {
            let value = this.getval(key);
            if (/^@/.test(key)) {
                const [, namespace, propertyKey] = /^@(.*?)\.(.*?)$/.exec(key);
                const storedJson = namespace ? this.getval(namespace) : "";
                if (storedJson) {
                    try {
                        const parsedData = JSON.parse(storedJson);
                        value = parsedData ? this.getval(propertyKey, parsedData) : null;
                    } catch (parseError) {
                        value = "";
                    }
                }
            }
            return value;
        }
        setdata(value, key) {
            let success = false;
            if (/^@/.test(key)) {
                const [, namespace, propertyKey] = /^@(.*?)\.(.*?)$/.exec(key);
                const storedValue = this.getval(namespace);
                const parsedOrDefault = namespace ? (storedValue === "null" ? null : storedValue || "{}") : "{}";
                try {
                    const dataObject = JSON.parse(parsedOrDefault);
                    this.setval(propertyKey, value, dataObject);
                    success = true;
                    this.setval(namespace, JSON.stringify(dataObject));
                } catch (parseError) {
                    const newDataObject = {};
                    this.setval(propertyKey, value, newDataObject);
                    success = true;
                    this.setval(namespace, JSON.stringify(newDataObject));
                }
            } else {
                success = this.setval(value, key);
            }
            return success;
        }
        getval(key) {
            return this.isQuanX ? $prefs.valueForKey(key) : "";
        }
        setval(value, key) {
            return this.isQuanX ? $prefs.setValueForKey(value, key) : "";
        }
        msg(title = scriptName, subtitle = "", body = "", options) {
            this.isQuanX && $notify(title, subtitle, body, options);
        }
        get(requestOptions, callback = (() => {})) {
            if (this.isQuanX) {
                if (typeof requestOptions === "string") {
                    requestOptions = { url: requestOptions };
                }
                requestOptions.method = "GET";
                $task.fetch(requestOptions).then(
                    response => callback(null, response, response.body),
                    error => callback(error.error, null, null)
                );
            }
        }
        done(result = {}) {
            this.isQuanX && $done(result);
        }
    }(scriptName, options);
}
