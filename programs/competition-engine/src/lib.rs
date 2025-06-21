use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Mint, Transfer};
use alpha_pack_core::{Pack, User, PackStatus};

declare_id!("CompetitionEngine11111111111111111111111111");

#[program]
pub mod competition_engine {
    use super::*;

    /// Create a new competition
    pub fn create_competition(
        ctx: Context<CreateCompetition>,
        name: String,
        description: String,
        competition_type: CompetitionType,
        entry_fee: u64,
        prize_pool: u64,
        max_participants: u32,
        duration_hours: u32,
    ) -> Result<()> {
        require!(name.len() <= 100, CompetitionError::NameTooLong);
        require!(description.len() <= 1000, CompetitionError::DescriptionTooLong);
        require!(max_participants >= 2, CompetitionError::InvalidParticipantCount);
        require!(duration_hours >= 1 && duration_hours <= 168, CompetitionError::InvalidDuration); // 1 hour to 1 week

        let competition = &mut ctx.accounts.competition;
        let current_time = Clock::get()?.unix_timestamp;

        competition.authority = ctx.accounts.authority.key();
        competition.name = name;
        competition.description = description;
        competition.competition_type = competition_type;
        competition.status = CompetitionStatus::Registration;
        competition.entry_fee = entry_fee;
        competition.prize_pool = prize_pool;
        competition.max_participants = max_participants;
        competition.current_participants = 0;
        competition.participants = Vec::new();
        competition.leaderboard = Vec::new();
        competition.start_time = current_time + 3600; // Start 1 hour from creation
        competition.end_time = current_time + 3600 + (duration_hours as i64 * 3600);
        competition.registration_deadline = current_time + 1800; // 30 minutes to register
        competition.created_at = current_time;
        competition.updated_at = current_time;

        emit!(CompetitionCreated {
            competition: competition.key(),
            name: competition.name.clone(),
            competition_type: competition.competition_type.clone(),
            entry_fee,
            prize_pool,
            max_participants,
            start_time: competition.start_time,
            end_time: competition.end_time,
            timestamp: current_time,
        });

        msg!("Competition created: {}", competition.name);
        Ok(())
    }

    /// Register pack for competition
    pub fn register_for_competition(
        ctx: Context<RegisterForCompetition>,
    ) -> Result<()> {
        let competition = &mut ctx.accounts.competition;
        let pack = &ctx.accounts.pack;
        let current_time = Clock::get()?.unix_timestamp;

        require!(
            competition.status == CompetitionStatus::Registration,
            CompetitionError::RegistrationClosed
        );
        
        require!(
            current_time < competition.registration_deadline,
            CompetitionError::RegistrationDeadlinePassed
        );

        require!(
            competition.current_participants < competition.max_participants,
            CompetitionError::CompetitionFull
        );

        require!(
            pack.status == PackStatus::Active,
            CompetitionError::PackNotActive
        );

        // Check if pack is already registered
        let already_registered = competition.participants.iter()
            .any(|p| p.pack == pack.key());
        require!(!already_registered, CompetitionError::AlreadyRegistered);

        // Pay entry fee if required
        if competition.entry_fee > 0 {
            let cpi_accounts = Transfer {
                from: ctx.accounts.pack_treasury.to_account_info(),
                to: ctx.accounts.competition_treasury.to_account_info(),
                authority: ctx.accounts.pack_leader.to_account_info(),
            };
            let cpi_program = ctx.accounts.token_program.to_account_info();
            let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
            token::transfer(cpi_ctx, competition.entry_fee)?;

            // Add entry fee to prize pool
            competition.prize_pool += competition.entry_fee;
        }

        // Add pack to competition
        let participant = CompetitionParticipant {
            pack: pack.key(),
            pack_name: pack.name.clone(),
            leader: pack.leader,
            members: pack.members.clone(),
            score: 0,
            rank: 0,
            trades_count: 0,
            volume: 0,
            profit_loss: 0,
            social_score: 0,
            registered_at: current_time,
        };

        competition.participants.push(participant);
        competition.current_participants += 1;
        competition.updated_at = current_time;

        emit!(PackRegistered {
            competition: competition.key(),
            pack: pack.key(),
            pack_name: pack.name.clone(),
            leader: pack.leader,
            entry_fee: competition.entry_fee,
            timestamp: current_time,
        });

        msg!("Pack {} registered for competition", pack.name);
        Ok(())
    }

    /// Start competition (admin only)
    pub fn start_competition(ctx: Context<StartCompetition>) -> Result<()> {
        let competition = &mut ctx.accounts.competition;
        let current_time = Clock::get()?.unix_timestamp;

        require!(
            competition.status == CompetitionStatus::Registration,
            CompetitionError::InvalidStatus
        );

        require!(
            competition.current_participants >= 2,
            CompetitionError::InsufficientParticipants
        );

        require!(
            current_time >= competition.start_time,
            CompetitionError::TooEarlyToStart
        );

        competition.status = CompetitionStatus::Active;
        competition.updated_at = current_time;

        // Initialize leaderboard
        for participant in &competition.participants {
            let leaderboard_entry = LeaderboardEntry {
                pack: participant.pack,
                pack_name: participant.pack_name.clone(),
                score: 0,
                rank: 0,
                change: 0,
            };
            competition.leaderboard.push(leaderboard_entry);
        }

        emit!(CompetitionStarted {
            competition: competition.key(),
            participants: competition.current_participants,
            timestamp: current_time,
        });

        msg!("Competition started: {}", competition.name);
        Ok(())
    }

    /// Update pack score in competition
    pub fn update_pack_score(
        ctx: Context<UpdatePackScore>,
        pack: Pubkey,
        score_delta: i64,
        trade_volume: u64,
        profit_loss: i64,
        social_score_delta: u64,
    ) -> Result<()> {
        let competition = &mut ctx.accounts.competition;
        let current_time = Clock::get()?.unix_timestamp;

        require!(
            competition.status == CompetitionStatus::Active,
            CompetitionError::CompetitionNotActive
        );

        require!(
            current_time < competition.end_time,
            CompetitionError::CompetitionEnded
        );

        // Find participant
        let participant_index = competition.participants.iter()
            .position(|p| p.pack == pack)
            .ok_or(CompetitionError::PackNotInCompetition)?;

        // Update participant stats
        let participant = &mut competition.participants[participant_index];
        participant.score = (participant.score as i64 + score_delta).max(0) as u64;
        participant.trades_count += 1;
        participant.volume += trade_volume;
        participant.profit_loss += profit_loss;
        participant.social_score += social_score_delta;

        // Calculate composite score based on competition type
        let composite_score = match competition.competition_type {
            CompetitionType::TradingVolume => participant.volume,
            CompetitionType::ProfitPercentage => {
                if participant.volume > 0 {
                    ((participant.profit_loss as f64 / participant.volume as f64) * 10000.0) as u64
                } else {
                    0
                }
            },
            CompetitionType::ArbitrageSuccess => participant.score,
            CompetitionType::SocialEngagement => participant.social_score,
            CompetitionType::CombinedScore => {
                // Weighted combination of all metrics
                let trading_weight = 0.4;
                let profit_weight = 0.3;
                let social_weight = 0.3;
                
                let normalized_volume = (participant.volume / 1000).min(1000); // Cap at 1000
                let normalized_profit = ((participant.profit_loss.max(0) as u64) / 100).min(1000);
                let normalized_social = participant.social_score.min(1000);
                
                ((normalized_volume as f64 * trading_weight) +
                 (normalized_profit as f64 * profit_weight) +
                 (normalized_social as f64 * social_weight)) as u64
            },
        };

        participant.score = composite_score;

        // Update leaderboard
        update_leaderboard(competition)?;

        competition.updated_at = current_time;

        emit!(PackScoreUpdated {
            competition: competition.key(),
            pack,
            new_score: participant.score,
            rank: participant.rank,
            volume: participant.volume,
            profit_loss: participant.profit_loss,
            timestamp: current_time,
        });

        msg!("Pack score updated in competition");
        Ok(())
    }

    /// End competition and distribute prizes
    pub fn end_competition(ctx: Context<EndCompetition>) -> Result<()> {
        let competition = &mut ctx.accounts.competition;
        let current_time = Clock::get()?.unix_timestamp;

        require!(
            competition.status == CompetitionStatus::Active,
            CompetitionError::InvalidStatus
        );

        require!(
            current_time >= competition.end_time,
            CompetitionError::CompetitionNotEnded
        );

        competition.status = CompetitionStatus::Completed;
        competition.updated_at = current_time;

        // Final leaderboard update
        update_leaderboard(competition)?;

        // Distribute prizes (simplified - top 3 get rewards)
        let prize_distribution = vec![
            (0.5, "1st Place"), // 50% to winner
            (0.3, "2nd Place"), // 30% to second
            (0.2, "3rd Place"), // 20% to third
        ];

        for (i, (percentage, place)) in prize_distribution.iter().enumerate() {
            if i < competition.leaderboard.len() {
                let prize_amount = (competition.prize_pool as f64 * percentage) as u64;
                let winner = &competition.leaderboard[i];
                
                emit!(PrizeAwarded {
                    competition: competition.key(),
                    pack: winner.pack,
                    pack_name: winner.pack_name.clone(),
                    place: place.to_string(),
                    prize_amount,
                    timestamp: current_time,
                });
            }
        }

        emit!(CompetitionEnded {
            competition: competition.key(),
            winner: if !competition.leaderboard.is_empty() {
                Some(competition.leaderboard[0].pack)
            } else {
                None
            },
            total_participants: competition.current_participants,
            total_prize_pool: competition.prize_pool,
            timestamp: current_time,
        });

        msg!("Competition ended: {}", competition.name);
        Ok(())
    }

    /// Create tournament (multiple competitions)
    pub fn create_tournament(
        ctx: Context<CreateTournament>,
        name: String,
        description: String,
        tournament_type: TournamentType,
        rounds: u8,
        entry_fee: u64,
    ) -> Result<()> {
        require!(name.len() <= 100, CompetitionError::NameTooLong);
        require!(description.len() <= 1000, CompetitionError::DescriptionTooLong);
        require!(rounds >= 1 && rounds <= 10, CompetitionError::InvalidRounds);

        let tournament = &mut ctx.accounts.tournament;
        let current_time = Clock::get()?.unix_timestamp;

        tournament.authority = ctx.accounts.authority.key();
        tournament.name = name;
        tournament.description = description;
        tournament.tournament_type = tournament_type;
        tournament.status = TournamentStatus::Registration;
        tournament.total_rounds = rounds;
        tournament.current_round = 0;
        tournament.entry_fee = entry_fee;
        tournament.total_prize_pool = 0;
        tournament.participants = Vec::new();
        tournament.competitions = Vec::new();
        tournament.winners = Vec::new();
        tournament.created_at = current_time;
        tournament.updated_at = current_time;

        emit!(TournamentCreated {
            tournament: tournament.key(),
            name: tournament.name.clone(),
            tournament_type: tournament.tournament_type.clone(),
            rounds,
            entry_fee,
            timestamp: current_time,
        });

        msg!("Tournament created: {}", tournament.name);
        Ok(())
    }

    /// Advance tournament to next round
    pub fn advance_tournament_round(ctx: Context<AdvanceTournamentRound>) -> Result<()> {
        let tournament = &mut ctx.accounts.tournament;
        let current_time = Clock::get()?.unix_timestamp;

        require!(
            tournament.status == TournamentStatus::Active,
            CompetitionError::TournamentNotActive
        );

        require!(
            tournament.current_round < tournament.total_rounds,
            CompetitionError::TournamentCompleted
        );

        tournament.current_round += 1;
        tournament.updated_at = current_time;

        // If final round, complete tournament
        if tournament.current_round >= tournament.total_rounds {
            tournament.status = TournamentStatus::Completed;
        }

        emit!(TournamentRoundAdvanced {
            tournament: tournament.key(),
            round: tournament.current_round,
            completed: tournament.status == TournamentStatus::Completed,
            timestamp: current_time,
        });

        msg!("Tournament advanced to round {}", tournament.current_round);
        Ok(())
    }
}

// Helper function to update leaderboard
fn update_leaderboard(competition: &mut Competition) -> Result<()> {
    // Sort participants by score (descending)
    let mut sorted_participants: Vec<_> = competition.participants.iter().enumerate().collect();
    sorted_participants.sort_by(|a, b| b.1.score.cmp(&a.1.score));

    // Update ranks and leaderboard
    competition.leaderboard.clear();
    for (new_rank, (original_index, participant)) in sorted_participants.iter().enumerate() {
        let old_rank = competition.participants[*original_index].rank;
        let rank_change = if old_rank == 0 { 0 } else { old_rank as i32 - (new_rank + 1) as i32 };

        // Update participant rank
        competition.participants[*original_index].rank = (new_rank + 1) as u32;

        // Add to leaderboard
        let leaderboard_entry = LeaderboardEntry {
            pack: participant.pack,
            pack_name: participant.pack_name.clone(),
            score: participant.score,
            rank: (new_rank + 1) as u32,
            change: rank_change,
        };
        competition.leaderboard.push(leaderboard_entry);
    }

    Ok(())
}

// Account structures
#[derive(Accounts)]
pub struct CreateCompetition<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Competition::INIT_SPACE,
        seeds = [b"competition", authority.key().as_ref(), &Clock::get().unwrap().unix_timestamp.to_le_bytes()],
        bump
    )]
    pub competition: Account<'info, Competition>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RegisterForCompetition<'info> {
    #[account(mut)]
    pub competition: Account<'info, Competition>,
    
    pub pack: Account<'info, Pack>,
    
    #[account(mut)]
    pub pack_treasury: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub competition_treasury: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub pack_leader: Signer<'info>,
    
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct StartCompetition<'info> {
    #[account(
        mut,
        has_one = authority
    )]
    pub competition: Account<'info, Competition>,
    
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct UpdatePackScore<'info> {
    #[account(mut)]
    pub competition: Account<'info, Competition>,
    
    pub score_oracle: Signer<'info>, // Authorized score updater
}

#[derive(Accounts)]
pub struct EndCompetition<'info> {
    #[account(
        mut,
        has_one = authority
    )]
    pub competition: Account<'info, Competition>,
    
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct CreateTournament<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Tournament::INIT_SPACE,
        seeds = [b"tournament", authority.key().as_ref(), &Clock::get().unwrap().unix_timestamp.to_le_bytes()],
        bump
    )]
    pub tournament: Account<'info, Tournament>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AdvanceTournamentRound<'info> {
    #[account(
        mut,
        has_one = authority
    )]
    pub tournament: Account<'info, Tournament>,
    
    pub authority: Signer<'info>,
}

// Data structures
#[account]
pub struct Competition {
    pub authority: Pubkey,
    pub name: String,
    pub description: String,
    pub competition_type: CompetitionType,
    pub status: CompetitionStatus,
    pub entry_fee: u64,
    pub prize_pool: u64,
    pub max_participants: u32,
    pub current_participants: u32,
    pub participants: Vec<CompetitionParticipant>,
    pub leaderboard: Vec<LeaderboardEntry>,
    pub start_time: i64,
    pub end_time: i64,
    pub registration_deadline: i64,
    pub created_at: i64,
    pub updated_at: i64,
}

impl Competition {
    pub const INIT_SPACE: usize = 32 + (4 + 100) + (4 + 1000) + 1 + 1 + 8 + 8 + 4 + 4 + 
        (4 + 50 * CompetitionParticipant::SPACE) + (4 + 50 * LeaderboardEntry::SPACE) + 8 + 8 + 8 + 8 + 8;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct CompetitionParticipant {
    pub pack: Pubkey,
    pub pack_name: String,
    pub leader: Pubkey,
    pub members: Vec<Pubkey>,
    pub score: u64,
    pub rank: u32,
    pub trades_count: u32,
    pub volume: u64,
    pub profit_loss: i64,
    pub social_score: u64,
    pub registered_at: i64,
}

impl CompetitionParticipant {
    pub const SPACE: usize = 32 + (4 + 100) + 32 + (4 + 20 * 32) + 8 + 4 + 4 + 8 + 8 + 8 + 8;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct LeaderboardEntry {
    pub pack: Pubkey,
    pub pack_name: String,
    pub score: u64,
    pub rank: u32,
    pub change: i32,
}

impl LeaderboardEntry {
    pub const SPACE: usize = 32 + (4 + 100) + 8 + 4 + 4;
}

#[account]
pub struct Tournament {
    pub authority: Pubkey,
    pub name: String,
    pub description: String,
    pub tournament_type: TournamentType,
    pub status: TournamentStatus,
    pub total_rounds: u8,
    pub current_round: u8,
    pub entry_fee: u64,
    pub total_prize_pool: u64,
    pub participants: Vec<Pubkey>,
    pub competitions: Vec<Pubkey>,
    pub winners: Vec<TournamentWinner>,
    pub created_at: i64,
    pub updated_at: i64,
}

impl Tournament {
    pub const INIT_SPACE: usize = 32 + (4 + 100) + (4 + 1000) + 1 + 1 + 1 + 1 + 8 + 8 + 
        (4 + 100 * 32) + (4 + 20 * 32) + (4 + 10 * TournamentWinner::SPACE) + 8 + 8;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct TournamentWinner {
    pub round: u8,
    pub pack: Pubkey,
    pub pack_name: String,
    pub prize_amount: u64,
}

impl TournamentWinner {
    pub const SPACE: usize = 1 + 32 + (4 + 100) + 8;
}

// Enums
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum CompetitionType {
    TradingVolume,
    ProfitPercentage,
    ArbitrageSuccess,
    SocialEngagement,
    CombinedScore,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum CompetitionStatus {
    Registration,
    Active,
    Completed,
    Cancelled,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum TournamentType {
    Elimination,
    RoundRobin,
    Swiss,
    Ladder,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum TournamentStatus {
    Registration,
    Active,
    Completed,
    Cancelled,
}

// Events
#[event]
pub struct CompetitionCreated {
    pub competition: Pubkey,
    pub name: String,
    pub competition_type: CompetitionType,
    pub entry_fee: u64,
    pub prize_pool: u64,
    pub max_participants: u32,
    pub start_time: i64,
    pub end_time: i64,
    pub timestamp: i64,
}

#[event]
pub struct PackRegistered {
    pub competition: Pubkey,
    pub pack: Pubkey,
    pub pack_name: String,
    pub leader: Pubkey,
    pub entry_fee: u64,
    pub timestamp: i64,
}

#[event]
pub struct CompetitionStarted {
    pub competition: Pubkey,
    pub participants: u32,
    pub timestamp: i64,
}

#[event]
pub struct PackScoreUpdated {
    pub competition: Pubkey,
    pub pack: Pubkey,
    pub new_score: u64,
    pub rank: u32,
    pub volume: u64,
    pub profit_loss: i64,
    pub timestamp: i64,
}

#[event]
pub struct CompetitionEnded {
    pub competition: Pubkey,
    pub winner: Option<Pubkey>,
    pub total_participants: u32,
    pub total_prize_pool: u64,
    pub timestamp: i64,
}

#[event]
pub struct PrizeAwarded {
    pub competition: Pubkey,
    pub pack: Pubkey,
    pub pack_name: String,
    pub place: String,
    pub prize_amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct TournamentCreated {
    pub tournament: Pubkey,
    pub name: String,
    pub tournament_type: TournamentType,
    pub rounds: u8,
    pub entry_fee: u64,
    pub timestamp: i64,
}

#[event]
pub struct TournamentRoundAdvanced {
    pub tournament: Pubkey,
    pub round: u8,
    pub completed: bool,
    pub timestamp: i64,
}

// Errors
#[error_code]
pub enum CompetitionError {
    #[msg("Name too long")]
    NameTooLong,
    #[msg("Description too long")]
    DescriptionTooLong,
    #[msg("Invalid participant count")]
    InvalidParticipantCount,
    #[msg("Invalid duration")]
    InvalidDuration,
    #[msg("Registration is closed")]
    RegistrationClosed,
    #[msg("Registration deadline has passed")]
    RegistrationDeadlinePassed,
    #[msg("Competition is full")]
    CompetitionFull,
    #[msg("Pack is not active")]
    PackNotActive,
    #[msg("Pack already registered")]
    AlreadyRegistered,
    #[msg("Invalid status")]
    InvalidStatus,
    #[msg("Insufficient participants")]
    InsufficientParticipants,
    #[msg("Too early to start")]
    TooEarlyToStart,
    #[msg("Competition not active")]
    CompetitionNotActive,
    #[msg("Competition has ended")]
    CompetitionEnded,
    #[msg("Pack not in competition")]
    PackNotInCompetition,
    #[msg("Competition has not ended")]
    CompetitionNotEnded,
    #[msg("Invalid rounds")]
    InvalidRounds,
    #[msg("Tournament not active")]
    TournamentNotActive,
    #[msg("Tournament completed")]
    TournamentCompleted,
    #[msg("Unauthorized")]
    Unauthorized,
}
