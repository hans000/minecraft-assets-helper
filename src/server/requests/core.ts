/*
 * The MIT License (MIT)
 * Copyright (c) 2023 hans000
 */
import { TextDocument } from "vscode-languageserver-textdocument";
import { Position, WorkspaceFolder, Location, Range } from "vscode-languageserver";
import { AST, findAtPosition, getPathInParent, parse, tokenize } from "../utils/json-ast";
import { parsePath } from "../utils";

export class PackFile {
    private node: AST | undefined
    public namespace = ''
    public filename = ''
    constructor(node: AST | undefined) {
        if (node?.value) {
            const [namespace, filename] = parsePath(node.value as string)!
            this.node = node
            this.filename = filename
            this.namespace = namespace
        }
    }

    public isValid() {
        return this.namespace !== '' && this.filename !== ''
    }

    public getKeys() {
        return getPathInParent(this.node!) as string[]
    }
}

export class BaseRequest {
    protected textDocument: TextDocument
    protected position: Position
    protected folders: WorkspaceFolder[]

    constructor(textDocument: TextDocument, position: Position, folders: WorkspaceFolder[]) {
        this.textDocument = textDocument
        this.position = position
        this.folders = folders
    }

    protected createLocation(uri: string) {
        return Location.create(uri, Range.create(Position.create(0, 0), Position.create(0, 0)))
    }

    protected getPositionNode() {
        const ast = this.getAst()
        
        if (! ast) {
            return
        }

        const node = findAtPosition(ast, { lineNumber: this.position.line + 1, column: this.position.character + 1 })
        return node
    }

    protected getAst() {
        const text = this.textDocument.getText()
    
        if (! text.trim().length) {
            return
        }
    
        try {
            const tokens = tokenize(text)
            const ast = parse(tokens)
            return ast
        } catch (error) {}
    }
}