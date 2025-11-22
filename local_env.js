const fs = require('fs');
const path = require('path');
const https = require('https');
const zlib = require('zlib');

class Env {
    constructor(name) {
        this.name = name;
        this.dataFile = path.join(__dirname, '.env');
        this.data = this.loadData();
    }

    loadData() {
        if (fs.existsSync(this.dataFile)) {
            try {
                const content = fs.readFileSync(this.dataFile, 'utf8');
                const result = {};
                content.split('\n').forEach(line => {
                    line = line.trim();
                    if (line && !line.startsWith('#')) {
                        const parts = line.split('=');
                        const key = parts[0].trim();
                        const val = parts.slice(1).join('=').trim();
                        // Remove quotes if present
                        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                            result[key] = val.slice(1, -1);
                        } else {
                            result[key] = val;
                        }
                    }
                });
                return result;
            } catch (e) {
                console.error("Error reading .env:", e);
                return {};
            }
        }
        return {};
    }

    saveData() {
        const content = Object.entries(this.data)
            .map(([key, val]) => `${key}=${val}`)
            .join('\n');
        fs.writeFileSync(this.dataFile, content);
    }

    getdata(key) {
        return this.data[key];
    }

    setdata(val, key) {
        this.data[key] = val;
        this.saveData();
    }

    msg(title, subtitle, body) {
        console.log(`\n=== ${title} ===\n${subtitle || ''}\n${body || ''}\n==================\n`);
    }

    log(msg) {
        console.log(`[${this.name}] ${msg}`);
    }

    get(options, callback) {
        this.request('GET', options, callback);
    }

    post(options, callback) {
        this.request('POST', options, callback);
    }

    request(method, options, callback) {
        let urlStr = typeof options === 'string' ? options : options.url;
        let opts = typeof options === 'string' ? {} : options;
        
        if (!urlStr) {
            return callback('No URL specified', null, null);
        }

        try {
            const url = new URL(urlStr);
            const reqOpts = {
                method: method,
                hostname: url.hostname,
                port: url.port || 443,
                path: url.pathname + url.search,
                headers: opts.headers || {}
            };

            // Handle body
            let body = opts.body;
            if (body && typeof body === 'object') {
                // If body is object and not buffer, assume JSON or form? 
                // Usually QX scripts pass stringified body.
                // If it's an object, let's try to stringify it if content-type is json
                if (reqOpts.headers['Content-Type'] && reqOpts.headers['Content-Type'].includes('application/json')) {
                     body = JSON.stringify(body);
                }
            }

            if (body) {
                reqOpts.headers['Content-Length'] = Buffer.byteLength(body);
            }

            const req = https.request(reqOpts, (res) => {
                const encoding = res.headers['content-encoding'];
                let stream = res;
                
                // Handle compression
                if (encoding === 'gzip') {
                    stream = res.pipe(zlib.createGunzip());
                } else if (encoding === 'deflate') {
                    stream = res.pipe(zlib.createInflate());
                } else if (encoding === 'br') {
                    stream = res.pipe(zlib.createBrotliDecompress());
                }

                let data = '';
                // Set encoding to utf8 to get string instead of buffer
                stream.setEncoding('utf8');
                
                stream.on('data', (chunk) => data += chunk);
                stream.on('end', () => {
                    callback(null, res, data);
                });
            });

            req.on('error', (e) => {
                callback(e, null, null);
            });

            if (body) {
                req.write(body);
            }
            req.end();
        } catch (e) {
            callback(e, null, null);
        }
    }

    done(val) {
        console.log(`\n[${this.name}] Execution finished.`);
    }
}

module.exports = Env;
