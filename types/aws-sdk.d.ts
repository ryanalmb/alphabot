// Mock AWS SDK v3 types
declare module '@aws-sdk/client-dynamodb' {
  export class DynamoDBClient {
    constructor(config?: any);
  }
}

declare module '@aws-sdk/lib-dynamodb' {
  export class DynamoDBDocumentClient {
    static from(client: any): DynamoDBDocumentClient;
    send(command: any): Promise<any>;
  }

  export class GetCommand {
    constructor(input: any);
  }

  export class PutCommand {
    constructor(input: any);
  }

  export class UpdateCommand {
    constructor(input: any);
  }

  export class QueryCommand {
    constructor(input: any);
  }

  export class ScanCommand {
    constructor(input: any);
  }
}

declare module '@aws-sdk/client-sagemaker-runtime' {
  export class SageMakerRuntimeClient {
    constructor(config?: any);
    send(command: any): Promise<any>;
  }

  export class InvokeEndpointCommand {
    constructor(input: any);
  }
}

declare module '@aws-sdk/client-secretsmanager' {
  export class SecretsManagerClient {
    constructor(config?: any);
  }
  
  export class GetSecretValueCommand {
    constructor(input: any);
  }
}

declare module '@aws-sdk/client-eventbridge' {
  export class EventBridgeClient {
    constructor(config?: any);
  }
  
  export class PutEventsCommand {
    constructor(input: any);
  }
}

declare module '@aws-sdk/client-bedrock-runtime' {
  export class BedrockRuntimeClient {
    constructor(config?: any);
  }
  
  export class InvokeModelCommand {
    constructor(input: any);
  }
}

declare module '@aws-sdk/client-s3' {
  export class S3Client {
    constructor(config?: any);
  }
}

declare module '@aws-sdk/client-sns' {
  export class SNSClient {
    constructor(config?: any);
  }
}

declare module '@aws-sdk/client-sqs' {
  export class SQSClient {
    constructor(config?: any);
  }
}
