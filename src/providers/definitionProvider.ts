import * as vscode from 'vscode'
import * as fs from 'fs'

export default (document: vscode.TextDocument, position: vscode.Position) => {
    const blockMatch = /(.+)\\models\\(block|item).+json$/.exec(document.fileName)
    if (blockMatch) {
        const word = document.getText(document.getWordRangeAtPosition(position))
        const json = document.getText()
        // textures
        if (new RegExp(`"textures"\\s*?:\\s*?\\{[\\s\\S]*?${word.replace('/', '\\/')}[\\s\\S]*?\\}`, 'gm').test(json)) {
            const name = word.startsWith('"minecraft:') ? word.slice(11, -1) : word.slice(1, -1)
            const distName = `${blockMatch[1]}/textures/${name}.png`
            if (fs.existsSync(distName)) {
                return new vscode.Location(vscode.Uri.file(distName), new vscode.Position(0, 0))
            }
        }
        // parent
        if (new RegExp(`"parent"\\s*?:\\s*?[\\s\\S]*?${word.replace('/', '\\/')}[\\s\\S]*?\\}`, 'gm').test(json)) {
            const name = word.startsWith('"minecraft:') ? word.slice(11, -1) : word.slice(1, -1)
            const distName = `${blockMatch[1]}/models/${name}.json`
            if (fs.existsSync(distName)) {
                return new vscode.Location(vscode.Uri.file(distName), new vscode.Position(0, 0))
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
            if (fs.existsSync(distName)) {
                return new vscode.Location(vscode.Uri.file(distName), new vscode.Position(0, 0))
            }
        }
    }
    const particleMatch = /(.+)\\particles.+json$/.exec(document.fileName)
    if (particleMatch) {
        const word = document.getText(document.getWordRangeAtPosition(position))
        const json = document.getText()
        if (new RegExp(`"textures"\\s*?:\\s*?\\[[\\s\\S]*?${word.replace('/', '\\/')}[\\s\\S]*?\\]`, 'gm').test(json)) {
            const name = word.startsWith('"minecraft:') ? word.slice(11, -1) : word.slice(1, -1)
            const distName = `${particleMatch[1]}/textures/particle/${name}.png`
            if (fs.existsSync(distName)) {
                return new vscode.Location(vscode.Uri.file(distName), new vscode.Position(0, 0))
            }
        }
    }
}