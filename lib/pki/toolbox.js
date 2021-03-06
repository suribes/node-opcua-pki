/* global exports,process,require */
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
var assert = require("better-assert");
var fs = require("fs");
var path = require("path");
var child_process = require("child_process");
var _ = require("underscore");
var byline = require('byline');
var async = require("async");

var Subject = require("../../lib/misc/subject").Subject;

var exportedEnvVars = {};

function quote(str) {
    return "\"" + str + "\"";
}

exports.quote = quote;

var openssl_path = null; // not initialized

exports.g_config = {
    silent: false
};

var displayError = true;

function debugLog() {

}

exports.debugLog = debugLog;

var toolbox = exports;

var get_openssl_exec_path = require("../misc/install_prerequisite").get_openssl_exec_path;


function find_openssl(callback) {
    get_openssl_exec_path(function(err,_openssl_path){
        openssl_path = _openssl_path;
        callback(err,openssl_path);
    });
}

exports.find_openssl = find_openssl;

function mkdir(folder) {
    if (!fs.existsSync(folder)) {
        // istanbul ignore next
        if (!exports.g_config.silent) {
            console.log(" .. constructing ".white, folder);
        }
        fs.mkdirSync(folder);
    }
}

exports.mkdir = mkdir;

function setEnv(varName, value) {

    // istanbul ignore next
    if (!exports.g_config.silent) {
        console.log("          set " + varName + "=" + value);
    }
    exportedEnvVars[varName] = value;

    if (["OPENSSL_CONF"].indexOf(varName) >= 0) {
        process.env[varName] = value;
    }
}

exports.setEnv = setEnv;

function hasEnv(varName) {
    return exportedEnvVars.hasOwnProperty(varName);
}

exports.hasEnv = hasEnv;

function execute(cmd, options, callback) {

    assert(_.isFunction(callback));

    ///assert(g_config.CARootDir && fs.existsSync(option.CARootDir));
    options.cwd = options.cwd || process.cwd();

    // istanbul ignore next
    if (!exports.g_config.silent) {
        console.log("                  CWD         ".cyan, options.cwd);
    }

    var cwd = options.cwd;

    var outputs = [];
    var child = child_process.exec(cmd, {
        cwd: cwd
    }, function (err) {

        // istanbul ignore next
        if (err) {
            if (!options.hideErrorMessage) {
                console.error(" ########################################### OPENSSL ERROR  ###############################".bgWhite.red.bold);
                console.error(err.message.bgWhite.red.bold);
                console.error(" ########################################### OPENSSL ERROR  ###############################".bgWhite.red.bold);
            }
            // console.log("        ERR = ".bgWhite.red, err);
        }
        callback(err, outputs.join(""));
    });

    var stream2 = byline(child.stdout);
    stream2.on('data', function (line) {
        outputs.push(line + "\n");
    });

    // istanbul ignore next
    if (!exports.g_config.silent) {
        var stream1 = byline(child.stderr);
        stream1.on('data', function (line) {
            line = line.toString();
            if (displayError) {
                process.stdout.write("        stderr ".white + line.red + "\n");
            }
        });
        stream2.on('data', function (line) {
            line = line.toString();
            process.stdout.write("        stdout ".white + line.white.bold + "\n");
        });
    }
}

exports.execute = execute;

function useRandFile() {
    if (toolbox.openssl_version && toolbox.openssl_version.toLowerCase().indexOf('libressl') > -1) {
        return false;
    }
    return true;
}

exports.useRandFile = useRandFile;

function openssl_require2DigitYearInDate() {
    if (!toolbox.openssl_version) {
        throw new Error("openssl_require2DigitYearInDate : please call ensure_openssl_installed(callback)");
    }
    return toolbox.openssl_version.match(/OpenSSL 0\.9/);
}

exports.openssl_version = null;

function ensure_openssl_installed(callback) {

    assert(_.isFunction(callback));
    if (!openssl_path) {

        return find_openssl(function (err) {

            //istanbul ignore next
            if (err) {
                return callback(err);
            }

            toolbox.execute_openssl("version", {cwd: "."}, function (err, outputs) {
                toolbox.openssl_version = outputs.trim();
                console.log("OpenSSL version : ", toolbox.openssl_version);
                callback(err);
            });
        });
    } else {
        return callback();
    }
}
exports.ensure_openssl_installed = ensure_openssl_installed;

function execute_openssl(cmd, options, callback) {

    var empty_config_file = n(__dirname, "empty_config.cnf");

    assert(_.isFunction(callback));

    options = options || {};
    options.openssl_conf = options.openssl_conf || empty_config_file;// "!! OPEN SLL CONF NOT DEFINED BAD FILE !!";
    assert(options.openssl_conf);
    setEnv("OPENSSL_CONF", options.openssl_conf);

    // istanbul ignore next
    if (!exports.g_config.silent) {
        console.log("                  OPENSSL_CONF".cyan, process.env.OPENSSL_CONF);
        console.log("                  RANDFILE    ".cyan, process.env.RANDFILE);
        console.log("                  CMD         openssl ".cyan, cmd.cyan.bold);
    }

    ensure_openssl_installed(function (err) {
        // istanbul ignore next
        if (err) {
            return callback(err);
        }
        execute(quote(openssl_path) + " " + cmd, options, callback);
    });
}

exports.execute_openssl = execute_openssl;

function execute_openssl_no_failure(cmd, options, callback) {
    options = options || {};
    options.hideErrorMessage = true;
    execute_openssl(cmd, options, function (err, output_string) {
        // istanbul ignore next
        if (err) {
            console.log(" ERROR : ", err.message);
        }
        callback(null, output_string);
    });
}

exports.execute_openssl_no_failure = execute_openssl_no_failure;

// istanbul ignore next
function displayChapter(str, option_callback) {

    var l = "                                                                                               ";
    console.log(l.bgWhite);
    str = ("        " + str + l).substring(0, l.length);
    console.log(str.bgWhite.cyan);
    console.log(l.bgWhite);
    if (option_callback) {
        option_callback();
    }
}

exports.displayChapter = displayChapter;

function displayTitle(str, option_callback) {

    // istanbul ignore next
    if (!exports.g_config.silent) {
        console.log("");
        console.log(str.yellow.bold);
        console.log(new Array(str.length + 1).join("=").yellow, "\n");
    }
    if (option_callback) {
        option_callback();
    }
}

exports.displayTitle = displayTitle;

function displaySubtitle(str, option_callback) {

    // istanbul ignore next
    if (!exports.g_config.silent) {
        console.log("");
        console.log("    " + str.yellow.bold);
        console.log("    " + new Array(str.length + 1).join("-").white, "\n");
    }
    if (option_callback) {
        option_callback();
    }
}

exports.displaySubtitle = displaySubtitle;

function getEnvironmentVarNames() {
    return Object.keys(exportedEnvVars).map(function(varName) { return { key: varName, pattern: '\\$ENV\\:\\:' + varName }; });
}

exports.getEnvironmentVarNames = getEnvironmentVarNames;

function generateStaticConfig(configPath, options, option_callback) {
    var prePath = options && options.cwd || '';
    var staticConfigPath = configPath + '.tmp';
    var staticConfig = fs.readFileSync(path.join(prePath, configPath), { encoding: 'utf8' });
    for (var envVar of getEnvironmentVarNames()) {
        staticConfig = staticConfig.replace(new RegExp(envVar.pattern, 'gi'), exportedEnvVars[envVar.key]);
    }
    fs.writeFileSync(path.join(prePath, staticConfigPath), staticConfig);

    if (option_callback) {
        option_callback();
    }
    return staticConfigPath;
}

exports.generateStaticConfig = generateStaticConfig;

var q = quote;

exports.make_path = function make_path(folder_name, file_name) {
    var s;
    if (file_name) {
        s = path.join(path.normalize(folder_name), file_name);
    } else {
        s = folder_name;
    }
    s = s.replace(/\\/g, "/");
    return s;
};
var n = toolbox.make_path;

/**
 *   calculate the public key from private key
 *   openssl rsa -pubout -in private_key.pem
 *
 * @method getPublicKeyFromPrivateKey
 * @param private_key_filename
 * @param public_key_filename
 * @param callback  {Function}
 */
exports.getPublicKeyFromPrivateKey = function getPublicKeyFromPrivateKey(private_key_filename, public_key_filename, callback) {
    assert(fs.existsSync(private_key_filename));
    execute_openssl("rsa -pubout -in " + q(n(private_key_filename)) + " -out " + q(n(public_key_filename)), {}, callback);
};


/**
 * extract public key from a certificate
 *   openssl x509 -pubkey -in certificate.pem -nottext
 *
 * @method getPublicKeyFromCertificate
 * @param certificate_filename
 * @param public_key_filename
 * @param callback
 */
exports.getPublicKeyFromCertificate = function getPublicKeyFromCertificate(certificate_filename, public_key_filename, callback) {
    assert(fs.existsSync(certificate_filename));
    execute_openssl("x509 -pubkey -in " + q(n(certificate_filename)) + " > " + q(n(public_key_filename)), {}, callback);
};


/**
 * create a RSA PRIVATE KEY
 *
 * @method createPrivateKey
 *
 * @param private_key_filename
 * @param key_length
 * @param callback {Function}
 */
function createPrivateKey(private_key_filename, key_length, callback) {
    if (useRandFile()) {
        assert(toolbox.hasEnv("RANDFILE"));
    }
    assert([1024, 2048, 3072, 4096].indexOf(key_length) >= 0);
    execute_openssl("genrsa " +
      " -out " + q(n(private_key_filename)) +
      (useRandFile() ? " -rand " + q(n(exportedEnvVars.RANDFILE)) : '') +
      " " + key_length, {}, callback);
}

exports.createPrivateKey = createPrivateKey;


/**
 *
 * @param csr_file
 * @param private_key
 * @param callback
 */
exports.createCertificateSigningRequest = function createCertificateSigningRequest(csr_file, params, callback) {

    assert(params);
    assert(params.rootDir);
    assert(params.configFile);
    assert(params.privateKey);
    assert(_.isString(params.privateKey));
    assert(fs.existsSync(params.configFile), "config file must exist");
    assert(fs.existsSync(params.privateKey), "Private key must exist");
    assert(fs.existsSync(params.rootDir), "RootDir key must exist");
    assert(_.isString(csr_file));


    // note : this openssl command requires a config file
    toolbox.processAltNames(params);
    var configFile = toolbox.generateStaticConfig(params.configFile);
    var options = {cwd: params.rootDir, openssl_conf: configFile};

    var configOption = " -config " + q(n(configFile));

    //process.env.OPENSSL_CONF  ="";
    async.series([
        displaySubtitle.bind(null, "- Creating a Certificate Signing Request"),
        execute_openssl.bind(null, "req -new" +
          "  -sha256 " +
          " -batch " +
          " -text " +
          configOption +
          " -key " + q(n(params.privateKey)) +
          " -out " + q(n(csr_file)), options)
    ], callback);
};


function x509Date(date) {

    var Y = date.getUTCFullYear();
    var M = date.getUTCMonth() + 1;
    var D = date.getUTCDate();
    var h = date.getUTCHours();
    var m = date.getUTCMinutes();
    var s = date.getUTCSeconds();

    function w(s, l) {
        return ("00000" + s).substr(-l, l);
    }

    if (openssl_require2DigitYearInDate()) {
        // for example: on MacOS , where openssl 0.98 is installed by default
        return w(Y, 2) + w(M, 2) + w(D, 2) + w(h, 2) + w(m, 2) + w(s, 2) + "Z";
    } else {
        // for instance when openssl version is greater than 1.0.0
        return w(Y, 4) + w(M, 2) + w(D, 2) + w(h, 2) + w(m, 2) + w(s, 2) + "Z";
    }
}

toolbox.x509Date = x509Date;

function adjustDate(params) {

    assert(params instanceof Object);
    params.startDate = params.startDate || new Date();
    assert(params.startDate instanceof Date);

    params.validity = params.validity || 365; // one year

    params.endDate = new Date(params.startDate.getTime());
    params.endDate.setDate(params.startDate.getDate() + params.validity);

    //xx params.endDate = toolbox.x509Date(endDate);
    //xx params.startDate = toolbox.x509Date(startDate);

    assert(params.endDate instanceof Date);
    assert(params.startDate instanceof Date);

    // istanbul ignore next
    if (!exports.g_config.silent) {
        console.log(" start Date ", params.startDate.toUTCString(), toolbox.x509Date(params.startDate));
        console.log(" end   Date ", params.endDate.toUTCString(), toolbox.x509Date(params.endDate));
    }

}

exports.adjustDate = adjustDate;

function adjustApplicationUri(params) {
    var applicationUri = params.applicationUri;
    assert(typeof applicationUri === "string");
    assert(applicationUri.length <= 64, "Openssl doesn't support urn with length greater than 64 ");
}

exports.adjustApplicationUri = adjustApplicationUri;

function check_certificate_filename(certificate_file) {
    assert(typeof certificate_file === "string");

    // istanbul ignore next
    if (fs.existsSync(certificate_file) && !exports.g_config.force) {
        console.log("        certificate ".yellow + certificate_file.cyan + " already exists => do not overwrite".yellow);
        return false;
    }
    return true;
}

exports.check_certificate_filename = check_certificate_filename;


/**
 *
 * @param params
 * @param params.applicationUri {String}
 * @param params.dns            {String[]}
 * @param params.ip             {String[]}
 * @private
 */
function processAltNames(params) {
    params.dns = params.dns || [];
    params.ip = params.ip || [];

    // construct subjetAtlName
    var subjectAltName = [];
    subjectAltName.push("URI:" + params.applicationUri);
    subjectAltName = [].concat(subjectAltName, params.dns.map(function (d) {
        return "DNS:" + d
    }));
    subjectAltName = [].concat(subjectAltName, params.ip.map(function (d) {
        return "IP:" + d
    }));
    subjectAltName = subjectAltName.join(", ");
    toolbox.setEnv("ALTNAME", subjectAltName);
}

exports.processAltNames = processAltNames;


/**
 *
 * @param certificate
 * @param params
 * @param params.configFile
 * @param params.rootDir
 * @param params.privateKey
 * @param params.applicationUri   {String}
 * @param params.dns              {Array<String>}
 * @param params.ip               {Array<String>}
 * @param params.validity        {Number} certificate duration in days
 * @param [params.subject= "/C=FR/ST=IDF/L=Paris/O=Local NODE-OPCUA Certificate Authority/CN=ZZNodeOPCUA"]
 * @param callback
 */
exports.createSelfSignCertificate = function createSelfSignCertificate(certificate, params, callback) {

    /**
     * note: due to a limitation of openssl ,
     *       it is not possible to control the startDate of the certificate validity
     *       to achieve this the certificateAuthority tool shall be used.
     */
    assert(fs.existsSync(params.configFile));
    assert(fs.existsSync(params.rootDir));
    assert(fs.existsSync(params.privateKey));

    assert(_.isString(params.applicationUri));
    assert(_.isArray(params.dns));

    //xx no key size in self-signed assert(params.keySize == 2048 || params.keySize == 4096);

    processAltNames(params);

    adjustDate(params);

    assert(params.hasOwnProperty("validity"));
    assert(params.hasOwnProperty("subject"));
    var subject = new Subject(params.subject);
    subject = subject.toString();

    var certificate_request = certificate + ".csr";

    var configFile = toolbox.generateStaticConfig(params.configFile);
    var configOption = " -config " + q(n(configFile));

    var tasks = [

        displayTitle.bind(null, "Generate a certificate request"),

        // Once the private key is generated a Certificate Signing Request can be generated.
        // The CSR is then used in one of two ways. Ideally, the CSR will be sent to a Certificate Authority, such as
        // Thawte or Verisign who will verify the identity of the requestor and issue a signed certificate.
        // The second option is to self-sign the CSR, which will be demonstrated in the next section
        execute_openssl.bind(null, "req -new" +
          " -sha256 " +
          " -text " +
          " -extensions v3_ca" +
          configOption +
          " -key " + q(n(params.privateKey)) +
          " -out " + q(n(certificate_request)) +
          " -subj \"" + subject + "\"", {}),

        //Xx // Step 3: Remove Passphrase from Key
        //Xx execute("cp private/cakey.pem private/cakey.pem.org");
        //Xx execute(openssl_path + " rsa -in private/cakey.pem.org -out private/cakey.pem -passin pass:"+paraphrase);

        displayTitle.bind(null, "Generate Certificate (self-signed)"),
        execute_openssl.bind(null, " x509 -req " +
          " -days " + params.validity +
          " -extensions v3_ca" +
          " -extfile " + q(n(configFile)) +
          " -in " + q(n(certificate_request)) +
          " -signkey " + q(n(params.privateKey)) +
          " -text " +
          " -out " + q(certificate) +
          " -text ", {}),

        // remove unnecessary certificate request file
        fs.unlink.bind(null, certificate_request)

    ];
    async.series(tasks, callback);
};

var ca_config_template = require("./templates/ca_config_template.cnf.js");
var simple_config_template = require("./templates/simple_config_template.cnf.js");

exports.__defineGetter__("configurationFileTemplate", function () {
    return ca_config_template;
});

/**
 *
 * a minimalist config file for openssl that allows
 * self-signed certificate to be generated.
 *
 */
exports.__defineGetter__("configurationFileSimpleTemplate", function () {
    return simple_config_template;
});
/**
 *
 * @param certificate {String} - the certificate file in PEM format, file must exist
 * @param callback {Function}
 * @param callback.err    {null|Error}
 * @param callback.output {String} the output string
 */
exports.dumpCertificate = function (certificate, callback) {

    assert(fs.existsSync(certificate));
    assert(_.isFunction(callback));

    execute_openssl("x509 " +
      " -in " + q(n(certificate)) +
      " -text " +
      " -noout", {}, callback);
};
exports.toDer = function (certificatePem, callback) {

    assert(fs.existsSync(certificatePem));
    var certificateDer = certificatePem.replace(".pem", ".der");
    execute_openssl("x509  " +
      " -outform der " +
      " -in " + certificatePem +
      " -out " + certificateDer, {}, callback)

};

exports.fingerprint = function (certificatePem, callback) {
//openssl x509 -in my_certificate.pem -hash -dates -noout -fingerprint
    assert(fs.existsSync(certificatePem));
    execute_openssl("x509  " +
      " -fingerprint " +
      " -noout " +
      " -in " + certificatePem, {}, callback);
};

