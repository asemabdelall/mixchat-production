import * as fs from 'fs';
import * as path from 'path';

function checkContracts() {
  const openApiPath = path.resolve(process.cwd(), '../mixchat-backend/openapi.json');
  const generatedTypesPath = path.resolve(
    process.cwd(),
    'src/services/api/types/api.generated.ts',
  );

  if (!fs.existsSync(openApiPath)) {
    console.error(`❌ Backend openapi.json not found at: ${openApiPath}`);
    console.error('Run `npm run openapi:export` in mixchat-backend first.');
    process.exit(1);
  }

  if (!fs.existsSync(generatedTypesPath)) {
    console.error(`❌ Generated contracts not found at: ${generatedTypesPath}`);
    console.error('Run `npm run api:generate` in mixchat-frontend.');
    process.exit(1);
  }

  const openApiStat = fs.statSync(openApiPath);
  const typesStat = fs.statSync(generatedTypesPath);

  // If OpenAPI spec is newer than generated types by more than 2 seconds, warn/fail
  if (openApiStat.mtimeMs > typesStat.mtimeMs + 2000) {
    console.error('❌ Stale frontend API contracts detected!');
    console.error(
      `OpenAPI spec updated at ${new Date(openApiStat.mtime).toISOString()}, but generated types are from ${new Date(typesStat.mtime).toISOString()}.`,
    );
    console.error('Run `npm run api:generate` to regenerate.');
    process.exit(1);
  }

  console.log('✅ API contracts are in sync with backend OpenAPI specification.');
}

checkContracts();
