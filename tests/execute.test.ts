import { expect, test } from "vite-plus/test";
import { Query } from "../src";

const items = [
  { name: "apple", price: 50, stock: 10 },
  { name: "banana", price: 20, stock: 0 },
  { name: "apricot", price: 120, stock: 5 },
  { name: "cherry", price: 30, stock: 15 },
];

test("Query.executeTakeFirst", () => {
  const result = Query.selectFrom(items).where("price", "<", 100).orderBy("name", "asc").executeTakeFirst();
  expect(result).toEqual({ name: "apple", price: 50, stock: 10 });
});

test("Query.executeTakeFirst no match", () => {
  const result = Query.selectFrom(items).where("price", "<", 10).executeTakeFirst();
  expect(result).toBeUndefined();
});

test("Query.executeTakeFirstOrThrow", () => {
  const result = Query.selectFrom(items).where("price", "<", 100).orderBy("name", "asc").executeTakeFirstOrThrow();
  expect(result).toEqual({ name: "apple", price: 50, stock: 10 });
});

test("Query.executeTakeFirstOrThrow no match throws", () => {
  expect(() => {
    Query.selectFrom(items).where("price", "<", 10).executeTakeFirstOrThrow();
  }).toThrow(Query.NotFoundError);
});
