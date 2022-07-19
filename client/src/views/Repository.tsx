import { useParams } from 'react-router-dom';
import React from 'react';
import { WorkflowDetails } from './WorkflowDetail';
import { useQuery } from 'react-query';
import { WorkflowInfo } from 'common';

function useWorkflows(owner: string, repo: string) {
  return useQuery(['repo', owner, repo], async () => {
    const res = await fetch(`/api/v1/${owner}/${repo}/workflows`);
    return res.json() as Promise<WorkflowInfo[]>;
  });
}

export const Repository = () => {
  const { repo, owner } = useParams<{ owner: string; repo: string }>();
  const { isLoading, error, data, refetch } = useWorkflows(owner!, repo!);
  if (isLoading) return <div>Loading...</div>;
  if (error)
    return (
      <div>
        Opps <button onClick={() => refetch()}> try again</button>.
      </div>
    );
  return (
    <div>
      <h1>
        Workflows for {owner}/{repo}
      </h1>
      {data?.map((workflow) => (
        <div key={workflow.id}>
          <h3>{workflow.name}</h3>
          <WorkflowDetails
            repo={repo!}
            owner={owner!}
            path={workflow.path}
            workflowId={workflow.id}
          />
        </div>
      ))}
    </div>
  );
};
