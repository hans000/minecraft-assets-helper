/*
 * The MIT License (MIT)
 * Copyright (c) 2022 hans000
 */
const tokenTypes = [
    {
        regexp: /^\/\/.*/,
        create(value: string, position: Range): Token {
            return { type: 'inlinecomment', position, raw: value, value: value.substring(2) }
        }
    },
    {
        regexp: /^\/\*.*\*\//,
        create(value: string, position: Range): Token {
            return { type: 'multilinecomment', position, raw: value, value: value.slice(2, -2) }
        }
    },
    {
        regexp: /^\s+/,
        create(value: string, position: Range): Token {
            return { type: 'whitespace', position, raw: value, value: value }
        }
    },
    {
        regexp: /^"(?:[^"\\]|\\.)*"/,
        create(value: string, position: Range): Token {
            return { type: 'string', position, raw: value, value: JSON.parse(value) }
        }
    },
    {
        regexp: /^(true|false|null)/,
        create(value: string, position: Range): Token {
            return { type: 'literal', position, raw: value, value: value === 'null' ? undefined : value === 'true' }
        }
    },
    {
        regexp: /^(-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)/,
        create(value: string, position: Range): Token {
            return { type: 'number', position, raw: value, value: +value};
        }
    },
    {
        regexp: /^([{}\[\]:,])/,
        create(value: string, position: Range): Token {
            return { type: 'punctuation', position, raw: value, value: value};
        }
    }
]

export interface Position {
    lineNumber: number
    column: number
}

export interface Range {
    startLineNumber: number
    startColumn: number
    endLineNumber: number
    endColumn: number
}

export interface Token {
    type: string
    position?: Range
    raw?: string
    value?: string | boolean | number
}

export interface AST extends Token {
    parent?: AST
    children?: AST[]
    extractValues?: () => (AST[] | Array<{ key?: AST, value?: AST }>)
}

export function tokenize(json: string) {
    const position: Position = { lineNumber: 1, column: 1 }
    const tokens: Token[] = []
    let index = 0

    while (json.length > index) {
        let matchingTokenFound = false;
        const subjson = json.substring(index);
        for (let i = 0; i < tokenTypes.length; i++) {
            const tokenType = tokenTypes[i]
            let regex = tokenType.regexp
            const matchResult = regex.exec(subjson)
            if (matchResult) {
                const rawToken = matchResult[0]
                index += rawToken.length
                const numberOfNewLinesInToken = (rawToken.match(/\n/g) || '').length
                const startLine = position.lineNumber
                const startCol = position.column
                if (numberOfNewLinesInToken >= 1) {
                    position.lineNumber += numberOfNewLinesInToken
                    position.column = rawToken.length - rawToken.lastIndexOf("\n") + 1
                } else {
                    position.column += rawToken.length
                }
                tokens.push(tokenType.create(rawToken, {
                    startLineNumber: startLine,
                    startColumn: startCol,
                    endLineNumber: position.lineNumber,
                   endColumn: position.column
                }))
                matchingTokenFound = true
                break
            }
        }
        if (! matchingTokenFound) {
            break
        }
    }

    return tokens
}

export function getPathInObject(tokens: Token[]): [string[], boolean] {
    const stack: string[] = []
    const LIST_MARKER = "["

    let nextStringWillBeKey = true
    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i]
        if (token.type === "punctuation" && token.raw === "{") {
            nextStringWillBeKey = true
        } else if (token.type === "punctuation" && token.raw === "}") {
            stack.pop()
            nextStringWillBeKey = true
        } else if (token.type === "punctuation" && token.raw === "[") {
            stack.push(LIST_MARKER)
            nextStringWillBeKey = false
        } else if (token.type === "punctuation" && token.raw === "]") {
            stack.pop()
            nextStringWillBeKey = true
        } else if (token.type === "string") {
            if (nextStringWillBeKey) {
                nextStringWillBeKey = false
                stack.push(token.value as string)
            } else {
                nextStringWillBeKey = true
                stack.pop()
            }
        } else if (token.type === "literal" || token.type === "number") {
            nextStringWillBeKey = true
            stack.pop()
        }
    }

    const path = []
    for (let i = 0; i < stack.length; i++) {
        if (stack[i] !== LIST_MARKER) {
            path.push(stack[i])
        }
    }

    return [path, !nextStringWillBeKey]
}

export function findAtPosition(ast: AST, position: Position): AST | undefined {
    function inRange(position: Position, range: Range) {
        if (position.lineNumber < range.startLineNumber || position.lineNumber > range.endLineNumber) {
            return false
        }
        if (position.lineNumber === range.startLineNumber && position.column < range.startColumn) {
            return false
        }
        if (position.lineNumber === range.endLineNumber && position.column > range.endColumn) {
            return false
        }
        return true
    }

    if (inRange(position, ast.position!)) {
        if (ast.type === "Object" || ast.type === "Array") {
            for (let i = 0; i < ast.children!.length; i++) {
                const result = findAtPosition(ast.children![i], position)
                if (result !== undefined) {
                    return result
                }
            }
        } else {
            return ast
        }
    }
}

export function parse(tokens: Token[]): AST {
    return parseTokens(tokens, 0)![1]
}

function parseTokens(tokens: Token[], current: number) {
    current = current || 0
    const token = tokens[current]
    if (token.type === "inlinecomment") {
        return parseInlineComment(tokens, current)
    } else if (token.type === "multilinecomment") {
        return parseMultilineComment(tokens, current)
    } else if (token.type === "whitespace") {
        return parseWhitespace(tokens, current)
    } else if (token.type === "string") {
        return parseString(tokens, current)
    } else if (token.type === "literal") {
        return parseLiteral(tokens, current)
    } else if (token.type === "number") {
        return parseNumber(tokens, current)
    } else if (token.type === "punctuation") {
        if (token.raw === "{") {
            return parseObject(tokens, current)
        } else if (token.raw === "[") {
            return parseArray(tokens, current)
        } else if (token.raw === ":" || token.raw === ",") {
            return parseToken(tokens, current)
        }
    } else {
        console.error("Unknown token: ", token)
    }
}

function parseInlineComment(tokens: Token[], current: number): [number, AST] {
    return [current + 1, { type: "InlineComment", raw: tokens[current].raw, position: tokens[current].position }];
}

function parseMultilineComment(tokens: Token[], current: number): [number, AST] {
    return [current + 1, {type: "MultilineComment", raw: tokens[current].raw, position: tokens[current].position}];
}

function parseString(tokens: Token[], current: number): [number, AST] {
    return [current + 1, {
        type: "StringLiteral",
        raw: tokens[current].raw,
        value: tokens[current].value,
        position: tokens[current].position
    }];
}

function parseNumber(tokens: Token[], current: number): [number, AST] {
    return [current + 1, {
        type: "NumberLiteral",
        raw: tokens[current].raw,
        value: tokens[current].value,
        position: tokens[current].position
    }];
}

function parseLiteral(tokens: Token[], current: number): [number, AST] {
    return [current + 1, {
        type: "LiteralLiteral",
        raw: tokens[current].raw,
        value: tokens[current].value,
        position: tokens[current].position
    }];
}

function parseWhitespace(tokens: Token[], current: number): [number, AST] {
    return [current + 1, {
        type: "Whitespace",
        raw: tokens[current].raw,
        value: tokens[current].value,
        position: tokens[current].position
    }];
}

function parseToken(tokens: Token[], current: number): [number, AST] {
    return [
        current + 1,
        {
            type: "Punctuation",
            raw: tokens[current].raw,
            value: tokens[current].raw,
            position: tokens[current].position
        }
    ]
}

function parseObject(tokens: Token[], current: number): [number, AST] {
    let start = parseToken(tokens, current)[1]
    const children = [start]
    const result: AST = { type: "Object", children: children }
    start.parent = result

    let curr = current + 1
    while (tokens[curr].raw !== "}") {
        const a = parseTokens(tokens, curr)!
        curr = a[0]
        a[1].parent = result
        children.push(a[1])
    }
    children.push(parseToken(tokens, curr)[1])
    result.position = {
        startLineNumber: tokens[current].position!.startLineNumber,
        startColumn: tokens[current].position!.startColumn,
        endLineNumber: tokens[curr].position!.endLineNumber,
        endColumn: tokens[curr].position!.endColumn
    }
    Object.defineProperty(result, 'raw', {
        get() {
            let s = ""
            for (let i = 0; i < this.children.length; i++) {
                s += children[i].raw
            }
            return s
        }
    })
    result.extractValues = function() {
        const s = []
        let isKey = true
        let currentKey
        for (let i = 0; i < this.children!.length; i++) {
            if (["StringLiteral", "NumberLiteral", "LiteralLiteral", "Object", "Array"].includes(children[i].type)) {
                if (isKey) {
                    currentKey = children[i]
                } else {
                    s.push({ key: currentKey, value: children[i] })
                }
                isKey = !isKey
            }
        }
        return s
    }
    return [curr + 1, result]
}

function parseArray(tokens: Token[], current: number): [number, AST] {
    let startToken = parseToken(tokens, current)[1]
    const children = [startToken]
    const result: AST = { type: "Array", children: children }
    startToken.parent = result
    let curr = current + 1
    while (tokens[curr].raw !== "]") {
        const indexAndChild = parseTokens(tokens, curr)
        curr = indexAndChild![0]
        const child = indexAndChild![1]
        child.parent = result
        children.push(child)
    }
    let endToken = parseToken(tokens, curr)[1]
    endToken.parent = result
    children.push(endToken)
    result.position = {
        startLineNumber: tokens[current].position!.startLineNumber,
        startColumn: tokens[current].position!.startColumn,
        endLineNumber: tokens[curr].position!.endLineNumber,
        endColumn: tokens[curr].position!.endColumn
    }
    Object.defineProperty(result, 'raw', {
        get() {
            let s = ""
            for (let i = 0; i < this.children.length; i++) {
                s += children[i].raw
            }
            return s
        }
    })
    result.extractValues = function () {
        const s = []
        for (let i = 0; i < this.children!.length; i++) {
            if (["StringLiteral", "NumberLiteral", "LiteralLiteral", "Object", "Array"].includes(children[i].type)) {
                s.push(children[i])
            }
        }
        return s
    }
    return [curr + 1, result]
}

export function getPathInParent(ast: AST) {
    const path = []
    let root = ast

    while (root.parent) {
        path.unshift(getKeyInParent(root))
        root = root.parent
    }
    return path
}

export function getKeyInParent(ast: AST)  {
    let parent = ast.parent
    if (! parent) {
        return
    }

    if (parent.type === "Array") {
        const values = parent.extractValues!()
        for (let i = 0; i < values.length; i++) {
            if(values[i] === ast){
                return i
            }
        }
    } else if (parent.type === "Object") {
        const values = parent.extractValues!() as Array<{ key: AST, value: AST }>
        for (let i = 0; i < values.length; i++) {
            if(values[i].value === ast){
                return values[i].key.value
            }
        }
    } else {
        throw new Error("invalid parent.type " + parent.type)
    }
}

export function getNodesByPath(ast: AST, path: Array<{ type: string, key: string} | string>) {
    function getNodesByKey(ast: AST, key: { type: string, key: string} | string | undefined) {
        const values = ast.extractValues!() as Array<{ key: AST, value: AST }>
        return values.filter(node => {
            if (typeof key === 'object') {
                return (
                    key.type === node.value.type
                        ? key.key === '*'
                        ? true
                        : node.key.value === key.key
                        : false
                )
            }
            return key === '*'
                ? true
                : node.key.value === key
        })
            .map(node => ast.type === 'Array' ? node as any as AST : node.value)
    }
    
    const p = [...path]
    let key: { type: string, key: string} | string | undefined = ''
    let root = [ast]
    while (key = p.shift()) {
        root = root.map(ast => getNodesByKey(ast, key)).flat()
    }

    return root
}