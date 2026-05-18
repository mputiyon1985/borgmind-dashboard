import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    hasPassword: !!process.env.DASHBOARD_PASSWORD,
    passwordLength: process.env.DASHBOARD_PASSWORD?.length || 0,
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
    azureClientId: !!process.env.AZURE_CLIENT_ID,
    azureTenantId: !!process.env.AZURE_TENANT_ID,
    azureClientSecret: !!process.env.AZURE_CLIENT_SECRET,
    azureKeyVaultName: process.env.AZURE_KEYVAULT_NAME || null,
    passSecretNames: process.env.PASS_SECRET_NAMES || null,
  });
}
