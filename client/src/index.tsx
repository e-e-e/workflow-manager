import React, {
  ChangeEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider, useQuery } from 'react-query';
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useParams,
} from 'react-router-dom';
import yaml from 'js-yaml';
import { RepoInfo, WorkflowInfo } from 'common';

function useWorkflows(owner: string, repo: string) {
  return useQuery(['repo', owner, repo], async () => {
    const res = await fetch(`/api/v1/${owner}/${repo}/workflows`);
    return res.json() as Promise<WorkflowInfo[]>;
  });
}

type GithubWorkflowInputBase = {
  required?: boolean;
  description?: string;
};
type GithubWorkflowInputChoice = GithubWorkflowInputBase & {
  type: 'choice';
  options: string[];
  default?: string;
};
type GithubWorkflowInputString = GithubWorkflowInputBase & {
  type?: 'string' | undefined;
  default?: string;
};
type GithubWorkflowInputBoolean = GithubWorkflowInputBase & {
  type: 'boolean';
  default?: boolean;
};
type GithubWorkflowInputEnvironment = GithubWorkflowInputBase & {
  type: 'environment';
  default?: string;
};
type GithubWorkflowInput =
  | GithubWorkflowInputBoolean
  | GithubWorkflowInputString
  | GithubWorkflowInputChoice
  | GithubWorkflowInputEnvironment;

type InputElementProps<T> = {
  name: string;
  value?: string | boolean | undefined;
  onChange: (k: string, v: string | boolean) => void;
  // value?: T | undefined;
  // onChange: (v: T) => void;
};

function WorkflowInputEnvironment(
  props: GithubWorkflowInputEnvironment & InputElementProps<string>
) {
  return null;
}

function WorkflowInputBoolean(
  props: GithubWorkflowInputBoolean & InputElementProps<boolean>
) {
  const onChange = React.useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      props.onChange(props.name, e.target.checked);
    },
    [props.onChange, props.name]
  );
  const name = 'id=' + props.name;
  return (
    <div>
      <label htmlFor={name}>{props.description}</label>
      <input
        type="checkbox"
        name={props.name}
        id={name}
        checked={props.value == null ? props.default : !!props.value}
        required={props.required}
        onChange={onChange}
      />
    </div>
  );
}

function WorkflowInputString(
  props: GithubWorkflowInputString & InputElementProps<string>
) {
  const onChange = React.useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      props.onChange(props.name, e.target.value);
    },
    [props.onChange, props.name]
  );
  const name = 'id=' + props.name;
  return (
    <div>
      <label htmlFor={name}>{props.description}</label>
      <input
        type="text"
        name={props.name}
        value={props.value == null ? props.default : props.value.toString()}
        id={name}
        required={props.required}
        onChange={onChange}
      />
    </div>
  );
}

function WorkflowInputChoice(
  props: GithubWorkflowInputChoice & InputElementProps<string>
) {
  const onChange = React.useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => {
      props.onChange(props.name, e.target.value);
    },
    [props.onChange, props.name]
  );
  const name = 'id=' + props.name;
  return (
    <div>
      <label htmlFor={name}>{props.description}</label>
      <select
        name={props.name}
        id={name}
        required={props.required}
        value={props.value == null ? props.default : props.value.toString()}
        onChange={onChange}
      >
        {props.options.map((v) => (
          <option key={v} value={v}>
            {v}
          </option>
        ))}
      </select>
    </div>
  );
}

function WorkflowInput({
  name,
  inputSettings,
  value,
  onChange,
}: {
  name: string;
  inputSettings: GithubWorkflowInput;
  value?: string | boolean | undefined;
  onChange: (k: string, v: string | boolean) => void;
}) {
  switch (inputSettings.type) {
    case 'environment':
      return (
        <WorkflowInputEnvironment
          {...inputSettings}
          value={value}
          name={name}
          onChange={onChange}
        />
      );
    case 'boolean':
      return (
        <WorkflowInputBoolean
          {...inputSettings}
          value={value}
          name={name}
          onChange={onChange}
        />
      );
    case 'choice':
      return (
        <WorkflowInputChoice
          {...inputSettings}
          value={value}
          name={name}
          onChange={onChange}
        />
      );
    case 'string':
    case undefined:
      return (
        <WorkflowInputString
          {...inputSettings}
          value={value}
          name={name}
          onChange={onChange}
        />
      );
  }
}

function initialState(
  inputs: Record<string, GithubWorkflowInput>
): Record<string, string | boolean> {
  return Object.entries(inputs).reduce<Record<string, string | boolean>>(
    (acc, [k, v]) => {
      if (v.default) {
        acc[k] = v.default;
      }
      return acc;
    },
    {}
  );
}

function WorkflowInputs({
  inputs,
  onChange,
}: {
  inputs: Record<string, GithubWorkflowInput>;
  onChange: (v: Record<string, string | boolean>) => void;
}) {
  const [state, setState] = useState<Record<string, string | boolean>>(
    initialState(inputs)
  );
  useEffect(() => {
    onChange(state);
  }, [state]);
  const callback = useCallback((k: string, v: string | boolean) => {
    setState((s) => ({
      ...s,
      [k]: v,
    }));
  }, []);
  return (
    <div>
      {Object.entries(inputs).map(([key, settings]) => {
        return (
          <WorkflowInput
            key={key}
            name={key}
            value={state[key]}
            onChange={callback}
            inputSettings={settings}
          />
        );
      })}
    </div>
  );
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
      const workflow: any = yaml.load(atob(content));
      if (workflow?.on?.workflow_dispatch) {
        // do this properly
        return workflow.on.workflow_dispatch as {
          inputs?: Record<string, GithubWorkflowInput>;
        };
      }
      return null;
    },
    { enabled: !!url }
  );
}

const WorkflowYaml = ({
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
  }, []);
  if (isLoading) return <div>Loading...</div>;
  if (error)
    return (
      <div>
        Opps <button onClick={() => refetch()}> try again</button>.
      </div>
    );
  return (
    <div>
      {data?.inputs && (
        <WorkflowInputs inputs={data.inputs} onChange={setInputs} />
      )}
      {data && <button onClick={runDispatch}>Run workflow</button> }
    </div>
  );
};

async function executeWorkflow(
  owner: string,
  repo: string,
  id: number,
  options?: { ref?: string; inputs: Record<string, any> }
) {
  await fetch(`/api/v1/${owner}/${repo}/workflow/${id}/dispatch`, {
    method: 'POST',
    body: options ? JSON.stringify(options) : undefined,
  });
}

const Repository = () => {
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
          <WorkflowYaml
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

const RepositoryItem = ({ repo }: { repo: RepoInfo }) => {
  return (
    <div>
      <Link to={'/' + repo.fullName}>
        {repo.owner} / {repo.name}
      </Link>
      : {repo.description}
    </div>
  );
};

const Repositories = () => {
  const { isLoading, error, data, refetch } = useQuery(
    'repos',
    async () => {
      const res = await fetch('/api/v1/repos');
      return res.json();
    }
    // octokit.repos.listForAuthenticatedUser({ per_page: 100, direction: 'desc' })
  );
  if (isLoading) return <div>Loading...</div>;
  if (error)
    return (
      <div>
        Opps <button onClick={() => refetch()}> try again</button>.
      </div>
    );
  return (
    <ul>
      {data?.map((repo: RepoInfo) => (
        <li key={repo.url}>
          <RepositoryItem repo={repo} />
        </li>
      ))}
    </ul>
  );
};

const PublicApp = () => (
  <div>
    You must <a href={'/api/github/login'}>login</a>.
  </div>
);

const AuthenticatedApp = () => (
  <Routes>
    <Route index element={<Repositories />} />
    <Route path="/" element={<Repositories />} />
    <Route path="/:owner/:repo" element={<Repository />} />
  </Routes>
);

const AuthenticationSwitch = () => {
  const { data, isLoading, error, refetch } = useQuery(
    ['session'],
    async () => {
      const res = await fetch(`/api/v1/session`);
      if (res.ok) {
        return res.json();
      }
      return null;
    }
  );
  if (isLoading) return <div>Loading...</div>;
  if (error)
    return (
      <div>
        Opps <button onClick={() => refetch()}> try again</button>.
      </div>
    );
  return data ? <AuthenticatedApp /> : <PublicApp />;
};

const queryClient = new QueryClient();
const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AuthenticationSwitch />
    </BrowserRouter>
  </QueryClientProvider>
);

function installApp() {
  const container = document.getElementById('app');
  if (!container) throw new Error('Cannot find element with id "app"');
  const root = createRoot(container);
  root.render(App());
}

window.onload = installApp;
