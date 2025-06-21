@echo off
echo Installing Alpha Pack dependencies...

echo Installing core dependencies...
npm install --save aws-cdk-lib@^2.100.0
npm install --save constructs@^10.3.0
npm install --save @solana/web3.js@^1.87.6
npm install --save @solana/spl-token@^0.3.8
npm install --save @project-serum/anchor@^0.28.0
npm install --save @coral-xyz/anchor@^0.28.0

echo Installing AWS SDK v3...
npm install --save @aws-sdk/client-dynamodb@^3.450.0
npm install --save @aws-sdk/lib-dynamodb@^3.450.0
npm install --save @aws-sdk/client-bedrock@^3.450.0
npm install --save @aws-sdk/client-bedrock-runtime@^3.450.0
npm install --save @aws-sdk/client-sagemaker@^3.450.0
npm install --save @aws-sdk/client-sagemaker-runtime@^3.450.0
npm install --save @aws-sdk/client-comprehend@^3.450.0
npm install --save @aws-sdk/client-rekognition@^3.450.0
npm install --save @aws-sdk/client-secretsmanager@^3.450.0
npm install --save @aws-sdk/client-eventbridge@^3.450.0
npm install --save @aws-sdk/client-s3@^3.450.0
npm install --save @aws-sdk/client-sns@^3.450.0
npm install --save @aws-sdk/client-sqs@^3.450.0

echo Installing Express and middleware...
npm install --save express@^4.18.2
npm install --save cors@^2.8.5
npm install --save helmet@^7.1.0
npm install --save morgan@^1.10.0
npm install --save compression@^1.7.4
npm install --save express-rate-limit@^7.1.5
npm install --save express-validator@^7.0.1

echo Installing utilities...
npm install --save dotenv@^16.3.1
npm install --save telegraf@^4.15.6
npm install --save redis@^4.6.10
npm install --save pg@^8.11.3
npm install --save mongodb@^6.2.0
npm install --save axios@^1.6.0
npm install --save ws@^8.14.2
npm install --save jsonwebtoken@^9.0.2
npm install --save bcryptjs@^2.4.3
npm install --save joi@^17.11.0
npm install --save winston@^3.11.0

echo Installing dev dependencies...
npm install --save-dev @types/node@^20.8.7
npm install --save-dev @types/express@^4.17.20
npm install --save-dev @types/cors@^2.8.15
npm install --save-dev @types/morgan@^1.9.7
npm install --save-dev @types/pg@^8.10.7
npm install --save-dev @types/ws@^8.5.8
npm install --save-dev @types/jsonwebtoken@^9.0.5
npm install --save-dev @types/bcryptjs@^2.4.6
npm install --save-dev @types/jest@^29.5.6
npm install --save-dev @types/aws-lambda@^8.10.130
npm install --save-dev @types/compression@^1.7.5
npm install --save-dev @types/supertest@^2.0.16

echo Installing build tools...
npm install --save-dev typescript@^5.2.2
npm install --save-dev ts-node@^10.9.1
npm install --save-dev nodemon@^3.0.1
npm install --save-dev jest@^29.7.0
npm install --save-dev ts-jest@^29.1.1
npm install --save-dev aws-cdk@^2.100.0
npm install --save-dev @typescript-eslint/eslint-plugin@^6.9.0
npm install --save-dev @typescript-eslint/parser@^6.9.0
npm install --save-dev eslint@^8.52.0
npm install --save-dev prettier@^3.0.3
npm install --save-dev supertest@^6.3.3

echo Dependencies installed successfully!
echo Run 'npm run build' to compile the project.
pause
