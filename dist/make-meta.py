#!/usr/bin/env python3

import json
import os
import re
import sys


def read_version(proj_dir: str):
    with open(os.path.join(proj_dir, "version")) as f:
        return f.read().strip()


def write_manifest(build_dir, data):
    with open(os.path.join(build_dir, "manifest.json"), 'w') as f:
        json.dump(data, f, indent=2, separators=(',', ': '), sort_keys=True)
        f.write('\n')


def read_manifest(build_dir):
    with open(os.path.join(build_dir, "manifest.json")) as f:
        return json.load(f)


def main():
    if len(sys.argv) <= 1:
        raise SystemExit("Build dir missing")

    proj_dir = os.path.split(os.path.abspath(__file__))[0]
    build_dir = os.path.abspath(sys.argv[1])

    version = re.search(r"^(\d+(\.\d+){1,3})(?:\s(.+))?$", read_version(proj_dir))
    manifest = read_manifest(build_dir)
    manifest["version"] = version[1]

    if manifest["manifest_version"] > 2:
        manifest["version_name"] = version[0]

    write_manifest(build_dir, manifest)


if __name__ == '__main__':
    main()
