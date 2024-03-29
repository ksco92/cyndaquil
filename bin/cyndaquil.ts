#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import CyndaquilStack from '../lib/cyndaquilStack';
import PipelineStack from '../lib/pipelineStack';
import MonitoringStack from '../lib/monitoringStack';

const app = new cdk.App();
const pipelineStack = new PipelineStack(app, 'PipelineStack', {
    env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION,
    },
});

const cyndaquilStack = new CyndaquilStack(app, 'CyndaquilStack', {
    env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION,
    },
});

pipelineStack.addDependency(cyndaquilStack);

const monitoringStack = new MonitoringStack(app, 'MonitoringStack', {
    env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION,
    },
    distribution: cyndaquilStack.distribution,
});

monitoringStack.addDependency(cyndaquilStack);
