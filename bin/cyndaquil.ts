#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import CyndaquilStack from '../lib/cyndaquil-stack';
import PipelineStack from '../lib/pipelineStack';

const app = new cdk.App();
new PipelineStack(app, 'PipelineStack', {
    env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION,
    },
});
new CyndaquilStack(app, 'CyndaquilStack', {
    env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION,
    },
});
