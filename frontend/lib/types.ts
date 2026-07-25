// Mirrors backend/models/schemas.py and backend/models/paper.py

export type OperationType =
  | "auto"
  | "search"
  | "analyze"
  | "compare"
  | "citations"
  | "research_gaps";

export type MessageType =
  | "text"
  | "search_results"
  | "comparison"
  | "analysis"
  | "paper_details"
  | "research_gaps"
  | "clarification";

export interface PaperAuthor {
  name: string;
  author_id?: string | null;
  institution?: string | null;
}

export interface PaperTopic {
  id: string;
  display_name: string;
  level?: number | null;
}

export interface PrimaryTopicPath {
  domain?: string | null;
  field?: string | null;
  subfield?: string | null;
  topic?: string | null;
}

export interface PaperSource {
  id?: string | null;
  display_name?: string | null;
}

export interface Paper {
  openalex_id: string;
  title: string;
  abstract?: string | null;
  authors: PaperAuthor[];
  publication_year?: number | null;
  publication_date?: string | null;
  doi?: string | null;
  citation_count: number;
  topics: PaperTopic[];
  primary_topic?: PrimaryTopicPath | null;
  open_access: boolean;
  oa_url?: string | null;
  source?: PaperSource | null;
  work_type?: string | null;
}

export interface PaperPreview {
  openalex_id: string;
  title: string;
}

export interface MessageData {
  collection_id?: string | null;
  papers: PaperPreview[];
  extra?: Record<string, unknown> | null;
}

export interface ResearchMessage {
  id: string;
  session_id: string;
  role: "user" | "agent";
  message_type: MessageType;
  content: string;
  operation?: OperationType | null;
  data?: MessageData | null;
  created_at: string;
}

export interface ResearchSession {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ResearchCollection {
  id: string;
  collection_id: string;
  session_id: string;
  type: "paper_collection";
  name: string;
  paper_ids: string[];
  papers: Paper[];
  created_at: string;
}

export interface UserPublic {
  id: string;
  email: string;
  name?: string | null;
}
