#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import 'source-map-support/register';
import { ContactStack } from '../lib/contact-stack';
import { StaticStack } from '../lib/static-stack';

const app = new cdk.App();
new StaticStack(app, 'StaticStack', {});
new ContactStack(app, 'ContactStack', {});