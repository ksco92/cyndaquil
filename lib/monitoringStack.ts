import {Construct} from 'constructs';
import {Duration, Stack, StackProps} from 'aws-cdk-lib';
import {
    Alarm,
    AlarmWidget,
    ComparisonOperator,
    Dashboard,
    IWidget,
    MathExpression,
    TreatMissingData,
} from 'aws-cdk-lib/aws-cloudwatch';
import {Function} from 'aws-cdk-lib/aws-lambda';
import getFunctionMetadataLocations from './utils/getFunctionMetadataLocations';
import FunctionMetadata from './functionMetadata';

export default class MonitoringStack extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

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
