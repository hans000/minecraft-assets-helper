import * as vscode from 'vscode'
import { createCompletionItems } from '../lib'
import { JsonModelMatcher, JsonParentMatcher, JsonTextureMatcher } from '../lib/JsonMatcher'

export default (document: vscode.TextDocument, position: vscode.Position) => {
    
    const model = new JsonModelMatcher(document, position).getContext()
    if (model) {
        return createCompletionItems(model)
    }
    const parent = new JsonParentMatcher(document, position).getContext()
    if (parent) {
        return createCompletionItems(parent)
    }
    const texture = new JsonTextureMatcher(document, position).getContext()
    if (texture) {
        return createCompletionItems(texture)
    }
}
