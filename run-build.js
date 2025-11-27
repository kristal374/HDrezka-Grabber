import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

const BASE_DIR = path.dirname(fileURLToPath(import.meta.url));
const BUILD_DIR = path.join(BASE_DIR, 'dist', 'build');
const TEMP_BUILD_DIR = path.join(BUILD_DIR, 'HDrezka-Grabber.build');
const PLATFORM_DIR = path.join(BASE_DIR, 'platform');
const PACKAGE_JSON_PATH = path.join(BASE_DIR, 'package.json');

const packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf-8'));

const platforms = fs.existsSync(PLATFORM_DIR)
  ? [...fs.readdirSync(PLATFORM_DIR), 'all']
  : ['all'];

const argv = yargs(hideBin(process.argv))
  .usage('Usage: $0 -b [browser] -p [package]')
  .option('browser', {
    alias: 'b',
    type: 'string',
    description: 'Browser for building',
    choices: platforms,
    default: 'all',
  })
  .option('package', {
    alias: 'p',
    type: 'boolean',
    description: 'Pack the result into an archive',
    default: false,
  })
  .option('silent', {
    alias: 's',
    type: 'boolean',
    description: 'Silent mode',
    default: true,
  })
  .help('h')
  .alias('h', 'help')
  .example([
    ['$0', 'Build for all browsers'],
    ['$0 -b all', 'Build for all browsers'],
    ['$0 -b chromium -p', 'Build for Chrome and pack the result into archive'],
  ])
  .parse();

function buildPackage(silent) {
  console.log('HDrezka-Grabber.build: Starting npm build');
  execSync(`npm run build${silent ? ' --silent' : ''}`, { stdio: 'inherit' });
  console.log('HDrezka-Grabber.build: npm build completed');
}

function buildForPlatforms(browser, version, shouldPackage) {
  platforms.forEach((platform) => {
    if (platform === 'all' || (browser !== 'all' && platform !== browser)) {
      return;
    }
    console.log(`\nHDrezka-Grabber.build: Building for platform: ${platform}`);

    const targetScript = path.join(PLATFORM_DIR, platform, 'make.js');
    const targetOutputDir = path.join(BUILD_DIR, `HDrezka-Grabber.${platform}`);

    if (!fs.existsSync(targetScript)) {
      console.log(
        `HDrezka-Grabber.build: Skipping platform ${platform}: make.js not found!`,
      );
      return;
    }
    execSync(
      `node ${targetScript} -o ${targetOutputDir} -v "${version}" -p ${shouldPackage}`,
      { stdio: 'inherit' },
    );
    console.log(
      `HDrezka-Grabber.build: Build for platform ${platform} completed`,
    );
  });
}

function main() {
  const { browser, package: shouldPackage, silent } = argv;
  const version = packageJson.version;
  const versionString = version.replace(' alpha', 'a').replace(' beta', 'b');

  const startTime = new Date();
  console.log(
    `*** HDrezka-Grabber-v${versionString}: run building packages ${startTime.toLocaleString()} ***\n`,
  );
  try {
    fs.rmSync(BUILD_DIR, { recursive: true, force: true });
    fs.mkdirSync(BUILD_DIR, { recursive: true });

    buildPackage(silent);
    buildForPlatforms(browser, version, shouldPackage);

    if (fs.existsSync(TEMP_BUILD_DIR)) {
      fs.rmSync(TEMP_BUILD_DIR, { recursive: true, force: true });
    }

    const endTime = new Date();
    const spentTime = (endTime.getTime() - startTime.getTime()) / 1000;
    console.log(
      `\n*** HDrezka-Grabber-v${versionString}: build packages was successful ${spentTime}s ***`,
    );
  } catch (error) {
    console.error(`Error during build process: ${error.message}`);
    process.exit(1);
  }
}

main();
