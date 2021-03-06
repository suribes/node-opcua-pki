"use strict";
var path = require("path");
var child_process = require("child_process");
var fs = require("fs");
var should = require("should");
var grep = require("./helpers").grep;

var pki = require("../index");
var toolbox = pki.toolbox;
var q = toolbox.quote;
var n = toolbox.make_path;

function create_demo_certificates(cwd, callback) {
    call_crypto_create_CA("demo  --dev", cwd, callback);
}

function call_crypto_create_CA(cmdArguments, cwd, callback) {

    fs.existsSync(cwd).should.eql(true, " current folder shall exist");

    var cmd = "node" ;
    var args = n(path.join(__dirname, "../bin/crypto_create_CA.js")) + " " + cmdArguments;
    args = args.replace("  "," ").split(" ");

    var options = {
        cwd: cwd
    };

    var child = child_process.spawn(cmd, args, options, function (err) {
        if(err) {
            console.log("ERR = ",err);
        }
    });

    console.log(" cwd = ",cwd);
    console.log(" cmd = ",cmd);
    console.log(" args = ",args);
    console.log("",cmd , args.join(" "));

    child.stdout.on('data',function() {
        ;
    });
    child.stderr.pipe(process.stderr);

    child.on('close', function (code) {
        //xx console.log("done ... (" + the_code + ")");
        callback();
    });
}

describe("testing test_crypto_create_CA", function () {

    require("./helpers").beforeTest(this);

    it("should create a PKI", function (done) {

        var cwd = path.join(__dirname, "../tmp");

        fs.existsSync(
            path.join(__dirname, "../tmp/certificates/discoveryServer_cert_2048.pem"))
            .should.eql(false);

        create_demo_certificates(cwd, function (err) {
            fs.existsSync(
                path.join(__dirname, "../tmp/certificates/discoveryServer_cert_2048.pem"))
                .should.eql(true);
            done(err);
        });
    });


    describe("self-signed certificates", function () {

        it("should create a self-signed certificate - variation 1", function (done) {
            var cwd = path.join(__dirname, "../tmp/zzz1");
            fs.mkdirSync(cwd);

            call_crypto_create_CA("certificate --selfSigned", cwd, function () {
                fs.existsSync(path.join(cwd, "my_certificate.pem")).should.eql(true);
                fs.existsSync(path.join(cwd, "my_certificate.pem.csr")).should.eql(false, "useless signing request shall be automatically removed");
                done();
            });
        });
        it("should create a self-signed certificate - variation 2 - --output ", function (done) {
            var cwd = path.join(__dirname, "../tmp/zzz2");
            fs.mkdirSync(cwd);

            var expected_certificate = path.join(cwd, "mycert.pem");
            call_crypto_create_CA("certificate --selfSigned -o mycert.pem", cwd, function () {
                fs.existsSync(expected_certificate).should.eql(true);
                fs.existsSync(path.join(cwd, "mycert.pem.csr")).should.eql(false, "useless signing request shall be automatically removed");

                toolbox.dumpCertificate(expected_certificate, function (err, data) {

                    grep(data, /Public.Key/).should.match(/Public.Key: \(2048 bit\)/);
                    //XX grep(data,/URI/).should.match(/URI:MY:APPLICATION:URI/);
                    //XX grep(data,/DNS/).should.match(/DNS:localhost/);
                    //XX grep(data,/DNS/).should.match(/DNS:my.domain.com/);
                    done();
                });
            });


        });
        it("should create a self-signed certificate - variation 3 - --applicationUrI", function (done) {
            var cwd = path.join(__dirname, "../tmp/zzz3");
            fs.mkdirSync(cwd);

            var expected_certificate = path.join(cwd, "mycert.pem");
            call_crypto_create_CA("certificate -a urn:MYSERVER:APPLICATION --selfSigned -o mycert.pem", cwd, function () {
                fs.existsSync(expected_certificate).should.eql(true);
                fs.existsSync(path.join(cwd, "mycert.pem.csr")).should.eql(false, "useless signing request shall be automatically removed");

                toolbox.dumpCertificate(expected_certificate, function (err, data) {

                    //xx console.log(data);
                    grep(data, /Public.Key/).should.match(/Public.Key: \(2048 bit\)/);
                    grep(data, /URI/).should.match(/urn:MYSERVER:APPLICATION/);
                    //XX grep(data,/DNS/).should.match(/DNS:localhost/);
                    //XX grep(data,/DNS/).should.match(/DNS:my.domain.com/);
                    done();
                });
            });


        });

        function daysBetween(date1, date2) {
            //Get 1 day in milliseconds
            var one_day = 1000 * 60 * 60 * 24;

            // Convert both dates to milliseconds
            var date1_ms = date1.getTime();
            var date2_ms = date2.getTime();

            // Calculate the difference in milliseconds
            var difference_ms = date2_ms - date1_ms;

            // Convert back to days and return
            return Math.round(difference_ms / one_day);
        }

        it("should create a self-signed certificate - variation 4 - --validity", function (done) {
            var cwd = path.join(__dirname, "../tmp/zzz4");
            fs.mkdirSync(cwd);

            var expected_certificate = path.join(cwd, "mycert.pem");
            var validity = 10; // days

            call_crypto_create_CA("certificate -v " + validity + " --selfSigned -o mycert.pem", cwd, function () {

                fs.existsSync(expected_certificate).should.eql(true);
                fs.existsSync(path.join(cwd, "mycert.pem.csr")).should.eql(false, "useless signing request shall be automatically removed");

                toolbox.dumpCertificate(expected_certificate, function (err, data) {

                    grep(data, /Public.Key/).should.match(/Public.Key: \(2048 bit\)/);
                    var startDate = grep(data, /Not Before/).match(/Not Before:(.*)/)[1].trim();
                    var endDate = grep(data, /Not After/).match(/Not After :(.*)/)[1].trim();
                    startDate = new Date(Date.parse(startDate));
                    endDate = new Date(Date.parse(endDate));

                    var validity_check = daysBetween(startDate, endDate);

                    validity_check.should.eql(validity);

                    done();
                });
            });
        });
        it("should create a self-signed certificate - variation 5 - --dns", function (done) {
            var cwd = path.join(__dirname, "../tmp/zzz5");
            fs.mkdirSync(cwd);

            var expected_certificate = path.join(cwd, "mycert.pem");
            var validity = 10; // days

            call_crypto_create_CA("certificate -v " + validity + " --dns HOST1,HOST2 --selfSigned -o mycert.pem", cwd, function () {

                fs.existsSync(expected_certificate).should.eql(true);

                toolbox.dumpCertificate(expected_certificate, function (err, data) {

                    grep(data, /Public.Key/).should.match(/Public.Key: \(2048 bit\)/);
                    grep(data, /DNS/).should.match(/DNS:HOST1/);
                    grep(data, /DNS/).should.match(/DNS:HOST2/);


                    done();
                });
            });
        });
        it("should create a self-signed certificate - variation 6 - --ip", function (done) {
            var cwd = path.join(__dirname, "../tmp/zzz6");
            fs.mkdirSync(cwd);

            var expected_certificate = path.join(cwd, "mycert.pem");
            var validity = 10; // days

            call_crypto_create_CA("certificate -v " + validity + " --ip 128.12.13.13,128.128.128.128 --selfSigned -o mycert.pem", cwd, function () {

                fs.existsSync(expected_certificate).should.eql(true);

                toolbox.dumpCertificate(expected_certificate, function (err, data) {

                    if (false) {
                        console.log(data);
                    }
                    grep(data, /Public.Key/).should.match(/Public.Key: \(2048 bit\)/);
                    grep(data, /IP/).should.match(/IP Address:128.12.13.13/);
                    grep(data, /IP/).should.match(/IP Address:128.128.128.128/);


                    done();
                });
            });
        });
    });

    describe("createCA & PKI",function() {
        it("@1 should create a CA and a PKI with 4096 bits keys",function(done) {

            var cwd = path.join(__dirname, "../tmp/tmp4096");
            fs.mkdirSync(cwd);
            call_crypto_create_CA("createCA --keySize 4096", cwd, function () {

                var ca_private_key = path.join(__dirname,"../tmp/tmp4096/certificates/CA/private/cakey.pem");
                fs.existsSync(ca_private_key).should.eql(true);
                call_crypto_create_CA("createPKI --keySize 4096", cwd, function() {
                    var pki_private_key = path.join(__dirname,"../tmp/tmp4096/certificates/PKI/own/private/private_key.pem");
                    fs.existsSync(pki_private_key).should.eql(true);

                    done();
                });
            });
        });
    });
    describe("certificates signed by Local CA Authority",function() {

        it("should create a signed certificate - variation 1", function (done) {
            var cwd = path.join(__dirname, "../tmp/yyy1");
            fs.mkdirSync(cwd);

            call_crypto_create_CA("certificate", cwd, function () {

                 done();
            });
        });
        xit("ZZ0 should create a signed certificate - variation 2", function (done) {

            var cwd = path.join(__dirname, "../tmp/yyy2");
            fs.mkdirSync(cwd);

            var expected_certificate = path.join(cwd, "mycert.pem");

            call_crypto_create_CA("certificate -o "+ "mycert.pem", cwd, function () {

                fs.existsSync(expected_certificate).should.eql(true);

                done();
            });
        });
    });

});
