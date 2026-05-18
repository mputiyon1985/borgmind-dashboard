import { NextResponse } from 'next/server';
import { SecretClient } from '@azure/keyvault-secrets';
import { DefaultAzureCredential, ClientSecretCredential } from '@azure/identity';

interface VaultSecret {
  name: string;
  description: string;
  lastModified: string;
  status: 'active' | 'expired' | 'warning';
  source: 'azure' | 'pass';
}

function getAzureCredential() {
  // Prefer service principal if env vars available
  const tenantId = process.env.AZURE_TENANT_ID;
  const clientId = process.env.AZURE_CLIENT_ID;
  const clientSecret = process.env.AZURE_CLIENT_SECRET;

  if (tenantId && clientId && clientSecret) {
    return new ClientSecretCredential(tenantId, clientId, clientSecret);
  }

  // Fallback to default Azure credential (works locally with az login, managed identity on Azure)
  return new DefaultAzureCredential();
}

async function getAzureSecrets(): Promise<VaultSecret[]> {
  const vaultName = process.env.AZURE_KEYVAULT_NAME || 'kv-cpapex';
  const vaultUrl = `https://${vaultName}.vault.azure.net`;

  try {
    const credential = getAzureCredential();
    const client = new SecretClient(vaultUrl, credential);

    const secrets: VaultSecret[] = [];
    for await (const secretProperties of client.listPropertiesOfSecrets()) {
      const updated = secretProperties.updatedOn;
      const created = secretProperties.createdOn;
      const dateStr = updated || created;
      const lastModified = dateStr ? dateStr.toISOString().split('T')[0] : 'unknown';

      let status: 'active' | 'expired' | 'warning' = 'active';
      if (!secretProperties.enabled) {
        status = 'expired';
      } else if (updated) {
        const daysOld = (Date.now() - updated.getTime()) / (1000 * 60 * 60 * 24);
        if (daysOld > 180) status = 'expired';
        else if (daysOld > 90) status = 'warning';
      }

      secrets.push({
        name: secretProperties.name,
        description: `Azure Key Vault (${vaultName}): ${secretProperties.name}`,
        lastModified,
        status,
        source: 'azure',
      });
    }

    return secrets;
  } catch (error) {
    console.error('[Vault] Azure Key Vault error:', error);
    return [];
  }
}

function getPassSecrets(): VaultSecret[] {
  // On Vercel, pass store isn't available — use env-based fallback
  const passSecretsEnv = process.env.PASS_SECRET_NAMES;
  if (passSecretsEnv) {
    return passSecretsEnv.split(',').map(name => ({
      name: name.trim(),
      description: `Local pass store: ${name.trim()}`,
      lastModified: 'unknown',
      status: 'active' as const,
      source: 'pass' as const,
    }));
  }

  // Local dev: try exec to pass
  try {
    const { execSync } = require('child_process');
    const storePath = `${process.env.HOME}/.password-store`;
    const entries = execSync(
      `find "${storePath}" -name "*.gpg" -type f 2>/dev/null | sed 's|${storePath}/||g' | sed 's|\\.gpg$||'`,
      { encoding: 'utf-8', timeout: 10000 }
    );
    const lines = entries.trim().split('\n').filter(Boolean);
    return lines.map((name: string) => {
      let modified = 'unknown';
      try {
        const stat = execSync(
          `stat -f "%Sm" -t "%Y-%m-%d" "${storePath}/${name}.gpg" 2>/dev/null || stat -c "%y" "${storePath}/${name}.gpg" 2>/dev/null | cut -d' ' -f1`,
          { encoding: 'utf-8', timeout: 5000 }
        ).trim();
        if (stat) modified = stat;
      } catch { /* ignore stat errors */ }
      return {
        name,
        description: `Local pass store: ${name}`,
        lastModified: modified,
        status: 'active' as const,
        source: 'pass' as const,
      };
    });
  } catch {
    return [];
  }
}

export async function GET() {
  try {
    const azureSecrets = await getAzureSecrets();
    const passSecrets = getPassSecrets();
    const secrets = [...azureSecrets, ...passSecrets];

    return NextResponse.json({
      secrets,
      total: secrets.length,
      active: secrets.filter((s) => s.status === 'active').length,
      expired: secrets.filter((s) => s.status === 'expired').length,
      warning: secrets.filter((s) => s.status === 'warning').length,
    });
  } catch (error) {
    console.error('Vault API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vault secrets', secrets: [] },
      { status: 500 }
    );
  }
}
