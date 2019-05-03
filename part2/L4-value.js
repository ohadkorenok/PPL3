"use strict";
// ========================================================
// Value type definition for L4
Object.defineProperty(exports, "__esModule", { value: true });
var L4_ast_1 = require("./L4-ast");
var ramda_1 = require("ramda");
var list_1 = require("./list");
var error_1 = require("./error");
exports.isFunctional = function (x) { return L4_ast_1.isPrimOp(x) || exports.isClosure(x); };
;
exports.makeClosure = function (params, body, env) {
    return ({ tag: "Closure", params: params, body: body, env: env });
};
exports.isClosure = function (x) { return x.tag === "Closure"; };
;
;
;
exports.isSExp = function (x) {
    return typeof (x) === 'string' || typeof (x) === 'boolean' || typeof (x) === 'number' ||
        exports.isSymbolSExp(x) || exports.isCompoundSExp(x) || exports.isEmptySExp(x) || L4_ast_1.isPrimOp(x) || exports.isClosure(x);
};
exports.makeCompoundSExp = function (val1, val2) {
    return ({ tag: "CompoundSexp", val1: val1, val2: val2 });
};
exports.isCompoundSExp = function (x) { return x.tag === "CompoundSexp"; };
exports.makeEmptySExp = function () { return ({ tag: "EmptySExp" }); };
exports.isEmptySExp = function (x) { return x.tag === "EmptySExp"; };
exports.makeSymbolSExp = function (val) {
    return ({ tag: "SymbolSExp", val: val });
};
exports.isSymbolSExp = function (x) { return x.tag === "SymbolSExp"; };
// Printable form for values
exports.closureToString = function (c) {
    // `<Closure ${c.params} ${L3unparse(c.body)}>`
    return "<Closure " + c.params + " " + c.body + ">";
};
exports.compoundSExpToArray = function (cs, res) {
    return exports.isEmptySExp(cs.val2) ? ramda_1.append(exports.valueToString(cs.val1), res) :
        exports.isCompoundSExp(cs.val2) ? exports.compoundSExpToArray(cs.val2, res.concat([exports.valueToString(cs.val1)])) :
            ({ s1: res.concat([exports.valueToString(cs.val1)]), s2: exports.valueToString(cs.val2) });
};
exports.compoundSExpToString = function (cs, css) {
    if (css === void 0) { css = exports.compoundSExpToArray(cs, []); }
    return list_1.isArray(css) ? "(" + css.join(' ') + ")" :
        "(" + css.s1.join(' ') + " . " + css.s2 + ")";
};
exports.valueToString = function (val) {
    return list_1.isNumber(val) ? val.toString() :
        val === true ? '#t' :
            val === false ? '#f' :
                list_1.isString(val) ? "\"" + val + "\"" :
                    exports.isClosure(val) ? exports.closureToString(val) :
                        L4_ast_1.isPrimOp(val) ? val.op :
                            exports.isSymbolSExp(val) ? val.val :
                                exports.isEmptySExp(val) ? "'()" :
                                    exports.isCompoundSExp(val) ? exports.compoundSExpToString(val) :
                                        "Error: unknown value type " + val;
};
exports.parsedToString = function (val) {
    return error_1.isError(val) ? "Error: " + val.message :
        exports.valueToString(val);
};
