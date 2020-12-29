import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'

export default (document: vscode.TextDocument, position: vscode.Position, newName: string, token: vscode.CancellationToken) => {
    const workspaceEdit = new vscode.WorkspaceEdit()

    const blockMatch = /(.+)\\models\\(block|item).+json$/.exec(document.fileName)
    if (blockMatch) {
        const word = document.getText(document.getWordRangeAtPosition(position))
        const json = document.getText()
        // parent
        if (new RegExp(`"parent"\\s*?:\\s*?[\\s\\S]*?${word.replace('/', '\\/')}[\\s\\S]*?\\}`, 'gm').test(json)) {
            const name = word.startsWith('"minecraft:') ? word.slice(11, -1) : word.slice(1, -1)
            const distName = `${blockMatch[1]}/models/${name}.json`
            const newname = newName.startsWith('"minecraft:') ? newName.slice(11, -1) : newName.slice(1, -1)
            const neName = `${blockMatch[1]}/models/${newname}.json`
            if (fs.existsSync(distName)) {
                workspaceEdit.renameFile(vscode.Uri.file(distName), vscode.Uri.file(neName))
                const range = document.getWordRangeAtPosition(position) as vscode.Range
                workspaceEdit.replace(document.uri, range, newName)
                return workspaceEdit
            }
        }
    }
    const stateMatch = /(.+)\\blockstates.+json$/.exec(document.fileName)
    if (stateMatch) {
        const word = document.getText(document.getWordRangeAtPosition(position))
        const json = document.getText()
        if (new RegExp(`"model"\\s*?:\\s*?[\\s\\S]*?${word.replace('/', '\\/')}[\\s\\S]*?\\}`, 'gm').test(json)) {
            const name = word.startsWith('"minecraft:') ? word.slice(11, -1) : word.slice(1, -1)
            const distName = `${stateMatch[1]}/models/${name}.json`
            const newname = newName.startsWith('"minecraft:') ? newName.slice(11, -1) : newName.slice(1, -1)
            const neName = `${stateMatch[1]}/models/${newname}.json`
            if (fs.existsSync(distName)) {
                workspaceEdit.renameFile(vscode.Uri.file(distName), vscode.Uri.file(neName))
                const range = document.getWordRangeAtPosition(position) as vscode.Range
                workspaceEdit.replace(document.uri, range, newName)
                return workspaceEdit
            }
        }
    }
}