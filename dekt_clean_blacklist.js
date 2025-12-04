/*
 * 脚本名称：北理工第二课堂-清理黑名单
 * 作者：Gemini for User
 * 描述：自动移除黑名单中已结束/已取消的课程ID
 * [task_local]
 * 0 3 * * * https://github.com/Bigzhangbig/bit-dekt-quanx/raw/refs/heads/main/dekt_clean_blacklist.js, tag=清理黑名单, enabled=true
 */

const $ = new Env("北理工第二课堂-清理黑名单");

const CONFIG = {
    blacklistKey: "bit_sc_blacklist",
    tokenKey: "bit_sc_token",
    headersKey: "bit_sc_headers"
};

(async () => {
    try {
        const token = $.getdata(CONFIG.tokenKey);
        const headers = JSON.parse($.getdata(CONFIG.headersKey) || "{}");
        if (!token || !headers) {
            $.msg($.name, "未获取到Token或Headers", "请先运行cookie脚本获取Token");
            $done();
            return;
        }

        // 读取黑名单（按 boxjs.json 约定：逗号分隔的文本）
        const blacklistStr = $.getdata(CONFIG.blacklistKey) || "";
        let blacklist = [];
        try {
            // 兼容用户误填为 JSON 数组的情况
            const maybeJson = blacklistStr.trim();
            if (maybeJson.startsWith("[") && maybeJson.endsWith("]")) {
                const arr = JSON.parse(maybeJson);
                if (Array.isArray(arr)) blacklist = arr.map(x => String(x).trim()).filter(Boolean);
            } else {
                blacklist = blacklistStr.split(/[，,]/).map(id => id.trim()).filter(id => id);
            }
        } catch {
            blacklist = blacklistStr.split(/[，,]/).map(id => id.trim()).filter(id => id);
        }

        if (blacklist.length === 0) {
            $.msg($.name, "黑名单为空", "无需清理");
            $done();
            return;
        }

        // 获取课程列表（统一归一为数组）
        const courseList = await getCourseList(token, headers);
        if (!Array.isArray(courseList)) {
            $.msg($.name, "获取课程列表失败", "请检查网络或Token");
            $done();
            return;
        }

        // 过滤黑名单（依据抓包确认为字段：id 与 status）
        const validIds = blacklist.filter(id => {
            const course = courseList.find(c => c && String(c.id) === String(id));
            if (!course) return false;
            // 仅保留未结束(3)且未取消(4)的课程
            return course.status !== 3 && course.status !== 4;
        });

        // 写回 BoxJS
        $.setdata(validIds.join(","), CONFIG.blacklistKey);

        $.msg($.name, "黑名单已清理", `剩余ID: ${validIds.join(",") || "无"}`);
    } catch (e) {
        $.msg($.name, "脚本异常", String(e));
    }
    $done();
})();

async function getCourseList(token, headers) {
    const url = "https://qcbldekt.bit.edu.cn/api/course/list";
    const myRequest = {
        url: url,
        method: "GET",
        headers: {
            ...headers,
            "Authorization": token
        }
    };
    return new Promise((resolve) => {
        if ($.isQuanX) {
            $task.fetch(myRequest).then(
                response => {
                    try {
                        const body = JSON.parse(response.body);
                        // 严格按抓包结构：data.items 为数组
                        const list = body && body.data && Array.isArray(body.data.items) ? body.data.items : null;
                        resolve(list || null);
                    } catch (e) {
                        resolve(null);
                    }
                },
                () => resolve(null)
            );
        } else {
            resolve(null);
        }
    });
}

// --- Env Polyfill ---
function Env(scriptName, options) {
    class EnvHelper {
        constructor(envInstance) {
            this.env = envInstance;
        }
    }
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
