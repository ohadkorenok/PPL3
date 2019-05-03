"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var graphlib_1 = require("graphlib");
var dot = require("graphlib-dot");
var ramda_1 = require("ramda");
var L4_ast_1 = require("./L4-ast");
var error_1 = require("./error");
var L4_value_1 = require("./L4-value");
var generateId = function () { return '_' + Math.random().toString(36).substr(2, 9); };
exports.isTree = function (x) { return x.tag === "Tree"; };
var makeLeaf = function (label) {
    var graph = new graphlib_1.Graph();
    var headId = generateId();
    graph.setNode(headId, { label: label, shape: "record" });
    return { tag: "Tree", rootId: headId, graph: graph };
};
var makeTree = function (label, nodes, edgesLabels) {
    var graph = new graphlib_1.Graph();
    var headId = generateId();
    graph.setNode(headId, { label: label, shape: "record" });
    ramda_1.zipWith(function (t, edgeLabel) {
        ramda_1.map(function (n) { return graph.setNode(n, t.graph.node(n)); }, t.graph.nodes());
        ramda_1.map(function (e) { return graph.setEdge(e.v, e.w, t.graph.edge(e)); }, t.graph.edges());
        graph.setEdge(headId, t.rootId, { label: edgeLabel });
    }, nodes, edgesLabels);
    return { tag: "Tree", rootId: headId, graph: graph };
};
var astToDot = function (ast) { return dot.write(ast.graph); };
var expToTree = function (exp) {
    return error_1.safeF(astToDot)(error_1.safeF(exports.makeAST)(L4_ast_1.parse(exp)));
};
exports.makeAST = function (exp) {
    return L4_ast_1.isDefineExp(exp) ? makeTree(exp.tag, [makeASTVarDecl(exp.var), makeASTCexp(exp.val)], ['var', 'val']) :
        L4_ast_1.isProgram(exp) ? Error("not now") :
            makeASTCexp(exp);
};
// fill this!
// You may add functions if you like
var makeASTVarDecl = function (exp) {
    return makeTree(exp.tag, [makeLeaf(exp.var)], ['var']);
};
var makeAstSexp = function (exp) {
    return L4_value_1.isEmptySExp ? makeLeaf("EmptySExpression") :
        L4_ast_1.isAtomicExp(exp) ? makeAstAtomicExp(exp)
            : L4_value_1.isCompoundSExp(exp) ? makeTree(exp.tag, [].concat(ramda_1.map(makeAstSexp, [exp.val1, exp.val2])), ["val1", "val2"])
                : makeLeaf("Error - undefined expression");
};
var makeBindingTree = function (x) {
    // console.log(astToDot( makeTree(x.tag, [makeASTVarDecl(x.var), makeASTCexp(x.val)], ["var","val"])));
    return makeTree(x.tag, [makeASTVarDecl(x.var), makeASTCexp(x.val)], ["var", "val"]);
};
var makeASTCexp = function (exp) {
    return L4_ast_1.isAppExp(exp) ? makeTree(exp.tag, [makeASTCexp(exp.rator)].concat([makeTree(":", [].concat(ramda_1.map(makeASTCexp, exp.rands)), [].concat(ramda_1.map(function (x) {
            return exp.rands.indexOf(x).toString();
        }, exp.rands)))]), ["rator", "rands"]) :
        L4_ast_1.isIfExp(exp) ? makeTree(exp.tag, [].concat(ramda_1.map(makeASTCexp, [exp.test, exp.then, exp.alt])), ["test", "then", "alt"]) :
            L4_ast_1.isProcExp(exp) ?
                makeTree(exp.tag, [makeTree(":", [].concat(ramda_1.map(makeASTVarDecl, exp.args)), [].concat(ramda_1.map(function (x) {
                        return exp.args.indexOf(x).toString();
                    }, exp.args))),
                    makeTree(":", [].concat(ramda_1.map(makeASTCexp, exp.body)), [].concat(ramda_1.map(function (x) {
                        return exp.body.indexOf(x).toString();
                    }, exp.body)))], ["params", "body"])
                :
                    L4_ast_1.isAtomicExp(exp) ? makeAstAtomicExp(exp) :
                        L4_ast_1.isLitExp(exp) ? makeTree(exp.tag, [makeAstSexp(exp.val)], ["val"]) :
                            L4_ast_1.isLetExp(exp) ?
                                makeTree(exp.tag, [makeTree(":", ramda_1.map(
                                    // function (x: Binding) : Tree {
                                    // return makeTree(x.tag, [makeASTVarDecl(x.var) ,makeASTCexp(x.val)], ["var, val"])
                                    // },
                                    makeBindingTree, exp.bindings), [].concat(ramda_1.map(function (x) {
                                        return exp.bindings.indexOf(x).toString();
                                    }, exp.bindings))),
                                    makeTree(":", [].concat(ramda_1.map(makeASTCexp, exp.body)), [].concat(ramda_1.map(function (x) {
                                        return exp.body.indexOf(x).toString();
                                    }, exp.body)))], ["params", "body"]) :
                                //
                                // makeTree(exp.tag, [
                                //     makeTree(":", [].concat(map(function (x: Binding) : Tree {
                                //         return makeTree(x.tag, [makeASTVarDecl(x.var), makeASTCexp(x.val)], ["var, val"]);
                                //     }, exp.bindings)), [].concat(map(function (x: Binding): string {
                                //         return exp.bindings.indexOf(x).toString()
                                //     }, exp.bindings)))
                                //
                                // , makeTree("body", map(makeASTCexp, exp.body), [].concat(map(function (x: CExp): string {
                                //     return exp.body.indexOf(x).toString()
                                // }, exp.body)))], ["bindings", "body"]) :
                                makeLeaf("Cexp");
};
var makeAstAtomicExp = function (exp) {
    return makeTree(exp.tag, [L4_ast_1.isPrimOp(exp) ? makeLeaf(exp.op) : L4_ast_1.isVarRef(exp) ? makeLeaf(exp.var) : makeLeaf(exp.val.toString())], ["val"]);
};
// Tests. Please uncomment
// const p1 = "(define x 4)";
// console.log(expToTree(p1));
// const p2 = "(define y (+ x 4))";
// console.log(expToTree(p2));
// const p3 = "(if #t (+ x 4) 6)";
// console.log(expToTree(p3));
var p4 = "(let ((x 1) (y 2)) (+ x y))";
console.log(expToTree(p4));
