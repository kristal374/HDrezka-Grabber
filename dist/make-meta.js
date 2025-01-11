import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { existsSync, readFileSync, writeFileSync } from 'fs';

const argv = yargs(hideBin(process.argv))
  .version(false)
  .option('version', {
    alias: 'v',
    type: 'string',
    description: 'Build version',
    demandOption: true,
  })
  .option('manifest-path', {
    alias: 'm',
    type: 'string',
    description: 'Path to manifest file',
    demandOption: true,
  })
  .help('h')
  .alias('h', 'help')
  .parse();

function validateVersion(version) {
  const versionMatch = version.match(/^(\d+(\.\d+){1,3})(?:\s(.+))?$/);
  if (!versionMatch) {
    throw new Error(
      `Invalid version format: "${version}". Expected format: "x.x.x" or "x.x.x additional-info".`,
    );
  }
  return versionMatch;
}

function updateManifest(manifestPath, version) {
  if (!existsSync(manifestPath)) {
    throw new Error(`Manifest file does not exist at path: ${manifestPath}`);
  }

  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

  console.log(`Updating manifest version to: "${version}"`);
  const versionMatch = validateVersion(version);

  manifest.version = versionMatch[1];
  if (manifest.manifest_version > 2) {
    manifest.version_name = versionMatch[0];
  }

  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
}

function main() {
  const { version: buildVersion, 'manifest-path': manifestPath } = argv;

  try {
    updateManifest(manifestPath, buildVersion);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

main();