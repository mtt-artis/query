interface FilterFn<T> {
  (e: T): boolean;
}

const and =
  <T>(...specs: FilterFn<T>[]) =>
  (e: T) =>
    specs.every((s) => s(e));

const or =
  <T>(...specs: FilterFn<T>[]) =>
  (e: T) =>
    specs.some((s) => s(e));

const not =
  <T>(fn: FilterFn<T>) =>
  (e: T) =>
    !fn(e);

const isTruthy =
  <T>(key: keyof T) =>
  (e: T) =>
    Boolean(e[key]);

const isFalsy = <T>(key: keyof T) => not(isTruthy(key));

const compareValues =
  <T, K extends keyof T>(key: K, value: T[K], comparator: (a: T[K], b: T[K]) => boolean) =>
  (e: T) =>
    comparator(e[key], value);

const lt = <T, K extends keyof T>(key: K, value: T[K]) => compareValues(key, value, (a, b) => a != null && a < b);
const lte = <T, K extends keyof T>(key: K, value: T[K]) => compareValues(key, value, (a, b) => a != null && a <= b);
const gt = <T, K extends keyof T>(key: K, value: T[K]) => compareValues(key, value, (a, b) => a != null && a > b);
const gte = <T, K extends keyof T>(key: K, value: T[K]) => compareValues(key, value, (a, b) => a != null && a >= b);

const compareStrictValues = <T, K extends keyof T>(
  key: K,
  value: T[K],
  comparator: (a: unknown, b: unknown) => boolean,
) => {
  return (obj: T) => {
    const a = obj[key];
    const b = value;

    // if (typeof a !== "object" || typeof b !== "object") {
    //   return comparator(a, b);
    // }

    if (a instanceof Date && b instanceof Date) {
      return comparator(a.getTime(), b.getTime());
    }

    // Temporal comparison
    // if (a instanceof Temporal.PlainDate && b instanceof Temporal.PlainDate) {
    //   return comparator(a.equals(b), true); // equals returns boolean
    // }

    // if (a instanceof Temporal.PlainDateTime && b instanceof Temporal.PlainDateTime) {
    //   return comparator(a.equals(b), true);
    // }

    // if (a instanceof Temporal.ZonedDateTime && b instanceof Temporal.ZonedDateTime) {
    //   return comparator(a.equals(b), true);
    // }

    // fallback for primitives and other objects
    return comparator(a, b);
  };
};

export const eq = <T, K extends keyof T>(key: K, value: T[K]) => compareStrictValues(key, value, (a, b) => a === b);

export const neq = <T, K extends keyof T>(key: K, value: T[K]) => compareStrictValues(key, value, (a, b) => a !== b);

const stringFilter = <T, K extends keyof T>(
  key: K,
  value: string,
  method: "includes" | "startsWith" | "endsWith",
  caseSensitive = false,
) => {
  const valueLower = caseSensitive ? value : value.toLowerCase();
  return (e: T) => {
    const v = e[key];
    if (typeof v !== "string") return false;
    if (caseSensitive) return v[method](value);
    return v.toLowerCase()[method](valueLower);
  };
};

const includes = <T, K extends keyof T>(key: K, value: string, caseSensitive = false) =>
  stringFilter<T, K>(key, value, "includes", caseSensitive);

const startsWith = <T, K extends keyof T>(key: K, value: string, caseSensitive = false) =>
  stringFilter<T, K>(key, value, "startsWith", caseSensitive);

const endsWith = <T, K extends keyof T>(key: K, value: string, caseSensitive = false) =>
  stringFilter<T, K>(key, value, "endsWith", caseSensitive);

type Transformers<T> = Partial<Record<keyof T, (value: T[keyof T]) => string | number | boolean | null | undefined>>;

class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

/**
 * A fluent query builder for filtering, sorting, and paginating arrays of objects.
 * Supports chaining operations like where, orderBy, and page for building complex queries.
 *
 * @example
 * ```typescript
 * const items = [
 *   { name: "apple", price: 50, stock: 10 },
 *   { name: "banana", price: 20, stock: 0 },
 *   { name: "apricot", price: 120, stock: 5 },
 * ];
 *
 * // Filters items with name containing "a" and price < 100, sorts by name ascending, takes first page of 2 items.
 * const { includes, lt } = Query.filterFn;
 * const result = Query
 *   .selectFrom(items)
 *   .where(includes("name", "a"))
 *   .where(lt("price", 100))
 *   .orderBy("name", "asc")
 *   .orderBy("price", "desc")
 *   .page(0, 10)
 *   .execute();
 *
 *  const result = Query
 *   .selectFrom(items)
 *   .where("name", "like", "a")
 *   .where("price", "<", 100)
 *   .orderBy("name", "asc")
 *   .orderBy("price", "desc")
 *   .page(0, 10)
 *   .execute();
 * ```
 */
export class Query<T> {
  private constructor(
    private readonly items: T[],
    private readonly pageNumber = 0,
    private readonly pageSize = 0,
    private readonly filters?: FilterFn<T>[],
    private readonly sortOptions?: Array<{ sortBy: keyof T; sortDir?: "asc" | "desc" }>,
    private readonly transformers?: Transformers<T>,
  ) {}

  static NotFoundError = NotFoundError;

  static compare<T>(a: T, b: T, key: keyof T, transformers?: Transformers<T>): number {
    let aVal = a[key];
    let bVal = b[key];
    const t = transformers?.[key];
    if (t) {
      // @ts-expect-error
      aVal = t(aVal);
      // @ts-expect-error
      bVal = t(bVal);
    }

    if (aVal == null) return bVal == null ? 0 : -1;
    if (bVal == null) return 1;

    if (typeof aVal === "string" && typeof bVal === "string") {
      return aVal.localeCompare(bVal, undefined /* locale */, { sensitivity: "variant" });
    }
    if (typeof aVal === "number" && typeof bVal === "number") {
      if (Number.isNaN(aVal)) return Number.isNaN(bVal) ? 0 : 1;
      if (Number.isNaN(bVal)) return -1;
      return aVal - bVal;
    }
    if (typeof aVal === "boolean" && typeof bVal === "boolean") {
      if (aVal === bVal) return 0;
      return aVal ? 1 : -1;
    }
    if (aVal instanceof Date && bVal instanceof Date) {
      return aVal.getTime() - bVal.getTime();
    }
    return 0;
  }

  static filterFn = Object.freeze({
    includes,
    startsWith,
    endsWith,
    lt,
    lte,
    gt,
    gte,
    eq,
    neq,
    isTruthy,
    isFalsy,
    and,
    or,
    not,
  });

  static operators = Object.freeze({
    like: includes,
    startsWith,
    endsWith,
    "<": lt,
    "<=": lte,
    ">": gt,
    ">=": gte,
    "=": eq,
    "<>": neq,
  });

  /**
   * Creates a new Query instance from an array of items.
   * @param items The array of objects to query.
   * @returns A new Query instance.
   */
  static selectFrom<T>(items: T[]): Query<T> {
    return new Query(items);
  }

  /**
   * Adds a filter to the query using a string-based operator.
   *
   * Only `'like'`, `'startsWith'` and `'endsWith'` are allowed here, and the value **must be a string**.
   *
   * @example
   * ```typescript
   * const result = Query.selectFrom(items)
   *   .where("name", "like", "ap")
   *   .execute();
   * ```
   *
   * @param key The property key to filter by (must be a string property).
   * @param op The operator to use (`'like'` | `'startsWith'` | `'endsWith'`).
   * @param value The string value to compare against.
   * @returns A new `Query` instance with the filter applied.
   */
  where<K extends keyof T>(key: K & string, op: "like" | "startsWith" | "endsWith", value: string): Query<T>;

  /**
   * Adds a filter using column, operator, and value.
   * @param key The property key to filter by.
   * @param op The operator to use ('like', 'startsWith', 'endsWith', '<', '<=', '>', '>=', '=', '<>').
   * @param value The value to compare against (optional for 'isTruthy' and 'isFalsy').
   * @returns A new Query instance with the filter applied.
   */
  where<K extends keyof T>(key: K & string, op: keyof typeof Query.operators, value: T[K]): Query<T>;
  /**
   * Adds a filter specification to the query.
   * @param spec A function that returns true for items to include.
   * @returns A new Query instance with the filter applied.
   */
  where(spec: FilterFn<T>): Query<T>;
  where(
    specOrKey: FilterFn<T> | (keyof T & string),
    op?: keyof typeof Query.operators,
    value?: T[keyof T] | string,
  ): Query<T> {
    let fn: FilterFn<T>;
    if (typeof specOrKey === "function") {
      fn = specOrKey;
    } else if (typeof specOrKey === "string" && typeof op === "string") {
      fn = this.createFilterFn(specOrKey, op, value);
    } else {
      throw new TypeError("Invalid arguments for Query.where clause");
    }
    return new Query(
      this.items,
      this.pageNumber,
      this.pageSize,
      this.filters ? [...this.filters, fn] : [fn],
      this.sortOptions,
      this.transformers,
    );
  }

  private createFilterFn<K extends keyof T>(
    key: K & string,
    op: keyof typeof Query.operators,
    value?: T[K] | string,
  ): FilterFn<T> {
    // if (op === "startsWith" || op === "endsWith" || op === "like") {
    //   if (typeof value === "string") return Query.operators[op](key, value);
    //   throw new Error(`Unsupported operator: ${op}`);
    // }
    // @ts-expect-error
    return Query.operators[op](key, value);
  }

  /**
   * Adds a sorting criteria to the query. Chain multiple calls for multi-criteria sorting.
   *
   * @example
   * ```typescript
   * const sorted = Query.selectFrom(items)
   *   .orderBy("price", "asc")
   *   .orderBy("name", "desc")
   *   .execute();
   * ```
   *
   * @param key The property key to sort by.
   * @param direction The sort direction, defaults to ascending.
   * @param transformers Optional transformers for sorting values.
   * @returns A new Query instance with sorting applied.
   */
  orderBy<K extends keyof T>(key: K, direction?: "asc" | "desc", transformers?: Transformers<T>): Query<T> {
    const existingSortOptions = this.sortOptions ?? [];
    const existingTransformers = this.transformers ?? {};

    const newSortOptions = [...existingSortOptions, { sortBy: key, sortDir: direction }];
    const newTransformers = transformers ? { ...existingTransformers, ...transformers } : existingTransformers;

    return new Query(this.items, this.pageNumber, this.pageSize, this.filters, newSortOptions, newTransformers);
  }

  /**
   * Sets pagination for the query results.
   *
   * @example
   * ```typescript
   * const page1 = Query.selectFrom(items)
   *   .orderBy("name", "asc")
   *   .page(0, 10)
   *   .execute();
   * ```
   *
   * @param pageNumber The page number (0-based).
   * @param pageSize The number of items per page.
   * @returns A new Query instance with pagination applied.
   */
  page(pageNumber: number, pageSize: number): Query<T> {
    return new Query(this.items, pageNumber, pageSize, this.filters, this.sortOptions, this.transformers);
  }

  /**
   * Executes the query and returns the filtered, sorted, and paginated results.
   *
   * @example
   * ```typescript
   * const result = Query.selectFrom(items)
   *   .where("stock", ">", 0)
   *   .orderBy("price", "asc")
   *   .page(0, 10)
   *   .execute();
   * ```
   *
   * @returns The array of items matching the query criteria.
   */
  execute(): T[] {
    let result = this.filters?.length ? this.items.filter(and(...this.filters)) : [...this.items];

    const sortOptions = this.sortOptions;
    if (sortOptions?.length) {
      result = result.sort((a, b) => {
        for (const { sortBy, sortDir } of sortOptions) {
          const multiplier = sortDir === "desc" ? -1 : 1;
          const diff = Query.compare(a, b, sortBy, this.transformers);
          if (diff !== 0) return multiplier * diff;
        }
        return 0;
      });
    }

    if (this.pageSize > 0) {
      const start = this.pageNumber * this.pageSize;
      const end = start + this.pageSize;
      result = result.slice(start, end);
    }

    return result;
  }

  /**
   * Executes the query and returns the first matching item, or undefined if no items match.
   *
   * @example
   * ```typescript
   * const first = Query.selectFrom(items)
   *   .where("stock", ">", 0)
   *   .orderBy("price", "asc")
   *   .executeTakeFirst();
   * ```
   *
   * @returns The first item matching the query criteria, or undefined.
   */
  executeTakeFirst(): T | undefined {
    let result = this.items;

    const sortOptions = this.sortOptions;
    if (sortOptions?.length) {
      result = result.toSorted((a, b) => {
        for (const { sortBy, sortDir } of sortOptions) {
          const multiplier = sortDir === "desc" ? -1 : 1;
          const diff = Query.compare(a, b, sortBy, this.transformers);
          if (diff !== 0) return multiplier * diff;
        }
        return 0;
      });
    }

    if (this.filters?.length) {
      return result.find(and(...this.filters));
    }
    return result.at(0);
  }

  /**
   * Executes the query and returns the first matching item, or throws an error if no items match.
   *
   * @param message Optional error message when no matching item is found.
   * @example
   * ```typescript
   * try {
   *   const item = Query.selectFrom(items)
   *     .where("stock", ">", 0)
   *     .orderBy("price", "asc")
   *     .executeTakeFirstOrThrow("No item found");
   *   console.log(item);
   * } catch (error) {
   *   if (error instanceof Query.NotFoundError) {
   *     console.error("No item found");
   *   } else {
   *     throw error;
   *   }
   * }
   * ```
   *
   * @returns The first item matching the query criteria.
   * @throws NotFoundError if no items match the query criteria.
   */
  executeTakeFirstOrThrow(message?: string): T {
    const result = this.executeTakeFirst();
    if (result === undefined) {
      throw new Query.NotFoundError(message ?? "No item found");
    }
    return result;
  }
}
