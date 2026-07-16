import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Lets `npm run dev` talk to the Vercel functions when using `vercel dev` alongside vite,
      // or you can just test the API routes after deploying. See README.
      "/api": "http://localhost:3000",
    },
  },
});
