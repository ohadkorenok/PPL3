"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// ===========================================================
// AST type models
var ramda_1 = require("ramda");
var p = require("s-expression");
var list_1 = require("./list");
var error_1 = require("./error");
var L4_value_1 = require("./L4-value");
var L4_value_2 = require("./L4-value");
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
// Type value constructors for disjoint types
exports.makeProgram = function (exps) { return ({ tag: "Program", exps: exps }); };
exports.makeDefineExp = function (v, val) {
    return ({ tag: "DefineExp", var: v, val: val });
};
exports.makeNumExp = function (n) { return ({ tag: "NumExp", val: n }); };
exports.makeBoolExp = function (b) { return ({ tag: "BoolExp", val: b }); };
exports.makeStrExp = function (s) { return ({ tag: "StrExp", val: s }); };
exports.makePrimOp = function (op) { return ({ tag: "PrimOp", op: op }); };
exports.makeVarRef = function (v) { return ({ tag: "VarRef", var: v }); };
exports.makeVarDecl = function (v) { return ({ tag: "VarDecl", var: v }); };
exports.makeAppExp = function (rator, rands) {
    return ({ tag: "AppExp", rator: rator, rands: rands });
};
// L2
exports.makeIfExp = function (test, then, alt) {
    return ({ tag: "IfExp", test: test, then: then, alt: alt });
};
exports.makeProcExp = function (args, body) {
    return ({ tag: "ProcExp", args: args, body: body });
};
exports.makeBinding = function (v, val) {
    return ({ tag: "Binding", var: exports.makeVarDecl(v), val: val });
};
exports.makeLetExp = function (bindings, body) {
    return ({ tag: "LetExp", bindings: bindings, body: body });
};
// L3
exports.makeLitExp = function (val) {
    return ({ tag: "LitExp", val: val });
};
// L4
exports.makeLetrecExp = function (bindings, body) {
    return ({ tag: "LetrecExp", bindings: bindings, body: body });
};
exports.makeSetExp = function (v, val) {
    return ({ tag: "SetExp", var: v, val: val });
};
// Type predicates for disjoint types
exports.isProgram = function (x) { return x.tag === "Program"; };
exports.isDefineExp = function (x) { return x.tag === "DefineExp"; };
exports.isNumExp = function (x) { return x.tag === "NumExp"; };
exports.isBoolExp = function (x) { return x.tag === "BoolExp"; };
exports.isStrExp = function (x) { return x.tag === "StrExp"; };
exports.isPrimOp = function (x) { return x.tag === "PrimOp"; };
exports.isVarRef = function (x) { return x.tag === "VarRef"; };
exports.isVarDecl = function (x) { return x.tag === "VarDecl"; };
exports.isAppExp = function (x) { return x.tag === "AppExp"; };
// L2
exports.isIfExp = function (x) { return x.tag === "IfExp"; };
exports.isProcExp = function (x) { return x.tag === "ProcExp"; };
exports.isBinding = function (x) { return x.tag === "Binding"; };
exports.isLetExp = function (x) { return x.tag === "LetExp"; };
// L3
exports.isLitExp = function (x) { return x.tag === "LitExp"; };
// L4
exports.isLetrecExp = function (x) { return x.tag === "LetrecExp"; };
exports.isSetExp = function (x) { return x.tag === "SetExp"; };
// Type predicates for type unions
exports.isExp = function (x) { return exports.isDefineExp(x) || exports.isCExp(x); };
exports.isAtomicExp = function (x) {
    return exports.isNumExp(x) || exports.isBoolExp(x) || exports.isStrExp(x) ||
        exports.isPrimOp(x) || exports.isVarRef(x);
};
exports.isCompoundExp = function (x) {
    return exports.isAppExp(x) || exports.isIfExp(x) || exports.isProcExp(x) || exports.isLitExp(x) || exports.isLetExp(x) ||
        exports.isLetrecExp(x) || exports.isSetExp(x);
};
exports.isCExp = function (x) {
    return exports.isAtomicExp(x) || exports.isCompoundExp(x);
};
// ========================================================
// Parsing
exports.parse = function (x) {
    return exports.parseSexp(p(x));
};
exports.parseSexp = function (sexp) {
    return list_1.isEmpty(sexp) ? Error("Parse: Unexpected empty") :
        list_1.isArray(sexp) ? parseCompound(sexp) :
            list_1.isString(sexp) ? exports.parseAtomic(sexp) :
                list_1.isSexpString(sexp) ? exports.parseAtomic(sexp) :
                    Error("Parse: Unexpected type " + sexp);
};
var parseCompound = function (sexps) {
    return list_1.first(sexps) === "L4" ? parseProgram(ramda_1.map(exports.parseSexp, list_1.rest(sexps))) :
        list_1.first(sexps) === "define" ?
            error_1.safeF(function (val) { return exports.makeDefineExp(exports.makeVarDecl(sexps[1]), val); })(exports.parseCExp(sexps[2])) :
            exports.parseCExp(sexps);
};
var parseProgram = function (es) {
    return list_1.isEmpty(es) ? Error("Empty program") :
        list_1.allT(exports.isExp, es) ? exports.makeProgram(es) :
            error_1.hasNoError(es) ? Error("Program cannot be embedded in another program - " + es) :
                Error(error_1.getErrorMessages(es));
};
exports.parseAtomic = function (sexp) {
    return sexp === "#t" ? exports.makeBoolExp(true) :
        sexp === "#f" ? exports.makeBoolExp(false) :
            list_1.isNumericString(sexp) ? exports.makeNumExp(+sexp) :
                list_1.isSexpString(sexp) ? exports.makeStrExp(sexp.toString()) :
                    isPrimitiveOp(sexp) ? exports.makePrimOp(sexp) :
                        exports.makeVarRef(sexp);
};
/*
    ;; <prim-op>  ::= + | - | * | / | < | > | = | not | and | or | eq? | string=?
    ;;                  | cons | car | cdr | pair? | number? | list
    ;;                  | boolean? | symbol? | string?      ##### L3
*/
var isPrimitiveOp = function (x) {
    return x === "+" ||
        x === "-" ||
        x === "*" ||
        x === "/" ||
        x === ">" ||
        x === "<" ||
        x === "=" ||
        x === "not" ||
        x === "and" ||
        x === "or" ||
        x === "eq?" ||
        x === "string=?" ||
        x === "cons" ||
        x === "car" ||
        x === "cdr" ||
        x === "list" ||
        x === "pair?" ||
        x === "list?" ||
        x === "number?" ||
        x === "boolean?" ||
        x === "symbol?" ||
        x === "string?";
};
exports.parseCExp = function (sexp) {
    return list_1.isArray(sexp) ? parseCompoundCExp(sexp) :
        list_1.isString(sexp) ? exports.parseAtomic(sexp) :
            list_1.isSexpString(sexp) ? exports.parseAtomic(sexp) :
                Error("Unexpected type" + sexp);
};
var parseCompoundCExp = function (sexps) {
    return list_1.first(sexps) === "if" ? parseIfExp(sexps) :
        list_1.first(sexps) === "lambda" ? parseProcExp(sexps) :
            list_1.first(sexps) === "let" ? parseLetExp(sexps) :
                list_1.first(sexps) === "quote" ? exports.parseLitExp(sexps) :
                    list_1.first(sexps) === "letrec" ? parseLetrecExp(sexps) :
                        list_1.first(sexps) === "set!" ? parseSetExp(sexps) :
                            parseAppExp(sexps);
};
var parseAppExp = function (sexps) {
    return error_1.safeFL(function (cexps) { return exports.makeAppExp(list_1.first(cexps), list_1.rest(cexps)); })(ramda_1.map(exports.parseCExp, sexps));
};
var parseIfExp = function (sexps) {
    return error_1.safeFL(function (cexps) { return exports.makeIfExp(cexps[0], cexps[1], cexps[2]); })(ramda_1.map(exports.parseCExp, list_1.rest(sexps)));
};
var parseProcExp = function (sexps) {
    return error_1.safeFL(function (body) { return exports.makeProcExp(ramda_1.map(exports.makeVarDecl, sexps[1]), body); })(ramda_1.map(exports.parseCExp, list_1.rest(list_1.rest(sexps))));
};
var parseBindings = function (bdgs) {
    var vars = ramda_1.map(list_1.first, bdgs);
    if (!(vars instanceof Array)) {
        return Error("Bad bindings " + bdgs);
    }
    if (!list_1.allT(list_1.isString, vars)) {
        return Error("Bad bindings " + bdgs);
    }
    var vals = ramda_1.map(function (pair) { return exports.parseCExp(list_1.second(pair)); }, bdgs);
    if (!error_1.hasNoError(vals)) {
        return Error("Bad value " + bdgs);
    }
    return ramda_1.zipWith(exports.makeBinding, vars, vals);
};
var parseLetExp = function (sexps) {
    var bindings = parseBindings(sexps[1]);
    if (error_1.isError(bindings)) {
        return bindings;
    }
    var body = ramda_1.map(exports.parseCExp, list_1.rest(list_1.rest(sexps)));
    if (!error_1.hasNoError(body)) {
        return Error("Parse: Bad let: " + error_1.getErrorMessages(body));
    }
    else {
        return exports.makeLetExp(bindings, body);
    }
};
var parseLetrecExp = function (sexps) {
    var bindings = parseBindings(sexps[1]);
    if (error_1.isError(bindings)) {
        return bindings;
    }
    var body = ramda_1.map(exports.parseCExp, list_1.rest(list_1.rest(sexps)));
    if (!error_1.hasNoError(body)) {
        return Error("Parse: Bad letrec: " + error_1.getErrorMessages(body));
    }
    else {
        return exports.makeLetrecExp(bindings, body);
    }
};
var parseSetExp = function (es) {
    return (es.length !== 2) ? Error("set! should be (set! var val) - " + es) :
        !list_1.isString(es[0]) ? Error("Expected (set! <var> <CExp>) - " + es[0]) :
            error_1.safeF(function (val) { return exports.makeSetExp(exports.makeVarRef(es[0]), val); })(exports.parseCExp(es[1]));
};
// LitExp has the shape (quote <sexp>)
exports.parseLitExp = function (sexps) {
    return error_1.safeF(exports.makeLitExp)(exports.parseSExp(list_1.second(sexps)));
};
exports.isDottedPair = function (sexps) {
    return sexps.length === 3 &&
        sexps[1] === ".";
};
exports.makeDottedPair = function (sexps) {
    return error_1.safeF2(L4_value_2.makeCompoundSExp)(exports.parseSExp(sexps[0]), exports.parseSExp(sexps[2]));
};
// x is the output of p (sexp parser)
exports.parseSExp = function (x) {
    return x === "#t" ? true :
        x === "#f" ? false :
            list_1.isNumericString(x) ? +x :
                list_1.isSexpString(x) ? x.toString() :
                    list_1.isString(x) ? L4_value_2.makeSymbolSExp(x) :
                        x.length === 0 ? L4_value_2.makeEmptySExp() :
                            exports.isDottedPair(x) ? exports.makeDottedPair(x) :
                                list_1.isArray(x) ? (
                                // fail on (x . y z)
                                x[0] === '.' ? Error("Bad dotted sexp: " + x) :
                                    error_1.safeF2(L4_value_2.makeCompoundSExp)(exports.parseSExp(list_1.first(x)), exports.parseSExp(list_1.rest(x)))) :
                                    Error("Bad literal expression: " + x);
};
// ==========================================================================
// Unparse: Map an AST to a concrete syntax string.
// Add a quote for symbols, empty and compound sexp - strings and numbers are not quoted.
var unparseLitExp = function (le) {
    return L4_value_1.isEmptySExp(le.val) ? "'()" :
        L4_value_1.isSymbolSExp(le.val) ? "'" + L4_value_2.valueToString(le.val) :
            L4_value_1.isCompoundSExp(le.val) ? "'" + L4_value_2.valueToString(le.val) :
                "" + le.val;
};
var unparseLExps = function (les) {
    return ramda_1.map(exports.unparse, les).join(" ");
};
var unparseProcExp = function (pe) {
    return "(lambda (" + ramda_1.map(function (p) { return p.var; }, pe.args).join(" ") + ") " + unparseLExps(pe.body) + ")";
};
var unparseBindings = function (bdgs) {
    return ramda_1.map(function (b) { return "(" + b.var.var + " " + exports.unparse(b.val) + ")"; }, bdgs).join(" ");
};
var unparseLetExp = function (le) {
    return "(let (" + unparseBindings(le.bindings) + ") " + unparseLExps(le.body) + ")";
};
var unparseLetrecExp = function (le) {
    return "(letrec (" + unparseBindings(le.bindings) + ") " + unparseLExps(le.body) + ")";
};
var unparseSetExp = function (se) {
    return "(set! " + se.var.var + " " + exports.unparse(se.val) + ")";
};
exports.unparse = function (exp) {
    return error_1.isError(exp) ? exp.message :
        exports.isBoolExp(exp) ? L4_value_2.valueToString(exp.val) :
            exports.isNumExp(exp) ? L4_value_2.valueToString(exp.val) :
                exports.isStrExp(exp) ? L4_value_2.valueToString(exp.val) :
                    exports.isLitExp(exp) ? unparseLitExp(exp) :
                        exports.isVarRef(exp) ? exp.var :
                            exports.isProcExp(exp) ? unparseProcExp(exp) :
                                exports.isIfExp(exp) ? "(if " + exports.unparse(exp.test) + " " + exports.unparse(exp.then) + " " + exports.unparse(exp.alt) + ")" :
                                    exports.isAppExp(exp) ? "(" + exports.unparse(exp.rator) + " " + unparseLExps(exp.rands) + ")" :
                                        exports.isPrimOp(exp) ? exp.op :
                                            exports.isLetExp(exp) ? unparseLetExp(exp) :
                                                exports.isLetrecExp(exp) ? unparseLetrecExp(exp) :
                                                    exports.isSetExp(exp) ? unparseSetExp(exp) :
                                                        exports.isDefineExp(exp) ? "(define " + exp.var.var + " " + exports.unparse(exp.val) + ")" :
                                                            exports.isProgram(exp) ? "(L4 " + unparseLExps(exp.exps) + ")" :
                                                                "";
};
