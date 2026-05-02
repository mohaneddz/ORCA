export const TAURI_CAPABILITIES = {
  window: {
    dragRegion: true,
    controls: true,
  },
  storage: {
    sql: true,
    store: true,
    fs: true,
  },
  system: {
    dialog: true,
    notification: true,
    http: true,
    opener: true,
  },
} as const;

