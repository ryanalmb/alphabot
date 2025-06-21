import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });

// Global test setup
beforeAll(async () => {
  // Setup test database connections
  // Setup mock services
  console.log('Setting up test environment...');
});

afterAll(async () => {
  // Cleanup test resources
  console.log('Cleaning up test environment...');
});

// Mock AWS SDK
jest.mock('@aws-sdk/client-dynamodb');
jest.mock('@aws-sdk/lib-dynamodb');
jest.mock('@aws-sdk/client-bedrock-runtime');
jest.mock('@aws-sdk/client-sagemaker-runtime');

// Mock Solana
jest.mock('@solana/web3.js');
jest.mock('@project-serum/anchor');

// Global test timeout
jest.setTimeout(30000);
