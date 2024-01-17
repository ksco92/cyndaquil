import {Construct} from 'constructs';
import {Duration, Stack, StackProps} from 'aws-cdk-lib';
import {
    Alarm,
    AlarmWidget,
    ComparisonOperator,
    Dashboard,
    GraphWidget,
    IWidget,
    MathExpression,
    Metric,
    TreatMissingData,
} from 'aws-cdk-lib/aws-cloudwatch';
import {Function} from 'aws-cdk-lib/aws-lambda';
import {Distribution} from 'aws-cdk-lib/aws-cloudfront';
import getFunctionMetadataLocations from './utils/getFunctionMetadataLocations';
import FunctionMetadata from './functionMetadata';

interface MonitoringStackProps extends StackProps {
    distribution: Distribution;
}

export default class MonitoringStack extends Stack {
    width = 7;

    height = 5;

    constructor(scope: Construct, id: string, props: MonitoringStackProps) {
        super(scope, id, props);

        /// ////////////////////////////////////////////
        /// ////////////////////////////////////////////
        /// ////////////////////////////////////////////
        /// ////////////////////////////////////////////
        // CloudFront metrics

        /// ////////////////////////////////////////////
        /// ////////////////////////////////////////////
        // Requests

        const requestsMetric = new Metric({
            metricName: 'Requests',
            namespace: 'AWS/CloudFront',
            dimensionsMap: {
                DistributionId: props.distribution.distributionId,
                Region: 'Global',
            },
            period: Duration.seconds(30),
            statistic: 'Sum',
        });

        const requestsWidget = new GraphWidget({
            width: this.width,
            height: this.height,
            left: [
                requestsMetric,
            ],
        });

        /// ////////////////////////////////////////////
        /// ////////////////////////////////////////////
        // Error rate

        const requestsErrorMetric = new Metric({
            metricName: 'TotalErrorRate',
            namespace: 'AWS/CloudFront',
            dimensionsMap: {
                DistributionId: props.distribution.distributionId,
                Region: 'Global',
            },
            period: Duration.seconds(30),
            statistic: 'Sum',
        });

        const requestsErrorRateAlarm = new Alarm(this, 'cloud-front-requests-error-rate', {
            metric: requestsErrorMetric,
            threshold: 20,
            evaluationPeriods: 5,
            datapointsToAlarm: 5,
            alarmName: 'cloud-front-requests-error-rate',
            comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
            treatMissingData: TreatMissingData.NOT_BREACHING,
        });

        const requestsErrorRateAlarmWidget = new AlarmWidget({
            alarm: requestsErrorRateAlarm,
            height: this.height,
            width: this.width,
            title: 'cloud-front-requests-error-rate',
        });

        /// ////////////////////////////////////////////
        /// ////////////////////////////////////////////
        /// ////////////////////////////////////////////
        /// ////////////////////////////////////////////
        // Lambda alarms and metrics

        const functionMetadataLocations = getFunctionMetadataLocations();
        const lambdaSuccessRateWidgets: IWidget[] = [];
        const lambdaDurationWidgets: IWidget[] = [];
        const lambdaInvocationWidgets: IWidget[] = [];

        functionMetadataLocations.forEach((functionMetadataLocation) => {
            const functionMetadata = new FunctionMetadata(functionMetadataLocation);
            const lambdaFunction = Function.fromFunctionName(
                this,
                functionMetadata.functionName,
                functionMetadata.functionName
            ) as Function;

            /// ////////////////////////////////////////////
            /// ////////////////////////////////////////////
            // Success rate

            const successRateMetric = new MathExpression({
                usingMetrics: {
                    invocations: lambdaFunction.metricInvocations({
                        period: Duration.seconds(30),
                    }),
                    errors: lambdaFunction.metricErrors({
                        period: Duration.seconds(30),
                    }),
                },
                expression: '100 - 100 * errors / MAX([errors, invocations])',
                label: 'Success Rate (%)',
            });

            const successRateAlarm = new Alarm(this, `${functionMetadata.functionName}-success-rate`, {
                metric: successRateMetric,
                threshold: 95,
                evaluationPeriods: 5,
                datapointsToAlarm: 5,
                alarmName: `${functionMetadata.functionName}-success-rate`,
                comparisonOperator: ComparisonOperator.LESS_THAN_THRESHOLD,
                treatMissingData: TreatMissingData.NOT_BREACHING,
            });

            const successRateWidget = new AlarmWidget({
                alarm: successRateAlarm,
                height: 5,
                width: 7,
                title: `${functionMetadata.functionName}-success-rate`,
            });

            lambdaSuccessRateWidgets.push(successRateWidget);

            /// ////////////////////////////////////////////
            /// ////////////////////////////////////////////
            // Invocations

            const invocationAlarm = new Alarm(this, `${functionMetadata.functionName}-invocations`, {
                metric: lambdaFunction.metricInvocations({
                    period: Duration.seconds(30),
                }),
                threshold: 100,
                evaluationPeriods: 5,
                datapointsToAlarm: 5,
                alarmName: `${functionMetadata.functionName}-invocations`,
                comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
                treatMissingData: TreatMissingData.NOT_BREACHING,
            });

            const invocationWidget = new AlarmWidget({
                alarm: invocationAlarm,
                height: 5,
                width: 7,
                title: `${functionMetadata.functionName}-invocation`,
            });

            lambdaInvocationWidgets.push(invocationWidget);

            /// ////////////////////////////////////////////
            /// ////////////////////////////////////////////
            // Duration

            const durationAlarm = new Alarm(this, `${functionMetadata.functionName}-duration`, {
                metric: lambdaFunction.metricDuration({
                    period: Duration.seconds(30),
                }),
                threshold: 4,
                evaluationPeriods: 5,
                datapointsToAlarm: 5,
                alarmName: `${functionMetadata.functionName}-duration`,
                comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
                treatMissingData: TreatMissingData.NOT_BREACHING,
            });

            const durationWidget = new AlarmWidget({
                alarm: durationAlarm,
                height: 5,
                width: 7,
                title: `${functionMetadata.functionName}-duration`,
            });

            lambdaDurationWidgets.push(durationWidget);
        });

        new Dashboard(this, 'MainDashboard', {
            dashboardName: 'MainDashboard',
            widgets: [
                [
                    requestsWidget,
                    requestsErrorRateAlarmWidget,
                ],
                [
                    ...lambdaSuccessRateWidgets,
                ],
                [
                    ...lambdaInvocationWidgets,
                ],
                [
                    ...lambdaDurationWidgets,
                ],
            ],
        });
    }
}
