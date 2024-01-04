import {Duration, Stack, StackProps} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {
    IpAddresses, SecurityGroup, SubnetType, Vpc,
} from 'aws-cdk-lib/aws-ec2';
import {Code, Function, Runtime} from 'aws-cdk-lib/aws-lambda';
import {readdirSync} from 'fs';
import {ManagedPolicy, Role, ServicePrincipal} from 'aws-cdk-lib/aws-iam';
import {LambdaIntegration, RestApi} from 'aws-cdk-lib/aws-apigateway';
import {ARecord, PublicHostedZone, RecordTarget} from 'aws-cdk-lib/aws-route53';
import {Certificate, CertificateValidation} from 'aws-cdk-lib/aws-certificatemanager';
import {ApiGatewayDomain} from 'aws-cdk-lib/aws-route53-targets';
import FunctionMetadata from './functionMetadata';

export default class CyndaquilStack extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        /// ////////////////////////////////////////////
        /// ////////////////////////////////////////////
        /// ////////////////////////////////////////////
        /// ////////////////////////////////////////////
        // Networking settings

        const vpc = new Vpc(this, 'MainVpc', {
            ipAddresses: IpAddresses.cidr('10.0.0.0/16'),
        });

        const lambdaSecurityGroup = new SecurityGroup(this, 'LambdaSecurityGroup', {
            vpc,
            securityGroupName: 'LambdaSecurityGroup',
        });

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
        });

        /// ////////////////////////////////////////////
        /// ////////////////////////////////////////////
        /// ////////////////////////////////////////////
        /// ////////////////////////////////////////////
        // API Gateway

        const publicHostedZone = PublicHostedZone.fromPublicHostedZoneAttributes(this, 'PublicHostedZone', {
            hostedZoneId: 'Z0895490YL00K7TNILKB',
            zoneName: 'webutils.xyz',
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

        const functionMetadataLocations = readdirSync('lib/configs/lambdas/', {withFileTypes: true,})
            .filter((dirent) => !dirent.isDirectory())
            .filter((dirent) => dirent.name.includes('.json'))
            .map((dirent) => `lib/configs/lambdas/${dirent.name}`);

        functionMetadataLocations.forEach((functionMetadataLocation) => {
            const functionMetadata = new FunctionMetadata(functionMetadataLocation);

            const myFunction = new Function(this, functionMetadata.functionName, {
                functionName: `cyndaquil_${functionMetadata.functionName}`,
                runtime: Runtime.PYTHON_3_11,
                code: Code.fromAsset('src/lambdas'),
                handler: `${functionMetadata.functionName}.${functionMetadata.functionName}`,
                memorySize: 128,
                timeout: Duration.seconds(5),
                vpc,
                vpcSubnets: {
                    subnetType: SubnetType.PRIVATE_WITH_EGRESS,
                },
                securityGroups: [
                    lambdaSecurityGroup,
                ],
                role: lambdaRole,
            });

            const resource = api.root.addResource(functionMetadata.functionName);
            resource.addMethod('POST', new LambdaIntegration(myFunction));
        });
    }
}
