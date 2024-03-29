import {
    Duration, RemovalPolicy, Stack, StackProps,
} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {Code, Function, Runtime} from 'aws-cdk-lib/aws-lambda';
import {ManagedPolicy, Role, ServicePrincipal} from 'aws-cdk-lib/aws-iam';
import {Cors, LambdaIntegration, RestApi} from 'aws-cdk-lib/aws-apigateway';
import {ARecord, PublicHostedZone, RecordTarget} from 'aws-cdk-lib/aws-route53';
import {Certificate, CertificateValidation} from 'aws-cdk-lib/aws-certificatemanager';
import {ApiGatewayDomain, CloudFrontTarget} from 'aws-cdk-lib/aws-route53-targets';
import {BlockPublicAccess, Bucket} from 'aws-cdk-lib/aws-s3';
import {
    AllowedMethods,
    CfnDistribution,
    CfnOriginAccessControl,
    Distribution,
    SecurityPolicyProtocol,
    ViewerProtocolPolicy,
} from 'aws-cdk-lib/aws-cloudfront';
import {S3Origin} from 'aws-cdk-lib/aws-cloudfront-origins';
import {BucketDeployment, Source} from 'aws-cdk-lib/aws-s3-deployment';
import {Key} from 'aws-cdk-lib/aws-kms';
import path = require('path');
import FunctionMetadata from './functionMetadata';
import domainName from './configs/domainName';
import getFunctionMetadataLocations from './utils/getFunctionMetadataLocations';

export default class CyndaquilStack extends Stack {
    distribution: Distribution;

    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        /// ////////////////////////////////////////////
        /// ////////////////////////////////////////////
        /// ////////////////////////////////////////////
        /// ////////////////////////////////////////////
        // Lambda role

        const lambdaRole = new Role(this, 'LambdaExecutionRole', {
            assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
            managedPolicies: [
                ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaVPCAccessExecutionRole'),
                ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
            ],
            roleName: 'LambdaExecutionRole',
        });

        /// ////////////////////////////////////////////
        /// ////////////////////////////////////////////
        /// ////////////////////////////////////////////
        /// ////////////////////////////////////////////
        // API Gateway

        const publicHostedZone = PublicHostedZone.fromLookup(this, 'PublicHostedZone', {
            domainName,
        });

        const certificate = new Certificate(this, 'APIGCertificate', {
            domainName: publicHostedZone.zoneName,
            subjectAlternativeNames: [
                `*.${publicHostedZone.zoneName}`,
            ],
            validation: CertificateValidation.fromDns(publicHostedZone),
        });

        const api = new RestApi(this, 'API', {
            restApiName: 'UtilsAPI',
            domainName: {
                domainName: `api.${publicHostedZone.zoneName}`,
                certificate,
            },
            deployOptions: {
                stageName: 'prod',
            },
            deploy: true,
            disableExecuteApiEndpoint: true,
            defaultCorsPreflightOptions: {
                allowOrigins: Cors.ALL_ORIGINS,
                allowMethods: Cors.ALL_METHODS,
                allowHeaders: [
                    'Content-Type',
                    'X-Amz-Date',
                    'Authorization',
                    'X-Api-Key',
                    'X-Amz-Security-Token',
                ],
            },
        });

        new ARecord(this, 'APIGatewayAliasRecord', {
            zone: publicHostedZone,
            target: RecordTarget.fromAlias(new ApiGatewayDomain(api.domainName!)),
            recordName: 'api',
        });

        /// ////////////////////////////////////////////
        /// ////////////////////////////////////////////
        /// ////////////////////////////////////////////
        /// ////////////////////////////////////////////
        // Functions

        const functionMetadataLocations = getFunctionMetadataLocations();

        // Make a function for each JSON config
        functionMetadataLocations.forEach((functionMetadataLocation) => {
            const functionMetadata = new FunctionMetadata(functionMetadataLocation);

            const myFunction = new Function(this, functionMetadata.functionName, {
                functionName: functionMetadata.functionName,
                runtime: Runtime.PYTHON_3_11,
                code: Code.fromAsset('src'),
                handler: `lambdas.${functionMetadata.functionName}.${functionMetadata.functionName}`,
                memorySize: 128,
                timeout: Duration.seconds(5),
                role: lambdaRole,
            });

            const resource = api.root.addResource(functionMetadata.functionName);
            resource.addMethod('POST', new LambdaIntegration(myFunction));
        });

        /// ////////////////////////////////////////////
        /// ////////////////////////////////////////////
        /// ////////////////////////////////////////////
        /// ////////////////////////////////////////////
        // UI

        /// ////////////////////////////////////////////
        /// ////////////////////////////////////////////
        // S3 bucket that holds the content

        const websiteBucketKey = new Key(this, 'WebsiteBucketKey');

        const websiteBucket = new Bucket(this, 'WebsiteBucket', {
            bucketName: `cyndaquil-website-bucket-${this.account}`,
            encryptionKey: websiteBucketKey,
            publicReadAccess: false,
            blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
            removalPolicy: RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
        });

        websiteBucket.grantRead(new ServicePrincipal('cloudfront.amazonaws.com'));

        /// ////////////////////////////////////////////
        /// ////////////////////////////////////////////
        // Cloudfront section

        const originAccessControl = new CfnOriginAccessControl(this, 'OriginAccessControl', {
            originAccessControlConfig: {
                name: 'CyndaquilOriginAccessControl',
                originAccessControlOriginType: 's3',
                signingBehavior: 'always',
                signingProtocol: 'sigv4',
            },
        });

        this.distribution = new Distribution(this, 'SiteDistribution', {
            certificate,
            defaultRootObject: 'index.html',
            domainNames: [
                domainName,
            ],
            minimumProtocolVersion: SecurityPolicyProtocol.TLS_V1_2_2021,
            errorResponses: [
                {
                    httpStatus: 403,
                    responseHttpStatus: 403,
                    responsePagePath: '/error.html',
                    ttl: Duration.minutes(30),
                },
            ],
            defaultBehavior: {
                origin: new S3Origin(websiteBucket),
                compress: true,
                allowedMethods: AllowedMethods.ALLOW_ALL,
                viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            },
        });

        const cfnDistribution = this.distribution.node.defaultChild as CfnDistribution;
        cfnDistribution.addPropertyOverride('DistributionConfig.Origins.0.OriginAccessControlId', originAccessControl.getAtt('Id'));
        cfnDistribution.addOverride('Properties.DistributionConfig.Origins.0.S3OriginConfig.OriginAccessIdentity', '');

        // This puts the HTML in the S3 bucket
        new BucketDeployment(this, 'DeployWithInvalidation', {
            sources: [
                Source.asset(path.join(__dirname, '../ui_compiled')),
            ],
            destinationBucket: websiteBucket,
            distribution: this.distribution,
            distributionPaths: [
                '/*',
            ],
        });

        new ARecord(this, 'SiteAliasRecord', {
            recordName: domainName,
            target: RecordTarget.fromAlias(new CloudFrontTarget(this.distribution)),
            zone: publicHostedZone,
        });
    }
}
