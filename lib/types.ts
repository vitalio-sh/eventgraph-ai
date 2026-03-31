export interface UserProfile {
  name: string;
  current_role: string;
  company: string;
  skills: string[];
  industries: string[];
  interests: string[];
  looking_for: string[];
  past_companies: string[];
  education: string[];
  location: string;
  date_range: { start: string; end: string };
}

export interface EventResult {
  slug: string;
  api_id: string;
  title: string;
  description: string;
  date: string;
  start: string;
  end: string;
  venue: string;
  city: string;
  url: string;
  cover_url: string;
  hosts: string[];
  attendee_count: number;
  calendar_name: string;
}

export interface PersonResult {
  luma_id: string;
  name: string;
  headline: string;
  about: string;
  company: string;
  job_title: string;
  linkedin_url: string;
  profile_pic: string;
  connections: number;
  followers: number;
  twitter: string;
  website: string;
  email: string;
}

export interface MatchedPerson extends PersonResult {
  matching_skills: string[];
  shared_companies: string[];
  events: string[];
  relevance_score: number;
  relevance_reason: string;
  ice_breaker: string;
  pagerank_score?: number;
  betweenness_score?: number;
  community_id?: number;
}

export interface EventRecommendation {
  event: EventResult;
  why_go: string;
  relevance_score: number;
  people_to_meet: MatchedPerson[];
  graph_score?: number;
  bridge_connectors?: number;
}

export interface SuperConnector {
  name: string;
  headline: string;
  linkedin_url: string;
  profile_pic: string;
  event_count: number;
  events: string[];
  why_connect: string;
}

export interface RecommendationResponse {
  user_profile: UserProfile;
  recommendations: EventRecommendation[];
  super_connectors: SuperConnector[];
}

export interface GraphData {
  nodeCount: number;
  relCount: number;
  communityCount: number;
  connectionPaths: ConnectionPath[];
}

export interface ConnectionPath {
  personName: string;
  personLumaId: string;
  hops: number;
  via: string[];
}

export type SSEEventType =
  | "profile_parsed"
  | "events_found"
  | "ranking_complete"
  | "ice_breakers_complete"
  | "super_connectors"
  | "graph_data"
  | "error"
  | "done";

export interface SSEEvent {
  type: SSEEventType;
  data: unknown;
}
