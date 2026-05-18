import { NextResponse } from 'next/server';

const TURSO_URL = process.env.TURSO_URL || process.env.BORGMIND_DB_URL?.replace('libsql://', 'https://') || '';
const TURSO_TOKEN = process.env.TURSO_TOKEN || process.env.BORGMIND_TOKEN || '';

interface VaultSecret {
  name: string;
  description: string;
  lastModified: string;
  status: 'active' | 'expired' | 'warning';
}

export async function GET() {
  try {
    // Vault secrets - hardcoded for now, could be fetched from Turso or Azure KV
    const secrets: VaultSecret[] = [
      {
        name: 'TURSO_URL',
        description: 'Turso Database URL for BorgMind',
        lastModified: '2026-05-15',
        status: 'active'
      },
      {
        name: 'TURSO_TOKEN',
        description: 'Turso Auth Token (Pepper)',
        lastModified: '2026-05-15',
        status: 'active'
      },
      {
        name: 'JARVIS_TOKEN',
        description: 'Agent token for Jarvis',
        lastModified: '2026-05-10',
        status: 'active'
      },
      {
        name: 'TONY_TOKEN',
        description: 'Agent token for Tony',
        lastModified: '2026-05-10',
        status: 'active'
      },
      {
        name: 'RHODEY_TOKEN',
        description: 'Agent token for Rhodey',
        lastModified: '2026-05-10',
        status: 'active'
      },
      {
        name: 'OLLAMA_API_KEY',
        description: 'Ollama Cloud API Key',
        lastModified: '2026-05-17',
        status: 'active'
      },
      {
        name: 'AZURE_SP_SECRET',
        description: 'Azure Service Principal Secret',
        lastModified: '2026-04-20',
        status: 'warning'
      },
      {
        name: 'GITHUB_PAT',
        description: 'GitHub Personal Access Token',
        lastModified: '2026-03-15',
        status: 'expired'
      }
    ];

    return NextResponse.json({
      secrets,
      total: secrets.length,
      active: secrets.filter(s => s.status === 'active').length,
      expired: secrets.filter(s => s.status === 'expired').length,
      warning: secrets.filter(s => s.status === 'warning').length
    });
  } catch (error) {
    console.error('Vault API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vault secrets', secrets: [] },
      { status: 500 }
    );
  }
}
