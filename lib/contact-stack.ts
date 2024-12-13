#!/usr/bin/env node
import { CfnOutput, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { ApiKey, ApiKeySourceType, Cors, LambdaIntegration, RestApi, UsagePlan } from 'aws-cdk-lib/aws-apigateway';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { EmailIdentity, Identity } from 'aws-cdk-lib/aws-ses';
import { Construct } from 'constructs';
import path = require('path');

export class ContactStack extends Stack {
  constructor(scope: Construct, name: string, props?: StackProps) {
    super(scope, name, props);

    const verifiedEmail = 'andrewcarlisle95@gmail.com';

    const identity = Identity.email(verifiedEmail);

    const emailIdent = new EmailIdentity(this, "SESIdentity", {
      identity,
    });

    emailIdent.applyRemovalPolicy(RemovalPolicy.DESTROY);

    // 2. Create our Lambda functions to handle requests
    const sendEmailLambda = new NodejsFunction(this, "SendEmailLambda", {
      runtime: Runtime.NODEJS_20_X, // Choose any supported Node.js runtime
    //   code: Code.fromAsset('lambda'), // Points to the lambda directory
      entry: './lambda/index.ts',
      handler: 'handler', // Points to the 'hello' file in the lambda directory
      environment: {
        VERIFIED_EMAIL: verifiedEmail,
      },
      bundling: {
        externalModules: ['@aws-sdk/client-ses', 'aws-lambda'],
        minify: false
      },
      initialPolicy: [
        new PolicyStatement({
          actions: ["ses:SendEmail"],
          resources: [
            `arn:aws:ses:${this.region}:${this.account}:identity/${identity.value}`,
          ],
        }),
      ],
    });
    sendEmailLambda.applyRemovalPolicy(RemovalPolicy.DESTROY);
    // 3. Define our REST API
    const api = new RestApi(this, "EmailApi", {
      restApiName: "EmailApi",
      defaultCorsPreflightOptions: {
        //allowCredentials: true,
        //allowHeaders: ['x-api-key', 'Content-Type'],
        allowOrigins: Cors.ALL_ORIGINS, // TODO CHANGE THIS FOR PROD
        allowMethods: ["PUT", "OPTIONS"],
      },
      apiKeySourceType: ApiKeySourceType.HEADER,
    });
    api.applyRemovalPolicy(RemovalPolicy.DESTROY);
    
    // 4. Create our API Key
    const apiKey = new ApiKey(this, "EmailApiKey");
    
    // 5. Create a usage plan and add the API key to it
    const usagePlan = new UsagePlan(this, "EmailUsagePlan", {
      name: "Email Usage Plan",
      apiStages: [
        {
          api,
          stage: api.deploymentStage,
        },
      ],
    });
    
    usagePlan.addApiKey(apiKey);
    
    // 6. Connect our Lambda functions to our API Gateway endpoints
    const sendEmailIntegration = new LambdaIntegration(sendEmailLambda);
    
    // 7. Define a POST handler on the root of our API
    api.root.addMethod("POST", sendEmailIntegration, {
      apiKeyRequired: true,
    });
    // Misc: Outputs
    new CfnOutput(this, "API Key ID", {
      value: apiKey.keyId,
    });
  };
}