import {Construct} from 'constructs';
import {Stack, StackProps} from 'aws-cdk-lib';
import {Artifact, Pipeline} from 'aws-cdk-lib/aws-codepipeline';
import {
    CodeBuildAction,
    CodeStarConnectionsSourceAction,
} from 'aws-cdk-lib/aws-codepipeline-actions';
import {BuildSpec, LinuxBuildImage, PipelineProject} from 'aws-cdk-lib/aws-codebuild';
import {
    CompositePrincipal, ManagedPolicy, Role, ServicePrincipal,
} from 'aws-cdk-lib/aws-iam';

export default class PipelineStack extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        /// ////////////////////////////////////////////
        /// ////////////////////////////////////////////
        /// ////////////////////////////////////////////
        /// ////////////////////////////////////////////
        // Pipeline role

        const pipelineRole = new Role(this, 'PipelineRole', {
            assumedBy: new CompositePrincipal(
                new ServicePrincipal('codepipeline.amazonaws.com'),
                new ServicePrincipal('codebuild.amazonaws.com')
            ),
            managedPolicies: [
                ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess'),
            ],
        });

        /// ////////////////////////////////////////////
        /// ////////////////////////////////////////////
        /// ////////////////////////////////////////////
        /// ////////////////////////////////////////////
        // Source stage

        const sourceOutput = new Artifact();
        const sourceAction = new CodeStarConnectionsSourceAction({
            actionName: 'GitHub_Source',
            owner: 'ksco92',
            repo: 'cyndaquil',
            output: sourceOutput,
            connectionArn: `arn:aws:codestar-connections:${this.region}:${this.account}:connection/aaf7cfc0-0154-4a99-b1f8-eca9c2d73697`,
        });

        /// ////////////////////////////////////////////
        /// ////////////////////////////////////////////
        /// ////////////////////////////////////////////
        /// ////////////////////////////////////////////
        // Unit test stage

        const unitTestsBuildProject = new PipelineProject(this, 'PythonUnitTestBuildProject', {
            buildSpec: BuildSpec.fromObject({
                version: '0.2',
                phases: {
                    install: {
                        commands: [
                            'echo Installing Python dependencies',
                            'pip install -r requirements.txt',
                        ],
                    },
                    build: {
                        commands: [
                            'echo Running unit tests',
                            'pytest python_unit_tests/',
                        ],
                    },
                },
            }),
            environment: {
                buildImage: LinuxBuildImage.AMAZON_LINUX_2_5,
            },
            role: pipelineRole,
        });

        const unitTestsBuildAction = new CodeBuildAction({
            actionName: 'PythonUnitTests',
            project: unitTestsBuildProject,
            input: sourceOutput,
            role: pipelineRole,
        });

        /// ////////////////////////////////////////////
        /// ////////////////////////////////////////////
        /// ////////////////////////////////////////////
        /// ////////////////////////////////////////////
        // Unit test stage

        const generateHtmlAndDeployBuildProject = new PipelineProject(this, 'GenerateHtmlAndDeployBuildProject', {
            buildSpec: BuildSpec.fromObject({
                version: '0.2',
                phases: {
                    install: {
                        commands: [
                            'echo Installing Python dependencies',
                            'pip install -r requirements.txt',
                            'echo Installing npm dependencies',
                            'npm install',
                            'echo Installing CDK CLI',
                            'npm install -g aws-cdk',
                        ],
                    },
                    build: {
                        commands: [
                            'echo Generating HTML',
                            'pwd',
                            'ls -llah',
                            'python3 ./src/generate_html.py',
                            'echo Running linters',
                            './scripts/lint.sh && npm run lint',
                            'echo Deploying CDK stacks',
                            'cdk deploy --all --require-approval never',
                        ],
                    },
                },
            }),
            environment: {
                buildImage: LinuxBuildImage.AMAZON_LINUX_2_5,
            },
            role: pipelineRole,
        });

        const generateHtmlAndDeployBuildAction = new CodeBuildAction({
            actionName: 'GenerateHtmlAndDeploy',
            project: generateHtmlAndDeployBuildProject,
            input: sourceOutput,
            role: pipelineRole,
        });

        /// ////////////////////////////////////////////
        /// ////////////////////////////////////////////
        /// ////////////////////////////////////////////
        /// ////////////////////////////////////////////
        // Pipeline

        new Pipeline(this, 'Pipeline', {
            stages: [
                {
                    stageName: 'Source',
                    actions: [
                        sourceAction,
                    ],
                },
                {
                    stageName: 'UnitTests',
                    actions: [
                        unitTestsBuildAction,
                    ],
                },
                {
                    stageName: 'GenerateHtmlAndDeploy',
                    actions: [
                        generateHtmlAndDeployBuildAction,
                    ],
                },
            ],
            role: pipelineRole,
        });
    }
}
