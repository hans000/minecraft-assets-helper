/*
 * The MIT License (MIT)
 * Copyright (c) 2022 hans000
 */
import { existsSync, mkdirSync, writeFile, readFile } from 'fs'
import { CACHED_DIRNAME, CACHED_LINK_FILENAME } from '../utils/constants'
import { promisify } from 'util'
import { loadAsync } from 'jszip'
import JSZip = require('jszip')

export interface CachedFileSettings {
    links: string[]
}

const writeFileAsync = promisify(writeFile)
const readFileAsync = promisify(readFile)

const rules = [
    {
        test: /^assets\/.+\/blockstates\/.+\.json$/,
        key: 'blockstates',
    },
    {
        test: /^assets\/.+\/models\/block\/.+\.json$/,
        key: 'models/block',
    },
    {
        test: /^assets\/.+\/models\/item\/.+\.json$/,
        key: 'models/item',
    },
    {
        test: /^assets\/.+\/textures\/.+\.png$/,
        key: 'textures',
    },
]

const cachedFileList = [
    {
        filename: CACHED_LINK_FILENAME,
        handleData: getLinks,
        handleFile: createLinkFile,
        key: 'links',
    }
]

export async function writeCacheFile(filename: string, data: any) {
    if (! existsSync(CACHED_DIRNAME)) {
        mkdirSync(CACHED_DIRNAME)
    }

    await writeFileAsync(`${CACHED_DIRNAME}/${filename}`, JSON.stringify(data, null, 2))
}

export async function getVanillaSettings(clientFiles: string[], force = false): Promise<CachedFileSettings> {
    const settings: any = {
        links: []
    }

    const expiredConfig: typeof cachedFileList = []
    for (const config of cachedFileList) {
        const filename = `${CACHED_DIRNAME}/${config.filename}`
        const exist = existsSync(filename)
        if (!force && exist) {
            try {
                const text = (await readFileAsync(filename)).toString()
                settings[config.key] = JSON.parse(text)
            } catch (error) {
                expiredConfig.push(config)
            }
        } else {
            expiredConfig.push(config)
        }
    }

    if (! expiredConfig.length) {
        return settings
    }

    for (const clientFile of clientFiles) {
        try {
            if (! existsSync(clientFile)) {
                continue
            }

            const buffer = await readFileAsync(clientFile)
            const data = await loadAsync(buffer)
            for (const config of expiredConfig) {
                const newLinks = await config.handleData(data)
                settings[config.key].push(...newLinks)
            }
        } catch (error) {
            console.log(error)
        }
    }

    for (const config of cachedFileList) {
        await config.handleFile(settings[config.key])
    }

    return settings
}

async function createLinkFile(links: string) {
    return await writeCacheFile(CACHED_LINK_FILENAME, links)
}

async function getLinks(data: JSZip) {
    const links: string[] = []

    data.forEach(filename => {
        for (const rule of rules) {
            if (rule.test.test(filename)) {
                links.push(filename)
            }
        }
    })

    return links
}