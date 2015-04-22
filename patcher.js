/**
 * Created by Zoltan_Biro on 4/3/2015.
 */

var fs = require('fs');
var https = require('https');

var owner = '';
var repo = '';
var commits = '';
var mainTree = '/';
var blob = '';
var targetDir = '';

var patch = function () {
    var config = fs.readFileSync('config.json', 'utf8', function (err, data) {
        if (err) {
            return '{}';
        } else {
            return data;
        }
    });
    var configObj = JSON.parse(config);
    owner = configObj.owner;
    repo = configObj.repo;
    targetDir = configObj.targetDir;
    commits = '/repos/' + owner + '/' + repo + '/commits';
    mainTree = '/repos/' + owner + '/' + repo + '/git/trees/';
    blob = '/repos/' + owner + '/' + repo + '/git/blobs/';
    update();
}();


function urlWrapper(url) {
    var option = {
        hostname: 'api.github.com',
        path: url,
        method: 'GET',
        headers: {
            Authorization: 'token 7b819bee4cde568f80b2e616c09143e6bb7c5b7d',
            'User-Agent': owner,
            'Accept': 'application/vnd.github.v3+json'
        }
    };
    return option;
};

function update() {
    var commit = '';

    https.get(urlWrapper(commits), function (rs) {
        rs.on('data', function (chunk) {
            commit += chunk;
        });
        rs.on('error', function (e) {
            console.error(e);
        });
        rs.on('end', function () {
            var commitObj = JSON.parse(commit);
            var currentrev = commitObj[0].commit.tree.sha;
            var latestcommit = '0'
            try {
                latestcommit =
                    fs.readFileSync('latestcommit.txt', 'utf8', function (err, data) {
                        if (err) {
                            return '0';
                        } else {
                            return data;
                        }
                    })
            } catch (e) {
            }
            ;
            if (currentrev === latestcommit) {
                console.log('Up to date')
            } else {
                console.log('Update need. Please wait while update proceed!');
                try {
                    getTree(currentrev, targetDir);
                    fs.writeFile('latestcommit.txt', currentrev);
                }
                catch (err) {
                    console.log(err);
                }
            }
        });
    });
};

function getTree(sha, path) {
    var tree = '';
    var path = path;
    https.get(urlWrapper(mainTree + sha), function (rs) {
        rs.on('data', function (chunk) {
            tree += chunk;
        });
        rs.on('error', function (e) {
            console.error(e);
        });
        rs.on('end', function () {
            var treeObj = JSON.parse(tree).tree;
            for (var i in treeObj) {
                if (treeObj[i].type === 'blob') {
                    var a = function (element) {
                        console.log('Downloading file: ' + element.path);
                        var genresponse = '';
                        https.get(urlWrapper(blob + element.sha), function (rs) {
                            rs.on('data', function (chunk) {
                                genresponse += chunk;
                            });
                            rs.on('error', function (e) {
                                console.error(e);
                            });
                            rs.on('end', function () {
                                var blobObj = JSON.parse(genresponse);
                                var buf = new Buffer(blobObj.content, 'base64');
                                var content = '';
                                if (element.path.slice(element.path.indexOf('.')) != '.jpg' && element.path.slice(element.path.indexOf('.')) != '.png' && element.path.slice(element.path.indexOf('.')) != '.gif') {
                                    content = buf.toString('utf8');
                                } else {
                                    content = buf;
                                }
                                fs.writeFile(path + element.path, content);
                                buf.slice(0, 0);
                            });
                        });
                    }(treeObj[i]);
                } else {
                    var dir = path + treeObj[i].path;
                    console.log('Creating directory: ' + dir);
                    fs.mkdir(dir, function (err) {
                    });
                    getTree(treeObj[i].sha, dir + '/');
                }
            }
            ;
        });
    });
};