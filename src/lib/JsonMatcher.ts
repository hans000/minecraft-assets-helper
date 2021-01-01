import * as vscode from 'vscode'
import * as path from 'path'
import { parseLineText } from '../utils'

export interface ICompletionContext {
    dirname: string;
    namespace: string;
    ext: string;
    range: vscode.Range;
}

export class JsonMatcher {
    protected static namespace = 'minecraft'
    protected range: vscode.Range
    protected lineText: string
    protected filename: string
    protected word: string
    protected json: string

    constructor(document: vscode.TextDocument, position: vscode.Position) {
        const line = document.lineAt(position);
        this.range = new vscode.Range(position, position)
        this.filename = document.fileName
        this.lineText = line.text.substring(0, position.character);
        this.word = document.getText(document.getWordRangeAtPosition(position))
        this.json = document.getText()
    }
}

export class JsonModelMatcher extends JsonMatcher {
    protected static readonly ext = '.json'
    protected static readonly path = 'models'

    constructor(document: vscode.TextDocument, position: vscode.Position) {
        super(document, position)
    }
    public getContext(): ICompletionContext | null {
        const match = /(.+)\\blockstates\\.+json$/.exec(this.filename)
        if(match && /"model"\s*?:/.test(this.lineText)) {
            const result = parseLineText(this.lineText, 'model')
            if (result) {
                const [namespace, segment] = result
                const dirname = path.join(match[1], JsonModelMatcher.path, segment)
                return {
                    dirname,
                    ext: JsonModelMatcher.ext,
                    namespace,
                    range: this.range,
                }
            }
        }
        return null
    }
}

export class JsonParentMatcher extends JsonMatcher {
    protected static readonly ext = '.json'
    protected static readonly path = 'models'

    constructor(document: vscode.TextDocument, position: vscode.Position) {
        super(document, position)
    }
    public getContext(): ICompletionContext | null {
        const match = /(.+)\\models\\(block|item).+json$/.exec(this.filename)
        if(match && new RegExp(`"parent"\\s*?:\\s*?[\\s\\S]*?${this.word.replace('/', '\\/')}[\\s\\S]*?\\}`, 'gm').test(this.json)) {
            const result = parseLineText(this.lineText)
            if (result) {
                const [namespace, segment] = result
                const dirname = path.join(match[1], JsonParentMatcher.path, segment)
                return {
                    dirname,
                    ext: JsonParentMatcher.ext,
                    namespace,
                    range: this.range,
                }
            }
        }
        return null
    }
}

export class JsonTextureMatcher extends JsonMatcher {
    protected static readonly ext = '.png'
    protected static readonly path = 'textures'

    constructor(document: vscode.TextDocument, position: vscode.Position) {
        super(document, position)
    }

    public getContext(): ICompletionContext | null {
        const match = /(.+)\\models\\(block|item).+json$/.exec(this.filename)
        if(match && new RegExp(`"textures"\\s*?:\\s*?\\{[\\s\\S]*?${this.word.replace('/', '\\/')}[\\s\\S]*?\\}`, 'gm').test(this.json)) {
            const result = parseLineText(this.lineText)
            if (result) {
                const [namespace, segment] = result
                const dirname = path.join(match[1], JsonTextureMatcher.path, segment)
                return {
                    dirname,
                    ext: JsonTextureMatcher.ext,
                    namespace,
                    range: this.range,
                }
            }
        }
        return null
    }
}