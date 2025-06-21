use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Mint, Transfer};
use alpha_pack_core::{Pack, User, Trade, TradeType};

declare_id!("ArbitrageExecutor1111111111111111111111111");

#[program]
pub mod arbitrage_executor {
    use super::*;

    /// Initialize arbitrage bot for a pack
    pub fn initialize_arbitrage_bot(
        ctx: Context<InitializeArbitrageBot>,
        max_trade_amount: u64,
        min_profit_threshold: u64,
        max_slippage: u16,
        enabled_pairs: Vec<TradingPair>,
    ) -> Result<()> {
        require!(max_slippage <= 1000, ArbitrageError::InvalidSlippage); // Max 10%
        require!(min_profit_threshold > 0, ArbitrageError::InvalidProfitThreshold);
        require!(!enabled_pairs.is_empty(), ArbitrageError::NoPairsEnabled);

        let bot = &mut ctx.accounts.arbitrage_bot;
        bot.pack = ctx.accounts.pack.key();
        bot.authority = ctx.accounts.pack_leader.key();
        bot.is_active = false;
        bot.max_trade_amount = max_trade_amount;
        bot.min_profit_threshold = min_profit_threshold;
        bot.max_slippage = max_slippage;
        bot.enabled_pairs = enabled_pairs;
        bot.total_trades = 0;
        bot.successful_trades = 0;
        bot.total_profit = 0;
        bot.total_volume = 0;
        bot.last_trade_time = 0;
        bot.created_at = Clock::get()?.unix_timestamp;
        bot.updated_at = Clock::get()?.unix_timestamp;

        emit!(ArbitrageBotInitialized {
            bot: bot.key(),
            pack: bot.pack,
            authority: bot.authority,
            max_trade_amount,
            min_profit_threshold,
            timestamp: bot.created_at,
        });

        msg!("Arbitrage bot initialized for pack");
        Ok(())
    }

    /// Enable/disable arbitrage bot
    pub fn set_bot_status(
        ctx: Context<SetBotStatus>,
        is_active: bool,
    ) -> Result<()> {
        let bot = &mut ctx.accounts.arbitrage_bot;
        bot.is_active = is_active;
        bot.updated_at = Clock::get()?.unix_timestamp;

        emit!(BotStatusChanged {
            bot: bot.key(),
            is_active,
            timestamp: bot.updated_at,
        });

        msg!("Arbitrage bot status set to: {}", is_active);
        Ok(())
    }

    /// Create arbitrage opportunity
    pub fn create_opportunity(
        ctx: Context<CreateOpportunity>,
        token_a: Pubkey,
        token_b: Pubkey,
        exchange_a: ExchangeType,
        exchange_b: ExchangeType,
        price_a: u64,
        price_b: u64,
        liquidity_a: u64,
        liquidity_b: u64,
        gas_cost: u64,
    ) -> Result<()> {
        require!(price_a != price_b, ArbitrageError::NoPriceDiscrepancy);
        require!(liquidity_a > 0 && liquidity_b > 0, ArbitrageError::InsufficientLiquidity);

        let opportunity = &mut ctx.accounts.opportunity;
        let current_time = Clock::get()?.unix_timestamp;

        // Calculate profit potential
        let (buy_price, sell_price, buy_exchange, sell_exchange) = if price_a < price_b {
            (price_a, price_b, exchange_a, exchange_b)
        } else {
            (price_b, price_a, exchange_b, exchange_a)
        };

        let profit_margin = ((sell_price - buy_price) * 10000) / buy_price; // Basis points
        let max_volume = liquidity_a.min(liquidity_b);
        let estimated_profit = (max_volume * profit_margin) / 10000;

        require!(estimated_profit > gas_cost, ArbitrageError::UnprofitableAfterGas);

        opportunity.creator = ctx.accounts.creator.key();
        opportunity.token_a = token_a;
        opportunity.token_b = token_b;
        opportunity.buy_exchange = buy_exchange;
        opportunity.sell_exchange = sell_exchange;
        opportunity.buy_price = buy_price;
        opportunity.sell_price = sell_price;
        opportunity.profit_margin = profit_margin;
        opportunity.max_volume = max_volume;
        opportunity.estimated_profit = estimated_profit;
        opportunity.gas_cost = gas_cost;
        opportunity.status = OpportunityStatus::Active;
        opportunity.executions = 0;
        opportunity.total_volume_executed = 0;
        opportunity.total_profit_realized = 0;
        opportunity.created_at = current_time;
        opportunity.expires_at = current_time + 300; // 5 minutes expiry
        opportunity.updated_at = current_time;

        emit!(OpportunityCreated {
            opportunity: opportunity.key(),
            creator: opportunity.creator,
            token_a,
            token_b,
            profit_margin,
            estimated_profit,
            expires_at: opportunity.expires_at,
            timestamp: current_time,
        });

        msg!("Arbitrage opportunity created");
        Ok(())
    }

    /// Execute arbitrage opportunity
    pub fn execute_arbitrage(
        ctx: Context<ExecuteArbitrage>,
        amount: u64,
    ) -> Result<()> {
        let opportunity = &mut ctx.accounts.opportunity;
        let bot = &mut ctx.accounts.arbitrage_bot;
        let current_time = Clock::get()?.unix_timestamp;

        require!(
            opportunity.status == OpportunityStatus::Active,
            ArbitrageError::OpportunityNotActive
        );

        require!(
            current_time < opportunity.expires_at,
            ArbitrageError::OpportunityExpired
        );

        require!(
            bot.is_active,
            ArbitrageError::BotNotActive
        );

        require!(
            amount <= bot.max_trade_amount,
            ArbitrageError::AmountExceedsLimit
        );

        require!(
            amount <= opportunity.max_volume,
            ArbitrageError::InsufficientLiquidity
        );

        // Calculate expected profit
        let expected_profit = (amount * opportunity.profit_margin) / 10000;
        require!(
            expected_profit >= bot.min_profit_threshold,
            ArbitrageError::ProfitBelowThreshold
        );

        // Execute the arbitrage trade
        let execution_result = execute_cross_exchange_trade(
            &ctx,
            amount,
            opportunity.buy_price,
            opportunity.sell_price,
        )?;

        // Update opportunity
        opportunity.executions += 1;
        opportunity.total_volume_executed += amount;
        opportunity.total_profit_realized += execution_result.actual_profit;
        opportunity.updated_at = current_time;

        // Update bot stats
        bot.total_trades += 1;
        if execution_result.success {
            bot.successful_trades += 1;
            bot.total_profit += execution_result.actual_profit;
        }
        bot.total_volume += amount;
        bot.last_trade_time = current_time;
        bot.updated_at = current_time;

        // Create trade record
        let trade_record = &mut ctx.accounts.trade_record;
        trade_record.authority = ctx.accounts.executor.key();
        trade_record.user = ctx.accounts.executor.key();
        trade_record.pack = Some(bot.pack);
        trade_record.trade_type = TradeType::Arbitrage;
        trade_record.from_token = opportunity.token_a.to_string();
        trade_record.to_token = opportunity.token_b.to_string();
        trade_record.from_amount = amount;
        trade_record.to_amount = execution_result.output_amount;
        trade_record.fee = execution_result.total_fees;
        trade_record.profit_loss = execution_result.actual_profit as i64;
        trade_record.signature = execution_result.signature;
        trade_record.timestamp = current_time;

        emit!(ArbitrageExecuted {
            opportunity: opportunity.key(),
            executor: ctx.accounts.executor.key(),
            bot: bot.key(),
            amount,
            actual_profit: execution_result.actual_profit,
            success: execution_result.success,
            timestamp: current_time,
        });

        msg!("Arbitrage executed with profit: {}", execution_result.actual_profit);
        Ok(())
    }

    /// Update arbitrage bot settings
    pub fn update_bot_settings(
        ctx: Context<UpdateBotSettings>,
        max_trade_amount: Option<u64>,
        min_profit_threshold: Option<u64>,
        max_slippage: Option<u16>,
        enabled_pairs: Option<Vec<TradingPair>>,
    ) -> Result<()> {
        let bot = &mut ctx.accounts.arbitrage_bot;

        if let Some(amount) = max_trade_amount {
            bot.max_trade_amount = amount;
        }

        if let Some(threshold) = min_profit_threshold {
            require!(threshold > 0, ArbitrageError::InvalidProfitThreshold);
            bot.min_profit_threshold = threshold;
        }

        if let Some(slippage) = max_slippage {
            require!(slippage <= 1000, ArbitrageError::InvalidSlippage);
            bot.max_slippage = slippage;
        }

        if let Some(pairs) = enabled_pairs {
            require!(!pairs.is_empty(), ArbitrageError::NoPairsEnabled);
            bot.enabled_pairs = pairs;
        }

        bot.updated_at = Clock::get()?.unix_timestamp;

        emit!(BotSettingsUpdated {
            bot: bot.key(),
            timestamp: bot.updated_at,
        });

        msg!("Arbitrage bot settings updated");
        Ok(())
    }

    /// Close expired opportunity
    pub fn close_opportunity(ctx: Context<CloseOpportunity>) -> Result<()> {
        let opportunity = &mut ctx.accounts.opportunity;
        let current_time = Clock::get()?.unix_timestamp;

        require!(
            current_time >= opportunity.expires_at || 
            opportunity.status == OpportunityStatus::Active,
            ArbitrageError::CannotCloseOpportunity
        );

        opportunity.status = OpportunityStatus::Expired;
        opportunity.updated_at = current_time;

        emit!(OpportunityClosed {
            opportunity: opportunity.key(),
            total_executions: opportunity.executions,
            total_volume: opportunity.total_volume_executed,
            total_profit: opportunity.total_profit_realized,
            timestamp: current_time,
        });

        msg!("Arbitrage opportunity closed");
        Ok(())
    }

    /// Emergency stop all bots (admin only)
    pub fn emergency_stop(ctx: Context<EmergencyStop>) -> Result<()> {
        let global_state = &mut ctx.accounts.global_state;
        global_state.emergency_stop = true;
        global_state.updated_at = Clock::get()?.unix_timestamp;

        emit!(EmergencyStopActivated {
            authority: ctx.accounts.authority.key(),
            timestamp: global_state.updated_at,
        });

        msg!("Emergency stop activated - all arbitrage bots disabled");
        Ok(())
    }
}

// Helper function to execute cross-exchange trade
fn execute_cross_exchange_trade(
    ctx: &Context<ExecuteArbitrage>,
    amount: u64,
    buy_price: u64,
    sell_price: u64,
) -> Result<ExecutionResult> {
    // This is a simplified implementation
    // In production, this would integrate with actual DEX protocols
    
    let slippage_factor = 50; // 0.5% slippage simulation
    let fee_factor = 25; // 0.25% fee simulation
    
    let buy_amount_after_slippage = amount - (amount * slippage_factor) / 10000;
    let sell_amount_after_slippage = buy_amount_after_slippage - (buy_amount_after_slippage * slippage_factor) / 10000;
    
    let total_fees = (amount * fee_factor) / 10000;
    let output_amount = (sell_amount_after_slippage * sell_price) / buy_price;
    let actual_profit = if output_amount > amount + total_fees {
        output_amount - amount - total_fees
    } else {
        0
    };
    
    let success = actual_profit > 0;
    let signature = format!("arb_exec_{}", Clock::get().unwrap().unix_timestamp);

    Ok(ExecutionResult {
        success,
        output_amount,
        actual_profit,
        total_fees,
        signature,
    })
}

// Account structures
#[derive(Accounts)]
pub struct InitializeArbitrageBot<'info> {
    #[account(
        init,
        payer = pack_leader,
        space = 8 + ArbitrageBot::INIT_SPACE,
        seeds = [b"arbitrage_bot", pack.key().as_ref()],
        bump
    )]
    pub arbitrage_bot: Account<'info, ArbitrageBot>,
    
    pub pack: Account<'info, Pack>,
    
    #[account(mut)]
    pub pack_leader: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SetBotStatus<'info> {
    #[account(
        mut,
        seeds = [b"arbitrage_bot", pack.key().as_ref()],
        bump,
        has_one = authority
    )]
    pub arbitrage_bot: Account<'info, ArbitrageBot>,
    
    pub pack: Account<'info, Pack>,
    
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct CreateOpportunity<'info> {
    #[account(
        init,
        payer = creator,
        space = 8 + ArbitrageOpportunity::INIT_SPACE,
        seeds = [b"opportunity", creator.key().as_ref(), &Clock::get().unwrap().unix_timestamp.to_le_bytes()],
        bump
    )]
    pub opportunity: Account<'info, ArbitrageOpportunity>,
    
    #[account(mut)]
    pub creator: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ExecuteArbitrage<'info> {
    #[account(mut)]
    pub opportunity: Account<'info, ArbitrageOpportunity>,
    
    #[account(mut)]
    pub arbitrage_bot: Account<'info, ArbitrageBot>,
    
    #[account(
        init,
        payer = executor,
        space = 8 + Trade::INIT_SPACE,
        seeds = [b"trade", executor.key().as_ref(), &Clock::get().unwrap().unix_timestamp.to_le_bytes()],
        bump
    )]
    pub trade_record: Account<'info, Trade>,
    
    #[account(mut)]
    pub executor: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateBotSettings<'info> {
    #[account(
        mut,
        has_one = authority
    )]
    pub arbitrage_bot: Account<'info, ArbitrageBot>,
    
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct CloseOpportunity<'info> {
    #[account(mut)]
    pub opportunity: Account<'info, ArbitrageOpportunity>,
    
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct EmergencyStop<'info> {
    #[account(
        mut,
        seeds = [b"global_state"],
        bump,
        has_one = authority
    )]
    pub global_state: Account<'info, GlobalArbitrageState>,
    
    pub authority: Signer<'info>,
}

// Data structures
#[account]
pub struct ArbitrageBot {
    pub pack: Pubkey,
    pub authority: Pubkey,
    pub is_active: bool,
    pub max_trade_amount: u64,
    pub min_profit_threshold: u64,
    pub max_slippage: u16,
    pub enabled_pairs: Vec<TradingPair>,
    pub total_trades: u64,
    pub successful_trades: u64,
    pub total_profit: u64,
    pub total_volume: u64,
    pub last_trade_time: i64,
    pub created_at: i64,
    pub updated_at: i64,
}

impl ArbitrageBot {
    pub const INIT_SPACE: usize = 32 + 32 + 1 + 8 + 8 + 2 + (4 + 10 * TradingPair::SPACE) + 8 + 8 + 8 + 8 + 8 + 8 + 8;
}

#[account]
pub struct ArbitrageOpportunity {
    pub creator: Pubkey,
    pub token_a: Pubkey,
    pub token_b: Pubkey,
    pub buy_exchange: ExchangeType,
    pub sell_exchange: ExchangeType,
    pub buy_price: u64,
    pub sell_price: u64,
    pub profit_margin: u64,
    pub max_volume: u64,
    pub estimated_profit: u64,
    pub gas_cost: u64,
    pub status: OpportunityStatus,
    pub executions: u32,
    pub total_volume_executed: u64,
    pub total_profit_realized: u64,
    pub created_at: i64,
    pub expires_at: i64,
    pub updated_at: i64,
}

impl ArbitrageOpportunity {
    pub const INIT_SPACE: usize = 32 + 32 + 32 + 1 + 1 + 8 + 8 + 8 + 8 + 8 + 8 + 1 + 4 + 8 + 8 + 8 + 8 + 8;
}

#[account]
pub struct GlobalArbitrageState {
    pub authority: Pubkey,
    pub emergency_stop: bool,
    pub total_opportunities: u64,
    pub total_executions: u64,
    pub total_volume: u64,
    pub total_profit: u64,
    pub created_at: i64,
    pub updated_at: i64,
}

impl GlobalArbitrageState {
    pub const INIT_SPACE: usize = 32 + 1 + 8 + 8 + 8 + 8 + 8 + 8;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct TradingPair {
    pub token_a: Pubkey,
    pub token_b: Pubkey,
    pub enabled: bool,
}

impl TradingPair {
    pub const SPACE: usize = 32 + 32 + 1;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ExecutionResult {
    pub success: bool,
    pub output_amount: u64,
    pub actual_profit: u64,
    pub total_fees: u64,
    pub signature: String,
}

// Enums
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum ExchangeType {
    Jupiter,
    Orca,
    Raydium,
    Serum,
    Saber,
    Mercurial,
    Aldrin,
    Cropper,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum OpportunityStatus {
    Active,
    Executed,
    Expired,
    Cancelled,
}

// Events
#[event]
pub struct ArbitrageBotInitialized {
    pub bot: Pubkey,
    pub pack: Pubkey,
    pub authority: Pubkey,
    pub max_trade_amount: u64,
    pub min_profit_threshold: u64,
    pub timestamp: i64,
}

#[event]
pub struct BotStatusChanged {
    pub bot: Pubkey,
    pub is_active: bool,
    pub timestamp: i64,
}

#[event]
pub struct OpportunityCreated {
    pub opportunity: Pubkey,
    pub creator: Pubkey,
    pub token_a: Pubkey,
    pub token_b: Pubkey,
    pub profit_margin: u64,
    pub estimated_profit: u64,
    pub expires_at: i64,
    pub timestamp: i64,
}

#[event]
pub struct ArbitrageExecuted {
    pub opportunity: Pubkey,
    pub executor: Pubkey,
    pub bot: Pubkey,
    pub amount: u64,
    pub actual_profit: u64,
    pub success: bool,
    pub timestamp: i64,
}

#[event]
pub struct BotSettingsUpdated {
    pub bot: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct OpportunityClosed {
    pub opportunity: Pubkey,
    pub total_executions: u32,
    pub total_volume: u64,
    pub total_profit: u64,
    pub timestamp: i64,
}

#[event]
pub struct EmergencyStopActivated {
    pub authority: Pubkey,
    pub timestamp: i64,
}

// Errors
#[error_code]
pub enum ArbitrageError {
    #[msg("Invalid slippage percentage")]
    InvalidSlippage,
    #[msg("Invalid profit threshold")]
    InvalidProfitThreshold,
    #[msg("No trading pairs enabled")]
    NoPairsEnabled,
    #[msg("No price discrepancy found")]
    NoPriceDiscrepancy,
    #[msg("Insufficient liquidity")]
    InsufficientLiquidity,
    #[msg("Unprofitable after gas costs")]
    UnprofitableAfterGas,
    #[msg("Opportunity not active")]
    OpportunityNotActive,
    #[msg("Opportunity has expired")]
    OpportunityExpired,
    #[msg("Bot is not active")]
    BotNotActive,
    #[msg("Amount exceeds maximum trade limit")]
    AmountExceedsLimit,
    #[msg("Profit below minimum threshold")]
    ProfitBelowThreshold,
    #[msg("Cannot close opportunity")]
    CannotCloseOpportunity,
    #[msg("Emergency stop is active")]
    EmergencyStopActive,
    #[msg("Unauthorized")]
    Unauthorized,
}
