import React, { ChangeEvent, useCallback, useEffect, useState } from 'react';

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
export type GithubWorkflowInput =
  | GithubWorkflowInputBoolean
  | GithubWorkflowInputString
  | GithubWorkflowInputChoice
  | GithubWorkflowInputEnvironment;

type InputElementProps = {
  name: string;
  value?: string | boolean | undefined;
  onChange: (k: string, v: string | boolean) => void;
};

function WorkflowInputEnvironment(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  props: GithubWorkflowInputEnvironment & InputElementProps
) {
  return null;
}

function WorkflowInputBoolean(
  props: GithubWorkflowInputBoolean & InputElementProps
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
  props: GithubWorkflowInputString & InputElementProps
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
  props: GithubWorkflowInputChoice & InputElementProps
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

export function WorkflowInputs({
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
