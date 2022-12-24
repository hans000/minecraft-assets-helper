/*
 * The MIT License (MIT)
 * Copyright (c) 2023 hans000
 */
export function barename(filename: string) {
    return filename.slice(0, filename.lastIndexOf('.'))
}

export function trimNamespace(path: string) {
    return path.slice(path.lastIndexOf(':') + 1)
}

export function parsePath(word = '') {
    const m = /^(.+:)?(.+)$/.exec(word)
    if (m) {
        const [, a, b] = m
        return [
            a ? a.slice(0, -1) : 'minecraft', 
            b ? b : '',
        ]
    }
    return null
}

export function pickPath(text: string, pos: number) {
	let last = ''
	if (text) {
		let m: RegExpExecArray | null
		const reg = /"([^"]+)"/g
		while (m = reg.exec(text)) {
			if (pos <= m.index) {
				break
			}
			last = m[1]
		}
	}
    return last
}

export function pickKeyValue(text: string, pos: number) {
	let keyval: [string, string] | undefined
	if (text) {
		let m: RegExpExecArray | null
		const reg = /"([\w-]*)"[\s\r\n]*:[\s\r\n]*"([.\w-:/]+)"/g
		while (m = reg.exec(text)) {
			if (pos <= m.index) {
				break
			}
            keyval = [m[1], m[2]]
		}
	}
    return keyval
}

export function getLastValue(text: string) {
	const m = /"([-\w:/]*)$/.exec(text)
	return m ? m[1] : ''
}

export function uniq<T>(list: T[]) {
	return [...new Set(list)]
}

export function uniqBy<T>(list: T[], fn: (item: T) => any) {
	const set = new Set()
	return list.filter(item => {
		const result = fn(item)
		if (set.has(result)) {
			return false
		}
		set.add(result)
		return true
	})
}