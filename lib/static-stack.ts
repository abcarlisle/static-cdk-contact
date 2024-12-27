#!/usr/bin/env node
import { CfnOutput, Duration, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as cloudfront_origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import { Construct } from 'constructs';
import path = require('path');

//export interface StaticSiteProps {
  //domainName: string;
  //siteSubDomain: string;
//}

/**
 * Static site infrastructure, which deploys site content to an S3 bucket.
 *
 * The site redirects from HTTP to HTTPS, using a CloudFront distribution,
 * Route53 alias record, and ACM certificate.
 */
export class StaticStack extends Stack {
  constructor(scope: Construct, name: string, props?: StackProps) {
    super(scope, name, props);
     
    const domainName = 'andrewcarlisle.org';
    const siteDomain = 'www' + '.' + domainName;


    const hostedZone = route53.HostedZone.fromLookup(this, 'Zone',  { domainName: domainName});
          
    new CfnOutput(this, 'Site', { value: 'https://' + siteDomain });

    const certificate = new acm.DnsValidatedCertificate(this, 'SiteCertificate', {
          domainName: domainName,
          subjectAlternativeNames: ['*.' + domainName],
              hostedZone: hostedZone,
              region: 'us-east-1', // Cloudfront only checks this region for certificates
        });
        certificate.applyRemovalPolicy(RemovalPolicy.DESTROY);
        new CfnOutput(this, 'Certificate', { value: certificate.certificateArn });

     const s3CorsRule: s3.CorsRule = {
      allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.HEAD],
      allowedOrigins: ['*'],
      allowedHeaders: ['*'],
      maxAge: 300,
    }; 
    //const zone = route53.HostedZone.fromLookup(scope, 'Zone', { domainName: props.domainName });
    //const siteDomain = props.siteSubDomain + '.' + props.domainName;
    const cloudfrontOAI = new cloudfront.OriginAccessIdentity(this, 'cloudfront-OAI', {
      comment: `OAI for ${name}`
    });

    //new CfnOutput(this, 'Site', { value: 'https://' + siteDomain });

    // Content bucket
    const siteBucket = new s3.Bucket(this, 'SiteBucket', {
      bucketName: "etfwebsitecloud",
      accessControl: s3.BucketAccessControl.PRIVATE,
      cors: [s3CorsRule],
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,

      /**
       * The default removal policy is RETAIN, which means that cdk destroy will not attempt to delete
       * the new bucket, and it will remain in your account until manually deleted. By setting the policy to
       * DESTROY, cdk destroy will attempt to delete the bucket, but will error if the bucket is not empty.
       */
      removalPolicy: RemovalPolicy.DESTROY, // NOT recommended for production code

      /**
       * For sample purposes only, if you create an S3 bucket then populate it, stack destruction fails.  This
       * setting will enable full cleanup of the demo.
       */
      autoDeleteObjects: true, // NOT recommended for production code
    });
    siteBucket.grantRead(cloudfrontOAI);

    // Grant access to cloudfront
    //siteBucket.addToResourcePolicy(new iam.PolicyStatement({
    //  actions: ['s3:GetObject'],
    //  resources: [siteBucket.arnForObjects('*')],
    //  principals: [new iam.CanonicalUserPrincipal(cloudfrontOAI.cloudFrontOriginAccessIdentityS3CanonicalUserId)]
    //}));
    //new CfnOutput(this, 'Bucket', { value: siteBucket.bucketName });

    // TLS certificate
    //const certificate = new acm.Certificate(this, 'SiteCertificate');//, {
      //domainName: siteDomain,
      //validation: acm.CertificateValidation.fromDns(zone),
    //});

    //new CfnOutput(this, 'Certificate', { value: certificate.certificateArn });

    //const distribution = new cloudfront.CloudFrontWebDistribution(this, 'BackendCF', { // this whole thing polly has to go sad
    //  originConfigs: [
    //    {
    //      s3OriginSource: { // UPDATE THIS TO BE HTTP ORIGIN NOT S3ORIGING
    //        s3BucketSource: siteBucket,
    //        originAccessIdentity: cloudfrontOAI,
    //      },
    //      behaviors: [{isDefaultBehavior: true}, { pathPattern: '/*', allowedMethods: cloudfront.CloudFrontAllowedMethods.GET_HEAD }]
    //    },
    //  ],
    //});
    // CloudFront distribution
    const distribution = new cloudfront.Distribution(this, 'SiteDistribution', {
      certificate: certificate,
      defaultRootObject: "index.html",
      domainNames: [siteDomain, domainName],
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
      errorResponses:[
        {
          httpStatus: 404,
          responseHttpStatus: 404,
          responsePagePath: '/error.html',
          ttl: Duration.minutes(30)
        }
      ],
      defaultBehavior: {
        origin: new cloudfront_origins.S3Origin(siteBucket, {originAccessIdentity: cloudfrontOAI}),
        compress: true,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      }
    })

    
    new CfnOutput(this, 'Domain', { value: distribution.distributionDomainName});
    new CfnOutput(this, 'DistributionId', { value: distribution.distributionId });

    // Route53 alias record for the CloudFront distribution
    //new route53.ARecord(this, 'SiteAliasRecord', {
      //recordName: siteDomain,
      //target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution)),
      //zone
    //});

    new route53.ARecord(this, 'WWWSiteAliasRecord', {
          zone: hostedZone,
          recordName: siteDomain,
          target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution))
        });
        //5.2 Add an 'A' record to Route 53 for 'example.com'
        new route53.ARecord(this, 'SiteAliasRecord', {
          zone: hostedZone,
          recordName: domainName,
          target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution))
        });


    // Deploy site contents to S3 bucket
    new s3deploy.BucketDeployment(this, 'DeployWithInvalidation', {
      sources: [s3deploy.Source.asset(path.join(__dirname, '../../portfolio/out'))],
      destinationBucket: siteBucket,
      distribution,
      distributionPaths: ['/*'],
    });
  }
}


