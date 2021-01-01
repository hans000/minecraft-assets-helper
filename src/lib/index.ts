import { ICompletionContext } from "./JsonMatcher"
import * as path from 'path'
import * as vscode from 'vscode'
import * as fs from 'fs'
import { promisify } from 'util'
import { barename } from '../utils/index'

const readdirAsync = promisify(fs.readdir)

export async function createCompletionItems(context: ICompletionContext | null) {
    if (context === null) {
        return []
    }
    try {
        const { dirname, range, namespace, ext } = context
        const files = await readdirAsync(dirname)
        const items: vscode.CompletionItem[] = []
        for (const name of files) {
            const stat = fs.statSync(path.resolve(dirname, name))
            const isFile = stat.isFile()
            if (isFile && !name.endsWith(ext)) {
                continue
            }
            const label = isFile ? barename(name) : name
            const insertText = isFile ? label : `${namespace}:${label}`
            const kind = isFile ? vscode.CompletionItemKind.File : vscode.CompletionItemKind.Folder
            items.push({
                label,
                kind,
                range,
                insertText
            })
        }
        return items
    } catch (error) {
        return []
    }
}