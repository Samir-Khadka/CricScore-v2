import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Unit + component tests. The seams under test are the public lib
// modules (pure helpers / view models) and card components rendered
// from props — never internals. See src/test/ for the suites.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.js"],
    include: ["src/**/*.test.{js,jsx}"],
  },
});
