"use strict";
// Environment for L4 (support for Letrec)
// =======================================
// An environment represents a partial function from symbols (variable names) to values.
// It supports the operation: apply-env(env,var)
// which either returns the value of var in the environment, or else throws an error.
//
// Env is defined inductively by the following cases:
// * <env> ::= <empty-env> | <extended-env> | <rec-env>
// * <empty-env> ::= (empty-env) // empty-env()
// * <extended-env> ::= (env (symbol+) (value+) next-env) // env(vars:List(Symbol), vals:List(Value), next-env: Env)
// * <rec-ext-env> ::= (rec-env (symbol+) (params+) (bodies+) next-env)
//       // rec-env(vars:List(Symbol), paramss:List(List(var-decl)), bodiess:List(List(cexp)), next-env: Env)
//
// The key operation on env is apply-env(var) which returns the value associated to var in env
// or throw an error if var is not defined in env.
Object.defineProperty(exports, "__esModule", { value: true });
var L4_value_1 = require("./L4-value");
;
;
;
exports.makeEmptyEnv = function () { return ({ tag: "EmptyEnv" }); };
exports.makeExtEnv = function (vs, vals, env) {
    return ({ tag: "ExtEnv", vars: vs, vals: vals, nextEnv: env });
};
exports.makeRecEnv = function (vs, paramss, bodiess, env) {
    return ({ tag: "RecEnv", vars: vs, paramss: paramss, bodiess: bodiess, nextEnv: env });
};
var isEmptyEnv = function (x) { return x.tag === "EmptyEnv"; };
var isExtEnv = function (x) { return x.tag === "ExtEnv"; };
var isRecEnv = function (x) { return x.tag === "RecEnv"; };
exports.isEnv = function (x) { return isEmptyEnv(x) || isExtEnv(x) || isRecEnv(x); };
// Apply-env
exports.applyEnv = function (env, v) {
    return isEmptyEnv(env) ? Error("var not found " + v) :
        isExtEnv(env) ? applyExtEnv(env, v) :
            applyRecEnv(env, v);
};
var applyExtEnv = function (env, v) {
    return env.vars.includes(v) ? env.vals[env.vars.indexOf(v)] :
        exports.applyEnv(env.nextEnv, v);
};
var applyRecEnv = function (env, v) {
    return env.vars.includes(v) ? L4_value_1.makeClosure(env.paramss[env.vars.indexOf(v)], env.bodiess[env.vars.indexOf(v)], env) :
        exports.applyEnv(env.nextEnv, v);
};
