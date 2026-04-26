type SupabaseOidcDiscoveryDocument = {
  issuer?: string;
  authorization_endpoint?: string;
  token_endpoint?: string;
  userinfo_endpoint?: string;
  jwks_uri?: string;
  scopes_supported?: string[];
  response_types_supported?: string[];
};

const REQUIRED_DISCOVERY_FIELDS = [
  'issuer',
  'authorization_endpoint',
  'token_endpoint',
  'userinfo_endpoint',
  'jwks_uri',
] as const;

const buildDiscoveryUrl = (issuerUrl: string) => {
  const normalizedIssuerUrl = issuerUrl.replace(/\/$/, '');

  return `${normalizedIssuerUrl}/.well-known/openid-configuration`;
};

const assertStringField = (
  discoveryDocument: SupabaseOidcDiscoveryDocument,
  fieldName: (typeof REQUIRED_DISCOVERY_FIELDS)[number],
) => {
  const value = discoveryDocument[fieldName];

  if (!value || typeof value !== 'string') {
    throw new Error(`OIDC discovery document is missing ${fieldName}`);
  }
};

const checkSupabaseOidcDiscovery = async () => {
  const issuerUrl = process.env.SUPABASE_AUTH_ISSUER_URL;

  if (!issuerUrl) {
    throw new Error(
      'SUPABASE_AUTH_ISSUER_URL must point at the Supabase Auth issuer, for example https://supabase.example.com/auth/v1',
    );
  }

  const discoveryUrl = buildDiscoveryUrl(issuerUrl);
  const response = await fetch(discoveryUrl);

  if (!response.ok) {
    throw new Error(
      `Failed to fetch Supabase OIDC discovery metadata from ${discoveryUrl}: ${response.status} ${response.statusText}`,
    );
  }

  const discoveryDocument =
    (await response.json()) as SupabaseOidcDiscoveryDocument;

  for (const fieldName of REQUIRED_DISCOVERY_FIELDS) {
    assertStringField(discoveryDocument, fieldName);
  }

  if (!discoveryDocument.scopes_supported?.includes('openid')) {
    throw new Error('OIDC discovery metadata must support the openid scope');
  }

  if (!discoveryDocument.response_types_supported?.includes('code')) {
    throw new Error(
      'OIDC discovery metadata must support the authorization code response type',
    );
  }

  // oxlint-disable-next-line no-console
  console.log(
    `Supabase Auth OIDC discovery metadata is compatible: ${discoveryDocument.issuer}`,
  );
};

checkSupabaseOidcDiscovery().catch((error) => {
  // oxlint-disable-next-line no-console
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
