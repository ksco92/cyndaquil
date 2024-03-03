import {App} from 'aws-cdk-lib';
import {Template} from 'aws-cdk-lib/assertions';
import CyndaquilStack from '../lib/cyndaquilStack';
import domainName from '../lib/configs/domainName';
import getFunctionMetadataLocations from '../lib/utils/getFunctionMetadataLocations';
import FunctionMetadata from '../lib/functionMetadata';

test('Test resources in Cyndaquil stack', () => {
    const app = new App();

    const stack = new CyndaquilStack(app, 'CyndaquilStack', {
        env: {
            account: '8373873873',
            region: 'us-east-1',
        },
    });

    const template = Template.fromStack(stack);

    /// ////////////////////////////////////////////
    /// ////////////////////////////////////////////
    /// ////////////////////////////////////////////
    /// ////////////////////////////////////////////
    // Lambda role

    template.hasResourceProperties('AWS::IAM::Role', {
        AssumeRolePolicyDocument: {
            Statement: [
                {
                    Action: 'sts:AssumeRole',
                    Effect: 'Allow',
                    Principal: {
                        Service: 'lambda.amazonaws.com',
                    },
                },
            ],
        },
        RoleName: 'LambdaExecutionRole',
    });

    /// ////////////////////////////////////////////
    /// ////////////////////////////////////////////
    /// ////////////////////////////////////////////
    /// ////////////////////////////////////////////
    // APIG

    template.hasResourceProperties('AWS::ApiGateway::RestApi', {
        Name: 'UtilsAPI',
    });

    template.hasResourceProperties('AWS::ApiGateway::DomainName', {
        DomainName: `api.${domainName}`,
    });

    /// ////////////////////////////////////////////
    /// ////////////////////////////////////////////
    /// ////////////////////////////////////////////
    /// ////////////////////////////////////////////
    // Functions

    const functionMetadataLocations = getFunctionMetadataLocations();

    functionMetadataLocations.forEach((functionMetadataLocation) => {
        const functionMetadata = new FunctionMetadata(functionMetadataLocation);

        template.hasResourceProperties('AWS::Lambda::Function', {
            Runtime: 'python3.11',
            FunctionName: functionMetadata.functionName,
            Handler: `lambdas.${functionMetadata.functionName}.${functionMetadata.functionName}`,
        });
    });

    /// ////////////////////////////////////////////
    /// ////////////////////////////////////////////
    /// ////////////////////////////////////////////
    /// ////////////////////////////////////////////
    // Website bucket

    template.hasResourceProperties('AWS::S3::Bucket', {
        BucketName: 'cyndaquil-website-bucket-8373873873',
    });

    /// ////////////////////////////////////////////
    /// ////////////////////////////////////////////
    /// ////////////////////////////////////////////
    /// ////////////////////////////////////////////
    // Website A-Record

    template.hasResourceProperties('AWS::Route53::RecordSet', {
        Name: `${domainName}.`,
        Type: 'A',
    });
});
