import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The built app is served by the UNO Q itself, so asset paths must be
// relative ('./') — the board may serve it from a sub-folder.
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    // Point this at the board while developing against real data, e.g.
    // http://192.168.4.1:7000. Ask the backend team for the host and port.
    proxy: {
      '/socket.io': { target: 'http://localhost:7000', ws: true },
      '/api': { target: 'http://localhost:7000' },
    },
  },
})
