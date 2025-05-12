export const environment = {
  production: false,
  supabase: {
    url: "https://obmufgumrrxjvgjquqro.supabase.co",
    anonKey:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ibXVmZ3VtcnJ4anZnanF1cXJvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNzY3NjQxNSwiZXhwIjoyMDUzMjUyNDE1fQ.J-28YlgQ1gpb7fPr1SHFpl_BzdX1V39rj1ciAVK_VLM",
  },
  defaultVideoId: "fUehe82E5yU",
  defaultChannelId: "UCZ5heNyv3s5dIw9mtjsAGsg",
  codeGenerationInterval: 10 * 60 * 60 * 1000, // 10 hours in milliseconds
  cleanupInterval: 3600000, // 1 hour in milliseconds
  storageRetentionDays: 30,
  clientFeatures: {
    contextMenuDisabled: true,
    reloadDisabled: true,
    orientationLock: true,
    newsTickerEnabled: true,
  },
  supabaseUrl: "YOUR_SUPABASE_URL",
  supabaseKey: "YOUR_SUPABASE_KEY",
};
