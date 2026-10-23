import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// vitest globals are off, so register RTL's unmount-between-tests
// explicitly — otherwise renders accumulate in one document.
afterEach(() => cleanup());
