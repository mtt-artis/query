import { expect, test } from "vite-plus/test";
import { Query } from "../src";

const items = [
  { name: "apple", price: 50, stock: 10 },
  { name: "banana", price: 20, stock: 0 },
  { name: "apricot", price: 120, stock: 5 },
  { name: "cherry", price: 30, stock: 15 },
];

test("Query.page", () => {
  const result = Query.selectFrom(items).orderBy("name", "asc").page(0, 2).execute();
  expect(result).toEqual([
    { name: "apple", price: 50, stock: 10 },
    { name: "apricot", price: 120, stock: 5 },
  ]);
});

test("Query.page second page", () => {
  const result = Query.selectFrom(items).orderBy("name", "asc").page(1, 2).execute();
  expect(result).toEqual([
    { name: "banana", price: 20, stock: 0 },
    { name: "cherry", price: 30, stock: 15 },
  ]);
});
