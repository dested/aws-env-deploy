#!/usr/bin/env node

import {exec} from 'child_process';
import * as fs from 'fs';
import * as mime from 'mime';
import * as path from 'path';
import * as yargs from 'yargs';

// const inArg = yargs.argv.in as any;

async function cExec(command: string) {
  return new Promise((res, rej) => {
    const process = exec(command);

    process.stdout.on('data', data => {
      console.log('stdout: ' + data.toString());
    });

    process.stderr.on('data', data => {
      console.log('stderr: ' + data.toString());
      rej();
    });

    process.on('exit', code => {
      console.log('child process exited with code ' + code.toString());
      res();
    });
  });
}

function findInDir(dir: string, fileList: string[] = []) {
  const entries = fs.readdirSync(dir);

  entries.forEach(file => {
    const filePath = path.join(dir, file);
    const fileStat = fs.lstatSync(filePath);

    if (fileStat.isDirectory()) {
      findInDir(filePath, fileList);
    } else {
      fileList.push(filePath);
    }
  });

  return fileList;
}

async function run() {
  const env = yargs.argv._[0];

  const configStr = fs.readFileSync('./env-config.json', {encoding: 'utf8'});
  const configBody: {
    region: string;
    kmsKeyDescription: string;
    kmsKeyId?: string;
    keyDefinitionOutput: string;
  } = JSON.parse(configStr);

  if (yargs.argv._[0] === 'create-key') {
    await cExec(`aws kms create-key --description ${configBody.kmsKeyDescription} --region ${configBody.region}`);
    console.log('Copy the KeyId above into your env-config.json file as kmsKeyId');
    return;
  }
  const envFile = fs.readFileSync(`./.env.${env}`, {encoding: 'utf8'});

  if (!env || !envFile) {
    throw new Error('Environment not found');
  }

  const envFileContents: {[key: string]: string} = require('dotenv').parse(envFile);

  if (configBody.keyDefinitionOutput) {
    fs.writeFileSync(
      configBody.keyDefinitionOutput,
      `// tslint:disable
export const EnvKeys=[${Object.keys(envFileContents)
        .map(k => `"${k}"`)
        .join(',')}];
export type EnvKeysTypes=${Object.keys(envFileContents)
        .map(k => `"${k}"`)
        .join('|')}`,
      {
        encoding: 'utf8',
      }
    );
    console.log('Wrote Key Definition File.');
  }
  if (!configBody.kmsKeyId) {
    console.log(
      'You are missing your kmsKeyId from env-config.json. Please run aws-env-deploy create-key to create a new one.'
    );
    return;
  }
  for (const key of Object.keys(envFileContents)) {
    console.log(`writing key /${configBody.kmsKeyDescription}-${env}/${key} to aws`);
    const command = `aws ssm put-parameter --name /${configBody.kmsKeyDescription}-${env}/${key} --value="${envFileContents[key]}" --type SecureString --key-id "${configBody.kmsKeyId}" --region ${configBody.region} --overwrite`;
    await cExec(command);
  }

  return;
}

run()
  .then(a => console.log('done'))
  .catch(e => console.error(e));
