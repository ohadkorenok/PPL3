import {Graph} from "graphlib";
import dot = require('graphlib-dot');
import {length, map, range, zipWith} from "ramda";
import {
    AtomicExp,
    Exp,
    IfExp,
    Parsed,
    VarDecl,
    isAtomicExp,
    DefineExp,
    AppExp,
    ProcExp,
    isAppExp,
    isDefineExp,
    isExp,
    isIfExp,
    isProcExp,
    parse,
    unparse,
    CExp,
    isStrExp,
    isPrimOp,
    isVarRef,
    isLitExp,
    isLetExp, Binding, isProgram
} from "./L4-ast";
import {safeF2, safeFL, safeF} from "./error";
import {isCompoundSExp, isEmptySExp, SExp} from "./L4-value";

const generateId = () => '_' + Math.random().toString(36).substr(2, 9);

interface Tree {
    tag: "Tree",
    rootId: string,
    graph: Graph,
}

export const isTree = (x: any): x is Tree => x.tag === "Tree";

const makeLeaf = (label: string): Tree => {
    let graph = new Graph();
    const headId = generateId();
    graph.setNode(headId, {label, shape: "record"});
    return {tag: "Tree", rootId: headId, graph};
}


const makeTree = (label: string, nodes: Tree[], edgesLabels: string[]): Tree => {
    let graph = new Graph();
    const headId = generateId();
    graph.setNode(headId, {label, shape: "record"});
    zipWith(
        (t, edgeLabel) => {
            map(n => graph.setNode(n, t.graph.node(n)), t.graph.nodes());
            map(e => graph.setEdge(e.v, e.w, t.graph.edge(e)), t.graph.edges());
            graph.setEdge(headId, t.rootId, {label: edgeLabel});
        },
        nodes,
        edgesLabels
    )
    return {tag: "Tree", rootId: headId, graph};
}

const astToDot = (ast: Tree): string => dot.write(ast.graph);

const expToTree = (exp: string) =>
    safeF(astToDot)(safeF(makeAST)(parse(exp)));

export const makeAST = (exp: Parsed): Tree | Error => {
    return isDefineExp(exp) ? makeTree(exp.tag, [makeASTVarDecl(exp.var), makeASTCexp(exp.val)], ['var', 'val']) :
        isProgram(exp) ? makeTree(exp.tag, [].concat(map(makeAST,exp.exps)), [].concat(map(function (x: Exp) {
            return exp.exps.indexOf(x).toString()
            },exp.exps))) :
            makeASTCexp(exp);
};


// fill this!
// You may add functions if you like
const makeASTVarDecl = (exp: VarDecl): Tree => {
    return makeTree(exp.tag, [makeLeaf(exp.var)], ['var']);
};

const makeAstSexp = (exp: SExp): Tree => {
    return isEmptySExp ? makeLeaf("EmptySExpression") :
        isAtomicExp(exp) ? makeAstAtomicExp(exp)
            : isCompoundSExp(exp) ? makeTree(exp.tag, [].concat(map(makeAstSexp, [exp.val1, exp.val2])), ["val1", "val2"])
            : makeLeaf("Error - undefined expression");

};

const makeBindingTree = (x: Binding): Tree => {
    return makeTree(x.tag, [makeASTVarDecl(x.var), makeASTCexp(x.val)], ["var", "val"]);
};

const makeASTCexp = (exp: CExp): Tree => {
    return isAppExp(exp) ? makeTree(exp.tag,
        [makeASTCexp(exp.rator)].concat([makeTree(":", [].concat(map(makeASTCexp, exp.rands)), [].concat(map(function (x: CExp): string {
            return exp.rands.indexOf(x).toString()
        }, exp.rands)))])
        , ["rator", "rands"]) :
        isIfExp(exp) ? makeTree(exp.tag, [].concat(map(makeASTCexp, [exp.test, exp.then, exp.alt])), ["test", "then", "alt"]) :

            isProcExp(exp) ?

                makeTree(exp.tag, [makeTree(":", [].concat(map(makeASTVarDecl, exp.args)), [].concat(map(function (x: VarDecl): string {
                    return exp.args.indexOf(x).toString()
                }, exp.args))),
                    makeTree(":", [].concat(map(makeASTCexp, exp.body)), [].concat(map(function (x: CExp): string {
                        return exp.body.indexOf(x).toString()
                    }, exp.body)))], ["params", "body"])

                :
                isAtomicExp(exp) ? makeAstAtomicExp(exp) :
                    isLitExp(exp) ? makeTree(exp.tag, [makeAstSexp(exp.val)], ["val"]) :
                        isLetExp(exp) ?
                            makeTree(exp.tag, [makeTree(":", map(
                                makeBindingTree, exp.bindings),

                                [].concat(map(function (x: Binding): string {
                                    return exp.bindings.indexOf(x).toString()
                                }, exp.bindings))),
                                makeTree(":", [].concat(map(makeASTCexp, exp.body)), [].concat(map(function (x: CExp): string {
                                    return exp.body.indexOf(x).toString()
                                }, exp.body)))], ["params", "body"]) :

                            makeLeaf("Cexp");

};

const makeAstAtomicExp = (exp: AtomicExp): Tree => {
    return makeTree(exp.tag, [isPrimOp(exp) ? makeLeaf(exp.op) : isVarRef(exp) ? makeLeaf(exp.var) : makeLeaf(exp.val.toString())], ["val"]);
};

// Tests. Please uncomment
// const p1 = "(L4 (define x 4))";
// console.log(expToTree(p1));

// const p2 = "(define y (+ x 4))";
// console.log(expToTree(p2));

// const p3 = "(L4 (if #t (+ x 4) 6))";
// console.log(expToTree(p3));

// const p4 = "(L4(let ((x 1) (y 2)) (+ x y)) (if #t (+ x 4) 6))";
// console.log(expToTree(p4));