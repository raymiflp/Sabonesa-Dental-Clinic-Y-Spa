$env:DATABASE_URL='postgresql://postgres@localhost:5432/betty_e2e'
$env:SKIP_RATE_LIMIT='true'
$env:JWT_SECRET='betty-dev-secret'
$env:PORT='3001'
node backend/src/index.js
