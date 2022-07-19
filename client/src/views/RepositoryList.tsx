import React from 'react';
import { useInfiniteQuery } from 'react-query';
import { GetRepoResponse, RepoInfo } from 'common';
import { Link } from 'react-router-dom';

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

export const RepositoryList = () => {
  const { isLoading, error, data, refetch, fetchNextPage, hasNextPage } =
    useInfiniteQuery<GetRepoResponse>(
      'repos',
      async ({ pageParam = 1 }) => {
        const res = await fetch(`/api/v1/repos?page=${pageParam}`);
        return (await res.json()) as GetRepoResponse;
      },
      {
        getNextPageParam: (last) => last.nextPage,
      }
    );
  if (isLoading) return <div>Loading...</div>;
  if (error)
    return (
      <div>
        Opps <button onClick={() => refetch()}> try again</button>.
      </div>
    );
  return (
    <div>
      <h1>Repositories</h1>
      <ul>
        {data?.pages.flatMap((data) =>
          data.data.map((repo: RepoInfo) => (
            <li key={repo.url}>
              <RepositoryItem repo={repo} />
            </li>
          ))
        )}
      </ul>
      {hasNextPage && <button onClick={() => fetchNextPage()}>More</button>}
    </div>
  );
};
