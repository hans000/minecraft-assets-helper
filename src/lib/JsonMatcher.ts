import * as vscode from 'vscode'
import * as path from 'path'
import { parsePath } from '../utils'

export interface ICompletionContext {
    dirname: string;
    namespace: string;
    ext: string;
    range: vscode.Range;
}

export class JsonMatcher {
    protected static namespace = 'minecraft'
    protected range: vscode.Range
    protected filename: string
    // protected word: string
    protected key: string = ''
    protected value: string = ''
    protected json: string

    constructor(document: vscode.TextDocument, position: vscode.Position) {
        this.json = document.getText()
        this.filename = document.fileName
        this.range = new vscode.Range(position, position)
        const text = document.getText(document.getWordRangeAtPosition(position, /(\S+)\s*:\s*(\S+)/))
        const m = /"(\S+)"\s*:\s*"(\S+)"/.exec(text)
        if (m) {
            this.key = m[1]
            this.value = m[2]
        }
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
        if(match && this.key === 'model') {
            const result = parsePath(this.value)
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
        if(match && this.key === 'parent') {
            const result = parsePath(this.value)
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
        if(match && new RegExp(`"textures"\\s*?:\\s*?\\{[\\s\\S]*?${this.value.replace('/', '\\/')}[\\s\\S]*?\\}`, 'gm').test(this.json)) {
            const result = parsePath(this.value)
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