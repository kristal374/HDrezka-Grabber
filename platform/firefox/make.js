// noinspection DuplicatedCode

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import zipper from 'zip-local';

const PACKAGE_NAME = `HDrezka-Grabber.firefox`;
const CURRENT_DIR = path.dirname(fileURLToPath(import.meta.url));
const BASE_DIR = path.resolve(CURRENT_DIR, '..', '..');

const argv = yargs(hideBin(process.argv))
  .version(false)
  .option('version', {
    alias: 'v',
    type: 'string',
    description:
      'Extension version. Format: "x.x.x" or "x.x.x additional-info"',
    demandOption: true,
  })
  .option('build-number', {
    alias: 'n',
    type: 'number',
    description: 'Number of the build',
    default: 1,
  })
  .option('output-dir', {
    alias: 'o',
    type: 'string',
    description: 'Output directory',
    demandOption: true,
  })
  .option('zip', {
    alias: 'z',
    type: 'boolean',
    description: 'Pack the result into an archive',
    default: false,
  })
  .option('keep-dist-dir', {
    alias: 'k',
    type: 'boolean',
    description: 'Keep the "dist" directory after archiving',
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

  const requirements = [['src', 'img'], ['src', '_locales'], ['CHANGELOG.md']];
  requirements.forEach((reqPath) => {
    fs.cpSync(
      path.join(BASE_DIR, ...reqPath),
      path.join(distDir, reqPath.at(-1)),
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

function generateManifestMeta(distDir, version, build) {
  log(`Generating meta files`);

  const metaScript = path.join(BASE_DIR, 'dist', 'make-meta.js');
  const manifestPath = path.join(distDir, 'manifest.json');

  execSync(
    `node ${metaScript} -m ${manifestPath} -v "${version}" -b "${build}"`,
    {
      stdio: 'inherit',
    },
  );
}

function makePackage(distDir, shouldPackage, keepDistDir) {
  if (shouldPackage) {
    log(`Creating archive`);
    try {
      zipper.sync.zip(distDir).compress().save(`${distDir}.xpi`);
      log(`Archive created at: ${distDir}.xpi`);
      if (!keepDistDir) {
        fs.rmSync(distDir, { recursive: true, force: true });
        log(`The build directory has been deleted`);
      }
    } catch (error) {
      throw new Error(`Failed to create archive: ${error.message}`);
    }
  } else {
    log(`Skipping archive creation`);
  }
}

const main = () => {
  const {
    version: extensionVersion,
    zip: shouldPackage,
    'keep-dist-dir': keepDistDir,
    'output-dir': outputDir,
    'build-number': buildNumber,
  } = argv;

  try {
    log(`Starting build process`);
    prepareDistDir(outputDir);
    generateCommonFiles(outputDir);
    generateSpecificFiles(outputDir);
    generateManifestMeta(outputDir, extensionVersion, buildNumber);
    makePackage(outputDir, shouldPackage, keepDistDir);
    log(`Build completed successfully`);
    process.exit(0);
  } catch (error) {
    console.error(`${PACKAGE_NAME}: Error - ${error.message}`);
    process.exit(1);
  }
};

main();
