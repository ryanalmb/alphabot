use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Mint, MintTo, Transfer};
use anchor_spl::associated_token::AssociatedToken;
use mpl_token_metadata::instruction as mpl_instruction;
use alpha_pack_core::{Pack, User};

declare_id!("SocialRewards111111111111111111111111111111");

#[program]
pub mod social_rewards {
    use super::*;

    /// Initialize social rewards system
    pub fn initialize_rewards_system(
        ctx: Context<InitializeRewardsSystem>,
        daily_reward_pool: u64,
        viral_bonus_multiplier: u16,
        engagement_threshold: u64,
    ) -> Result<()> {
        let rewards_system = &mut ctx.accounts.rewards_system;
        rewards_system.authority = ctx.accounts.authority.key();
        rewards_system.reward_mint = ctx.accounts.reward_mint.key();
        rewards_system.daily_reward_pool = daily_reward_pool;
        rewards_system.viral_bonus_multiplier = viral_bonus_multiplier;
        rewards_system.engagement_threshold = engagement_threshold;
        rewards_system.total_rewards_distributed = 0;
        rewards_system.total_content_pieces = 0;
        rewards_system.total_viral_content = 0;
        rewards_system.is_active = true;
        rewards_system.created_at = Clock::get()?.unix_timestamp;
        rewards_system.updated_at = Clock::get()?.unix_timestamp;

        emit!(RewardsSystemInitialized {
            system: rewards_system.key(),
            authority: rewards_system.authority,
            daily_reward_pool,
            viral_bonus_multiplier,
            timestamp: rewards_system.created_at,
        });

        msg!("Social rewards system initialized");
        Ok(())
    }

    /// Create social content post
    pub fn create_content_post(
        ctx: Context<CreateContentPost>,
        platform: SocialPlatform,
        content_type: ContentType,
        content_hash: String,
        metadata_uri: String,
    ) -> Result<()> {
        require!(content_hash.len() <= 64, SocialRewardsError::ContentHashTooLong);
        require!(metadata_uri.len() <= 200, SocialRewardsError::MetadataUriTooLong);

        let content_post = &mut ctx.accounts.content_post;
        let current_time = Clock::get()?.unix_timestamp;

        content_post.creator = ctx.accounts.creator.key();
        content_post.pack = ctx.accounts.user.pack_id;
        content_post.platform = platform;
        content_post.content_type = content_type;
        content_post.content_hash = content_hash;
        content_post.metadata_uri = metadata_uri;
        content_post.engagement_score = 0;
        content_post.virality_score = 0;
        content_post.is_viral = false;
        content_post.rewards_claimed = false;
        content_post.total_rewards = 0;
        content_post.likes = 0;
        content_post.shares = 0;
        content_post.comments = 0;
        content_post.views = 0;
        content_post.created_at = current_time;
        content_post.updated_at = current_time;

        // Update global stats
        let rewards_system = &mut ctx.accounts.rewards_system;
        rewards_system.total_content_pieces += 1;
        rewards_system.updated_at = current_time;

        emit!(ContentPostCreated {
            post: content_post.key(),
            creator: content_post.creator,
            pack: content_post.pack,
            platform: content_post.platform,
            content_type: content_post.content_type,
            timestamp: current_time,
        });

        msg!("Content post created");
        Ok(())
    }

    /// Update engagement metrics for content
    pub fn update_engagement(
        ctx: Context<UpdateEngagement>,
        likes: u64,
        shares: u64,
        comments: u64,
        views: u64,
    ) -> Result<()> {
        let content_post = &mut ctx.accounts.content_post;
        let rewards_system = &ctx.accounts.rewards_system;
        let current_time = Clock::get()?.unix_timestamp;

        // Update engagement metrics
        content_post.likes = likes;
        content_post.shares = shares;
        content_post.comments = comments;
        content_post.views = views;

        // Calculate engagement score
        let engagement_score = calculate_engagement_score(likes, shares, comments, views);
        content_post.engagement_score = engagement_score;

        // Calculate virality score
        let virality_score = calculate_virality_score(
            engagement_score,
            current_time - content_post.created_at,
            content_post.platform,
        );
        content_post.virality_score = virality_score;

        // Check if content has gone viral
        let was_viral = content_post.is_viral;
        content_post.is_viral = engagement_score >= rewards_system.engagement_threshold;

        content_post.updated_at = current_time;

        // If newly viral, update global stats
        if content_post.is_viral && !was_viral {
            let rewards_system = &mut ctx.accounts.rewards_system;
            rewards_system.total_viral_content += 1;
            rewards_system.updated_at = current_time;

            emit!(ContentWentViral {
                post: content_post.key(),
                creator: content_post.creator,
                engagement_score,
                virality_score,
                timestamp: current_time,
            });
        }

        emit!(EngagementUpdated {
            post: content_post.key(),
            likes,
            shares,
            comments,
            views,
            engagement_score,
            virality_score,
            timestamp: current_time,
        });

        msg!("Engagement metrics updated");
        Ok(())
    }

    /// Claim rewards for viral content
    pub fn claim_content_rewards(ctx: Context<ClaimContentRewards>) -> Result<()> {
        let content_post = &mut ctx.accounts.content_post;
        let rewards_system = &ctx.accounts.rewards_system;
        let current_time = Clock::get()?.unix_timestamp;

        require!(
            !content_post.rewards_claimed,
            SocialRewardsError::RewardsAlreadyClaimed
        );

        require!(
            content_post.is_viral,
            SocialRewardsError::ContentNotViral
        );

        require!(
            rewards_system.is_active,
            SocialRewardsError::RewardsSystemInactive
        );

        // Calculate reward amount
        let base_reward = calculate_base_reward(
            content_post.engagement_score,
            rewards_system.daily_reward_pool,
        );

        let viral_bonus = if content_post.is_viral {
            (base_reward * rewards_system.viral_bonus_multiplier as u64) / 100
        } else {
            0
        };

        let total_reward = base_reward + viral_bonus;

        // Mint rewards to creator
        let seeds = &[
            b"rewards_system",
            &[ctx.bumps.rewards_system],
        ];
        let signer = &[&seeds[..]];

        let cpi_accounts = MintTo {
            mint: ctx.accounts.reward_mint.to_account_info(),
            to: ctx.accounts.creator_token_account.to_account_info(),
            authority: ctx.accounts.rewards_system.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        token::mint_to(cpi_ctx, total_reward)?;

        // Update content post
        content_post.rewards_claimed = true;
        content_post.total_rewards = total_reward;
        content_post.updated_at = current_time;

        // Update global stats
        let rewards_system = &mut ctx.accounts.rewards_system;
        rewards_system.total_rewards_distributed += total_reward;
        rewards_system.updated_at = current_time;

        // Update user social score
        let user = &mut ctx.accounts.user;
        user.social_score += (total_reward / 1000); // Convert to social score points
        user.updated_at = current_time;

        emit!(RewardsClaimed {
            post: content_post.key(),
            creator: content_post.creator,
            base_reward,
            viral_bonus,
            total_reward,
            timestamp: current_time,
        });

        msg!("Content rewards claimed: {}", total_reward);
        Ok(())
    }

    /// Create NFT for viral content
    pub fn mint_viral_nft(
        ctx: Context<MintViralNFT>,
        name: String,
        symbol: String,
        uri: String,
    ) -> Result<()> {
        let content_post = &ctx.accounts.content_post;

        require!(
            content_post.is_viral,
            SocialRewardsError::ContentNotViral
        );

        require!(
            content_post.virality_score >= 8000, // High virality threshold for NFT
            SocialRewardsError::InsufficientViralityForNFT
        );

        require!(name.len() <= 32, SocialRewardsError::NameTooLong);
        require!(symbol.len() <= 10, SocialRewardsError::SymbolTooLong);
        require!(uri.len() <= 200, SocialRewardsError::UriTooLong);

        // Mint NFT to creator
        let cpi_accounts = MintTo {
            mint: ctx.accounts.nft_mint.to_account_info(),
            to: ctx.accounts.creator_nft_account.to_account_info(),
            authority: ctx.accounts.creator.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::mint_to(cpi_ctx, 1)?; // Mint 1 NFT

        emit!(ViralNFTMinted {
            post: content_post.key(),
            creator: content_post.creator,
            nft_mint: ctx.accounts.nft_mint.key(),
            virality_score: content_post.virality_score,
            timestamp: Clock::get()?.unix_timestamp,
        });

        msg!("Viral NFT minted for content");
        Ok(())
    }

    /// Create influence leaderboard
    pub fn update_influence_leaderboard(
        ctx: Context<UpdateInfluenceLeaderboard>,
        top_influencers: Vec<InfluencerEntry>,
    ) -> Result<()> {
        require!(
            top_influencers.len() <= 100,
            SocialRewardsError::TooManyInfluencers
        );

        let leaderboard = &mut ctx.accounts.influence_leaderboard;
        leaderboard.season = leaderboard.season + 1;
        leaderboard.top_influencers = top_influencers;
        leaderboard.updated_at = Clock::get()?.unix_timestamp;

        emit!(InfluenceLeaderboardUpdated {
            leaderboard: leaderboard.key(),
            season: leaderboard.season,
            total_influencers: leaderboard.top_influencers.len() as u32,
            timestamp: leaderboard.updated_at,
        });

        msg!("Influence leaderboard updated for season {}", leaderboard.season);
        Ok(())
    }

    /// Distribute seasonal rewards to top influencers
    pub fn distribute_seasonal_rewards(
        ctx: Context<DistributeSeasonalRewards>,
        reward_amounts: Vec<u64>,
    ) -> Result<()> {
        let leaderboard = &ctx.accounts.influence_leaderboard;
        let rewards_system = &mut ctx.accounts.rewards_system;

        require!(
            reward_amounts.len() == leaderboard.top_influencers.len(),
            SocialRewardsError::MismatchedRewardAmounts
        );

        let total_distributed = reward_amounts.iter().sum::<u64>();

        // Update global stats
        rewards_system.total_rewards_distributed += total_distributed;
        rewards_system.updated_at = Clock::get()?.unix_timestamp;

        emit!(SeasonalRewardsDistributed {
            season: leaderboard.season,
            total_amount: total_distributed,
            recipients: leaderboard.top_influencers.len() as u32,
            timestamp: Clock::get()?.unix_timestamp,
        });

        msg!("Seasonal rewards distributed: {}", total_distributed);
        Ok(())
    }
}

// Helper functions
fn calculate_engagement_score(likes: u64, shares: u64, comments: u64, views: u64) -> u64 {
    // Weighted engagement score calculation
    let like_weight = 1;
    let share_weight = 3;
    let comment_weight = 2;
    let view_weight = 1;

    let weighted_score = (likes * like_weight) + 
                        (shares * share_weight) + 
                        (comments * comment_weight) + 
                        (views * view_weight / 100); // Views are less valuable

    weighted_score
}

fn calculate_virality_score(
    engagement_score: u64,
    time_since_creation: i64,
    platform: SocialPlatform,
) -> u64 {
    // Platform multipliers
    let platform_multiplier = match platform {
        SocialPlatform::TikTok => 150,
        SocialPlatform::Twitter => 120,
        SocialPlatform::Instagram => 110,
        SocialPlatform::Discord => 100,
        SocialPlatform::Telegram => 90,
        SocialPlatform::YouTube => 130,
    };

    // Time decay factor (content loses virality over time)
    let hours_since_creation = time_since_creation / 3600;
    let time_factor = if hours_since_creation <= 24 {
        100
    } else if hours_since_creation <= 72 {
        80
    } else if hours_since_creation <= 168 {
        60
    } else {
        40
    };

    let virality_score = (engagement_score * platform_multiplier * time_factor) / 10000;
    virality_score.min(10000) // Cap at 10000
}

fn calculate_base_reward(engagement_score: u64, daily_pool: u64) -> u64 {
    // Simple linear calculation - could be more sophisticated
    let reward_per_point = daily_pool / 1000000; // Assuming 1M total engagement points per day
    engagement_score * reward_per_point
}

// Account structures
#[derive(Accounts)]
pub struct InitializeRewardsSystem<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + SocialRewardsSystem::INIT_SPACE,
        seeds = [b"rewards_system"],
        bump
    )]
    pub rewards_system: Account<'info, SocialRewardsSystem>,
    
    pub reward_mint: Account<'info, Mint>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateContentPost<'info> {
    #[account(
        init,
        payer = creator,
        space = 8 + ContentPost::INIT_SPACE,
        seeds = [b"content_post", creator.key().as_ref(), &Clock::get().unwrap().unix_timestamp.to_le_bytes()],
        bump
    )]
    pub content_post: Account<'info, ContentPost>,
    
    #[account(mut)]
    pub user: Account<'info, User>,
    
    #[account(mut)]
    pub rewards_system: Account<'info, SocialRewardsSystem>,
    
    #[account(mut)]
    pub creator: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateEngagement<'info> {
    #[account(mut)]
    pub content_post: Account<'info, ContentPost>,
    
    #[account(mut)]
    pub rewards_system: Account<'info, SocialRewardsSystem>,
    
    pub engagement_oracle: Signer<'info>, // Authorized engagement updater
}

#[derive(Accounts)]
pub struct ClaimContentRewards<'info> {
    #[account(mut)]
    pub content_post: Account<'info, ContentPost>,
    
    #[account(
        mut,
        seeds = [b"rewards_system"],
        bump
    )]
    pub rewards_system: Account<'info, SocialRewardsSystem>,
    
    #[account(mut)]
    pub reward_mint: Account<'info, Mint>,
    
    #[account(
        mut,
        associated_token::mint = reward_mint,
        associated_token::authority = creator,
    )]
    pub creator_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub user: Account<'info, User>,
    
    #[account(mut)]
    pub creator: Signer<'info>,
    
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

#[derive(Accounts)]
pub struct MintViralNFT<'info> {
    pub content_post: Account<'info, ContentPost>,
    
    #[account(
        init,
        payer = creator,
        mint::decimals = 0,
        mint::authority = creator,
        mint::freeze_authority = creator,
    )]
    pub nft_mint: Account<'info, Mint>,
    
    #[account(
        init,
        payer = creator,
        associated_token::mint = nft_mint,
        associated_token::authority = creator,
    )]
    pub creator_nft_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub creator: Signer<'info>,
    
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateInfluenceLeaderboard<'info> {
    #[account(
        init_if_needed,
        payer = authority,
        space = 8 + InfluenceLeaderboard::INIT_SPACE,
        seeds = [b"influence_leaderboard"],
        bump
    )]
    pub influence_leaderboard: Account<'info, InfluenceLeaderboard>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DistributeSeasonalRewards<'info> {
    pub influence_leaderboard: Account<'info, InfluenceLeaderboard>,
    
    #[account(mut)]
    pub rewards_system: Account<'info, SocialRewardsSystem>,
    
    pub authority: Signer<'info>,
}

// Data structures
#[account]
pub struct SocialRewardsSystem {
    pub authority: Pubkey,
    pub reward_mint: Pubkey,
    pub daily_reward_pool: u64,
    pub viral_bonus_multiplier: u16,
    pub engagement_threshold: u64,
    pub total_rewards_distributed: u64,
    pub total_content_pieces: u64,
    pub total_viral_content: u64,
    pub is_active: bool,
    pub created_at: i64,
    pub updated_at: i64,
}

impl SocialRewardsSystem {
    pub const INIT_SPACE: usize = 32 + 32 + 8 + 2 + 8 + 8 + 8 + 8 + 1 + 8 + 8;
}

#[account]
pub struct ContentPost {
    pub creator: Pubkey,
    pub pack: Option<Pubkey>,
    pub platform: SocialPlatform,
    pub content_type: ContentType,
    pub content_hash: String,
    pub metadata_uri: String,
    pub engagement_score: u64,
    pub virality_score: u64,
    pub is_viral: bool,
    pub rewards_claimed: bool,
    pub total_rewards: u64,
    pub likes: u64,
    pub shares: u64,
    pub comments: u64,
    pub views: u64,
    pub created_at: i64,
    pub updated_at: i64,
}

impl ContentPost {
    pub const INIT_SPACE: usize = 32 + (1 + 32) + 1 + 1 + (4 + 64) + (4 + 200) + 8 + 8 + 1 + 1 + 8 + 8 + 8 + 8 + 8 + 8 + 8;
}

#[account]
pub struct InfluenceLeaderboard {
    pub season: u32,
    pub top_influencers: Vec<InfluencerEntry>,
    pub updated_at: i64,
}

impl InfluenceLeaderboard {
    pub const INIT_SPACE: usize = 4 + (4 + 100 * InfluencerEntry::SPACE) + 8;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct InfluencerEntry {
    pub user: Pubkey,
    pub pack: Option<Pubkey>,
    pub influence_score: u64,
    pub viral_content_count: u32,
    pub total_engagement: u64,
    pub rank: u32,
}

impl InfluencerEntry {
    pub const SPACE: usize = 32 + (1 + 32) + 8 + 4 + 8 + 4;
}

// Enums
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum SocialPlatform {
    Twitter,
    TikTok,
    Instagram,
    Discord,
    Telegram,
    YouTube,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum ContentType {
    Text,
    Image,
    Video,
    Audio,
    Meme,
    Tutorial,
    Analysis,
    News,
}

// Events
#[event]
pub struct RewardsSystemInitialized {
    pub system: Pubkey,
    pub authority: Pubkey,
    pub daily_reward_pool: u64,
    pub viral_bonus_multiplier: u16,
    pub timestamp: i64,
}

#[event]
pub struct ContentPostCreated {
    pub post: Pubkey,
    pub creator: Pubkey,
    pub pack: Option<Pubkey>,
    pub platform: SocialPlatform,
    pub content_type: ContentType,
    pub timestamp: i64,
}

#[event]
pub struct EngagementUpdated {
    pub post: Pubkey,
    pub likes: u64,
    pub shares: u64,
    pub comments: u64,
    pub views: u64,
    pub engagement_score: u64,
    pub virality_score: u64,
    pub timestamp: i64,
}

#[event]
pub struct ContentWentViral {
    pub post: Pubkey,
    pub creator: Pubkey,
    pub engagement_score: u64,
    pub virality_score: u64,
    pub timestamp: i64,
}

#[event]
pub struct RewardsClaimed {
    pub post: Pubkey,
    pub creator: Pubkey,
    pub base_reward: u64,
    pub viral_bonus: u64,
    pub total_reward: u64,
    pub timestamp: i64,
}

#[event]
pub struct ViralNFTMinted {
    pub post: Pubkey,
    pub creator: Pubkey,
    pub nft_mint: Pubkey,
    pub virality_score: u64,
    pub timestamp: i64,
}

#[event]
pub struct InfluenceLeaderboardUpdated {
    pub leaderboard: Pubkey,
    pub season: u32,
    pub total_influencers: u32,
    pub timestamp: i64,
}

#[event]
pub struct SeasonalRewardsDistributed {
    pub season: u32,
    pub total_amount: u64,
    pub recipients: u32,
    pub timestamp: i64,
}

// Errors
#[error_code]
pub enum SocialRewardsError {
    #[msg("Content hash too long")]
    ContentHashTooLong,
    #[msg("Metadata URI too long")]
    MetadataUriTooLong,
    #[msg("Rewards already claimed")]
    RewardsAlreadyClaimed,
    #[msg("Content is not viral")]
    ContentNotViral,
    #[msg("Rewards system is inactive")]
    RewardsSystemInactive,
    #[msg("Insufficient virality score for NFT")]
    InsufficientViralityForNFT,
    #[msg("Name too long")]
    NameTooLong,
    #[msg("Symbol too long")]
    SymbolTooLong,
    #[msg("URI too long")]
    UriTooLong,
    #[msg("Too many influencers")]
    TooManyInfluencers,
    #[msg("Mismatched reward amounts")]
    MismatchedRewardAmounts,
    #[msg("Unauthorized")]
    Unauthorized,
}
