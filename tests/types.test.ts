import { expect, test } from "vite-plus/test";
import { Query } from "../src";

test("Type checks for Query.where with null and undefined", () => {
  const items = [
    { name: "apple", price: 50, stock: 10, createdAt: new Date() },
    { name: null, price: null, stock: 0, createdAt: null },
    { name: undefined, price: 100, stock: 5, createdAt: undefined },
  ];

  const query = Query.selectFrom(items);

  // ✅ Correct usage with null and undefined
  query.where("name", "=", null);
  query.where("name", "<>", undefined);
  query.where("createdAt", "=", new Date());
  query.where("createdAt", ">", new Date());

  // @ts-expect-error invalid key
  query.where("unknownKey", "=", null);

  // @ts-expect-error invalid operator
  expect(() => query.where("price", "approx", 50)).toThrow();

  // @ts-expect-error invalid value type
  query.where("stock", "=", "ten");

  // @ts-expect-error invalid value type
  query.where("stock", "=", undefined);

  expect(() => query.where("name", "like", undefined)).toThrow();
});

test("Type checks for filterFn helpers with null, undefined, Date", () => {
  const items = [
    { name: "apple", price: 50, stock: 10, createdAt: new Date() },
    { name: null, price: null, stock: 0, createdAt: null },
  ];
  const query = Query.selectFrom(items);

  // ✅ Correct usage
  query.where(Query.filterFn.eq("name", null));
  query.where(Query.filterFn.neq("price", null));
  query.where(Query.filterFn.eq("createdAt", new Date()));
  query.where(Query.filterFn.lt("createdAt", new Date()));

  // @ts-expect-error invalid value type for eq
  Query.filterFn.eq("name", 123);

  // @ts-expect-error invalid key
  Query.filterFn.neq("unknown", null);

  // @ts-expect-error lt expects comparable type
  Query.filterFn.lt("name", new Date());
});

test("Type checks for orderBy", () => {
  const items = [{ name: "apple", price: 50 }];
  const query = Query.selectFrom(items);

  // ✅ Valid keys
  query.orderBy("name", "asc");
  query.orderBy("price", "desc");

  // @ts-expect-error
  query.orderBy("unknownKey", "asc");

  // @ts-expect-error
  query.orderBy("price", "upwards");
});

test("Type checks for page method", () => {
  const items = [{ name: "apple" }];
  const query = Query.selectFrom(items);

  // ✅ Valid
  query.page(0, 10);

  // @ts-expect-error
  query.page("first", 10);

  // @ts-expect-error
  query.page(0, "ten");
});
