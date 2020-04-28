#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const fs = require("fs");
const path = require("path");
const yargs = require("yargs");
// const inArg = yargs.argv.in as any;
async function cExec(command) {
    return new Promise((res, rej) => {
        const process = child_process_1.exec(command);
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
function findInDir(dir, fileList = []) {
    const entries = fs.readdirSync(dir);
    entries.forEach(file => {
        const filePath = path.join(dir, file);
        const fileStat = fs.lstatSync(filePath);
        if (fileStat.isDirectory()) {
            findInDir(filePath, fileList);
        }
        else {
            fileList.push(filePath);
        }
    });
    return fileList;
}
async function run() {
    const env = yargs.argv._[0];
    const configStr = fs.readFileSync('./env-config.json', { encoding: 'utf8' });
    const configBody = JSON.parse(configStr);
    if (yargs.argv._[0] === 'create-key') {
        await cExec(`aws kms create-key --description ${configBody.kmsKeyDescription} --region ${configBody.region}`);
        console.log('Copy the KeyId above into your env-config.json file as kmsKeyId');
        return;
    }
    const envFile = fs.readFileSync(`./.env.${env}`, { encoding: 'utf8' });
    if (!env || !envFile) {
        throw new Error('Environment not found');
    }
    const envFileContents = require('dotenv').parse(envFile);
    if (configBody.keyDefinitionOutput) {
        fs.writeFileSync(configBody.keyDefinitionOutput, `// tslint:disable
export const EnvKeys=[${Object.keys(envFileContents)
            .map(k => `"${k}"`)
            .join(',')}];
export type EnvKeysTypes=${Object.keys(envFileContents)
            .map(k => `"${k}"`)
            .join('|')}`, {
            encoding: 'utf8',
        });
        console.log('Wrote Key Definition File.');
    }
    if (!configBody.kmsKeyId) {
        console.log('You are missing your kmsKeyId from env-config.json. Please run aws-env-deploy create-key to create a new one.');
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFFQSxpREFBbUM7QUFDbkMseUJBQXlCO0FBRXpCLDZCQUE2QjtBQUM3QiwrQkFBK0I7QUFFL0Isc0NBQXNDO0FBRXRDLEtBQUssVUFBVSxLQUFLLENBQUMsT0FBZTtJQUNsQyxPQUFPLElBQUksT0FBTyxDQUFDLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxFQUFFO1FBQzlCLE1BQU0sT0FBTyxHQUFHLG9CQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7UUFFOUIsT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxFQUFFO1lBQy9CLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO1FBQzVDLENBQUMsQ0FBQyxDQUFDO1FBRUgsT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxFQUFFO1lBQy9CLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO1lBQzFDLEdBQUcsRUFBRSxDQUFDO1FBQ1IsQ0FBQyxDQUFDLENBQUM7UUFFSCxPQUFPLENBQUMsRUFBRSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsRUFBRTtZQUN4QixPQUFPLENBQUMsR0FBRyxDQUFDLGlDQUFpQyxHQUFHLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO1lBQ2pFLEdBQUcsRUFBRSxDQUFDO1FBQ1IsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUM7QUFFRCxTQUFTLFNBQVMsQ0FBQyxHQUFXLEVBQUUsV0FBcUIsRUFBRTtJQUNyRCxNQUFNLE9BQU8sR0FBRyxFQUFFLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lB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