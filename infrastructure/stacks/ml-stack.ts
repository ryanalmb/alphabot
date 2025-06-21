import * as cdk from 'aws-cdk-lib';
import * as sagemaker from 'aws-cdk-lib/aws-sagemaker';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import { Construct } from 'constructs';

export interface AlphaPackMLStackProps extends cdk.StackProps {
  vpc: ec2.Vpc;
  securityGroup: ec2.SecurityGroup;
  executionRole: iam.Role;
}

export class AlphaPackMLStack extends cdk.Stack {
  public readonly inferenceEndpoint: sagemaker.CfnEndpoint;
  public readonly modelBucket: s3.Bucket;
  public readonly bedrockFallbackFunction: lambda.Function;
  public readonly arbitrageModelEndpoint: sagemaker.CfnEndpoint;
  public readonly socialIntelligenceEndpoint: sagemaker.CfnEndpoint;

  constructor(scope: Construct, id: string, props: AlphaPackMLStackProps) {
    super(scope, id, props);

    // S3 bucket for ML models and training data
    this.modelBucket = new s3.Bucket(this, 'MLModelBucket', {
      bucketName: `alphapack-ml-models-${this.account}-${this.region}`,
      versioned: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      lifecycleRules: [{
        id: 'DeleteOldModelVersions',
        noncurrentVersionExpiration: cdk.Duration.days(30),
      }],
    });

    // Lambda function for Bedrock integration with fallbacks
    this.bedrockFallbackFunction = new lambda.Function(this, 'BedrockFallbackFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');
        const { SageMakerRuntimeClient, InvokeEndpointCommand } = require('@aws-sdk/client-sagemaker-runtime');

        const bedrockClient = new BedrockRuntimeClient({ region: process.env.AWS_REGION });
        const sagemakerClient = new SageMakerRuntimeClient({ region: process.env.AWS_REGION });

        exports.handler = async (event) => {
          const { modelType, prompt, fallbackEndpoint } = event;
          
          try {
            // Try Bedrock first
            if (process.env.ENABLE_BEDROCK === 'true') {
              const bedrockCommand = new InvokeModelCommand({
                modelId: getBedrockModelId(modelType),
                contentType: 'application/json',
                accept: 'application/json',
                body: JSON.stringify({
                  prompt: prompt,
                  max_tokens: 1000,
                  temperature: 0.7
                })
              });
              
              const bedrockResponse = await bedrockClient.send(bedrockCommand);
              const responseBody = JSON.parse(new TextDecoder().decode(bedrockResponse.body));
              
              return {
                statusCode: 200,
                body: JSON.stringify({
                  source: 'bedrock',
                  result: responseBody.completion || responseBody.text
                })
              };
            }
          } catch (error) {
            console.log('Bedrock failed, falling back to SageMaker:', error.message);
          }
          
          try {
            // Fallback to SageMaker
            const sagemakerCommand = new InvokeEndpointCommand({
              EndpointName: fallbackEndpoint,
              ContentType: 'application/json',
              Body: JSON.stringify({ prompt: prompt })
            });
            
            const sagemakerResponse = await sagemakerClient.send(sagemakerCommand);
            const responseBody = JSON.parse(new TextDecoder().decode(sagemakerResponse.Body));
            
            return {
              statusCode: 200,
              body: JSON.stringify({
                source: 'sagemaker',
                result: responseBody.generated_text || responseBody.result
              })
            };
          } catch (error) {
            console.log('SageMaker fallback failed:', error.message);
            
            // Final fallback to simple heuristics
            return {
              statusCode: 200,
              body: JSON.stringify({
                source: 'heuristic',
                result: generateHeuristicResponse(modelType, prompt)
              })
            };
          }
        };

        function getBedrockModelId(modelType) {
          const modelMap = {
            'content-analysis': 'anthropic.claude-v2',
            'sentiment': 'amazon.titan-text-express-v1',
            'arbitrage': 'anthropic.claude-v2',
            'social-intelligence': 'anthropic.claude-v2'
          };
          return modelMap[modelType] || 'anthropic.claude-v2';
        }

        function generateHeuristicResponse(modelType, prompt) {
          // Simple fallback responses when all AI services are unavailable
          const heuristics = {
            'sentiment': 'neutral',
            'content-analysis': 'moderate_quality',
            'arbitrage': 'low_opportunity',
            'social-intelligence': 'average_engagement'
          };
          return heuristics[modelType] || 'fallback_response';
        }
      `),
      environment: {
        ENABLE_BEDROCK: 'true',
        AWS_REGION: this.region,
      },
      role: props.executionRole,
      timeout: cdk.Duration.minutes(5),
      vpc: props.vpc,
      securityGroups: [props.securityGroup],
    });

    // SageMaker model for arbitrage engine
    const arbitrageModel = new sagemaker.CfnModel(this, 'ArbitrageModel', {
      modelName: 'alphapack-arbitrage-model',
      executionRoleArn: props.executionRole.roleArn,
      primaryContainer: {
        image: '763104351884.dkr.ecr.us-east-1.amazonaws.com/pytorch-inference:1.13.1-gpu-py39-cu117-ubuntu20.04-sagemaker',
        modelDataUrl: `s3://${this.modelBucket.bucketName}/models/arbitrage/model.tar.gz`,
        environment: {
          SAGEMAKER_PROGRAM: 'inference.py',
          SAGEMAKER_SUBMIT_DIRECTORY: '/opt/ml/code',
        },
      },
      vpcConfig: {
        securityGroupIds: [props.securityGroup.securityGroupId],
        subnets: props.vpc.privateSubnets.map(subnet => subnet.subnetId),
      },
    });

    // SageMaker endpoint configuration for arbitrage
    const arbitrageEndpointConfig = new sagemaker.CfnEndpointConfig(this, 'ArbitrageEndpointConfig', {
      endpointConfigName: 'alphapack-arbitrage-endpoint-config',
      productionVariants: [{
        modelName: arbitrageModel.modelName!,
        variantName: 'primary',
        initialInstanceCount: 1,
        instanceType: 'ml.g4dn.xlarge',
        initialVariantWeight: 1,
      }],
    });

    // SageMaker endpoint for arbitrage
    this.arbitrageModelEndpoint = new sagemaker.CfnEndpoint(this, 'ArbitrageEndpoint', {
      endpointName: 'alphapack-arbitrage-endpoint',
      endpointConfigName: arbitrageEndpointConfig.endpointConfigName!,
    });

    // SageMaker model for social intelligence
    const socialIntelligenceModel = new sagemaker.CfnModel(this, 'SocialIntelligenceModel', {
      modelName: 'alphapack-social-intelligence-model',
      executionRoleArn: props.executionRole.roleArn,
      primaryContainer: {
        image: '763104351884.dkr.ecr.us-east-1.amazonaws.com/pytorch-inference:1.13.1-gpu-py39-cu117-ubuntu20.04-sagemaker',
        modelDataUrl: `s3://${this.modelBucket.bucketName}/models/social-intelligence/model.tar.gz`,
        environment: {
          SAGEMAKER_PROGRAM: 'inference.py',
          SAGEMAKER_SUBMIT_DIRECTORY: '/opt/ml/code',
        },
      },
      vpcConfig: {
        securityGroupIds: [props.securityGroup.securityGroupId],
        subnets: props.vpc.privateSubnets.map(subnet => subnet.subnetId),
      },
    });

    // SageMaker endpoint configuration for social intelligence
    const socialEndpointConfig = new sagemaker.CfnEndpointConfig(this, 'SocialEndpointConfig', {
      endpointConfigName: 'alphapack-social-intelligence-endpoint-config',
      productionVariants: [{
        modelName: socialIntelligenceModel.modelName!,
        variantName: 'primary',
        initialInstanceCount: 1,
        instanceType: 'ml.g4dn.xlarge',
        initialVariantWeight: 1,
      }],
    });

    // SageMaker endpoint for social intelligence
    this.socialIntelligenceEndpoint = new sagemaker.CfnEndpoint(this, 'SocialIntelligenceEndpoint', {
      endpointName: 'alphapack-social-intelligence-endpoint',
      endpointConfigName: socialEndpointConfig.endpointConfigName!,
    });

    // General inference endpoint (fallback for Bedrock)
    const generalModel = new sagemaker.CfnModel(this, 'GeneralInferenceModel', {
      modelName: 'alphapack-general-inference-model',
      executionRoleArn: props.executionRole.roleArn,
      primaryContainer: {
        image: '763104351884.dkr.ecr.us-east-1.amazonaws.com/huggingface-pytorch-inference:1.13.1-transformers4.26.0-gpu-py39-cu117-ubuntu20.04',
        modelDataUrl: `s3://${this.modelBucket.bucketName}/models/general/model.tar.gz`,
        environment: {
          HF_MODEL_ID: 'microsoft/DialoGPT-medium',
          HF_TASK: 'text-generation',
        },
      },
      vpcConfig: {
        securityGroupIds: [props.securityGroup.securityGroupId],
        subnets: props.vpc.privateSubnets.map(subnet => subnet.subnetId),
      },
    });

    const generalEndpointConfig = new sagemaker.CfnEndpointConfig(this, 'GeneralEndpointConfig', {
      endpointConfigName: 'alphapack-general-inference-endpoint-config',
      productionVariants: [{
        modelName: generalModel.modelName!,
        variantName: 'primary',
        initialInstanceCount: 1,
        instanceType: 'ml.g4dn.xlarge',
        initialVariantWeight: 1,
      }],
    });

    this.inferenceEndpoint = new sagemaker.CfnEndpoint(this, 'GeneralInferenceEndpoint', {
      endpointName: 'alphapack-general-inference-endpoint',
      endpointConfigName: generalEndpointConfig.endpointConfigName!,
    });

    // CloudWatch alarms for ML endpoints
    const endpointAlarm = new cloudwatch.Alarm(this, 'EndpointFailureAlarm', {
      metric: new cloudwatch.Metric({
        namespace: 'AWS/SageMaker',
        metricName: 'ModelLatency',
        dimensionsMap: {
          EndpointName: this.inferenceEndpoint.endpointName!,
          VariantName: 'primary',
        },
        statistic: 'Average',
      }),
      threshold: 10000, // 10 seconds
      evaluationPeriods: 2,
      treatMissingData: cloudwatch.TreatMissingData.BREACHING,
    });

    // SNS topic for ML alerts
    const mlAlertsTopic = new sns.Topic(this, 'MLAlertsTopic', {
      topicName: 'alphapack-ml-alerts',
      displayName: 'Alpha Pack ML Alerts',
    });

    endpointAlarm.addAlarmAction(new cloudwatch.SnsAction(mlAlertsTopic));

    // EventBridge rule for model retraining
    const retrainingRule = new events.Rule(this, 'ModelRetrainingRule', {
      schedule: events.Schedule.cron({
        minute: '0',
        hour: '2',
        day: '*',
        month: '*',
        year: '*',
      }),
      description: 'Trigger model retraining daily at 2 AM',
    });

    // Lambda function for model retraining orchestration
    const retrainingFunction = new lambda.Function(this, 'ModelRetrainingFunction', {
      runtime: lambda.Runtime.PYTHON_3_9,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
import json
import boto3
import os

def handler(event, context):
    sagemaker = boto3.client('sagemaker')
    
    # Start training job for arbitrage model
    training_job_name = f"alphapack-arbitrage-training-{int(context.aws_request_id.replace('-', '')[:10])}"
    
    try:
        response = sagemaker.create_training_job(
            TrainingJobName=training_job_name,
            RoleArn=os.environ['EXECUTION_ROLE_ARN'],
            AlgorithmSpecification={
                'TrainingImage': '763104351884.dkr.ecr.us-east-1.amazonaws.com/pytorch-training:1.13.1-gpu-py39-cu117-ubuntu20.04-sagemaker',
                'TrainingInputMode': 'File'
            },
            InputDataConfig=[
                {
                    'ChannelName': 'training',
                    'DataSource': {
                        'S3DataSource': {
                            'S3DataType': 'S3Prefix',
                            'S3Uri': f"s3://{os.environ['MODEL_BUCKET']}/training-data/arbitrage/",
                            'S3DataDistributionType': 'FullyReplicated'
                        }
                    },
                    'ContentType': 'application/json',
                    'CompressionType': 'None'
                }
            ],
            OutputDataConfig={
                'S3OutputPath': f"s3://{os.environ['MODEL_BUCKET']}/models/arbitrage/"
            },
            ResourceConfig={
                'InstanceType': 'ml.g4dn.xlarge',
                'InstanceCount': 1,
                'VolumeSizeInGB': 30
            },
            StoppingCondition={
                'MaxRuntimeInSeconds': 3600
            }
        )
        
        return {
            'statusCode': 200,
            'body': json.dumps(f'Training job started: {training_job_name}')
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps(f'Error starting training job: {str(e)}')
        }
      `),
      environment: {
        EXECUTION_ROLE_ARN: props.executionRole.roleArn,
        MODEL_BUCKET: this.modelBucket.bucketName,
      },
      role: props.executionRole,
      timeout: cdk.Duration.minutes(5),
    });

    retrainingRule.addTarget(new targets.LambdaFunction(retrainingFunction));

    // Outputs
    new cdk.CfnOutput(this, 'ModelBucketName', {
      value: this.modelBucket.bucketName,
      description: 'S3 bucket for ML models',
    });

    new cdk.CfnOutput(this, 'InferenceEndpointName', {
      value: this.inferenceEndpoint.endpointName!,
      description: 'SageMaker inference endpoint name',
    });

    new cdk.CfnOutput(this, 'ArbitrageEndpointName', {
      value: this.arbitrageModelEndpoint.endpointName!,
      description: 'Arbitrage model endpoint name',
    });

    new cdk.CfnOutput(this, 'SocialIntelligenceEndpointName', {
      value: this.socialIntelligenceEndpoint.endpointName!,
      description: 'Social intelligence endpoint name',
    });

    new cdk.CfnOutput(this, 'BedrockFallbackFunctionName', {
      value: this.bedrockFallbackFunction.functionName,
      description: 'Bedrock fallback Lambda function name',
    });
  }
}
