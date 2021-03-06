"use strict";
/**
 * @constructor
 * @param options.commonName: {String}
 * @param options.organization: {String}
 * @param options.organizationUnit: {String}
 * @param options.locality: {String}
 * @param options.state: {String}
 * @param options.country: {String}
 * @param options.domainComponent: {String}
 */
function Subject(options) {
    /**
     *
     */
    if (options instanceof Subject){
        /* nothing */
    } else if (typeof(options) === "string") {
        options = Subject.parse(options);
    }

    this.commonName = options.commonName;
    this.organization = options.organization;
    this.organizationUnit = options.organizationUnit;
    this.locality = options.locality;
    this.state = options.state;
    this.country = options.country;
    this.domainComponent = options.domainComponent;
}
Subject.prototype.toString = function () {

    var tmp = "";
    if (this.country) tmp += "/C=" + this.country;
    if (this.state) tmp += "/ST=" + this.state;
    if (this.locality) tmp += "/L=" + this.locality;
    if (this.organization) tmp += "/O=" + this.organization;
    if (this.commonName) tmp += "/CN=" + this.commonName;
    if (this.domainComponent) tmp += "/DC=" + this.domainComponent;
    return tmp;
};


var _keys = {
    "C": "country",
    "ST": "state",
    "L": "locality",
    "O": "organisation",
    "OU": "organisationUnit",
    "CN": "commonName",
    "DC": "domainComponent"
};

Subject.parse = function (str) {

    var elements = str.split("/");
    var options = {};

    elements.forEach(function (element) {
        if (element.length === 0) return;
        var s = element.split("=");

        if (s.length !== 2) {
            throw new Error("invalid format for " + element);
        }
        options[_keys[s[0]]] = s[1];
    });
    return new Subject(options);
};

exports.Subject = Subject;
