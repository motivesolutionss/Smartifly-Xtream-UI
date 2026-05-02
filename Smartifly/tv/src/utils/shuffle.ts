export function seededShuffle<T>(
    items: T[],
    getKey: (item: T) => string,
    seed: string
): T[] {
    if (items.length <= 1) return items;

    return [...items].sort((a, b) => {
        const aHash = hashString(`${seed}:${getKey(a)}`);
        const bHash = hashString(`${seed}:${getKey(b)}`);
        return aHash - bHash;
    });
}

function hashString(value: string): number {
    let hash = 5381;
    for (let i = 0; i < value.length; i += 1) {
        // eslint-disable-next-line no-bitwise
        hash = ((hash << 5) + hash) ^ value.charCodeAt(i);
    }
    // eslint-disable-next-line no-bitwise
    return hash >>> 0;
}
