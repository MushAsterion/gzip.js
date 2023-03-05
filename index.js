'use-strict';

const fs = require('fs');
const zlib = require('zlib');
const http = require('http');
const MIMES = require('./MIMES.json');

/**
 * Saved cache until now.
 *
 * @type {Object.<string, string>}
 */
const cache = {};

/**
 * Verifies if path includes a certain directory for caching.
 *
 * @param {string[]} directories - Directories to look for.
 * @param {string} path - Input patch
 * @returns {boolean} Whether the path include any directory.
 */
function verifyDirectory(directories, path) {
    return directories.some(d => path.includes(d));
}

/**
 * Enable GZIP compression to res.
 *
 * @param {http.ServerRequest} req - Original request.
 * @param {http.ServerResponse} res - Original response.
 * @param {boolean} cacheEnabled - Whether to enable cache.
 * @param {{ directories: [ string ], duration: number }} cacheOptions - Cache options.
 */
function gzip(req, res, cacheEnabled = false, cacheOptions = {}) {
    if (!req.headers['accept-encoding'] || !/gzip/i.test(req.headers['accept-encoding'])) { return; }

    res.writeHeader = () => { };

    res.write = function(txt) {
        res.writeHead(200, {
            'Content-Type': MIMES[req.url.split('.').pop().toLowerCase()] || 'text/html',
            'Content-Encoding': 'gzip'
        });

        zlib.gzip(txt, (_, result) => res.end(result));
    };

    res.sendFile = function(path) {
        if (cacheEnabled && verifyDirectory(Object.assign([], Object.assign({}, cacheOptions).directories), path)) {
            res.writeHead(200, {
                'Content-Type': MIMES[req.url.split('.').pop().toLowerCase()] || 'text/html',
                'Cache-Control': `max-age=${Math.max(60, Object.assign({}, cacheOptions).duration || 60)}, no-cache`,
                'Content-Encoding': 'gzip'
            });
        }
        else {
            res.writeHead(200, {
                'Content-Type': MIMES[req.url.split('.').pop().toLowerCase()] || 'text/html',
                'Content-Encoding': 'gzip'
            });
        }

        if (cacheEnabled && cache[path]) {
            res.end(cache[path]);
        }
        else {
            fs.readFile(path, {}, (_err, data) => {
                zlib.gzip(data, (_, result) => {
                    if (cacheEnabled) {
                        cache[path] = result;
                    }

                    res.end(result);
                });
            });
        }
    };
}

module.exports = { gzip };