import { NextResponse } from 'next/server';
import { execSync } from 'child_process';
import { isAuthenticated, unauthorizedResponse } from '@/lib/auth';

interface VaultSecret {
  name: string;
  description: string;
  lastModified: string;
  status: 'active' | 'expired' | 'warning';
  source: 'azure' | 'pass';
}

function getPassSecrets(): VaultSecret[] {
  try {
    const storePath = `${process.env.HOME}/.password-store`;
    const entries = execSync(
      `find "${storePath}" -name "*.gpg" -type f 2>/dev/null | sed 's|${storePath}/||g' | sed 's|\\.gpg$||'`,
      { encoding: 'utf-8', timeout: 10000 }
    );
    const lines = entries.trim().split('\n').filter(Boolean);
    return lines.map((name) => {
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

function getAzureSecrets(): VaultSecret[] {
  try {
    const raw = execSync(
      'az keyvault secret list --vault-name "kv-cpapex" --subscription "Visual Studio Enterprise – MPN" 2>/dev/null',
      { encoding: 'utf-8', timeout: 30000, env: { ...process.env, AZURE_CORE_ONLY_SHOW_ERRORS: '1' } }
    );
    const secrets = JSON.parse(raw);
    return secrets.map((s: any) => {
      const updated = s.attributes?.updated;
      const created = s.attributes?.created;
      const dateStr = updated || created || 'unknown';
      // Format: 2026-04-30T11:30:23+00:00 → 2026-04-30
      const lastModified = dateStr ? dateStr.split('T')[0] : 'unknown';
      const enabled = s.attributes?.enabled ?? true;
      // Compute status based on age
      let status: 'active' | 'expired' | 'warning' = 'active';
      if (!enabled) {
        status = 'expired';
      } else if (updated) {
        const daysOld = (Date.now() - new Date(updated).getTime()) / (1000 * 60 * 60 * 24);
        if (daysOld > 180) status = 'expired';
        else if (daysOld > 90) status = 'warning';
      }
      return {
        name: s.name,
        description: `Azure Key Vault (kv-cpapex): ${s.name}`,
        lastModified,
        status,
        source: 'azure' as const,
      };
    });
  } catch {
    return [];
  }
}

export async function GET(request: Request) {
  if (!isAuthenticated(request)) {
    return unauthorizedResponse();
  }

  try {
    const passSecrets = getPassSecrets();
    const azureSecrets = getAzureSecrets();
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
