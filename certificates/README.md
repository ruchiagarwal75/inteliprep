The public Supabase Root 2021 CA is bundled to verify the database certificate
and pooler hostname; TLS verification is never disabled.

Source: https://supabase-downloads.s3-ap-southeast-1.amazonaws.com/prod/ssl/prod-ca-2021.crt
SHA-256: 80:70:25:AD:50:D4:ED:21:9D:2C:9C:7D:29:9C:00:4F:82:4E:B0:0C:F7:F6:5A:FE:F6:07:D0:7B:72:E6:CA:FA

This is a public certificate, not a database credential. If Supabase rotates its
CA, replace it with the certificate downloaded from the project's Database
Settings, verify the new certificate, and redeploy.
