import React, { useCallback, useEffect, useRef } from 'react';
import { useQuery } from 'react-query';
import yaml from 'js-yaml';
import {
  GithubWorkflowInput,
  WorkflowInputs,
} from '../components/GithubWorkflowInput/WorkflowInputs';
import { WorkflowRun } from 'common';

async function executeWorkflow(
  owner: string,
  repo: string,
  id: number,
  options?: { ref?: string; inputs: Record<string, unknown> }
) {
  await fetch(`/api/v1/${owner}/${repo}/workflow/${id}/dispatch`, {
    method: 'POST',
    body: options ? JSON.stringify(options) : undefined,
  });
}

function useWorkflowRuns(
  owner: string,
  repo: string,
  workflowId: number,
  refetchInterval?: number
) {
  return useQuery<WorkflowRun[]>(
    ['wf-runs', owner, repo, workflowId, refetchInterval],
    async () => {
      const res = await fetch(
        `/api/v1/${owner}/${repo}/workflow/${workflowId}/runs`
      );
      return await res.json();
    },
    {
      keepPreviousData: true,
      refetchInterval,
    }
  );
}

type WorkflowConfig = {
  on?: { workflow_dispatch?: { inputs?: Record<string, GithubWorkflowInput> } };
};

function isWorkflowConfigWithWorkflowDispatch(d: unknown): d is WorkflowConfig {
  return !(typeof d !== 'object' || d == null);
}

function useWorkflowYaml(owner: string, repo: string, url?: string) {
  return useQuery(
    ['wf-yml', owner, repo, url],
    async () => {
      const res = await fetch(`/api/v1/${owner}/${repo}/workflow/yaml/${url}`);
      const { content } = await res.json();
      if (!content) {
        return null;
      }
      const workflow: unknown = yaml.load(atob(content));
      if (
        isWorkflowConfigWithWorkflowDispatch(workflow) &&
        workflow?.on?.workflow_dispatch
      ) {
        return workflow.on.workflow_dispatch;
      }
      return null;
    },
    { enabled: !!url }
  );
}

const WorkflowRun = React.memo(function WorkflowRunFn(props: WorkflowRun) {
  return (
    <li>
      <strong>Run #{props.number}:</strong> status: {props.status} / result:
      {props.conclusion} [
      <a href={props.logsUrl} target="_blank" rel="noreferrer">
        link
      </a>
      ]<br />
      <sub>
        Triggered By: {props.actorName},<br />
        at {props.createdAt}
        <br />
        started at: {props.startedAt}
        <br />
        updated: {props.updatedAt}
      </sub>
    </li>
  );
});

const WorkflowRuns = ({
  repo,
  owner,
  workflowId,
  runAction,
}: {
  repo: string;
  owner: string;
  workflowId: number;
  runAction: () => void;
}) => {
  const timeSinceAction = useRef<number | null>(null);
  const [isPolling, setIsPolling] = React.useState(false);
  const { isLoading, error, data, isFetching } = useWorkflowRuns(
    owner,
    repo,
    workflowId,
    isPolling ? 500 : undefined
  );
  useEffect(() => {
    if (isLoading || isFetching) return;
    if (!data) return;
    if (data.length === 0) return;
    if (data.some((d) => !d.conclusion)) {
      console.log('effect - run polling');
      setIsPolling(true);
    } else if (
      isPolling &&
      Date.now() - (timeSinceAction.current || 0) > 5000
    ) {
      setIsPolling(false);
    }
  }, [data, isFetching, isLoading, timeSinceAction, isPolling]);
  const run = () => {
    runAction();
    console.log('start pollings');
    timeSinceAction.current = Date.now();
    setIsPolling(true);
  };
  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Opps</div>;
  return (
    <div>
      <button onClick={run}>Run workflow</button>
      {data ? (
        <ul>
          {data.map((run) => (
            <WorkflowRun key={run.id} {...run} />
          ))}
        </ul>
      ) : null}
      {isLoading ? <div>Loading...</div> : null}
      {error ? <div>Something went wrong</div> : null}
    </div>
  );
};

export const WorkflowDetails = ({
  repo,
  owner,
  workflowId,
  path,
}: {
  repo: string;
  owner: string;
  workflowId: number;
  path: string;
}) => {
  const { isLoading, error, data, refetch } = useWorkflowYaml(
    owner,
    repo,
    path
  );
  const inputsRef = useRef<Record<string, string | boolean>>({});
  const setInputs = useCallback((v: Record<string, string | boolean>) => {
    inputsRef.current = v;
  }, []);
  const runDispatch = useCallback(async () => {
    // todo: validate that expected values
    await executeWorkflow(owner, repo, workflowId, {
      ref: 'main',
      inputs: inputsRef.current,
    });
  }, [owner, repo, workflowId, inputsRef]);
  if (isLoading) return <div>Loading...</div>;
  if (error)
    return (
      <div>
        Opps <button onClick={() => refetch()}> try again</button>.
      </div>
    );
  return data ? (
    <div>
      {data.inputs && (
        <WorkflowInputs inputs={data.inputs} onChange={setInputs} />
      )}
      <WorkflowRuns
        owner={owner}
        repo={repo}
        workflowId={workflowId}
        runAction={runDispatch}
      />
    </div>
  ) : null;
};
