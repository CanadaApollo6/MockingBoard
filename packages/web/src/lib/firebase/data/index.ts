// Re-export all domain modules for backward compatibility.
// Consumers can import from '@/lib/firebase/data' without changes.

export {
  getDrafts,
  getDraft,
  getDraftOrFail,
  getDraftPicks,
  getPlayerMap,
  getDraftTrades,
  getPublicLobbies,
  getDraftsPaginated,
  getUserDraftsPaginated,
  getRecentCompletedDraft,
  getUserStats,
  getUserDraftingIdentity,
} from './drafts';
export type { DraftingIdentity } from './drafts';

export {
  getUserBoards,
  getBigBoard,
  getUserBoardForYear,
  getBoardSnapshots,
  getBoardSnapshot,
  getPublicBoards,
  getBigBoardBySlug,
  getUserPublicBoards,
  getBoardsByIds,
  getUserLikedBoards,
  getUserBookmarkedBoards,
  getTrendingBoards,
} from './boards';

export {
  getPlayerReports,
  getUserReports,
  getReportsByIds,
  getUserLikedReports,
  getUserBookmarkedReports,
  getPopularReports,
} from './reports';

export {
  getUserBySlug,
  getPublicUsers,
  getFollowCounts,
  getLeaderboard,
  getScoutProfiles,
  getScoutProfileBySlug,
  getScoutContributedPlayers,
} from './users';

export {
  getPublicLists,
  getListBySlug,
  getList,
  getUserPublicLists,
  getUserLists,
  getPopularLists,
} from './lists';

export {
  getYearLeaderboard,
  getDraftResults,
  getUserDraftScores,
  getUserBoardScores,
  getBoardScore,
  getBoardLeaderboard,
} from './scores';
export type {
  LeaderboardEntry,
  DraftScoreDoc,
  BoardScoreDoc,
  BoardLeaderboardEntry,
} from './scores';

export { getUserWatchlist, getWatchedPlayerIds, isWatching } from './watchlist';

export {
  getComments,
  getPlayerVideos,
  getPlayerPickStats,
  getConsensusBoard,
  getTrendingProspects,
  getBoardHotTakes,
  getGlobalHotTakes,
} from './community';
export type {
  ConsensusEntry,
  ConsensusBoard,
  TrendingProspect,
  TrendingData,
  HotTake,
  GlobalHotTakes,
} from './community';
