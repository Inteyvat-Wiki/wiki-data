import fs from 'node:fs';

export type LuaPrototype = {
    path: string,
    params: number,
    stack: number,
    code: number[],
    constants: any[],
    upvalues: [number, number][],
    children: LuaPrototype[],
};

export const lua_opcodes = ('ADD SUB MUL MOD POW DIV IDIV BAND BOR BXOR SHL SHR UNM BNOT NOT LEN '
    + 'CONCAT JMP EQ LT LE MOVE LOADK EXTRAARG LOADBOOL RETURN GETUPVAL SETLIST '
    + 'LOADKX SELF FORLOOP SETTABLE TAILCALL TFORLOOP SETTABUP TESTSET GETTABUP '
    + 'VARARG LOADNIL TFORCALL SETUPVAL GETTABLE FORPREP NEWTABLE CALL CLOSURE TEST').split(' ');

export function read_lua(file: string): LuaPrototype {
    const data = fs.readFileSync(file);
    let offset = 0;
    let string_size = 4;
    function take(size: number) {
        if (size < 0 || offset + size > data.length) throw new Error('Truncated Lua bytecode');
        const value = data.subarray(offset, offset + size);
        offset += size;
        return value;
    }
    function count() {
        const value = take(4).readInt32LE();
        if (value < 0 || value > data.length) throw new Error('Invalid Lua count');
        return value;
    }
    function string() {
        let size = take(1)[0];
        if (size === 255) size = string_size === 4
            ? take(4).readUInt32LE() : Number(take(8).readBigUInt64LE());
        return size ? take(size - 1).toString('utf8') : '';
    }
    function prototype(path: string, depth: number): LuaPrototype {
        if (depth > 100) throw new Error('Lua prototype nesting limit');
        string();
        take(8);
        const [params, , stack] = take(3);
        const code = Array.from({ length: count() }, () => take(4).readUInt32LE());
        const constants = Array.from({ length: count() }, () => {
            const tag = take(1)[0];
            if (tag === 0) return null;
            if (tag === 1) return !!take(1)[0];
            if (tag === 3) return take(8).readDoubleLE();
            if (tag === 19) return Number(take(8).readBigInt64LE());
            if (tag === 4 || tag === 20) return string();
            throw new Error(`Unknown Lua constant ${tag}`);
        });
        const upvalues = Array.from({ length: count() }, () => [...take(2)] as [number, number]);
        const children = Array.from({ length: count() }, (_, index) => prototype(`${path}_${index}`, depth + 1));
        take(count() * 4);
        for (let remaining = count(); remaining > 0; remaining--) { string(); take(8); }
        for (let remaining = count(); remaining > 0; remaining--) string();
        return { path, params, stack, code, constants, upvalues, children };
    }
    if (!take(5).equals(Buffer.from([27, 76, 117, 97, 83]))) throw new Error('Not Lua 5.3 bytecode');
    const format = take(1)[0];
    if (format !== 0 && format !== 1) throw new Error(`Unsupported Lua format ${format}`);
    if (!take(6).equals(Buffer.from([25, 147, 13, 10, 26, 10]))) throw new Error('Invalid Lua signature');
    string_size = format === 1 ? 4 : 8;
    const sizes = format === 1 ? [4, 4, 8, 8] : [4, 8, 4, 8, 8];
    if (!take(sizes.length).equals(Buffer.from(sizes))) throw new Error('Unsupported Lua value sizes');
    take(17);
    const root = prototype('0', 0);
    if (offset !== data.length) throw new Error('Trailing Lua bytes');
    return root;
}

type Cell = { value: any };
type Closure = { prototype: LuaPrototype, upvalues: Cell[] };
type Reference = { reference: string, closure?: Closure };
export type LuaGuard = { id: string, value: boolean, description: string };
export type LuaCall = {
    id: string, method: string, args: any[], guards: LuaGuard[],
    delay: number, after?: string,
};
type Context = { guards: LuaGuard[], delay: number, after?: string, stack: string[] };

// Static evaluation recovers constants and captured config tables; it never executes game Lua.
export class LuaInspector {
    actor: Record<string, any> = {};
    owner = 0;
    calls: LuaCall[] = [];
    constructor(public source: string, public root: LuaPrototype,
        private configs: Map<number, Record<string, any>>) {}

    private lookup(object: any, key: any): any {
        if (key === 'clientData' && this.owner) return this.configs.get(this.owner);
        if (object?.reference) return { reference: `${object.reference}.${key}` };
        return object?.[key];
    }

    private guards(prototype: LuaPrototype, pc: number, tests: Map<number, string>): LuaGuard[] | undefined {
        const edges = prototype.code.map((word, index) => {
            const op = lua_opcodes[word & 63];
            const c = (word >>> 14) & 511;
            const target = index + 1 + (word >>> 14) - 131071;
            if (op === 'RETURN' || op === 'TAILCALL') return [];
            if (op === 'JMP' || op === 'FORPREP') return [target];
            if (op === 'FORLOOP' || op === 'TFORLOOP') return [index + 1, target];
            if (['EQ', 'LT', 'LE', 'TEST', 'TESTSET'].includes(op)) return [index + 1, index + 2];
            return [index + ((op === 'LOADBOOL' && c) || op === 'LOADKX' ? 2 : 1)];
        });
        const reaches = (start: number, blocked = -1) => {
            const pending = [start], seen = new Set<number>();
            while (pending.length) {
                const node = pending.pop()!;
                if (node === blocked || seen.has(node)) continue;
                if (node === pc) return true;
                seen.add(node);
                pending.push(...(edges[node] || []));
            }
            return false;
        };
        const result: LuaGuard[] = [];
        if (!reaches(0)) return;
        let alternative_paths = false;
        for (const [index, description] of tests) {
            if (reaches(0, index)) {
                if (reaches(index + 1) !== reaches(index + 2)) alternative_paths = true;
                continue;
            }
            const first = reaches(index + 1), second = reaches(index + 2);
            if (first === second) continue;
            const word = prototype.code[index], op = lua_opcodes[word & 63];
            const flag = ['TEST', 'TESTSET'].includes(op) ? (word >>> 14) & 511 : (word >>> 6) & 255;
            result.push({ id: `lua:${this.source}:${prototype.path}:${index}`,
                value: first ? !!flag : !flag, description });
        }
        // Necessary branch outcomes alone do not describe an OR-shaped control-flow join.
        if (alternative_paths) result.push({ id: `lua:${this.source}:${prototype.path}:call:${pc}`,
            value: true, description: `${prototype.path}:${pc}` });
        return result;
    }

    evaluate(closure: Closure, args: any[], context?: Context): any {
        const prototype = closure.prototype;
        if (context?.stack.includes(prototype.path) || (context?.stack.length || 0) > 30) return;
        const registers: Cell[] = Array.from({ length: prototype.stack }, (_, index) => ({ value: args[index] }));
        const tests = new Map<number, string>();
        const rk = (value: number) => value & 256 ? prototype.constants[value & 255] : registers[value]?.value;
        const describe = (value: any) => value?.reference || (typeof value === 'object' ? '?' : String(value));
        for (let pc = 0; pc < prototype.code.length; pc++) {
            const word = prototype.code[pc], op = lua_opcodes[word & 63];
            if (!op) throw new Error(`Unknown Lua opcode ${word & 63}`);
            const a = (word >>> 6) & 255, b = (word >>> 23) & 511, c = (word >>> 14) & 511, bx = word >>> 14;
            const set = (index: number, value: any) => { if (registers[index]) registers[index].value = value; };
            const get = (index: number) => registers[index]?.value;
            if (op === 'MOVE') set(a, get(b));
            else if (op === 'LOADK') set(a, prototype.constants[bx]);
            else if (op === 'LOADKX') set(a, prototype.constants[prototype.code[++pc] >>> 6]);
            else if (op === 'LOADBOOL') set(a, !!b);
            else if (op === 'LOADNIL') for (let index = a; index <= a + b; index++) set(index, undefined);
            else if (op === 'GETUPVAL') set(a, closure.upvalues[b]?.value);
            else if (op === 'SETUPVAL' && !context) closure.upvalues[b].value = get(a);
            else if (op === 'GETTABLE' || op === 'GETTABUP') set(a,
                this.lookup(op === 'GETTABUP' ? closure.upvalues[b]?.value : get(b), rk(c)));
            else if (op === 'NEWTABLE') set(a, {});
            else if (op === 'SETTABLE' || op === 'SETTABUP') {
                const object = op === 'SETTABUP' ? closure.upvalues[a]?.value : get(a);
                if (object && !object.reference) object[rk(b)] = rk(c);
            } else if (op === 'SELF') {
                const object = get(b), key = rk(c), value = this.lookup(object, key);
                set(a + 1, object);
                set(a, { reference: `method:${key}`, closure: value?.prototype ? value : undefined });
            } else if (op === 'CLOSURE') {
                const child = prototype.children[bx];
                set(a, { prototype: child, upvalues: child.upvalues.map(([stack, index]) =>
                    stack ? registers[index] : closure.upvalues[index]) });
            } else if (op === 'SETLIST' && b) {
                const table = get(a);
                const block = c || prototype.code[++pc] >>> 6;
                if (table) for (let index = 1; index <= b; index++) table[(block - 1) * 50 + index] = get(a + index);
            } else if (op === 'CONCAT') {
                const values = registers.slice(b, c + 1).map(cell => cell.value);
                set(a, values.every(value => ['string', 'number'].includes(typeof value)) ? values.join('') : undefined);
            } else if (op === 'CALL' || op === 'TAILCALL') {
                const fn: Reference | Closure = get(a);
                const values = b ? registers.slice(a + 1, a + b).map(cell => cell.value) : [];
                const reference = (fn as Reference)?.reference;
                const method = reference?.split('.').at(-1)?.replace(/^method:/, '');
                const payload = reference?.startsWith('method:') ? values.slice(1) : values;
                const local_guards = context ? this.guards(prototype, pc, tests) : [];
                const guards = [...(context?.guards || []), ...(local_guards || [])];
                const next = context && local_guards && { ...context, guards, stack: [...context.stack, prototype.path] };
                let result: any;
                if (method === 'class') result = {};
                else if (method === 'require') {
                    const match = typeof payload[0] === 'string' && payload[0].match(/^Quest\/Client\/Q(\d+)ClientConfig$/);
                    result = match ? this.configs.get(Number(match[1])) : { reference: `module:${payload[0]}` };
                } else if (method === 'tostring') result = typeof payload[0] === 'number' ? String(payload[0]) : undefined;
                else {
                    const target = (fn as Reference)?.closure || ((fn as Closure)?.prototype ? fn as Closure : undefined);
                    if (target && next) this.evaluate(target, values, next);
                    if (method && next) {
                        const id = `${this.source}:${prototype.path}:${pc}`;
                        if (/Narrator|^(ShowReminder|SayReminder)$/.test(method)) this.calls.push({
                            id, method, args: payload, guards, delay: next.delay, after: next.after,
                        });
                        const callback_index = method === 'AfterMainPageActiveSafeCall' ? 0
                            : method === 'NpcNarratorOnlyTaskByData' ? 2 : 1;
                        if (method === 'CallDelay' || method === 'AfterMainPageActiveSafeCall' || /Narrator.*Task/.test(method)) {
                            const callback = payload[callback_index];
                            const callback_target = callback?.prototype ? callback : callback?.closure;
                            if (callback_target) this.evaluate(callback_target, [this.actor], {
                                ...next,
                                delay: next.delay + (method === 'CallDelay' && typeof payload[0] === 'number' ? payload[0] : 0),
                                after: /Narrator/.test(method) ? id : next.after,
                            });
                        }
                    }
                    if (method) result = { reference: `${method}(${payload.map(describe).join(', ')})` };
                }
                if (!b || !c) for (let index = a; index < registers.length; index++) set(index, undefined);
                else if (c > 1) {
                    set(a, result);
                    for (let index = a + 1; index < a + c - 1; index++) set(index, undefined);
                }
            } else if (op === 'RETURN' && b > 1 && !context) return get(a);
            else if (['EQ', 'LT', 'LE', 'TEST', 'TESTSET'].includes(op)) {
                tests.set(pc, ['TEST', 'TESTSET'].includes(op) ? describe(get(a))
                    : `${describe(rk(b))} ${op === 'EQ' ? '==' : op === 'LT' ? '<' : '<='} ${describe(rk(c))}`);
                for (let index = prototype.params; index < registers.length; index++) set(index, undefined);
            } else if (['JMP', 'FORLOOP', 'FORPREP', 'TFORLOOP'].includes(op)) {
                for (let index = prototype.params; index < registers.length; index++) set(index, undefined);
            } else if (['ADD', 'SUB', 'MUL', 'DIV'].includes(op)) {
                const left = rk(b), right = rk(c);
                set(a, typeof left === 'number' && typeof right === 'number'
                    ? op === 'ADD' ? left + right : op === 'SUB' ? left - right : op === 'MUL' ? left * right : left / right
                    : undefined);
            } else if (['VARARG', 'TFORCALL', 'NOT', 'LEN', 'UNM', 'BNOT', 'MOD', 'POW', 'IDIV',
                'BAND', 'BOR', 'BXOR', 'SHL', 'SHR'].includes(op)) set(a, undefined);
        }
    }

    load() {
        const root: Closure = { prototype: this.root,
            upvalues: this.root.upvalues.map(() => ({ value: { reference: '_G' } })) };
        const value = this.evaluate(root, []);
        if (value && !value.reference) this.actor = value;
        this.owner = typeof this.actor.defaultAlias === 'string'
            ? Number(this.actor.defaultAlias.match(/^Quest(\d+)$/)?.[1]) || 0 : 0;
        if (this.actor.OnDataLoaded?.prototype) this.evaluate(this.actor.OnDataLoaded, [this.actor]);
        return this.actor;
    }

    inspect(entry: string): LuaCall[] {
        this.calls = [];
        const closure = this.actor[entry];
        if (closure?.prototype) this.evaluate(closure, [this.actor], { guards: [], delay: 0, stack: [] });
        return this.calls;
    }
}
