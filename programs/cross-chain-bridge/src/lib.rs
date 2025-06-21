use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Mint, Transfer, Burn};
use alpha_pack_core::{Pack, User, Trade, TradeType};

declare_id!("CrossChainBridge111111111111111111111111111");

#[program]
pub mod cross_chain_bridge {
    use super::*;

    /// Initialize cross-chain bridge
    pub fn initialize_bridge(
        ctx: Context<InitializeBridge>,
        supported_chains: Vec<ChainInfo>,
        bridge_fee_bps: u16,
        min_transfer_amount: u64,
        max_transfer_amount: u64,
    ) -> Result<()> {
        require!(bridge_fee_bps <= 1000, BridgeError::InvalidFee); // Max 10%
        require!(min_transfer_amount > 0, BridgeError::InvalidMinAmount);
        require!(max_transfer_amount > min_transfer_amount, BridgeError::InvalidMaxAmount);
        require!(!supported_chains.is_empty(), BridgeError::NoChainsSupported);

        let bridge = &mut ctx.accounts.bridge;
        bridge.authority = ctx.accounts.authority.key();
        bridge.supported_chains = supported_chains;
        bridge.bridge_fee_bps = bridge_fee_bps;
        bridge.min_transfer_amount = min_transfer_amount;
        bridge.max_transfer_amount = max_transfer_amount;
        bridge.total_volume = 0;
        bridge.total_transfers = 0;
        bridge.total_fees_collected = 0;
        bridge.is_active = true;
        bridge.created_at = Clock::get()?.unix_timestamp;
        bridge.updated_at = Clock::get()?.unix_timestamp;

        emit!(BridgeInitialized {
            bridge: bridge.key(),
            authority: bridge.authority,
            supported_chains: bridge.supported_chains.len() as u8,
            bridge_fee_bps,
            timestamp: bridge.created_at,
        });

        msg!("Cross-chain bridge initialized");
        Ok(())
    }

    /// Initiate cross-chain transfer
    pub fn initiate_transfer(
        ctx: Context<InitiateTransfer>,
        target_chain: TargetChain,
        target_address: String,
        amount: u64,
        token_symbol: String,
    ) -> Result<()> {
        let bridge = &ctx.accounts.bridge;
        
        require!(bridge.is_active, BridgeError::BridgeInactive);
        require!(amount >= bridge.min_transfer_amount, BridgeError::AmountTooSmall);
        require!(amount <= bridge.max_transfer_amount, BridgeError::AmountTooLarge);
        require!(target_address.len() <= 100, BridgeError::AddressTooLong);
        require!(token_symbol.len() <= 20, BridgeError::SymbolTooLong);

        // Validate target chain is supported
        let chain_supported = bridge.supported_chains.iter()
            .any(|chain| chain.chain_id == target_chain as u16);
        require!(chain_supported, BridgeError::ChainNotSupported);

        let transfer = &mut ctx.accounts.transfer;
        let current_time = Clock::get()?.unix_timestamp;

        // Calculate bridge fee
        let bridge_fee = (amount * bridge.bridge_fee_bps as u64) / 10000;
        let transfer_amount = amount - bridge_fee;

        transfer.initiator = ctx.accounts.initiator.key();
        transfer.pack = ctx.accounts.user.pack_id;
        transfer.source_chain = SourceChain::Solana;
        transfer.target_chain = target_chain;
        transfer.target_address = target_address;
        transfer.token_symbol = token_symbol;
        transfer.amount = amount;
        transfer.bridge_fee = bridge_fee;
        transfer.transfer_amount = transfer_amount;
        transfer.status = TransferStatus::Initiated;
        transfer.nonce = generate_nonce(current_time, ctx.accounts.initiator.key());
        transfer.initiated_at = current_time;
        transfer.completed_at = None;
        transfer.tx_hash = None;

        // Lock tokens on Solana side
        let cpi_accounts = Transfer {
            from: ctx.accounts.user_token_account.to_account_info(),
            to: ctx.accounts.bridge_vault.to_account_info(),
            authority: ctx.accounts.initiator.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, amount)?;

        // Update bridge stats
        let bridge = &mut ctx.accounts.bridge;
        bridge.total_volume += amount;
        bridge.total_transfers += 1;
        bridge.total_fees_collected += bridge_fee;
        bridge.updated_at = current_time;

        emit!(TransferInitiated {
            transfer: transfer.key(),
            initiator: transfer.initiator,
            target_chain: transfer.target_chain,
            target_address: transfer.target_address.clone(),
            amount,
            bridge_fee,
            nonce: transfer.nonce,
            timestamp: current_time,
        });

        msg!("Cross-chain transfer initiated");
        Ok(())
    }

    /// Complete cross-chain transfer (called by relayer)
    pub fn complete_transfer(
        ctx: Context<CompleteTransfer>,
        tx_hash: String,
        success: bool,
    ) -> Result<()> {
        let transfer = &mut ctx.accounts.transfer;
        let current_time = Clock::get()?.unix_timestamp;

        require!(
            transfer.status == TransferStatus::Initiated,
            BridgeError::InvalidTransferStatus
        );

        require!(tx_hash.len() <= 100, BridgeError::TxHashTooLong);

        if success {
            transfer.status = TransferStatus::Completed;
            transfer.tx_hash = Some(tx_hash.clone());
            
            // Create trade record for successful transfer
            let trade_record = &mut ctx.accounts.trade_record;
            trade_record.authority = transfer.initiator;
            trade_record.user = transfer.initiator;
            trade_record.pack = transfer.pack;
            trade_record.trade_type = TradeType::Arbitrage; // Cross-chain transfers are arbitrage-like
            trade_record.from_token = "SOL".to_string();
            trade_record.to_token = transfer.token_symbol.clone();
            trade_record.from_amount = transfer.amount;
            trade_record.to_amount = transfer.transfer_amount;
            trade_record.fee = transfer.bridge_fee;
            trade_record.profit_loss = 0; // Neutral for bridge transfers
            trade_record.signature = tx_hash.clone();
            trade_record.timestamp = current_time;

        } else {
            transfer.status = TransferStatus::Failed;
            
            // Refund tokens to user
            let bridge_seeds = &[
                b"bridge",
                &[ctx.bumps.bridge],
            ];
            let signer = &[&bridge_seeds[..]];

            let cpi_accounts = Transfer {
                from: ctx.accounts.bridge_vault.to_account_info(),
                to: ctx.accounts.user_token_account.to_account_info(),
                authority: ctx.accounts.bridge.to_account_info(),
            };
            let cpi_program = ctx.accounts.token_program.to_account_info();
            let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
            token::transfer(cpi_ctx, transfer.amount)?;
        }

        transfer.completed_at = Some(current_time);

        emit!(TransferCompleted {
            transfer: transfer.key(),
            success,
            tx_hash: transfer.tx_hash.clone(),
            timestamp: current_time,
        });

        msg!("Cross-chain transfer completed: {}", success);
        Ok(())
    }

    /// Process incoming transfer from other chains
    pub fn process_incoming_transfer(
        ctx: Context<ProcessIncomingTransfer>,
        source_chain: SourceChain,
        source_tx_hash: String,
        recipient: Pubkey,
        amount: u64,
        token_symbol: String,
        nonce: u64,
    ) -> Result<()> {
        require!(source_tx_hash.len() <= 100, BridgeError::TxHashTooLong);
        require!(token_symbol.len() <= 20, BridgeError::SymbolTooLong);

        let incoming_transfer = &mut ctx.accounts.incoming_transfer;
        let current_time = Clock::get()?.unix_timestamp;

        incoming_transfer.source_chain = source_chain;
        incoming_transfer.source_tx_hash = source_tx_hash;
        incoming_transfer.recipient = recipient;
        incoming_transfer.amount = amount;
        incoming_transfer.token_symbol = token_symbol;
        incoming_transfer.nonce = nonce;
        incoming_transfer.status = IncomingTransferStatus::Pending;
        incoming_transfer.processed_at = None;
        incoming_transfer.created_at = current_time;

        // Mint tokens to recipient (simplified - in production would use proper token mapping)
        let bridge_seeds = &[
            b"bridge",
            &[ctx.bumps.bridge],
        ];
        let signer = &[&bridge_seeds[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.bridge_vault.to_account_info(),
            to: ctx.accounts.recipient_token_account.to_account_info(),
            authority: ctx.accounts.bridge.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        token::transfer(cpi_ctx, amount)?;

        incoming_transfer.status = IncomingTransferStatus::Completed;
        incoming_transfer.processed_at = Some(current_time);

        emit!(IncomingTransferProcessed {
            transfer: incoming_transfer.key(),
            source_chain: incoming_transfer.source_chain,
            recipient,
            amount,
            nonce,
            timestamp: current_time,
        });

        msg!("Incoming transfer processed");
        Ok(())
    }

    /// Add supported chain
    pub fn add_supported_chain(
        ctx: Context<AddSupportedChain>,
        chain_info: ChainInfo,
    ) -> Result<()> {
        let bridge = &mut ctx.accounts.bridge;
        
        // Check if chain already exists
        let chain_exists = bridge.supported_chains.iter()
            .any(|chain| chain.chain_id == chain_info.chain_id);
        require!(!chain_exists, BridgeError::ChainAlreadySupported);

        bridge.supported_chains.push(chain_info.clone());
        bridge.updated_at = Clock::get()?.unix_timestamp;

        emit!(ChainAdded {
            bridge: bridge.key(),
            chain_id: chain_info.chain_id,
            chain_name: chain_info.name,
            timestamp: bridge.updated_at,
        });

        msg!("Supported chain added: {}", chain_info.name);
        Ok(())
    }

    /// Update bridge settings
    pub fn update_bridge_settings(
        ctx: Context<UpdateBridgeSettings>,
        bridge_fee_bps: Option<u16>,
        min_transfer_amount: Option<u64>,
        max_transfer_amount: Option<u64>,
        is_active: Option<bool>,
    ) -> Result<()> {
        let bridge = &mut ctx.accounts.bridge;

        if let Some(fee) = bridge_fee_bps {
            require!(fee <= 1000, BridgeError::InvalidFee);
            bridge.bridge_fee_bps = fee;
        }

        if let Some(min_amount) = min_transfer_amount {
            require!(min_amount > 0, BridgeError::InvalidMinAmount);
            bridge.min_transfer_amount = min_amount;
        }

        if let Some(max_amount) = max_transfer_amount {
            require!(max_amount > bridge.min_transfer_amount, BridgeError::InvalidMaxAmount);
            bridge.max_transfer_amount = max_amount;
        }

        if let Some(active) = is_active {
            bridge.is_active = active;
        }

        bridge.updated_at = Clock::get()?.unix_timestamp;

        emit!(BridgeSettingsUpdated {
            bridge: bridge.key(),
            timestamp: bridge.updated_at,
        });

        msg!("Bridge settings updated");
        Ok(())
    }

    /// Emergency pause bridge
    pub fn emergency_pause(ctx: Context<EmergencyPause>) -> Result<()> {
        let bridge = &mut ctx.accounts.bridge;
        bridge.is_active = false;
        bridge.updated_at = Clock::get()?.unix_timestamp;

        emit!(BridgeEmergencyPaused {
            bridge: bridge.key(),
            authority: ctx.accounts.authority.key(),
            timestamp: bridge.updated_at,
        });

        msg!("Bridge emergency paused");
        Ok(())
    }
}

// Helper function to generate unique nonce
fn generate_nonce(timestamp: i64, initiator: Pubkey) -> u64 {
    let mut hasher = std::collections::hash_map::DefaultHasher::new();
    use std::hash::{Hash, Hasher};
    
    timestamp.hash(&mut hasher);
    initiator.hash(&mut hasher);
    
    hasher.finish()
}

// Account structures
#[derive(Accounts)]
pub struct InitializeBridge<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + CrossChainBridge::INIT_SPACE,
        seeds = [b"bridge"],
        bump
    )]
    pub bridge: Account<'info, CrossChainBridge>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InitiateTransfer<'info> {
    #[account(
        init,
        payer = initiator,
        space = 8 + CrossChainTransfer::INIT_SPACE,
        seeds = [b"transfer", initiator.key().as_ref(), &Clock::get().unwrap().unix_timestamp.to_le_bytes()],
        bump
    )]
    pub transfer: Account<'info, CrossChainTransfer>,
    
    #[account(mut)]
    pub bridge: Account<'info, CrossChainBridge>,
    
    pub user: Account<'info, User>,
    
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub bridge_vault: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub initiator: Signer<'info>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CompleteTransfer<'info> {
    #[account(mut)]
    pub transfer: Account<'info, CrossChainTransfer>,
    
    #[account(
        mut,
        seeds = [b"bridge"],
        bump
    )]
    pub bridge: Account<'info, CrossChainBridge>,
    
    #[account(
        init,
        payer = relayer,
        space = 8 + Trade::INIT_SPACE,
        seeds = [b"trade", transfer.initiator.as_ref(), &Clock::get().unwrap().unix_timestamp.to_le_bytes()],
        bump
    )]
    pub trade_record: Account<'info, Trade>,
    
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub bridge_vault: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub relayer: Signer<'info>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ProcessIncomingTransfer<'info> {
    #[account(
        init,
        payer = relayer,
        space = 8 + IncomingTransfer::INIT_SPACE,
        seeds = [b"incoming_transfer", &nonce.to_le_bytes()],
        bump
    )]
    pub incoming_transfer: Account<'info, IncomingTransfer>,
    
    #[account(
        mut,
        seeds = [b"bridge"],
        bump
    )]
    pub bridge: Account<'info, CrossChainBridge>,
    
    #[account(mut)]
    pub recipient_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub bridge_vault: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub relayer: Signer<'info>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AddSupportedChain<'info> {
    #[account(
        mut,
        seeds = [b"bridge"],
        bump,
        has_one = authority
    )]
    pub bridge: Account<'info, CrossChainBridge>,
    
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct UpdateBridgeSettings<'info> {
    #[account(
        mut,
        seeds = [b"bridge"],
        bump,
        has_one = authority
    )]
    pub bridge: Account<'info, CrossChainBridge>,
    
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct EmergencyPause<'info> {
    #[account(
        mut,
        seeds = [b"bridge"],
        bump,
        has_one = authority
    )]
    pub bridge: Account<'info, CrossChainBridge>,
    
    pub authority: Signer<'info>,
}

// Data structures
#[account]
pub struct CrossChainBridge {
    pub authority: Pubkey,
    pub supported_chains: Vec<ChainInfo>,
    pub bridge_fee_bps: u16,
    pub min_transfer_amount: u64,
    pub max_transfer_amount: u64,
    pub total_volume: u64,
    pub total_transfers: u64,
    pub total_fees_collected: u64,
    pub is_active: bool,
    pub created_at: i64,
    pub updated_at: i64,
}

impl CrossChainBridge {
    pub const INIT_SPACE: usize = 32 + (4 + 10 * ChainInfo::SPACE) + 2 + 8 + 8 + 8 + 8 + 8 + 1 + 8 + 8;
}

#[account]
pub struct CrossChainTransfer {
    pub initiator: Pubkey,
    pub pack: Option<Pubkey>,
    pub source_chain: SourceChain,
    pub target_chain: TargetChain,
    pub target_address: String,
    pub token_symbol: String,
    pub amount: u64,
    pub bridge_fee: u64,
    pub transfer_amount: u64,
    pub status: TransferStatus,
    pub nonce: u64,
    pub initiated_at: i64,
    pub completed_at: Option<i64>,
    pub tx_hash: Option<String>,
}

impl CrossChainTransfer {
    pub const INIT_SPACE: usize = 32 + (1 + 32) + 1 + 1 + (4 + 100) + (4 + 20) + 8 + 8 + 8 + 1 + 8 + 8 + (1 + 8) + (1 + 4 + 100);
}

#[account]
pub struct IncomingTransfer {
    pub source_chain: SourceChain,
    pub source_tx_hash: String,
    pub recipient: Pubkey,
    pub amount: u64,
    pub token_symbol: String,
    pub nonce: u64,
    pub status: IncomingTransferStatus,
    pub processed_at: Option<i64>,
    pub created_at: i64,
}

impl IncomingTransfer {
    pub const INIT_SPACE: usize = 1 + (4 + 100) + 32 + 8 + (4 + 20) + 8 + 1 + (1 + 8) + 8;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ChainInfo {
    pub chain_id: u16,
    pub name: String,
    pub rpc_url: String,
    pub is_active: bool,
}

impl ChainInfo {
    pub const SPACE: usize = 2 + (4 + 50) + (4 + 200) + 1;
}

// Enums
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum SourceChain {
    Solana,
    Ethereum,
    Base,
    Arbitrum,
    Polygon,
    BSC,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum TargetChain {
    Ethereum = 1,
    Base = 8453,
    Arbitrum = 42161,
    Polygon = 137,
    BSC = 56,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum TransferStatus {
    Initiated,
    Completed,
    Failed,
    Cancelled,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum IncomingTransferStatus {
    Pending,
    Completed,
    Failed,
}

// Events
#[event]
pub struct BridgeInitialized {
    pub bridge: Pubkey,
    pub authority: Pubkey,
    pub supported_chains: u8,
    pub bridge_fee_bps: u16,
    pub timestamp: i64,
}

#[event]
pub struct TransferInitiated {
    pub transfer: Pubkey,
    pub initiator: Pubkey,
    pub target_chain: TargetChain,
    pub target_address: String,
    pub amount: u64,
    pub bridge_fee: u64,
    pub nonce: u64,
    pub timestamp: i64,
}

#[event]
pub struct TransferCompleted {
    pub transfer: Pubkey,
    pub success: bool,
    pub tx_hash: Option<String>,
    pub timestamp: i64,
}

#[event]
pub struct IncomingTransferProcessed {
    pub transfer: Pubkey,
    pub source_chain: SourceChain,
    pub recipient: Pubkey,
    pub amount: u64,
    pub nonce: u64,
    pub timestamp: i64,
}

#[event]
pub struct ChainAdded {
    pub bridge: Pubkey,
    pub chain_id: u16,
    pub chain_name: String,
    pub timestamp: i64,
}

#[event]
pub struct BridgeSettingsUpdated {
    pub bridge: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct BridgeEmergencyPaused {
    pub bridge: Pubkey,
    pub authority: Pubkey,
    pub timestamp: i64,
}

// Errors
#[error_code]
pub enum BridgeError {
    #[msg("Invalid bridge fee")]
    InvalidFee,
    #[msg("Invalid minimum amount")]
    InvalidMinAmount,
    #[msg("Invalid maximum amount")]
    InvalidMaxAmount,
    #[msg("No chains supported")]
    NoChainsSupported,
    #[msg("Bridge is inactive")]
    BridgeInactive,
    #[msg("Amount too small")]
    AmountTooSmall,
    #[msg("Amount too large")]
    AmountTooLarge,
    #[msg("Address too long")]
    AddressTooLong,
    #[msg("Symbol too long")]
    SymbolTooLong,
    #[msg("Chain not supported")]
    ChainNotSupported,
    #[msg("Invalid transfer status")]
    InvalidTransferStatus,
    #[msg("Transaction hash too long")]
    TxHashTooLong,
    #[msg("Chain already supported")]
    ChainAlreadySupported,
    #[msg("Unauthorized")]
    Unauthorized,
}
