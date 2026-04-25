import { randomUUID } from 'crypto';

import { rawDataSource } from 'src/database/typeorm/raw/raw.datasource';

type CompatibilityCheckResult = {
  name: string;
  status: 'passed' | 'failed';
  details?: string;
};

const REQUIRED_EXTENSIONS = ['uuid-ossp', 'unaccent', 'pgcrypto'] as const;

const createPassedCheckResult = (
  name: string,
  details?: string,
): CompatibilityCheckResult => ({
  name,
  status: 'passed',
  details,
});

const createFailedCheckResult = (
  name: string,
  error: unknown,
): CompatibilityCheckResult => ({
  name,
  status: 'failed',
  details: error instanceof Error ? error.message : `${error}`,
});

const runCheck = async (
  name: string,
  check: () => Promise<string | void>,
): Promise<CompatibilityCheckResult> => {
  try {
    const details = await check();

    return createPassedCheckResult(name, details);
  } catch (error) {
    return createFailedCheckResult(name, error);
  }
};

const assertCompatibleConnectionPort = () => {
  const databaseUrl = process.env.PG_DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('PG_DATABASE_URL is not defined');
  }

  const parsedDatabaseUrl = new URL(databaseUrl);

  if (parsedDatabaseUrl.port === '6543') {
    throw new Error(
      'PG_DATABASE_URL uses port 6543, which is commonly the Supabase transaction pooler. Use a direct or session-pooler connection for Twenty migrations and workspace DDL.',
    );
  }

  return parsedDatabaseUrl.port
    ? `Using database port ${parsedDatabaseUrl.port}`
    : 'Using default database port';
};

const checkConnection = async () => {
  const [connectionResult] = await rawDataSource.query<
    { current_database: string; current_user: string }[]
  >('SELECT current_database(), current_user');

  return `Connected to database "${connectionResult.current_database}" as "${connectionResult.current_user}"`;
};

const checkSchemaPrivileges = async () => {
  const temporarySchemaName = `twenty_supabase_check_${randomUUID().replaceAll(
    '-',
    '_',
  )}`;

  await rawDataSource.query(`CREATE SCHEMA "${temporarySchemaName}"`);
  await rawDataSource.query(`DROP SCHEMA "${temporarySchemaName}" CASCADE`);

  return 'CREATE SCHEMA and DROP SCHEMA succeeded';
};

const checkRequiredExtensions = async () => {
  for (const extensionName of REQUIRED_EXTENSIONS) {
    await rawDataSource.query(
      `CREATE EXTENSION IF NOT EXISTS "${extensionName}"`,
    );
  }

  return `Extensions are available: ${REQUIRED_EXTENSIONS.join(', ')}`;
};

const checkUnaccentImmutableFunction = async () => {
  await rawDataSource.query(`
    CREATE OR REPLACE FUNCTION public.unaccent_immutable(input text)
      RETURNS text
      LANGUAGE sql
      IMMUTABLE
    AS $$
      SELECT public.unaccent('public.unaccent'::regdictionary, input)
    $$;
  `);

  const [unaccentResult] = await rawDataSource.query<
    { normalized_value: string }[]
  >(`SELECT public.unaccent_immutable('Hôtel') AS "normalized_value"`);

  if (unaccentResult.normalized_value !== 'Hotel') {
    throw new Error(
      `Expected public.unaccent_immutable('Hôtel') to return "Hotel", received "${unaccentResult.normalized_value}"`,
    );
  }

  return 'public.unaccent_immutable(text) is available';
};

const checkGenRandomUuid = async () => {
  const [uuidResult] = await rawDataSource.query<{ generated_uuid: string }[]>(
    'SELECT gen_random_uuid()::text AS "generated_uuid"',
  );

  if (!uuidResult.generated_uuid) {
    throw new Error('gen_random_uuid() did not return a UUID');
  }

  return 'gen_random_uuid() is available';
};

const printCheckResult = (result: CompatibilityCheckResult) => {
  const prefix = result.status === 'passed' ? 'PASS' : 'FAIL';
  const details = result.details ? ` - ${result.details}` : '';

  // oxlint-disable-next-line no-console
  console.log(`${prefix}: ${result.name}${details}`);
};

const runSupabaseCompatibilityChecks = async () => {
  await rawDataSource.initialize();

  const checkResults = [
    await runCheck('connection pooler mode', async () =>
      assertCompatibleConnectionPort(),
    ),
    await runCheck('database connection', checkConnection),
    await runCheck('schema DDL privileges', checkSchemaPrivileges),
    await runCheck('required extensions', checkRequiredExtensions),
    await runCheck(
      'immutable unaccent function',
      checkUnaccentImmutableFunction,
    ),
    await runCheck('workspace UUID default', checkGenRandomUuid),
  ];

  checkResults.forEach(printCheckResult);

  const failedCheckResults = checkResults.filter(
    (checkResult) => checkResult.status === 'failed',
  );

  if (failedCheckResults.length > 0) {
    throw new Error(
      `${failedCheckResults.length} Supabase compatibility check(s) failed`,
    );
  }
};

runSupabaseCompatibilityChecks()
  .catch((error) => {
    // oxlint-disable-next-line no-console
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (rawDataSource.isInitialized) {
      await rawDataSource.destroy();
    }
  });
