use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Mint, Transfer, MintTo};
use anchor_spl::associated_token::AssociatedToken;
use alpha_pack_core::{Pack, User, PackStatus, StrategyFocus, RiskLevel};

declare_id!("PackManager1111111111111111111111111111111");

#[program]
pub mod pack_manager {
    use super::*;

    /// Initialize pack treasury with multi-token support
    pub fn initialize_treasury(
        ctx: Context<InitializeTreasury>,
        treasury_bump: u8,
    ) -> Result<()> {
        let treasury = &mut ctx.accounts.treasury;
        treasury.pack = ctx.accounts.pack.key();
        treasury.authority = ctx.accounts.pack_leader.key();
        treasury.total_value_usd = 0;
        treasury.token_count = 0;
        treasury.bump = treasury_bump;
        treasury.created_at = Clock::get()?.unix_timestamp;
        treasury.updated_at = Clock::get()?.unix_timestamp;

        msg!("Treasury initialized for pack: {}", ctx.accounts.pack.key());
        Ok(())
    }

    /// Add token to pack treasury
    pub fn add_treasury_token(
        ctx: Context<AddTreasuryToken>,
        mint: Pubkey,
        allocation_percentage: u8,
    ) -> Result<()> {
        require!(allocation_percentage <= 100, PackManagerError::InvalidAllocation);
        
        let treasury = &mut ctx.accounts.treasury;
        let token_account = &ctx.accounts.token_account;
        
        // Check if token already exists
        let existing_token = treasury.tokens.iter().find(|t| t.mint == mint);
        require!(existing_token.is_none(), PackManagerError::TokenAlreadyExists);
        
        // Add new token to treasury
        let treasury_token = TreasuryToken {
            mint,
            token_account: token_account.key(),
            balance: 0,
            value_usd: 0,
            allocation_percentage,
            last_price: 0,
            price_updated_at: Clock::get()?.unix_timestamp,
        };
        
        treasury.tokens.push(treasury_token);
        treasury.token_count += 1;
        treasury.updated_at = Clock::get()?.unix_timestamp;

        emit!(TreasuryTokenAdded {
            treasury: treasury.key(),
            mint,
            allocation_percentage,
            timestamp: treasury.updated_at,
        });

        msg!("Token added to treasury: {}", mint);
        Ok(())
    }

    /// Deposit tokens to pack treasury
    pub fn deposit_to_treasury(
        ctx: Context<DepositToTreasury>,
        amount: u64,
    ) -> Result<()> {
        let treasury = &mut ctx.accounts.treasury;
        let mint = ctx.accounts.mint.key();
        
        // Find the token in treasury
        let token_index = treasury.tokens.iter()
            .position(|t| t.mint == mint)
            .ok_or(PackManagerError::TokenNotInTreasury)?;
        
        // Transfer tokens from user to treasury
        let cpi_accounts = Transfer {
            from: ctx.accounts.user_token_account.to_account_info(),
            to: ctx.accounts.treasury_token_account.to_account_info(),
            authority: ctx.accounts.depositor.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, amount)?;

        // Update treasury token balance
        treasury.tokens[token_index].balance += amount;
        treasury.updated_at = Clock::get()?.unix_timestamp;

        emit!(TreasuryDeposit {
            treasury: treasury.key(),
            depositor: ctx.accounts.depositor.key(),
            mint,
            amount,
            timestamp: treasury.updated_at,
        });

        msg!("Deposited {} tokens to treasury", amount);
        Ok(())
    }

    /// Withdraw tokens from pack treasury (leader only)
    pub fn withdraw_from_treasury(
        ctx: Context<WithdrawFromTreasury>,
        amount: u64,
    ) -> Result<()> {
        let treasury = &mut ctx.accounts.treasury;
        let mint = ctx.accounts.mint.key();
        
        // Find the token in treasury
        let token_index = treasury.tokens.iter()
            .position(|t| t.mint == mint)
            .ok_or(PackManagerError::TokenNotInTreasury)?;
        
        require!(
            treasury.tokens[token_index].balance >= amount,
            PackManagerError::InsufficientBalance
        );

        // Transfer tokens from treasury to leader
        let treasury_key = treasury.key();
        let seeds = &[
            b"treasury",
            treasury.pack.as_ref(),
            &[treasury.bump],
        ];
        let signer = &[&seeds[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.treasury_token_account.to_account_info(),
            to: ctx.accounts.leader_token_account.to_account_info(),
            authority: treasury.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        token::transfer(cpi_ctx, amount)?;

        // Update treasury token balance
        treasury.tokens[token_index].balance -= amount;
        treasury.updated_at = Clock::get()?.unix_timestamp;

        emit!(TreasuryWithdrawal {
            treasury: treasury.key(),
            leader: ctx.accounts.pack_leader.key(),
            mint,
            amount,
            timestamp: treasury.updated_at,
        });

        msg!("Withdrew {} tokens from treasury", amount);
        Ok(())
    }

    /// Rebalance treasury according to allocation strategy
    pub fn rebalance_treasury(ctx: Context<RebalanceTreasury>) -> Result<()> {
        let treasury = &mut ctx.accounts.treasury;
        
        // Calculate total value and target allocations
        let total_value = treasury.tokens.iter()
            .map(|t| t.value_usd)
            .sum::<u64>();

        for (i, token) in treasury.tokens.iter_mut().enumerate() {
            let target_value = (total_value * token.allocation_percentage as u64) / 100;
            let current_value = token.value_usd;
            
            if current_value < target_value {
                // Need to buy more of this token
                let deficit = target_value - current_value;
                msg!("Token {} needs {} more USD value", token.mint, deficit);
            } else if current_value > target_value {
                // Need to sell some of this token
                let excess = current_value - target_value;
                msg!("Token {} has {} excess USD value", token.mint, excess);
            }
        }

        treasury.updated_at = Clock::get()?.unix_timestamp;

        emit!(TreasuryRebalanced {
            treasury: treasury.key(),
            total_value,
            timestamp: treasury.updated_at,
        });

        msg!("Treasury rebalanced");
        Ok(())
    }

    /// Update token prices in treasury
    pub fn update_token_prices(
        ctx: Context<UpdateTokenPrices>,
        prices: Vec<TokenPrice>,
    ) -> Result<()> {
        let treasury = &mut ctx.accounts.treasury;
        let current_time = Clock::get()?.unix_timestamp;
        
        for price_update in prices {
            if let Some(token) = treasury.tokens.iter_mut()
                .find(|t| t.mint == price_update.mint) {
                
                token.last_price = price_update.price_usd;
                token.value_usd = (token.balance * price_update.price_usd) / 1_000_000; // Assuming 6 decimals
                token.price_updated_at = current_time;
            }
        }

        // Recalculate total treasury value
        treasury.total_value_usd = treasury.tokens.iter()
            .map(|t| t.value_usd)
            .sum();
        
        treasury.updated_at = current_time;

        emit!(TokenPricesUpdated {
            treasury: treasury.key(),
            total_value: treasury.total_value_usd,
            timestamp: current_time,
        });

        msg!("Token prices updated");
        Ok(())
    }

    /// Create pack governance proposal
    pub fn create_proposal(
        ctx: Context<CreateProposal>,
        title: String,
        description: String,
        proposal_type: ProposalType,
        execution_data: Vec<u8>,
    ) -> Result<()> {
        require!(title.len() <= 100, PackManagerError::TitleTooLong);
        require!(description.len() <= 1000, PackManagerError::DescriptionTooLong);

        let proposal = &mut ctx.accounts.proposal;
        proposal.pack = ctx.accounts.pack.key();
        proposal.proposer = ctx.accounts.proposer.key();
        proposal.title = title;
        proposal.description = description;
        proposal.proposal_type = proposal_type;
        proposal.execution_data = execution_data;
        proposal.status = ProposalStatus::Active;
        proposal.votes_for = 0;
        proposal.votes_against = 0;
        proposal.total_voters = 0;
        proposal.created_at = Clock::get()?.unix_timestamp;
        proposal.voting_ends_at = Clock::get()?.unix_timestamp + 7 * 24 * 60 * 60; // 7 days

        emit!(ProposalCreated {
            proposal: proposal.key(),
            pack: proposal.pack,
            proposer: proposal.proposer,
            title: proposal.title.clone(),
            proposal_type: proposal.proposal_type.clone(),
            timestamp: proposal.created_at,
        });

        msg!("Proposal created: {}", proposal.title);
        Ok(())
    }

    /// Vote on pack governance proposal
    pub fn vote_on_proposal(
        ctx: Context<VoteOnProposal>,
        vote: bool, // true = for, false = against
    ) -> Result<()> {
        let proposal = &mut ctx.accounts.proposal;
        let voter = &ctx.accounts.voter;
        
        require!(
            proposal.status == ProposalStatus::Active,
            PackManagerError::ProposalNotActive
        );
        
        require!(
            Clock::get()?.unix_timestamp < proposal.voting_ends_at,
            PackManagerError::VotingPeriodEnded
        );

        // Check if user already voted
        let existing_vote = proposal.voters.iter()
            .find(|v| v.voter == voter.key());
        require!(existing_vote.is_none(), PackManagerError::AlreadyVoted);

        // Add vote
        let vote_record = Vote {
            voter: voter.key(),
            vote,
            timestamp: Clock::get()?.unix_timestamp,
        };
        
        proposal.voters.push(vote_record);
        proposal.total_voters += 1;
        
        if vote {
            proposal.votes_for += 1;
        } else {
            proposal.votes_against += 1;
        }

        // Check if proposal should be executed (simple majority)
        let pack = &ctx.accounts.pack;
        let required_votes = (pack.members.len() / 2) + 1;
        
        if proposal.votes_for >= required_votes as u32 {
            proposal.status = ProposalStatus::Passed;
        } else if proposal.votes_against >= required_votes as u32 {
            proposal.status = ProposalStatus::Rejected;
        }

        emit!(VoteCast {
            proposal: proposal.key(),
            voter: voter.key(),
            vote,
            votes_for: proposal.votes_for,
            votes_against: proposal.votes_against,
            timestamp: Clock::get()?.unix_timestamp,
        });

        msg!("Vote cast on proposal: {}", proposal.title);
        Ok(())
    }

    /// Execute passed proposal
    pub fn execute_proposal(ctx: Context<ExecuteProposal>) -> Result<()> {
        let proposal = &mut ctx.accounts.proposal;
        
        require!(
            proposal.status == ProposalStatus::Passed,
            PackManagerError::ProposalNotPassed
        );

        // Execute based on proposal type
        match proposal.proposal_type {
            ProposalType::TreasuryWithdrawal => {
                // Execute treasury withdrawal
                msg!("Executing treasury withdrawal proposal");
            },
            ProposalType::StrategyChange => {
                // Change pack strategy
                msg!("Executing strategy change proposal");
            },
            ProposalType::MemberRemoval => {
                // Remove member from pack
                msg!("Executing member removal proposal");
            },
            ProposalType::LeadershipChange => {
                // Change pack leadership
                msg!("Executing leadership change proposal");
            },
        }

        proposal.status = ProposalStatus::Executed;
        proposal.executed_at = Some(Clock::get()?.unix_timestamp);

        emit!(ProposalExecuted {
            proposal: proposal.key(),
            executor: ctx.accounts.executor.key(),
            timestamp: Clock::get()?.unix_timestamp,
        });

        msg!("Proposal executed: {}", proposal.title);
        Ok(())
    }
}

// Account structures
#[derive(Accounts)]
#[instruction(treasury_bump: u8)]
pub struct InitializeTreasury<'info> {
    #[account(
        init,
        payer = pack_leader,
        space = 8 + PackTreasury::INIT_SPACE,
        seeds = [b"treasury", pack.key().as_ref()],
        bump
    )]
    pub treasury: Account<'info, PackTreasury>,
    
    pub pack: Account<'info, Pack>,
    
    #[account(mut)]
    pub pack_leader: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AddTreasuryToken<'info> {
    #[account(mut)]
    pub treasury: Account<'info, PackTreasury>,
    
    pub mint: Account<'info, Mint>,
    
    #[account(
        init,
        payer = pack_leader,
        associated_token::mint = mint,
        associated_token::authority = treasury,
    )]
    pub token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub pack_leader: Signer<'info>,
    
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DepositToTreasury<'info> {
    #[account(mut)]
    pub treasury: Account<'info, PackTreasury>,
    
    pub mint: Account<'info, Mint>,
    
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = depositor,
    )]
    pub user_token_account: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = treasury,
    )]
    pub treasury_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub depositor: Signer<'info>,
    
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct WithdrawFromTreasury<'info> {
    #[account(
        mut,
        seeds = [b"treasury", pack.key().as_ref()],
        bump = treasury.bump,
        has_one = pack
    )]
    pub treasury: Account<'info, PackTreasury>,
    
    #[account(has_one = leader)]
    pub pack: Account<'info, Pack>,
    
    pub mint: Account<'info, Mint>,
    
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = treasury,
    )]
    pub treasury_token_account: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = pack_leader,
    )]
    pub leader_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub pack_leader: Signer<'info>,
    
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct RebalanceTreasury<'info> {
    #[account(mut)]
    pub treasury: Account<'info, PackTreasury>,
    
    pub pack: Account<'info, Pack>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct UpdateTokenPrices<'info> {
    #[account(mut)]
    pub treasury: Account<'info, PackTreasury>,
    
    pub price_oracle: Signer<'info>, // Oracle authority
}

#[derive(Accounts)]
pub struct CreateProposal<'info> {
    #[account(
        init,
        payer = proposer,
        space = 8 + Proposal::INIT_SPACE,
        seeds = [b"proposal", pack.key().as_ref(), proposer.key().as_ref(), &Clock::get().unwrap().unix_timestamp.to_le_bytes()],
        bump
    )]
    pub proposal: Account<'info, Proposal>,
    
    pub pack: Account<'info, Pack>,
    
    #[account(mut)]
    pub proposer: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct VoteOnProposal<'info> {
    #[account(mut)]
    pub proposal: Account<'info, Proposal>,
    
    pub pack: Account<'info, Pack>,
    
    pub voter: Account<'info, User>,
    
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct ExecuteProposal<'info> {
    #[account(mut)]
    pub proposal: Account<'info, Proposal>,
    
    pub executor: Signer<'info>,
}

// Data structures
#[account]
pub struct PackTreasury {
    pub pack: Pubkey,
    pub authority: Pubkey,
    pub total_value_usd: u64,
    pub tokens: Vec<TreasuryToken>,
    pub token_count: u8,
    pub bump: u8,
    pub created_at: i64,
    pub updated_at: i64,
}

impl PackTreasury {
    pub const INIT_SPACE: usize = 32 + 32 + 8 + (4 + 10 * TreasuryToken::SPACE) + 1 + 1 + 8 + 8;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct TreasuryToken {
    pub mint: Pubkey,
    pub token_account: Pubkey,
    pub balance: u64,
    pub value_usd: u64,
    pub allocation_percentage: u8,
    pub last_price: u64,
    pub price_updated_at: i64,
}

impl TreasuryToken {
    pub const SPACE: usize = 32 + 32 + 8 + 8 + 1 + 8 + 8;
}

#[account]
pub struct Proposal {
    pub pack: Pubkey,
    pub proposer: Pubkey,
    pub title: String,
    pub description: String,
    pub proposal_type: ProposalType,
    pub execution_data: Vec<u8>,
    pub status: ProposalStatus,
    pub votes_for: u32,
    pub votes_against: u32,
    pub total_voters: u32,
    pub voters: Vec<Vote>,
    pub created_at: i64,
    pub voting_ends_at: i64,
    pub executed_at: Option<i64>,
}

impl Proposal {
    pub const INIT_SPACE: usize = 32 + 32 + (4 + 100) + (4 + 1000) + 1 + (4 + 1000) + 1 + 4 + 4 + 4 + (4 + 50 * Vote::SPACE) + 8 + 8 + (1 + 8);
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct Vote {
    pub voter: Pubkey,
    pub vote: bool,
    pub timestamp: i64,
}

impl Vote {
    pub const SPACE: usize = 32 + 1 + 8;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct TokenPrice {
    pub mint: Pubkey,
    pub price_usd: u64,
}

// Enums
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum ProposalType {
    TreasuryWithdrawal,
    StrategyChange,
    MemberRemoval,
    LeadershipChange,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum ProposalStatus {
    Active,
    Passed,
    Rejected,
    Executed,
    Expired,
}

// Events
#[event]
pub struct TreasuryTokenAdded {
    pub treasury: Pubkey,
    pub mint: Pubkey,
    pub allocation_percentage: u8,
    pub timestamp: i64,
}

#[event]
pub struct TreasuryDeposit {
    pub treasury: Pubkey,
    pub depositor: Pubkey,
    pub mint: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct TreasuryWithdrawal {
    pub treasury: Pubkey,
    pub leader: Pubkey,
    pub mint: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct TreasuryRebalanced {
    pub treasury: Pubkey,
    pub total_value: u64,
    pub timestamp: i64,
}

#[event]
pub struct TokenPricesUpdated {
    pub treasury: Pubkey,
    pub total_value: u64,
    pub timestamp: i64,
}

#[event]
pub struct ProposalCreated {
    pub proposal: Pubkey,
    pub pack: Pubkey,
    pub proposer: Pubkey,
    pub title: String,
    pub proposal_type: ProposalType,
    pub timestamp: i64,
}

#[event]
pub struct VoteCast {
    pub proposal: Pubkey,
    pub voter: Pubkey,
    pub vote: bool,
    pub votes_for: u32,
    pub votes_against: u32,
    pub timestamp: i64,
}

#[event]
pub struct ProposalExecuted {
    pub proposal: Pubkey,
    pub executor: Pubkey,
    pub timestamp: i64,
}

// Errors
#[error_code]
pub enum PackManagerError {
    #[msg("Invalid allocation percentage")]
    InvalidAllocation,
    #[msg("Token already exists in treasury")]
    TokenAlreadyExists,
    #[msg("Token not found in treasury")]
    TokenNotInTreasury,
    #[msg("Insufficient balance")]
    InsufficientBalance,
    #[msg("Title too long")]
    TitleTooLong,
    #[msg("Description too long")]
    DescriptionTooLong,
    #[msg("Proposal not active")]
    ProposalNotActive,
    #[msg("Voting period has ended")]
    VotingPeriodEnded,
    #[msg("User has already voted")]
    AlreadyVoted,
    #[msg("Proposal has not passed")]
    ProposalNotPassed,
    #[msg("Unauthorized")]
    Unauthorized,
}
