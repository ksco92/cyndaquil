#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import CyndaquilStack from '../lib/cyndaquil-stack';
import PipelineStack from '../lib/pipelineStack';

const app = new cdk.App();
new PipelineStack(app, 'PipelineStack');
new CyndaquilStack(app, 'CyndaquilStack');
