import { Graph } from "graphlib";
import dot = require("graphlib-dot");
import { length, map, range, zipWith } from "ramda";
import {
    AtomicExp, Exp, IfExp, Parsed, VarDecl, isAtomicExp, DefineExp, AppExp, ProcExp,
    isAppExp, isDefineExp, isExp, isIfExp, isProcExp, parse, unparse } from "./L4-ast";
import { safeF2, safeFL, safeF } from "./error";
import {persistentEnv, Box, makeBox, unbox, setBox, frameVals, frameVars} from "./L4-env-box"
import {evalParse} from "./L4-eval-box"
import { Closure, isClosure } from "./L4-value-box";

const generateId = () => '_' + Math.random().toString(36).substr(2, 9);
export type ClosureId = string;

let ClosureIdCounter: Box<number> = makeBox(0);
const generateEnvId = (): ClosureId => {
   let currentId = unbox(ClosureIdCounter);
   setBox(ClosureIdCounter, currentId + 1);
   return "B" + currentId;
}

interface Tree {
    tag: "Tree",
    rootId: string,
    graph: Graph, 
}
export const isTree = (x: any): x is Tree => x.tag === "Tree";

const makeLeaf = (label: string, shape?: string, headId?: string): Tree => {
    let graph = new Graph();

    if (headId === undefined)
        headId = generateId();

    if (shape === undefined)
        shape = 'record';

    graph.setNode(headId, { label, shape});
    return { tag: "Tree", rootId: headId, graph };
}


const makeTree = (label: string, nodes: Tree[], edgesLabels: string[], shape?: string, headId?: string): Tree => {
    let graph = new Graph();

    let headId1: string;
    let shape1: string
    
    if (headId === undefined)
        headId1 = generateId();
    else 
        headId1 = headId

    if (shape === undefined)
        shape1 = 'record';
    else 
        shape1 = shape

    graph.setNode(headId1, { label, shape1});
    zipWith(
        (t, edgeLabel) => {
            map(n => graph.setNode(n, t.graph.node(n)), t.graph.nodes());
            map(e => graph.setEdge(e.v, e.w, t.graph.edge(e)), t.graph.edges());
            graph.setEdge(headId1, t.rootId, {label: edgeLabel});
        },
        nodes,
        edgesLabels
    )
    return { tag: "Tree", rootId: headId1, graph };
}

const makeClosureStr = (exp: Closure): string[] => {
    let params: string[] = exp.params.map((v) => v.var);
    let paramsStr: string = "p:" + params.join(", ") + "\\l|";
    let body: string[] = exp.body.map((x) => unparse(x));
    let bodyStr: string = body.join(" ") + "\\l|";
    let closureSymb: string = '<0>\u25EF\u25EF\\l|';
    let label: string = '{' + closureSymb + paramsStr + " " + bodyStr + '}';
    let shape: string = 'record';
    let color: string = 'white';
    return [label, shape, color]
}
// label="{<0>◯◯\l|p:x,y\l| b: (+ x y)\l}",shape=record,color=white
// [ '{<0>◯◯\\l|p:x, y\\l| (+ x y)\\l|}', 'record', 'white' ]
// const astToDot = (ast: Tree): string => dot.write(ast.graph);

// const expToTree = (exp: string) =>
//     safeF(astToDot)(safeF(makeAST)(parse(exp)));

// export const makeAST = (exp: Parsed): Tree | Error => {return makeLeaf("Hi", "record")}
    // fill this!
    // You may add functions if you like

// const varToStr = ()


export const drawEnvDiagram = (pEnv: {}): Tree | Error => {
    let visitedEnvs: string[] = []
    let envs = Object.keys(pEnv).sort()
    let lastEnv = envs[-1];

    // console.log(JSON.stringify(persistentEnv));
    // console.log(JSON.stringify(envs));
    // console.log(JSON.stringify(persistentEnv['GE'].frame[0].fbindings[0].val[0].body));
    // console.log(JSON.stringify(persistentEnv['GE']));
    console.log(JSON.stringify(frameVars(persistentEnv['GE'].frame[0])));
    console.log(JSON.stringify(frameVals(persistentEnv['GE'].frame[0])));
    
    // console.log(unparse(persistentEnv['GE'].frame[0].fbindings[0].val[0].body[0]));

    // console.log(lastEnv);    
    // console.log(envs.sort());
    // console.log(pEnv['E0'].frame.fbindings);

    // let valss = pEnv['E0'].frame.fbindings.map((binding) => binding.var + ':' + binding.val[0].toString() + '\\l|')
    // let vals1 = valss.join('').slice(0, -1)
    // let vals2 = "{" + envs[0] + '|' + vals1 + "}"
    // console.log(vals2);
    // console.log(safeF(astToDot)(makeLeaf(vals2, "Mrecord", envs[0])));
    return makeLeaf('a')
}

// let s: string = 'a'
// safeF(drawEnvDiagram)(safeF(evalParse)(s));

// evalParse('(L4 (define fact(lambda (n)(if (= n 0) 1 (* n (fact (- n 1)))))) (fact 4))')
// evalParse('(L4 ((lambda(x) (+ 2 x)) 2))')

// console.log(JSON.stringify(persistentEnv, null, 4));
// let clo = evalParse('(L4 (define fact(lambda (n)(if (= n 0) 1 (* n (fact (- n 1)))))))')
// if(isClosure(clo))
//     console.log(makeClosureStr(clo))

// console.log(JSON.stringify(evalParse('(L4 (define fact(lambda (n)(if (= n 0) 1 (* n (fact (- n 1)))))) (fact 4))')))
console.log(JSON.stringify(evalParse('(L4 (define func (lambda(x) (+ 2 x))) (func 2))')))
drawEnvDiagram(persistentEnv)

// console.log('<0>\u25EF\u25EF\\l|')
// Tests. Please uncomment
// const p1 = "(define x 4)";
// console.log(expToTree(p1));

// const p2 = "(define y (+ x 4))";
// console.log(expToTree(p2));

// const p3 = "(if #t (+ x 4) 6)";
// console.log(expToTree(p3));

// const p4 = "(lambda (x y) x)";
// console.log(expToTree(p4));

type BodyId = string;  
let bodyIdCounter: Box<number> = makeBox(0);

const generateBodyId = (): BodyId => {
   let currentId = unbox(bodyIdCounter);
   setBox(bodyIdCounter, currentId + 1);
   return "B" + currentId;
}