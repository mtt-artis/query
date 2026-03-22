import { expect, test } from "vite-plus/test";
import { Query } from "../src";

const items = [
  { name: "apple", price: 50, stock: 10 },
  { name: "banana", price: 20, stock: 0 },
  { name: "apricot", price: 120, stock: 5 },
  { name: "cherry", price: 30, stock: 15 },
];

test("Query.filterFn.includes", () => {
  const result = Query.selectFrom(items).where(Query.filterFn.includes("name", "a")).execute();
  expect(result).toEqual([
    { name: "apple", price: 50, stock: 10 },
    { name: "banana", price: 20, stock: 0 },
    { name: "apricot", price: 120, stock: 5 },
  ]);
});

test("Query.filterFn.startsWith", () => {
  const result = Query.selectFrom(items).where(Query.filterFn.startsWith("name", "ap")).execute();
  expect(result).toEqual([
    { name: "apple", price: 50, stock: 10 },
    { name: "apricot", price: 120, stock: 5 },
  ]);
});

test("Query.filterFn.endsWith", () => {
  const result = Query.selectFrom(items).where(Query.filterFn.endsWith("name", "e")).execute();
  expect(result).toEqual([{ name: "apple", price: 50, stock: 10 }]);
});

test("Query.filterFn.lt", () => {
  const result = Query.selectFrom(items).where(Query.filterFn.lt("price", 50)).execute();
  expect(result).toEqual([
    { name: "banana", price: 20, stock: 0 },
    { name: "cherry", price: 30, stock: 15 },
  ]);
});

test("Query.filterFn.eq", () => {
  const result = Query.selectFrom(items).where(Query.filterFn.eq("price", 50)).execute();
  expect(result).toEqual([{ name: "apple", price: 50, stock: 10 }]);
});

test("Query.filterFn.isTruthy", () => {
  const result = Query.selectFrom(items).where(Query.filterFn.isTruthy("stock")).execute();
  expect(result).toEqual([
    { name: "apple", price: 50, stock: 10 },
    { name: "apricot", price: 120, stock: 5 },
    { name: "cherry", price: 30, stock: 15 },
  ]);
});

test("Query.filterFn.and", () => {
  const result = Query.selectFrom(items)
    .where(Query.filterFn.and(Query.filterFn.includes("name", "a"), Query.filterFn.lt("price", 100)))
    .execute();
  expect(result).toEqual([
    { name: "apple", price: 50, stock: 10 },
    { name: "banana", price: 20, stock: 0 },
  ]);
});

test("Query.filterFn.or", () => {
  const result = Query.selectFrom(items)
    .where(Query.filterFn.or(Query.filterFn.eq("name", "apple"), Query.filterFn.eq("name", "cherry")))
    .execute();
  expect(result).toEqual([
    { name: "apple", price: 50, stock: 10 },
    { name: "cherry", price: 30, stock: 15 },
  ]);
});

test("Query.filterFn.not", () => {
  const result = Query.selectFrom(items)
    .where(Query.filterFn.not(Query.filterFn.includes("name", "a")))
    .execute();
  expect(result).toEqual([{ name: "cherry", price: 30, stock: 15 }]);
});
