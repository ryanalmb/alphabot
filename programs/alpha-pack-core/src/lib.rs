use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Mint, Transfer};
use anchor_spl::associated_token::AssociatedToken;

declare_id!("AlphaPackCoreProgram111111111111111111111");

#[program]
pub mod alpha_pack_core {
    use super::*;

    /// Initialize the Alpha Pack program
    pub fn initialize(ctx: Context<Initialize>, bump: u8) -> Result<()> {
        let global_state = &mut ctx.accounts.global_state;
        global_state.authority = ctx.accounts.authority.key();
        global_state.total_packs = 0;
        global_state.total_users = 0;
        global_state.total_volume = 0;
        global_state.bump = bump;
        global_state.paused = false;
        
        msg!("Alpha Pack program initialized");
        Ok(())
    }

    /// Create a new user account
    pub fn create_user(
        ctx: Context<CreateUser>,
        username: String,
        wallet_address: Pubkey,
    ) -> Result<()> {
        require!(username.len() <= 50, AlphaPackError::UsernameTooLong);
        
        let user = &mut ctx.accounts.user;
        user.authority = ctx.accounts.authority.key();
        user.username = username;
        user.wallet_address = wallet_address;
        user.pack_id = None;
        user.total_trades = 0;
        user.total_volume = 0;
        user.win_rate = 0;
        user.profit_loss = 0;
        user.social_score = 0;
        user.rank = 0;
        user.created_at = Clock::get()?.unix_timestamp;
        user.updated_at = Clock::get()?.unix_timestamp;
        
        // Update global state
        let global_state = &mut ctx.accounts.global_state;
        global_state.total_users = global_state.total_users.checked_add(1).unwrap();
        
        emit!(UserCreated {
            user: user.key(),
            authority: user.authority,
            username: user.username.clone(),
            timestamp: user.created_at,
        });
        
        msg!("User created: {}", user.username);
        Ok(())
    }

    /// Create a new pack
    pub fn create_pack(
        ctx: Context<CreatePack>,
        name: String,
        description: String,
        max_members: u8,
        strategy_focus: StrategyFocus,
        risk_level: RiskLevel,
    ) -> Result<()> {
        require!(name.len() <= 100, AlphaPackError::PackNameTooLong);
        require!(description.len() <= 500, AlphaPackError::PackDescriptionTooLong);
        require!(max_members >= 2 && max_members <= 20, AlphaPackError::InvalidMaxMembers);
        
        let pack = &mut ctx.accounts.pack;
        pack.authority = ctx.accounts.authority.key();
        pack.name = name;
        pack.description = description;
        pack.leader = ctx.accounts.authority.key();
        pack.members = vec![ctx.accounts.authority.key()];
        pack.max_members = max_members;
        pack.status = PackStatus::Recruiting;
        pack.score = 0;
        pack.total_volume = 0;
        pack.win_rate = 0;
        pack.social_score = 0;
        pack.treasury_value = 0;
        pack.strategy_focus = strategy_focus;
        pack.risk_level = risk_level;
        pack.created_at = Clock::get()?.unix_timestamp;
        pack.updated_at = Clock::get()?.unix_timestamp;
        
        // Update user's pack_id
        let user = &mut ctx.accounts.user;
        user.pack_id = Some(pack.key());
        user.updated_at = Clock::get()?.unix_timestamp;
        
        // Update global state
        let global_state = &mut ctx.accounts.global_state;
        global_state.total_packs = global_state.total_packs.checked_add(1).unwrap();
        
        emit!(PackCreated {
            pack: pack.key(),
            leader: pack.leader,
            name: pack.name.clone(),
            max_members: pack.max_members,
            timestamp: pack.created_at,
        });
        
        msg!("Pack created: {}", pack.name);
        Ok(())
    }

    /// Join an existing pack
    pub fn join_pack(ctx: Context<JoinPack>) -> Result<()> {
        let pack = &mut ctx.accounts.pack;
        let user = &mut ctx.accounts.user;
        
        require!(pack.status == PackStatus::Recruiting, AlphaPackError::PackNotRecruiting);
        require!(pack.members.len() < pack.max_members as usize, AlphaPackError::PackFull);
        require!(!pack.members.contains(&user.authority), AlphaPackError::AlreadyInPack);
        require!(user.pack_id.is_none(), AlphaPackError::UserAlreadyInPack);
        
        // Add user to pack
        pack.members.push(user.authority);
        pack.updated_at = Clock::get()?.unix_timestamp;
        
        // Update user's pack_id
        user.pack_id = Some(pack.key());
        user.updated_at = Clock::get()?.unix_timestamp;
        
        // If pack is full, change status to active
        if pack.members.len() == pack.max_members as usize {
            pack.status = PackStatus::Active;
        }
        
        emit!(UserJoinedPack {
            pack: pack.key(),
            user: user.key(),
            member_count: pack.members.len() as u8,
            timestamp: pack.updated_at,
        });
        
        msg!("User {} joined pack {}", user.username, pack.name);
        Ok(())
    }

    /// Leave a pack
    pub fn leave_pack(ctx: Context<LeavePack>) -> Result<()> {
        let pack = &mut ctx.accounts.pack;
        let user = &mut ctx.accounts.user;
        
        require!(user.pack_id == Some(pack.key()), AlphaPackError::UserNotInPack);
        require!(pack.leader != user.authority, AlphaPackError::LeaderCannotLeave);
        
        // Remove user from pack
        pack.members.retain(|&member| member != user.authority);
        pack.updated_at = Clock::get()?.unix_timestamp;
        
        // Update user's pack_id
        user.pack_id = None;
        user.updated_at = Clock::get()?.unix_timestamp;
        
        // If pack becomes empty, disband it
        if pack.members.is_empty() {
            pack.status = PackStatus::Disbanded;
        } else if pack.status == PackStatus::Active && pack.members.len() < 2 {
            pack.status = PackStatus::Recruiting;
        }
        
        emit!(UserLeftPack {
            pack: pack.key(),
            user: user.key(),
            member_count: pack.members.len() as u8,
            timestamp: pack.updated_at,
        });
        
        msg!("User {} left pack {}", user.username, pack.name);
        Ok(())
    }

    /// Record a trade execution
    pub fn record_trade(
        ctx: Context<RecordTrade>,
        trade_type: TradeType,
        from_token: String,
        to_token: String,
        from_amount: u64,
        to_amount: u64,
        fee: u64,
        signature: String,
    ) -> Result<()> {
        let trade = &mut ctx.accounts.trade;
        let user = &mut ctx.accounts.user;
        
        trade.authority = ctx.accounts.authority.key();
        trade.user = user.key();
        trade.pack = user.pack_id;
        trade.trade_type = trade_type;
        trade.from_token = from_token;
        trade.to_token = to_token;
        trade.from_amount = from_amount;
        trade.to_amount = to_amount;
        trade.fee = fee;
        trade.signature = signature;
        trade.timestamp = Clock::get()?.unix_timestamp;
        
        // Calculate profit/loss
        let profit_loss = (to_amount as i64) - (from_amount as i64) - (fee as i64);
        trade.profit_loss = profit_loss;
        
        // Update user stats
        user.total_trades = user.total_trades.checked_add(1).unwrap();
        user.total_volume = user.total_volume.checked_add(from_amount).unwrap();
        user.profit_loss = user.profit_loss.checked_add(profit_loss).unwrap();
        
        // Update win rate (simplified calculation)
        if profit_loss > 0 {
            user.win_rate = ((user.win_rate as u64 * (user.total_trades - 1) + 100) / user.total_trades as u64) as u8;
        } else {
            user.win_rate = ((user.win_rate as u64 * (user.total_trades - 1)) / user.total_trades as u64) as u8;
        }
        
        user.updated_at = Clock::get()?.unix_timestamp;
        
        // Update pack stats if user is in a pack
        if let Some(pack_key) = user.pack_id {
            if let Some(pack_account) = ctx.remaining_accounts.get(0) {
                let mut pack_data = pack_account.try_borrow_mut_data()?;
                let mut pack: Pack = Pack::try_deserialize(&mut pack_data.as_ref())?;
                
                pack.total_volume = pack.total_volume.checked_add(from_amount).unwrap();
                pack.score = pack.score.checked_add(if profit_loss > 0 { profit_loss as u64 } else { 0 }).unwrap();
                pack.updated_at = Clock::get()?.unix_timestamp;
                
                pack.try_serialize(&mut pack_data.as_mut())?;
            }
        }
        
        // Update global state
        let global_state = &mut ctx.accounts.global_state;
        global_state.total_volume = global_state.total_volume.checked_add(from_amount).unwrap();
        
        emit!(TradeRecorded {
            trade: trade.key(),
            user: user.key(),
            pack: user.pack_id,
            from_amount,
            to_amount,
            profit_loss,
            timestamp: trade.timestamp,
        });
        
        msg!("Trade recorded for user {}", user.username);
        Ok(())
    }

    /// Update social score
    pub fn update_social_score(
        ctx: Context<UpdateSocialScore>,
        score_increase: u64,
    ) -> Result<()> {
        let user = &mut ctx.accounts.user;
        
        user.social_score = user.social_score.checked_add(score_increase).unwrap();
        user.updated_at = Clock::get()?.unix_timestamp;
        
        // Update pack social score if user is in a pack
        if let Some(pack_key) = user.pack_id {
            if let Some(pack_account) = ctx.remaining_accounts.get(0) {
                let mut pack_data = pack_account.try_borrow_mut_data()?;
                let mut pack: Pack = Pack::try_deserialize(&mut pack_data.as_ref())?;
                
                pack.social_score = pack.social_score.checked_add(score_increase / 2).unwrap();
                pack.updated_at = Clock::get()?.unix_timestamp;
                
                pack.try_serialize(&mut pack_data.as_mut())?;
            }
        }
        
        emit!(SocialScoreUpdated {
            user: user.key(),
            pack: user.pack_id,
            score_increase,
            new_score: user.social_score,
            timestamp: user.updated_at,
        });
        
        msg!("Social score updated for user {}", user.username);
        Ok(())
    }

    /// Pause/unpause the program (admin only)
    pub fn set_pause_state(ctx: Context<SetPauseState>, paused: bool) -> Result<()> {
        let global_state = &mut ctx.accounts.global_state;
        global_state.paused = paused;
        
        msg!("Program pause state set to: {}", paused);
        Ok(())
    }
}

// Account structures
#[derive(Accounts)]
#[instruction(bump: u8)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + GlobalState::INIT_SPACE,
        seeds = [b"global_state"],
        bump
    )]
    pub global_state: Account<'info, GlobalState>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateUser<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + User::INIT_SPACE,
        seeds = [b"user", authority.key().as_ref()],
        bump
    )]
    pub user: Account<'info, User>,
    
    #[account(mut)]
    pub global_state: Account<'info, GlobalState>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreatePack<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Pack::INIT_SPACE,
        seeds = [b"pack", authority.key().as_ref(), &Clock::get().unwrap().unix_timestamp.to_le_bytes()],
        bump
    )]
    pub pack: Account<'info, Pack>,
    
    #[account(
        mut,
        seeds = [b"user", authority.key().as_ref()],
        bump
    )]
    pub user: Account<'info, User>,
    
    #[account(mut)]
    pub global_state: Account<'info, GlobalState>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct JoinPack<'info> {
    #[account(mut)]
    pub pack: Account<'info, Pack>,
    
    #[account(
        mut,
        seeds = [b"user", authority.key().as_ref()],
        bump
    )]
    pub user: Account<'info, User>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct LeavePack<'info> {
    #[account(mut)]
    pub pack: Account<'info, Pack>,
    
    #[account(
        mut,
        seeds = [b"user", authority.key().as_ref()],
        bump
    )]
    pub user: Account<'info, User>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct RecordTrade<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Trade::INIT_SPACE,
        seeds = [b"trade", authority.key().as_ref(), &Clock::get().unwrap().unix_timestamp.to_le_bytes()],
        bump
    )]
    pub trade: Account<'info, Trade>,
    
    #[account(
        mut,
        seeds = [b"user", authority.key().as_ref()],
        bump
    )]
    pub user: Account<'info, User>,
    
    #[account(mut)]
    pub global_state: Account<'info, GlobalState>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateSocialScore<'info> {
    #[account(
        mut,
        seeds = [b"user", authority.key().as_ref()],
        bump
    )]
    pub user: Account<'info, User>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct SetPauseState<'info> {
    #[account(
        mut,
        seeds = [b"global_state"],
        bump = global_state.bump,
        has_one = authority
    )]
    pub global_state: Account<'info, GlobalState>,
    
    pub authority: Signer<'info>,
}

// Data structures
#[account]
pub struct GlobalState {
    pub authority: Pubkey,
    pub total_packs: u64,
    pub total_users: u64,
    pub total_volume: u64,
    pub bump: u8,
    pub paused: bool,
}

impl GlobalState {
    pub const INIT_SPACE: usize = 32 + 8 + 8 + 8 + 1 + 1;
}

#[account]
pub struct User {
    pub authority: Pubkey,
    pub username: String,
    pub wallet_address: Pubkey,
    pub pack_id: Option<Pubkey>,
    pub total_trades: u64,
    pub total_volume: u64,
    pub win_rate: u8,
    pub profit_loss: i64,
    pub social_score: u64,
    pub rank: u64,
    pub created_at: i64,
    pub updated_at: i64,
}

impl User {
    pub const INIT_SPACE: usize = 32 + (4 + 50) + 32 + (1 + 32) + 8 + 8 + 1 + 8 + 8 + 8 + 8 + 8;
}

#[account]
pub struct Pack {
    pub authority: Pubkey,
    pub name: String,
    pub description: String,
    pub leader: Pubkey,
    pub members: Vec<Pubkey>,
    pub max_members: u8,
    pub status: PackStatus,
    pub score: u64,
    pub total_volume: u64,
    pub win_rate: u8,
    pub social_score: u64,
    pub treasury_value: u64,
    pub strategy_focus: StrategyFocus,
    pub risk_level: RiskLevel,
    pub created_at: i64,
    pub updated_at: i64,
}

impl Pack {
    pub const INIT_SPACE: usize = 32 + (4 + 100) + (4 + 500) + 32 + (4 + 20 * 32) + 1 + 1 + 8 + 8 + 1 + 8 + 8 + 1 + 1 + 8 + 8;
}

#[account]
pub struct Trade {
    pub authority: Pubkey,
    pub user: Pubkey,
    pub pack: Option<Pubkey>,
    pub trade_type: TradeType,
    pub from_token: String,
    pub to_token: String,
    pub from_amount: u64,
    pub to_amount: u64,
    pub fee: u64,
    pub profit_loss: i64,
    pub signature: String,
    pub timestamp: i64,
}

impl Trade {
    pub const INIT_SPACE: usize = 32 + 32 + (1 + 32) + 1 + (4 + 10) + (4 + 10) + 8 + 8 + 8 + 8 + (4 + 100) + 8;
}

// Enums
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum PackStatus {
    Recruiting,
    Active,
    Competing,
    Inactive,
    Disbanded,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum StrategyFocus {
    Arbitrage,
    Social,
    Balanced,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum RiskLevel {
    Low,
    Medium,
    High,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum TradeType {
    Spot,
    Arbitrage,
    LiquidityProvision,
    YieldFarming,
}

// Events
#[event]
pub struct UserCreated {
    pub user: Pubkey,
    pub authority: Pubkey,
    pub username: String,
    pub timestamp: i64,
}

#[event]
pub struct PackCreated {
    pub pack: Pubkey,
    pub leader: Pubkey,
    pub name: String,
    pub max_members: u8,
    pub timestamp: i64,
}

#[event]
pub struct UserJoinedPack {
    pub pack: Pubkey,
    pub user: Pubkey,
    pub member_count: u8,
    pub timestamp: i64,
}

#[event]
pub struct UserLeftPack {
    pub pack: Pubkey,
    pub user: Pubkey,
    pub member_count: u8,
    pub timestamp: i64,
}

#[event]
pub struct TradeRecorded {
    pub trade: Pubkey,
    pub user: Pubkey,
    pub pack: Option<Pubkey>,
    pub from_amount: u64,
    pub to_amount: u64,
    pub profit_loss: i64,
    pub timestamp: i64,
}

#[event]
pub struct SocialScoreUpdated {
    pub user: Pubkey,
    pub pack: Option<Pubkey>,
    pub score_increase: u64,
    pub new_score: u64,
    pub timestamp: i64,
}

// Errors
#[error_code]
pub enum AlphaPackError {
    #[msg("Username is too long")]
    UsernameTooLong,
    #[msg("Pack name is too long")]
    PackNameTooLong,
    #[msg("Pack description is too long")]
    PackDescriptionTooLong,
    #[msg("Invalid max members count")]
    InvalidMaxMembers,
    #[msg("Pack is not recruiting")]
    PackNotRecruiting,
    #[msg("Pack is full")]
    PackFull,
    #[msg("User is already in this pack")]
    AlreadyInPack,
    #[msg("User is already in a pack")]
    UserAlreadyInPack,
    #[msg("User is not in this pack")]
    UserNotInPack,
    #[msg("Pack leader cannot leave")]
    LeaderCannotLeave,
    #[msg("Program is paused")]
    ProgramPaused,
    #[msg("Unauthorized")]
    Unauthorized,
}
