/**
 * In-memory store for demo seeder/cleanup tests. Every write is validated with
 * the real Mongoose schema (offline); filters support equality, $in, $nin and
 * $or, including array fields — enough to exercise the real cleanup filters.
 */
import 'reflect-metadata';
import { strict as assert } from 'node:assert';
import mongoose = require('mongoose');
import type { Model } from 'mongoose';
import {
  manifestEntryId,
  registerDemoSeedModels,
  type DemoManifestEntry,
  type DemoSeedManifest,
  type PlainRecord,
  type SeedCollection,
} from '../src/database/demo-seed/demo-seed';
import { DEMO_DEPENDENCY_SPECS, type DemoCleanupStore } from '../src/database/demo-seed/demo-cleanup';

const asStrings = (value: unknown): string[] =>
  Array.isArray(value) ? value.map((item) => String(item)) : [String(value)];

export function matchesFilter(record: Record<string, any>, filter: Record<string, unknown>): boolean {
  return Object.entries(filter).every(([key, condition]) => {
    if (key === '$or') {
      return (condition as Record<string, unknown>[]).some((sub) => matchesFilter(record, sub));
    }
    const actual = record[key];
    if (condition && typeof condition === 'object' && !(condition instanceof mongoose.Types.ObjectId)) {
      const ops = condition as Record<string, unknown[]>;
      const values = actual === undefined || actual === null ? [] : asStrings(actual);
      if ('$in' in ops) {
        const set = new Set(ops.$in.map(String));
        if (!values.some((value) => set.has(value))) return false;
      }
      if ('$nin' in ops) {
        const set = new Set(ops.$nin.map(String));
        if (values.some((value) => set.has(value))) return false;
      }
      return true;
    }
    return actual !== undefined && String(actual) === String(condition);
  });
}

export function memoryCollection(
  model: Model<any> | null,
  seed: PlainRecord[] = [],
  deletionLog?: { name: string; log: string[] },
) {
  const records: PlainRecord[] = seed.map((record) => ({ ...record }));
  let writes = 0;
  const plain = (doc: mongoose.Document) =>
    JSON.parse(JSON.stringify(doc.toObject({ flattenMaps: true, versionKey: false })));
  const build = async (values: Record<string, unknown>) => {
    if (!model) return JSON.parse(JSON.stringify(values));
    const doc = new model(values);
    await doc.validate();
    return plain(doc);
  };
  const collection: SeedCollection = {
    normalize: build,
    async findOne(filter) {
      const hit = records.find((record) => matchesFilter(record, filter));
      return hit ? JSON.parse(JSON.stringify(hit)) : null;
    },
    async findMany(filter) {
      return records.filter((record) => matchesFilter(record, filter)).map((r) => JSON.parse(JSON.stringify(r)));
    },
    async countDocuments(filter) {
      return records.filter((record) => matchesFilter(record, filter)).length;
    },
    async insertOne(values) {
      const record = await build(values);
      assert.ok(!records.some((existing) => existing._id === record._id), 'no duplicate _id');
      records.push(record);
      writes += 1;
      return String(record._id);
    },
    async updateOne(id, values) {
      const index = records.findIndex((record) => record._id === id);
      assert.ok(index >= 0, 'update targets an existing record');
      records[index] = await build({ ...records[index], ...values });
      writes += 1;
    },
    async deleteByIds(ids) {
      const set = new Set(ids);
      let removed = 0;
      for (let i = records.length - 1; i >= 0; i -= 1) {
        if (set.has(String(records[i]._id))) {
          records.splice(i, 1);
          removed += 1;
        }
      }
      writes += removed ? 1 : 0;
      if (removed && deletionLog) deletionLog.log.push(deletionLog.name);
      return removed;
    },
  };
  return { collection, records, writes: () => writes };
}

export function memoryManifest(seed: DemoManifestEntry[] = []) {
  const entries = new Map(seed.map((entry) => [manifestEntryId(entry), { ...entry }]));
  const manifest: DemoSeedManifest = {
    async list() {
      return [...entries.values()].map((entry) => ({ ...entry }));
    },
    async add(entry) {
      if (!entries.has(manifestEntryId(entry))) entries.set(manifestEntryId(entry), { ...entry });
    },
    async remove(removed) {
      for (const entry of removed) entries.delete(manifestEntryId(entry));
    },
  };
  return { manifest, entries };
}

export interface HarnessSeed {
  users?: PlainRecord[];
  properties?: PlainRecord[];
  projects?: PlainRecord[];
  advertisements?: PlainRecord[];
  agencies?: PlainRecord[];
  manifest?: DemoManifestEntry[];
  dependencies?: Record<string, PlainRecord[]>;
}

export function createHarness(existing: HarnessSeed = {}) {
  const connection = mongoose.createConnection();
  const models = registerDemoSeedModels(connection);
  const deletionOrder: string[] = [];
  const users = memoryCollection(models.user, existing.users, { name: 'users', log: deletionOrder });
  const properties = memoryCollection(models.property, existing.properties, { name: 'properties', log: deletionOrder });
  const projects = memoryCollection(models.project, existing.projects, { name: 'projects', log: deletionOrder });
  const advertisements = memoryCollection(models.advertisement, existing.advertisements, {
    name: 'advertisements',
    log: deletionOrder,
  });
  const agencies = memoryCollection(models.agency, existing.agencies, { name: 'agencies', log: deletionOrder });
  const manifest = memoryManifest(existing.manifest);
  const dependencies = new Map(
    DEMO_DEPENDENCY_SPECS.map((spec) => [
      spec.modelName,
      // As in the real cleanup, advertisements and agencies share one collection.
      spec.modelName === models.advertisement.modelName
        ? advertisements
        : spec.modelName === models.agency.modelName
          ? agencies
          : memoryCollection(null, existing.dependencies?.[spec.modelName] ?? []),
    ]),
  );
  const store: DemoCleanupStore = {
    users: users.collection,
    properties: properties.collection,
    projects: projects.collection,
    advertisements: advertisements.collection,
    agencies: agencies.collection,
    manifest: manifest.manifest,
    dependency: (name) => {
      const found = dependencies.get(name);
      assert.ok(found, `dependency collection ${name} registered`);
      return found.collection;
    },
  };
  const totalWrites = () =>
    users.writes() + properties.writes() + projects.writes() + advertisements.writes() + agencies.writes();
  return {
    connection, users, properties, projects, advertisements, agencies, manifest, dependencies,
    deletionOrder, store, collections: store, totalWrites,
  };
}

export const newId = () => new mongoose.Types.ObjectId().toHexString();
