/*
 * The MIT License (MIT)
 * Copyright (c) 2022 hans000
 */
import { createConnection, TextDocuments, ProposedFeatures, InitializeParams, DidChangeConfigurationNotification, TextDocumentSyncKind, InitializeResult, WorkspaceFolder, Position, } from 'vscode-languageserver/node'
import { TextDocument } from 'vscode-languageserver-textdocument'
import { DefinitionRequest } from './requests/definition'
import { DiagnosticRequest } from './requests/diagnostic'
import { CompletionRequest } from './requests/completion'
import { CachedFileSettings, getVanillaSettings } from './config/createCacheFile'
import { COMMAND_CREATE_FILES, SETTINGS_KEY } from './utils/constants'
import { isAssetPack, isMultiAssetsPack } from './utils/workspace'
import { fileURLToPath } from 'url'

const connection = createConnection(ProposedFeatures.all)
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument)

let hasConfigurationCapability = false
let hasWorkspaceFolderCapability = false
let hasDiagnosticRelatedInformationCapability = false

connection.onInitialize((params: InitializeParams) => {

    const folders = params.workspaceFolders || []
    for (const folder of folders) {
        const dirname = fileURLToPath(folder.uri)
        if (isAssetPack(dirname) || isMultiAssetsPack(dirname)) {
            globalSettings.isAssetProject = true
        }
    }

    if (! globalSettings.isAssetProject) {
        return {
            capabilities: {}
        } as InitializeResult
    }

    const capabilities = params.capabilities
    hasConfigurationCapability = !!(
        capabilities.workspace && !!capabilities.workspace.configuration
    )
    hasWorkspaceFolderCapability = !!(
        capabilities.workspace && !!capabilities.workspace.workspaceFolders
    )
    hasDiagnosticRelatedInformationCapability = !!(
        capabilities.textDocument &&
        capabilities.textDocument.publishDiagnostics &&
        capabilities.textDocument.publishDiagnostics.relatedInformation
    )

    const result: InitializeResult = {
        capabilities: {
            textDocumentSync: TextDocumentSyncKind.Incremental,
            definitionProvider: true,
            completionProvider: {
                triggerCharacters: ['/', ':', '"']
			},
            executeCommandProvider: {
                commands: [
                    COMMAND_CREATE_FILES
                ]
            }
        }
    }
    if (hasWorkspaceFolderCapability) {
        result.capabilities.workspace = {
            workspaceFolders: {
                supported: true,
            },
        }
    }
    return result
})

interface GlobalSettings {
    clientJarFiles: string[]
    isAssetProject: boolean
}

const defaultSettings = {
    clientJarFiles: [],
    isAssetProject: false,
}

let globalSettings: GlobalSettings = defaultSettings
let folders: WorkspaceFolder[] = []
export let vanillaSettings: CachedFileSettings = {
    links: []
}

connection.onExecuteCommand(async params => {
    if (globalSettings.isAssetProject) {
        switch (params.command) {
            case COMMAND_CREATE_FILES:
                vanillaSettings = await getVanillaSettings(globalSettings.clientJarFiles, true)
                return;
            default:
                return;
        }
    }
})

connection.onInitialized(async () => {
    if (hasConfigurationCapability) {
        connection.client.register(DidChangeConfigurationNotification.type, undefined)
    }
    if (hasWorkspaceFolderCapability) {
        folders = await connection.workspace.getWorkspaceFolders() || []

        if (! globalSettings.isAssetProject) {
            return
        }

        connection.onDefinition(async ({ position, textDocument }) => await new DefinitionRequest(documents.get(textDocument.uri)!, position, folders).create())
        connection.onCompletion(async ({ position, textDocument }) => await new CompletionRequest(documents.get(textDocument.uri)!, position, folders).create())
        documents.onDidChangeContent(async change => validateTextDocument(change.document))
        globalSettings = Object.assign(globalSettings, await connection.workspace.getConfiguration(SETTINGS_KEY))
        vanillaSettings = await getVanillaSettings(globalSettings.clientJarFiles)

        connection.onDidChangeConfiguration(async change => {
            if (hasConfigurationCapability) {
                globalSettings = Object.assign(globalSettings, await connection.workspace.getConfiguration(SETTINGS_KEY))
                vanillaSettings = await getVanillaSettings(globalSettings.clientJarFiles, true)
            } else {
                globalSettings = change.settings.assetsHelper || defaultSettings
            }
            documents.all().forEach(validateTextDocument)
        })
    }
})

async function validateTextDocument(textDocument: TextDocument) {
    const inst = new DiagnosticRequest(textDocument, Position.create(0, 0), folders)
    const diagnostics = inst.create()
    connection.sendDiagnostics({
        uri: textDocument.uri,
        diagnostics,
    })
}

documents.listen(connection)
connection.listen()