import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as autoscaling from 'aws-cdk-lib/aws-autoscaling';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as sns from 'aws-cdk-lib/aws-sns';
import { Construct } from 'constructs';

export interface AlphaPackSolanaStackProps extends cdk.StackProps {
  vpc: ec2.Vpc;
  securityGroup: ec2.SecurityGroup;
}

export class AlphaPackSolanaStack extends cdk.Stack {
  public readonly rpcLoadBalancer: elbv2.ApplicationLoadBalancer;
  public readonly solanaNodeGroup: autoscaling.AutoScalingGroup;
  public readonly programDeploymentBucket: s3.Bucket;
  public readonly webhookProcessor: lambda.Function;

  constructor(scope: Construct, id: string, props: AlphaPackSolanaStackProps) {
    super(scope, id, props);

    // S3 bucket for Solana program artifacts
    this.programDeploymentBucket = new s3.Bucket(this, 'SolanaProgramBucket', {
      bucketName: `alphapack-solana-programs-${this.account}-${this.region}`,
      versioned: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      lifecycleRules: [{
        id: 'DeleteOldProgramVersions',
        noncurrentVersionExpiration: cdk.Duration.days(30),
      }],
    });

    // IAM role for Solana EC2 instances
    const solanaInstanceRole = new iam.Role(this, 'SolanaInstanceRole', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchAgentServerPolicy'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'),
      ],
      inlinePolicies: {
        SolanaNodePolicy: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                's3:GetObject',
                's3:PutObject',
                's3:ListBucket',
              ],
              resources: [
                this.programDeploymentBucket.bucketArn,
                `${this.programDeploymentBucket.bucketArn}/*`,
              ],
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'secretsmanager:GetSecretValue',
              ],
              resources: [`arn:aws:secretsmanager:${this.region}:${this.account}:secret:alphapack/solana/*`],
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'cloudwatch:PutMetricData',
                'logs:CreateLogGroup',
                'logs:CreateLogStream',
                'logs:PutLogEvents',
              ],
              resources: ['*'],
            }),
          ],
        }),
      },
    });

    const solanaInstanceProfile = new iam.CfnInstanceProfile(this, 'SolanaInstanceProfile', {
      roles: [solanaInstanceRole.roleName],
    });

    // User data script for Solana RPC nodes
    const userData = ec2.UserData.forLinux();
    userData.addCommands(
      '#!/bin/bash',
      'yum update -y',
      'yum install -y docker htop wget curl',
      'systemctl start docker',
      'systemctl enable docker',
      'usermod -a -G docker ec2-user',
      
      // Install Solana CLI
      'curl -sSfL https://release.solana.com/v1.17.0/install | sh',
      'export PATH="/home/ec2-user/.local/share/solana/install/active_release/bin:$PATH"',
      'echo \'export PATH="/home/ec2-user/.local/share/solana/install/active_release/bin:$PATH"\' >> /home/ec2-user/.bashrc',
      
      // Install CloudWatch agent
      'wget https://s3.amazonaws.com/amazoncloudwatch-agent/amazon_linux/amd64/latest/amazon-cloudwatch-agent.rpm',
      'rpm -U ./amazon-cloudwatch-agent.rpm',
      
      // Create Solana configuration
      'mkdir -p /opt/solana',
      'cat > /opt/solana/validator.sh << EOF',
      '#!/bin/bash',
      'export SOLANA_METRICS_CONFIG="host=https://metrics.solana.com:8086,db=mainnet-beta,u=mainnet-beta_write,p=password"',
      'exec solana-validator \\',
      '  --identity /opt/solana/validator-keypair.json \\',
      '  --vote-account /opt/solana/vote-account-keypair.json \\',
      '  --ledger /opt/solana/ledger \\',
      '  --accounts /opt/solana/accounts \\',
      '  --log /opt/solana/solana-validator.log \\',
      '  --rpc-port 8899 \\',
      '  --rpc-bind-address 0.0.0.0 \\',
      '  --dynamic-port-range 8000-8020 \\',
      '  --entrypoint entrypoint.mainnet-beta.solana.com:8001 \\',
      '  --entrypoint entrypoint2.mainnet-beta.solana.com:8001 \\',
      '  --entrypoint entrypoint3.mainnet-beta.solana.com:8001 \\',
      '  --entrypoint entrypoint4.mainnet-beta.solana.com:8001 \\',
      '  --entrypoint entrypoint5.mainnet-beta.solana.com:8001 \\',
      '  --expected-genesis-hash 5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d \\',
      '  --wal-recovery-mode skip_any_corrupted_record \\',
      '  --limit-ledger-size',
      'EOF',
      'chmod +x /opt/solana/validator.sh',
      
      // Create systemd service
      'cat > /etc/systemd/system/solana-validator.service << EOF',
      '[Unit]',
      'Description=Solana Validator',
      'After=network.target',
      'StartLimitIntervalSec=0',
      '',
      '[Service]',
      'Type=simple',
      'Restart=always',
      'RestartSec=1',
      'User=ec2-user',
      'ExecStart=/opt/solana/validator.sh',
      'Environment=PATH=/home/ec2-user/.local/share/solana/install/active_release/bin:/usr/local/bin:/usr/bin:/bin',
      '',
      '[Install]',
      'WantedBy=multi-user.target',
      'EOF',
      
      // Generate keypairs (in production, these should be securely managed)
      'sudo -u ec2-user solana-keygen new --no-bip39-passphrase -o /opt/solana/validator-keypair.json',
      'sudo -u ec2-user solana-keygen new --no-bip39-passphrase -o /opt/solana/vote-account-keypair.json',
      'chown ec2-user:ec2-user /opt/solana/*.json',
      
      // Start services
      'systemctl daemon-reload',
      'systemctl enable solana-validator',
      'systemctl start solana-validator',
      
      // Configure CloudWatch monitoring
      'cat > /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json << EOF',
      '{',
      '  "metrics": {',
      '    "namespace": "AlphaPack/Solana",',
      '    "metrics_collected": {',
      '      "cpu": {',
      '        "measurement": ["cpu_usage_idle", "cpu_usage_iowait", "cpu_usage_user", "cpu_usage_system"],',
      '        "metrics_collection_interval": 60',
      '      },',
      '      "disk": {',
      '        "measurement": ["used_percent"],',
      '        "metrics_collection_interval": 60,',
      '        "resources": ["*"]',
      '      },',
      '      "mem": {',
      '        "measurement": ["mem_used_percent"],',
      '        "metrics_collection_interval": 60',
      '      }',
      '    }',
      '  },',
      '  "logs": {',
      '    "logs_collected": {',
      '      "files": {',
      '        "collect_list": [',
      '          {',
      '            "file_path": "/opt/solana/solana-validator.log",',
      '            "log_group_name": "/alphapack/solana/validator",',
      '            "log_stream_name": "{instance_id}"',
      '          }',
      '        ]',
      '      }',
      '    }',
      '  }',
      '}',
      'EOF',
      
      '/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json -s'
    );

    // Launch template for Solana nodes
    const launchTemplate = new ec2.LaunchTemplate(this, 'SolanaNodeLaunchTemplate', {
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.C6I, ec2.InstanceSize.XLARGE2),
      machineImage: ec2.MachineImage.latestAmazonLinux2(),
      userData: userData,
      securityGroup: props.securityGroup,
      role: solanaInstanceRole,
      blockDevices: [{
        deviceName: '/dev/xvda',
        volume: ec2.BlockDeviceVolume.ebs(500, {
          volumeType: ec2.EbsDeviceVolumeType.GP3,
          iops: 3000,
          throughput: 125,
          encrypted: true,
        }),
      }],
    });

    // Auto Scaling Group for Solana RPC nodes
    this.solanaNodeGroup = new autoscaling.AutoScalingGroup(this, 'SolanaNodeGroup', {
      vpc: props.vpc,
      launchTemplate: launchTemplate,
      minCapacity: 2,
      maxCapacity: 5,
      desiredCapacity: 2,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      healthCheck: autoscaling.HealthCheck.elb({
        grace: cdk.Duration.minutes(10),
      }),
      updatePolicy: autoscaling.UpdatePolicy.rollingUpdate({
        maxBatchSize: 1,
        minInstancesInService: 1,
        pauseTime: cdk.Duration.minutes(10),
      }),
    });

    // Application Load Balancer for RPC endpoints
    this.rpcLoadBalancer = new elbv2.ApplicationLoadBalancer(this, 'SolanaRPCLoadBalancer', {
      vpc: props.vpc,
      internetFacing: false, // Internal load balancer
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      securityGroup: props.securityGroup,
    });

    // Target group for Solana RPC
    const rpcTargetGroup = new elbv2.ApplicationTargetGroup(this, 'SolanaRPCTargetGroup', {
      port: 8899,
      protocol: elbv2.ApplicationProtocol.HTTP,
      vpc: props.vpc,
      targets: [this.solanaNodeGroup],
      healthCheck: {
        enabled: true,
        path: '/',
        port: '8899',
        protocol: elbv2.Protocol.HTTP,
        healthyHttpCodes: '200',
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(10),
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 3,
      },
    });

    // Listener for RPC traffic
    this.rpcLoadBalancer.addListener('RPCListener', {
      port: 8899,
      protocol: elbv2.ApplicationProtocol.HTTP,
      defaultTargetGroups: [rpcTargetGroup],
    });

    // Lambda function for processing Solana webhooks
    this.webhookProcessor = new lambda.Function(this, 'SolanaWebhookProcessor', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        const { Connection, PublicKey } = require('@solana/web3.js');
        const AWS = require('aws-sdk');
        
        const eventBridge = new AWS.EventBridge();
        const rpcEndpoint = process.env.SOLANA_RPC_ENDPOINT;
        const connection = new Connection(rpcEndpoint);
        
        exports.handler = async (event) => {
          try {
            const { signature, programId, accountKeys } = event;
            
            // Fetch transaction details
            const transaction = await connection.getTransaction(signature, {
              commitment: 'confirmed',
              maxSupportedTransactionVersion: 0
            });
            
            if (!transaction) {
              return { statusCode: 404, body: 'Transaction not found' };
            }
            
            // Process Alpha Pack program interactions
            if (accountKeys.includes(process.env.ALPHA_PACK_PROGRAM_ID)) {
              await processAlphaPackTransaction(transaction, signature);
            }
            
            return { statusCode: 200, body: 'Webhook processed successfully' };
          } catch (error) {
            console.error('Error processing webhook:', error);
            return { statusCode: 500, body: 'Internal server error' };
          }
        };
        
        async function processAlphaPackTransaction(transaction, signature) {
          // Extract relevant data from transaction
          const eventData = {
            signature: signature,
            slot: transaction.slot,
            blockTime: transaction.blockTime,
            fee: transaction.meta.fee,
            success: transaction.meta.err === null,
            programLogs: transaction.meta.logMessages,
          };
          
          // Send event to EventBridge for further processing
          await eventBridge.putEvents({
            Entries: [{
              Source: 'alphapack.solana',
              DetailType: 'Solana Transaction',
              Detail: JSON.stringify(eventData),
            }]
          }).promise();
        }
      `),
      environment: {
        SOLANA_RPC_ENDPOINT: `http://${this.rpcLoadBalancer.loadBalancerDnsName}:8899`,
        ALPHA_PACK_PROGRAM_ID: 'AlphaPackProgramIdPlaceholder',
      },
      timeout: cdk.Duration.minutes(5),
      vpc: props.vpc,
      securityGroups: [props.securityGroup],
    });

    // CloudWatch alarms for Solana infrastructure
    const rpcHealthAlarm = new cloudwatch.Alarm(this, 'SolanaRPCHealthAlarm', {
      metric: rpcTargetGroup.metricHealthyHostCount(),
      threshold: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD,
      evaluationPeriods: 2,
      treatMissingData: cloudwatch.TreatMissingData.BREACHING,
    });

    // SNS topic for Solana alerts
    const solanaAlertsTopic = new sns.Topic(this, 'SolanaAlertsTopic', {
      topicName: 'alphapack-solana-alerts',
      displayName: 'Alpha Pack Solana Alerts',
    });

    rpcHealthAlarm.addAlarmAction(new cloudwatch.SnsAction(solanaAlertsTopic));

    // EventBridge rule for Solana transaction monitoring
    const transactionRule = new events.Rule(this, 'SolanaTransactionRule', {
      eventPattern: {
        source: ['alphapack.solana'],
        detailType: ['Solana Transaction'],
      },
      description: 'Process Alpha Pack Solana transactions',
    });

    transactionRule.addTarget(new targets.LambdaFunction(this.webhookProcessor));

    // Outputs
    new cdk.CfnOutput(this, 'SolanaRPCEndpoint', {
      value: `http://${this.rpcLoadBalancer.loadBalancerDnsName}:8899`,
      description: 'Solana RPC endpoint URL',
    });

    new cdk.CfnOutput(this, 'ProgramDeploymentBucket', {
      value: this.programDeploymentBucket.bucketName,
      description: 'S3 bucket for Solana program deployments',
    });

    new cdk.CfnOutput(this, 'WebhookProcessorFunction', {
      value: this.webhookProcessor.functionName,
      description: 'Solana webhook processor function name',
    });

    new cdk.CfnOutput(this, 'SolanaNodeGroupName', {
      value: this.solanaNodeGroup.autoScalingGroupName,
      description: 'Solana node Auto Scaling Group name',
    });
  }
}
