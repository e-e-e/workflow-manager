import * as D from './decoders';

export const RepoInfoDecoder = D.object({
  fullName: D.string,
  owner: D.string,
  name: D.string,
  description: D.string,
  url: D.string,
  defaultBranch: D.string,
});

export type RepoInfo = D.Infer<typeof RepoInfoDecoder>;

export const GetRepoResponseDecoder = D.object({
  data: D.array(RepoInfoDecoder),
  nextPage: D.optional(D.number),
})

export type GetRepoResponse = D.Infer<typeof GetRepoResponseDecoder>;

export const WorkflowInfoDecoder = D.object({
  id: D.number,
  path: D.string,
  name: D.string,
});

export type WorkflowInfo = D.Infer<typeof WorkflowInfoDecoder>;

export const WorkflowRunDecoder = D.object({
  id: D.number,
  number: D.number,
  status: D.optional(D.string),
  conclusion: D.optional(D.string),
  logsUrl: D.string,
  actorName: D.optional(D.string),
  startedAt: D.optional(D.string),
  createdAt: D.string,
  updatedAt: D.string,
})

export type WorkflowRun = D.Infer<typeof WorkflowRunDecoder>
