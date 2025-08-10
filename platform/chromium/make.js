import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import zipper from 'zip-local';

const PACKAGE_NAME = `HDrezka-Grabber.chromium`;
const CURRENT_DIR = path.dirname(fileURLToPath(import.meta.url));
const BASE_DIR = path.resolve(CURRENT_DIR, '..', '..');

const argv = yargs(hideBin(process.argv))
  .version(false)
  .option('version', {
    alias: 'v',
    type: 'string',
    description: 'Build version',
    demandOption: true,
  })
  .option('output-dir', {
    alias: 'o',
    type: 'string',
    description: 'Output directory',
    demandOption: true,
  })
  .option('package', {
    alias: 'p',
    type: 'boolean',
    description: 'Pack the result into an archive',
    default: false,
  })
  .help('h')
  .alias('h', 'help')
  .parse();

const log = (message) => console.log(`${PACKAGE_NAME}: ${message}`);

function prepareDistDir(distDir) {
  fs.rmSync(distDir, { recursive: true, force: true });
  fs.mkdirSync(distDir, { recursive: true });
}

function generateCommonFiles(distDir) {
  log('Copying common files');

  const buildDir = path.resolve(distDir, '..', 'HDrezka-Grabber.build');
  fs.cpSync(buildDir, distDir, { recursive: true });

  const requirements = ['img', '_locales'];
  requirements.forEach((reqPath) => {
    fs.cpSync(
      path.join(BASE_DIR, 'src', reqPath),
      path.join(distDir, reqPath),
      { recursive: true },
    );
  });
}

function generateSpecificFiles(distDir) {
  log(`Copying specific files`);

  fs.copyFileSync(
    path.join(CURRENT_DIR, 'manifest.json'),
    path.join(distDir, 'manifest.json'),
  );
}

function generateManifestMeta(distDir, version) {
  log(`Generating meta files`);

  const metaScript = path.join(BASE_DIR, 'dist', 'make-meta.js');
  const manifestPath = path.join(distDir, 'manifest.json');

  execSync(`node ${metaScript} -m ${manifestPath} -v "${version}"`, {
    stdio: 'inherit',
  });
}

function makePackage(distDir, shouldPackage) {
  if (shouldPackage) {
    log(`Creating archive`);
    try {
      zipper.sync.zip(distDir).compress().save(`${distDir}.zip`);
      log(`Archive created at: ${distDir}.zip`);
    } catch (error) {
      throw new Error(`Failed to create archive: ${error.message}`);
    }
  } else {
    log(`Skipping archive creation`);
  }
}

const main = () => {
  const {
    version: buildVersion,
    package: shouldPackage,
    'output-dir': outputDir,
  } = argv;

  try {
    log(`Starting build process`);
    prepareDistDir(outputDir);
    generateCommonFiles(outputDir);
    generateSpecificFiles(outputDir);
    generateManifestMeta(outputDir, buildVersion);
    makePackage(outputDir, shouldPackage);
    log(`Build completed successfully`);
    process.exit(0);
  } catch (error) {
    console.error(`${PACKAGE_NAME}: Error - ${error.message}`);
    process.exit(1);
  }
};

main();
