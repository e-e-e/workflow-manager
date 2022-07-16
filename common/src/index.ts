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
