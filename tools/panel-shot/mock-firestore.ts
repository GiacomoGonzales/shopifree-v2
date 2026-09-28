/**
 * Sustituto en memoria de 'firebase/firestore' para las capturas del panel.
 *
 * tools/panel-shot/vite.config.ts redirige TODO import de 'firebase/firestore' a
 * este archivo, asi que tiene que exportar cada nombre que la app importa (si falta
 * uno, el modulo ESM no carga). Lista sacada con un grep de src/ mas los habituales.
 *
 * - Lecturas: salen de demo-data.ts. Los Date se entregan como Timestamp, igual que
 *   Firestore. Las consultas respetan where (==, !=, <, <=, >, >=, in, not-in,
 *   array-contains, array-contains-any), orderBy, limit/limitToLast y cursores.
 *   Como Firestore, un orderBy deja fuera los documentos que no tienen ese campo.
 * - Escrituras: no hacen nada (resuelven). Nunca hay red: nada llega a Firestore.
 */
import { DEMO_COLLECTIONS } from './demo-data'

type Data = Record<string, unknown>

const LOG = (...args: unknown[]) => console.debug('[panel-shot/firestore]', ...args)

// ── Timestamp y valores especiales ───────────────────────────────────────────
const MIN_SECONDS = -62135596800

export class Timestamp {
  readonly seconds: number
  readonly nanoseconds: number
  constructor(seconds: number, nanoseconds: number) {
    this.seconds = seconds
    this.nanoseconds = nanoseconds
  }
  static now() { return Timestamp.fromMillis(Date.now()) }
  static fromDate(date: Date) { return Timestamp.fromMillis(date.getTime()) }
  static fromMillis(ms: number) {
    const seconds = Math.floor(ms / 1000)
    return new Timestamp(seconds, Math.floor((ms - seconds * 1000) * 1e6))
  }
  toDate() { return new Date(this.toMillis()) }
  toMillis() { return this.seconds * 1000 + this.nanoseconds / 1e6 }
  isEqual(other: Timestamp) { return other instanceof Timestamp && other.seconds === this.seconds && other.nanoseconds === this.nanoseconds }
  toString() { return `Timestamp(seconds=${this.seconds}, nanoseconds=${this.nanoseconds})` }
  toJSON() { return { seconds: this.seconds, nanoseconds: this.nanoseconds, type: 'firestore/timestamp/1.0' } }
  // Igual que el SDK: una cadena que ordena bien con < y >.
  valueOf() {
    return String(this.seconds - MIN_SECONDS).padStart(12, '0') + '.' + String(this.nanoseconds).padStart(9, '0')
  }
}

export class GeoPoint {
  constructor(readonly latitude: number, readonly longitude: number) {}
  isEqual(o: GeoPoint) { return o.latitude === this.latitude && o.longitude === this.longitude }
  toJSON() { return { latitude: this.latitude, longitude: this.longitude } }
}

export class Bytes {
  private constructor(private readonly bytes: Uint8Array) {}
  static fromUint8Array(a: Uint8Array) { return new Bytes(a) }
  static fromBase64String(s: string) { return new Bytes(Uint8Array.from(atob(s), c => c.charCodeAt(0))) }
  toUint8Array() { return this.bytes }
  toBase64() { return btoa(String.fromCharCode(...this.bytes)) }
  isEqual(o: Bytes) { return o.toBase64() === this.toBase64() }
}

export class FieldValue {
  constructor(readonly _methodName: string, readonly _args: unknown[] = []) {}
  isEqual(o: FieldValue) { return this === o }
}
export const serverTimestamp = () => new FieldValue('serverTimestamp')
export const deleteField = () => new FieldValue('deleteField')
export const increment = (n: number) => new FieldValue('increment', [n])
export const arrayUnion = (...elements: unknown[]) => new FieldValue('arrayUnion', elements)
export const arrayRemove = (...elements: unknown[]) => new FieldValue('arrayRemove', elements)
export const vector = (values: number[]) => ({ type: 'vector', values })

export class FieldPath {
  readonly segments: string[]
  constructor(...segments: string[]) { this.segments = segments }
  isEqual(o: FieldPath) { return o.segments.join('.') === this.segments.join('.') }
  static documentId() { return new FieldPath('__name__') }
}
export const documentId = () => FieldPath.documentId()

// ── Instancia, ajustes (sin efecto) ──────────────────────────────────────────
const FIRESTORE = {
  type: 'firestore' as const,
  app: null as unknown,
  toJSON: () => ({ type: 'firestore' }),
}
export type Firestore = typeof FIRESTORE

export function getFirestore(app?: unknown) {
  if (app) FIRESTORE.app = app
  return FIRESTORE
}
export function initializeFirestore(app?: unknown) { return getFirestore(app) }
export const persistentLocalCache = (s?: object) => ({ kind: 'persistent', ...(s || {}) })
export const persistentMultipleTabManager = () => ({ kind: 'PersistentMultipleTab' })
export const persistentSingleTabManager = () => ({ kind: 'persistentSingleTab' })
export const memoryLocalCache = () => ({ kind: 'memory' })
export const memoryEagerGarbageCollector = () => ({ kind: 'memoryEager' })
export const memoryLruGarbageCollector = () => ({ kind: 'memoryLru' })
export const CACHE_SIZE_UNLIMITED = -1
export function connectFirestoreEmulator() {}
export function setLogLevel() {}
export async function terminate() {}
export async function clearIndexedDbPersistence() {}
export async function enableIndexedDbPersistence() {}
export async function enableMultiTabIndexedDbPersistence() {}
export async function enableNetwork() {}
export async function disableNetwork() {}
export async function waitForPendingWrites() {}
export function onSnapshotsInSync(_db: unknown, cb: () => void) { setTimeout(cb, 0); return () => {} }
export async function loadBundle() { return { bytesLoaded: 0, documentsLoaded: 0, totalBytes: 0, totalDocuments: 0, taskState: 'Success' } }
export async function namedQuery() { return null }

// ── Datos ────────────────────────────────────────────────────────────────────
const STORE = new Map<string, Map<string, Data>>()
for (const [path, docs] of Object.entries(DEMO_COLLECTIONS)) {
  const m = new Map<string, Data>()
  for (const { id, ...rest } of docs) m.set(id, rest)
  STORE.set(path, m)
}

/** Copia profunda que entrega los Date como Timestamp, como Firestore. */
function toFirestoreValue(v: unknown): unknown {
  if (v instanceof Date) return Timestamp.fromDate(v)
  if (Array.isArray(v)) return v.map(toFirestoreValue)
  if (v && typeof v === 'object' && Object.getPrototypeOf(v) === Object.prototype) {
    const out: Data = {}
    for (const [k, x] of Object.entries(v)) {
      if (typeof x === 'function' || x === undefined) continue
      out[k] = toFirestoreValue(x)
    }
    return out
  }
  return v
}

function randomId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let id = ''
  for (let i = 0; i < 20; i++) id += chars[Math.floor(Math.random() * chars.length)]
  return id
}

// ── Referencias y consultas ──────────────────────────────────────────────────
type Constraint =
  | { kind: 'where'; field: string | FieldPath; op: string; value: unknown }
  | { kind: 'orderBy'; field: string | FieldPath; dir: 'asc' | 'desc' }
  | { kind: 'limit' | 'limitToLast'; n: number }
  | { kind: 'startAt' | 'startAfter' | 'endAt' | 'endBefore'; values: unknown[] }
  | { kind: 'and' | 'or'; filters: Constraint[] }

function splitPath(parts: unknown[]): string[] {
  return parts.map(String).join('/').split('/').filter(Boolean)
}

export class Query {
  type: string = 'query'
  readonly firestore = FIRESTORE
  readonly converter = null
  constructor(readonly _path: string, readonly _group: boolean, readonly _constraints: Constraint[]) {}
  withConverter() { return this }
}

export class DocumentReference {
  readonly type = 'document'
  readonly firestore = FIRESTORE
  readonly converter = null
  constructor(readonly path: string) {}
  get id() { return this.path.split('/').pop() as string }
  get parent(): CollectionReference { return new CollectionReference(this.path.split('/').slice(0, -1).join('/')) }
  withConverter() { return this }
  toJSON() { return { type: 'document', path: this.path } }
}

export class CollectionReference extends Query {
  constructor(readonly path: string) {
    super(path, false, [])
    this.type = 'collection'
  }
  get id() { return this.path.split('/').pop() as string }
  get parent(): DocumentReference | null {
    const segs = this.path.split('/')
    return segs.length > 1 ? new DocumentReference(segs.slice(0, -1).join('/')) : null
  }
}

function basePath(parent: unknown): string[] {
  if (parent === FIRESTORE || !parent) return []
  if (parent instanceof DocumentReference || parent instanceof CollectionReference) return parent.path.split('/')
  return []
}

export function collection(parent: unknown, ...segments: string[]): CollectionReference {
  const segs = [...basePath(parent), ...splitPath(segments)]
  return new CollectionReference(segs.join('/'))
}

export function collectionGroup(_db: unknown, collectionId: string): Query {
  return new Query(collectionId, true, [])
}

export function doc(parent: unknown, ...segments: string[]): DocumentReference {
  const base = basePath(parent)
  const rest = splitPath(segments.filter(s => s !== undefined))
  if (parent instanceof CollectionReference && rest.length === 0) return new DocumentReference([...base, randomId()].join('/'))
  return new DocumentReference([...base, ...rest].join('/'))
}

export function query(q: Query, ...constraints: unknown[]): Query {
  const flat = constraints.flat().filter(Boolean) as Constraint[]
  return new Query(q._path, q._group, [...q._constraints, ...flat])
}

export const where = (field: string | FieldPath, op: string, value: unknown): Constraint => ({ kind: 'where', field, op, value })
export const orderBy = (field: string | FieldPath, dir: 'asc' | 'desc' = 'asc'): Constraint => ({ kind: 'orderBy', field, dir })
export const limit = (n: number): Constraint => ({ kind: 'limit', n })
export const limitToLast = (n: number): Constraint => ({ kind: 'limitToLast', n })
export const startAt = (...values: unknown[]): Constraint => ({ kind: 'startAt', values })
export const startAfter = (...values: unknown[]): Constraint => ({ kind: 'startAfter', values })
export const endAt = (...values: unknown[]): Constraint => ({ kind: 'endAt', values })
export const endBefore = (...values: unknown[]): Constraint => ({ kind: 'endBefore', values })
export const and = (...filters: Constraint[]): Constraint => ({ kind: 'and', filters })
export const or = (...filters: Constraint[]): Constraint => ({ kind: 'or', filters })

export function refEqual(a: { path?: string }, b: { path?: string }) { return !!a && !!b && a.path === b.path }
export function queryEqual(a: Query, b: Query) { return a === b }

// ── Evaluacion ───────────────────────────────────────────────────────────────
interface RawDoc { id: string; path: string; data: Data }

function fieldName(f: string | FieldPath) { return f instanceof FieldPath ? f.segments.join('.') : f }

function getField(d: RawDoc, field: string | FieldPath): unknown {
  const name = fieldName(field)
  if (name === '__name__') return d.id
  let cur: unknown = d.data
  for (const part of name.split('.')) {
    if (cur === null || typeof cur !== 'object') return undefined
    cur = (cur as Data)[part]
  }
  return cur
}

// Orden de tipos de Firestore: null < bool < numero < fecha < texto < referencia < ...
function typeRank(v: unknown): number {
  if (v === null) return 0
  if (typeof v === 'boolean') return 1
  if (typeof v === 'number') return 2
  if (v instanceof Date || v instanceof Timestamp) return 3
  if (typeof v === 'string') return 4
  if (v instanceof DocumentReference) return 5
  if (v instanceof GeoPoint) return 6
  if (Array.isArray(v)) return 7
  return 8
}
function scalar(v: unknown): unknown {
  if (v instanceof Date) return v.getTime()
  if (v instanceof Timestamp) return v.toMillis()
  if (v instanceof DocumentReference) return v.path
  return v
}
function compare(a: unknown, b: unknown): number {
  const ra = typeRank(a), rb = typeRank(b)
  if (ra !== rb) return ra - rb
  if (ra === 7) {
    const xa = a as unknown[], xb = b as unknown[]
    for (let i = 0; i < Math.min(xa.length, xb.length); i++) {
      const c = compare(xa[i], xb[i])
      if (c) return c
    }
    return xa.length - xb.length
  }
  const sa = scalar(a) as number | string, sb = scalar(b) as number | string
  if (typeof sa === 'number' && typeof sb === 'number') return sa - sb
  if (typeof sa === 'boolean' || typeof sb === 'boolean') return Number(sa) - Number(sb)
  return sa < sb ? -1 : sa > sb ? 1 : 0
}
function equal(a: unknown, b: unknown): boolean {
  if (typeRank(a) !== typeRank(b)) return false
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((x, i) => equal(x, b[i]))
  if (typeRank(a) === 8) return JSON.stringify(a) === JSON.stringify(b)
  return compare(a, b) === 0
}

function matches(d: RawDoc, c: Constraint): boolean {
  if (c.kind === 'and') return c.filters.every(f => matches(d, f))
  if (c.kind === 'or') return c.filters.some(f => matches(d, f))
  if (c.kind !== 'where') return true
  const v = getField(d, c.field)
  const value = fieldName(c.field) === '__name__' && c.value instanceof DocumentReference ? c.value.id : c.value
  if (v === undefined) return false
  switch (c.op) {
    case '==': return equal(v, value)
    case '!=': return v !== null && !equal(v, value)
    case '<': return typeRank(v) === typeRank(value) && compare(v, value) < 0
    case '<=': return typeRank(v) === typeRank(value) && compare(v, value) <= 0
    case '>': return typeRank(v) === typeRank(value) && compare(v, value) > 0
    case '>=': return typeRank(v) === typeRank(value) && compare(v, value) >= 0
    case 'in': return Array.isArray(value) && value.some(x => equal(v, fieldName(c.field) === '__name__' && x instanceof DocumentReference ? x.id : x))
    case 'not-in': return v !== null && Array.isArray(value) && !value.some(x => equal(v, x))
    case 'array-contains': return Array.isArray(v) && v.some(x => equal(x, value))
    case 'array-contains-any': return Array.isArray(v) && Array.isArray(value) && v.some(x => value.some(y => equal(x, y)))
    default:
      LOG('operador no soportado', c.op)
      return true
  }
}

function collectDocs(q: Query): RawDoc[] {
  const out: RawDoc[] = []
  if (q._group) {
    for (const [path, docs] of STORE) {
      if (path.split('/').pop() !== q._path) continue
      for (const [id, data] of docs) out.push({ id, path: `${path}/${id}`, data })
    }
  } else {
    const docs = STORE.get(q._path)
    if (docs) for (const [id, data] of docs) out.push({ id, path: `${q._path}/${id}`, data })
  }
  return out
}

function runQuery(q: Query): RawDoc[] {
  let docs = collectDocs(q)
  const cs = q._constraints
  for (const c of cs) docs = docs.filter(d => matches(d, c))

  const orders = cs.filter((c): c is Extract<Constraint, { kind: 'orderBy' }> => c.kind === 'orderBy')
  // Sin orderBy explicito, Firestore ordena por el campo de la desigualdad (si hay) y luego por id.
  const ineq = cs.find((c): c is Extract<Constraint, { kind: 'where' }> => c.kind === 'where' && ['<', '<=', '>', '>=', '!=', 'not-in'].includes(c.op))
  const sortBy = orders.length ? orders.map(o => ({ field: o.field, dir: o.dir })) : ineq ? [{ field: ineq.field, dir: 'asc' as const }] : []
  // Un orderBy deja fuera los documentos que no tienen el campo.
  docs = docs.filter(d => sortBy.every(o => getField(d, o.field) !== undefined))
  const lastDir = sortBy.length ? sortBy[sortBy.length - 1].dir : 'asc'
  docs.sort((a, b) => {
    for (const o of sortBy) {
      const c = compare(getField(a, o.field), getField(b, o.field))
      if (c) return o.dir === 'desc' ? -c : c
    }
    const c = a.id < b.id ? -1 : a.id > b.id ? 1 : 0
    return lastDir === 'desc' ? -c : c
  })

  // Cursores sobre los campos de orden
  const cursorKey = (d: RawDoc) => sortBy.map(o => getField(d, o.field))
  const cursorValues = (values: unknown[]) => {
    const first = values[0]
    if (first instanceof DocumentSnapshot) {
      const raw: RawDoc = { id: first.id, path: first.ref.path, data: first._raw || {} }
      return cursorKey(raw)
    }
    return values
  }
  const cmpCursor = (d: RawDoc, values: unknown[]) => {
    const key = cursorKey(d)
    for (let i = 0; i < Math.min(values.length, sortBy.length); i++) {
      const c = compare(key[i], values[i])
      if (c) return sortBy[i].dir === 'desc' ? -c : c
    }
    return 0
  }
  for (const c of cs) {
    if (c.kind === 'startAt') { const v = cursorValues(c.values); docs = docs.filter(d => cmpCursor(d, v) >= 0) }
    if (c.kind === 'startAfter') { const v = cursorValues(c.values); docs = docs.filter(d => cmpCursor(d, v) > 0) }
    if (c.kind === 'endAt') { const v = cursorValues(c.values); docs = docs.filter(d => cmpCursor(d, v) <= 0) }
    if (c.kind === 'endBefore') { const v = cursorValues(c.values); docs = docs.filter(d => cmpCursor(d, v) < 0) }
  }

  const lim = [...cs].reverse().find(c => c.kind === 'limit' || c.kind === 'limitToLast') as { kind: string; n: number } | undefined
  if (lim?.kind === 'limit') docs = docs.slice(0, lim.n)
  if (lim?.kind === 'limitToLast') docs = docs.slice(Math.max(0, docs.length - lim.n))
  return docs
}

// ── Snapshots ────────────────────────────────────────────────────────────────
const METADATA = { hasPendingWrites: false, fromCache: false, isEqual: (o: unknown) => o === METADATA }

export class DocumentSnapshot {
  readonly metadata = METADATA
  constructor(readonly ref: DocumentReference, readonly _raw: Data | undefined) {}
  get id() { return this.ref.id }
  exists(): boolean { return this._raw !== undefined }
  data(): Data | undefined { return this._raw === undefined ? undefined : (toFirestoreValue(this._raw) as Data) }
  get(field: string | FieldPath): unknown {
    if (this._raw === undefined) return undefined
    return toFirestoreValue(getField({ id: this.id, path: this.ref.path, data: this._raw }, field))
  }
}
export class QueryDocumentSnapshot extends DocumentSnapshot {
  data(): Data { return toFirestoreValue(this._raw || {}) as Data }
}

export class QuerySnapshot {
  readonly metadata = METADATA
  constructor(readonly query: Query, readonly docs: QueryDocumentSnapshot[]) {}
  get size() { return this.docs.length }
  get empty() { return this.docs.length === 0 }
  forEach(cb: (d: QueryDocumentSnapshot) => void, thisArg?: unknown) { this.docs.forEach(cb, thisArg) }
  docChanges() { return this.docs.map((doc, newIndex) => ({ type: 'added' as const, doc, oldIndex: -1, newIndex })) }
}

function readDoc(ref: DocumentReference): DocumentSnapshot {
  const segs = ref.path.split('/')
  const coll = STORE.get(segs.slice(0, -1).join('/'))
  const raw = coll?.get(segs[segs.length - 1])
  return new DocumentSnapshot(ref, raw)
}
function readQuery(q: Query): QuerySnapshot {
  const docs = runQuery(q).map(d => new QueryDocumentSnapshot(new DocumentReference(d.path), d.data))
  return new QuerySnapshot(q, docs)
}

// Un respiro, como la red, para que los spinners aparezcan y se vayan como siempre.
const later = <T>(fn: () => T) => new Promise<T>(resolve => setTimeout(() => resolve(fn()), 30))

export const getDoc = (ref: DocumentReference) => later(() => readDoc(ref))
export const getDocFromCache = getDoc
export const getDocFromServer = getDoc
export const getDocs = (q: Query) => later(() => readQuery(q))
export const getDocsFromCache = getDocs
export const getDocsFromServer = getDocs

type Observer = { next?: (s: unknown) => void; error?: (e: unknown) => void; complete?: () => void }
export function onSnapshot(ref: DocumentReference | Query, ...args: unknown[]): () => void {
  // Firma: (ref, [opciones], onNext | observer, [onError], [onComplete])
  if (args.length && args[0] && typeof args[0] === 'object' && !('next' in (args[0] as object)) && typeof args[1] !== 'undefined') args.shift()
  let next: ((s: unknown) => void) | undefined
  let error: ((e: unknown) => void) | undefined
  if (typeof args[0] === 'function') {
    next = args[0] as (s: unknown) => void
    error = args[1] as ((e: unknown) => void) | undefined
  } else if (args[0] && typeof args[0] === 'object') {
    next = (args[0] as Observer).next
    error = (args[0] as Observer).error
  }
  let active = true
  setTimeout(() => {
    if (!active) return
    try {
      next?.(ref instanceof DocumentReference ? readDoc(ref) : readQuery(ref as Query))
    } catch (e) {
      console.error('[panel-shot/firestore] onSnapshot', e)
      error?.(e)
    }
  }, 30)
  return () => { active = false }
}

// ── Agregaciones ─────────────────────────────────────────────────────────────
export const count = () => ({ aggregateType: 'count' })
export const sum = (field: string) => ({ aggregateType: 'sum', field })
export const average = (field: string) => ({ aggregateType: 'avg', field })
export async function getCountFromServer(q: Query) {
  const n = runQuery(q).length
  return { data: () => ({ count: n }) }
}
export async function getAggregateFromServer(q: Query, spec: Record<string, { aggregateType: string; field?: string }>) {
  const docs = runQuery(q)
  const out: Record<string, number | null> = {}
  for (const [k, a] of Object.entries(spec)) {
    if (a.aggregateType === 'count') out[k] = docs.length
    else {
      const nums = docs.map(d => getField(d, a.field!)).filter((x): x is number => typeof x === 'number')
      const total = nums.reduce((s, x) => s + x, 0)
      out[k] = a.aggregateType === 'sum' ? total : nums.length ? total / nums.length : null
    }
  }
  return { data: () => out }
}
export const getAggregate = getAggregateFromServer
export const getCount = getCountFromServer

// ── Escrituras: no hacen nada ────────────────────────────────────────────────
export async function addDoc(coll: CollectionReference, data: unknown) {
  LOG('addDoc ignorado', coll.path, data)
  return new DocumentReference(`${coll.path}/${randomId()}`)
}
export async function setDoc(ref: DocumentReference, data: unknown) { LOG('setDoc ignorado', ref.path, data) }
export async function updateDoc(ref: DocumentReference, ...data: unknown[]) { LOG('updateDoc ignorado', ref.path, data) }
export async function deleteDoc(ref: DocumentReference) { LOG('deleteDoc ignorado', ref.path) }

export function writeBatch() {
  const batch = {
    set: (ref: DocumentReference) => { LOG('batch.set ignorado', ref.path); return batch },
    update: (ref: DocumentReference) => { LOG('batch.update ignorado', ref.path); return batch },
    delete: (ref: DocumentReference) => { LOG('batch.delete ignorado', ref.path); return batch },
    commit: async () => {},
  }
  return batch
}

export class Transaction {
  get(ref: DocumentReference) { return later(() => readDoc(ref)) }
  set(ref: DocumentReference) { LOG('tx.set ignorado', ref.path); return this }
  update(ref: DocumentReference) { LOG('tx.update ignorado', ref.path); return this }
  delete(ref: DocumentReference) { LOG('tx.delete ignorado', ref.path); return this }
}
export async function runTransaction<T>(...args: [db: unknown, fn: (tx: Transaction) => Promise<T>]): Promise<T> {
  const fn = args[1]
  return fn(new Transaction())
}

export class WriteBatch {}
export class AggregateField {}
export class AggregateQuerySnapshot {}
export class LoadBundleTask {}
export class SnapshotMetadata {}
export class PersistentCacheIndexManager {}
export function getPersistentCacheIndexManager() { return null }
export function snapshotEqual(a: unknown, b: unknown) { return a === b }
