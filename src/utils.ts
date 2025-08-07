// UTILS
// generic functions


// return a string made of random alphanumeric character
// parameter: length: the length of the returned string
export function makeid(length: number): string {
    var result = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

// decide if there is equality between two sets xs and ys
export function eqSet (xs: Set<number>, ys: Set<number>): boolean {
    return xs.size === ys.size && [...xs].every((x) => ys.has(x));
}

export function eqIndices (xs: Array<[string,number]>, ys: Array<[string,number]>): boolean {
    for (const element of xs){
        let found = false;
        for (const e2 of ys){
            if (element[0] == e2[0] && element[1] == e2[1] ){
                found = true;
                break;
            }
        }
        if (!found){
            return false;
        }
    }
    return xs.length === ys.length;
}


// TO REMOVE
export function getRandomColor() {
    const h = 360 * Math.random();
    const s = (20 + 80 * Math.random())
    const l = (35 + 50 * Math.random()) / 100;
    const a = s * Math.min(l, 1 - l) / 100;
    const f = (n: number) => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');   // convert to Hex and prefix "0" if needed
    };
    return `#${f(0)}${f(8)}${f(4)}`;
}