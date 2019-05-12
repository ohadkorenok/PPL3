// L4-eval-box.ts
// L4 with mutation (set!) and env-box model
// Direct evaluation of letrec with mutation, define supports mutual recursion.

import {map, reduce, filter, repeat, zipWith} from "ramda";
import {allT, first, rest, isBoolean, isEmpty, isNumber, isString} from "./list";
import {getErrorMessages, hasNoError, isError} from "./error";
import {
    isBoolExp, isCExp, isLitExp, isNumExp, isPrimOp, isStrExp, isVarRef, isSetExp,
    isAppExp, isDefineExp, isExp, isIfExp, isLetrecExp, isLetExp, isProcExp, isProgram,
    Binding, PrimOp, VarDecl, CExp, Exp, IfExp, LetrecExp, LetExp, Parsed, ProcExp, Program, SetExp,
    parse, unparse
} from "./L4-ast";
import {
    applyEnv,
    applyEnvBdg,
    globalEnvAddBinding,
    makeExtEnv,
    setFBinding,
    theGlobalEnv,
    Env,
    persistentEnv,
    frameVars,
    frameVals,
    isExtEnv,
    isGlobalEnv,
    unbox,
    Frame,
    Box,
    isFrame,
    FBinding,
    getFBindingVal, ExtEnv, makeFrame, generateBodyId
} from "./L4-env-box";
import {
    isEmptySExp, isSymbolSExp, isClosure, isCompoundSExp, makeClosure, makeCompoundSExp, Closure,
    CompoundSExp, EmptySExp, makeEmptySExp, Value
} from "./L4-value-box";
import {Graph} from "graphlib";
import dot = require("graphlib-dot");
// import {drawEnvDiagram} from "./graph-ast (2)";

// ========================================================
// Eval functions

const applicativeEval = (exp: CExp | Error, env: Env): Value | Error =>
    isError(exp) ? exp :
        isNumExp(exp) ? exp.val :
            isBoolExp(exp) ? exp.val :
                isStrExp(exp) ? exp.val :
                    isPrimOp(exp) ? exp :
                        isVarRef(exp) ? applyEnv(env, exp.var) :
                            isLitExp(exp) ? exp.val :
                                isIfExp(exp) ? evalIf(exp, env) :
                                    isProcExp(exp) ? evalProc(exp, env) :
                                        isLetExp(exp) ? evalLet(exp, env) :
                                            isLetrecExp(exp) ? evalLetrec(exp, env) :
                                                isSetExp(exp) ? evalSet(exp, env) :
                                                    isAppExp(exp) ? applyProcedure(applicativeEval(exp.rator, env),
                                                        map((rand: CExp) => applicativeEval(rand, env),
                                                            exp.rands), env) :
                                                        Error(`Bad L4 AST ${exp}`);

export const isTrueValue = (x: Value | Error): boolean | Error =>
    isError(x) ? x :
        !(x === false);

const evalIf = (exp: IfExp, env: Env): Value | Error => {
    const test = applicativeEval(exp.test, env);
    return isError(test) ? test :
        isTrueValue(test) ? applicativeEval(exp.then, env) :
            applicativeEval(exp.alt, env);
};

const evalProc = (exp: ProcExp, env: Env): Closure =>
    makeClosure(exp.args, exp.body, env);

// @Pre: none of the args is an Error (checked in applyProcedure)
// KEY: This procedure does NOT have an env parameter.
//      Instead we use the env of the closure.
const applyProcedure = (proc: Value | Error, args: Array<Value | Error>, callingEnv: Env): Value | Error =>
    isError(proc) ? proc :
        !hasNoError(args) ? Error(`Bad argument: ${getErrorMessages(args)}`) :
            isPrimOp(proc) ? applyPrimitive(proc, args) :
                isClosure(proc) ? applyClosure(proc, args, callingEnv) :
                    Error(`Bad procedure ${JSON.stringify(proc)}`);

const applyClosure = (proc: Closure, args: Value[], callingEnv: Env): Value | Error => {
    let vars = map((v: VarDecl) => v.var, proc.params);
    return evalExps(proc.body, makeExtEnv(vars, args, proc.env, callingEnv));
};

// Evaluate a sequence of expressions (in a program)
export const evalExps = (exps: Exp[], env: Env): Value | Error =>
    isEmpty(exps) ? Error("Empty program") :
        isDefineExp(first(exps)) ? evalDefineExps(first(exps), rest(exps)) :
            evalCExps(first(exps), rest(exps), env);

const evalCExps = (exp1: Exp, exps: Exp[], env: Env): Value | Error =>
    isCExp(exp1) && isEmpty(exps) ? applicativeEval(exp1, env) :
        isCExp(exp1) ? (isError(applicativeEval(exp1, env)) ? Error("error") :
            evalExps(exps, env)) :
            Error("Never");

// Eval a sequence of expressions when the first exp is a Define.
// Compute the rhs of the define, extend the env with the new binding
// then compute the rest of the exps in the new env.
// L4-BOX @@
// define always updates theGlobalEnv
// We also only expect defineExps at the top level.
const evalDefineExps = (def: Exp, exps: Exp[]): Value | Error => {
    if (isDefineExp(def)) {
        let rhs = applicativeEval(def.val, theGlobalEnv);
        if (isError(rhs))
            return rhs;
        else {
            globalEnvAddBinding(def.var.var, rhs);
            return evalExps(exps, theGlobalEnv);
        }
    } else {
        return Error("unexpected " + def);
    }
}

// Main program
// L4-BOX @@ Use GE instead of empty-env
export const evalProgram = (program: Program): Value | Error =>
    evalExps(program.exps, theGlobalEnv);

export const evalParse = (s: string): Value | Error => {
    let ast: Parsed | Error = parse(s);
    if (isProgram(ast)) {
        return evalProgram(ast);
    } else if (isExp(ast)) {
        return evalExps([ast], theGlobalEnv);
    } else {
        return ast;
    }
}

// LET: Direct evaluation rule without syntax expansion
// compute the values, extend the env, eval the body.
const evalLet = (exp: LetExp, env: Env): Value | Error => {
    const closure: Closure = makeClosure(map((x) => x.var, exp.bindings), exp.body, env);
    const vals = map((v: CExp) => applicativeEval(v, env), map((b: Binding) => b.val, exp.bindings));
    const vars = map((b: Binding) => b.var.var, exp.bindings);
    if (hasNoError(vals)) {
        return applyClosure(closure, vals, env);
        // return evalExps(exp.body, makeExtEnv(vars, vals, env));
    } else {
        return Error(getErrorMessages(vals));
    }
};

// @@ L4-EVAL-BOX 
// LETREC: Direct evaluation rule without syntax expansion
// 1. extend the env with vars initialized to void (temporary value)
// 2. compute the vals in the new extended env
// 3. update the bindings of the vars to the computed vals
// 4. compute body in extended env
const evalLetrec = (exp: LetrecExp, env: Env): Value | Error => {
    const vars = map((b: Binding) => b.var.var, exp.bindings);
    const vals = map((b: Binding) => b.val, exp.bindings);
    const extEnv = makeExtEnv(vars, repeat(undefined, vars.length), env);
    // @@ Compute the vals in the extended env
    const cvals = map((v: CExp) => applicativeEval(v, extEnv), vals);
    if (hasNoError(cvals)) {
        // Bind vars in extEnv to the new values
        zipWith((bdg, cval) => setFBinding(bdg, cval), extEnv.frame.fbindings, cvals);
        return evalExps(exp.body, extEnv);
    } else {
        return Error(getErrorMessages(cvals));
    }
};

// L4-eval-box: Handling of mutation with set!
const evalSet = (exp: SetExp, env: Env): Value | Error => {
    const v = exp.var.var;
    const val = applicativeEval(exp.val, env);
    if (isError(val))
        return val;
    else {
        const bdg = applyEnvBdg(env, v);
        if (isError(bdg)) {
            return Error(`Var not found ${v}`)
        } else {
            setFBinding(bdg, val);
            return undefined;
        }
    }
};

// ========================================================
// Primitives

const zero: number = 0;
const one: number = 1;

// @Pre: none of the args is an Error (checked in applyProcedure)
// TODO: Add explicit type checking in all primitives
export const applyPrimitive = (proc: PrimOp, args: Value[]): Value | Error =>
    proc.op === "+" ? (allT(isNumber, args) ? reduce((x: number, y: number) => x + y, zero, args) : Error("+ expects numbers only")) :
        proc.op === "-" ? minusPrim(args) :
            proc.op === "*" ? (allT(isNumber, args) ? reduce((x: number, y: number) => x * y, one, args) : Error("* expects numbers only")) :
                proc.op === "/" ? divPrim(args) :
                    proc.op === ">" ? ((allT(isNumber, args) || allT(isString, args)) ? args[0] > args[1] : Error("> expects numbers or strings only")) :
                        proc.op === "<" ? ((allT(isNumber, args) || allT(isString, args)) ? args[0] < args[1] : Error("< expects numbers or strings only")) :
                            proc.op === "=" ? args[0] === args[1] :
                                proc.op === "not" ? !args[0] :
                                    proc.op === "and" ? isBoolean(args[0]) && isBoolean(args[1]) && args[0] && args[1] :
                                        proc.op === "or" ? isBoolean(args[0]) && isBoolean(args[1]) && (args[0] || args[1]) :
                                            proc.op === "eq?" ? eqPrim(args) :
                                                proc.op === "string=?" ? args[0] === args[1] :
                                                    proc.op === "cons" ? consPrim(args[0], args[1]) :
                                                        proc.op === "car" ? carPrim(args[0]) :
                                                            proc.op === "cdr" ? cdrPrim(args[0]) :
                                                                proc.op === "list" ? listPrim(args) :
                                                                    proc.op === "list?" ? isListPrim(args[0]) :
                                                                        proc.op === "pair?" ? isPairPrim(args[0]) :
                                                                            proc.op === "number?" ? typeof (args[0]) === 'number' :
                                                                                proc.op === "boolean?" ? typeof (args[0]) === 'boolean' :
                                                                                    proc.op === "symbol?" ? isSymbolSExp(args[0]) :
                                                                                        proc.op === "string?" ? isString(args[0]) :
                                                                                            Error("Bad primitive op " + proc.op);

const minusPrim = (args: Value[]): number | Error => {
    // TODO complete
    let x = args[0], y = args[1];
    if (isNumber(x) && isNumber(y)) {
        return x - y;
    } else {
        return Error(`Type error: - expects numbers ${args}`)
    }
}

const divPrim = (args: Value[]): number | Error => {
    // TODO complete
    let x = args[0], y = args[1];
    if (isNumber(x) && isNumber(y)) {
        return x / y;
    } else {
        return Error(`Type error: / expects numbers ${args}`)
    }
}

const eqPrim = (args: Value[]): boolean | Error => {
    let x = args[0], y = args[1];
    if (isSymbolSExp(x) && isSymbolSExp(y)) {
        return x.val === y.val;
    } else if (isEmptySExp(x) && isEmptySExp(y)) {
        return true;
    } else if (isNumber(x) && isNumber(y)) {
        return x === y;
    } else if (isString(x) && isString(y)) {
        return x === y;
    } else if (isBoolean(x) && isBoolean(y)) {
        return x === y;
    } else {
        return false;
    }
}

const carPrim = (v: Value): Value | Error =>
    isCompoundSExp(v) ? v.val1 :
        Error(`Car: param is not compound ${v}`);

const cdrPrim = (v: Value): Value | Error =>
    isCompoundSExp(v) ? v.val2 :
        Error(`Cdr: param is not compound ${v}`);

const consPrim = (v1: Value, v2: Value): CompoundSExp =>
    makeCompoundSExp(v1, v2);

export const listPrim = (vals: Value[]): EmptySExp | CompoundSExp =>
    vals.length === 0 ? makeEmptySExp() :
        makeCompoundSExp(first(vals), listPrim(rest(vals)))

const isListPrim = (v: Value): boolean =>
    isEmptySExp(v) || isCompoundSExp(v);

const isPairPrim = (v: Value): boolean =>
    isCompoundSExp(v);

interface Tree {
    tag: "Tree",
    rootId: string,
    graph: Graph,
}

const makeClosureStr = (exp: Closure): string[] => {
    let params: string[] = exp.params.map((v) => v.var);
    let paramsStr: string = "p:" + params.join(", ") + "\\l|";
    let body: string[] = exp.body.map((x) => unparse(x));
    let bodyStr: string = ("b: ") + body.join(" ") + "\\l|";
    let closureSymb: string = '<0>\u25EF\u25EF\\l|';
    let label: string = '{' + closureSymb + paramsStr + " " + bodyStr + '}';
    let shape: string = 'record';
    let color: string = 'white';
    let bodyId: string = exp.bodyId;
    return [label, shape, color, bodyId]
};

export const isTree = (x: any): x is Tree => x.tag === "Tree";

//
export const drawEnvDiagram = (pEnv: {}): Tree | Error => {
    let envs = Object.keys(pEnv).sort();
    let realEnvs: Env[] = Object.values(pEnv);
    let graph = new Graph();
    map((x: Env) => {


        aggregateClosuresDefinedInEnv(pEnv[envToName(x)]).map((y: FBinding) => {
            let unboxxedValue = unbox(y.val);
            graph.setEdge(envToName(x)
                , typeof unboxxedValue !== 'undefined' && isClosure(unboxxedValue) ? unboxxedValue.bodyId : generateBodyId()
                , {tailport: y.var, headport: '0'})
            graph.setEdge(typeof unboxxedValue !== 'undefined' && isClosure(unboxxedValue) ? unboxxedValue.bodyId : generateBodyId(), envToName(x), {headport: '0'});
        });
        let bindingVals = map((x: FBinding) => getFBindingVal(x), aggregateClosuresDefinedInEnv(pEnv[envToName(x)]));
        let closureStrArray = bindingVals.filter((x: Value) => isClosure(x)).map((x: Value) => {
            return isClosure(x) ? makeClosureStr(x) : [];
        });
        map((x: string[]) => graph.setNode(x[3], {label: x[0], shape: x[1], color: x[2]}), closureStrArray);
    }, realEnvs);

    map((envName: string) => graph.setNode(envName, envToStr(pEnv[envName])), envs);
    map((x: ExtEnv) => graph.setEdge(x.id, isGlobalEnv(x.env) ? 'GE' : x.env.id), Object.values(pEnv).filter(isExtEnv, realEnvs));

    // Now lets create the dashed arrow
    // 1. go on all the callingEnvs in the envs
    // 2. create nodes with label and name
    // 3. set edges with style dashed
    map((env: ExtEnv) => {
            if (typeof env.callingEnv !== 'undefined' && !graph.hasNode(envToName(env.callingEnv) + "_link")) {
                graph.setNode(envToName(env.callingEnv) + "_link", envToPlainStr(env.callingEnv))
            }
        }
        , Object.values(pEnv).filter(isExtEnv, realEnvs));
    map((env: ExtEnv) => {
        if (typeof env.callingEnv !== 'undefined') {
            graph.setEdge(env.id, envToName(env.callingEnv) + "_link", envToStrDashed())
        }
    }, Object.values(pEnv).filter(isExtEnv, realEnvs));


    return {tag: "Tree", rootId: "BOO", graph};
};


const envToPlainStr = (env: Env) => {
    return {label: envToName(env), shape: "plaintext"};
}

const aggregateClosuresDefinedInEnv = (env: Env): FBinding[] => {
    return isGlobalEnv(env) ? env.frame[0].fbindings.filter((x: FBinding) => isClosure(unbox(x.val))) :
        env.frame.fbindings.filter((x: FBinding) => isClosure(unbox(x.val)));

};

const envToName = (env: Env): string => isGlobalEnv(env) ? 'GE' : env.id;

const envToStr = (env: Env) => {
    return {label: "{" + envToLabel(env) + "}", shape: "Mrecord"};
};

const envToStrDashed = () => {
    return {style: "dashed"};


};

const envToLabel = (env: Env): string => {
    return isGlobalEnv(env) ? envToName(env) + "|" + stringifyFrame(env.frame[0]) :
        envToName(env) + "|" + stringifyFrame(env.frame);
};
const stringifyFrame = (frame: Frame | Error): string => {
    return isError(frame) ? "ERR" :
        zipWith((oneVar: string, oneVal: Value) => isClosure(oneVal) ?
            "<" + oneVar + ">" + oneVar + ":\\l" : oneVar + ":" + oneVal, frameVars(frame), frameVals(frame)).join("\\l|") + "\\l"
};

export const evalParseDraw = (s: string): string | Error => {
    evalParse(s);
    let t1 = drawEnvDiagram(persistentEnv);
    return isTree(t1) ? dot.write(t1.graph) : Error("Problem brother");
};

const generateId = () => '_' + Math.random().toString(36).substr(2, 9);
console.log(evalParseDraw("(L4 (define z 4) (define foo (lambda (x y) (+ x y))) (foo 4 5))"));

