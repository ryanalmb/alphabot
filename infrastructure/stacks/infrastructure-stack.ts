import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import * as docdb from 'aws-cdk-lib/aws-docdb';
import * as opensearch from 'aws-cdk-lib/aws-opensearch';
import * as eks from 'aws-cdk-lib/aws-eks';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as waf from 'aws-cdk-lib/aws-wafv2';
import { Construct } from 'constructs';

export interface AlphaPackInfrastructureStackProps extends cdk.StackProps {
  // Additional props can be added here
}

export class AlphaPackInfrastructureStack extends cdk.Stack {
  public readonly vpc: ec2.Vpc;
  public readonly database: rds.DatabaseCluster;
  public readonly cache: elasticache.CfnCacheCluster;
  public readonly documentDb: docdb.DatabaseCluster;
  public readonly searchDomain: opensearch.Domain;
  public readonly eksCluster: eks.Cluster;
  public readonly applicationSecurityGroup: ec2.SecurityGroup;
  public readonly solanaSecurityGroup: ec2.SecurityGroup;
  public readonly mlSecurityGroup: ec2.SecurityGroup;
  public readonly artifactsBucket: s3.Bucket;
  public readonly cdnDistribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props: AlphaPackInfrastructureStackProps) {
    super(scope, id, props);

    // VPC with multi-AZ setup for high availability
    this.vpc = new ec2.Vpc(this, 'AlphaPackVpc', {
      maxAzs: 3,
      natGateways: 3, // One per AZ for high availability
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
        {
          cidrMask: 28,
          name: 'Database',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
      ],
      enableDnsHostnames: true,
      enableDnsSupport: true,
    });

    // Security Groups
    this.applicationSecurityGroup = new ec2.SecurityGroup(this, 'ApplicationSecurityGroup', {
      vpc: this.vpc,
      description: 'Security group for Alpha Pack application layer',
      allowAllOutbound: true,
    });

    this.solanaSecurityGroup = new ec2.SecurityGroup(this, 'SolanaSecurityGroup', {
      vpc: this.vpc,
      description: 'Security group for Solana RPC nodes',
      allowAllOutbound: true,
    });

    this.mlSecurityGroup = new ec2.SecurityGroup(this, 'MLSecurityGroup', {
      vpc: this.vpc,
      description: 'Security group for ML/AI services',
      allowAllOutbound: true,
    });

    // Allow communication between security groups
    this.applicationSecurityGroup.addIngressRule(
      this.applicationSecurityGroup,
      ec2.Port.allTraffic(),
      'Allow internal application communication'
    );

    this.solanaSecurityGroup.addIngressRule(
      this.applicationSecurityGroup,
      ec2.Port.tcp(8899),
      'Allow application to access Solana RPC'
    );

    this.mlSecurityGroup.addIngressRule(
      this.applicationSecurityGroup,
      ec2.Port.tcp(443),
      'Allow application to access ML services'
    );

    // RDS Aurora PostgreSQL cluster for main application data
    const dbSubnetGroup = new rds.SubnetGroup(this, 'DatabaseSubnetGroup', {
      vpc: this.vpc,
      description: 'Subnet group for Alpha Pack database',
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },
    });

    this.database = new rds.DatabaseCluster(this, 'AlphaPackDatabase', {
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.VER_15_4,
      }),
      credentials: rds.Credentials.fromGeneratedSecret('alphapack-admin', {
        secretName: 'alphapack/database/credentials',
      }),
      instanceProps: {
        instanceType: ec2.InstanceType.of(ec2.InstanceClass.R6G, ec2.InstanceSize.LARGE),
        vpcSubnets: {
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
        vpc: this.vpc,
        securityGroups: [this.applicationSecurityGroup],
      },
      instances: 2, // Multi-AZ for high availability
      subnetGroup: dbSubnetGroup,
      backup: {
        retention: cdk.Duration.days(7),
        preferredWindow: '03:00-04:00',
      },
      preferredMaintenanceWindow: 'sun:04:00-sun:05:00',
      cloudwatchLogsExports: ['postgresql'],
      monitoring: {
        interval: cdk.Duration.seconds(60),
      },
      deletionProtection: true,
      storageEncrypted: true,
    });

    // ElastiCache Redis cluster for caching and real-time data
    const cacheSubnetGroup = new elasticache.CfnSubnetGroup(this, 'CacheSubnetGroup', {
      description: 'Subnet group for Alpha Pack cache',
      subnetIds: this.vpc.privateSubnets.map(subnet => subnet.subnetId),
    });

    this.cache = new elasticache.CfnCacheCluster(this, 'AlphaPackCache', {
      cacheNodeType: 'cache.r6g.large',
      engine: 'redis',
      numCacheNodes: 1,
      cacheSubnetGroupName: cacheSubnetGroup.ref,
      vpcSecurityGroupIds: [this.applicationSecurityGroup.securityGroupId],
      port: 6379,
      engineVersion: '7.0',
      preferredMaintenanceWindow: 'sun:05:00-sun:06:00',
      snapshotRetentionLimit: 7,
      snapshotWindow: '03:00-05:00',
    });

    // DocumentDB for social and unstructured data
    const docDbSubnetGroup = new docdb.SubnetGroup(this, 'DocumentDbSubnetGroup', {
      vpc: this.vpc,
      description: 'Subnet group for Alpha Pack DocumentDB',
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },
    });

    this.documentDb = new docdb.DatabaseCluster(this, 'AlphaPackDocumentDb', {
      masterUser: {
        username: 'alphapack-admin',
        password: cdk.SecretValue.secretsManager('alphapack/documentdb/credentials', {
          jsonField: 'password',
        }),
      },
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.R6G, ec2.InstanceSize.LARGE),
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },
      vpc: this.vpc,
      securityGroup: this.applicationSecurityGroup,
      subnetGroup: docDbSubnetGroup,
      instances: 2,
      backup: {
        retention: cdk.Duration.days(7),
        preferredWindow: '03:00-04:00',
      },
      preferredMaintenanceWindow: 'sun:04:00-sun:05:00',
      cloudwatchLogsExports: ['audit', 'profiler'],
      storageEncrypted: true,
      deletionProtection: true,
    });

    // OpenSearch for analytics and search
    this.searchDomain = new opensearch.Domain(this, 'AlphaPackSearch', {
      version: opensearch.EngineVersion.OPENSEARCH_2_9,
      capacity: {
        dataNodes: 3,
        dataNodeInstanceType: 'r6g.large.search',
        masterNodes: 3,
        masterNodeInstanceType: 'm6g.medium.search',
      },
      ebs: {
        volumeSize: 100,
        volumeType: ec2.EbsDeviceVolumeType.GP3,
      },
      vpc: this.vpc,
      vpcSubnets: [{
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      }],
      securityGroups: [this.applicationSecurityGroup],
      zoneAwareness: {
        enabled: true,
        availabilityZoneCount: 3,
      },
      logging: {
        slowSearchLogEnabled: true,
        appLogEnabled: true,
        slowIndexLogEnabled: true,
      },
      nodeToNodeEncryption: true,
      encryptionAtRest: {
        enabled: true,
      },
      enforceHttps: true,
    });

    // S3 bucket for artifacts and static assets
    this.artifactsBucket = new s3.Bucket(this, 'AlphaPackArtifacts', {
      bucketName: `alphapack-artifacts-${this.account}-${this.region}`,
      versioned: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      lifecycleRules: [{
        id: 'DeleteOldVersions',
        noncurrentVersionExpiration: cdk.Duration.days(30),
      }],
    });

    // CloudFront distribution for global content delivery
    this.cdnDistribution = new cloudfront.Distribution(this, 'AlphaPackCDN', {
      defaultBehavior: {
        origin: new cloudfront.S3Origin(this.artifactsBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        compress: true,
      },
      priceClass: cloudfront.PriceClass.PRICE_CLASS_ALL,
      enableIpv6: true,
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
    });

    // EKS cluster for Kubernetes workloads
    this.eksCluster = new eks.Cluster(this, 'AlphaPackEKS', {
      version: eks.KubernetesVersion.V1_28,
      vpc: this.vpc,
      vpcSubnets: [{
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      }],
      defaultCapacity: 0, // We'll add managed node groups separately
      endpointAccess: eks.EndpointAccess.PRIVATE,
    });

    // Add managed node group for general workloads
    this.eksCluster.addManagedNodeGroup('GeneralWorkloads', {
      instanceTypes: [ec2.InstanceType.of(ec2.InstanceClass.M6I, ec2.InstanceSize.LARGE)],
      minSize: 2,
      maxSize: 10,
      desiredSize: 3,
      subnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      capacityType: eks.CapacityType.ON_DEMAND,
    });

    // Add managed node group for Solana nodes
    this.eksCluster.addManagedNodeGroup('SolanaNodes', {
      instanceTypes: [ec2.InstanceType.of(ec2.InstanceClass.C6I, ec2.InstanceSize.XLARGE)],
      minSize: 1,
      maxSize: 5,
      desiredSize: 2,
      subnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      capacityType: eks.CapacityType.ON_DEMAND,
      taints: [{
        key: 'solana-node',
        value: 'true',
        effect: eks.TaintEffect.NO_SCHEDULE,
      }],
    });

    // Outputs
    new cdk.CfnOutput(this, 'VpcId', {
      value: this.vpc.vpcId,
      description: 'VPC ID',
    });

    new cdk.CfnOutput(this, 'DatabaseEndpoint', {
      value: this.database.clusterEndpoint.hostname,
      description: 'Database cluster endpoint',
    });

    new cdk.CfnOutput(this, 'CacheEndpoint', {
      value: this.cache.attrRedisEndpointAddress,
      description: 'Redis cache endpoint',
    });

    new cdk.CfnOutput(this, 'SearchDomainEndpoint', {
      value: this.searchDomain.domainEndpoint,
      description: 'OpenSearch domain endpoint',
    });

    new cdk.CfnOutput(this, 'EKSClusterName', {
      value: this.eksCluster.clusterName,
      description: 'EKS cluster name',
    });

    new cdk.CfnOutput(this, 'CDNDomainName', {
      value: this.cdnDistribution.distributionDomainName,
      description: 'CloudFront distribution domain name',
    });
  }
}
