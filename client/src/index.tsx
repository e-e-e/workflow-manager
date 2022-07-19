import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider, useQuery } from 'react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { RepositoryList } from './views/RepositoryList';
import { Login } from './views/Login';
import { Repository } from './views/Repository';

const AuthenticatedApp = () => (
  <Routes>
    <Route index element={<RepositoryList />} />
    <Route path="/" element={<RepositoryList />} />
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
  return data ? <AuthenticatedApp /> : <Login />;
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
