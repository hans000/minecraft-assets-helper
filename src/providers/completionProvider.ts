import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import { promisify } from 'util'
const readdirAsync = promisify(fs.readdir)
import { barename } from '../utils/index'

export default (document: vscode.TextDocument, position: vscode.Position) => {
    const line = document.lineAt(position);
    const lineText = line.text.substring(0, position.character);
    
    const stateMatch = /(.+)\\blockstates\\.+json$/.exec(document.fileName)
    if (stateMatch) {
        if(/"model"\s*?:/.test(lineText)) {
            const m = /"model"\s*:\s*("(.+:)?(.+))?/.exec(lineText) as RegExpExecArray
            let distName = path.join(stateMatch[1], '/models')
            const namespace = m[2] || 'minecraft'
            if (m[3]) {
                distName = path.join(distName, path.normalize(m[3]))
            }
            return createCompletionItems(distName, position, namespace)
        }
    }

    const blockMatch = /(.+)\\models\\(block|item).+json$/.exec(document.fileName)
    if (blockMatch) {
        const word = document.getText(document.getWordRangeAtPosition(position))
        const json = document.getText()
        // textures
        if (new RegExp(`"textures"\\s*?:\\s*?\\{[\\s\\S]*?${word.replace('/', '\\/')}[\\s\\S]*?\\}`, 'gm').test(json)) {
            const m = /".+?"\s*:\s*("(.+:)?(.+))?/.exec(lineText) as RegExpExecArray
            let distName = path.join(blockMatch[1], '/textures')
            const namespace = m[2] || 'minecraft'
            if (m[3]) {
                distName = path.join(distName, path.normalize(m[3]))
            }
            return createCompletionItems(distName, position, namespace)
        }
        // parent
        if (new RegExp(`"parent"\\s*?:\\s*?[\\s\\S]*?${word.replace('/', '\\/')}[\\s\\S]*?\\}`, 'gm').test(json)) {
            const m = /".+?"\s*:\s*("(.+:)?(.+))?/.exec(lineText) as RegExpExecArray
            let distName = path.join(blockMatch[1], '/models')
            const namespace = m[2] || 'minecraft'
            if (m[3]) {
                distName = path.join(distName, path.normalize(m[3]))
            }
            return createCompletionItems(distName, position, namespace)
        }
    }
}

async function createCompletionItems(dir: string, position: vscode.Position, namespace: string) {
    try {
        const files = await readdirAsync(dir)
        const items = files.map(name => {
            const stat = fs.statSync(path.resolve(dir, name))
            const isFile = stat.isFile()
            return {
                label: isFile ? barename(name) : `${namespace}:${name}`,
                sortText: `_${name}`,
                kind: isFile ? vscode.CompletionItemKind.File : vscode.CompletionItemKind.Folder,
                range: new vscode.Range(position, position),
            }
        })
        return items
    } catch (error) {
        return []
    }
}