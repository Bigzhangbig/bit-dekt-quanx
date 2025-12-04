/*
 * 脚本名称：北理工第二课堂-取消报名
 * 作者：Gemini for User
 * 描述：取消已报名的第二课堂课程。复用 BoxJS 的"报名课程ID"与认证信息。
 * 
 * 注意事项：
 * - 仅手动运行（task.enabled=false）
 * - 若后端取消报名路径不同，请调整 CANCEL_PATH
 * 
 * BoxJS 配置项：
 * - bit_sc_signup_course_id / dekt_course_id / DEKT_COURSE_ID：课程ID
 * - bit_sc_user_id / dekt_user_id / DEKT_USER_ID：用户ID
 * - bit_sc_token / dekt_token：认证Token
 * - bit_sc_headers / dekt_headers：请求Headers（可选）
 * 
 * [task_local]
 * # 取消报名 (手动运行)
 * 0 0 1 1 * https://github.com/Bigzhangbig/bit-dekt-quanx/raw/refs/heads/main/dekt_unenroll.js, tag=第二课堂取消报名, enabled=false
 * 
 * [mitm]
 * hostname = qcbldekt.bit.edu.cn
 */

const HOST = "https://qcbldekt.bit.edu.cn";
const $ = new Env("第二课堂取消报名");
console.log("[unenroll] 脚本启动");
const KEY_COURSE_IDS = ["bit_sc_signup_course_id", "dekt_signup_course_id", "dekt_course_id", "DEKT_COURSE_ID"];
const KEY_HEADERS = ["bit_sc_headers", "dekt_headers", "DEKT_HEADERS"];
const KEY_TOKENS = ["bit_sc_token", "dekt_token", "DEKT_TOKEN"];

// 取消报名接口路径（仅使用抓包确认的 API）
const CANCEL_PATH = "/api/course/cancelApply";

main();

async function main() {
  try {
    const courseId = getFirstPref(KEY_COURSE_IDS);
    if (!courseId) return done("未找到课程ID，请在 BoxJS 中配置与报名脚本相同的“课程ID”");

    let headers = tryParseJSON(getFirstPref(KEY_HEADERS)) || {};
    const token = getFirstPref(KEY_TOKENS);
    headers = normalizeHeaders(headers, token);

    // 用户ID来源优先级：显式偏好 > 备用键 > 不解析 token 前缀（避免错误）
    const explicitUserId = getFirstPref(["bit_sc_user_id", "dekt_user_id", "DEKT_USER_ID", "DEKT_FORCE_USER_ID", "user_id"]);
    const derivedUserId = deriveUserId(token); // 可能不准确，作为低优先级候选
    let userId = explicitUserId || "";
    console.log(`[unenroll] courseId=${courseId}, explicitUserId=${explicitUserId || '(none)'}, derivedUserId=${derivedUserId || '(none)'}`);
    if (!userId && derivedUserId) {
      userId = derivedUserId; // 仅在没有显式值时使用
    }
    console.log(`[unenroll] final userId candidate=${userId || '(empty will try without user_id first)'}`);
    console.log(`[unenroll] headers.Authorization=${headers.Authorization ? 'Bearer *' : 'none'}`);
    // 严格按照抓包，要求提供 user_id
    if (!userId) {
      const err = "缺少 user_id，请在 BoxJS 设置 dekt_user_id/bit_sc_user_id（或 DEKT_FORCE_USER_ID）";
      notify("第二课堂取消报名", `课程ID: ${courseId}`, err);
      console.log(`[unenroll] 终止：${err}`);
      return done(err);
    }
    const result = await tryCancel(courseId, userId, headers);
    if (result.ok) {
      notify("第二课堂取消报名", `课程ID: ${courseId}`, `已取消报名（${result.path}）`);
      console.log(`[unenroll] 成功: path=${result.path} status=${result.status}`);
      return done();
    } else {
      const parsed = tryParseJSON(result.body) || {};
      const detail = parsed.message || parsed.msg || (typeof result.body === 'string' ? result.body.slice(0, 200) : "");
      const hint = (result.status === 401 || result.code === 401) ? "(Token 失效，请重新获取)" : "";
      const msg = `取消失败：HTTP ${result.status || "未知"} ${detail} ${hint} [${result.path || "未知接口"}]`;
      notify("第二课堂取消报名", `课程ID: ${courseId}`, msg);
      console.log(`[unenroll] 失败: ${msg}`);
      return done(msg);
    }
  } catch (e) {
    notify("第二课堂取消报名", "", `异常：${String(e)}`);
    console.log(`[unenroll] 异常: ${String(e)}`);
    return done(String(e));
  }
}

function getFirstPref(keys) {
  for (const k of keys) {
    const v = $.getdata(k);
    console.log(`[pref] key=${k} value=${v ? '(set)' : '(empty)'}`);
    if (v) return v.trim();
  }
  // 兼容额外可能键名
  const extraKeys = ["course_id", "bit_sc_course_id", "DEKT_COURSEID"]; 
  for (const k of extraKeys) {
    const v = $.getdata(k);
    console.log(`[pref] fallback key=${k} value=${v ? '(set)' : '(empty)'}`);
    if (v) return v.trim();
  }
  return "";
}

function tryParseJSON(s) {
  if (!s) return null;
  try { return JSON.parse(s); } catch { return null; }
}

function normalizeHeaders(h, token) {
  const headers = Object.assign({}, h || {});
  // 标准头
  headers["Accept"] = headers["Accept"] || "application/json, text/plain, */*";
  headers["Content-Type"] = "application/json;charset=utf-8";
  headers["Origin"] = headers["Origin"] || HOST;
  headers["Referer"] = headers["Referer"] || "https://servicewechat.com/wx89b19258915c9585/25/page-frame.html";
  headers["User-Agent"] = headers["User-Agent"] || "Mozilla/5.0 (iPad; CPU OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.65(0x18004130) NetType/WIFI Language/zh_CN";
  headers["Host"] = headers["Host"] || "qcbldekt.bit.edu.cn";
  // 注入 token（若 headers 中未包含）
  if (token) {
    const hasAuth =
      Object.keys(headers).some(k => k.toLowerCase() === "authorization") ||
      Object.keys(headers).some(k => k.toLowerCase() === "token");
    if (!hasAuth) {
      // 常见两种携带方式，优先 Bearer
      headers["Authorization"] = `Bearer ${token}`;
    }
  }
  return headers;
}

async function tryCancel(courseId, userId, headers) {
  const payload = { course_id: toInt(courseId), user_id: toInt(userId) };
  console.log(`[unenroll] POST ${CANCEL_PATH} payload=${JSON.stringify(payload)}`);
  const r = await httpPost(`${HOST}${CANCEL_PATH}`, headers, JSON.stringify(payload));
  if (isSuccess(r)) return { ok: true, path: CANCEL_PATH, ...r };
  return { ok: false, path: CANCEL_PATH, ...r };
}

function isSuccess(resp) {
  if (!resp) return false;
  if (resp.status >= 200 && resp.status < 300 && !resp.err) {
    const data = tryParseJSON(resp.body) || {};
    // 常见成功判定：code==200/0 或 success==true 或 message含“成功”
    if (data.code === 200 || data.code === 0 || data.success === true) return true;
    if (typeof data.message === "string" && data.message.includes("成功")) return true;
    // 无结构但 2xx 也视为成功
    if (!resp.body || resp.body === "") return true;
  }
  return false;
}

function httpPost(url, headers, body) {
  return new Promise((resolve) => {
    $.post({ url, headers, body }, (err, resp, data) => {
      if (err) {
        resolve({ err });
        return;
      }
      const status = resp && (resp.statusCode ?? resp.status);
      resolve({ status, headers: resp?.headers, body: data });
    });
  });
}

function notify(title, sub, body) {
  $.msg(title, sub, body);
}

function done(reason) {
  $.done({ ret: reason ? false : true, msg: reason || "OK" });
}

function deriveUserId(token) {
  // 原逻辑：从 token 前缀解析；但抓包示例显示 token 前缀可能不是 user_id。
  // 保留此函数，仅作为低优先级候选，不再强制使用。
  if (!token) return "";
  const part = String(token).split("|")[0];
  if (/^(\d+)$/.test(part)) return part;
  return "";
}

function toInt(v) {
  const n = parseInt(String(v), 10);
  return Number.isFinite(n) ? n : undefined;
}

// Env Polyfill（与 activities 保持一致，支持 QuanX）
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
        post(requestOptions, callback = (() => {})) {
            if (this.isQuanX) {
                if (typeof requestOptions === "string") {
                    requestOptions = { url: requestOptions };
                }
                requestOptions.method = "POST";
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