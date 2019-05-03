"use strict";
// List operations similar to car/cdr/cadr in Scheme
Object.defineProperty(exports, "__esModule", { value: true });
var ramda_1 = require("ramda");
exports.first = function (x) { return x[0]; };
exports.second = function (x) { return x[1]; };
exports.rest = function (x) { return x.slice(1); };
// A useful type predicate for homegeneous lists
exports.allT = function (isT, x) { return ramda_1.all(isT, x); };
// ========================================================
// Type utilities
exports.isEmpty = function (x) { return x.length === 0; };
exports.isArray = function (x) { return x instanceof Array; };
exports.isString = function (x) { return typeof x === "string"; };
exports.isNumber = function (x) { return typeof x === "number"; };
exports.isBoolean = function (x) { return typeof x === "boolean"; };
// s-expression returns strings quoted as "a" as [String: 'a'] objects
// to distinguish them from symbols - which are encoded as 'a'
// These are constructed using the new String("a") constructor
// and can be distinguished from regular strings based on the constructor.
exports.isSexpString = function (x) {
    return !exports.isString(x) && x.constructor && x.constructor.name === "String";
};
// A weird method to check that a string is a string encoding of a number
exports.isNumericString = function (x) { return JSON.stringify(+x) === x; };
