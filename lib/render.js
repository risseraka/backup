var fs = require('fs');

module.exports = function initRender(dir) {
    var cache = {};

    var stats = fs.statSync(dir);
    if (!stats.isDirectory()) {
        throw new Error('directory ' + dir + ' does not exist');
    }

    return function render(file, data) {
        file = dir + file;

        !data && (data = {});

        if (!cache[file]) {
            cache[file] = fs.readFileSync(file, 'utf8');

            console.log('[render] loaded file:', file, ', template:\n', cache[file]);
        }

        return Object.keys(data).reduce(function (html, key) {
            return html.replace(new RegExp('%' + key + '%', 'g'), data[key]);
        }, cache[file]);
    };
}
