/* TMC staff portal — Supabase config.
   These values are PUBLIC by design (the anon key is meant to ship in client code;
   access is enforced server-side by Row Level Security). Fill in your anon key.

   Where to find them:  Supabase dashboard → Project Settings → API
     • Project URL        → url
     • anon / public key  → anonKey
   Optional (enables Google One Tap): your Google "Web application" OAuth client ID
   (the same one configured in Supabase → Authentication → Providers → Google). */
window.TMC_SUPABASE = {
  url: 'https://qeqonnfmchoyxrcadocp.supabase.co',
  anonKey: 'PASTE_YOUR_SUPABASE_ANON_KEY_HERE',
  googleClientId: '' // optional — paste your Google web client ID to enable One Tap
};
