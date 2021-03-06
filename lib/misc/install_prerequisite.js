/* eslint nzw-cap: 0*/
// ---------------------------------------------------------------------------------------------------------------------
// node-opcua
// ---------------------------------------------------------------------------------------------------------------------
// Copyright (c) 2014-2017 - Etienne Rossignon - etienne.rossignon (at) gadz.org
// ---------------------------------------------------------------------------------------------------------------------
//
// This  project is licensed under the terms of the MIT license.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
// documentation files (the "Software"), to deal in the Software without restriction, including without limitation the
// rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
// permit persons to whom the Software is furnished to do so,  subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all copies or substantial portions of the
// Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE
// WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
// COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
// ---------------------------------------------------------------------------------------------------------------------
"use strict";
var assert = require("assert");
var _ = require("underscore");
var child_process = require("child_process");
var byline = require('byline');
var fs = require("fs");
var path = require("path");

require("colors");

function execute(cmd, callback, cwd) {

    var output = "";

    cwd = cwd ? {cwd: cwd} : {};

    var child = child_process.exec(cmd, cwd, function (err) {
        callback(err, child.exitCode, output);
    });
    var stream1 = byline(child.stdout);
    stream1.on('data', function (line) {
        output += line + "\n";
        process.stdout.write("        stdout " + line.yellow + "\n");
    });
}

function quote(str) {
    return "\"" + str.replace(/\\/g, "/") + "\"";
}

function is_expected_openssl_version(strVersion) {
    return strVersion.match(/OpenSSL 1.0./);
}


function check_system_openssl_version(callback) {

    execute("which openssl", function (err, exitCode, output) {
        if (err) {
            console.log("warning: ", err.message);
        }
        if (exitCode !== 0) {
            console.log(" it seems that ".yellow + "openssl".cyan + " is not installed on your computer ".yellow);
            console.log("Please install it before running this programs".yellow);
            return callback(new Error("Cannot find openssl"));
        }
        var openssl_exe_path = output.replace(/\n\r/g, "").trim();

        var q_openssl_exe_path = quote(openssl_exe_path);

        console.log("              OpenSSL found in : " + openssl_exe_path.yellow);
        // ------------------------ now verify that openssl version is the correct one
        execute(q_openssl_exe_path + " version", function (err, exitCode, output) {

            if (err) {
                return callback(err);
            }
            var version = output.trim();

            var versionOK = (exitCode === 0) && is_expected_openssl_version(version);
            if (!versionOK) {

                var message = "Warning !!!!!!!!!!!! ".white.bold +
                  "\nyour version of openssl doesn't match the expected version";

                if (process.platform === "darwin") {
                    message += "\nplease refer to :".cyan + " https://github.com/node-opcua/node-opcua/wiki/installing-node-opcua-or-node-red-on-MacOS".yellow.bold
                }

                var table = new Table();
                table.push([message]);
                console.error(table.toString());


            }
            return callback(null, output);

        });

    });
}
exports.check_system_openssl_version = check_system_openssl_version;


var yauzl = require("yauzl");
var os = require("os");
var ProgressBar = require('progress');
var wget = require("wget-improved");
var Table = require("cli-table");

function install_and_check_win32_openssl_version(callback) {



    var download_folder = path.join(os.tmpdir(), ".");

    function get_openssl_folder_win32() {
        if (process.env.LOCALAPPDATA) {
            var user_program_folder = path.join(process.env.LOCALAPPDATA, "Programs");
            if (fs.existsSync(user_program_folder)) {
                return path.join(user_program_folder, "openssl");
            }
        }
        return path.join(process.cwd(), "openssl");
    }

    function get_openssl_exec_path_win32() {
        var openssl_folder = get_openssl_folder_win32();
        var openssl_exe_path = path.join(openssl_folder, "openssl.exe");
        return openssl_exe_path;
    }

    function check_openssl_win32(callback) {

        var openssl_exe_path = get_openssl_exec_path_win32();

        console.log("checking presence of ", openssl_exe_path);

        fs.exists(openssl_exe_path, function (exists) {

            if (!exists) {
                console.log(" cannot find file ".red + openssl_exe_path);
                return callback(null, false, "cannot find file " + openssl_exe_path);
            } else {

                var q_openssl_exe_path = quote(openssl_exe_path);
                var cwd = ".";

                execute(q_openssl_exe_path + " version", function (err, exitCode, output) {
                    var version = output.trim();
                    console.log(" Version = ", version);
                    if (err) {
                        return callback(err);
                    }
                    callback(null, (exitCode === 0) && is_expected_openssl_version(version), version);
                }, cwd);

            }
        });
    }


    /**
     * detect whether windows OS is a 64 bits or 32 bits
     * http://ss64.com/nt/syntax-64bit.html
     * http://blogs.msdn.com/b/david.wang/archive/2006/03/26/howto-detect-process-bitness.aspx
     * @return {number}
     */
    function win32or64() {
        //xx  console.log(" process.env.PROCESSOR_ARCHITEW6432  =", process.env.PROCESSOR_ARCHITEW6432);
        if (process.env.PROCESSOR_ARCHITECTURE === "x86" && process.env.PROCESSOR_ARCHITEW6432) {
            return 64;
        }

        if (process.env.PROCESSOR_ARCHITECTURE === "AMD64") {
            return 64;
        }

        // check if we are running nodejs x32 on a x64 arch
        if (process.env.CURRENT_CPU === "x64") {
            return 64;
        }
        return 32;
    }

    function download_openssl(callback) {

        // var url = (win32or64() === 64 )
        //         ? "http://indy.fulgan.com/SSL/openssl-1.0.2j-x64_86-win64.zip"
        //         : "http://indy.fulgan.com/SSL/openssl-1.0.2j-i386-win32.zip"
        //     ;
        var url = (win32or64() === 64)
          ? "https://github.com/node-opcua/node-opcua-pki/releases/download/0.0.15/openssl-1.0.2l-x64_86-win64.zip"
          : "https://github.com/node-opcua/node-opcua-pki/releases/download/0.0.15/openssl-1.0.2l-i386-win32.zip"
        ;


        // the zip file
        var output_filename = path.join(download_folder, path.basename(url));

        console.log("downloading " + url.yellow);
        if (fs.existsSync(output_filename)) {
            return callback(null, output_filename);
        }
        var options = {};
        var bar = new ProgressBar("[:bar]".cyan + " :percent ".yellow + ':etas'.white, {
            complete: '=',
            incomplete: ' ',
            width: 100,
            total: 100
        });

        var download = wget.download(url, output_filename, options);
        download.on('error', function (err) {
            console.log(err);
        });
        download.on('end', function (output) {
            console.log(output);
            //console.log("done ...");
            setImmediate(function () {
                callback(null, output_filename);
            });
        });
        download.on('progress', function (progress) {
            bar.update(progress);
        });
    }

    function unzip_openssl(zipfilename, callback) {

        var openssl_folder = get_openssl_folder_win32();

        yauzl.open(zipfilename, {lazyEntries: true}, function (err, zipfile) {

            if (err) throw err;

            zipfile.readEntry();

            zipfile.on("end", function (err) {
                setImmediate(function () {
                    console.log("unzip done");
                    callback(err);
                });
            });

            zipfile.on("entry", function (entry) {

                zipfile.openReadStream(entry, function (err, readStream) {
                    if (err) throw err;

                    var file = path.join(openssl_folder, entry.fileName);

                    console.log(" unzipping :", file);

                    var writeStream = fs.createWriteStream(file, "binary");
                    // ensure parent directory exists
                    readStream.pipe(writeStream);

                    writeStream.on("close", function () {
                        zipfile.readEntry();
                    });
                });
            });
        });
    }


    var openssl_folder = get_openssl_folder_win32();
    var openssl_exe_path = get_openssl_exec_path_win32();

    if (!fs.existsSync(openssl_folder)) {
        console.log("creating openssl_folder", openssl_folder);
        fs.mkdirSync(openssl_folder);
    }

    check_openssl_win32(function (err, openssl_ok) {

        if (err) {
            return callback(err);
        }
        if (!openssl_ok) {
            console.log("openssl seems to be missing and need to be installed".yellow);
            download_openssl(function (err, filename) {
                if (!err) {
                    console.log("deflating ", filename.yellow);
                    unzip_openssl(filename, function (err) {
                        var openssl_exists = !!fs.existsSync(openssl_exe_path);
                        console.log("verifying ", openssl_exists, openssl_exists ? "OK ".green : " Error".red, openssl_exe_path);
                        console.log("done ", err ? err : "");
                        check_openssl_win32(function (err) {
                            callback(err, openssl_exe_path);
                        });
                    });
                }
            });

        } else {
            console.log("openssl is already installed and have the expected version.".green);
            return callback(null, openssl_exe_path);
        }
    });

}



/**
 *
 * @param callback    {Function}
 * @param callback.err {Error|null}
 * @param callback.pathToOpenSSL {string}
 */
function install_prerequisite(callback) {

    // istanbul ignore else
    if (process.platform !== 'win32') {
        return check_system_openssl_version(callback);
    } else {
        return install_and_check_win32_openssl_version(callback);
    }
}
exports.install_prerequisite = install_prerequisite;

function get_openssl_exec_path(callback) {

    assert(_.isFunction(callback));

    if (process.platform === "win32") {

        install_prerequisite(function(err,openssl_exe_path){
            if (err) { return callback(err);}
            if (!fs.existsSync(openssl_exe_path)) {
                throw new Error("internal error cannot find " + openssl_exe_path);
            }
            callback(err,openssl_exe_path);
        });

    } else {
        setImmediate(function() { callback(null,"openssl");});
    }
}
exports.get_openssl_exec_path = get_openssl_exec_path;
