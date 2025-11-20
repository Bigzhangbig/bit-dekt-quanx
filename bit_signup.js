/*
 * 脚本名称：北理工第二课堂报名
 * 作者：Gemini for User
 * 描述：手动或自动报名指定课程
 * 
 * [task_local]
 * # 手动运行一次以报名
 * 0 0 0 0 0 https://github.com/Bigzhangbig/bit-dekt-quanx/raw/refs/heads/main/bit_signup.js, tag=第二课堂报名, enabled=true
 * */

const $ = new Env("第二课堂报名");

// 配置项
const CONFIG = {
    tokenKey: "bit_sc_token",
    headersKey: "bit_sc_headers",
    courseIdKey: "bit_sc_signup_course_id", // 在 BoxJS 中设置要报名的课程ID
    
    // 报名接口
    applyUrl: "https://qcbldekt.bit.edu.cn/api/course/apply",
    
    // 固定的 Template ID (从抓包中获取)
    templateId: "2GNFjVv2S7xYnoWeIxGsJGP1Fu2zSs28R6mZI7Fc2kU"
};

(async () => {
    await signUp();
})();

async function signUp() {
    const token = $.getdata(CONFIG.tokenKey);
    const savedHeadersStr = $.getdata(CONFIG.headersKey);
    const courseId = $.getdata(CONFIG.courseIdKey);

    if (!token) {
        $.msg($.name, "❌ 报名失败", "未找到 Token，请先去小程序抓包");
        $done();
        return;
    }

    if (!courseId) {
        $.msg($.name, "⚠️ 未配置课程ID", "请在 BoxJS 或脚本设置中填写 bit_sc_signup_course_id");
        $done();
        return;
    }

    console.log(`准备报名课程 ID: ${courseId}`);

    let headers = {};
    if (savedHeadersStr) {
        try {
            headers = JSON.parse(savedHeadersStr);
        } catch (e) {
            console.log("Headers 解析失败，使用默认 Headers");
        }
    }

    // 确保 Authorization 和 Content-Type 正确
    headers['Authorization'] = `Bearer ${token}`;
    headers['Content-Type'] = 'application/json;charset=utf-8';
    headers['Host'] = 'qcbldekt.bit.edu.cn';
    // 移除可能导致问题的 header
    delete headers['Content-Length'];

    const body = {
        course_id: parseInt(courseId),
        template_id: CONFIG.templateId
    };

    const options = {
        url: CONFIG.applyUrl,
        headers: headers,
        body: JSON.stringify(body)
    };

    try {
        const result = await httpPost(options);
        console.log(`报名结果: ${JSON.stringify(result)}`);

        if (result.code === 200 || result.message.includes("成功")) {
            $.msg($.name, "✅ 报名成功", `课程 ID: ${courseId}\n${result.message}`);
        } else {
            $.msg($.name, "❌ 报名失败", `课程 ID: ${courseId}\n${result.message}`);
        }

    } catch (e) {
        console.log(`报名请求异常: ${e}`);
        $.msg($.name, "❌ 报名异常", `课程 ID: ${courseId}\n${e}`);
    }

    $done();
}

function httpPost(options) {
    return new Promise((resolve, reject) => {
        // QX 的 $task.fetch 支持 method: POST
        options.method = "POST";
        $.post(options, (err, resp, data) => {
            if (err) {
                reject(err);
            } else {
                try {
                    // 尝试解析 JSON
                    const res = JSON.parse(data);
                    resolve(res);
                } catch (e) {
                    // 如果不是 JSON，直接返回文本
                    resolve({ code: -1, message: data });
                }
            }
        });
    });
}

// --- Env Polyfill ---
function Env(t, e) { class s { constructor(t) { this.env = t } } return new class { constructor(t) { this.name = t, this.logs = [], this.isSurge = !1, this.isQuanX = "undefined" != typeof $task, this.isLoon = !1 } getdata(t) { let e = this.getval(t); if (/^@/.test(t)) { const [, s, i] = /^@(.*?)\.(.*?)$/.exec(t), r = s ? this.getval(s) : ""; if (r) try { const t = JSON.parse(r); e = t ? this.getval(i, t) : null } catch (t) { e = "" } } return e } setdata(t, e) { let s = !1; if (/^@/.test(e)) { const [, i, r] = /^@(.*?)\.(.*?)$/.exec(e), o = this.getval(i), h = i ? "null" === o ? null : o || "{}" : "{}"; try { const e = JSON.parse(h); this.setval(r, t, e), s = !0, this.setval(i, JSON.stringify(e)) } catch (e) { const o = {}; this.setval(r, t, o), s = !0, this.setval(i, JSON.stringify(o)) } } else s = this.setval(t, e); return s } getval(t) { return this.isQuanX ? $prefs.valueForKey(t) : "" } setval(t, e) { return this.isQuanX ? $prefs.setValueForKey(t, e) : "" } msg(e = t, s = "", i = "", r) { this.isQuanX && $notify(e, s, i, r) } post(t, e = (() => { })) { this.isQuanX && ("string" == typeof t && (t = { url: t }), t.method = "POST", $task.fetch(t).then(t => { e(null, t, t.body) }, t => e(t.error, null, null))) } done(t = {}) { this.isQuanX && $done(t) } }(t, e) }
