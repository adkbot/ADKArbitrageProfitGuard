import { spawn } from 'node:child_process';
import { rm } from 'node:fs/promises';

interface Step {
  name: string;
  command: string;
  args: string[];
  cleanup?: () => Promise<void>;
}

async function runStep(step: Step): Promise<boolean> {
  console.log(`\n➡️  ${step.name}`);
  const exitCode = await new Promise<number>((resolve) => {
    const child = spawn(step.command, step.args, {
      stdio: 'inherit',
      shell: process.platform === 'win32'
    });

    child.on('error', (error) => {
      console.error(`   ↳ Failed to launch: ${error.message}`);
      resolve(1);
    });

    child.on('exit', (code) => {
      resolve(code ?? 1);
    });
  });

  if (step.cleanup) {
    await step.cleanup();
  }

  if (exitCode === 0) {
    console.log(`   ✅ ${step.name} passed`);
    return true;
  }

  console.log(`   ❌ ${step.name} failed (exit code ${exitCode})`);
  return false;
}

async function main() {
  const clientOutDir = 'dist-verify-client';
  const serverOutDir = 'dist-verify-server';

  await rm(clientOutDir, { recursive: true, force: true });
  await rm(serverOutDir, { recursive: true, force: true });

  const steps: Step[] = [
    {
      name: 'Type checking shared utilities',
      command: 'npx',
      args: ['tsc', '--noEmit', '--project', 'tsconfig.shared.json']
    },
    {
      name: 'Type checking server code',
      command: 'npx',
      args: ['tsc', '--noEmit', '--project', 'tsconfig.server.json']
    },
    {
      name: 'Type checking client code',
      command: 'npx',
      args: ['tsc', '--noEmit', '--project', 'tsconfig.client.json']
    },
    {
      name: 'Building client bundle',
      command: 'npx',
      args: ['vite', 'build', '--outDir', clientOutDir, '--emptyOutDir'],
      cleanup: () => rm(clientOutDir, { recursive: true, force: true })
    },
    {
      name: 'Bundling server entrypoint',
      command: 'npx',
      args: [
        'esbuild',
        'server/index.ts',
        '--platform=node',
        '--packages=external',
        '--bundle',
        '--format=esm',
        `--outdir=${serverOutDir}`
      ],
      cleanup: () => rm(serverOutDir, { recursive: true, force: true })
    }
  ];

  const results = await Promise.all(steps.map((step) => runStep(step)));

  const failed = results.filter((success) => !success).length;

  if (failed === 0) {
    console.log('\n✅ Fractional verification completed successfully.');
  } else {
    console.log(`\n⚠️  Fractional verification completed with ${failed} failure(s).`);
  }

  return failed === 0;
}

main()
  .then((allPassed) => {
    if (!allPassed) {
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error(`\n❌ Fractional verification failed: ${error.message}`);
    process.exit(1);
  });
